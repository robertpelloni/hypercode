import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { SessionSupervisor } from '../../src/supervisor/SessionSupervisor.ts';
import { createFakeDetectEnvironment, createSpawnStub, FakeProcess, ManualScheduler } from './test-helpers.ts';

const tempDirs: string[] = [];

function createTempDir() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hypercode-session-health-'));
    tempDirs.push(dir);
    return dir;
}

afterEach(() => {
    while (tempDirs.length > 0) {
        fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
});

describe('session supervisor health', () => {
    it('reports healthy, degraded, and crashed states across the session lifecycle', async () => {
        const rootDir = createTempDir();
        const first = new FakeProcess(7001);
        const scheduler = new ManualScheduler();
        const { spawn } = createSpawnStub([first]);
        const supervisor = new SessionSupervisor({
            rootDir,
            spawnProcess: spawn,
            scheduler,
            autoResumeOnStart: false,
            maxRestartAttempts: 0,
            detectExecutionEnvironment: createFakeDetectEnvironment(),
        });

        const session = await supervisor.createSession({
            cliType: 'codex',
            workingDirectory: rootDir,
            autoRestart: false,
        });

        expect(supervisor.getSessionHealth(session.id).status).toBe('degraded');

        await supervisor.startSession(session.id);
        expect(supervisor.getSessionHealth(session.id).status).toBe('healthy');

        first.crash(2);
        const health = supervisor.getSessionHealth(session.id);
        const errored = supervisor.getSession(session.id);

        expect(health.status).toBe('crashed');
        expect(health.consecutiveFailures).toBe(1);
        expect(errored?.status).toBe('error');
        expect(errored?.lastError).toContain('unexpectedly');
    });
});
