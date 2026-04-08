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
  const originalUpstream = process.env.HYPERCODE_TRPC_UPSTREAM;
  const originalHypercodeConfigDir = process.env.HYPERCODE_CONFIG_DIR;
  let tempConfigDir = '';

  beforeEach(async () => {
    tempConfigDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hypercode-trpc-upstream-'));
    process.env.HYPERCODE_CONFIG_DIR = tempConfigDir;
  });

  afterEach(() => {
    if (originalUpstream === undefined) {
      delete process.env.HYPERCODE_TRPC_UPSTREAM;
    } else {
      process.env.HYPERCODE_TRPC_UPSTREAM = originalUpstream;
    }

    if (originalHypercodeConfigDir === undefined) {
      delete process.env.HYPERCODE_CONFIG_DIR;
    } else {
      process.env.HYPERCODE_CONFIG_DIR = originalHypercodeConfigDir;
    }
  });

  it('includes HyperCode core\'s default tRPC port before legacy fallbacks', () => {
    delete process.env.HYPERCODE_TRPC_UPSTREAM;

    expect(resolveUpstreamBases()).toEqual([
      'http://127.0.0.1:3100/trpc',
      'http://127.0.0.1:4000/trpc',
      'http://127.0.0.1:4001/trpc',
      'http://127.0.0.1:3847/trpc',
      'http://127.0.0.1:3001/trpc',
    ]);
  });

  it('prepends a configured upstream while deduplicating defaults', () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4000/trpc';

    expect(resolveUpstreamBases()).toEqual([
      'http://127.0.0.1:4000/trpc',
      'http://127.0.0.1:3100/trpc',
      'http://127.0.0.1:4001/trpc',
      'http://127.0.0.1:3847/trpc',
      'http://127.0.0.1:3001/trpc',
    ]);
  });

  it('prefers the live HyperCode lock port over stale configured upstreams', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4000/trpc';
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
  const originalUpstream = process.env.HYPERCODE_TRPC_UPSTREAM;
  const originalHypercodeConfigDir = process.env.HYPERCODE_CONFIG_DIR;
  let compatConfigDir = '';

  beforeEach(async () => {
    compatConfigDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hypercode-trpc-compat-'));
    process.env.HYPERCODE_CONFIG_DIR = compatConfigDir;
  });

  afterEach(async () => {
    global.fetch = originalFetch;

    if (originalUpstream === undefined) {
      delete process.env.HYPERCODE_TRPC_UPSTREAM;
    } else {
      process.env.HYPERCODE_TRPC_UPSTREAM = originalUpstream;
    }

    if (originalHypercodeConfigDir === undefined) {
      delete process.env.HYPERCODE_CONFIG_DIR;
    } else {
      process.env.HYPERCODE_CONFIG_DIR = originalHypercodeConfigDir;
    }

    if (compatConfigDir) {
      await fs.rm(compatConfigDir, { recursive: true, force: true });
      compatConfigDir = '';
    }
  });

  it('returns compatibility data for modern MCP procedure batches when upstreams are unavailable', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:59999/trpc';
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
    expect(response.headers.get('x-hypercode-trpc-compat')).toBe('legacy-mcp-dashboard-bridge');
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
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:59999/trpc';
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
    expect(response.headers.get('x-hypercode-trpc-compat')).toBe('legacy-mcp-dashboard-bridge');
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
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4100/trpc';
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
    expect(response.headers.get('x-hypercode-trpc-compat')).toBe('legacy-mcp-dashboard-bridge');
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

  it('prefers go-native tool catalog, MCP inspector state, traffic, and search in local dashboard fallback mode', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4300/trpc';
    global.fetch = vi.fn(async (input) => {
      const url = String(input);

      if (url.includes('/trpc/')) {
        throw new Error('connect ECONNREFUSED');
      }
      if (url === 'http://127.0.0.1:4300/api/tools') {
        return new Response(JSON.stringify({
          success: true,
          data: [
            {
              uuid: 'search_tools',
              name: 'search_tools',
              description: 'Search all available tools',
              server: 'hypercode-router',
              inputSchema: { type: 'object' },
              isDeferred: false,
              schemaParamCount: 1,
              mcpServerUuid: 'hypercode-router',
              always_on: true,
            },
            {
              uuid: 'read_file',
              name: 'read_file',
              description: 'Read files from the workspace',
              server: 'hypercode-router',
              inputSchema: { type: 'object' },
              isDeferred: false,
              schemaParamCount: 2,
              mcpServerUuid: 'hypercode-router',
              always_on: false,
            },
          ],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'http://127.0.0.1:4300/api/mcp/traffic') {
        return new Response(JSON.stringify({
          success: true,
          data: [
            {
              server: 'hypercode-router',
              method: 'tools/search',
              paramsSummary: 'query=search',
              latencyMs: 42,
              success: true,
              timestamp: 1712275201000,
              toolName: 'search_tools',
            },
          ],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'http://127.0.0.1:4300/api/mcp/working-set') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            tools: [
              {
                name: 'search_tools',
                hydrated: true,
                lastLoadedAt: 1712275200000,
                lastHydratedAt: 1712275215000,
                lastAccessedAt: 1712275220000,
              },
              {
                name: 'read_file',
                hydrated: false,
                lastLoadedAt: 1712275100000,
                lastHydratedAt: null,
                lastAccessedAt: 1712275190000,
              },
            ],
            limits: {
              maxLoadedTools: 16,
              maxHydratedSchemas: 8,
              idleEvictionThresholdMs: 300000,
            },
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'http://127.0.0.1:4300/api/mcp/tool-selection-telemetry') {
        return new Response(JSON.stringify({
          success: true,
          data: [
            {
              id: 'telemetry-1',
              type: 'search',
              timestamp: 1712275201000,
              query: 'read workspace files',
              source: 'runtime-search',
              resultCount: 3,
              topResultName: 'read_file',
              topMatchReason: 'file access',
              topScore: 0.98,
              ignoredResultCount: 2,
              ignoredResultNames: ['write_file', 'grep_search'],
              status: 'success',
              latencyMs: 42,
              autoLoadEvaluated: true,
              autoLoadOutcome: 'loaded',
              autoLoadMinConfidence: 0.85,
            },
          ],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'http://127.0.0.1:4300/api/mcp/preferences') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            importantTools: ['search_tools'],
            alwaysLoadedTools: ['search_tools', 'read_file'],
            autoLoadMinConfidence: 0.85,
            maxLoadedTools: 16,
            maxHydratedSchemas: 8,
            idleEvictionThresholdMs: 300000,
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'http://127.0.0.1:4300/api/tools/search?query=search&limit=5') {
        return new Response(JSON.stringify({
          success: true,
          data: [
            {
              name: 'search_tools',
              description: 'Search all available tools',
              server: 'hypercode-router',
              inputSchema: { type: 'object' },
              loaded: true,
              hydrated: true,
              alwaysOn: true,
              important: true,
              score: 0.98,
              rank: 1,
              matchReason: 'name-token match',
            },
          ],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'http://127.0.0.1:4300/api/server-health/check?serverUuid=server-health-1') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            status: 'HEALTHY',
            crashCount: 2,
            maxAttempts: 5,
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const request = new Request(
      'http://localhost:3010/api/trpc/startupStatus,tools.list,mcp.getWorkingSet,mcp.getToolSelectionTelemetry,mcp.getToolPreferences,mcp.searchTools,mcp.traffic,mcp.getJsoncEditor,serverHealth.check?batch=1',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          0: { json: null },
          1: { json: null },
          2: { json: null },
          3: { json: null },
          4: { json: null },
          5: { json: { query: 'search', limit: 5 } },
          6: { json: null },
          7: { json: null },
          8: { json: { serverUuid: 'server-health-1' } },
        }),
      },
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
    expect(Array.isArray(payload)).toBe(true);
    expect(payload).toHaveLength(9);

    expect(payload[0]?.result?.data).toEqual(expect.objectContaining({
      status: expect.stringMatching(/^(starting|degraded)$/),
      ready: false,
      startupMode: null,
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

    expect(payload[1]?.result?.data).toEqual([
      expect.objectContaining({
        uuid: 'search_tools',
        name: 'search_tools',
        server: 'hypercode-router',
        schemaParamCount: 1,
        always_on: true,
      }),
      expect.objectContaining({
        uuid: 'read_file',
        name: 'read_file',
        server: 'hypercode-router',
        schemaParamCount: 2,
        always_on: false,
      }),
    ]);
    expect(payload[2]?.result?.data).toEqual({
      tools: [
        {
          name: 'search_tools',
          hydrated: true,
          lastLoadedAt: 1712275200000,
          lastHydratedAt: 1712275215000,
          lastAccessedAt: 1712275220000,
        },
        {
          name: 'read_file',
          hydrated: false,
          lastLoadedAt: 1712275100000,
          lastHydratedAt: null,
          lastAccessedAt: 1712275190000,
        },
      ],
      limits: {
        maxLoadedTools: 16,
        maxHydratedSchemas: 8,
        idleEvictionThresholdMs: 300000,
      },
    });
    expect(payload[3]?.result?.data).toEqual([
      expect.objectContaining({
        id: 'telemetry-1',
        type: 'search',
        status: 'success',
        query: 'read workspace files',
        source: 'runtime-search',
        topResultName: 'read_file',
        ignoredResultCount: 2,
        ignoredResultNames: ['write_file', 'grep_search'],
        autoLoadOutcome: 'loaded',
      }),
    ]);
    expect(payload[4]?.result?.data).toEqual({
      importantTools: ['search_tools'],
      alwaysLoadedTools: ['search_tools', 'read_file'],
      autoLoadMinConfidence: 0.85,
      maxLoadedTools: 16,
      maxHydratedSchemas: 8,
      idleEvictionThresholdMs: 300000,
    });
    expect(payload[5]?.result?.data).toEqual([
      expect.objectContaining({
        name: 'search_tools',
        description: 'Search all available tools',
        server: 'hypercode-router',
        loaded: true,
        hydrated: true,
        alwaysOn: true,
        important: true,
        score: 0.98,
        rank: 1,
        matchReason: 'name-token match',
      }),
    ]);
    expect(payload[6]?.result?.data).toEqual([
      {
        server: 'hypercode-router',
        method: 'tools/search',
        paramsSummary: 'query=search',
        latencyMs: 42,
        success: true,
        timestamp: 1712275201000,
        toolName: 'search_tools',
      },
    ]);
    expect(payload[7]?.result?.data).toEqual(expect.objectContaining({
      path: expect.stringMatching(/mcp\.jsonc?$|mcp\.json$/),
      content: expect.stringContaining('mcpServers'),
    }));
    expect(payload[8]?.result?.data).toEqual({
      status: 'HEALTHY',
      crashCount: 2,
      maxAttempts: 5,
    });
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4300/api/tools')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4300/api/mcp/working-set')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4300/api/mcp/tool-selection-telemetry')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4300/api/mcp/preferences')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4300/api/tools/search?query=search&limit=5')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4300/api/mcp/traffic')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4300/api/server-health/check?serverUuid=server-health-1')).toBe(true);
  });

  it('prefers go-native startup and runtime status when local dashboard fallback is active', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4000/trpc';
    global.fetch = vi.fn(async (input) => {
      const url = String(input);

      if (url.includes('/trpc/')) {
        throw new Error('connect ECONNREFUSED');
      }

      if (url === 'http://127.0.0.1:4000/api/startup/status') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            status: 'running',
            ready: true,
            summary: 'All Go startup checks passed.',
            blockingReasons: [],
            checks: {
              config: {
                workspaceRootAvailable: true,
                goConfigDirAvailable: true,
                mainConfigDirAvailable: true,
                repoConfigAvailable: true,
                mcpConfigAvailable: true,
              },
              memory: {
                ready: true,
                storePath: 'C:/Users/hyper/.hypercode/sectioned_memory.json',
                totalEntries: 12,
                presentDefaultSections: 5,
                expectedDefaultSections: 5,
                missingSections: [],
              },
              mainControlPlane: {
                ready: false,
                baseUrl: '',
              },
              sessionSupervisorBridge: {
                ready: true,
                baseUrl: 'http://127.0.0.1:4000/trpc',
              },
              mesh: {
                nodeId: 'go-node-1',
                peersCount: 2,
              },
              importedSessions: {
                totalSessions: 7,
                inlineTranscriptCount: 2,
                archivedTranscriptCount: 5,
                missingRetentionSummaryCount: 1,
              },
            },
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url === 'http://127.0.0.1:4000/api/runtime/status') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            uptimeSec: 123,
            version: '1.0.0-alpha.1',
            startupMode: {
              requestedRuntime: 'auto',
              activeRuntime: 'go',
              launchMode: 'prebuilt Go binary',
              source: 'main-lock',
              updatedAt: '2026-04-04T00:00:00.000Z',
            },
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url === 'http://127.0.0.1:4000/api/mcp/status') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            initialized: true,
            connected: true,
            toolCount: 5,
            serverCount: 3,
            connectedCount: 2,
            sourceBackedHarnessCount: 2,
            source: 'source-backed-local-summary',
            lazySessionMode: true,
            singleActiveServerMode: false,
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const response = await POST(new Request(
      'http://localhost:3010/api/trpc/startupStatus,mcp.getStatus?batch=1',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 0: { json: null }, 1: { json: null } }),
      },
    ));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
    expect(payload?.[0]?.result?.data).toEqual(expect.objectContaining({
      status: 'running',
      ready: true,
      uptime: 123,
      summary: expect.stringContaining('Using Go-native startup status in local dashboard compatibility mode'),
      startupMode: expect.objectContaining({
        requestedRuntime: 'auto',
        activeRuntime: 'go',
        launchMode: 'prebuilt Go binary',
        source: 'main-lock',
      }),
      runtime: expect.objectContaining({
        version: '1.0.0-alpha.1',
      }),
      checks: expect.objectContaining({
        memory: expect.objectContaining({
          ready: true,
          initialized: true,
          agentMemory: true,
          sectionedMemory: expect.objectContaining({
            totalEntries: 12,
            defaultSectionCount: 5,
            presentDefaultSectionCount: 5,
          }),
        }),
        sessionSupervisor: expect.objectContaining({
          ready: true,
        }),
        importedSessions: {
          totalSessions: 7,
          inlineTranscriptCount: 2,
          archivedTranscriptCount: 5,
          missingRetentionSummaryCount: 1,
        },
        mainControlPlane: {
          ready: false,
          baseUrl: null,
        },
        mesh: {
          nodeId: 'go-node-1',
          peersCount: 2,
        },
      }),
    }));
    expect(payload?.[1]?.result?.data).toEqual(expect.objectContaining({
      initialized: true,
      toolCount: 5,
      serverCount: 3,
      connectedCount: 2,
      sourceBackedHarnessCount: 2,
      source: 'source-backed-local-summary',
      lifecycle: expect.objectContaining({
        lazySessionMode: true,
        singleActiveServerMode: false,
      }),
    }));

    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4000/api/startup/status')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4000/api/runtime/status')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4000/api/mcp/status')).toBe(true);
  });

  it('prefers go-native mcp status in legacy MCP compatibility batches', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4100/trpc';
    global.fetch = vi.fn(async (input) => {
      const url = String(input);

      if (url === 'http://127.0.0.1:4100/trpc/mcpServers.list?input=%7B%7D') {
        throw new Error('connect ECONNREFUSED');
      }
      if (url.includes('/trpc/')) {
        throw new Error('connect ECONNREFUSED');
      }
      if (url === 'http://127.0.0.1:4100/api/mcp/status') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            initialized: true,
            connected: true,
            toolCount: 9,
            serverCount: 4,
            connectedCount: 3,
            lazySessionMode: true,
            singleActiveServerMode: false,
            source: 'source-backed-local-summary',
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'http://127.0.0.1:4100/api/billing/provider-quotas') {
        return new Response(JSON.stringify({
          success: true,
          data: [
            {
              provider: 'openrouter',
              name: 'OpenRouter',
              configured: true,
              authenticated: true,
              authMethod: 'api_key',
              tier: 'free',
              limit: null,
              used: 0,
              remaining: null,
              resetDate: null,
              rateLimitRpm: null,
              availability: 'available',
              lastError: null,
            },
          ],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'http://127.0.0.1:4100/api/billing/fallback-chain?taskType=coding') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            selectedTaskType: 'coding',
            chain: [
              { priority: 1, provider: 'openrouter', model: 'xiaomi/mimo-v2-flash:free', reason: 'free-first' },
            ],
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'http://127.0.0.1:4100/api/startup/status' || url === 'http://127.0.0.1:4100/api/runtime/status') {
        return new Response(JSON.stringify({ success: false }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const request = new Request(
      'http://localhost:3010/api/trpc/mcp.listServers,mcp.getStatus,billing.getProviderQuotas,billing.getFallbackChain?batch=1',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 0: { json: null }, 1: { json: null }, 2: { json: null }, 3: { json: { taskType: 'coding' } } }),
      },
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-hypercode-trpc-compat')).toBe('legacy-mcp-dashboard-bridge');
    expect(payload?.[1]?.result?.data).toEqual(expect.objectContaining({
      initialized: true,
      serverCount: 4,
      toolCount: 9,
      connectedCount: 3,
      source: 'source-backed-local-summary',
      lifecycle: expect.objectContaining({
        lazySessionMode: true,
        singleActiveServerMode: false,
      }),
    }));
    expect(payload?.[2]?.result?.data).toEqual([
      expect.objectContaining({
        provider: 'openrouter',
        name: 'OpenRouter',
        configured: true,
        tier: 'free',
      }),
    ]);
    expect(payload?.[3]?.result?.data).toEqual({
      selectedTaskType: 'coding',
      chain: [
        {
          priority: 1,
          provider: 'openrouter',
          model: 'xiaomi/mimo-v2-flash:free',
          reason: 'free-first',
        },
      ],
    });
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4100/api/mcp/status')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4100/api/billing/provider-quotas')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4100/api/billing/fallback-chain?taskType=coding')).toBe(true);
  });

  it('prefers go-native operator reads, session state, imported maintenance stats, install surfaces, execution environment, provider quotas, fallback chain, cli harnesses, session catalog, and sessions in local dashboard fallback mode', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4200/trpc';
    global.fetch = vi.fn(async (input) => {
      const url = String(input);

      if (url.includes('/trpc/')) {
        throw new Error('connect ECONNREFUSED');
      }
      if (url === 'http://127.0.0.1:4200/api/billing/provider-quotas') {
        return new Response(JSON.stringify({
          success: true,
          data: [
            {
              provider: 'anthropic',
              name: 'Anthropic',
              configured: true,
              authenticated: true,
              authMethod: 'api_key',
              tier: 'pro',
              limit: 1000,
              used: 250,
              remaining: 750,
              resetDate: null,
              rateLimitRpm: 50,
              availability: 'healthy',
              lastError: null,
            },
          ],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'http://127.0.0.1:4200/api/api-keys') {
        return new Response(JSON.stringify({
          success: true,
          data: [
            {
              uuid: 'key-1',
              name: 'Primary dashboard key',
              key: 'sk-test-primary-123456',
              created_at: '2026-04-05T06:00:00.000Z',
              is_active: true,
            },
          ],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'http://127.0.0.1:4200/api/expert/status') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            researcher: 'offline',
            coder: 'offline',
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'http://127.0.0.1:4200/api/memory/agent-stats') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            session: 3,
            working: 4,
            longTerm: 9,
            total: 16,
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'http://127.0.0.1:4200/api/sessions/supervisor/state') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            isAutoDriveActive: true,
            activeGoal: 'ship go parity',
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'http://127.0.0.1:4200/api/billing/fallback-chain') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            selectedTaskType: null,
            chain: [
              { priority: 1, provider: 'anthropic', model: 'claude-3.7-sonnet', reason: 'best-default' },
              { priority: 2, provider: 'openrouter', model: 'xiaomi/mimo-v2-flash:free', reason: 'free-fallback' },
            ],
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'http://127.0.0.1:4200/api/cli/harnesses') {
        return new Response(JSON.stringify({
          success: true,
          data: [
            {
              id: 'hypercode',
              description: 'HyperCode Go CLI harness',
              runtime: 'Go / Cobra / TUI',
              launchCommand: 'go run .',
              parityNotes: 'Source-backed harness',
              installed: true,
              maturity: 'Experimental',
              primary: true,
              upstream: 'https://github.com/hypercodehq/hypercode',
            },
            {
              id: 'claude-code',
              description: 'Claude Code CLI harness',
              runtime: 'External CLI',
              launchCommand: 'claude',
              parityNotes: 'External CLI metadata only',
              installed: false,
              maturity: 'Beta',
              primary: false,
              upstream: 'https://claude.ai/code',
            },
          ],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'http://127.0.0.1:4200/api/tools/detect-execution-environment') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            os: 'windows',
            summary: {
              ready: true,
              preferredShellId: 'pwsh',
              preferredShellLabel: 'PowerShell 7',
              shellCount: 2,
              verifiedShellCount: 2,
              toolCount: 3,
              verifiedToolCount: 2,
              harnessCount: 2,
              verifiedHarnessCount: 1,
              supportsPowerShell: true,
              supportsPosixShell: true,
              notes: ['Prefer PowerShell 7 for default shell execution.'],
            },
            shells: [
              {
                id: 'pwsh',
                name: 'PowerShell 7',
                installed: true,
                verified: true,
                preferred: true,
                resolvedPath: 'C:/Program Files/PowerShell/7/pwsh.exe',
                family: 'powershell',
                version: '7.5.0',
              },
              {
                id: 'git-bash',
                name: 'Git Bash',
                installed: true,
                verified: true,
                preferred: false,
                resolvedPath: 'C:/Program Files/Git/bin/bash.exe',
                family: 'posix',
                version: null,
              },
            ],
            tools: [
              {
                id: 'node',
                name: 'Node.js',
                installed: true,
                verified: true,
                resolvedPath: 'C:/Program Files/nodejs/node.exe',
                version: '24.10.0',
                capabilities: ['runtime', 'scripts'],
              },
              {
                id: 'go',
                name: 'Go',
                installed: true,
                verified: true,
                resolvedPath: 'C:/Go/bin/go.exe',
                version: '1.22.0',
                capabilities: ['build', 'test'],
              },
              {
                id: 'aider',
                name: 'Aider CLI',
                installed: true,
                verified: false,
                resolvedPath: 'C:/Users/hyper/AppData/Roaming/Python/Scripts/aider.exe',
                version: null,
                capabilities: ['chat'],
              },
            ],
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'http://127.0.0.1:4200/api/tools/detect-install-surfaces') {
        return new Response(JSON.stringify({
          success: true,
          data: [
            {
              id: 'browser-extension-chromium',
              status: 'ready',
              artifactPath: 'apps/hypercode-extension/dist-chromium',
              artifactKind: 'Chromium unpacked bundle',
              detail: 'Unpacked Chromium-compatible browser extension output is available.',
              declaredVersion: '0.7.3',
              lastModifiedAt: '2026-04-05T07:00:00.000Z',
            },
            {
              id: 'browser-extension-firefox',
              status: 'partial',
              artifactPath: 'apps/hypercode-extension/manifest.firefox.json',
              artifactKind: 'Firefox manifest source',
              detail: 'Firefox manifest source is present, but no packaged Firefox bundle was detected yet.',
              declaredVersion: '0.7.3',
              lastModifiedAt: '2026-04-04T22:00:00.000Z',
            },
            {
              id: 'vscode-extension',
              status: 'partial',
              artifactPath: 'packages/vscode/dist/extension.js',
              artifactKind: 'Compiled extension output',
              detail: 'VS Code extension is compiled, but no `.vsix` package was detected yet.',
              declaredVersion: '0.2.0',
              lastModifiedAt: '2026-04-04T20:00:00.000Z',
            },
            {
              id: 'mcp-client-sync',
              status: 'ready',
              artifactPath: 'mcp.jsonc',
              artifactKind: 'JSONC config source',
              detail: 'HyperCode-managed MCP config source is present for dashboard sync and preview flows.',
              declaredVersion: null,
              lastModifiedAt: '2026-04-05T06:55:00.000Z',
            },
          ],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'http://127.0.0.1:4200/api/sessions/imported/maintenance-stats') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            totalSessions: 11,
            inlineTranscriptCount: 4,
            archivedTranscriptCount: 7,
            missingRetentionSummaryCount: 2,
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'http://127.0.0.1:4200/api/sessions') {
        return new Response(JSON.stringify({
          success: true,
          data: [
            {
              id: 'sess-1',
              cliType: 'claude-code',
              status: 'active',
              task: 'Refactor startup fallback',
              startedAt: '2026-04-04T00:00:00.000Z',
              sourcePath: 'C:/repo-a/.claude/sessions/session-1.jsonl',
              sessionFormat: 'jsonl',
              valid: true,
              detectedModels: ['claude-3.7-sonnet'],
            },
          ],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'http://127.0.0.1:4200/api/shell/history/system?limit=8') {
        return new Response(JSON.stringify({
          success: true,
          data: ['git status', 'pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts'],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'http://127.0.0.1:4200/api/mcp/status' || url === 'http://127.0.0.1:4200/api/startup/status' || url === 'http://127.0.0.1:4200/api/runtime/status') {
        return new Response(JSON.stringify({ success: false }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const response = await POST(new Request(
      'http://localhost:3010/api/trpc/startupStatus,billing.getProviderQuotas,billing.getFallbackChain,apiKeys.list,tools.detectCliHarnesses,tools.detectExecutionEnvironment,tools.detectInstallSurfaces,expert.getStatus,session.getState,agentMemory.stats,shell.getSystemHistory,session.catalog,session.importedMaintenanceStats,session.list?batch=1',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 0: { json: null }, 1: { json: null }, 2: { json: null }, 3: { json: null }, 4: { json: null }, 5: { json: null }, 6: { json: null }, 7: { json: null }, 8: { json: null }, 9: { json: null }, 10: { json: { limit: 8 } }, 11: { json: null }, 12: { json: null }, 13: { json: null } }),
      },
    ));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
    expect(payload?.[0]?.result?.data).toEqual(expect.objectContaining({
      checks: expect.objectContaining({
        executionEnvironment: expect.objectContaining({
          ready: true,
          preferredShellId: 'pwsh',
          preferredShellLabel: 'PowerShell 7',
          shellCount: 2,
          verifiedShellCount: 2,
          toolCount: 3,
          verifiedToolCount: 2,
          harnessCount: 2,
          verifiedHarnessCount: 1,
          supportsPowerShell: true,
          supportsPosixShell: true,
          notes: ['Prefer PowerShell 7 for default shell execution.'],
        }),
        importedSessions: {
          totalSessions: 11,
          inlineTranscriptCount: 4,
          archivedTranscriptCount: 7,
          missingRetentionSummaryCount: 2,
        },
      }),
    }));
    expect(payload?.[1]?.result?.data).toEqual([
      expect.objectContaining({
        provider: 'anthropic',
        name: 'Anthropic',
        configured: true,
        tier: 'pro',
        used: 250,
        remaining: 750,
      }),
    ]);
    expect(payload?.[2]?.result?.data).toEqual({
      selectedTaskType: null,
      chain: [
        {
          priority: 1,
          provider: 'anthropic',
          model: 'claude-3.7-sonnet',
          reason: 'best-default',
        },
        {
          priority: 2,
          provider: 'openrouter',
          model: 'xiaomi/mimo-v2-flash:free',
          reason: 'free-fallback',
        },
      ],
    });
    expect(payload?.[3]?.result?.data).toEqual([
      expect.objectContaining({
        uuid: 'key-1',
        name: 'Primary dashboard key',
        key_prefix: 'sk-test-',
        created_at: '2026-04-05T06:00:00.000Z',
        is_active: true,
      }),
    ]);
    expect(payload?.[4]?.result?.data).toEqual([
      expect.objectContaining({
        id: 'hypercode',
        name: 'hypercode',
        installed: true,
        command: 'go run .',
      }),
      expect.objectContaining({
        id: 'claude-code',
        name: 'claude-code',
        installed: false,
      }),
    ]);
    expect(payload?.[5]?.result?.data).toEqual(expect.objectContaining({
      os: 'windows',
      summary: expect.objectContaining({
        ready: true,
        preferredShellId: 'pwsh',
        preferredShellLabel: 'PowerShell 7',
        verifiedToolCount: 2,
        supportsPosixShell: true,
      }),
      shells: [
        expect.objectContaining({ id: 'pwsh', preferred: true, verified: true }),
        expect.objectContaining({ id: 'git-bash', verified: true, family: 'posix' }),
      ],
      tools: [
        expect.objectContaining({ id: 'node', verified: true, version: '24.10.0' }),
        expect.objectContaining({ id: 'go', verified: true, version: '1.22.0' }),
        expect.objectContaining({ id: 'aider', verified: false }),
      ],
      harnesses: [
        expect.objectContaining({ id: 'hypercode', installed: true }),
        expect.objectContaining({ id: 'claude-code', installed: false }),
      ],
    }));
    expect(payload?.[6]?.result?.data).toEqual([
      expect.objectContaining({
        id: 'browser-extension-chromium',
        status: 'ready',
        artifactPath: 'apps/hypercode-extension/dist-chromium',
        artifactKind: 'Chromium unpacked bundle',
        declaredVersion: '0.7.3',
      }),
      expect.objectContaining({
        id: 'browser-extension-firefox',
        status: 'partial',
        artifactPath: 'apps/hypercode-extension/manifest.firefox.json',
        artifactKind: 'Firefox manifest source',
      }),
      expect.objectContaining({
        id: 'vscode-extension',
        status: 'partial',
        artifactPath: 'packages/vscode/dist/extension.js',
      }),
      expect.objectContaining({
        id: 'mcp-client-sync',
        status: 'ready',
        artifactPath: 'mcp.jsonc',
      }),
    ]);
    expect(payload?.[7]?.result?.data).toEqual({
      researcher: 'offline',
      coder: 'offline',
    });
    expect(payload?.[8]?.result?.data).toEqual({
      isAutoDriveActive: true,
      activeGoal: 'ship go parity',
    });
    expect(payload?.[9]?.result?.data).toEqual({
      session: 3,
      working: 4,
      longTerm: 9,
      total: 16,
    });
    expect(payload?.[10]?.result?.data).toEqual([
      'git status',
      'pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts',
    ]);
    expect(payload?.[11]?.result?.data).toEqual([
      expect.objectContaining({
        id: 'hypercode',
        name: 'hypercode',
        sessionCapable: true,
        installed: true,
        category: 'cli',
      }),
      expect.objectContaining({
        id: 'claude-code',
        name: 'claude-code',
        sessionCapable: true,
        installed: false,
        category: 'cli',
      }),
    ]);
    expect(payload?.[12]?.result?.data).toEqual({
      totalSessions: 11,
      inlineTranscriptCount: 4,
      archivedTranscriptCount: 7,
      missingRetentionSummaryCount: 2,
    });
    expect(payload?.[13]?.result?.data).toEqual([
      expect.objectContaining({
        id: 'sess-1',
        name: 'Refactor startup fallback',
        cliType: 'claude-code',
        workingDirectory: 'C:/repo-a/.claude/sessions/session-1.jsonl',
        status: 'running',
        restartCount: 0,
        maxRestartAttempts: 0,
        logs: [],
      }),
    ]);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4200/api/billing/provider-quotas')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4200/api/api-keys')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4200/api/expert/status')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4200/api/sessions/supervisor/state')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4200/api/memory/agent-stats')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4200/api/shell/history/system?limit=8')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4200/api/billing/fallback-chain')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4200/api/cli/harnesses')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4200/api/tools/detect-execution-environment')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4200/api/tools/detect-install-surfaces')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4200/api/sessions/imported/maintenance-stats')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4200/api/sessions')).toBe(true);
  });

  it('prefers go-native memory reads in local dashboard fallback mode', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4545/trpc';
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);

      if (url.includes('/trpc/')) {
        throw new Error('connect ECONNREFUSED');
      }

      if (url === 'http://127.0.0.1:4545/api/memory/agent-stats') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            sessionCount: 1,
            workingCount: 2,
            longTermCount: 3,
            observationCount: 4,
            sessionSummaryCount: 2,
            promptCount: 1,
          },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4545/api/memory/observations/recent?limit=6&namespace=project') {
        return new Response(JSON.stringify({
          success: true,
          data: [{ id: 'obs-1', content: 'Recent observation', type: 'working', metadata: { source: 'project' } }],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4545/api/memory/user-prompts/recent?limit=5') {
        return new Response(JSON.stringify({
          success: true,
          data: [{ id: 'prompt-1', content: 'Need help with parity', type: 'long_term', metadata: { role: 'user' } }],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4545/api/memory/session-summaries/recent?limit=4') {
        return new Response(JSON.stringify({
          success: true,
          data: [{ id: 'summary-1', content: 'Session summary', type: 'long_term', metadata: { sessionId: 'sess-1' } }],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4545/api/memory/agent-search?query=go+parity&type=working&limit=20') {
        return new Response(JSON.stringify({
          success: true,
          data: [{ id: 'mem-1', content: 'Go parity memory', type: 'working', metadata: { namespace: 'project' } }],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4545/api/memory/observations/search?query=go+parity&limit=20&namespace=project') {
        return new Response(JSON.stringify({
          success: true,
          data: [{ id: 'obs-search-1', content: 'Observation search result', type: 'working', metadata: { namespace: 'project' } }],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4545/api/memory/user-prompts/search?query=go+parity&limit=20') {
        return new Response(JSON.stringify({
          success: true,
          data: [{ id: 'prompt-search-1', content: 'Prompt search result', type: 'long_term', metadata: { role: 'user' } }],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4545/api/memory/session-summaries/search?query=go+parity&limit=20') {
        return new Response(JSON.stringify({
          success: true,
          data: [{ id: 'summary-search-1', content: 'Summary search result', type: 'long_term', metadata: { sessionId: 'sess-2' } }],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4545/api/memory/interchange-formats') {
        return new Response(JSON.stringify({
          success: true,
          data: [
            { id: 'json', label: 'Canonical JSON' },
            { id: 'sectioned-memory-store', label: 'Sectioned Memory Store' },
          ],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4545/api/memory/export?userId=default&format=json') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            data: '[{"uuid":"mem-1","content":"Go parity memory"}]',
            format: 'json',
            exportedAt: '2026-04-06T06:00:00.000Z',
          },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4545/api/memory/pivot/search' && init?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: [{ id: 'pivot-1', content: 'Pivot result', type: 'working', metadata: { pivot: 'goal' } }],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4545/api/memory/timeline/window' && init?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: [{ id: 'timeline-1', content: 'Timeline result', type: 'working', metadata: { sessionId: 'sess-1' } }],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4545/api/memory/cross-session-links' && init?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: [{ memory: { id: 'related-1', content: 'Related memory', type: 'working', metadata: { sessionId: 'sess-2' } }, score: 0.92, reasons: ['same goal'] }],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const readResponse = await POST(new Request(
      'http://localhost:3010/api/trpc/memory.getAgentStats,memory.getRecentObservations,memory.getRecentUserPrompts,memory.getRecentSessionSummaries,memory.searchAgentMemory,memory.searchObservations,memory.searchUserPrompts,memory.searchSessionSummaries,memory.listInterchangeFormats?batch=1',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          0: { json: null },
          1: { json: { limit: 6, namespace: 'project' } },
          2: { json: { limit: 5 } },
          3: { json: { limit: 4 } },
          4: { json: { query: 'go parity', type: 'working', limit: 20 } },
          5: { json: { query: 'go parity', limit: 20, namespace: 'project' } },
          6: { json: { query: 'go parity', limit: 20 } },
          7: { json: { query: 'go parity', limit: 20 } },
          8: { json: null },
        }),
      },
    ));
    const readPayload = await readResponse.json();

    expect(readResponse.status).toBe(200);
    expect(readResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
    expect(readPayload?.[0]?.result?.data).toEqual(expect.objectContaining({ sessionCount: 1, workingCount: 2, longTermCount: 3 }));
    expect(readPayload?.[1]?.result?.data).toEqual([expect.objectContaining({ id: 'obs-1', content: 'Recent observation' })]);
    expect(readPayload?.[2]?.result?.data).toEqual([expect.objectContaining({ id: 'prompt-1', content: 'Need help with parity' })]);
    expect(readPayload?.[3]?.result?.data).toEqual([expect.objectContaining({ id: 'summary-1', content: 'Session summary' })]);
    expect(readPayload?.[4]?.result?.data).toEqual([expect.objectContaining({ id: 'mem-1', content: 'Go parity memory' })]);
    expect(readPayload?.[5]?.result?.data).toEqual([expect.objectContaining({ id: 'obs-search-1' })]);
    expect(readPayload?.[6]?.result?.data).toEqual([expect.objectContaining({ id: 'prompt-search-1' })]);
    expect(readPayload?.[7]?.result?.data).toEqual([expect.objectContaining({ id: 'summary-search-1' })]);
    expect(readPayload?.[8]?.result?.data).toEqual([
      expect.objectContaining({ id: 'json' }),
      expect.objectContaining({ id: 'sectioned-memory-store' }),
    ]);

    const pivotResponse = await POST(new Request('http://localhost:3010/api/trpc/memory.searchMemoryPivot', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { pivot: 'goal', value: 'ship parity', limit: 20 } }),
    }));
    expect(pivotResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
    expect((await pivotResponse.json())?.result?.data).toEqual([expect.objectContaining({ id: 'pivot-1' })]);

    const timelineResponse = await POST(new Request('http://localhost:3010/api/trpc/memory.getMemoryTimelineWindow', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { sessionId: 'sess-1', anchorTimestamp: 1710000000000, before: 3, after: 3 } }),
    }));
    expect((await timelineResponse.json())?.result?.data).toEqual([expect.objectContaining({ id: 'timeline-1' })]);

    const linksResponse = await POST(new Request('http://localhost:3010/api/trpc/memory.getCrossSessionMemoryLinks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { memoryId: 'mem-1', limit: 4 } }),
    }));
    expect((await linksResponse.json())?.result?.data).toEqual([
      expect.objectContaining({ memory: expect.objectContaining({ id: 'related-1' }), score: 0.92 }),
    ]);

    const exportResponse = await GET(new Request(`http://localhost:3010/api/trpc/memory.exportMemories?input=${encodeURIComponent(JSON.stringify({ userId: 'default', format: 'json' }))}`));
    expect(exportResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
    expect((await exportResponse.json())?.result?.data).toEqual(expect.objectContaining({ format: 'json' }));

    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4545/api/memory/agent-stats')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4545/api/memory/interchange-formats')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4545/api/memory/export?userId=default&format=json')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4545/api/memory/pivot/search')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4545/api/memory/timeline/window')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4545/api/memory/cross-session-links')).toBe(true);
  });

  it('prefers go-native memory mutations in local dashboard fallback mode', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4546/trpc';
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);

      if (url.includes('/trpc/')) {
        throw new Error('connect ECONNREFUSED');
      }

      if (url === 'http://127.0.0.1:4546/api/memory/facts/add' && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { success: true } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4546/api/memory/import' && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { imported: 1, errors: 0, importedAt: '2026-04-06T06:05:00.000Z' } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4546/api/memory/convert' && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { data: '{"ok":true}', fromFormat: 'json', toFormat: 'jsonl', convertedAt: '2026-04-06T06:06:00.000Z' } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const addFactResponse = await POST(new Request('http://localhost:3010/api/trpc/memory.addFact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { content: 'remember this', type: 'working' } }),
    }));
    expect(addFactResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-memory-action');
    expect((await addFactResponse.json())?.result?.data).toEqual({ success: true });

    const importResponse = await POST(new Request('http://localhost:3010/api/trpc/memory.importMemories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { userId: 'default', format: 'json', data: '[{"uuid":"mem-1","content":"hello"}]' } }),
    }));
    expect(importResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-memory-action');
    expect((await importResponse.json())?.result?.data).toEqual(expect.objectContaining({ imported: 1, errors: 0 }));

    const convertResponse = await POST(new Request('http://localhost:3010/api/trpc/memory.convertMemories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { userId: 'default', fromFormat: 'json', toFormat: 'jsonl', data: '[{"uuid":"mem-1","content":"hello"}]' } }),
    }));
    expect(convertResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-memory-action');
    expect((await convertResponse.json())?.result?.data).toEqual(expect.objectContaining({ fromFormat: 'json', toFormat: 'jsonl' }));

    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4546/api/memory/facts/add')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4546/api/memory/import')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4546/api/memory/convert')).toBe(true);
  });

  it('prefers go-native submodule reads and mutations in local dashboard fallback mode', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4549/trpc';
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);

      if (url.includes('/trpc/')) {
        throw new Error('connect ECONNREFUSED');
      }

      if (url === 'http://127.0.0.1:4549/api/submodules') {
        return new Response(JSON.stringify({
          success: true,
          data: [
            { path: 'submodules/demo', url: 'https://example.com/demo.git', branch: 'main' },
          ],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4549/api/submodules/update-all' && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { success: true } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4549/api/submodules/capabilities?path=submodules%2Fdemo') {
        return new Response(JSON.stringify({
          success: true,
          data: ['build', 'install'],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const readResponse = await POST(new Request(
      'http://localhost:3010/api/trpc/submodule.list,submodule.detectCapabilities?batch=1',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          0: { json: null },
          1: { json: { path: 'submodules/demo' } },
        }),
      },
    ));
    const readPayload = await readResponse.json();

    expect(readResponse.status).toBe(200);
    expect(readResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
    expect(readPayload?.[0]?.result?.data).toEqual([
      expect.objectContaining({ path: 'submodules/demo' }),
    ]);
    expect(readPayload?.[1]?.result?.data).toEqual(['build', 'install']);

    const updateResponse = await POST(new Request('http://localhost:3010/api/trpc/submodule.updateAll', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: null }),
    }));
    expect(updateResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-submodule-action');
    expect((await updateResponse.json())?.result?.data).toEqual({ success: true });
  });

  it('prefers go-native orchestration, marketplace, and maintenance reads and mutations in local dashboard fallback mode', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4580/trpc';
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);

      if (url.includes('/trpc/')) {
        throw new Error('connect ECONNREFUSED');
      }

      if (url === 'http://127.0.0.1:4580/api/suggestions') {
        return new Response(JSON.stringify({ success: true, data: [{ id: 'sug-1', title: 'Clean up' }] }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4580/api/swarm/missions') {
        return new Response(JSON.stringify({ success: true, data: [{ missionId: 'mission-1', status: 'running' }] }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4580/api/squad') {
        return new Response(JSON.stringify({ success: true, data: [{ id: 'mem-1', role: 'architect' }] }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4580/api/links-backlog/stats') {
        return new Response(JSON.stringify({ success: true, data: { total: 100, pending: 5 } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4580/api/infrastructure/run-doctor' && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { success: true, output: 'Healthy' } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const readResponse = await POST(new Request(
      'http://localhost:3010/api/trpc/suggestions.list,swarm.listMissions,squad.list,linksBacklog.stats?batch=1',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          0: { json: null },
          1: { json: null },
          2: { json: null },
          3: { json: null },
        }),
      },
    ));
    const readPayload = await readResponse.json();

    expect(readResponse.status).toBe(200);
    expect(readResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
    expect(readPayload?.[0]?.result?.data).toEqual([expect.objectContaining({ id: 'sug-1' })]);
    expect(readPayload?.[1]?.result?.data).toEqual([expect.objectContaining({ missionId: 'mission-1' })]);
    expect(readPayload?.[2]?.result?.data).toEqual([expect.objectContaining({ id: 'mem-1' })]);
    expect(readPayload?.[3]?.result?.data).toEqual(expect.objectContaining({ total: 100 }));

    const doctorResponse = await POST(new Request('http://localhost:3010/api/trpc/infrastructure.runDoctor', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: null }),
    }));
    expect(doctorResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-infrastructure-action');
    expect((await doctorResponse.json())?.result?.data).toEqual(expect.objectContaining({ output: 'Healthy' }));
  });

  it('prefers go-native council and director reads and mutations in local dashboard fallback mode', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4570/trpc';
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);

      if (url.includes('/trpc/')) {
        throw new Error('connect ECONNREFUSED');
      }

      if (url === 'http://127.0.0.1:4570/api/council/status') {
        return new Response(JSON.stringify({
          success: true,
          data: { supervisors: [{ name: 'planner', status: 'online' }] },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4570/api/director/chat' && init?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: { response: 'Hello from director' },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const readResponse = await POST(new Request('http://localhost:3010/api/trpc/council.base.status', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: null }),
    }));
    const readPayload = await readResponse.json();

    expect(readResponse.status).toBe(200);
    expect(readResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
    expect(readPayload?.[0]?.result?.data ?? readPayload?.result?.data).toEqual({
      supervisors: [expect.objectContaining({ name: 'planner' })],
    });

    const chatResponse = await POST(new Request('http://localhost:3010/api/trpc/director.chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { message: 'hi' } }),
    }));
    const chatPayload = await chatResponse.json();
    expect(chatPayload?.[0]?.result?.data ?? chatPayload?.result?.data).toEqual({
      response: 'Hello from director',
    });

    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4570/api/council/status')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4570/api/director/chat')).toBe(true);
  });

  it('prefers go-native browser status and actions in local dashboard fallback mode', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4560/trpc';
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);

      if (url.includes('/trpc/')) {
        throw new Error('connect ECONNREFUSED');
      }

      if (url === 'http://127.0.0.1:4560/api/browser/status') {
        return new Response(JSON.stringify({
          success: true,
          data: { available: true, pageCount: 2 },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const response = await POST(new Request('http://localhost:3010/api/trpc/browser.status', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: null }),
    }));

    expect(response.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
    expect((await response.json())?.result?.data).toEqual({
      available: true,
      pageCount: 2,
    });
  });

  it('prefers go-native catalog reads and mutations in local dashboard fallback mode', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4559/trpc';
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);

      if (url.includes('/trpc/')) {
        throw new Error('connect ECONNREFUSED');
      }

      if (url === 'http://127.0.0.1:4559/api/catalog/stats') {
        return new Response(JSON.stringify({
          success: true,
          data: { total: 10, by_status: { published: 10 }, by_transport: { STDIO: 10 }, providers: 2 },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4559/api/catalog?limit=10&offset=0') {
        return new Response(JSON.stringify({
          success: true,
          data: { items: [{ uuid: 'cat-1', canonical_id: 'tool-1' }], total: 1 },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4559/api/catalog/ingest' && init?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: { total_upserted: 3 },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const readResponse = await POST(new Request(
      'http://localhost:3010/api/trpc/catalog.stats,catalog.list?batch=1',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          0: { json: null },
          1: { json: { limit: 10, offset: 0 } },
        }),
      },
    ));
    const readPayload = await readResponse.json();

    expect(readResponse.status).toBe(200);
    expect(readResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
    expect(readPayload?.[0]?.result?.data).toEqual(expect.objectContaining({ total: 10, providers: 2 }));
    expect(readPayload?.[1]?.result?.data).toEqual(expect.objectContaining({ total: 1, items: [expect.objectContaining({ uuid: 'cat-1' })] }));

    const ingestResponse = await POST(new Request('http://localhost:3010/api/trpc/catalog.triggerIngestion', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: null }),
    }));
    expect(ingestResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-catalog-action');
    expect((await ingestResponse.json())?.result?.data).toEqual(expect.objectContaining({ total_upserted: 3 }));
  });

  it('prefers go-native skills reads and assimilation in local dashboard fallback mode', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4542/trpc';
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);

      if (url.includes('/trpc/')) {
        throw new Error('connect ECONNREFUSED');
      }

      if (url === 'http://127.0.0.1:4542/api/skills') {
        return new Response(JSON.stringify({
          success: true,
          data: [
            { id: 'debug', name: 'debug', description: 'Debug help', content: 'Use rg', path: 'C:/repo/.hypercode/skills/debug/SKILL.md' },
          ],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4542/api/skills/read?name=debug') {
        return new Response(JSON.stringify({
          success: true,
          data: { content: [{ type: 'text', text: 'Debugging skill content' }] },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4542/api/skills/assimilate' && init?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            success: true,
            logs: ['Starting assimilation for: debugging', 'Phase 4 complete'],
            toolName: 'debugging',
          },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const readResponse = await POST(new Request(
      'http://localhost:3010/api/trpc/skills.list,skills.read?batch=1',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          0: { json: null },
          1: { json: { name: 'debug' } },
        }),
      },
    ));
    const readPayload = await readResponse.json();

    expect(readResponse.status).toBe(200);
    expect(readResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
    expect(readPayload?.[0]?.result?.data).toEqual([
      expect.objectContaining({ id: 'debug', name: 'debug', description: 'Debug help' }),
    ]);
    expect(readPayload?.[1]?.result?.data).toEqual(expect.objectContaining({
      content: [expect.objectContaining({ type: 'text', text: 'Debugging skill content' })],
    }));

    const assimilateResponse = await POST(new Request('http://localhost:3010/api/trpc/skills.assimilate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { topic: 'debugging' } }),
    }));
    expect(assimilateResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-skill-action');
    expect((await assimilateResponse.json())?.result?.data).toEqual(expect.objectContaining({
      success: true,
      toolName: 'debugging',
    }));

    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4542/api/skills')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4542/api/skills/read?name=debug')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4542/api/skills/assimilate')).toBe(true);
  });

  it('prefers go-native mcp settings reads and sync mutations in local dashboard fallback mode', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4541/trpc';
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);

      if (url.includes('/trpc/')) {
        throw new Error('connect ECONNREFUSED');
      }

      if (url === 'http://127.0.0.1:4541/api/config/list') {
        return new Response(JSON.stringify({
          success: true,
          data: [
            { key: 'theme', value: 'dark' },
            { key: 'telemetry', value: 'enabled' },
          ],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4541/api/mcp/servers/sync-targets') {
        return new Response(JSON.stringify({
          success: true,
          data: [
            {
              client: 'claude-desktop',
              path: 'C:/Users/hyper/AppData/Roaming/Claude/claude_desktop_config.json',
              candidates: ['C:/Users/hyper/AppData/Roaming/Claude/claude_desktop_config.json'],
              exists: true,
            },
          ],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4541/api/mcp/servers/export-client-config?client=claude-desktop') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            client: 'claude-desktop',
            targetPath: 'C:/Users/hyper/AppData/Roaming/Claude/claude_desktop_config.json',
            existed: true,
            serverCount: 2,
            document: { mcpServers: { hypercode: { command: 'hypercode' } } },
            json: '{"mcpServers":{"hypercode":{"command":"hypercode"}}}',
          },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4541/api/config/update' && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: true }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4541/api/mcp/servers/sync-client-config' && init?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            client: 'claude-desktop',
            targetPath: 'C:/Users/hyper/AppData/Roaming/Claude/claude_desktop_config.json',
            existed: true,
            serverCount: 2,
            document: { mcpServers: { hypercode: { command: 'hypercode' } } },
            json: '{"mcpServers":{"hypercode":{"command":"hypercode"}}}',
            written: true,
          },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const readResponse = await POST(new Request(
      'http://localhost:3010/api/trpc/config.list,mcpServers.syncTargets,mcpServers.exportClientConfig?batch=1',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          0: { json: null },
          1: { json: null },
          2: { json: { client: 'claude-desktop' } },
        }),
      },
    ));
    const readPayload = await readResponse.json();

    expect(readResponse.status).toBe(200);
    expect(readResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
    expect(readPayload?.[0]?.result?.data).toEqual([
      expect.objectContaining({ key: 'theme', value: 'dark' }),
      expect.objectContaining({ key: 'telemetry', value: 'enabled' }),
    ]);
    expect(readPayload?.[1]?.result?.data).toEqual([
      expect.objectContaining({ client: 'claude-desktop', exists: true }),
    ]);
    expect(readPayload?.[2]?.result?.data).toEqual(expect.objectContaining({
      client: 'claude-desktop',
      serverCount: 2,
      targetPath: 'C:/Users/hyper/AppData/Roaming/Claude/claude_desktop_config.json',
    }));

    const updateResponse = await POST(new Request('http://localhost:3010/api/trpc/config.update', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { key: 'theme', value: 'light' } }),
    }));
    expect(updateResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-config-action');
    expect((await updateResponse.json())?.result?.data).toBe(true);

    const syncResponse = await POST(new Request('http://localhost:3010/api/trpc/mcpServers.syncClientConfig', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { client: 'claude-desktop' } }),
    }));
    expect(syncResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-mcp-managed-action');
    expect((await syncResponse.json())?.result?.data).toEqual(expect.objectContaining({
      client: 'claude-desktop',
      written: true,
    }));

    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4541/api/config/list')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4541/api/mcp/servers/sync-targets')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4541/api/mcp/servers/export-client-config?client=claude-desktop')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4541/api/config/update')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4541/api/mcp/servers/sync-client-config')).toBe(true);
  });

  it('prefers go-native project reads and mutations in local dashboard fallback mode', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4543/trpc';
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);

      if (url.includes('/trpc/')) {
        throw new Error('connect ECONNREFUSED');
      }

      if (url === 'http://127.0.0.1:4543/api/project/context') {
        return new Response(JSON.stringify({
          success: true,
          data: '# Project Context\n\nShip reliable Go-first fallbacks.',
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4543/api/project/handoffs') {
        return new Response(JSON.stringify({
          success: true,
          data: [
            { id: 'handoff_1710000000000.json', timestamp: 1710000000000, path: 'handoff_1710000000000.json' },
          ],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4543/api/project/context/update' && init?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: { success: true },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const readResponse = await POST(new Request(
      'http://localhost:3010/api/trpc/project.getContext,project.getHandoffs?batch=1',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          0: { json: null },
          1: { json: null },
        }),
      },
    ));
    const readPayload = await readResponse.json();

    expect(readResponse.status).toBe(200);
    expect(readResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
    expect(readPayload?.[0]?.result?.data).toBe('# Project Context\n\nShip reliable Go-first fallbacks.');
    expect(readPayload?.[1]?.result?.data).toEqual([
      expect.objectContaining({ id: 'handoff_1710000000000.json' }),
    ]);

    const updateResponse = await POST(new Request('http://localhost:3010/api/trpc/project.updateContext', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { content: '# Project Context\n\nUpdated from dashboard.' } }),
    }));
    expect(updateResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-project-action');
    expect((await updateResponse.json())?.result?.data).toEqual({ success: true });

    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4543/api/project/context')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4543/api/project/handoffs')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4543/api/project/context/update')).toBe(true);
  });

  it('prefers go-native agent-memory reads and mutations in local dashboard fallback mode', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4544/trpc';
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);

      if (url.includes('/trpc/')) {
        throw new Error('connect ECONNREFUSED');
      }

      if (url === 'http://127.0.0.1:4544/api/agent-memory/recent?limit=5&type=long_term') {
        return new Response(JSON.stringify({
          success: true,
          data: [
            { id: 'am-1', content: 'Recent long-term note', type: 'long_term', namespace: 'project', metadata: { tags: ['intake'] } },
          ],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4544/api/agent-memory/export') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            session: [],
            working: [],
            long_term: [{ id: 'am-1', content: 'Recent long-term note' }],
          },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4544/api/agent-memory/add' && init?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: { id: 'am-created-1', content: 'Manual intake memory', type: 'long_term', namespace: 'project' },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4544/api/agent-memory/handoff' && init?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: { artifact: '{"kind":"handoff"}' },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4544/api/agent-memory/pickup' && init?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: { success: true, count: 3, restored: 3 },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const recentResponse = await POST(new Request('http://localhost:3010/api/trpc/agentMemory.getRecent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { limit: 5, type: 'long_term' } }),
    }));
    expect(recentResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
    expect((await recentResponse.json())?.result?.data).toEqual([
      expect.objectContaining({ id: 'am-1', content: 'Recent long-term note', type: 'long_term' }),
    ]);

    const exportResponse = await POST(new Request('http://localhost:3010/api/trpc/agentMemory.export', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: null }),
    }));
    expect(exportResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
    expect((await exportResponse.json())?.result?.data).toEqual(expect.objectContaining({
      long_term: [expect.objectContaining({ id: 'am-1' })],
    }));

    const addResponse = await POST(new Request('http://localhost:3010/api/trpc/agentMemory.add', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { content: 'Manual intake memory', type: 'long_term', namespace: 'project', tags: ['manual_intake'] } }),
    }));
    expect(addResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-agent-memory-action');
    expect((await addResponse.json())?.result?.data).toEqual(expect.objectContaining({ id: 'am-created-1', type: 'long_term' }));

    const handoffResponse = await POST(new Request('http://localhost:3010/api/trpc/agentMemory.handoff', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { notes: 'dashboard compaction' } }),
    }));
    expect(handoffResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-agent-memory-action');
    expect((await handoffResponse.json())?.result?.data).toEqual(expect.objectContaining({ artifact: '{"kind":"handoff"}' }));

    const pickupResponse = await POST(new Request('http://localhost:3010/api/trpc/agentMemory.pickup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { artifact: '{"kind":"handoff"}' } }),
    }));
    expect(pickupResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-agent-memory-action');
    expect((await pickupResponse.json())?.result?.data).toEqual(expect.objectContaining({ success: true, count: 3, restored: 3 }));

    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4544/api/agent-memory/recent?limit=5&type=long_term')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4544/api/agent-memory/export')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4544/api/agent-memory/add')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4544/api/agent-memory/handoff')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4544/api/agent-memory/pickup')).toBe(true);
  });

  it('prefers go-native supervised session reads and mutations in local dashboard fallback mode', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4400/trpc';
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);

      if (url.includes('/trpc/')) {
        throw new Error('connect ECONNREFUSED');
      }

      if (url === 'http://127.0.0.1:4400/api/sessions/supervisor/get?id=sess-live-1') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            id: 'sess-live-1',
            name: 'Live Go Session',
            cliType: 'hypercode',
            command: 'hypercode',
            args: ['agent'],
            env: {},
            executionProfile: 'auto',
            executionPolicy: {
              requestedProfile: 'auto',
              effectiveProfile: 'powershell',
              shellId: 'pwsh',
              shellLabel: 'PowerShell 7',
              shellFamily: 'powershell',
              shellPath: 'C:/Program Files/PowerShell/7/pwsh.exe',
              supportsPowerShell: true,
              supportsPosixShell: true,
              reason: 'Prefer PowerShell 7.',
            },
            requestedWorkingDirectory: 'C:/repo',
            workingDirectory: 'C:/repo',
            autoRestart: true,
            isolateWorktree: false,
            status: 'running',
            createdAt: 1712300000000,
            lastActivityAt: 1712300001000,
            restartCount: 1,
            maxRestartAttempts: 5,
            metadata: {},
            logs: [],
          },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4400/api/sessions/supervisor/logs?id=sess-live-1&limit=5') {
        return new Response(JSON.stringify({
          success: true,
          data: [{ timestamp: 1712300002000, stream: 'system', message: 'Go fallback log line' }],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4400/api/sessions/supervisor/attach-info?id=sess-live-1') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            id: 'sess-live-1',
            pid: 4242,
            command: 'hypercode',
            args: ['agent'],
            cwd: 'C:/repo',
            status: 'running',
            attachable: true,
            attachReadiness: 'ready',
            attachReadinessReason: 'running-with-pid',
          },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4400/api/sessions/supervisor/health?id=sess-live-1') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            status: 'healthy',
            lastCheck: 1712300003000,
            consecutiveFailures: 0,
            restartCount: 1,
          },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4400/api/sessions/supervisor/state') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            isAutoDriveActive: true,
            activeGoal: 'ship go session compat',
            lastObjective: 'wire dashboard mutations',
          },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4400/api/sessions/supervisor/create' && init?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            id: 'sess-created-1',
            name: 'Created from dashboard',
            cliType: 'hypercode',
            workingDirectory: 'C:/repo',
            requestedWorkingDirectory: 'C:/repo',
            command: 'hypercode',
            args: [],
            env: {},
            executionProfile: 'auto',
            executionPolicy: null,
            autoRestart: true,
            isolateWorktree: false,
            status: 'created',
            createdAt: 1712300010000,
            lastActivityAt: 1712300010000,
            restartCount: 0,
            maxRestartAttempts: 5,
            metadata: {},
            logs: [],
          },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4400/api/sessions/supervisor/start' && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { id: 'sess-live-1', status: 'running' } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4400/api/sessions/supervisor/stop' && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { id: 'sess-live-1', status: 'stopped' } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4400/api/sessions/supervisor/restart' && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { id: 'sess-live-1', status: 'restarting' } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4400/api/sessions/supervisor/execute-shell' && init?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            command: 'pwd',
            cwd: 'C:/repo',
            shellFamily: 'powershell',
            shellPath: 'C:/Program Files/PowerShell/7/pwsh.exe',
            stdout: 'C:/repo',
            stderr: '',
            output: 'C:/repo',
            exitCode: 0,
            durationMs: 12,
            succeeded: true,
          },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4400/api/sessions/supervisor/update-state' && init?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            success: true,
            toolAdvertisements: [],
            memoryBootstrap: null,
            state: {
              isAutoDriveActive: false,
              activeGoal: 'updated goal',
              lastObjective: 'updated objective',
            },
          },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4400/api/sessions/supervisor/clear' && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { success: true } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url.startsWith('http://127.0.0.1:4400/api/')) {
        return new Response(JSON.stringify({ success: false }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const readResponse = await POST(new Request(
      'http://localhost:3010/api/trpc/session.get,session.logs,session.attachInfo,session.health,session.getState?batch=1',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          0: { json: { id: 'sess-live-1' } },
          1: { json: { id: 'sess-live-1', limit: 5 } },
          2: { json: { id: 'sess-live-1' } },
          3: { json: { id: 'sess-live-1' } },
          4: { json: null },
        }),
      },
    ));
    const readPayload = await readResponse.json();

    expect(readResponse.status).toBe(200);
    expect(readResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
    expect(readPayload?.[0]?.result?.data).toEqual(expect.objectContaining({ id: 'sess-live-1', status: 'running' }));
    expect(readPayload?.[1]?.result?.data).toEqual([
      expect.objectContaining({ stream: 'system', message: 'Go fallback log line' }),
    ]);
    expect(readPayload?.[2]?.result?.data).toEqual(expect.objectContaining({ attachReadiness: 'ready', pid: 4242 }));
    expect(readPayload?.[3]?.result?.data).toEqual(expect.objectContaining({ status: 'healthy', restartCount: 1 }));
    expect(readPayload?.[4]?.result?.data).toEqual(expect.objectContaining({ isAutoDriveActive: true, activeGoal: 'ship go session compat' }));

    const createResponse = await POST(new Request('http://localhost:3010/api/trpc/session.create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { cliType: 'hypercode', workingDirectory: 'C:/repo', autoRestart: true } }),
    }));
    expect(createResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-session-supervisor-action');
    expect((await createResponse.json())?.result?.data).toEqual(expect.objectContaining({ id: 'sess-created-1', status: 'created' }));

    const startResponse = await POST(new Request('http://localhost:3010/api/trpc/session.start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { id: 'sess-live-1' } }),
    }));
    expect((await startResponse.json())?.result?.data).toEqual(expect.objectContaining({ id: 'sess-live-1', status: 'running' }));

    const stopResponse = await POST(new Request('http://localhost:3010/api/trpc/session.stop', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { id: 'sess-live-1', force: true } }),
    }));
    expect((await stopResponse.json())?.result?.data).toEqual(expect.objectContaining({ id: 'sess-live-1', status: 'stopped' }));

    const restartResponse = await POST(new Request('http://localhost:3010/api/trpc/session.restart', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { id: 'sess-live-1' } }),
    }));
    expect((await restartResponse.json())?.result?.data).toEqual(expect.objectContaining({ id: 'sess-live-1', status: 'restarting' }));

    const executeResponse = await POST(new Request('http://localhost:3010/api/trpc/session.executeShell', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { id: 'sess-live-1', command: 'pwd' } }),
    }));
    expect((await executeResponse.json())?.result?.data).toEqual(expect.objectContaining({ succeeded: true, output: 'C:/repo', shellFamily: 'powershell' }));

    const updateStateResponse = await POST(new Request('http://localhost:3010/api/trpc/session.updateState', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { activeGoal: 'updated goal', lastObjective: 'updated objective' } }),
    }));
    expect((await updateStateResponse.json())?.result?.data).toEqual(expect.objectContaining({ success: true, state: expect.objectContaining({ activeGoal: 'updated goal' }) }));

    const clearResponse = await POST(new Request('http://localhost:3010/api/trpc/session.clear', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: null }),
    }));
    expect((await clearResponse.json())?.result?.data).toEqual({ success: true });

    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4400/api/sessions/supervisor/get?id=sess-live-1')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4400/api/sessions/supervisor/logs?id=sess-live-1&limit=5')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4400/api/sessions/supervisor/attach-info?id=sess-live-1')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4400/api/sessions/supervisor/health?id=sess-live-1')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4400/api/sessions/supervisor/state')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4400/api/sessions/supervisor/create')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4400/api/sessions/supervisor/start')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4400/api/sessions/supervisor/stop')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4400/api/sessions/supervisor/restart')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4400/api/sessions/supervisor/execute-shell')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4400/api/sessions/supervisor/update-state')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4400/api/sessions/supervisor/clear')).toBe(true);
  });

  it('prefers go-native operator reads and mutations in local dashboard fallback mode', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4550/trpc';
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);

      if (url.includes('/trpc/')) {
        throw new Error('connect ECONNREFUSED');
      }

      if (url === 'http://127.0.0.1:4550/api/secrets') {
        return new Response(JSON.stringify({
          success: true,
          data: [
            { key: 'OPENAI_API_KEY', updated_at: '2026-04-05T16:00:00.000Z' },
          ],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4550/api/api-keys/create' && init?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            uuid: 'key-created-1',
            name: 'Dashboard Key',
            key: 'sk_local_created_123456',
            key_prefix: 'sk_local_',
            created_at: '2026-04-05T16:00:00.000Z',
            is_active: true,
          },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4550/api/api-keys/delete' && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { success: true } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4550/api/secrets/set' && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { success: true } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4550/api/secrets/delete' && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { success: true } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const secretsListResponse = await POST(new Request('http://localhost:3010/api/trpc/secrets.list', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: null }),
    }));
    expect(secretsListResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
    expect((await secretsListResponse.json())?.result?.data).toEqual([
      expect.objectContaining({ key: 'OPENAI_API_KEY' }),
    ]);

    const createApiKeyResponse = await POST(new Request('http://localhost:3010/api/trpc/apiKeys.create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { name: 'Dashboard Key', type: 'MCP' } }),
    }));
    expect(createApiKeyResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-operator-action');
    expect((await createApiKeyResponse.json())?.result?.data).toEqual(expect.objectContaining({
      uuid: 'key-created-1',
      key: 'sk_local_created_123456',
    }));

    const deleteApiKeyResponse = await POST(new Request('http://localhost:3010/api/trpc/apiKeys.delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { uuid: 'key-created-1' } }),
    }));
    expect((await deleteApiKeyResponse.json())?.result?.data).toEqual({ success: true });

    const setSecretResponse = await POST(new Request('http://localhost:3010/api/trpc/secrets.set', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { key: 'OPENAI_API_KEY', value: 'secret-value' } }),
    }));
    expect((await setSecretResponse.json())?.result?.data).toEqual({ success: true });

    const deleteSecretResponse = await POST(new Request('http://localhost:3010/api/trpc/secrets.delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { key: 'OPENAI_API_KEY' } }),
    }));
    expect((await deleteSecretResponse.json())?.result?.data).toEqual({ success: true });

    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4550/api/secrets')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4550/api/api-keys/create')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4550/api/api-keys/delete')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4550/api/secrets/set')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4550/api/secrets/delete')).toBe(true);
  });

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

  it('prefers go-native tool set reads and mutations in local dashboard fallback mode', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4580/trpc';
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);

      if (url.includes('/trpc/')) {
        throw new Error('connect ECONNREFUSED');
      }

      if (url === 'http://127.0.0.1:4580/api/tool-sets') {
        return new Response(JSON.stringify({
          success: true,
          data: [
            { uuid: 'toolset-1', name: 'Core Set', description: 'useful tools', tools: ['tool-1', 'tool-2'] },
          ],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4580/api/tool-sets/create' && init?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: { uuid: 'toolset-created-1', name: 'Core Set', description: 'useful tools', tools: ['tool-1', 'tool-2'] },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4580/api/tool-sets/delete' && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { success: true } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const listResponse = await POST(new Request('http://localhost:3010/api/trpc/toolSets.list', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: null }),
    }));
    expect(listResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
    expect((await listResponse.json())?.result?.data).toEqual([
      expect.objectContaining({ uuid: 'toolset-1', name: 'Core Set' }),
    ]);

    const createResponse = await POST(new Request('http://localhost:3010/api/trpc/toolSets.create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { name: 'Core Set', description: 'useful tools', tools: ['tool-1', 'tool-2'] } }),
    }));
    expect(createResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-operator-action');
    expect((await createResponse.json())?.result?.data).toEqual(expect.objectContaining({ uuid: 'toolset-created-1', name: 'Core Set' }));

    const deleteResponse = await POST(new Request('http://localhost:3010/api/trpc/toolSets.delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { uuid: 'toolset-created-1' } }),
    }));
    expect((await deleteResponse.json())?.result?.data).toEqual({ success: true });

    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4580/api/tool-sets')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4580/api/tool-sets/create')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4580/api/tool-sets/delete')).toBe(true);
  });

  it('prefers go-native policy reads and mutations in local dashboard fallback mode', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4570/trpc';
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);

      if (url.includes('/trpc/')) {
        throw new Error('connect ECONNREFUSED');
      }

      if (url === 'http://127.0.0.1:4570/api/policies') {
        return new Response(JSON.stringify({
          success: true,
          data: [
            {
              uuid: 'policy-1',
              name: 'Default',
              description: 'baseline policy',
              rules: { allow: ['tool.read'], deny: ['tool.delete'] },
            },
          ],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4570/api/policies/create' && init?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            uuid: 'policy-created-1',
            name: 'Read Only',
            description: 'new policy',
            rules: { allow: ['tool.read'], deny: ['tool.write'] },
          },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4570/api/policies/delete' && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { success: true } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const listResponse = await POST(new Request('http://localhost:3010/api/trpc/policies.list', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: null }),
    }));
    expect(listResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
    expect((await listResponse.json())?.result?.data).toEqual([
      expect.objectContaining({ uuid: 'policy-1', name: 'Default' }),
    ]);

    const createResponse = await POST(new Request('http://localhost:3010/api/trpc/policies.create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { name: 'Read Only', description: 'new policy', rules: { allow: ['tool.read'], deny: ['tool.write'] } } }),
    }));
    expect(createResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-operator-action');
    expect((await createResponse.json())?.result?.data).toEqual(expect.objectContaining({ uuid: 'policy-created-1', name: 'Read Only' }));

    const deleteResponse = await POST(new Request('http://localhost:3010/api/trpc/policies.delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { uuid: 'policy-created-1' } }),
    }));
    expect((await deleteResponse.json())?.result?.data).toEqual({ success: true });

    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4570/api/policies')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4570/api/policies/create')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4570/api/policies/delete')).toBe(true);
  });

  it('prefers go-native tool always-on mutations in local dashboard fallback mode', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4560/trpc';
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);

      if (url.includes('/trpc/')) {
        throw new Error('connect ECONNREFUSED');
      }

      if (url === 'http://127.0.0.1:4560/api/tools/always-on' && init?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            success: true,
            tool: {
              uuid: 'tool-1',
              name: 'search_tools',
              always_on: true,
            },
          },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const response = await POST(new Request('http://localhost:3010/api/trpc/tools.setAlwaysOn', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { uuid: 'tool-1', alwaysOn: true } }),
    }));
    expect(response.headers.get('x-hypercode-trpc-compat')).toBe('local-tool-action');
    expect((await response.json())?.result?.data).toEqual(expect.objectContaining({
      success: true,
      tool: expect.objectContaining({ uuid: 'tool-1', always_on: true }),
    }));

    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4560/api/tools/always-on')).toBe(true);
  });

  it('prefers go-native MCP runtime mutations in local dashboard fallback mode', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4500/trpc';
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);

      if (url.includes('/trpc/')) {
        throw new Error('connect ECONNREFUSED');
      }

      if (url === 'http://127.0.0.1:4500/api/mcp/preferences' && init?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            importantTools: ['search_tools', 'list_all_tools'],
            alwaysLoadedTools: ['search_tools'],
          },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4500/api/mcp/working-set/load' && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { ok: true, message: 'loaded' } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4500/api/mcp/working-set/unload' && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { ok: true, message: 'unloaded' } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4500/api/mcp/tool-selection-telemetry/clear' && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { ok: true } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4500/api/mcp/working-set/evictions/clear' && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { ok: true, message: 'cleared' } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url === 'http://127.0.0.1:4500/api/mcp/lifecycle-modes' && init?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            ok: true,
            lifecycle: {
              lazySessionMode: true,
              singleActiveServerMode: false,
            },
          },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const setPreferencesResponse = await POST(new Request('http://localhost:3010/api/trpc/mcp.setToolPreferences', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { importantTools: ['search_tools', 'list_all_tools'] } }),
    }));
    expect(setPreferencesResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-mcp-runtime-action');
    expect((await setPreferencesResponse.json())?.result?.data).toEqual(expect.objectContaining({
      importantTools: ['search_tools', 'list_all_tools'],
    }));

    const loadResponse = await POST(new Request('http://localhost:3010/api/trpc/mcp.loadTool', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { name: 'search_tools' } }),
    }));
    expect((await loadResponse.json())?.result?.data).toEqual({ ok: true, message: 'loaded' });

    const unloadResponse = await POST(new Request('http://localhost:3010/api/trpc/mcp.unloadTool', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { name: 'search_tools' } }),
    }));
    expect((await unloadResponse.json())?.result?.data).toEqual({ ok: true, message: 'unloaded' });

    const clearTelemetryResponse = await POST(new Request('http://localhost:3010/api/trpc/mcp.clearToolSelectionTelemetry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: null }),
    }));
    expect((await clearTelemetryResponse.json())?.result?.data).toEqual({ ok: true });

    const clearEvictionsResponse = await POST(new Request('http://localhost:3010/api/trpc/mcp.clearWorkingSetEvictionHistory', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: null }),
    }));
    expect((await clearEvictionsResponse.json())?.result?.data).toEqual({ ok: true, message: 'cleared' });

    const setLifecycleResponse = await POST(new Request('http://localhost:3010/api/trpc/mcp.setLifecycleModes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { lazySessionMode: true, singleActiveServerMode: false } }),
    }));
    expect((await setLifecycleResponse.json())?.result?.data).toEqual(expect.objectContaining({
      ok: true,
      lifecycle: {
        lazySessionMode: true,
        singleActiveServerMode: false,
      },
    }));

    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4500/api/mcp/preferences')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4500/api/mcp/working-set/load')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4500/api/mcp/working-set/unload')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4500/api/mcp/tool-selection-telemetry/clear')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4500/api/mcp/working-set/evictions/clear')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4500/api/mcp/lifecycle-modes')).toBe(true);
  });

  it('normalizes batched bulk import payloads before proxying them upstream', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:3100/trpc';
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
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:3100/trpc';
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
        env: { ROOT_PATH: 'C:/Users/hyper/workspace/hypercode' },
        metadataStrategy: 'auto',
      },
      {
        name: 'github_http',
        type: 'STREAMABLE_HTTP',
        url: 'https://api.githubcopilot.com/mcp/',
        bearerToken: 'ghp_mock_token',
        headers: { 'x-org': 'hypercode-dev', 'x-env': 'test' },
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
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:59999/trpc';
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
        headers: { 'x-org': 'hypercode-dev' },
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
    expect(importResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-mcp-config-bulk-import');
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
      headers: { 'x-org': 'hypercode-dev' },
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
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:59999/trpc';
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
      expect(listResponse.headers.get('x-hypercode-trpc-compat')).toBe('legacy-mcp-dashboard-bridge');
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
      expect(getResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
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
      expect(getViaQueryResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
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
      expect(reloadResponse.headers.get('x-hypercode-trpc-compat')).toBe('local-mcp-managed-action');
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
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:59999/trpc';
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
    expect(response.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
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
      process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:4100/trpc';

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
      expect(response.headers.get('x-hypercode-trpc-compat')).toBe('legacy-mcp-bulk-import-bridge');
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
  });
