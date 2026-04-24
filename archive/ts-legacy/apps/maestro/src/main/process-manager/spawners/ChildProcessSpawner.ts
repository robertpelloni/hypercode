// src/main/process-manager/spawners/ChildProcessSpawner.ts

import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../../utils/logger';
import { getOutputParser } from '../../parsers';
import { getAgentCapabilities } from '../../agents';
import type { ProcessConfig, ManagedProcess, SpawnResult } from '../types';
import type { DataBufferManager } from '../handlers/DataBufferManager';
import { StdoutHandler } from '../handlers/StdoutHandler';
import { StderrHandler } from '../handlers/StderrHandler';
import { ExitHandler } from '../handlers/ExitHandler';
import { buildChildProcessEnv } from '../utils/envBuilder';
import { saveImageToTempFile, buildImagePromptPrefix } from '../utils/imageUtils';
import { buildStreamJsonMessage } from '../utils/streamJsonBuilder';
import { escapeArgsForShell, isPowerShellShell } from '../utils/shellEscape';
import { isWindows } from '../../../shared/platformDetection';

/**
 * Handles spawning of child processes (non-PTY).
 * Used for AI agents in batch mode and interactive mode.
 */
export class ChildProcessSpawner {
	private stdoutHandler: StdoutHandler;
	private stderrHandler: StderrHandler;
	private exitHandler: ExitHandler;

	constructor(
		private processes: Map<string, ManagedProcess>,
		private emitter: EventEmitter,
		private bufferManager: DataBufferManager
	) {
		this.stdoutHandler = new StdoutHandler({
			processes: this.processes,
			emitter: this.emitter,
			bufferManager: this.bufferManager,
		});
		this.stderrHandler = new StderrHandler({
			processes: this.processes,
			emitter: this.emitter,
		});
		this.exitHandler = new ExitHandler({
			processes: this.processes,
			emitter: this.emitter,
			bufferManager: this.bufferManager,
		});
	}

