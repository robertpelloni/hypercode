import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { SessionSupervisor } from '../../src/supervisor/SessionSupervisor.ts';
import { createFakeDetectEnvironment, FakeWorktreeManager } from './test-helpers.ts';

const tempDirs: string[] = [];

function createTempDir() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hypercode-session-worktree-'));
    tempDirs.push(dir);
    return dir;
}

afterEach(() => {
    while (tempDirs.length > 0) {
        fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
});

describe('session supervisor worktree isolation', () => {
    it('allocates a worktree for parallel sessions targeting the same repository', async () => {
        const rootDir = createTempDir();
        const worktreeManager = new FakeWorktreeManager();
        const supervisor = new SessionSupervisor({
            rootDir,
            worktreeManager,
            autoResumeOnStart: false,
            detectExecutionEnvironment: createFakeDetectEnvironment(),
        });

        const first = await supervisor.createSession({
            cliType: 'aider',
            workingDirectory: rootDir,
        });
        const second = await supervisor.createSession({
            cliType: 'claude',
            workingDirectory: rootDir,
        });

        expect(first.workingDirectory).toBe(rootDir);
        expect(first.worktreePath).toBeUndefined();
        expect(second.workingDirectory).toContain(second.id);
        expect(second.worktreePath).toContain(second.id);
        expect(worktreeManager.createCalls).toEqual([second.id]);
    });
});
