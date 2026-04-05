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

  it('returns local dashboard fallback data for richer MCP pages when upstreams are unavailable', async () => {
    process.env.HYPERCODE_TRPC_UPSTREAM = 'http://127.0.0.1:59999/trpc';
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
    expect(response.headers.get('x-hypercode-trpc-compat')).toBe('local-dashboard-fallback');
    expect(Array.isArray(payload)).toBe(true);
    expect(payload).toHaveLength(5);

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

  it('prefers go-native execution environment, provider quotas, fallback chain, cli harnesses, session catalog, and sessions in local dashboard fallback mode', async () => {
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
      if (url === 'http://127.0.0.1:4200/api/mcp/status' || url === 'http://127.0.0.1:4200/api/startup/status' || url === 'http://127.0.0.1:4200/api/runtime/status') {
        return new Response(JSON.stringify({ success: false }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const response = await POST(new Request(
      'http://localhost:3010/api/trpc/startupStatus,billing.getProviderQuotas,billing.getFallbackChain,tools.detectCliHarnesses,tools.detectExecutionEnvironment,session.catalog,session.list?batch=1',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 0: { json: null }, 1: { json: null }, 2: { json: null }, 3: { json: null }, 4: { json: null }, 5: { json: null }, 6: { json: null } }),
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
    expect(payload?.[4]?.result?.data).toEqual(expect.objectContaining({
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
    expect(payload?.[5]?.result?.data).toEqual([
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
    expect(payload?.[6]?.result?.data).toEqual([
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
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4200/api/billing/fallback-chain')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4200/api/cli/harnesses')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4200/api/tools/detect-execution-environment')).toBe(true);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url) === 'http://127.0.0.1:4200/api/sessions')).toBe(true);
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
