import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { SessionSupervisor } from '../../src/supervisor/SessionSupervisor.ts';
import { createFakeDetectEnvironment, createSpawnStub, FakeProcess } from './test-helpers.ts';

const tempDirs: string[] = [];

function createTempDir() {
<<<<<<< HEAD:archive/ts-legacy/packages/core/supervisor/__tests__/spawn.test.ts
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hypercode-session-supervisor-'));
=======
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'borg-session-supervisor-'));
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/supervisor/__tests__/spawn.test.ts
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
<<<<<<< HEAD:archive/ts-legacy/packages/core/supervisor/__tests__/spawn.test.ts
            env: { HYPERCODE_TEST_ENV: 'present' },
=======
            env: { BORG_TEST_ENV: 'present' },
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/supervisor/__tests__/spawn.test.ts
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
<<<<<<< HEAD:archive/ts-legacy/packages/core/supervisor/__tests__/spawn.test.ts
        expect(invocations[0].env.HYPERCODE_TEST_ENV).toBe('present');
=======
        expect(invocations[0].env.BORG_TEST_ENV).toBe('present');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/supervisor/__tests__/spawn.test.ts
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
