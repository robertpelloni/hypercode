import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { POST } from '../../src/app/api/trpc/[trpc]/route';
import { DashboardHomeView } from '../../src/app/dashboard/dashboard-home-view';

// Stub client-only tRPC-hook components so renderToStaticMarkup works in Node tests
vi.mock('../../src/components/SuggestionsPanel', () => ({ default: () => null }));
vi.mock('../../src/components/SessionHandoffWidget', () => ({ SessionHandoffWidget: () => null }));
vi.mock('../../src/components/ContextHealthWidget', () => ({ ContextHealthWidget: () => null }));

describe('dashboard MCP flow integration', () => {
  const originalFetch = global.fetch;
  const originalUpstream = process.env.BORG_TRPC_UPSTREAM;

  afterEach(() => {
    global.fetch = originalFetch;

    if (originalUpstream === undefined) {
      delete process.env.BORG_TRPC_UPSTREAM;
    } else {
      process.env.BORG_TRPC_UPSTREAM = originalUpstream;
    }
  });

  it('bridges modern MCP dashboard procedure batches when the upstream is unavailable', async () => {
    process.env.BORG_TRPC_UPSTREAM = 'http://127.0.0.1:59999/trpc';
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
    expect(payload).toHaveLength(3);
    expect(payload[0]).toEqual({ result: { data: expect.any(Array) } });
    expect(payload[1]).toEqual({ result: { data: expect.any(Array) } });
    expect(payload[2]).toEqual({
      result: {
        data: {
          initialized: true,
          serverCount: expect.any(Number),
          toolCount: 0,
          connectedCount: 0,
        },
      },
    });
    expect(payload[2].result.data.serverCount).toBe(payload[0].result.data.length);
    expect(payload[2].result.data.serverCount).toBeGreaterThanOrEqual(0);
  });

  it('renders MCP server health and recent traffic in the dashboard home surface', () => {
    const html = renderToStaticMarkup(
      createElement(DashboardHomeView, {
        generatedAtLabel: '12:00:00 PM',
        mcpStatus: { initialized: true, serverCount: 2, toolCount: 12, connectedCount: 1 },
        startupStatus: {
          status: 'running',
          ready: true,
          uptime: 60,
          checks: {
            mcpAggregator: {
              ready: true,
              liveReady: true,
              residentReady: true,
              serverCount: 2,
              connectedCount: 1,
              residentConnectedCount: 0,
              initialization: {
                inProgress: false,
                initialized: true,
                connectedClientCount: 1,
                configuredServerCount: 2,
              },
              persistedServerCount: 2,
              persistedToolCount: 12,
              configuredServerCount: 2,
              inventoryReady: true,
              inventorySource: 'database',
            },
            configSync: {
              ready: true,
              status: {
                inProgress: false,
                lastCompletedAt: 1_700_000_000_000,
                lastServerCount: 2,
                lastToolCount: 12,
              },
            },
            memory: {
              ready: true,
              initialized: true,
              agentMemory: true,
            },
            browser: {
              ready: true,
              active: false,
              pageCount: 0,
            },
            sessionSupervisor: {
              ready: true,
              sessionCount: 0,
              restore: {
                restoredSessionCount: 0,
                autoResumeCount: 0,
              },
            },
            extensionBridge: {
              ready: true,
              acceptingConnections: true,
              clientCount: 1,
              hasConnectedClients: true,
            },
            executionEnvironment: {
              ready: true,
              preferredShellId: 'pwsh',
              preferredShellLabel: 'PowerShell 7',
              shellCount: 1,
              verifiedShellCount: 1,
              toolCount: 2,
              verifiedToolCount: 2,
              harnessCount: 0,
              verifiedHarnessCount: 0,
              supportsPowerShell: true,
              supportsPosixShell: false,
              notes: [],
            },
          },
        },
        servers: [
          {
            name: 'github',
            status: 'connected',
            toolCount: 9,
            config: { command: 'node', args: ['github.js'], env: ['GITHUB_TOKEN'] },
          },
          {
            name: 'filesystem',
            status: 'error',
            toolCount: 3,
            config: { command: 'node', args: ['filesystem.js'], env: [] },
          },
        ],
        traffic: [
          {
            server: 'github',
            method: 'tools/call',
            toolName: 'create_issue',
            paramsSummary: 'title=Bug',
            latencyMs: 18,
            success: true,
            timestamp: 1_700_000_000_000,
          },
        ],
        providers: [],
        fallbackChain: [],
        sessions: [],
      }),
    );

    expect(html).toContain('MCP Router');
    expect(html).toContain('Server health and traffic');
    expect(html).toContain('github');
    expect(html).toContain('filesystem');
    expect(html).toContain('create_issue');
    expect(html).toContain('Connected servers');
  });
});