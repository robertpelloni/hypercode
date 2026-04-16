import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { SessionSupervisor } from '../../src/supervisor/SessionSupervisor.ts';
import { createFakeDetectEnvironment, createSpawnStub, FakeProcess } from './test-helpers.ts';

const tempDirs: string[] = [];

function createTempDir() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hypercode-session-persist-'));
    tempDirs.push(dir);
    return dir;
}

afterEach(() => {
    while (tempDirs.length > 0) {
        fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
});

describe('session supervisor persistence', () => {
    it('restores persisted sessions after a restart and normalizes running state', async () => {
        const rootDir = createTempDir();
        const persistencePath = path.join(rootDir, '.hypercode', 'session-supervisor.json');
        const child = new FakeProcess(9001);
        const { spawn } = createSpawnStub([child]);

        const firstSupervisor = new SessionSupervisor({
            rootDir,
            persistencePath,
            spawnProcess: spawn,
            autoResumeOnStart: false,
            detectExecutionEnvironment: createFakeDetectEnvironment(),
        });

        const session = await firstSupervisor.createSession({
            cliType: 'opencode',
            workingDirectory: rootDir,
            autoRestart: true,
        });
        await firstSupervisor.startSession(session.id);
        await firstSupervisor.shutdown();

        const restoredSupervisor = new SessionSupervisor({
            rootDir,
            persistencePath,
            autoResumeOnStart: false,
        });

        const restored = restoredSupervisor.getSession(session.id);

        expect(fs.existsSync(persistencePath)).toBe(true);
        expect(restored).toBeDefined();
        expect(restored?.status).toBe('stopped');
        expect(restored?.command).toBe('opencode');
        expect(restored?.autoRestart).toBe(true);
        expect(restoredSupervisor.listSessions()).toHaveLength(1);
    });
});
