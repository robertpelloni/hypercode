import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { SessionSupervisor } from '../../src/supervisor/SessionSupervisor.ts';
import { createFakeDetectEnvironment, createSpawnStub, FakeProcess } from './test-helpers.ts';

const tempDirs: string[] = [];

function createTempDir() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hypercode-session-supervisor-'));
    tempDirs.push(dir);
    return dir;
}

afterEach(() => {
    while (tempDirs.length > 0) {
        fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
});

describe('session supervisor spawn', () => {
    it('creates, starts, and exposes attach/log contracts for a CLI session', async () => {
        const rootDir = createTempDir();
        const child = new FakeProcess(4242);
        const { spawn, invocations } = createSpawnStub([child]);
        const supervisor = new SessionSupervisor({
            rootDir,
            spawnProcess: spawn,
            autoResumeOnStart: false,
            detectExecutionEnvironment: createFakeDetectEnvironment(),
        });

        const session = await supervisor.createSession({
            cliType: 'aider',
            name: 'Aider session',
            workingDirectory: rootDir,
            command: 'aider',
            args: ['--model', 'gpt-4.1'],
            env: { BORG_TEST_ENV: 'present' },
        });

        const running = await supervisor.startSession(session.id);
        child.writeStdout('hello from aider\n');
        child.writeStderr('warning from aider\n');

        const attachInfo = supervisor.getAttachInfo(session.id);
        const logs = supervisor.getSessionLogs(session.id);

        expect(running.status).toBe('running');
        expect(invocations).toHaveLength(1);
        expect(invocations[0]).toMatchObject({
            command: 'aider',
            args: ['--model', 'gpt-4.1'],
            cwd: rootDir,
        });
        expect(invocations[0].env.BORG_TEST_ENV).toBe('present');
        expect(attachInfo).toEqual(expect.objectContaining({
            id: session.id,
            pid: 4242,
            cwd: rootDir,
            command: 'aider',
            status: 'running',
            attachable: true,
        }));
        expect(logs.some((entry) => entry.message.includes('hello from aider'))).toBe(true);
        expect(logs.some((entry) => entry.message.includes('warning from aider'))).toBe(true);
    });
});
