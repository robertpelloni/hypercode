import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  buildDashboardAlerts,
  buildStartupChecklist,
  DashboardHomeView,
  buildOverviewMetrics,
  formatRelativeTimestamp,
  formatRestartCountdown,
  getQuotaUsagePercent,
  summarizeTrafficEvent,
  type DashboardProviderSummary,
  type DashboardSessionSummary,
  type DashboardStatusSummary,
  type DashboardStartupStatus,
} from './dashboard-home-view';

describe('dashboard home helpers', () => {
  it('builds overview metrics from live dashboard summaries', () => {
    const mcpStatus: DashboardStatusSummary = {
      initialized: true,
      serverCount: 3,
      toolCount: 18,
      connectedCount: 2,
    };

    const sessions: DashboardSessionSummary[] = [
      {
        id: 'session-1',
        name: 'Aider workspace',
        cliType: 'aider',
        workingDirectory: 'c:/repo',
        status: 'running',
        restartCount: 1,
        maxRestartAttempts: 5,
        lastActivityAt: 1_700_000_000_000,
        logs: [],
      },
      {
        id: 'session-2',
        name: 'Claude Code workspace',
        cliType: 'claude-code',
        workingDirectory: 'c:/repo-2',
        status: 'stopped',
        restartCount: 0,
        maxRestartAttempts: 5,
        lastActivityAt: 1_700_000_000_000,
        logs: [],
      },
    ];

    const providers: DashboardProviderSummary[] = [
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
        availability: 'healthy',
      },
      {
        provider: 'google',
        name: 'Google Gemini',
        configured: true,
        authenticated: false,
        authMethod: 'api_key',
        tier: 'free',
        limit: 100,
        used: 100,
        remaining: 0,
        availability: 'degraded',
        lastError: 'quota exhausted',
      },
    ];

    expect(buildOverviewMetrics(mcpStatus, sessions, providers)).toEqual([
      {
        label: 'MCP servers',
        value: '2/3',
        detail: '18 tools indexed across the router',
      },
      {
        label: 'Supervised sessions',
        value: '1/2',
        detail: 'running right now',
      },
      {
        label: 'Configured providers',
        value: '2',
        detail: '1 need attention',
      },
    ]);
  });

  it('formats traffic summaries and quota usage safely', () => {
    expect(summarizeTrafficEvent({
      server: 'github',
      method: 'tools/call',
      toolName: 'create_issue',
      paramsSummary: 'title=Bug',
      latencyMs: 42,
      success: true,
      timestamp: 1_700_000_000_000,
    })).toContain('tools/call · create_issue — title=Bug');

    expect(getQuotaUsagePercent({
      provider: 'anthropic',
      name: 'Anthropic',
      configured: true,
      authenticated: true,
      tier: 'pro',
      limit: 400,
      used: 100,
      remaining: 300,
    })).toBe(25);

    expect(getQuotaUsagePercent({
      provider: 'local',
      name: 'Local',
      configured: true,
      authenticated: true,
      tier: 'local',
      limit: null,
      used: 0,
      remaining: null,
    })).toBeNull();

    expect(formatRelativeTimestamp(1_700_000_000_000, null)).toBe('just now');
    expect(formatRelativeTimestamp(1_700_000_000_000, 1_700_000_060_000)).toBe('1m ago');
    expect(formatRestartCountdown(1_700_000_075_000, 1_700_000_060_000)).toBe('in 15s');
  });

  it('treats normalized provider availability states as degraded even without a last error message', () => {
    const mcpStatus: DashboardStatusSummary = {
      initialized: true,
      serverCount: 1,
      toolCount: 6,
      connectedCount: 1,
    };

    const providers: DashboardProviderSummary[] = [
      {
        provider: 'openai',
        name: 'OpenAI',
        configured: true,
        authenticated: true,
        authMethod: 'api_key',
        tier: 'pro',
        limit: 1000,
        used: 100,
        remaining: 900,
        availability: 'rate_limited',
      },
    ];

    expect(buildOverviewMetrics(mcpStatus, [], providers)).toContainEqual({
      label: 'Configured providers',
      value: '1',
      detail: '1 need attention',
    });

    const alerts = buildDashboardAlerts(
      mcpStatus,
      {
        status: 'running',
        ready: true,
        uptime: 42,
        checks: {
          mcpAggregator: {
            ready: true,
            serverCount: 1,
            initialization: {
              inProgress: false,
              initialized: true,
              connectedClientCount: 1,
              configuredServerCount: 1,
            },
            persistedServerCount: 1,
            persistedToolCount: 6,
            inventoryReady: true,
          },
          configSync: {
            ready: true,
            status: {
              inProgress: false,
              lastServerCount: 1,
              lastToolCount: 6,
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
            clientCount: 0,
          },
        },
      },
      [],
      providers,
      [],
    );

    expect(alerts).toContainEqual(expect.objectContaining({
      id: 'provider-degraded',
      severity: 'warning',
      title: 'Provider routing has degraded capacity',
    }));
  });

  it('builds startup checklist details from core boot state', () => {
    const startupStatus: DashboardStartupStatus = {
      status: 'running',
      ready: false,
      uptime: 42,
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
          persistedToolCount: 14,
          configuredServerCount: 2,
          inventoryReady: true,
        },
        configSync: {
          ready: true,
          status: {
            inProgress: false,
            lastCompletedAt: 1_700_000_000_000,
            lastServerCount: 2,
            lastToolCount: 14,
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
          ready: false,
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
    };

    expect(buildStartupChecklist(startupStatus)).toEqual([
      {
        label: 'Config sync',
        ready: true,
        detail: '2 servers, 14 tools cached',
      },
      {
        label: 'Router inventory',
        ready: true,
        detail: '2 persisted servers · 14 persisted tools',
      },
      {
        label: 'Session restore',
        ready: false,
        detail: '1 restored · 0 auto-resumed',
      },
      {
        label: 'Client bridge',
        ready: true,
        detail: '1 connected bridge client · browser/editor bridge listener ready for new clients',
      },
    ]);
  });

  it('shows ready startup bridge status even before any clients attach', () => {
    const startupStatus: DashboardStartupStatus = {
      status: 'running',
      ready: true,
      uptime: 42,
      checks: {
        mcpAggregator: {
          ready: true,
          serverCount: 0,
          initialization: {
            inProgress: false,
            initialized: true,
            connectedClientCount: 0,
            configuredServerCount: 0,
          },
          persistedServerCount: 0,
          persistedToolCount: 0,
          configuredServerCount: 0,
          inventoryReady: true,
        },
        configSync: {
          ready: true,
          status: {
            inProgress: false,
            lastCompletedAt: 1_700_000_000_000,
            lastServerCount: 0,
            lastToolCount: 0,
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
          clientCount: 0,
          hasConnectedClients: false,
        },
      },
    };

    expect(buildStartupChecklist(startupStatus)).toEqual([
      {
        label: 'Config sync',
        ready: true,
        detail: '0 servers, 0 tools cached',
      },
      {
        label: 'Router inventory',
        ready: true,
        detail: 'No configured servers yet · empty inventory is ready',
      },
      {
        label: 'Session restore',
        ready: true,
        detail: '0 restored · 0 auto-resumed',
      },
      {
        label: 'Client bridge',
        ready: true,
        detail: '0 connected bridge clients · browser/editor bridge listener ready for new clients',
      },
    ]);
  });

  it('surfaces cross-panel operator alerts in priority order', () => {
    const mcpStatus: DashboardStatusSummary = {
      initialized: true,
      serverCount: 2,
      toolCount: 14,
      connectedCount: 0,
    };

    const startupStatus: DashboardStartupStatus = {
      status: 'starting',
      ready: false,
      uptime: 42,
      checks: {
        mcpAggregator: {
          ready: false,
          serverCount: 2,
          initialization: {
            inProgress: true,
            initialized: false,
            connectedClientCount: 0,
            configuredServerCount: 2,
          },
          persistedServerCount: 2,
          persistedToolCount: 14,
          inventoryReady: false,
        },
        configSync: {
          ready: false,
          status: {
            inProgress: true,
            lastServerCount: 2,
            lastToolCount: 14,
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
          clientCount: 1,
        },
      },
    };

    const alerts = buildDashboardAlerts(
      mcpStatus,
      startupStatus,
      [
        {
          name: 'github',
          status: 'error',
          toolCount: 8,
          config: { command: 'node', args: ['github.js'], env: ['GITHUB_TOKEN'] },
        },
      ],
      [
        {
          provider: 'anthropic',
          name: 'Anthropic',
          configured: true,
          authenticated: false,
          authMethod: 'api_key',
          tier: 'pro',
          limit: 1000,
          used: 950,
          remaining: 50,
          availability: 'degraded',
          lastError: 'quota exhausted',
        },
      ],
      [
        {
          id: 'session-1',
          name: 'Aider workspace',
          cliType: 'aider',
          workingDirectory: 'c:/repo',
          status: 'error',
          restartCount: 3,
          maxRestartAttempts: 5,
          lastActivityAt: 1_700_000_000_000,
          lastError: 'session crashed',
          logs: [],
        },
      ],
    );

    expect(alerts.map((alert) => alert.title)).toEqual([
      'All configured MCP servers are disconnected',
      'Supervised sessions have failed',
      'Startup sequence is still warming up',
      'Provider routing has degraded capacity',
    ]);
  });
});

describe('DashboardHomeView', () => {
  it('renders all four v1 panels with live-style content', () => {
    const html = renderToStaticMarkup(
      <DashboardHomeView
        generatedAtLabel="12:00:00 PM"
        currentTimestamp={1_700_000_060_000}
        mcpStatus={{ initialized: true, serverCount: 2, toolCount: 14, connectedCount: 1 }}
        startupStatus={{
          status: 'running',
          ready: true,
          uptime: 120,
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
              persistedToolCount: 14,
              inventoryReady: true,
            },
            configSync: {
              ready: true,
              status: {
                inProgress: false,
                lastCompletedAt: 1_700_000_000_000,
                lastServerCount: 2,
                lastToolCount: 14,
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
              clientCount: 1,
            },
          },
        }}
        servers={[
          {
            name: 'github',
            status: 'connected',
            toolCount: 8,
            config: { command: 'node', args: ['github.js'], env: ['GITHUB_TOKEN'] },
          },
        ]}
        traffic={[
          {
            server: 'github',
            method: 'tools/call',
            toolName: 'create_issue',
            paramsSummary: 'title=Bug',
            latencyMs: 15,
            success: true,
            timestamp: 1_700_000_000_000,
          },
        ]}
        providers={[
          {
            provider: 'anthropic',
            name: 'Anthropic',
            configured: true,
            authenticated: true,
            authMethod: 'api_key',
            tier: 'pro',
            limit: 1000,
            used: 400,
            remaining: 600,
            availability: 'healthy',
          },
        ]}
        fallbackChain={[
          {
            priority: 1,
            provider: 'anthropic',
            model: 'claude-3-7-sonnet',
            reason: 'configured',
          },
        ]}
        sessions={[
          {
            id: 'session-1',
            name: 'Aider workspace',
            cliType: 'aider',
            workingDirectory: 'c:/repo',
            autoRestart: false,
            status: 'restarting',
            restartCount: 1,
            maxRestartAttempts: 5,
            scheduledRestartAt: 1_700_000_075_000,
            lastActivityAt: 1_700_000_000_000,
            logs: [
              { timestamp: 1_700_000_000_000, stream: 'stdout', message: 'Ready for instructions' },
            ],
          },
        ]}
      />,
    );

    expect(html).toContain('Overview');
    expect(html).toContain('MCP Router');
    expect(html).toContain('Sessions');
    expect(html).toContain('Providers');
    expect(html).toContain('Server health and traffic');
    expect(html).toContain('Startup readiness');
    expect(html).toContain('Router inventory');
    expect(html).toContain('Supervised CLI runtime');
    expect(html).toContain('Quota and fallback posture');
    expect(html).toContain('Detailed MCP view');
    expect(html).toContain('Detailed provider view');
    expect(html).toContain('Open inspector');
    expect(html).toContain('create_issue');
    expect(html).toContain('Ready for instructions');
    expect(html).toContain('Manual restart only');
    expect(html).toContain('Restart queued in 15s');
    expect(html).toContain('Operator alerts');
    expect(html).toContain('All clear');
    expect(html).toContain('All major systems look healthy');
  });

  it('renders active alerts when the router, providers, or sessions degrade', () => {
    const html = renderToStaticMarkup(
      <DashboardHomeView
        generatedAtLabel="12:00:00 PM"
        currentTimestamp={1_700_000_060_000}
        mcpStatus={{ initialized: false, serverCount: 2, toolCount: 14, connectedCount: 0 }}
        startupStatus={{
          status: 'starting',
          ready: false,
          uptime: 120,
          checks: {
            mcpAggregator: {
              ready: false,
              serverCount: 2,
              initialization: {
                inProgress: true,
                initialized: false,
                connectedClientCount: 0,
                configuredServerCount: 2,
              },
              persistedServerCount: 2,
              persistedToolCount: 14,
              inventoryReady: false,
            },
            configSync: {
              ready: false,
              status: {
                inProgress: true,
                lastServerCount: 2,
                lastToolCount: 14,
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
              ready: false,
              sessionCount: 1,
              restore: {
                restoredSessionCount: 1,
                autoResumeCount: 0,
              },
            },
            extensionBridge: {
              ready: true,
              clientCount: 1,
            },
          },
        }}
        servers={[
          {
            name: 'github',
            status: 'error',
            toolCount: 8,
            config: { command: 'node', args: ['github.js'], env: ['GITHUB_TOKEN'] },
          },
        ]}
        traffic={[]}
        providers={[
          {
            provider: 'anthropic',
            name: 'Anthropic',
            configured: true,
            authenticated: false,
            authMethod: 'api_key',
            tier: 'pro',
            limit: 1000,
            used: 400,
            remaining: 600,
            availability: 'degraded',
            lastError: 'quota exhausted',
          },
        ]}
        fallbackChain={[]}
        sessions={[
          {
            id: 'session-1',
            name: 'Aider workspace',
            cliType: 'aider',
            workingDirectory: 'c:/repo',
            status: 'error',
            restartCount: 1,
            maxRestartAttempts: 5,
            lastActivityAt: 1_700_000_000_000,
            lastError: 'session crashed',
            logs: [],
          },
        ]}
      />,
    );

    expect(html).toContain('Operator alerts');
    expect(html).toContain('4 active');
    expect(html).toContain('MCP router is not initialized');
    expect(html).toContain('Provider routing has degraded capacity');
    expect(html).toContain('Supervised sessions have failed');
    expect(html).toContain('Inspect MCP router');
  });

  it('renders provider availability badges as degraded for normalized throttling states', () => {
    const html = renderToStaticMarkup(
      <DashboardHomeView
        generatedAtLabel="12:00:00 PM"
        currentTimestamp={1_700_000_060_000}
        mcpStatus={{ initialized: true, serverCount: 1, toolCount: 4, connectedCount: 1 }}
        startupStatus={{
          status: 'running',
          ready: true,
          uptime: 120,
          checks: {
            mcpAggregator: {
              ready: true,
              serverCount: 1,
              initialization: {
                inProgress: false,
                initialized: true,
                connectedClientCount: 1,
                configuredServerCount: 1,
              },
              persistedServerCount: 1,
              persistedToolCount: 4,
              inventoryReady: true,
            },
            configSync: {
              ready: true,
              status: {
                inProgress: false,
                lastServerCount: 1,
                lastToolCount: 4,
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
              clientCount: 1,
            },
          },
        }}
        servers={[]}
        traffic={[]}
        providers={[
          {
            provider: 'openai',
            name: 'OpenAI',
            configured: true,
            authenticated: true,
            authMethod: 'api_key',
            tier: 'pro',
            limit: 1000,
            used: 350,
            remaining: 650,
            availability: 'quota_exhausted',
          },
        ]}
        fallbackChain={[]}
        sessions={[]}
      />,
    );

    expect(html).toContain('Quota exhausted');
    expect(html).toContain('Provider routing has degraded capacity');
  });
});