	/**
	 * Spawn a child process for a session
	 */
	spawn(config: ProcessConfig): SpawnResult {
		const {
			sessionId,
			toolType,
			cwd,
			command,
			args,
			prompt,
			images,
			imageArgs,
			promptArgs,
			contextWindow: _contextWindow,
			customEnvVars,
			shellEnvVars,
			noPromptSeparator: _noPromptSeparator,
			sendPromptViaStdin,
			sendPromptViaStdinRaw,
		} = config;

		const safeArgs = args || [];
		const safeCommand = command || '';

		const hasImages = images && images.length > 0;
		const capabilities = getAgentCapabilities(toolType);

		// Check if prompt will be sent via stdin instead of command line
		// This is critical for SSH remote execution to avoid shell escaping issues
		// Also critical on Windows: when using stream-json output mode, the prompt is sent
		// via stdin (see stream-json stdin write below). Adding it as a CLI arg too would
		// exceed cmd.exe's ~8191 character command line limit, causing immediate exit code 1.
		//
		// IMPORTANT: Only match --input-format stream-json, NOT --output-format stream-json.
		// Matching --output-format caused promptViaStdin to be always true for Claude Code
		// (whose default args include --output-format stream-json), which prevented
		// --input-format stream-json from being added when sending images, causing Claude
		// to interpret the raw JSON+base64 blob as plain text and blow the token limit.
		const argsHaveInputStreamJson = safeArgs.some(
			(arg, i) => arg === 'stream-json' && i > 0 && safeArgs[i - 1] === '--input-format'
		);
		const promptViaStdin = sendPromptViaStdin || sendPromptViaStdinRaw || argsHaveInputStreamJson;

		// Build final args based on batch mode and images
		// Track whether the prompt was added to CLI args (used later to decide stdin behavior)
		let finalArgs: string[];
		let tempImageFiles: string[] = [];
		// effectivePrompt may be modified (e.g., image path prefix prepended for resume mode)
		let effectivePrompt = prompt;
		let promptAddedToArgs = false;

		if (hasImages && prompt && capabilities.supportsStreamJsonInput) {
			// Stream JSON mode: use provided args + --input-format stream-json
			const needsInputFormat = !safeArgs.includes('--input-format')
				? ['--input-format', 'stream-json']
				: [];
			finalArgs = [...safeArgs, ...needsInputFormat];
		} else if (hasImages && prompt && capabilities.supportsImageFiles) {
			// Standard image file mode: use imageArgs callback if provided
			tempImageFiles = images
				.map((img, idx) => saveImageToTempFile(img, idx))
				.filter((p): p is string => p !== null);
			const imagePathArgs = imageArgs ? tempImageFiles.flatMap((p) => imageArgs(p)) : [];

			// If agent supports image resume, prefix the prompt with image paths
			// (necessary because --print mode doesn't support -i / --image)
			if (capabilities.imageResumeMode === 'prompt-embed' && safeArgs.some((a) => a === 'resume')) {
				effectivePrompt = buildImagePromptPrefix(tempImageFiles) + prompt;
			}

			if (promptArgs && !promptViaStdin) {
				finalArgs = [...safeArgs, ...imagePathArgs, ...promptArgs(effectivePrompt || '')];
				promptAddedToArgs = true;
			} else {
				finalArgs = [...safeArgs, ...imagePathArgs];
			}
		} else if (prompt && !promptViaStdin) {
			// No images, standard prompt mode
			if (promptArgs) {
				finalArgs = [...safeArgs, ...promptArgs(effectivePrompt || '')];
				promptAddedToArgs = true;
			} else {
				finalArgs = [...safeArgs, effectivePrompt || ''];
				promptAddedToArgs = true;
			}
		} else {
			// No prompt or prompt via stdin
			finalArgs = safeArgs;
		}

		// Prepare spawning environment
		const spawnEnv = buildChildProcessEnv(customEnvVars, false, shellEnvVars);

		// Determine if we need to wrap the command in a shell
		// On Windows, we use shell: true for non-Pty spawns to ensure PATH resolution
		// and correct handling of .cmd/.bat files.
		const isWin = isWindows();
		const finalRunInShell = config.runInShell || isWin;

		let spawnCommandStr = safeCommand;
		let spawnArgsArr: string[] = finalArgs;

		// Logging
		logger.debug('[ProcessManager] Spawning child process', 'ProcessManager', {
			sessionId,
			command: safeCommand,
			argsCount: finalArgs.length,
			runInShell: finalRunInShell,
			promptViaStdin,
			promptAddedToArgs,
			commandHasExtension: path.extname(safeCommand).length > 0,
			baseArgsCount: safeArgs.length,
		});

		// Command escaping for PowerShell (if shell: true and shell is pwsh/powershell)
		if (finalRunInShell && isPowerShellShell(config.shell)) {
			// escapeArgsForShell returns a string array safe for the target shell.
			spawnArgsArr = escapeArgsForShell(finalArgs, 'powershell');
		}

		// Perform the spawn
		let childProcess: ChildProcess;
		try {
			// If we are running in a shell, we may need to merge command and args into a single string
			// depending on the shell's requirements. For now, we trust Node's shell: true.
			//
			// SPECIAL CASE: If command is an absolute path to a file, and we're on Windows,
			// and it doesn't have an extension, we check if it's a script.
			if (isWin && path.isAbsolute(spawnCommandStr) && !path.extname(spawnCommandStr)) {
				const commandHasPath = /\\|\//.test(spawnCommandStr);
				const commandExt = path.extname(spawnCommandStr).toLowerCase();

				if (commandHasPath && !commandExt) {
					// Check for common script extensions
					const possibleExts = ['.cmd', '.bat', '.ps1', '.exe'];
					for (const ext of possibleExts) {
						if (fs.existsSync(spawnCommandStr + ext)) {
							spawnCommandStr += ext;
							break;
						}
					}
				}
			}

			childProcess = spawn(spawnCommandStr, spawnArgsArr, {
				cwd,
				env: spawnEnv,
				shell: finalRunInShell,
				windowsHide: true,
			});
		} catch (error) {
			logger.error('[ProcessManager] Spawn failed immediately', 'ProcessManager', {
				sessionId,
				error: String(error),
			});
			return { success: false, pid: -1 };
		}

		// Track the process
		const managedProcess: ManagedProcess = {
			sessionId,
			toolType,
			childProcess,
			cwd,
			pid: childProcess.pid || -1,
			isTerminal: false,
			startTime: Date.now(),
			outputParser: getOutputParser(toolType),
			tempImageFiles,
			command: safeCommand,
			args: finalArgs,
			querySource: config.querySource,
			tabId: config.tabId,
			projectPath: config.projectPath,
			sshRemoteId: config.sshRemoteId,
			sshRemoteHost: config.sshRemoteHost,
			config, // Store for retries
			retryCount: 0,
		};

		this.processes.set(sessionId, managedProcess);

		// Handle process lifecycle
		logger.debug('[ProcessManager] Child process spawned', 'ProcessManager', {
			sessionId,
			pid: childProcess.pid,
			hasStdout: !!childProcess.stdout,
			hasStderr: !!childProcess.stderr,
			hasStdin: !!childProcess.stdin,
			killed: childProcess.killed,
			exitCode: childProcess.exitCode,
		});

		if (childProcess.stdin) {
			childProcess.stdin.on('error', (err: any) => {
				logger.error('[ProcessManager] stdin error', 'ProcessManager', {
					sessionId,
					error: String(err),
				});
			});
		}

		if (childProcess.stdout) {
			childProcess.stdout.setEncoding('utf8');
			childProcess.stdout.on('error', (err: any) => {
				logger.error('[ProcessManager] stdout error', 'ProcessManager', {
					sessionId,
					error: String(err),
				});
			});
			childProcess.stdout.on('data', (data: Buffer | string) => {
				this.stdoutHandler.handleData(sessionId, data.toString());
			});
		}

		if (childProcess.stderr) {
			childProcess.stderr.setEncoding('utf8');
			childProcess.stderr.on('error', (err: any) => {
				logger.error('[ProcessManager] stderr error', 'ProcessManager', {
					sessionId,
					error: String(err),
				});
			});
			childProcess.stderr.on('data', (data: Buffer | string) => {
				this.stderrHandler.handleData(sessionId, data.toString());
			});
		}

		childProcess.on('close', (code: number | null) => {
			this.exitHandler.handleExit(sessionId, code || 0);
		});

		childProcess.on('error', (error: any) => {
			logger.error('[ProcessManager] Process error event', 'ProcessManager', {
				sessionId,
				error: String(error),
			});
			// Emitted when the process cannot be spawned, or cannot be killed
			this.exitHandler.handleExit(sessionId, 1);
		});

		// Write inputs to stdin
		if (config.sshStdinScript) {
			// For SSH remote execution using the stdin script bypass
			childProcess.stdin?.write(config.sshStdinScript);
			childProcess.stdin?.end();
		} else if (prompt && promptViaStdin && !promptAddedToArgs) {
			// Normal prompt via stdin (e.g., when images are sent in stream-json mode)
			//
			// If supportsStreamJsonInput is true, we send the prompt wrapped in the
			// expected JSON envelope. Otherwise we send it as raw text.
			if (capabilities.supportsStreamJsonInput && argsHaveInputStreamJson) {
				const streamJsonMessage = buildStreamJsonMessage(effectivePrompt || '', images || []);
				childProcess.stdin?.write(streamJsonMessage + '\n');
				childProcess.stdin?.end();
			} else {
				childProcess.stdin?.write(effectivePrompt);
				childProcess.stdin?.end();
			}
		} else if (capabilities.requiresStdinEnd) {
			// Some agents (like Claude Code) may hang if stdin is not closed,
			// even if the prompt was provided via CLI args.
			childProcess.stdin?.end();
		}

		return { pid: childProcess.pid || -1, success: true };
	}
}
