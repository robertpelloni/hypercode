'use client';

import { useEffect, useMemo, useState } from 'react';
import { trpc } from '../../utils/trpc';
import {
    DashboardHomeView,
    type DashboardFallbackSummary,
    type DashboardProviderSummary,
    type DashboardServerSummary,
    type DashboardSessionSummary,
    type DashboardStartupStatus,
    type DashboardStatusSummary,
    type DashboardTrafficSummary,
} from './dashboard-home-view';

const SESSION_STATUS_PRIORITY: Record<DashboardSessionSummary['status'], number> = {
    error: 6,
    restarting: 5,
    starting: 4,
    stopping: 3,
    running: 2,
    created: 1,
    stopped: 0,
};

export function sortSessions(sessions: DashboardSessionSummary[]) {
    return [...sessions].sort((left, right) => {
        const priorityDelta = SESSION_STATUS_PRIORITY[right.status] - SESSION_STATUS_PRIORITY[left.status];
        if (priorityDelta !== 0) {
            return priorityDelta;
        }

        return right.lastActivityAt - left.lastActivityAt;
    });
}

function sortServers(servers: DashboardServerSummary[]) {
    return [...servers].sort((left, right) => left.name.localeCompare(right.name));
}

export function DashboardHomeClient() {
    const utils = trpc.useUtils();
    const toolsClient = trpc.tools as any;
    const [pendingSessionActionId, setPendingSessionActionId] = useState<string | null>(null);
    const [currentTimestamp, setCurrentTimestamp] = useState<number | null>(null);

    useEffect(() => {
        const refreshTimestamp = () => setCurrentTimestamp(Date.now());
        refreshTimestamp();

        const interval = window.setInterval(refreshTimestamp, 30_000);
        return () => window.clearInterval(interval);
    }, []);

    const mcpStatusQuery = trpc.mcp.getStatus.useQuery(undefined, { refetchInterval: 5000 });
    const startupStatusQuery = trpc.startupStatus.useQuery(undefined, { refetchInterval: 5000 });
    const serversQuery = trpc.mcp.listServers.useQuery(undefined, { refetchInterval: 5000 });
    const trafficQuery = trpc.mcp.traffic.useQuery(undefined, { refetchInterval: 3000 });
    const providerQuotasQuery = trpc.billing.getProviderQuotas.useQuery(undefined, { refetchInterval: 10000 });
    const fallbackChainQuery = trpc.billing.getFallbackChain.useQuery(undefined, { refetchInterval: 10000 });
    const sessionsQuery = trpc.session.list.useQuery(undefined, { refetchInterval: 3000 });
    const installArtifactsQuery = toolsClient?.detectInstallSurfaces?.useQuery
        ? toolsClient.detectInstallSurfaces.useQuery(undefined, { refetchInterval: 10000 })
        : ({ data: null, refetch: async () => undefined } as { data: null; refetch: () => Promise<unknown> });
    const isBootstrapping = !startupStatusQuery.data && !mcpStatusQuery.data;

    const refreshDashboard = async () => {
        await Promise.all([
            utils.mcp.getStatus.invalidate(),
            utils.startupStatus.invalidate(),
            utils.mcp.listServers.invalidate(),
            utils.mcp.traffic.invalidate(),
            utils.billing.getProviderQuotas.invalidate(),
            utils.billing.getFallbackChain.invalidate(),
            utils.session.list.invalidate(),
            installArtifactsQuery.refetch(),
        ]);
    };

    const startSessionMutation = trpc.session.start.useMutation({
        onSettled: async () => {
            setPendingSessionActionId(null);
            await refreshDashboard();
        },
    });

    const stopSessionMutation = trpc.session.stop.useMutation({
        onSettled: async () => {
            setPendingSessionActionId(null);
            await refreshDashboard();
        },
    });

    const restartSessionMutation = trpc.session.restart.useMutation({
        onSettled: async () => {
            setPendingSessionActionId(null);
            await refreshDashboard();
        },
    });

    const mcpStatus = (mcpStatusQuery.data ?? {
        initialized: false,
        serverCount: 0,
        toolCount: 0,
        connectedCount: 0,
    }) as DashboardStatusSummary;

    const startupStatus = (startupStatusQuery.data ?? {
        status: 'starting',
        ready: false,
        uptime: 0,
        checks: {
            mcpAggregator: {
                ready: false,
                liveReady: false,
                serverCount: 0,
                connectedCount: 0,
                initialization: null,
                persistedServerCount: 0,
                persistedToolCount: 0,
                configuredServerCount: 0,
                advertisedServerCount: 0,
                advertisedToolCount: 0,
                advertisedAlwaysOnServerCount: 0,
                advertisedAlwaysOnToolCount: 0,
                inventoryReady: false,
                warmupInProgress: false,
            },
            configSync: {
                ready: false,
                status: null,
            },
            memory: {
                ready: false,
                initialized: false,
                agentMemory: false,
            },
            browser: {
                ready: false,
                active: false,
                pageCount: 0,
            },
            sessionSupervisor: {
                ready: false,
                sessionCount: 0,
                restore: null,
            },
            extensionBridge: {
                ready: false,
                acceptingConnections: false,
                clientCount: 0,
                hasConnectedClients: false,
            },
            executionEnvironment: {
                ready: false,
                preferredShellId: null,
                preferredShellLabel: null,
                shellCount: 0,
                verifiedShellCount: 0,
                toolCount: 0,
                verifiedToolCount: 0,
                harnessCount: 0,
                verifiedHarnessCount: 0,
                supportsPowerShell: false,
                supportsPosixShell: false,
                notes: [],
            },
        },
    }) as DashboardStartupStatus;

    const servers = useMemo(
        () => sortServers(((serversQuery.data ?? []) as DashboardServerSummary[])),
        [serversQuery.data],
    );

    const traffic = useMemo(
        () => ([...((trafficQuery.data ?? []) as DashboardTrafficSummary[])].sort((left, right) => right.timestamp - left.timestamp)),
        [trafficQuery.data],
    );

    const providers = useMemo(
        () => ((providerQuotasQuery.data ?? []) as DashboardProviderSummary[]),
        [providerQuotasQuery.data],
    );

    const fallbackChain = useMemo(
        () => ((fallbackChainQuery.data?.chain ?? []) as DashboardFallbackSummary[]),
        [fallbackChainQuery.data],
    );

    const sessions = useMemo(
        () => sortSessions(((sessionsQuery.data ?? []) as DashboardSessionSummary[])),
        [sessionsQuery.data],
    );

    return (
        <DashboardHomeView
            generatedAtLabel={currentTimestamp ? new Date(currentTimestamp).toLocaleTimeString() : 'just now'}
            currentTimestamp={currentTimestamp}
            isBootstrapping={isBootstrapping}
            mcpStatus={mcpStatus}
            startupStatus={startupStatus}
            servers={servers}
            traffic={traffic}
            providers={providers}
            fallbackChain={fallbackChain}
            sessions={sessions}
            installSurfaceArtifacts={installArtifactsQuery.data ?? null}
            onStartSession={(sessionId) => {
                setPendingSessionActionId(sessionId);
                startSessionMutation.mutate({ id: sessionId });
            }}
            onStopSession={(sessionId) => {
                setPendingSessionActionId(sessionId);
                stopSessionMutation.mutate({ id: sessionId });
            }}
            onRestartSession={(sessionId) => {
                setPendingSessionActionId(sessionId);
                restartSessionMutation.mutate({ id: sessionId });
            }}
            pendingSessionActionId={pendingSessionActionId}
        />
    );
}