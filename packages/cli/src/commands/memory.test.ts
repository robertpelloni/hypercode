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

import { registerMemoryCommand } from './memory.js';

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
  registerMemoryCommand(program);
  return program;
}

describe('registerMemoryCommand', () => {
  it('searches memories as JSON from the live control plane', async () => {
    queryTrpcMock.mockResolvedValue([
      {
        id: 'mem-1',
        content: 'Project uses OAuth 2.0',
        metadata: { source: 'cli' },
        score: 0.97,
      },
    ]);

    const program = createProgram();
    await program.parseAsync(['memory', 'search', 'oauth', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('memory.query', { query: 'oauth', limit: 10 });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      query: 'oauth',
      results: [
        {
          id: 'mem-1',
          content: 'Project uses OAuth 2.0',
          metadata: { source: 'cli' },
          score: 0.97,
        },
      ],
    }, null, 2));
  });

  it('lists contexts as JSON from the live control plane', async () => {
    queryTrpcMock.mockResolvedValue([
      {
        id: 'ctx-1',
        title: 'Auth context',
        source: 'browser',
        createdAt: 100,
        chunks: 2,
        metadata: { type: 'semantic' },
      },
    ]);

    const program = createProgram();
    await program.parseAsync(['memory', 'list', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('memory.listContexts');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      contexts: [
        {
          id: 'ctx-1',
          title: 'Auth context',
          source: 'browser',
          createdAt: 100,
          chunks: 2,
          metadata: { type: 'semantic' },
        },
      ],
    }, null, 2));
  });

  it('shows memory stats as JSON from live control-plane data', async () => {
    queryTrpcMock
      .mockResolvedValueOnce({
        sessionCount: 2,
        workingCount: 5,
        longTermCount: 7,
        observationCount: 3,
        sessionSummaryCount: 1,
        promptCount: 4,
      })
      .mockResolvedValueOnce({
        totalEntries: 18,
        sectionCount: 6,
        populatedSectionCount: 4,
        missingSections: ['bookmarks'],
        lastUpdatedAt: '2026-04-02T09:00:00.000Z',
        runtimePipeline: {
          configuredMode: 'hybrid',
          providerCount: 2,
          providerNames: ['file', 'sqlite'],
          sectionedStoreEnabled: true,
        },
      });

    const program = createProgram();
    await program.parseAsync(['memory', 'stats', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenNthCalledWith(1, 'memory.getAgentStats');
    expect(queryTrpcMock).toHaveBeenNthCalledWith(2, 'memory.getSectionedMemoryStatus');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      stats: {
        sessionCount: 2,
        workingCount: 5,
        longTermCount: 7,
        observationCount: 3,
        sessionSummaryCount: 1,
        promptCount: 4,
      },
      sectionedStore: {
        totalEntries: 18,
        sectionCount: 6,
        populatedSectionCount: 4,
        missingSections: ['bookmarks'],
        lastUpdatedAt: '2026-04-02T09:00:00.000Z',
        runtimePipeline: {
          configuredMode: 'hybrid',
          providerCount: 2,
          providerNames: ['file', 'sqlite'],
          sectionedStoreEnabled: true,
        },
      },
    }, null, 2));
  });

  it('reports control-plane failures without throwing out of the command', async () => {
    queryTrpcMock.mockRejectedValue(new Error('control plane unavailable'));

    const program = createProgram();
    await program.parseAsync(['memory', 'search', 'oauth'], { from: 'user' });

    expect(errorSpy).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
});
