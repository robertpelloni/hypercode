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

import { registerToolsCommand } from './tools.js';

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
  registerToolsCommand(program);
  return program;
}

describe('registerToolsCommand', () => {
  it('lists live MCP tools as JSON', async () => {
    queryTrpcMock.mockResolvedValue([
      {
        name: 'search_tools',
        description: 'Search available tools',
        server: 'meta',
        serverDisplayName: 'Meta MCP',
        semanticGroup: 'tool-discovery',
        semanticGroupLabel: 'tool discovery',
        keywords: ['search', 'tools'],
        alwaysOn: true,
      },
    ]);

    const program = createProgram();
    await program.parseAsync(['tools', 'list', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('mcp.listTools');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      tools: [
        {
          name: 'search_tools',
          description: 'Search available tools',
          server: 'meta',
          serverDisplayName: 'Meta MCP',
          semanticGroup: 'tool-discovery',
          semanticGroupLabel: 'tool discovery',
          keywords: ['search', 'tools'],
          alwaysOn: true,
        },
      ],
    }, null, 2));
  });

  it('searches live MCP tools as JSON with top-k limiting', async () => {
    queryTrpcMock.mockResolvedValue([
      {
        name: 'search_tools',
        description: 'Search available tools',
        server: 'meta',
        serverDisplayName: 'Meta MCP',
        loaded: true,
        hydrated: true,
        matchReason: 'matched tool discovery intent',
        rank: 1,
      },
      {
        name: 'list_all_tools',
        description: 'List available tools',
        server: 'meta',
        serverDisplayName: 'Meta MCP',
        loaded: true,
        hydrated: false,
        matchReason: 'matched inventory intent',
        rank: 2,
      },
    ]);

    const program = createProgram();
    await program.parseAsync(['tools', 'search', 'tool discovery', '--top-k', '1', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('mcp.searchTools', {
      query: 'tool discovery',
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      query: 'tool discovery',
      profile: null,
      results: [
        {
          name: 'search_tools',
          description: 'Search available tools',
          server: 'meta',
          serverDisplayName: 'Meta MCP',
          loaded: true,
          hydrated: true,
          matchReason: 'matched tool discovery intent',
          rank: 1,
        },
      ],
    }, null, 2));
  });

  it('reports control-plane failures without throwing out of the command', async () => {
    queryTrpcMock.mockRejectedValue(new Error('control plane unavailable'));

    const program = createProgram();
    await program.parseAsync(['tools', 'list'], { from: 'user' });

    expect(errorSpy).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('shows tool detail as JSON from the live control plane', async () => {
    queryTrpcMock.mockResolvedValue({
      uuid: 'search_tools',
      name: 'search_tools',
      description: 'Search available tools',
      server: 'meta',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
        },
        required: ['query'],
      },
      schemaParamCount: 1,
      always_on: true,
      isDeferred: false,
      mcpServerUuid: 'server-1',
    });

    const program = createProgram();
    await program.parseAsync(['tools', 'info', 'search_tools', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('tools.get', { uuid: 'search_tools' });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      tool: {
        uuid: 'search_tools',
        name: 'search_tools',
        description: 'Search available tools',
        server: 'meta',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
          },
          required: ['query'],
        },
        schemaParamCount: 1,
        always_on: true,
        isDeferred: false,
        mcpServerUuid: 'server-1',
      },
    }, null, 2));
  });

  it('lists tool groups as JSON from the live control plane', async () => {
    queryTrpcMock.mockResolvedValue([
      {
        uuid: 'group-1',
        name: 'repo-coding',
        description: 'Coding helpers',
        tools: ['read_file', 'write_file'],
      },
    ]);

    const program = createProgram();
    await program.parseAsync(['tools', 'groups', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('toolSets.list');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      groups: [
        {
          uuid: 'group-1',
          name: 'repo-coding',
          description: 'Coding helpers',
          tools: ['read_file', 'write_file'],
        },
      ],
    }, null, 2));
  });

  it('creates a tool group as JSON via the live control plane', async () => {
    queryTrpcMock.mockResolvedValue({
      uuid: 'group-2',
      name: 'new-group',
      description: null,
      tools: [],
    });

    const program = createProgram();
    await program.parseAsync(['tools', 'groups', '--create', 'new-group', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('toolSets.create', {
      name: 'new-group',
      description: null,
      tools: [],
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      group: {
        uuid: 'group-2',
        name: 'new-group',
        description: null,
        tools: [],
      },
    }, null, 2));
  });

  it('deletes a tool group as JSON via the live control plane', async () => {
    queryTrpcMock.mockResolvedValue({ success: true });

    const program = createProgram();
    await program.parseAsync(['tools', 'groups', '--delete', 'group-2', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('toolSets.delete', {
      uuid: 'group-2',
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      success: true,
    }, null, 2));
  });

  it('enables a tool as JSON via the live control plane', async () => {
    queryTrpcMock.mockResolvedValue({
      success: true,
      tool: {
        uuid: 'search_tools',
        name: 'search_tools',
        description: 'Search available tools',
        server: 'meta',
        always_on: true,
      },
    });

    const program = createProgram();
    await program.parseAsync(['tools', 'enable', 'search_tools', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('tools.setAlwaysOn', {
      uuid: 'search_tools',
      alwaysOn: true,
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      success: true,
      tool: {
        uuid: 'search_tools',
        name: 'search_tools',
        description: 'Search available tools',
        server: 'meta',
        always_on: true,
      },
    }, null, 2));
  });

  it('disables a tool as JSON via the live control plane', async () => {
    queryTrpcMock.mockResolvedValue({
      success: true,
      tool: {
        uuid: 'search_tools',
        name: 'search_tools',
        description: 'Search available tools',
        server: 'meta',
        always_on: false,
      },
    });

    const program = createProgram();
    await program.parseAsync(['tools', 'disable', 'search_tools', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('tools.setAlwaysOn', {
      uuid: 'search_tools',
      alwaysOn: false,
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      success: true,
      tool: {
        uuid: 'search_tools',
        name: 'search_tools',
        description: 'Search available tools',
        server: 'meta',
        always_on: false,
      },
    }, null, 2));
  });

  it('fails tool rename explicitly instead of returning fake success', async () => {
    const program = createProgram();
    await program.parseAsync(['tools', 'rename', 'search_tools', 'search_tools_v2', '--json'], { from: 'user' });

    expect(queryTrpcMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      error: "Live tool rename is unavailable for 'search_tools': the control plane does not expose a real tool-rename route yet.",
    }, null, 2));
    expect(process.exitCode).toBe(1);
  });
});
