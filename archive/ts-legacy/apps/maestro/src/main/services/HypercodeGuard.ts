import path from 'path';
import type { ProcessConfig } from '../process-manager/types';
import type { HypercodeEnvInfo } from './HypercodeEnvironment';

/**
 * Result of a guard validation check.
 */
export interface GuardResult {
	allowed: boolean;
	reason?: string;
}

/**
 * HypercodeGuard implements security policies for sandboxed process execution.
 * It ensures that agents running in a Hypercode sandbox cannot escape the
 * designated workspace or perform dangerous shell operations.
 */
export class HypercodeGuard {
	// Forbidden shell characters that allow command chaining or redirection
	private static readonly FORBIDDEN_SHELL_CHARS = /[;&|><`$\\\\]/;

	// Base commands that are restricted in sandboxed mode
	private static readonly FORBIDDEN_COMMANDS = [
		'sudo',
		'su',
		'passwd',
		'chown',
		'chmod',
		'kill',
		'pkill',
		'taskkill',
	];

	// Sensitive directories that should not be used as CWD
	private static readonly SENSITIVE_DIRS = ['.hypercode', '.git', '.github', '.vscode', '.env'];

	/**
	 * Validates a process configuration against the security policy.
	 * This is enforced when running in a Hypercode sandbox.
	 *
	 * @param config The process configuration to validate
	 * @param envInfo Current Hypercode environment information
	 * @returns GuardResult indicating if the process is allowed to spawn
	 */
	static validate(config: ProcessConfig, envInfo: HypercodeEnvInfo): GuardResult {
		// If not explicitly sandboxed, the guard allows the process (legacy/normal behavior)
		if (!envInfo.isSandboxed) {
			return { allowed: true };
		}

		const {
			cwd,
			projectPath,
			command,
			args,
			runInShell,
			shell,
			customEnvVars,
			shellEnvVars,
			sshStdinScript,
		} = config;

		const safeCommand = command || '';

		// 1. Path Containment (CWD)
		// projectPath is mandatory in sandboxed mode to define the boundary
		if (!projectPath) {
			return { allowed: false, reason: 'projectPath must be defined in sandboxed mode' };
		}

		// Ensure CWD is absolute
		if (!path.isAbsolute(cwd)) {
			return { allowed: false, reason: `CWD must be an absolute path: ${cwd}` };
		}

		// Calculate relative path and check for traversal
		const relativeCwd = path.relative(projectPath, cwd);
		if (relativeCwd.startsWith('..') || path.isAbsolute(relativeCwd)) {
			return {
				allowed: false,
				reason: `CWD must be within projectPath: ${cwd} (Project: ${projectPath})`,
			};
		}

		// Block sensitive directories from being used as the working directory
		const cwdParts = relativeCwd.split(path.sep);
		if (this.SENSITIVE_DIRS.some((dir) => cwdParts.includes(dir))) {
			return { allowed: false, reason: `CWD cannot be or contain a sensitive directory: ${cwd}` };
		}

		// 2. Shell Command Integrity
		// If running in a shell, validate the command string for injection patterns
		if (runInShell || shell) {
			if (this.FORBIDDEN_SHELL_CHARS.test(safeCommand)) {
				return { allowed: false, reason: 'Command contains forbidden shell characters' };
			}
		}

		// Validate the command executable itself
		const cmdBase = path.basename(safeCommand).toLowerCase();
		if (this.FORBIDDEN_COMMANDS.includes(cmdBase)) {
			return { allowed: false, reason: `Command '${cmdBase}' is forbidden in sandboxed mode` };
		}

		// 3. Argument Validation (Basic Path traversal Check)
		if (args) {
			for (const arg of args) {
				if (arg.includes('..')) {
					return {
						allowed: false,
						reason: `Arguments cannot contain path traversal patterns: ${arg}`,
					};
				}
			}
		}

		// 4. SSH Script Validation
		// If an SSH script is provided, we check it for forbidden commands
		if (sshStdinScript) {
			const scriptLines = sshStdinScript.split('\n');
			for (const line of scriptLines) {
				const trimmedLine = line.trim();
				if (!trimmedLine || trimmedLine.startsWith('#')) continue;

				const firstWord = trimmedLine.split(/\s+/)[0];
				const cmdInScript = path.basename(firstWord).toLowerCase();
				if (this.FORBIDDEN_COMMANDS.includes(cmdInScript)) {
					return {
						allowed: false,
						reason: `SSH script contains forbidden command: ${cmdInScript}`,
					};
				}
			}
		}

		// 5. Environment Variable Protection
		// Prevent processes from tampering with HYPERCODE specific variables
		const envVars = { ...shellEnvVars, ...customEnvVars };
		for (const key of Object.keys(envVars)) {
			if (key.startsWith('HYPERCODE_')) {
				return {
					allowed: false,
					reason: `Overriding HYPERCODE_* environment variables is forbidden: ${key}`,
				};
			}
		}

		return { allowed: true };
	}
}
