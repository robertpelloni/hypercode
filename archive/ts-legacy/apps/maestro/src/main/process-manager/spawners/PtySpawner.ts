import { EventEmitter } from 'events';
import * as pty from 'node-pty';
import { stripControlSequences } from '../../utils/terminalFilter';
import { logger } from '../../utils/logger';
import type { ProcessConfig, ManagedProcess, SpawnResult } from '../types';
import type { DataBufferManager } from '../handlers/DataBufferManager';
import { buildPtyTerminalEnv, buildChildProcessEnv } from '../utils/envBuilder';
import { isWindows } from '../../../shared/platformDetection';

/**
 * Handles spawning of PTY (pseudo-terminal) processes.
 * Used for terminal mode and AI agents that require TTY support.
 */
export class PtySpawner {
	constructor(
		private processes: Map<string, ManagedProcess>,
		private emitter: EventEmitter,
		private bufferManager: DataBufferManager
	) {}

	/**
	 * Spawn a PTY process for a session
	 */
	spawn(config: ProcessConfig): SpawnResult {
		const {
			sessionId,
			toolType,
			cwd,
			command,
			args,
			shell,
			shellArgs,
			shellEnvVars,
			customEnvVars,
		} = config;

		const safeArgs = args || [];
		const safeCommand = command || '';
		const isTerminal = toolType === 'terminal';

		try {
			let ptyCommand: string;
			let ptyArgs: string[];

			if (isTerminal) {
				if (!shell) {
					// No shell specified — use the explicit command/args directly (e.g. ssh for remote terminals)
					ptyCommand = safeCommand;
					ptyArgs = safeArgs;
				} else {
					// Full shell emulation: launch the shell with login+interactive flags
					ptyCommand = shell;
					ptyArgs = isWindows() ? [] : ['-l', '-i'];

					// Append custom shell arguments from user configuration
					if (shellArgs && shellArgs.trim()) {
						const customShellArgsArray = shellArgs.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
						const cleanedArgs = customShellArgsArray.map((arg) => {
							if (
								(arg.startsWith('"') && arg.endsWith('"')) ||
								(arg.startsWith("'") && arg.endsWith("'"))
							) {
								return arg.slice(1, -1);
							}
							return arg;
						});
						if (cleanedArgs.length > 0) {
							logger.debug('Appending custom shell args', 'ProcessManager', {
								shellArgs: cleanedArgs,
							});
							ptyArgs = [...ptyArgs, ...cleanedArgs];
						}
					}
				}
			} else {
				// Spawn the AI agent directly with PTY support
				ptyCommand = safeCommand;
				ptyArgs = safeArgs;
			}

			// Build environment for PTY process
			let ptyEnv: NodeJS.ProcessEnv;
			if (isTerminal) {
				ptyEnv = buildPtyTerminalEnv(shellEnvVars);

				// Log environment variable application for terminal sessions
				if (shellEnvVars && Object.keys(shellEnvVars).length > 0) {
					const globalVarKeys = Object.keys(shellEnvVars);
					logger.debug(
						'[ProcessManager] Applying global environment variables to terminal session',
						'ProcessManager',
						{
							sessionId,
							globalVarCount: globalVarKeys.length,
							globalVarKeys: globalVarKeys.slice(0, 10), // First 10 keys for visibility
						}
					);
				}
			} else {
				// For AI agents in PTY mode: use same env building logic as child processes
				// This ensures tilde expansion (~/ paths), Electron var stripping, and consistent
				// global shell environment variable handling across all spawner types
				ptyEnv = buildChildProcessEnv(customEnvVars, false, shellEnvVars);
			}

			const ptyProcess = pty.spawn(ptyCommand, ptyArgs, {
				name: 'xterm-256color',
				cols: config.cols || 80,
				rows: config.rows || 24,
				cwd,
				env: ptyEnv,
			});

			const managedProcess: ManagedProcess = {
				sessionId,
				toolType,
				ptyProcess,
				cwd,
				pid: ptyProcess.pid,
				isTerminal,
				startTime: Date.now(),
				command: safeCommand,
				args: safeArgs,
				querySource: config.querySource,
				tabId: config.tabId,
				projectPath: config.projectPath,
				sshRemoteId: config.sshRemoteId,
				sshRemoteHost: config.sshRemoteHost,
				config, // Store for retries
				retryCount: 0,
			};

			this.processes.set(sessionId, managedProcess);

			ptyProcess.onData((data) => {
				// For terminal sessions, we pass data through untouched (ANSI preserved)
				// For AI agents using PTY (TTY support), we strip control sequences for the log
				const filteredData = isTerminal ? data : stripControlSequences(data);
				this.bufferManager.emitDataBuffered(sessionId, filteredData);
			});

			ptyProcess.onExit(({ exitCode }) => {
				this.emitter.emit('exit', sessionId, exitCode);
				this.processes.delete(sessionId);
			});

			return { pid: ptyProcess.pid, success: true };
		} catch (error) {
			logger.error('[ProcessManager] PTY Spawn failed', 'ProcessManager', {
				sessionId,
				error: String(error),
			});
			return { success: false, pid: -1 };
		}
	}
}
