import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

type CapturedProps = Record<string, unknown> | null;

let capturedProps: CapturedProps = null;
let providerQuotasData: unknown[] = [];
let fallbackChainData: { chain: unknown[] } = { chain: [] };

vi.mock('../../src/utils/trpc', () => {
  const createUseQuery = <T,>(getData: () => T) => () => ({ data: getData() });

  return {
    trpc: {
      useUtils: () => ({
        startupStatus: { invalidate: vi.fn(async () => undefined) },
        mcp: {
          getStatus: { invalidate: vi.fn(async () => undefined) },
          listServers: { invalidate: vi.fn(async () => undefined) },
          traffic: { invalidate: vi.fn(async () => undefined) },
        },
        billing: {
          getProviderQuotas: { invalidate: vi.fn(async () => undefined) },
          getFallbackChain: { invalidate: vi.fn(async () => undefined) },
        },
        session: {
          list: { invalidate: vi.fn(async () => undefined) },
        },
      }),
      mcp: {
        getStatus: {
          useQuery: createUseQuery(() => ({ initialized: true, serverCount: 1, toolCount: 6, connectedCount: 1 })),
        },
        listServers: { useQuery: createUseQuery(() => []) },
        traffic: { useQuery: createUseQuery(() => []) },
      },
      startupStatus: {
        useQuery: createUseQuery(() => ({
          status: 'running',
          ready: true,
          uptime: 123,
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
        })),
      },
      billing: {
        getProviderQuotas: {
          useQuery: createUseQuery(() => providerQuotasData),
        },
        getFallbackChain: {
          useQuery: createUseQuery(() => fallbackChainData),
        },
      },
      session: {
        list: { useQuery: createUseQuery(() => []) },
        start: { useMutation: () => ({ mutate: vi.fn() }) },
        stop: { useMutation: () => ({ mutate: vi.fn() }) },
        restart: { useMutation: () => ({ mutate: vi.fn() }) },
      },
    },
  };
});

vi.mock('../../src/app/dashboard/dashboard-home-view', () => ({
  DashboardHomeView: (props: Record<string, unknown>) => {
    capturedProps = props;
    return null;
  },
}));

import { DashboardHomeClient } from '../../src/app/dashboard/DashboardHomeClient';

describe('dashboard provider fallback integration', () => {
  afterEach(() => {
    capturedProps = null;
    providerQuotasData = [];
    fallbackChainData = { chain: [] };
  });

  it('passes live provider quota state and fallback ordering into the dashboard home view', async () => {
    providerQuotasData = [
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
    fallbackChainData = {
      chain: [
        { priority: 1, provider: 'anthropic', model: 'claude-3-7-sonnet', reason: 'primary coding model' },
        { priority: 2, provider: 'google', model: 'gemini-2.5-pro', reason: 'quota fallback' },
      ],
    };

    renderToStaticMarkup(createElement(DashboardHomeClient));

    expect(capturedProps).not.toBeNull();
    expect(capturedProps?.providers).toEqual(providerQuotasData);
    expect(capturedProps?.fallbackChain).toEqual(fallbackChainData.chain);
  });
});