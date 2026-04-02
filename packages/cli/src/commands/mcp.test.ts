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

import { registerMcpCommand } from './mcp.js';

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
  registerMcpCommand(program);
  return program;
}

describe('registerMcpCommand', () => {
  it('lists MCP servers as JSON from the live control plane', async () => {
    queryTrpcMock.mockResolvedValue([
      {
        name: 'filesystem',
        displayName: 'Filesystem',
        tags: ['local', 'files'],
        status: 'connected',
        warmupState: 'ready',
        toolCount: 8,
        alwaysOn: true,
      },
    ]);

    const program = createProgram();
    await program.parseAsync(['mcp', 'list', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('mcp.listServers');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      servers: [
        {
          name: 'filesystem',
          displayName: 'Filesystem',
          tags: ['local', 'files'],
          status: 'connected',
          warmupState: 'ready',
          toolCount: 8,
          alwaysOn: true,
        },
      ],
    }, null, 2));
  });

  it('searches MCP tools as JSON from the live control plane', async () => {
    queryTrpcMock.mockResolvedValue([
      {
        name: 'search_tools',
        description: 'Search tools',
        server: 'meta',
        serverDisplayName: 'Meta MCP',
        semanticGroup: 'tool-discovery',
        matchReason: 'matched query',
      },
    ]);

    const program = createProgram();
    await program.parseAsync(['mcp', 'tools', '--search', 'search', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('mcp.searchTools', { query: 'search' });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      query: 'search',
      tools: [
        {
          name: 'search_tools',
          description: 'Search tools',
          server: 'meta',
          serverDisplayName: 'Meta MCP',
          semanticGroup: 'tool-discovery',
          matchReason: 'matched query',
        },
      ],
    }, null, 2));
  });

  it('searches the MCP registry snapshot as JSON', async () => {
    queryTrpcMock.mockResolvedValue([
      {
        id: 'filesystem',
        name: 'Filesystem MCP',
        url: 'https://github.com/example/filesystem-mcp',
        category: 'mcp-servers',
        description: 'Filesystem access',
        tags: ['mcp', 'filesystem'],
      },
    ]);

    const program = createProgram();
    await program.parseAsync(['mcp', 'search', 'filesystem', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('mcpServers.registrySnapshot');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      query: 'filesystem',
      category: null,
      results: [
        {
          id: 'filesystem',
          name: 'Filesystem MCP',
          url: 'https://github.com/example/filesystem-mcp',
          category: 'mcp-servers',
          description: 'Filesystem access',
          tags: ['mcp', 'filesystem'],
        },
      ],
    }, null, 2));
  });

  it('shows live MCP config as JSON from the config router', async () => {
    queryTrpcMock.mockResolvedValue([
      { key: 'mcp.progressiveDisclosure', value: 'true' },
      { key: 'mcp.toonFormat', value: 'false' },
      { key: 'mcp.heartbeatInterval', value: '30000' },
    ]);

    const program = createProgram();
    await program.parseAsync(['mcp', 'config', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('config.list');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      progressiveDisclosure: true,
      toonFormat: false,
      heartbeatInterval: 30000,
    }, null, 2));
  });

  it('reports control-plane failures without throwing out of the command', async () => {
    queryTrpcMock.mockRejectedValue(new Error('control plane unavailable'));

    const program = createProgram();
    await program.parseAsync(['mcp', 'list'], { from: 'user' });

    expect(errorSpy).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
});
