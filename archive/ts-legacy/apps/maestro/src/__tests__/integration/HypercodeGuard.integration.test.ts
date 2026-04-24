import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProcessManager } from '../../main/process-manager/ProcessManager';
import { HypercodeEnvironment } from '../../main/services/HypercodeEnvironment';
import path from 'path';
import os from 'os';
import fs from 'fs';

describe('HypercodeGuard Integration with ProcessManager', () => {
	let processManager: ProcessManager;
	const projectPath = path.resolve(os.tmpdir(), 'hypercode-test-project');

	beforeEach(() => {
		if (!fs.existsSync(projectPath)) {
			fs.mkdirSync(projectPath, { recursive: true });
		}
		processManager = new ProcessManager();
		vi.restoreAllMocks();
	});

	it('should allow normal execution when isSandboxed is false', async () => {
		vi.spyOn(HypercodeEnvironment, 'detect').mockResolvedValue({
			isHypercodeProject: false,
			isSandboxed: false,
			handoffDirExists: false,
		});

		const config = {
			sessionId: 'test-session-1',
			command: 'echo',
			args: ['hello'],
			cwd: projectPath,
			projectPath: projectPath,
		} as any;

		const result = await processManager.spawn(config);
		expect(result.success).toBe(true);
		if (result.success) {
			processManager.kill('test-session-1');
		}
	});

	it('should allow sandboxed execution within projectPath', async () => {
		vi.spyOn(HypercodeEnvironment, 'detect').mockResolvedValue({
			isHypercodeProject: true,
			isSandboxed: true,
			sandboxId: 'test-sandbox',
			handoffDirExists: true,
		});

		const config = {
			sessionId: 'test-session-2',
			command: 'echo',
			args: ['hello'],
			cwd: projectPath,
			projectPath: projectPath,
		} as any;

		const result = await processManager.spawn(config);
		expect(result.success).toBe(true);
		if (result.success) {
			processManager.kill('test-session-2');
		}
	});

	it('should block sandboxed execution when CWD is outside projectPath', async () => {
		vi.spyOn(HypercodeEnvironment, 'detect').mockResolvedValue({
			isHypercodeProject: true,
			isSandboxed: true,
			sandboxId: 'test-sandbox',
			handoffDirExists: true,
		});

		const config = {
			sessionId: 'test-session-3',
			command: 'echo',
			args: ['hello'],
			cwd: path.resolve(projectPath, '..'), // Outside projectPath
			projectPath: projectPath,
		} as any;

		const result = await processManager.spawn(config);
		expect(result.success).toBe(false);
		expect(result.pid).toBe(-1);
	});

	it('should block sandboxed execution when command contains forbidden shell characters', async () => {
		vi.spyOn(HypercodeEnvironment, 'detect').mockResolvedValue({
			isHypercodeProject: true,
			isSandboxed: true,
			sandboxId: 'test-sandbox',
			handoffDirExists: true,
		});

		const config = {
			sessionId: 'test-session-4',
			command: 'echo "hello" ; ls',
			runInShell: true,
			cwd: projectPath,
			projectPath: projectPath,
		} as any;

		const result = await processManager.spawn(config);
		expect(result.success).toBe(false);
		expect(result.pid).toBe(-1);
	});

	it('should block sandboxed execution when using forbidden commands (e.g. sudo)', async () => {
		vi.spyOn(HypercodeEnvironment, 'detect').mockResolvedValue({
			isHypercodeProject: true,
			isSandboxed: true,
			sandboxId: 'test-sandbox',
			handoffDirExists: true,
		});

		const config = {
			sessionId: 'test-session-5',
			command: 'sudo',
			args: ['ls'],
			cwd: projectPath,
			projectPath: projectPath,
		} as any;

		const result = await processManager.spawn(config);
		expect(result.success).toBe(false);
		expect(result.pid).toBe(-1);
	});

	it('should block sandboxed execution when CWD is a sensitive directory', async () => {
		vi.spyOn(HypercodeEnvironment, 'detect').mockResolvedValue({
			isHypercodeProject: true,
			isSandboxed: true,
			sandboxId: 'test-sandbox',
			handoffDirExists: true,
		});

		const gitDir = path.join(projectPath, '.git');
		if (!fs.existsSync(gitDir)) {
			fs.mkdirSync(gitDir, { recursive: true });
		}

		const config = {
			sessionId: 'test-session-6',
			command: 'ls',
			cwd: gitDir,
			projectPath: projectPath,
		} as any;

		const result = await processManager.spawn(config);
		expect(result.success).toBe(false);
		expect(result.pid).toBe(-1);
	});
});
