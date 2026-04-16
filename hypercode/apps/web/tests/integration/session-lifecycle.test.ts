import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

type CapturedDashboardProps = {
  sessions?: unknown[];
  onStartSession?: (sessionId: string) => void;
  onStopSession?: (sessionId: string) => void;
  onRestartSession?: (sessionId: string) => void;
} | null;

let capturedProps: CapturedDashboardProps = null;

const invalidateMcpStatus = vi.fn(async () => undefined);
const invalidateServerList = vi.fn(async () => undefined);
const invalidateTraffic = vi.fn(async () => undefined);
const invalidateProviderQuotas = vi.fn(async () => undefined);
const invalidateFallbackChain = vi.fn(async () => undefined);
const invalidateSessionList = vi.fn(async () => undefined);

const startMutate = vi.fn<(input: { id: string }) => void>();
const stopMutate = vi.fn<(input: { id: string }) => void>();
const restartMutate = vi.fn<(input: { id: string }) => void>();

const startMutateCallable = (input: { id: string }) => {
  startMutate(input);
};

const stopMutateCallable = (input: { id: string }) => {
  stopMutate(input);
};

const restartMutateCallable = (input: { id: string }) => {
  restartMutate(input);
};

const sessionRows = [
  {
    id: 'session-running',
    name: 'Claude Code workspace',
    cliType: 'claude-code',
    workingDirectory: 'c:/repo-b',
    status: 'running',
    restartCount: 2,
    maxRestartAttempts: 5,
    lastActivityAt: 1_700_000_100_000,
    logs: [{ timestamp: 1_700_000_100_000, stream: 'stdout', message: 'Working tree ready' }],
  },
  {
    id: 'session-created',
    name: 'Aider workspace',
    cliType: 'aider',
    workingDirectory: 'c:/repo-a',
    status: 'created',
    restartCount: 0,
    maxRestartAttempts: 5,
    lastActivityAt: 1_700_000_000_000,
    logs: [],
  },
];

function createMutation(
  mutateSpy: (input: { id: string }) => void,
) {
  return (options?: {
    onMutate?: (input: { id: string }) => void;
    onSettled?: () => Promise<void> | void;
  }) => ({
    mutate: (input: { id: string }) => {
      mutateSpy(input);
      options?.onMutate?.(input);
      void Promise.resolve(options?.onSettled?.());
    },
  });
}

vi.mock('@/utils/trpc', () => {
  const createUseQuery = <T,>(data: T) => () => ({ data });

  return {
    trpc: {
      useUtils: () => ({
        mcp: {
          getStatus: { invalidate: invalidateMcpStatus },
          listServers: { invalidate: invalidateServerList },
          traffic: { invalidate: invalidateTraffic },
        },
        billing: {
          getProviderQuotas: { invalidate: invalidateProviderQuotas },
          getFallbackChain: { invalidate: invalidateFallbackChain },
        },
        session: {
          list: { invalidate: invalidateSessionList },
        },
      }),
      mcp: {
        getStatus: { useQuery: createUseQuery({ initialized: true, serverCount: 1, toolCount: 6, connectedCount: 1 }) },
        listServers: { useQuery: createUseQuery([]) },
        traffic: { useQuery: createUseQuery([]) },
      },
      billing: {
        getProviderQuotas: { useQuery: createUseQuery([]) },
        getFallbackChain: { useQuery: createUseQuery({ chain: [] }) },
      },
      session: {
        list: { useQuery: createUseQuery(sessionRows) },
        start: { useMutation: createMutation(startMutateCallable) },
        stop: { useMutation: createMutation(stopMutateCallable) },
        restart: { useMutation: createMutation(restartMutateCallable) },
      },
    },
  };
});

vi.mock('../../src/app/dashboard/dashboard-home-view', () => ({
  DashboardHomeView: (props: CapturedDashboardProps) => {
    capturedProps = props;
    return null;
  },
}));

describe('dashboard session lifecycle integration', () => {
  afterEach(() => {
    capturedProps = null;
    invalidateMcpStatus.mockClear();
    invalidateServerList.mockClear();
    invalidateTraffic.mockClear();
    invalidateProviderQuotas.mockClear();
    invalidateFallbackChain.mockClear();
    invalidateSessionList.mockClear();
    startMutate.mockClear();
    stopMutate.mockClear();
    restartMutate.mockClear();
  });

  it('wires start, stop, and restart actions through the dashboard client and refreshes live queries', async () => {
    const { DashboardHomeClient } = await import('../../src/app/dashboard/DashboardHomeClient');
    renderToStaticMarkup(createElement(DashboardHomeClient));

    expect(capturedProps?.sessions).toEqual(sessionRows);

    capturedProps?.onStartSession?.('session-created');
    capturedProps?.onStopSession?.('session-running');
    capturedProps?.onRestartSession?.('session-running');

    await Promise.resolve();
    await Promise.resolve();

    expect(startMutate).toHaveBeenCalledWith({ id: 'session-created' });
    expect(stopMutate).toHaveBeenCalledWith({ id: 'session-running' });
    expect(restartMutate).toHaveBeenCalledWith({ id: 'session-running' });

    expect(invalidateMcpStatus).toHaveBeenCalledTimes(3);
    expect(invalidateServerList).toHaveBeenCalledTimes(3);
    expect(invalidateTraffic).toHaveBeenCalledTimes(3);
    expect(invalidateProviderQuotas).toHaveBeenCalledTimes(3);
    expect(invalidateFallbackChain).toHaveBeenCalledTimes(3);
    expect(invalidateSessionList).toHaveBeenCalledTimes(3);
  });
});