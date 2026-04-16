import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

import type { LocalExecutionEnvironment } from '../../src/services/execution-environment.js';
import type { SchedulerLike, SupervisedProcessHandle, WorktreeManagerLike } from '../../src/supervisor/types.ts';

/** Returns a zero-cost fake LocalExecutionEnvironment so tests do not invoke real shell/binary probing. */
export function createFakeDetectEnvironment(): () => Promise<LocalExecutionEnvironment> {
    const env: LocalExecutionEnvironment = {
        os: process.platform,
        summary: {
            ready: true,
            preferredShellId: 'pwsh',
            preferredShellLabel: 'PowerShell 7',
            shellCount: 1,
            verifiedShellCount: 1,
            toolCount: 1,
            verifiedToolCount: 1,
            harnessCount: 0,
            verifiedHarnessCount: 0,
            supportsPowerShell: true,
            supportsPosixShell: false,
            notes: [],
        },
        shells: [],
        tools: [],
        harnesses: [],
    };
    return () => Promise.resolve(env);
}

export class FakeProcess extends EventEmitter implements SupervisedProcessHandle {
    public readonly stdout = new PassThrough();
    public readonly stderr = new PassThrough();
    public readonly pid: number;
    public lastKillSignal?: NodeJS.Signals | number;
    public killed = false;

    constructor(pid = Math.floor(Math.random() * 10000) + 1000) {
        super();
        this.pid = pid;
    }

    public kill(signal?: NodeJS.Signals | number): boolean {
        this.killed = true;
        this.lastKillSignal = signal;
        this.emit('exit', signal === 'SIGKILL' ? 137 : 0, signal === 'SIGKILL' ? 'SIGKILL' : 'SIGTERM');
        return true;
    }

    public writeStdout(message: string) {
        this.stdout.write(message);
    }

    public writeStderr(message: string) {
        this.stderr.write(message);
    }

    public crash(code = 1, signal: NodeJS.Signals | null = null) {
        this.emit('exit', code, signal);
    }
}

export interface SpawnInvocation {
    command: string;
    args: string[];
    cwd: string;
    env: NodeJS.ProcessEnv;
}

export function createSpawnStub(processes: FakeProcess[]) {
    const invocations: SpawnInvocation[] = [];
    const spawn = (command: string, args: string[], options: { cwd: string; env: NodeJS.ProcessEnv }) => {
        const next = processes.shift();
        if (!next) {
            throw new Error('No fake process remaining for spawn');
        }
        invocations.push({ command, args, cwd: options.cwd, env: options.env });
        return next;
    };

    return { spawn, invocations };
}

export class ManualScheduler implements SchedulerLike {
    public tasks: Array<{ handle: { id: number }; delayMs: number; callback: () => void }> = [];
    private nextId = 1;

    public setTimeout(callback: () => void, delayMs: number): unknown {
        const handle = { id: this.nextId++ };
        this.tasks.push({ handle, delayMs, callback });
        return handle;
    }

    public clearTimeout(handle: unknown): void {
        this.tasks = this.tasks.filter((task) => task.handle !== handle);
    }

    public runNext() {
        const task = this.tasks.shift();
        task?.callback();
    }
}

export class FakeWorktreeManager implements WorktreeManagerLike {
    public createCalls: string[] = [];
    public cleanupCalls: string[] = [];

    async createTaskEnvironment(taskId: string): Promise<string> {
        this.createCalls.push(taskId);
        return `C:/fake-worktrees/${taskId}`;
    }

    async cleanupTaskEnvironment(taskId: string): Promise<void> {
        this.cleanupCalls.push(taskId);
    }
}
