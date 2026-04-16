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

import { registerAgentCommand } from './agent.js';

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
  registerAgentCommand(program);
  return program;
}

describe('registerAgentCommand', () => {
  it('fails agent list explicitly instead of returning fake inventory', async () => {
    const program = createProgram();
    await program.parseAsync(['agent', 'list', '--json'], { from: 'user' });

    expect(queryTrpcMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      error: 'Live agent definition listing is unavailable: the control plane does not expose a real agent inventory route yet.',
    }, null, 2));
    expect(process.exitCode).toBe(1);
  });

  it('fails agent spawn explicitly instead of returning fake success', async () => {
    const program = createProgram();
    await program.parseAsync(['agent', 'spawn', 'architect', '--json'], { from: 'user' });

    expect(queryTrpcMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      error: "Live agent spawn is unavailable for 'architect': the control plane does not expose a real generic agent spawn route yet.",
    }, null, 2));
    expect(process.exitCode).toBe(1);
  });

  it('fails agent stop explicitly instead of returning fake success', async () => {
    const program = createProgram();
    await program.parseAsync(['agent', 'stop', 'agent-1', '--json'], { from: 'user' });

    expect(queryTrpcMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      error: "Live agent stop is unavailable for 'agent-1': the control plane does not expose a real generic agent stop route yet.",
    }, null, 2));
    expect(process.exitCode).toBe(1);
  });

  it('fails agent status explicitly instead of returning fake empty state', async () => {
    const program = createProgram();
    await program.parseAsync(['agent', 'status', '--json'], { from: 'user' });

    expect(queryTrpcMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      error: 'Live agent status is unavailable: the control plane does not expose a real generic running-agent inventory route yet.',
    }, null, 2));
    expect(process.exitCode).toBe(1);
  });

  it('fails agent chat explicitly instead of opening a fake interactive shell', async () => {
    const program = createProgram();
    await program.parseAsync(['agent', 'chat', 'agent-1', '--json'], { from: 'user' });

    expect(queryTrpcMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      error: "Live agent chat is unavailable for 'agent-1': the control plane only exposes stateless agent chat, not attached agent-instance chat.",
    }, null, 2));
    expect(process.exitCode).toBe(1);
  });

  it('shows live council status as JSON', async () => {
    queryTrpcMock
      .mockResolvedValueOnce({ status: 'running' })
      .mockResolvedValueOnce({
        isActive: true,
        activeWorkers: ['worker-1'],
        queueDepth: 2,
        lastActivity: '2026-04-02T09:00:00.000Z',
        totalTasksCompleted: 12,
      })
      .mockResolvedValueOnce({
        enabled: true,
        supervisorCount: 3,
        availableCount: 5,
      });

    const program = createProgram();
    await program.parseAsync(['agent', 'council', '--status', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenNthCalledWith(1, 'director.status');
    expect(queryTrpcMock).toHaveBeenNthCalledWith(2, 'supervisor.status');
    expect(queryTrpcMock).toHaveBeenNthCalledWith(3, 'council.status');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      director: { status: 'running' },
      supervisor: {
        isActive: true,
        activeWorkers: ['worker-1'],
        queueDepth: 2,
        lastActivity: '2026-04-02T09:00:00.000Z',
        totalTasksCompleted: 12,
      },
      council: {
        enabled: true,
        supervisorCount: 3,
        availableCount: 5,
      },
    }, null, 2));
  });

  it('reports control-plane failures without throwing out of the command', async () => {
    queryTrpcMock.mockRejectedValue(new Error('control plane unavailable'));

    const program = createProgram();
    await program.parseAsync(['agent', 'council', '--status'], { from: 'user' });

    expect(errorSpy).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
});
