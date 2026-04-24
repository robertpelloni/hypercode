import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveUpstreamBases } from '../../../../lib/trpc-upstream';
import { GET, POST } from './route';

function resolveRepoRoot(): string {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '..', '..'),
  ];

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, 'mcp.jsonc')) || existsSync(path.join(candidate, 'mcp.json'))) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, 'pnpm-workspace.yaml'))) {
      return candidate;
    }
  }

  return path.resolve(process.cwd(), '..', '..');
}

const REPO_ROOT = resolveRepoRoot();

function getCompatConfigPaths(configDir: string): { jsoncPath: string; jsonPath: string } {
  return {
    jsoncPath: path.join(configDir, 'mcp.jsonc'),
    jsonPath: path.join(configDir, 'mcp.json'),
  };
}

async function readOptionalFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

describe('resolveUpstreamBases', () => {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
  const originalUpstream = process.env.HYPERCODE_TRPC_UPSTREAM;
  const originalHyperCodeConfigDir = process.env.HYPERCODE_CONFIG_DIR;
  let tempConfigDir = '';

  beforeEach(async () => {
    tempConfigDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hypercode-trpc-upstream-'));
    process.env.HYPERCODE_CONFIG_DIR = tempConfigDir;
=======
  const originalUpstream = process.env.BORG_TRPC_UPSTREAM;
  const originalBorgConfigDir = process.env.BORG_CONFIG_DIR;
  let tempConfigDir = '';

  beforeEach(async () => {
    tempConfigDir = await fs.mkdtemp(path.join(os.tmpdir(), 'borg-trpc-upstream-'));
    process.env.BORG_CONFIG_DIR = tempConfigDir;
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
  });

  afterEach(() => {
    if (originalUpstream === undefined) {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
      delete process.env.HYPERCODE_TRPC_UPSTREAM;
    } else {
      process.env.HYPERCODE_TRPC_UPSTREAM = originalUpstream;
    }

    if (originalHyperCodeConfigDir === undefined) {
      delete process.env.HYPERCODE_CONFIG_DIR;
    } else {
      process.env.HYPERCODE_CONFIG_DIR = originalHyperCodeConfigDir;
    }
  });

  it('includes HyperCode core\'s default tRPC port before legacy fallbacks', () => {
    delete process.env.HYPERCODE_TRPC_UPSTREAM;
=======
      delete process.env.BORG_TRPC_UPSTREAM;
    } else {
      process.env.BORG_TRPC_UPSTREAM = originalUpstream;
    }

    if (originalBorgConfigDir === undefined) {
      delete process.env.BORG_CONFIG_DIR;
    } else {
      process.env.BORG_CONFIG_DIR = originalBorgConfigDir;
    }
  });

  it('includes borg core\'s default tRPC port before legacy fallbacks', () => {
    delete process.env.BORG_TRPC_UPSTREAM;
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts

    expect(resolveUpstreamBases()).toEqual([
      'http://127.0.0.1:3100/trpc',
      'http://127.0.0.1:4000/trpc',
      'http://127.0.0.1:4001/trpc',
      'http://127.0.0.1:3847/trpc',
      'http://127.0.0.1:3001/trpc',
    ]);
  });

  it('prepends a configured upstream while deduplicating defaults', () => {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4000/trpc';
=======
    process.env.BORG_TRPC_UPSTREAM = 'http://127.0.0.1:4000/trpc';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts

    expect(resolveUpstreamBases()).toEqual([
      'http://127.0.0.1:4000/trpc',
      'http://127.0.0.1:3100/trpc',
      'http://127.0.0.1:4001/trpc',
      'http://127.0.0.1:3847/trpc',
      'http://127.0.0.1:3001/trpc',
    ]);
  });

<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
  it('prefers the live HyperCode lock port over stale configured upstreams', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4000/trpc';
=======
  it('prefers the live borg lock port over stale configured upstreams', async () => {
    process.env.BORG_TRPC_UPSTREAM = 'http://127.0.0.1:4000/trpc';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
    await fs.writeFile(
      path.join(tempConfigDir, 'lock'),
      JSON.stringify({ host: '0.0.0.0', port: 4001 }),
      'utf8',
    );

    expect(resolveUpstreamBases()).toEqual([
      'http://127.0.0.1:4001/trpc',
      'http://127.0.0.1:4000/trpc',
      'http://127.0.0.1:3100/trpc',
      'http://127.0.0.1:3847/trpc',
      'http://127.0.0.1:3001/trpc',
    ]);
  });
});

describe('legacy MCP dashboard compatibility bridge', () => {
  const originalFetch = global.fetch;
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
  const originalUpstream = process.env.HYPERCODE_TRPC_UPSTREAM;
  const originalHyperCodeConfigDir = process.env.HYPERCODE_CONFIG_DIR;
  let compatConfigDir = '';

  beforeEach(async () => {
    compatConfigDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hypercode-trpc-compat-'));
    process.env.HYPERCODE_CONFIG_DIR = compatConfigDir;
=======
  const originalUpstream = process.env.BORG_TRPC_UPSTREAM;
  const originalBorgConfigDir = process.env.BORG_CONFIG_DIR;
  let compatConfigDir = '';

  beforeEach(async () => {
    compatConfigDir = await fs.mkdtemp(path.join(os.tmpdir(), 'borg-trpc-compat-'));
    process.env.BORG_CONFIG_DIR = compatConfigDir;
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
  });

  afterEach(async () => {
    global.fetch = originalFetch;

    if (originalUpstream === undefined) {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
      delete process.env.HYPERCODE_TRPC_UPSTREAM;
    } else {
      process.env.HYPERCODE_TRPC_UPSTREAM = originalUpstream;
    }

    if (originalHyperCodeConfigDir === undefined) {
      delete process.env.HYPERCODE_CONFIG_DIR;
    } else {
      process.env.HYPERCODE_CONFIG_DIR = originalHyperCodeConfigDir;
=======
      delete process.env.BORG_TRPC_UPSTREAM;
    } else {
      process.env.BORG_TRPC_UPSTREAM = originalUpstream;
    }

    if (originalBorgConfigDir === undefined) {
      delete process.env.BORG_CONFIG_DIR;
    } else {
      process.env.BORG_CONFIG_DIR = originalBorgConfigDir;
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
    }

    if (compatConfigDir) {
      await fs.rm(compatConfigDir, { recursive: true, force: true });
      compatConfigDir = '';
    }
  });

  it('returns compatibility data for modern MCP procedure batches when upstreams are unavailable', async () => {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:59999/trpc';
=======
    process.env.BORG_TRPC_UPSTREAM = 'http://127.0.0.1:59999/trpc';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
    global.fetch = vi.fn(async () => {
      throw new Error('connect ECONNREFUSED');
    }) as typeof fetch;

    const request = new Request(
      'http://localhost:3010/api/trpc/mcp.listServers,mcp.listTools,mcp.getStatus?batch=1',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 0: { json: null }, 1: { json: null }, 2: { json: null } }),
      },
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
    expect(response.headers.get('x-hypercode-trpc-compat')).toBe('legacy-mcp-dashboard-bridge');
=======
    expect(response.headers.get('x-borg-trpc-compat')).toBe('legacy-mcp-dashboard-bridge');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
    expect(Array.isArray(payload)).toBe(true);
    expect(payload).toHaveLength(3);
    expect(Array.isArray(payload[0]?.result?.data)).toBe(true);
    expect(Array.isArray(payload[1]?.result?.data)).toBe(true);
    expect(payload[2]).toEqual({
      result: {
        data: {
          initialized: true,
          serverCount: payload[0].result.data.length,
          toolCount: 0,
          connectedCount: expect.any(Number),
        },
      },
    });
  });

  it('supports mixed legacy and modern MCP procedure aliases in the same batch', async () => {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:59999/trpc';
=======
    process.env.BORG_TRPC_UPSTREAM = 'http://127.0.0.1:59999/trpc';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
    global.fetch = vi.fn(async () => {
      throw new Error('connect ECONNREFUSED');
    }) as typeof fetch;

    const request = new Request(
      'http://localhost:3010/api/trpc/mcpServers.list,mcp.listTools,mcp.getStatus?batch=1',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 0: { json: null }, 1: { json: null }, 2: { json: null } }),
      },
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
    expect(response.headers.get('x-hypercode-trpc-compat')).toBe('legacy-mcp-dashboard-bridge');
=======
    expect(response.headers.get('x-borg-trpc-compat')).toBe('legacy-mcp-dashboard-bridge');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
    expect(Array.isArray(payload)).toBe(true);
    expect(payload).toHaveLength(3);
    expect(Array.isArray(payload[0]?.result?.data)).toBe(true);
    expect(Array.isArray(payload[1]?.result?.data)).toBe(true);
    expect(payload[2]).toEqual({
      result: {
        data: {
          initialized: true,
          serverCount: payload[0].result.data.length,
          toolCount: 0,
          connectedCount: expect.any(Number),
        },
      },
    });
  });

  it('probes top-level mcpServers.list when bridging legacy MCP batches', async () => {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4100/trpc';
=======
    process.env.BORG_TRPC_UPSTREAM = 'http://127.0.0.1:4100/trpc';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
    const upstreamServers = [
      {
        uuid: 'server-1',
        name: 'upstream-memory',
        status: 'configured',
        toolCount: 2,
        _meta: {
          uuid: 'server-1',
          status: 'ready',
          metadataSource: 'db-cache',
          toolCount: 2,
          lastSuccessfulBinaryLoadAt: '2026-03-11T00:00:00.000Z',
          crashCount: 0,
          maxAttempts: 0,
        },
      },
    ];

    global.fetch = vi.fn(async (input) => {
      const url = String(input);

      if (url === 'http://127.0.0.1:4100/trpc/mcp.listServers,mcp.listTools,mcp.getStatus?batch=1') {
        return new Response('not found', { status: 404 });
      }

      if (url === 'http://127.0.0.1:4100/trpc/mcpServers.list?input=%7B%7D') {
        return new Response(JSON.stringify({ result: { data: upstreamServers } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const request = new Request(
      'http://localhost:3010/api/trpc/mcp.listServers,mcp.listTools,mcp.getStatus?batch=1',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 0: { json: null }, 1: { json: null }, 2: { json: null } }),
      },
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
    expect(response.headers.get('x-hypercode-trpc-compat')).toBe('legacy-mcp-dashboard-bridge');
=======
    expect(response.headers.get('x-borg-trpc-compat')).toBe('legacy-mcp-dashboard-bridge');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
    expect(payload[0]?.result?.data).toEqual(upstreamServers);
    expect(payload[2]?.result?.data).toEqual({
      initialized: true,
      serverCount: 1,
      toolCount: 0,
      connectedCount: 0,
    });
    expect(
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(
        ([url, init]) => String(url) === 'http://127.0.0.1:4100/trpc/mcpServers.list?input=%7B%7D'
          && typeof init === 'object'
          && init !== null
          && 'method' in init
          && init.method === 'GET',
      ),
    ).toBe(true);
  });

  it('returns local dashboard fallback data for richer MCP pages when upstreams are unavailable', async () => {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:59999/trpc';
=======
    process.env.BORG_TRPC_UPSTREAM = 'http://127.0.0.1:59999/trpc';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
    global.fetch = vi.fn(async () => {
      throw new Error('connect ECONNREFUSED');
    }) as typeof fetch;

    const request = new Request(
      'http://localhost:3010/api/trpc/startupStatus,mcp.getWorkingSet,mcp.searchTools,mcp.getJsoncEditor,serverHealth.check?batch=1',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          0: { json: null },
          1: { json: null },
          2: { json: null },
          3: { json: null },
          4: { json: null },
        }),
      },
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
    expect(response.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
=======
    expect(response.headers.get('x-borg-trpc-compat')).toBe('local-dashboard-fallback');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
    expect(Array.isArray(payload)).toBe(true);
    expect(payload).toHaveLength(5);

    expect(payload[0]?.result?.data).toEqual(expect.objectContaining({
      status: expect.stringMatching(/^(starting|degraded)$/),
      ready: false,
      checks: expect.objectContaining({
        mcpAggregator: expect.objectContaining({
          initialization: 'compat-fallback',
          persistedServerCount: expect.any(Number),
        }),
        configSync: expect.objectContaining({
          status: expect.objectContaining({
            lastServerCount: expect.any(Number),
          }),
        }),
        extensionBridge: expect.objectContaining({
          ready: false,
          clientCount: 0,
        }),
      }),
    }));
    expect(payload[0].result.data.checks.configSync.status.lastServerCount)
      .toBe(payload[0].result.data.checks.mcpAggregator.persistedServerCount);

    expect(payload[1]?.result?.data).toEqual({
      tools: [],
      limits: {
        maxLoadedTools: 24,
        maxHydratedSchemas: 8,
      },
    });
    expect(payload[2]?.result?.data).toEqual([]);
    expect(payload[3]?.result?.data).toEqual(expect.objectContaining({
      path: expect.stringMatching(/mcp\.jsonc?$|mcp\.json$/),
      content: expect.stringContaining('mcpServers'),
    }));
    expect(payload[4]?.result?.data).toEqual({
      status: 'unavailable',
      crashCount: 0,
      maxAttempts: 0,
    });
  });

  it('normalizes batched bulk import payloads before proxying them upstream', async () => {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:3100/trpc';
=======
    process.env.BORG_TRPC_UPSTREAM = 'http://127.0.0.1:3100/trpc';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
    const upstreamResponse = [
      {
        result: {
          data: {
            imported: 1,
            errors: [],
          },
        },
      },
    ];

    global.fetch = vi.fn(async (_input, init) => {
      expect(String(_input)).toBe('http://127.0.0.1:3100/trpc/mcpServers.bulkImport');
      expect(init?.body).toBe(JSON.stringify([
        {
          name: 'test_stdio_import',
          type: 'STDIO',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-memory'],
          metadataStrategy: 'auto',
        },
      ]));

      return new Response(JSON.stringify(upstreamResponse), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const request = new Request(
      'http://localhost:3010/api/trpc/mcpServers.bulkImport?batch=1',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          0: {
            json: [
              {
                name: 'test_stdio_import',
                type: 'STDIO',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-memory'],
                metadataStrategy: 'auto',
              },
            ],
          },
        }),
      },
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual(upstreamResponse);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('preserves realistic mixed transport/auth fields when normalizing batched bulk imports', async () => {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:3100/trpc';
=======
    process.env.BORG_TRPC_UPSTREAM = 'http://127.0.0.1:3100/trpc';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
    const upstreamResponse = [
      {
        result: {
          data: {
            imported: 3,
            errors: [],
          },
        },
      },
    ];

    const realisticServers = [
      {
        name: 'filesystem_local',
        type: 'STDIO',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem'],
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
        env: { ROOT_PATH: 'C:/Users/hyper/workspace/hypercode' },
=======
        env: { ROOT_PATH: 'C:/Users/hyper/workspace/borg' },
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
        metadataStrategy: 'auto',
      },
      {
        name: 'github_http',
        type: 'STREAMABLE_HTTP',
        url: 'https://api.githubcopilot.com/mcp/',
        bearerToken: 'ghp_mock_token',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
        headers: { 'x-org': 'hypercode-dev', 'x-env': 'test' },
=======
        headers: { 'x-org': 'borg-dev', 'x-env': 'test' },
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
        metadataStrategy: 'auto',
      },
      {
        name: 'wordpress_sse',
        type: 'SSE',
        url: 'https://example.com/wp-json/mcp/v1/sse',
        headers: { authorization: 'Bearer mock-sse-token' },
        metadataStrategy: 'auto',
      },
    ];

    global.fetch = vi.fn(async (_input, init) => {
      expect(String(_input)).toBe('http://127.0.0.1:3100/trpc/mcpServers.bulkImport');
      expect(init?.body).toBe(JSON.stringify(realisticServers));

      return new Response(JSON.stringify(upstreamResponse), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const request = new Request(
      'http://localhost:3010/api/trpc/mcpServers.bulkImport?batch=1',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          0: {
            json: realisticServers,
          },
        }),
      },
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual(upstreamResponse);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('imports realistic mixed transport servers via local bulk import fallback', async () => {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:59999/trpc';
=======
    process.env.BORG_TRPC_UPSTREAM = 'http://127.0.0.1:59999/trpc';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
    global.fetch = vi.fn(async () => {
      throw new Error('connect ECONNREFUSED');
    }) as typeof fetch;

    const realisticServers = [
      {
        name: 'local_stdio_runtime',
        type: 'STDIO',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-memory'],
        env: { NODE_ENV: 'development' },
      },
      {
        name: 'remote_http_runtime',
        type: 'http',
        url: 'https://api.githubcopilot.com/mcp/',
        bearerToken: 'ghp_mock_token',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
        headers: { 'x-org': 'hypercode-dev' },
=======
        headers: { 'x-org': 'borg-dev' },
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
      },
      {
        name: 'remote_sse_runtime',
        url: 'https://example.com/mcp/sse',
      },
    ];

    const importResponse = await POST(new Request('http://localhost:3010/api/trpc/mcpServers.bulkImport?batch=1', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        0: {
          json: realisticServers,
        },
      }),
    }));

    const importPayload = await importResponse.json();

    expect(importResponse.status).toBe(200);
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
    expect(importResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-mcp-config-bulk-import');
=======
    expect(importResponse.headers.get('x-borg-trpc-compat')).toBe('local-mcp-config-bulk-import');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
    expect(importPayload?.[0]?.result?.data).toEqual({ imported: 3, errors: [] });

    const listResponse = await POST(new Request('http://localhost:3010/api/trpc/mcpServers.list', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: null }),
    }));
    const listPayload = await listResponse.json();
    const listedServers = listPayload?.result?.data as Array<{ uuid: string; name: string; _meta?: { status?: string } }>;

    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listedServers)).toBe(true);
    const listedNames = new Set(listedServers.map((server) => server.name));
    expect(listedNames.has('local_stdio_runtime')).toBe(true);
    expect(listedNames.has('remote_http_runtime')).toBe(true);
    expect(listedNames.has('remote_sse_runtime')).toBe(true);

    const localStdioDetail = await POST(new Request('http://localhost:3010/api/trpc/mcpServers.get', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        json: { uuid: listedServers.find((server) => server.name === 'local_stdio_runtime')?.uuid },
      }),
    }));
    const localStdioPayload = await localStdioDetail.json();

    expect(localStdioPayload?.result?.data).toEqual(expect.objectContaining({
      name: 'local_stdio_runtime',
      type: 'STDIO',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
      env: { NODE_ENV: 'development' },
    }));

    const remoteHttpDetail = await POST(new Request('http://localhost:3010/api/trpc/mcpServers.get', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        json: { uuid: listedServers.find((server) => server.name === 'remote_http_runtime')?.uuid },
      }),
    }));
    const remoteHttpPayload = await remoteHttpDetail.json();

    expect(remoteHttpPayload?.result?.data).toEqual(expect.objectContaining({
      name: 'remote_http_runtime',
      type: 'STREAMABLE_HTTP',
      url: 'https://api.githubcopilot.com/mcp/',
      bearerToken: 'ghp_mock_token',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
      headers: { 'x-org': 'hypercode-dev' },
=======
      headers: { 'x-org': 'borg-dev' },
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
    }));

    const remoteSseDetail = await POST(new Request('http://localhost:3010/api/trpc/mcpServers.get', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        json: { uuid: listedServers.find((server) => server.name === 'remote_sse_runtime')?.uuid },
      }),
    }));
    const remoteSsePayload = await remoteSseDetail.json();

    expect(remoteSsePayload?.result?.data).toEqual(expect.objectContaining({
      name: 'remote_sse_runtime',
      type: 'SSE',
      url: 'https://example.com/mcp/sse',
    }));
  });

  it('supports local pseudo-managed MCP server actions when upstreams are unavailable', async () => {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:59999/trpc';
=======
    process.env.BORG_TRPC_UPSTREAM = 'http://127.0.0.1:59999/trpc';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
    global.fetch = vi.fn(async () => {
      throw new Error('connect ECONNREFUSED');
    }) as typeof fetch;

    const { jsoncPath: MCP_JSONC_PATH, jsonPath: MCP_JSON_PATH } = getCompatConfigPaths(compatConfigDir);

    const originalJsonc = await readOptionalFile(MCP_JSONC_PATH);
    const originalJson = await readOptionalFile(MCP_JSON_PATH);
    const testServerName = 'compat_action_test';

    try {
      const seededConfig = {
        mcpServers: {
          [testServerName]: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-memory'],
          },
        },
      };

      await fs.writeFile(MCP_JSONC_PATH, `${JSON.stringify(seededConfig, null, 2)}\n`, 'utf-8');
      await fs.writeFile(MCP_JSON_PATH, `${JSON.stringify(seededConfig, null, 2)}\n`, 'utf-8');

      const listResponse = await POST(new Request('http://localhost:3010/api/trpc/mcpServers.list', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ json: null }),
      }));
      const listPayload = await listResponse.json();
      const listData = listPayload?.result?.data as Array<{ uuid: string; name: string; _meta?: { status?: string } }>;

      expect(listResponse.status).toBe(200);
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
      expect(listResponse.headers.get('x-hypercode-trpc-compat')).toBe('legacy-mcp-dashboard-bridge');
