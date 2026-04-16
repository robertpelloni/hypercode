import { afterEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';

const queryTrpcMock = vi.fn();
const resolveControlPlaneLocationMock = vi.fn(() => ({
  source: 'default',
  baseUrl: 'http://127.0.0.1:4000/trpc',
  host: '127.0.0.1',
  port: 4000,
}));

const readLocalStartupProvenanceMock = vi.fn<() => Record<string, unknown> | null>(() => null);

vi.mock('../control-plane.js', () => ({
  queryTrpc: (...args: unknown[]) => queryTrpcMock(...args),
  readLocalStartupProvenance: () => readLocalStartupProvenanceMock(),
  resolveControlPlaneLocation: () => resolveControlPlaneLocationMock(),
}));

vi.mock('../version.js', () => ({
  readCanonicalVersion: () => '1.0.15',
}));

import { registerStatusCommand } from './status.js';

const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => {
  queryTrpcMock.mockReset();
  readLocalStartupProvenanceMock.mockReset();
  readLocalStartupProvenanceMock.mockReturnValue(null);
  resolveControlPlaneLocationMock.mockClear();
  logSpy.mockClear();
  errorSpy.mockClear();
  process.exitCode = 0;
});

function createProgram(): Command {
  const program = new Command();
  registerStatusCommand(program);
  return program;
}

describe('registerStatusCommand', () => {
  it('shows live system status as JSON', async () => {
    readLocalStartupProvenanceMock.mockReturnValue({
      requestedRuntime: 'auto',
      activeRuntime: 'go',
      requestedPort: 4000,
      activePort: 4012,
      portDecision: 'fallback port selected before launch',
      portReason: 'Port 4000 was already occupied before startup, so HyperCode selected 4012.',
      launchMode: 'prebuilt Go binary',
      dashboardMode: 'compatibility-only; skipped for Go runtime',
      installDecision: 'skipped',
      buildDecision: 'skipped',
    });

    queryTrpcMock
      .mockResolvedValueOnce({
        status: 'running',
        ready: true,
        summary: 'All startup checks passed.',
        uptime: 123,
        runtime: { version: '1.0.15' },
        checks: {
          sectionedMemory: {
            totalEntries: 42,
            sectionCount: 6,
          },
        },
      })
      .mockResolvedValueOnce({
        initialized: true,
        serverCount: 3,
        toolCount: 120,
        connectedCount: 2,
      })
      .mockResolvedValueOnce([
        { status: 'running' },
        { status: 'paused' },
      ])
      .mockResolvedValueOnce([
        { configured: true, authenticated: true },
        { configured: true, authenticated: false },
      ]);

    const program = createProgram();
    await program.parseAsync(['status', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenNthCalledWith(1, 'startupStatus');
    expect(queryTrpcMock).toHaveBeenNthCalledWith(2, 'mcp.getStatus');
    expect(queryTrpcMock).toHaveBeenNthCalledWith(3, 'session.list');
    expect(queryTrpcMock).toHaveBeenNthCalledWith(4, 'billing.getProviderQuotas');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      startupMode: {
        requestedRuntime: 'auto',
        activeRuntime: 'go',
        requestedPort: 4000,
        activePort: 4012,
        portDecision: 'fallback port selected before launch',
        portReason: 'Port 4000 was already occupied before startup, so HyperCode selected 4012.',
        launchMode: 'prebuilt Go binary',
        dashboardMode: 'compatibility-only; skipped for Go runtime',
        installDecision: 'skipped',
        buildDecision: 'skipped',
      },
      version: '1.0.15',
      server: {
        status: 'running',
        ready: true,
        uptime: 123,
        summary: 'All startup checks passed.',
      },
      mcp: {
        initialized: true,
        servers: 3,
        connected: 2,
        tools: 120,
      },
      sessions: {
        active: 1,
        paused: 1,
        total: 2,
      },
      memory: {
        entries: 42,
        sections: 6,
      },
      providers: {
        configured: 2,
        authenticated: 1,
        total: 2,
      },
    }, null, 2));
  });

  it('reports control-plane failures without throwing out of the command', async () => {
    queryTrpcMock.mockRejectedValue(new Error('control plane unavailable'));

    const program = createProgram();
    await program.parseAsync(['status'], { from: 'user' });

    expect(errorSpy).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
});
