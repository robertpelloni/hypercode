'use client';

import { useEffect, useMemo, useState } from 'react';
import { trpc } from '../../utils/trpc';
import {
    DashboardHomeView,
    type DashboardFallbackSummary,
    type DashboardInstallSurfaceArtifact,
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

function isDashboardServerSummary(value: unknown): value is DashboardServerSummary {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { name?: unknown }).name === 'string'
        && typeof (value as { status?: unknown }).status === 'string'
        && typeof (value as { toolCount?: unknown }).toolCount === 'number';
}

function isDashboardTrafficSummary(value: unknown): value is DashboardTrafficSummary {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { server?: unknown }).server === 'string'
        && typeof (value as { method?: unknown }).method === 'string'
        && typeof (value as { paramsSummary?: unknown }).paramsSummary === 'string'
        && typeof (value as { latencyMs?: unknown }).latencyMs === 'number'
        && typeof (value as { success?: unknown }).success === 'boolean'
        && typeof (value as { timestamp?: unknown }).timestamp === 'number';
}

function isDashboardProviderSummary(value: unknown): value is DashboardProviderSummary {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { provider?: unknown }).provider === 'string'
        && typeof (value as { name?: unknown }).name === 'string'
        && typeof (value as { configured?: unknown }).configured === 'boolean'
        && typeof (value as { tier?: unknown }).tier === 'string'
        && typeof (value as { used?: unknown }).used === 'number';
}

function isDashboardFallbackSummary(value: unknown): value is DashboardFallbackSummary {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { priority?: unknown }).priority === 'number'
        && typeof (value as { provider?: unknown }).provider === 'string'
        && typeof (value as { reason?: unknown }).reason === 'string';
}

function isDashboardSessionSummary(value: unknown): value is DashboardSessionSummary {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { id?: unknown }).id === 'string'
        && typeof (value as { name?: unknown }).name === 'string'
        && typeof (value as { cliType?: unknown }).cliType === 'string'
        && typeof (value as { workingDirectory?: unknown }).workingDirectory === 'string'
        && typeof (value as { status?: unknown }).status === 'string'
        && typeof (value as { restartCount?: unknown }).restartCount === 'number'
        && typeof (value as { maxRestartAttempts?: unknown }).maxRestartAttempts === 'number'
        && typeof (value as { lastActivityAt?: unknown }).lastActivityAt === 'number'
        && Array.isArray((value as { logs?: unknown }).logs);
}

function isDashboardInstallSurfaceArtifact(value: unknown): value is DashboardInstallSurfaceArtifact {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { id?: unknown }).id === 'string'
        && typeof (value as { status?: unknown }).status === 'string';
}

interface DashboardHomeClientProps {
    versionLabel?: string;
}

export function DashboardHomeClient({ versionLabel }: DashboardHomeClientProps) {
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
    const mcpStatusError = mcpStatusQuery.error?.message ?? null;
    const startupStatusError = startupStatusQuery.error?.message ?? null;
    const serversError = serversQuery.isError
        || (serversQuery.data !== undefined && (!Array.isArray(serversQuery.data) || !serversQuery.data.every(isDashboardServerSummary)))
        ? (serversQuery.error?.message ?? 'MCP server inventory is unavailable.')
        : null;
    const trafficError = trafficQuery.isError
        || (trafficQuery.data !== undefined && (!Array.isArray(trafficQuery.data) || !trafficQuery.data.every(isDashboardTrafficSummary)))
        ? (trafficQuery.error?.message ?? 'MCP traffic telemetry is unavailable.')
        : null;
    const providersError = providerQuotasQuery.isError
        || (providerQuotasQuery.data !== undefined && (!Array.isArray(providerQuotasQuery.data) || !providerQuotasQuery.data.every(isDashboardProviderSummary)))
        ? (providerQuotasQuery.error?.message ?? 'Provider routing inventory is unavailable.')
        : null;
    const fallbackChainError = fallbackChainQuery.isError
        || (fallbackChainQuery.data !== undefined && (
            !fallbackChainQuery.data
            || !Array.isArray(fallbackChainQuery.data.chain)
            || !fallbackChainQuery.data.chain.every(isDashboardFallbackSummary)
        ))
        ? (fallbackChainQuery.error?.message ?? 'Provider fallback chain is unavailable.')
        : null;
    const sessionsError = sessionsQuery.isError
        || (sessionsQuery.data !== undefined && (!Array.isArray(sessionsQuery.data) || !sessionsQuery.data.every(isDashboardSessionSummary)))
        ? (sessionsQuery.error?.message ?? 'Supervised session inventory is unavailable.')
        : null;
    const installArtifactsError = installArtifactsQuery.data !== null
        && installArtifactsQuery.data !== undefined
        && (!Array.isArray(installArtifactsQuery.data) || !installArtifactsQuery.data.every(isDashboardInstallSurfaceArtifact))
        ? 'Extension install artifact inventory is unavailable.'
        : null;

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
        () => sortServers((!serversError ? ((serversQuery.data ?? []) as DashboardServerSummary[]) : [])),
        [serversError, serversQuery.data],
    );

    const traffic = useMemo(
        () => ([...(!trafficError && Array.isArray(trafficQuery.data) ? (trafficQuery.data as DashboardTrafficSummary[]) : [])]
            .sort((left, right) => right.timestamp - left.timestamp)),
        [trafficError, trafficQuery.data],
    );

    const providers = useMemo(
        () => ((!providersError ? ((providerQuotasQuery.data ?? []) as DashboardProviderSummary[]) : [])),
        [providerQuotasQuery.data, providersError],
    );

    const fallbackChain = useMemo(
        () => ((!fallbackChainError ? ((fallbackChainQuery.data?.chain ?? []) as DashboardFallbackSummary[]) : [])),
        [fallbackChainError, fallbackChainQuery.data],
    );

    const sessions = useMemo(
        () => sortSessions((!sessionsError ? ((sessionsQuery.data ?? []) as DashboardSessionSummary[]) : [])),
        [sessionsError, sessionsQuery.data],
    );

    return (
        <DashboardHomeView
            versionLabel={versionLabel}
            generatedAtLabel={currentTimestamp ? new Date(currentTimestamp).toLocaleTimeString() : 'just now'}
            currentTimestamp={currentTimestamp}
            isBootstrapping={isBootstrapping}
            mcpStatus={mcpStatus}
            mcpStatusError={mcpStatusError}
            startupStatus={startupStatus}
            startupStatusError={startupStatusError}
            servers={servers}
            serversError={serversError}
            traffic={traffic}
            trafficError={trafficError}
            providers={providers}
            providersError={providersError}
            fallbackChain={fallbackChain}
            fallbackChainError={fallbackChainError}
            sessions={sessions}
            sessionsError={sessionsError}
            installSurfaceArtifacts={installArtifactsError
                ? null
                : (Array.isArray(installArtifactsQuery.data) ? installArtifactsQuery.data as DashboardInstallSurfaceArtifact[] : null)}
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
