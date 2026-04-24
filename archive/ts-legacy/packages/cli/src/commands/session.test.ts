import { afterEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const queryTrpcMock = vi.fn();
const resolveControlPlaneLocationMock = vi.fn(() => ({
  source: 'default',
  baseUrl: 'http://127.0.0.1:4000/trpc',
  host: '127.0.0.1',
  port: 4000,
}));

vi.mock('../control-plane.js', () => ({
  queryTrpc: (...args: unknown[]) => queryTrpcMock(...args),
  resolveControlPlaneLocation: () => resolveControlPlaneLocationMock(),
}));

import { registerSessionCommand } from './session.js';

const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => {
  queryTrpcMock.mockReset();
  resolveControlPlaneLocationMock.mockClear();
  logSpy.mockClear();
  errorSpy.mockClear();
  process.exitCode = 0;
});

function createProgram(): Command {
  const program = new Command();
  registerSessionCommand(program);
  return program;
}

describe('registerSessionCommand', () => {
  it('lists live local and cloud sessions as JSON', async () => {
    queryTrpcMock
      .mockResolvedValueOnce([
        {
          id: 'sess_local_1',
          name: 'repo-fix',
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.test.ts
          cliType: 'hypercode',
=======
          cliType: 'borg',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.test.ts
          workingDirectory: 'C:\\repo',
          status: 'running',
          lastActivityAt: 200,
          metadata: { model: 'gpt-5.4' },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'cds_1',
          provider: 'jules',
          projectName: 'cloud-project',
          task: 'Investigate CI failure',
          status: 'active',
          updatedAt: '2026-04-02T09:00:00.000Z',
        },
      ]);

    const program = createProgram();
    await program.parseAsync(['session', 'list', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenNthCalledWith(1, 'session.list');
    expect(queryTrpcMock).toHaveBeenNthCalledWith(2, 'cloudDev.listSessions');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      sessions: [
        {
          source: 'cloud',
          id: 'cds_1',
          name: 'cloud-project',
          location: 'Investigate CI failure',
          harness: 'jules',
          model: null,
          status: 'active',
          lastActivity: '2026-04-02T09:00:00.000Z',
        },
        {
          source: 'local',
          id: 'sess_local_1',
          name: 'repo-fix',
          location: 'C:\\repo',
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.test.ts
          harness: 'hypercode',
=======
          harness: 'borg',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.test.ts
          model: 'gpt-5.4',
          status: 'running',
          lastActivity: 200,
        },
      ],
    }, null, 2));
  });

  it('uses only cloud sessions when --cloud is passed', async () => {
    queryTrpcMock.mockResolvedValueOnce([
      {
        id: 'cds_1',
        provider: 'codex',
        projectName: 'cloud-project',
        task: 'Implement fix',
        status: 'pending',
        updatedAt: '2026-04-02T09:00:00.000Z',
      },
    ]);

    const program = createProgram();
    await program.parseAsync(['session', 'list', '--cloud', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledTimes(1);
    expect(queryTrpcMock).toHaveBeenCalledWith('cloudDev.listSessions');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      sessions: [
        {
          source: 'cloud',
          id: 'cds_1',
          name: 'cloud-project',
          location: 'Implement fix',
          harness: 'codex',
          model: null,
          status: 'pending',
          lastActivity: '2026-04-02T09:00:00.000Z',
        },
      ],
    }, null, 2));
  });

  it('starts a live session as JSON', async () => {
    queryTrpcMock
      .mockResolvedValueOnce({
        id: 'sess_live_1',
        name: 'repo-fix',
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.test.ts
        cliType: 'hypercode',
=======
        cliType: 'borg',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.test.ts
        workingDirectory: 'C:\\repo',
        status: 'created',
        metadata: {
          model: 'gpt-5.4',
          provider: 'openai',
          harnessMaturity: 'Experimental',
          harnessRole: 'primary',
        },
      })
      .mockResolvedValueOnce({
        id: 'sess_live_1',
        name: 'repo-fix',
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.test.ts
        cliType: 'hypercode',
=======
        cliType: 'borg',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.test.ts
        workingDirectory: 'C:\\repo',
        status: 'running',
        metadata: {
          model: 'gpt-5.4',
          provider: 'openai',
          harnessMaturity: 'Experimental',
          harnessRole: 'primary',
        },
      });

    const program = createProgram();
    await program.parseAsync([
      'session',
      'start',
      'C:\\repo',
      '--name',
      'repo-fix',
      '--model',
      'gpt-5.4',
      '--provider',
      'openai',
      '--json',
    ], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenNthCalledWith(1, 'session.create', {
      name: 'repo-fix',
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.test.ts
      cliType: 'hypercode',
=======
      cliType: 'borg',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.test.ts
      workingDirectory: 'C:\\repo',
      autoRestart: true,
      metadata: {
        model: 'gpt-5.4',
        provider: 'openai',
        harnessMaturity: 'Experimental',
        harnessRole: 'primary',
      },
    });
    expect(queryTrpcMock).toHaveBeenNthCalledWith(2, 'session.start', { id: 'sess_live_1' });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      session: {
        id: 'sess_live_1',
        name: 'repo-fix',
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.test.ts
        cliType: 'hypercode',
=======
        cliType: 'borg',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.test.ts
        workingDirectory: 'C:\\repo',
        status: 'running',
        metadata: {
          model: 'gpt-5.4',
          provider: 'openai',
          harnessMaturity: 'Experimental',
          harnessRole: 'primary',
        },
      },
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.test.ts
      harness: 'hypercode',
=======
      harness: 'borg',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.test.ts
      maturity: 'Experimental',
      launchCommand: 'go run .',
      toolInventorySource: null,
    }, null, 2));
  });

  it('reports unknown harness as structured JSON on session start', async () => {
    const program = createProgram();
    await program.parseAsync(['session', 'start', 'C:\\repo', '--harness', 'unknown', '--json'], { from: 'user' });

    expect(queryTrpcMock).not.toHaveBeenCalled();
    const payload = logSpy.mock.calls.at(-1)?.[0];
    expect(typeof payload).toBe('string');
    expect(payload).toContain("\"error\": \"Unknown harness 'unknown'. Supported harnesses:");
    expect(process.exitCode).toBe(1);
  });

  it('stops a live session as JSON', async () => {
    queryTrpcMock.mockResolvedValue({
      id: 'sess_live_1',
      name: 'repo-fix',
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.test.ts
      cliType: 'hypercode',
=======
      cliType: 'borg',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.test.ts
      workingDirectory: 'C:\\repo',
      status: 'stopping',
    });

    const program = createProgram();
    await program.parseAsync(['session', 'stop', 'sess_live_1', '--force', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('session.stop', {
      id: 'sess_live_1',
      force: true,
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      session: {
        id: 'sess_live_1',
        name: 'repo-fix',
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.test.ts
        cliType: 'hypercode',
=======
        cliType: 'borg',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.test.ts
        workingDirectory: 'C:\\repo',
        status: 'stopping',
      },
    }, null, 2));
  });

  it('resumes a live session as JSON', async () => {
    queryTrpcMock.mockResolvedValue({
      id: 'sess_live_1',
      name: 'repo-fix',
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.test.ts
      cliType: 'hypercode',
=======
      cliType: 'borg',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.test.ts
      workingDirectory: 'C:\\repo',
      status: 'restarting',
    });

    const program = createProgram();
    await program.parseAsync(['session', 'resume', 'sess_live_1', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('session.restart', {
      id: 'sess_live_1',
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      session: {
        id: 'sess_live_1',
        name: 'repo-fix',
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.test.ts
        cliType: 'hypercode',
=======
        cliType: 'borg',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.test.ts
        workingDirectory: 'C:\\repo',
        status: 'restarting',
      },
    }, null, 2));
  });

  it('fails session pause explicitly instead of returning fake success', async () => {
    const program = createProgram();
    await program.parseAsync(['session', 'pause', 'sess_live_1', '--json'], { from: 'user' });

    expect(queryTrpcMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      error: "Live session pause is unavailable for 'sess_live_1': the control plane does not expose a real pause route yet.",
    }, null, 2));
    expect(process.exitCode).toBe(1);
  });

  it('exports a session as JSON from the live control plane', async () => {
    queryTrpcMock.mockResolvedValue({
      id: 'export_1',
      format: 'json',
      package: {
        version: '1.0',
        sessionCount: 1,
      },
    });

    const program = createProgram();
    await program.parseAsync(['session', 'export', 'sess_live_1', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('sessionExport.export', {
      format: 'json',
      sessionIds: ['sess_live_1'],
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      id: 'export_1',
      format: 'json',
      package: {
        version: '1.0',
        sessionCount: 1,
      },
    }, null, 2));
  });

  it('writes exported session data to the requested file', async () => {
    queryTrpcMock.mockResolvedValue({
      id: 'export_1',
      format: 'json',
      package: {
        version: '1.0',
        sessionCount: 1,
      },
    });

<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.test.ts
    const output = join(tmpdir(), `hypercode-session-export-${Date.now()}.json`);
=======
    const output = join(tmpdir(), `borg-session-export-${Date.now()}.json`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.test.ts

    try {
      const program = createProgram();
      await program.parseAsync(['session', 'export', 'sess_live_1', '--output', output], { from: 'user' });

      expect(queryTrpcMock).toHaveBeenCalledWith('sessionExport.export', {
        format: 'json',
        sessionIds: ['sess_live_1'],
      });
      expect(readFileSync(output, 'utf8')).toContain('"sessionCount": 1');
    } finally {
      rmSync(output, { force: true });
    }
  });

  it('imports a session export as JSON through the live control plane', async () => {
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.test.ts
    const input = join(tmpdir(), `hypercode-session-import-${Date.now()}.json`);
=======
    const input = join(tmpdir(), `borg-session-import-${Date.now()}.json`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.test.ts
    queryTrpcMock.mockResolvedValue({
      imported: 1,
      skipped: 0,
      merged: 0,
      errors: [],
      dryRun: true,
      details: [
        { sessionId: 'sess_live_1', action: 'imported', reason: 'dry-run preview' },
      ],
    });

    try {
      writeFileSync(input, JSON.stringify({
        version: '1.0',
        sessions: [{ id: 'sess_live_1' }],
      }), 'utf8');

      const program = createProgram();
      await program.parseAsync([
        'session',
        'import',
        input,
        '--dry-run',
        '--source-environment',
        'staging',
        '--json',
      ], { from: 'user' });

      expect(queryTrpcMock).toHaveBeenCalledWith('sessionExport.import', {
        data: JSON.stringify({
          version: '1.0',
          sessions: [{ id: 'sess_live_1' }],
        }),
        dryRun: true,
        merge: true,
        sourceEnvironment: 'staging',
      });
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
        imported: 1,
        skipped: 0,
        merged: 0,
        errors: [],
        dryRun: true,
        details: [
          { sessionId: 'sess_live_1', action: 'imported', reason: 'dry-run preview' },
        ],
      }, null, 2));
    } finally {
      rmSync(input, { force: true });
    }
  });

  it('passes replace mode to live session import', async () => {
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.test.ts
    const input = join(tmpdir(), `hypercode-session-import-replace-${Date.now()}.json`);
=======
    const input = join(tmpdir(), `borg-session-import-replace-${Date.now()}.json`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.test.ts
    queryTrpcMock.mockResolvedValue({
      imported: 1,
      skipped: 0,
      merged: 0,
      errors: [],
      dryRun: false,
      details: [
        { sessionId: 'sess_live_1', action: 'imported' },
      ],
    });

    try {
      writeFileSync(input, JSON.stringify({
        version: '1.0',
        sessions: [{ id: 'sess_live_1' }],
      }), 'utf8');

      const program = createProgram();
      await program.parseAsync([
        'session',
        'import',
        input,
        '--replace',
        '--json',
      ], { from: 'user' });

      expect(queryTrpcMock).toHaveBeenCalledWith('sessionExport.import', {
        data: JSON.stringify({
          version: '1.0',
          sessions: [{ id: 'sess_live_1' }],
        }),
        dryRun: false,
        merge: false,
        sourceEnvironment: undefined,
      });
    } finally {
      rmSync(input, { force: true });
    }
  });

  it('reports control-plane failures without throwing out of the command', async () => {
    queryTrpcMock.mockRejectedValue(new Error('control plane unavailable'));

    const program = createProgram();
    await program.parseAsync(['session', 'list'], { from: 'user' });

    expect(errorSpy).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('shows live cloud session inventory as JSON', async () => {
    queryTrpcMock
      .mockResolvedValueOnce([
        {
          provider: 'jules',
          name: 'Jules (Google)',
          enabled: true,
          hasApiKey: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'cds_1',
          provider: 'jules',
          projectName: 'cloud-project',
          task: 'Investigate CI failure',
          status: 'active',
          updatedAt: '2026-04-02T09:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce({
        totalSessions: 1,
        byProvider: { jules: 1 },
        byStatus: { active: 1 },
        totalMessages: 3,
        totalLogs: 5,
        providers: 4,
        enabledProviders: 1,
      });

    const program = createProgram();
    await program.parseAsync(['session', 'cloud', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenNthCalledWith(1, 'cloudDev.listProviders');
    expect(queryTrpcMock).toHaveBeenNthCalledWith(2, 'cloudDev.listSessions');
    expect(queryTrpcMock).toHaveBeenNthCalledWith(3, 'cloudDev.stats');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      providers: [
        {
          provider: 'jules',
          name: 'Jules (Google)',
          enabled: true,
          hasApiKey: true,
        },
      ],
      sessions: [
        {
          id: 'cds_1',
          provider: 'jules',
          projectName: 'cloud-project',
          task: 'Investigate CI failure',
          status: 'active',
          updatedAt: '2026-04-02T09:00:00.000Z',
        },
      ],
      stats: {
        totalSessions: 1,
        byProvider: { jules: 1 },
        byStatus: { active: 1 },
        totalMessages: 3,
        totalLogs: 5,
        providers: 4,
        enabledProviders: 1,
      },
    }, null, 2));
  });

  it('broadcasts to cloud sessions through the live control plane', async () => {
    queryTrpcMock.mockResolvedValue({
      delivered: 2,
      skipped: 1,
      results: [
        { sessionId: 'cds_1', messageId: 'msg_1', status: 'active' },
        { sessionId: 'cds_2', messageId: 'msg_2', status: 'pending' },
      ],
      skippedByReason: {
        terminal_requires_force: 1,
      },
      skippedSessionIds: ['cds_3'],
      skippedSessions: [
        {
          id: 'cds_3',
          provider: 'codex',
          projectName: 'completed-project',
          status: 'completed',
          reason: 'terminal_requires_force',
        },
      ],
      skippedSessionsSampled: false,
    });

    const program = createProgram();
    await program.parseAsync(['session', 'broadcast', 'ship it', '--cloud', '--force', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('cloudDev.broadcastMessage', {
      content: 'ship it',
      force: true,
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      delivered: 2,
      skipped: 1,
      results: [
        { sessionId: 'cds_1', messageId: 'msg_1', status: 'active' },
        { sessionId: 'cds_2', messageId: 'msg_2', status: 'pending' },
      ],
      skippedByReason: {
        terminal_requires_force: 1,
      },
      skippedSessionIds: ['cds_3'],
      skippedSessions: [
        {
          id: 'cds_3',
          provider: 'codex',
          projectName: 'completed-project',
          status: 'completed',
          reason: 'terminal_requires_force',
        },
      ],
      skippedSessionsSampled: false,
    }, null, 2));
  });

  it('fails local session broadcast explicitly instead of returning fake success', async () => {
    const program = createProgram();
    await program.parseAsync(['session', 'broadcast', 'ship it', '--json'], { from: 'user' });

    expect(queryTrpcMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      error: 'Live local session broadcast is unavailable: only cloud session broadcast is currently wired. Re-run with --cloud to use the live cloudDev.broadcastMessage route.',
    }, null, 2));
    expect(process.exitCode).toBe(1);
  });

  it('fails cloud transfer explicitly instead of printing not implemented copy', async () => {
    const program = createProgram();
    await program.parseAsync(['session', 'cloud', '--transfer', 'sess_live_1', '--json'], { from: 'user' });

    expect(queryTrpcMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      error: "Live cloud transfer is unavailable for 'sess_live_1': the control plane does not expose a real local-to-cloud transfer route yet.",
    }, null, 2));
    expect(process.exitCode).toBe(1);
  });
});
