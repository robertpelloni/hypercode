import { afterEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';

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
          cliType: 'hypercode',
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
          harness: 'hypercode',
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
});
