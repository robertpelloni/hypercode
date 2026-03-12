import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const invalidate = vi.fn(async () => undefined);

vi.mock('@/utils/trpc', () => {
  const createUseQuery = <T,>(data: T) => () => ({ data });
  const createUseMutation = () => () => ({ mutate: vi.fn() });

  return {
    trpc: {
      useUtils: () => ({
        startupStatus: { invalidate },
        mcp: {
          getStatus: { invalidate },
          listServers: { invalidate },
          traffic: { invalidate },
        },
        billing: {
          getProviderQuotas: { invalidate },
          getFallbackChain: { invalidate },
        },
        session: {
          list: { invalidate },
        },
      }),
      mcp: {
        getStatus: {
          useQuery: createUseQuery({ initialized: true, serverCount: 2, toolCount: 9, connectedCount: 1 }),
        },
        listServers: {
          useQuery: createUseQuery([
            {
              name: 'github',
              status: 'connected',
              toolCount: 9,
              config: { command: 'node', args: ['github.js'], env: ['GITHUB_TOKEN'] },
            },
          ]),
        },
        traffic: {
          useQuery: createUseQuery([
            {
              server: 'github',
              method: 'tools/call',
              toolName: 'create_issue',
              paramsSummary: 'title=Bug',
              latencyMs: 21,
              success: true,
              timestamp: 1_700_000_000_000,
            },
          ]),
        },
      },
      startupStatus: {
        useQuery: createUseQuery({
          status: 'running',
          ready: true,
          uptime: 123,
          checks: {
            mcpAggregator: {
              ready: true,
              serverCount: 2,
              initialization: {
                inProgress: false,
                initialized: true,
                connectedClientCount: 1,
                configuredServerCount: 2,
              },
              persistedServerCount: 2,
              persistedToolCount: 9,
              configuredServerCount: 2,
              inventoryReady: true,
            },
            configSync: {
              ready: true,
              status: {
                inProgress: false,
                lastServerCount: 2,
                lastToolCount: 9,
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
              sessionCount: 1,
              restore: {
                restoredSessionCount: 1,
                autoResumeCount: 0,
              },
            },
            extensionBridge: {
              ready: true,
              acceptingConnections: true,
              clientCount: 1,
              hasConnectedClients: true,
            },
          },
        }),
      },
      billing: {
        getProviderQuotas: {
          useQuery: createUseQuery([
            {
              provider: 'anthropic',
              name: 'Anthropic',
              configured: true,
              authenticated: true,
              authMethod: 'api_key',
              tier: 'pro',
              limit: 1000,
              used: 200,
              remaining: 800,
              availability: 'healthy',
            },
          ]),
        },
        getFallbackChain: {
          useQuery: createUseQuery({
            chain: [
              {
                priority: 1,
                provider: 'anthropic',
                model: 'claude-3-7-sonnet',
                reason: 'configured',
              },
            ],
          }),
        },
      },
      session: {
        list: {
          useQuery: createUseQuery([
            {
              id: 'session-healthy',
              name: 'Healthy workspace',
              cliType: 'aider',
              workingDirectory: 'c:/repo',
              autoRestart: true,
              status: 'running',
              restartCount: 1,
              maxRestartAttempts: 5,
              lastActivityAt: 1_700_000_030_000,
              logs: [
                { timestamp: 1_700_000_030_000, stream: 'stdout', message: 'Ready for instructions' },
              ],
            },
            {
              id: 'session-error',
              name: 'Crashed workspace',
              cliType: 'claude-code',
              workingDirectory: 'c:/repo-crashed',
              autoRestart: false,
              status: 'error',
              restartCount: 5,
              maxRestartAttempts: 5,
              lastActivityAt: 1_700_000_000_000,
              lastError: 'Process exited with code 137',
              logs: [
                { timestamp: 1_700_000_000_000, stream: 'stderr', message: 'Process exited with code 137' },
              ],
            },
          ]),
        },
        start: { useMutation: createUseMutation() },
        stop: { useMutation: createUseMutation() },
        restart: { useMutation: createUseMutation() },
      },
    },
  };
});

import { DashboardHomeClient, sortSessions } from './DashboardHomeClient';

describe('DashboardHomeClient', () => {
  it('sorts sessions so operators see attention-needed work first', () => {
    expect(
      sortSessions([
        {
          id: 'running',
          name: 'Healthy workspace',
          cliType: 'aider',
          workingDirectory: 'c:/repo',
          status: 'running',
          restartCount: 0,
          maxRestartAttempts: 5,
          lastActivityAt: 30,
          logs: [],
        },
        {
          id: 'error',
          name: 'Crashed workspace',
          cliType: 'claude-code',
          workingDirectory: 'c:/repo-crashed',
          status: 'error',
          restartCount: 3,
          maxRestartAttempts: 5,
          lastActivityAt: 10,
          logs: [],
        },
        {
          id: 'restarting',
          name: 'Queued restart workspace',
          cliType: 'opencode',
          workingDirectory: 'c:/repo-restarting',
          status: 'restarting',
          restartCount: 1,
          maxRestartAttempts: 5,
          lastActivityAt: 20,
          logs: [],
        },
      ]).map((session) => session.id),
    ).toEqual(['error', 'restarting', 'running']);
  });

  it('renders live dashboard panels from tRPC hook data', () => {
    const html = renderToStaticMarkup(<DashboardHomeClient />);

    expect(html).toContain('Operator dashboard');
    expect(html).toContain('Router posture');
    expect(html).toContain('Server health and traffic');
    expect(html).toContain('Supervised CLI runtime');
    expect(html).toContain('Quota and fallback posture');
    expect(html).toContain('Startup readiness');
    expect(html).toContain('Config sync');
    expect(html).toContain('Healthy workspace');
    expect(html).toContain('Manual restart only');
    expect(html).toContain('Anthropic');
    expect(html).toContain('create_issue');
    expect(html.indexOf('Crashed workspace')).toBeLessThan(html.indexOf('Healthy workspace'));
  });
});