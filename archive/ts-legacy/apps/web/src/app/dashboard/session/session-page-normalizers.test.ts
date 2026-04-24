import { describe, expect, it } from 'vitest';

import {
  normalizeSessionCatalog,
  normalizeSessionList,
  normalizeSessionState,
} from './session-page-normalizers';

describe('session page normalizers', () => {
  it('normalizes malformed session state payload safely', () => {
    expect(normalizeSessionState({
      activeGoal: '  ship v1  ',
      lastObjective: 123,
      isAutoDriveActive: 'yes',
    } as any)).toEqual({
      activeGoal: 'ship v1',
      lastObjective: '',
      isAutoDriveActive: false,
    });

    expect(normalizeSessionState(undefined)).toEqual({
      activeGoal: '',
      lastObjective: '',
      isAutoDriveActive: false,
    });
  });

  it('normalizes malformed catalog rows and session rows with safe defaults', () => {
    const catalog = normalizeSessionCatalog([
      { id: ' aider ', name: ' Aider ', installed: true, sessionCapable: true },
      { id: '', installed: 'bad', sessionCapable: null },
    ] as any);

    expect(catalog).toEqual([
      {
        id: 'aider',
        name: 'Aider',
        command: undefined,
        args: undefined,
        homepage: undefined,
        docsUrl: undefined,
        installHint: undefined,
        category: undefined,
        sessionCapable: true,
        versionArgs: undefined,
        installed: true,
        resolvedPath: null,
        version: null,
        detectionError: null,
      },
      {
        id: 'unknown-harness-2',
        name: 'Unknown harness',
        command: undefined,
        args: undefined,
        homepage: undefined,
        docsUrl: undefined,
        installHint: undefined,
        category: undefined,
        sessionCapable: false,
        versionArgs: undefined,
        installed: false,
        resolvedPath: null,
        version: null,
        detectionError: null,
      },
    ]);

    const sessions = normalizeSessionList([
      {
        id: ' ses-1 ',
        name: ' Session One ',
        cliType: ' aide ',
        workingDirectory: ' C:/repo ',
        status: 'running',
        restartCount: 2,
        maxRestartAttempts: 5,
        lastActivityAt: 1000,
        logs: [
          { stream: 'stdout', timestamp: 900, message: ' started ' },
          { stream: 'oops', timestamp: 'bad', message: 77 },
        ],
      },
      null,
    ] as any);

    expect(sessions[0].id).toBe('ses-1');
    expect(sessions[0].name).toBe('Session One');
    expect(sessions[0].cliType).toBe('aide');
    expect(sessions[0].workingDirectory).toBe('C:/repo');
    expect(sessions[0].status).toBe('running');
    expect(sessions[0].logs[0]).toEqual({ stream: 'stdout', timestamp: 900, message: 'started' });
    expect(sessions[0].logs[1].stream).toBe('system');
    expect(sessions[0].logs[1].message).toBe('(empty log line)');

    expect(sessions[1]).toMatchObject({
      id: 'unknown-session-2',
      name: 'Unnamed session',
      cliType: 'cli',
      workingDirectory: '',
      status: 'created',
      restartCount: 0,
      maxRestartAttempts: 0,
      autoRestart: true,
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/session/session-page-normalizers.test.ts
      isolateWorktree: false,
      lastExitCode: undefined,
      lastExitSignal: undefined,
      logs: [],
    });

    const stopping = normalizeSessionList([
      {
        id: 'ses-stopping',
        name: 'Stopping Session',
        cliType: 'claude',
        workingDirectory: 'C:/repo',
        status: 'stopping',
      },
    ] as any);

    expect(stopping[0]?.status).toBe('stopping');
  });

  it('normalizes worktree and exit metadata for crash visibility cards', () => {
    const sessions = normalizeSessionList([
      {
        id: 'ses-crash',
        name: 'Crash Session',
        cliType: 'codex',
        workingDirectory: 'C:/repo',
        isolateWorktree: true,
        lastExitCode: 137,
        lastExitSignal: ' SIGKILL ',
        lastError: 'process terminated',
        status: 'error',
      },
      {
        id: 'ses-bad-exit',
        name: 'Bad Exit Values',
        cliType: 'gemini',
        workingDirectory: 'C:/repo2',
        isolateWorktree: 'yes',
        lastExitCode: '1',
        lastExitSignal: 9,
      },
    ] as any);

    expect(sessions[0]).toMatchObject({
      id: 'ses-crash',
      isolateWorktree: true,
      lastExitCode: 137,
      lastExitSignal: 'SIGKILL',
      lastError: 'process terminated',
      status: 'error',
    });

    expect(sessions[1]).toMatchObject({
      id: 'ses-bad-exit',
      isolateWorktree: false,
      lastExitCode: undefined,
      lastExitSignal: undefined,
    });
=======
      logs: [],
    });
>>>>>>> origin/rewrite/main-sanitized:apps/web/src/app/dashboard/session/session-page-normalizers.test.ts
  });
});
