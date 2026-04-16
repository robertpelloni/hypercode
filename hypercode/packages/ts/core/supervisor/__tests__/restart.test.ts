import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { SessionSupervisor } from '../../src/supervisor/SessionSupervisor.ts';
import { createFakeDetectEnvironment, createSpawnStub, FakeProcess, ManualScheduler } from './test-helpers.ts';

const tempDirs: string[] = [];

function createTempDir() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hypercode-session-restart-'));
    tempDirs.push(dir);
    return dir;
}

afterEach(() => {
    while (tempDirs.length > 0) {
        fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
});

describe('session supervisor restart', () => {
    it('restarts crashed sessions with exponential backoff metadata', async () => {
        const rootDir = createTempDir();
        const first = new FakeProcess(1001);
        const second = new FakeProcess(1002);
        const scheduler = new ManualScheduler();
        const { spawn, invocations } = createSpawnStub([first, second]);
        const supervisor = new SessionSupervisor({
            rootDir,
            spawnProcess: spawn,
            scheduler,
            restartDelayMs: 250,
            backoffMultiplier: 2,
            autoResumeOnStart: false,
            detectExecutionEnvironment: createFakeDetectEnvironment(),
        });

        const session = await supervisor.createSession({
            cliType: 'claude',
            workingDirectory: rootDir,
            autoRestart: true,
        });

        await supervisor.startSession(session.id);
        first.crash(9);

        const restarting = supervisor.getSession(session.id);
        expect(restarting?.status).toBe('restarting');
        expect(restarting?.restartCount).toBe(1);
        expect(scheduler.tasks).toHaveLength(1);
        expect(scheduler.tasks[0].delayMs).toBe(250);

        scheduler.runNext();

        const resumed = supervisor.getSession(session.id);
        const health = supervisor.getSessionHealth(session.id);
        expect(invocations).toHaveLength(2);
        expect(resumed?.status).toBe('running');
        expect(health.restartCount).toBe(1);
        expect(health.status).toBe('healthy');
        expect(supervisor.getSessionLogs(session.id).some((entry) => entry.message.includes('Scheduling restart attempt 1'))).toBe(true);
    });
});
