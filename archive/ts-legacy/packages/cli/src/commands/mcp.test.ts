import { afterEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'node:fs';

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

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => {
  queryTrpcMock.mockReset();
  resolveControlPlaneLocationMock.mockClear();
  vi.mocked(readFileSync).mockReset();
  vi.mocked(writeFileSync).mockReset();
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

  it('inspects an MCP server from live server and tool inventory', async () => {
    queryTrpcMock
      .mockResolvedValueOnce([
        {
          name: 'filesystem',
          displayName: 'Filesystem',
          status: 'connected',
          warmupState: 'ready',
          toolCount: 2,
          alwaysOn: true,
          tags: ['local', 'files'],
        },
      ])
      .mockResolvedValueOnce([
        {
          name: 'read_file',
          description: 'Read a file',
          server: 'filesystem',
        },
        {
          name: 'write_file',
          description: 'Write a file',
          server: 'filesystem',
        },
      ]);

    const program = createProgram();
    await program.parseAsync(['mcp', 'inspect', 'filesystem', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenNthCalledWith(1, 'mcp.listServers');
    expect(queryTrpcMock).toHaveBeenNthCalledWith(2, 'mcp.listTools');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      server: {
        name: 'filesystem',
        displayName: 'Filesystem',
        status: 'connected',
        warmupState: 'ready',
        toolCount: 2,
        alwaysOn: true,
        tags: ['local', 'files'],
      },
      tools: [
        {
          name: 'read_file',
          description: 'Read a file',
          server: 'filesystem',
        },
        {
          name: 'write_file',
          description: 'Write a file',
          server: 'filesystem',
        },
      ],
    }, null, 2));
  });

  it('shows MCP traffic as JSON from the live control plane', async () => {
    queryTrpcMock.mockResolvedValue([
      {
        timestamp: 1712052000000,
        serverName: 'filesystem',
        method: 'tools/call',
        direction: 'outbound',
        latencyMs: 18,
        success: true,
      },
      {
        timestamp: 1712052001000,
        serverName: 'github',
        method: 'resources/list',
        direction: 'outbound',
        latencyMs: 24,
        success: true,
      },
    ]);

    const program = createProgram();
    await program.parseAsync(['mcp', 'traffic', '--server', 'filesystem', '--limit', '5', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('mcp.traffic');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      server: 'filesystem',
      method: null,
      events: [
        {
          timestamp: 1712052000000,
          serverName: 'filesystem',
          method: 'tools/call',
          direction: 'outbound',
          latencyMs: 18,
          success: true,
        },
      ],
    }, null, 2));
  });

  it('adds an MCP server as JSON via the live control plane', async () => {
    queryTrpcMock.mockResolvedValue({
      uuid: 'server-1',
      name: 'filesystem',
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', 'C:\\repo'],
      env: { GITHUB_TOKEN: 'xxx' },
      always_on: true,
    });

    const program = createProgram();
    await program.parseAsync([
      'mcp',
      'add',
      'filesystem',
      'npx',
      '--transport',
      'stdio',
      '--args',
      '-y',
      '@modelcontextprotocol/server-filesystem',
      'C:\\repo',
      '--env',
      'GITHUB_TOKEN=xxx',
      '--json',
    ], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('mcpServers.create', {
      name: 'filesystem',
      description: null,
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', 'C:\\repo'],
      env: { GITHUB_TOKEN: 'xxx' },
      url: null,
      always_on: true,
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      server: {
        uuid: 'server-1',
        name: 'filesystem',
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', 'C:\\repo'],
        env: { GITHUB_TOKEN: 'xxx' },
        always_on: true,
      },
    }, null, 2));
  });

  it('passes always_on false when MCP add disables auto-start', async () => {
    queryTrpcMock.mockResolvedValue({
      uuid: 'server-2',
      name: 'github',
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: {},
      always_on: false,
    });

    const program = createProgram();
    await program.parseAsync([
      'mcp',
      'add',
      'github',
      'npx',
      '--args',
      '-y',
      '@modelcontextprotocol/server-github',
      '--no-auto-start',
      '--json',
    ], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('mcpServers.create', {
      name: 'github',
      description: null,
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: undefined,
      url: null,
      always_on: false,
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      server: {
        uuid: 'server-2',
        name: 'github',
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: {},
        always_on: false,
      },
    }, null, 2));
  });

  it('rejects unsupported MCP namespace assignment explicitly on add', async () => {
    const program = createProgram();
    await program.parseAsync(['mcp', 'add', 'filesystem', 'npx', '--namespace', 'ops', '--json'], { from: 'user' });

    expect(queryTrpcMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      error: "Live MCP add does not yet support namespace assignment ('ops'): the control plane create route has no namespace field or mapping mutation.",
    }, null, 2));
    expect(process.exitCode).toBe(1);
  });

  it('fails MCP start explicitly instead of returning fake success', async () => {
    const program = createProgram();
    await program.parseAsync(['mcp', 'start', 'filesystem', '--json'], { from: 'user' });

    expect(queryTrpcMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      error: "Live MCP start is unavailable for 'filesystem': the control plane does not expose a real server-start route yet.",
    }, null, 2));
    expect(process.exitCode).toBe(1);
  });

  it('fails MCP stop explicitly instead of returning fake success', async () => {
    const program = createProgram();
    await program.parseAsync(['mcp', 'stop', 'filesystem', '--json'], { from: 'user' });

    expect(queryTrpcMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      error: "Live MCP stop is unavailable for 'filesystem': the control plane does not expose a real server-stop route yet.",
    }, null, 2));
    expect(process.exitCode).toBe(1);
  });

  it('fails MCP restart explicitly instead of returning fake success', async () => {
    const program = createProgram();
    await program.parseAsync(['mcp', 'restart', 'filesystem', '--json'], { from: 'user' });

    expect(queryTrpcMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      error: "Live MCP restart is unavailable for 'filesystem': the control plane does not expose a real server-restart route yet.",
    }, null, 2));
    expect(process.exitCode).toBe(1);
  });

  it('removes an MCP server as JSON via the live control plane', async () => {
    queryTrpcMock
      .mockResolvedValueOnce([
        {
          uuid: 'server-1',
          name: 'filesystem',
          displayName: 'Filesystem',
        },
      ])
      .mockResolvedValueOnce({ success: true });

    const program = createProgram();
    await program.parseAsync(['mcp', 'remove', 'filesystem', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenNthCalledWith(1, 'mcpServers.list');
    expect(queryTrpcMock).toHaveBeenNthCalledWith(2, 'mcpServers.delete', { uuid: 'server-1' });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      success: true,
    }, null, 2));
  });

  it('exports MCP JSONC config through the live editor route', async () => {
    queryTrpcMock.mockResolvedValue({
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/mcp.test.ts
      path: 'C:\\Users\\hyper\\.hypercode\\mcp.jsonc',
=======
      path: 'C:\\Users\\hyper\\.borg\\mcp.jsonc',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/mcp.test.ts
      content: '{\n  "mcpServers": {}\n}\n',
    });

    const program = createProgram();
    await program.parseAsync(['mcp', 'export', '--output', 'out.json', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('mcp.getJsoncEditor');
    expect(writeFileSync).toHaveBeenCalledWith('out.json', '{\n  "mcpServers": {}\n}\n', 'utf8');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      output: 'out.json',
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/mcp.test.ts
      sourcePath: 'C:\\Users\\hyper\\.hypercode\\mcp.jsonc',
=======
      sourcePath: 'C:\\Users\\hyper\\.borg\\mcp.jsonc',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/mcp.test.ts
      bytes: Buffer.byteLength('{\n  "mcpServers": {}\n}\n', 'utf8'),
    }, null, 2));
  });

  it('imports MCP JSONC config through the live save route', async () => {
    vi.mocked(readFileSync).mockReturnValue('{\n  "mcpServers": {\n    "fs": {}\n  }\n}\n' as never);
    queryTrpcMock.mockResolvedValue({ ok: true });

    const program = createProgram();
    await program.parseAsync(['mcp', 'import', 'in.json', '--json'], { from: 'user' });

    expect(readFileSync).toHaveBeenCalledWith('in.json', 'utf8');
    expect(queryTrpcMock).toHaveBeenCalledWith('mcp.saveJsoncEditor', {
      content: '{\n  "mcpServers": {\n    "fs": {}\n  }\n}\n',
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      success: true,
      file: 'in.json',
      bytes: Buffer.byteLength('{\n  "mcpServers": {\n    "fs": {}\n  }\n}\n', 'utf8'),
    }, null, 2));
  });

  it('rejects unsupported MCP import merge mode explicitly', async () => {
    const program = createProgram();
    await program.parseAsync(['mcp', 'import', 'in.json', '--merge', '--json'], { from: 'user' });

    expect(queryTrpcMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      error: 'Live MCP config import does not yet support merge mode.',
    }, null, 2));
    expect(process.exitCode).toBe(1);
  });

  it('previews MCP client sync through the live preview route', async () => {
    queryTrpcMock.mockResolvedValue({
      client: 'cursor',
      targetPath: 'C:\\Users\\hyper\\AppData\\Roaming\\Cursor\\User\\mcp.json',
      existed: true,
      serverCount: 2,
      json: '{\n  "mcpServers": {}\n}\n',
    });

    const program = createProgram();
    await program.parseAsync(['mcp', 'sync', '--client', 'cursor', '--dry-run', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('mcpServers.exportClientConfig', { client: 'cursor' });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      dryRun: true,
      result: {
        client: 'cursor',
        targetPath: 'C:\\Users\\hyper\\AppData\\Roaming\\Cursor\\User\\mcp.json',
        existed: true,
        serverCount: 2,
        json: '{\n  "mcpServers": {}\n}\n',
      },
    }, null, 2));
  });

  it('syncs all supported MCP clients through live target discovery', async () => {
    queryTrpcMock
      .mockResolvedValueOnce([
        {
          client: 'claude-desktop',
          path: 'C:\\Users\\hyper\\AppData\\Roaming\\Claude\\claude_desktop_config.json',
          candidates: ['C:\\Users\\hyper\\AppData\\Roaming\\Claude\\claude_desktop_config.json'],
          exists: true,
        },
        {
          client: 'cursor',
          path: 'C:\\Users\\hyper\\AppData\\Roaming\\Cursor\\User\\mcp.json',
          candidates: ['C:\\Users\\hyper\\AppData\\Roaming\\Cursor\\User\\mcp.json'],
          exists: false,
        },
      ])
      .mockResolvedValueOnce({
        client: 'claude-desktop',
        targetPath: 'C:\\Users\\hyper\\AppData\\Roaming\\Claude\\claude_desktop_config.json',
        existed: true,
        serverCount: 3,
        json: '{}',
        written: true,
      })
      .mockResolvedValueOnce({
        client: 'cursor',
        targetPath: 'C:\\Users\\hyper\\AppData\\Roaming\\Cursor\\User\\mcp.json',
        existed: false,
        serverCount: 3,
        json: '{}',
        written: true,
      });

    const program = createProgram();
    await program.parseAsync(['mcp', 'sync', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenNthCalledWith(1, 'mcpServers.syncTargets');
    expect(queryTrpcMock).toHaveBeenNthCalledWith(2, 'mcpServers.syncClientConfig', { client: 'claude-desktop' });
    expect(queryTrpcMock).toHaveBeenNthCalledWith(3, 'mcpServers.syncClientConfig', { client: 'cursor' });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      dryRun: false,
      results: [
        {
          client: 'claude-desktop',
          targetPath: 'C:\\Users\\hyper\\AppData\\Roaming\\Claude\\claude_desktop_config.json',
          existed: true,
          serverCount: 3,
          json: '{}',
          written: true,
        },
        {
          client: 'cursor',
          targetPath: 'C:\\Users\\hyper\\AppData\\Roaming\\Cursor\\User\\mcp.json',
          existed: false,
          serverCount: 3,
          json: '{}',
          written: true,
        },
      ],
    }, null, 2));
  });

  it('fails MCP install explicitly instead of returning fake success', async () => {
    const program = createProgram();
    await program.parseAsync(['mcp', 'install', '@modelcontextprotocol/server-filesystem', '--json'], { from: 'user' });

    expect(queryTrpcMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      error: "Live MCP install is unavailable for '@modelcontextprotocol/server-filesystem': the control plane does not expose a real install route for directory entries yet.",
    }, null, 2));
    expect(process.exitCode).toBe(1);
  });

  it('rejects unsupported MCP sync clients explicitly', async () => {
    const program = createProgram();
    await program.parseAsync(['mcp', 'sync', '--client', 'windsurf', '--json'], { from: 'user' });

    expect(queryTrpcMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      error: "Unsupported MCP client 'windsurf'. Supported clients: claude-desktop, cursor, vscode.",
    }, null, 2));
    expect(process.exitCode).toBe(1);
  });

  it('reports control-plane failures without throwing out of the command', async () => {
    queryTrpcMock.mockRejectedValue(new Error('control plane unavailable'));

    const program = createProgram();
    await program.parseAsync(['mcp', 'list'], { from: 'user' });

    expect(errorSpy).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
});