=======
      expect(listResponse.headers.get('x-borg-trpc-compat')).toBe('legacy-mcp-dashboard-bridge');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
      expect(Array.isArray(listData)).toBe(true);
      expect(listData[0]?.uuid).toEqual(expect.stringMatching(/^local-/));
      expect(listData[0]?.name).toBe(testServerName);

      const serverUuid = listData[0]?.uuid;
      expect(serverUuid).toBeTruthy();

      const getResponse = await POST(new Request('http://localhost:3010/api/trpc/mcpServers.get', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ json: { uuid: serverUuid } }),
      }));
      const getPayload = await getResponse.json();

      expect(getResponse.status).toBe(200);
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
      expect(getResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
=======
      expect(getResponse.headers.get('x-borg-trpc-compat')).toBe('local-dashboard-fallback');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
      expect(getPayload?.result?.data).toEqual(expect.objectContaining({
        uuid: serverUuid,
        name: testServerName,
      }));

      const getViaQueryResponse = await GET(new Request(
        `http://localhost:3010/api/trpc/mcpServers.get?input=${encodeURIComponent(JSON.stringify({ json: { uuid: serverUuid } }))}`,
        { method: 'GET' },
      ));
      const getViaQueryPayload = await getViaQueryResponse.json();

      expect(getViaQueryResponse.status).toBe(200);
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
      expect(getViaQueryResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
=======
      expect(getViaQueryResponse.headers.get('x-borg-trpc-compat')).toBe('local-dashboard-fallback');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
      expect(getViaQueryPayload?.result?.data).toEqual(expect.objectContaining({
        uuid: serverUuid,
        name: testServerName,
      }));

      const reloadResponse = await POST(new Request('http://localhost:3010/api/trpc/mcpServers.reloadMetadata', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ json: { uuid: serverUuid, mode: 'binary' } }),
      }));
      const reloadPayload = await reloadResponse.json();

      expect(reloadResponse.status).toBe(200);
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
      expect(reloadResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-mcp-managed-action');
=======
      expect(reloadResponse.headers.get('x-borg-trpc-compat')).toBe('local-mcp-managed-action');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
      expect(reloadPayload?.result?.data?.metadata).toEqual(expect.objectContaining({
        uuid: serverUuid,
        status: 'ready',
        metadataSource: 'local-binary',
      }));

      const healthResponse = await POST(new Request('http://localhost:3010/api/trpc/serverHealth.check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ json: { serverUuid } }),
      }));
      const healthPayload = await healthResponse.json();

      expect(healthResponse.status).toBe(200);
      expect(healthPayload?.result?.data).toEqual({
        status: 'ready',
        crashCount: 0,
        maxAttempts: 0,
      });

      const clearResponse = await POST(new Request('http://localhost:3010/api/trpc/mcpServers.clearMetadataCache', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ json: { uuid: serverUuid } }),
      }));
      const clearPayload = await clearResponse.json();

      expect(clearResponse.status).toBe(200);
      expect(clearPayload?.result?.data?.metadata).toEqual(expect.objectContaining({
        uuid: serverUuid,
        status: 'pending',
        metadataSource: 'local-config-fallback',
      }));

      const updateResponse = await POST(new Request('http://localhost:3010/api/trpc/mcpServers.update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          json: {
            uuid: serverUuid,
            description: 'Compat fallback server',
          },
        }),
      }));
      const updatePayload = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updatePayload?.result?.data).toEqual(expect.objectContaining({
        uuid: serverUuid,
        name: testServerName,
        description: 'Compat fallback server',
      }));

      const deleteResponse = await POST(new Request('http://localhost:3010/api/trpc/mcpServers.delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ json: { uuid: serverUuid } }),
      }));
      const deletePayload = await deleteResponse.json();

      expect(deleteResponse.status).toBe(200);
      expect(deletePayload?.result?.data).toEqual(expect.objectContaining({
        uuid: serverUuid,
        name: testServerName,
      }));

      const finalListResponse = await POST(new Request('http://localhost:3010/api/trpc/mcpServers.list', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ json: null }),
      }));
      const finalListPayload = await finalListResponse.json();

      expect(finalListPayload?.result?.data).toEqual([]);
    } finally {
      if (originalJsonc === null) {
        await fs.rm(MCP_JSONC_PATH, { force: true });
      } else {
        await fs.writeFile(MCP_JSONC_PATH, originalJsonc, 'utf-8');
      }

      if (originalJson === null) {
        await fs.rm(MCP_JSON_PATH, { force: true });
      } else {
        await fs.writeFile(MCP_JSON_PATH, originalJson, 'utf-8');
      }
    }
  });

  it('returns an explicit local fallback error when mcpServers.get misses locally', async () => {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:59999/trpc';
=======
    process.env.BORG_TRPC_UPSTREAM = 'http://127.0.0.1:59999/trpc';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
    global.fetch = vi.fn(async () => {
      throw new Error('connect ECONNREFUSED');
    }) as typeof fetch;

    const response = await POST(new Request('http://localhost:3010/api/trpc/mcpServers.get', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { uuid: 'missing-local-server' } }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
    expect(response.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
=======
    expect(response.headers.get('x-borg-trpc-compat')).toBe('local-dashboard-fallback');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
    expect(payload?.result).toBeUndefined();
    expect(payload?.error).toEqual(expect.objectContaining({
      code: 'NOT_FOUND',
      message: 'Configured MCP server unavailable in local dashboard fallback.',
    }));
    expect(payload?.error?.data).toEqual(expect.objectContaining({
      procedure: 'mcpServers.get',
      fallback: 'local-dashboard-fallback',
    }));
  });

    it('bridges bulk imports via legacy mcpServers format when upstream rejects modern array body', async () => {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
      process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4100/trpc';
=======
      process.env.BORG_TRPC_UPSTREAM = 'http://127.0.0.1:4100/trpc';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts

      const legacyUpstreamResult = { imported: 2, skipped: 0 };

      // buildUpstreamUrl strips ?batch=1 for bulkImport requests, so both the primary proxy
      // loop and tryBridgeBulkImport call the same URL. Differentiate by body shape:
      // primary proxy sends the normalized array; bridge sends { mcpServers: { name: config } }.
      global.fetch = vi.fn(async (input, init) => {
        const url = String(input);

        if (url !== 'http://127.0.0.1:4100/trpc/mcpServers.bulkImport' || init?.method !== 'POST') {
          throw new Error(`Unexpected fetch: ${url}`);
        }

        const parsedBody = JSON.parse(String(init?.body ?? '{}'));

        if (Array.isArray(parsedBody)) {
          // Primary proxy sends normalized array body → reject to activate bridge path
          return new Response('not found', { status: 404 });
        }

        if (parsedBody && typeof parsedBody === 'object' && 'mcpServers' in parsedBody) {
          // Bridge sends legacy { mcpServers: { name: config } } → succeed
          return new Response(JSON.stringify({ result: { data: legacyUpstreamResult } }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }

        throw new Error(`Unexpected body shape: ${JSON.stringify(parsedBody)}`);
      }) as typeof fetch;

      const request = new Request(
        'http://localhost:3010/api/trpc/mcpServers.bulkImport?batch=1',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            0: {
              json: [
                {
                  name: 'bridge_stdio_test',
                  type: 'STDIO',
                  command: 'npx',
                  args: ['-y', '@modelcontextprotocol/server-memory'],
                },
                {
                  name: 'bridge_http_test',
                  type: 'STREAMABLE_HTTP',
                  url: 'https://example.com/mcp/',
                  bearerToken: 'tok_test',
                },
              ],
            },
          }),
        },
      );

      const response = await POST(request);
      const payload = await response.json();

      expect(response.status).toBe(200);
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts
      expect(response.headers.get('x-hypercode-trpc-compat')).toBe('legacy-mcp-bulk-import-bridge');
=======
      expect(response.headers.get('x-borg-trpc-compat')).toBe('legacy-mcp-bulk-import-bridge');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
      expect(payload?.result?.data ?? payload?.[0]?.result?.data).toEqual(legacyUpstreamResult);

      // Verify the bridge call used the legacy { mcpServers: { name: config } } format
      const bridgeCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
        ([, init]) => {
          const parsed = JSON.parse(String(init?.body ?? '{}'));
          return parsed && typeof parsed === 'object' && 'mcpServers' in parsed;
        },
      );
      expect(bridgeCalls.length).toBeGreaterThanOrEqual(1);
      const bridgeBody = JSON.parse(String(bridgeCalls[0]?.[1]?.body ?? '{}'));
      expect(bridgeBody.mcpServers).toHaveProperty('bridge_stdio_test');
      expect(bridgeBody.mcpServers).toHaveProperty('bridge_http_test');
    });
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/api/trpc/[trpc]/route.test.ts

    it('prefers go-native saved script reads and mutations in local dashboard fallback mode', async () => {
      process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4590/trpc';
      global.fetch = vi.fn(async (input, init) => {
        const url = String(input);

        if (url.includes('/trpc/')) {
          throw new Error('connect ECONNREFUSED');
        }

        if (url === 'http://127.0.0.1:4590/api/scripts') {
          return new Response(JSON.stringify({
            success: true,
            data: [
              { uuid: 'script-1', name: 'Deploy', description: 'ship it', code: 'console.log("deploy")' },
            ],
          }), { status: 200, headers: { 'content-type': 'application/json' } });
        }

        if (url === 'http://127.0.0.1:4590/api/scripts/create' && init?.method === 'POST') {
          return new Response(JSON.stringify({
            success: true,
            data: { uuid: 'script-created-1', name: 'Hello Script', description: 'demo', code: 'console.log("hello")' },
          }), { status: 200, headers: { 'content-type': 'application/json' } });
        }

        if (url === 'http://127.0.0.1:4590/api/scripts/update' && init?.method === 'POST') {
          return new Response(JSON.stringify({
            success: true,
            data: { uuid: 'script-created-1', name: 'Hello Script Updated', description: 'demo-updated', code: 'console.log("updated")' },
          }), { status: 200, headers: { 'content-type': 'application/json' } });
        }

        if (url === 'http://127.0.0.1:4590/api/scripts/delete' && init?.method === 'POST') {
          return new Response(JSON.stringify({ success: true, data: { success: true } }), { status: 200, headers: { 'content-type': 'application/json' } });
        }

        if (url === 'http://127.0.0.1:4590/api/scripts/execute' && init?.method === 'POST') {
          return new Response(JSON.stringify({
            success: true,
            data: {
              success: true,
              result: 'hello-from-script',
              execution: {
                scriptUuid: 'script-1',
                scriptName: 'Deploy',
                startedAt: '2026-04-05T16:00:00.000Z',
                finishedAt: '2026-04-05T16:00:00.050Z',
                durationMs: 50,
              },
            },
          }), { status: 200, headers: { 'content-type': 'application/json' } });
        }

        throw new Error(`Unexpected fetch: ${url}`);
      }) as typeof fetch;

      const listResponse = await POST(new Request('http://localhost:3010/api/trpc/savedScripts.list', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ json: null }),
      }));
      expect(listResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
      expect((await listResponse.json())?.result?.data).toEqual([
        expect.objectContaining({ uuid: 'script-1', name: 'Deploy' }),
      ]);

      const createResponse = await POST(new Request('http://localhost:3010/api/trpc/savedScripts.create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ json: { name: 'Hello Script', description: 'demo', code: 'console.log("hello")' } }),
      }));
      expect(createResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-operator-action');
      expect((await createResponse.json())?.result?.data).toEqual(expect.objectContaining({ uuid: 'script-created-1', name: 'Hello Script' }));

      const updateResponse = await POST(new Request('http://localhost:3010/api/trpc/savedScripts.update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ json: { uuid: 'script-created-1', name: 'Hello Script Updated', description: 'demo-updated', code: 'console.log("updated")' } }),
      }));
      expect(updateResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-operator-action');
      expect((await updateResponse.json())?.result?.data).toEqual(expect.objectContaining({ uuid: 'script-created-1', name: 'Hello Script Updated' }));

      const executeResponse = await POST(new Request('http://localhost:3010/api/trpc/savedScripts.execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ json: { uuid: 'script-1' } }),
      }));
      expect((await executeResponse.json())?.result?.data).toEqual(expect.objectContaining({ success: true, result: 'hello-from-script' }));

      const deleteResponse = await POST(new Request('http://localhost:3010/api/trpc/savedScripts.delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ json: { uuid: 'script-created-1' } }),
      }));
      expect((await deleteResponse.json())?.result?.data).toEqual({ success: true });

      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4590/api/scripts')).toBe(true);
      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4590/api/scripts/create')).toBe(true);
      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4590/api/scripts/update')).toBe(true);
      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4590/api/scripts/execute')).toBe(true);
      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4590/api/scripts/delete')).toBe(true);
    });
=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/api/trpc/[trpc]/route.test.ts
  });
