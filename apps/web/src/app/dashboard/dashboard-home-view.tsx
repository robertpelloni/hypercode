import Link from 'next/link';

export interface DashboardStatusSummary {
    initialized: boolean;
    serverCount: number;
    toolCount: number;
    connectedCount: number;
}

export interface DashboardStartupStatus {
    status: string;
    ready: boolean;
    uptime: number;
    checks: {
        mcpAggregator: {
            ready: boolean;
            serverCount: number;
            initialization: {
                inProgress: boolean;
                initialized: boolean;
                lastStartedAt?: number;
                lastCompletedAt?: number;
                lastSuccessAt?: number;
                lastError?: string;
                connectedClientCount: number;
                configuredServerCount: number;
            } | null;
            persistedServerCount: number;
            persistedToolCount: number;
            configuredServerCount?: number;
            inventoryReady: boolean;
        };
        configSync: {
            ready: boolean;
            status: {
                inProgress: boolean;
                lastStartedAt?: number;
                lastCompletedAt?: number;
                lastSuccessAt?: number;
                lastError?: string;
                lastServerCount: number;
                lastToolCount: number;
            } | null;
        };
        memory: {
            ready: boolean;
            initialized: boolean;
            agentMemory: boolean;
        };
        browser: {
            ready: boolean;
            active: boolean;
            pageCount: number;
        };
        sessionSupervisor: {
            ready: boolean;
            sessionCount: number;
            restore: {
                lastRestoreAt?: number;
                restoredSessionCount: number;
                autoResumeCount: number;
            } | null;
        };
        extensionBridge: {
            ready: boolean;
            acceptingConnections?: boolean;
            clientCount: number;
            hasConnectedClients?: boolean;
        };
    };
}

export interface DashboardServerSummary {
    name: string;
    status: string;
    toolCount: number;
    config: {
        command: string;
        args: string[];
        env: string[];
    };
}

export interface DashboardTrafficSummary {
    server: string;
    method: string;
    paramsSummary: string;
    latencyMs: number;
    success: boolean;
    timestamp: number;
    toolName?: string;
    error?: string;
}

export interface DashboardProviderSummary {
    provider: string;
    name: string;
    configured: boolean;
    authenticated?: boolean;
    authMethod?: string;
    tier: string;
    limit: number | null;
    used: number;
    remaining: number | null;
    resetDate?: string | null;
    rateLimitRpm?: number | null;
    availability?: string;
    lastError?: string | null;
}

export interface DashboardFallbackSummary {
    priority: number;
    provider: string;
    model?: string;
    reason: string;
}

export interface DashboardSessionLogSummary {
    timestamp: number;
    stream: 'stdout' | 'stderr' | 'system';
    message: string;
}

export interface DashboardSessionSummary {
    id: string;
    name: string;
    cliType: string;
    workingDirectory: string;
    worktreePath?: string;
    autoRestart?: boolean;
    status: 'created' | 'starting' | 'running' | 'stopping' | 'stopped' | 'restarting' | 'error';
    restartCount: number;
    maxRestartAttempts: number;
    scheduledRestartAt?: number;
    lastActivityAt: number;
    lastError?: string;
    logs: DashboardSessionLogSummary[];
}

export interface DashboardHomeViewProps {
    generatedAtLabel: string;
    currentTimestamp?: number | null;
    mcpStatus: DashboardStatusSummary;
    startupStatus: DashboardStartupStatus;
    servers: DashboardServerSummary[];
    traffic: DashboardTrafficSummary[];
    providers: DashboardProviderSummary[];
    fallbackChain: DashboardFallbackSummary[];
    sessions: DashboardSessionSummary[];
    onStartSession?: (sessionId: string) => void;
    onStopSession?: (sessionId: string) => void;
    onRestartSession?: (sessionId: string) => void;
    pendingSessionActionId?: string | null;
}

export interface OverviewMetric {
    label: string;
    value: string;
    detail: string;
}

export interface StartupChecklistItem {
    label: string;
    ready: boolean;
    detail: string;
}

export interface DashboardAlert {
    id: string;
    severity: 'critical' | 'warning' | 'info';
    title: string;
    detail: string;
    href: string;
    hrefLabel: string;
}

const DEGRADED_PROVIDER_AVAILABILITIES = new Set([
    'degraded',
    'offline',
    'rate_limited',
    'quota_exhausted',
    'cooldown',
    'missing_auth',
    'missing_config',
]);

function isProviderDegraded(provider: DashboardProviderSummary): boolean {
    if (!provider.configured) {
        return false;
    }

    if (provider.authenticated === false || Boolean(provider.lastError)) {
        return true;
    }

    if (!provider.availability) {
        return false;
    }

    return DEGRADED_PROVIDER_AVAILABILITIES.has(provider.availability);
}

function sentenceCase(value: string): string {
    if (!value) {
        return 'Unknown';
    }

    const normalized = value.replace(/[_-]+/g, ' ');
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function formatRelativeTimestamp(timestamp: number, now?: number | null): string {
    if (now === null || now === undefined) {
        return 'just now';
    }

    const deltaMs = Math.max(0, now - timestamp);
    const deltaMinutes = Math.floor(deltaMs / 60000);

    if (deltaMinutes < 1) {
        return 'just now';
    }

    if (deltaMinutes < 60) {
        return `${deltaMinutes}m ago`;
    }

    const deltaHours = Math.floor(deltaMinutes / 60);
    if (deltaHours < 24) {
        return `${deltaHours}h ago`;
    }

    const deltaDays = Math.floor(deltaHours / 24);
    return `${deltaDays}d ago`;
}

export function formatRestartCountdown(timestamp: number, now?: number | null): string {
    if (now === null || now === undefined) {
        return 'soon';
    }

    const remainingMs = Math.max(0, timestamp - now);
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    if (remainingSeconds <= 1) {
        return 'in <1s';
    }

    if (remainingSeconds < 60) {
        return `in ${remainingSeconds}s`;
    }

    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    if (remainingMinutes < 60) {
        return `in ${remainingMinutes}m`;
    }

    const remainingHours = Math.ceil(remainingMinutes / 60);
    if (remainingHours < 24) {
        return `in ${remainingHours}h`;
    }

    return `in ${Math.ceil(remainingHours / 24)}d`;
}

export function summarizeTrafficEvent(event: DashboardTrafficSummary): string {
    const target = event.toolName ? `${event.method} · ${event.toolName}` : event.method;
    const detail = event.paramsSummary?.trim() || event.error?.trim() || 'No parameters captured';
    return `${target} — ${detail}`;
}

export function getQuotaUsagePercent(provider: DashboardProviderSummary): number | null {
    if (provider.limit === null || provider.limit <= 0) {
        return null;
    }

    return Math.max(0, Math.min(100, Math.round((provider.used / provider.limit) * 100)));
}

export function buildOverviewMetrics(
    mcpStatus: DashboardStatusSummary,
    sessions: DashboardSessionSummary[],
    providers: DashboardProviderSummary[],
): OverviewMetric[] {
    const runningSessions = sessions.filter((session) => session.status === 'running').length;
    const actionableProviders = providers.filter((provider) => provider.configured).length;
    const degradedProviders = providers.filter((provider) => isProviderDegraded(provider)).length;

    return [
        {
            label: 'MCP servers',
            value: `${mcpStatus.connectedCount}/${mcpStatus.serverCount}`,
            detail: `${mcpStatus.toolCount} tools indexed across the router`,
        },
        {
            label: 'Supervised sessions',
            value: `${runningSessions}/${sessions.length}`,
            detail: runningSessions > 0 ? 'running right now' : 'waiting for operator action',
        },
        {
            label: 'Configured providers',
            value: `${actionableProviders}`,
            detail: degradedProviders > 0 ? `${degradedProviders} need attention` : 'all configured providers look healthy',
        },
    ];
}

export function buildStartupChecklist(startupStatus: DashboardStartupStatus): StartupChecklistItem[] {
    const configSync = startupStatus.checks.configSync.status;
    const aggregator = startupStatus.checks.mcpAggregator;
    const restore = startupStatus.checks.sessionSupervisor.restore;
    const extensionBridge = startupStatus.checks.extensionBridge;
    const routerInventoryDetail = aggregator.inventoryReady
        ? aggregator.persistedServerCount === 0 && aggregator.persistedToolCount === 0
            ? 'No configured servers yet · empty inventory is ready'
            : `${aggregator.persistedServerCount} persisted servers · ${aggregator.persistedToolCount} persisted tools`
        : `${aggregator.persistedServerCount} persisted servers · ${aggregator.persistedToolCount} persisted tools`;
    const bridgeClientLabel = `${extensionBridge.clientCount} connected bridge client${extensionBridge.clientCount === 1 ? '' : 's'}`;

    return [
        {
            label: 'Config sync',
            ready: startupStatus.checks.configSync.ready,
            detail: configSync?.inProgress
                ? 'Syncing Borg MCP config…'
                : configSync?.lastCompletedAt
                    ? `${configSync.lastServerCount} servers, ${configSync.lastToolCount} tools cached`
                    : 'Waiting for first config sync',
        },
        {
            label: 'Router inventory',
            ready: aggregator.ready && aggregator.inventoryReady,
            detail: routerInventoryDetail,
        },
        {
            label: 'Session restore',
            ready: startupStatus.checks.sessionSupervisor.ready,
            detail: restore
                ? `${restore.restoredSessionCount} restored · ${restore.autoResumeCount} auto-resumed`
                : 'Waiting for supervisor restore',
        },
        {
            label: 'Client bridge',
            ready: extensionBridge.ready,
            detail: extensionBridge.ready
                ? `${bridgeClientLabel} · browser/editor bridge listener ready for new clients`
                : 'Browser/editor bridge listener is offline',
        },
    ];
}

export function buildDashboardAlerts(
    mcpStatus: DashboardStatusSummary,
    startupStatus: DashboardStartupStatus,
    servers: DashboardServerSummary[],
    providers: DashboardProviderSummary[],
    sessions: DashboardSessionSummary[],
): DashboardAlert[] {
    const alerts: DashboardAlert[] = [];
    const startupPendingCount = buildStartupChecklist(startupStatus).filter((item) => !item.ready).length;
    const disconnectedServers = servers.filter((server) => server.status !== 'connected').length;
    const degradedProviders = providers.filter((provider) => isProviderDegraded(provider)).length;
    const erroredSessions = sessions.filter((session) => session.status === 'error').length;

    if (!mcpStatus.initialized) {
        alerts.push({
            id: 'router-offline',
            severity: 'critical',
            title: 'MCP router is not initialized',
            detail: 'Core has not finished bringing the router online yet, so tools may be unavailable.',
            href: '/dashboard/mcp',
            hrefLabel: 'Inspect MCP router',
        });
    } else if (mcpStatus.serverCount > 0 && mcpStatus.connectedCount === 0) {
        alerts.push({
            id: 'router-disconnected',
            severity: 'critical',
            title: 'All configured MCP servers are disconnected',
            detail: `${mcpStatus.serverCount} registered servers exist, but none are currently connected to the router.`,
            href: '/dashboard/mcp',
            hrefLabel: 'Inspect MCP router',
        });
    } else if (disconnectedServers > 0) {
        alerts.push({
            id: 'server-degraded',
            severity: 'warning',
            title: 'Some MCP servers need attention',
            detail: `${disconnectedServers} server${disconnectedServers === 1 ? '' : 's'} ${disconnectedServers === 1 ? 'is' : 'are'} not fully connected.`,
            href: '/dashboard/mcp',
            hrefLabel: 'Open server health',
        });
    }

    if (startupPendingCount > 0) {
        alerts.push({
            id: 'startup-pending',
            severity: startupStatus.ready ? 'info' : 'warning',
            title: startupStatus.ready ? 'Background startup checks still reporting pending' : 'Startup sequence is still warming up',
            detail: `${startupPendingCount} startup check${startupPendingCount === 1 ? '' : 's'} ${startupPendingCount === 1 ? 'is' : 'are'} not ready yet.`,
            href: '/dashboard',
            hrefLabel: 'Review startup readiness',
        });
    }

    if (degradedProviders > 0) {
        alerts.push({
            id: 'provider-degraded',
            severity: degradedProviders > 1 ? 'critical' : 'warning',
            title: 'Provider routing has degraded capacity',
            detail: `${degradedProviders} configured provider${degradedProviders === 1 ? '' : 's'} ${degradedProviders === 1 ? 'needs' : 'need'} attention before fallback narrows.`,
            href: '/dashboard/billing',
            hrefLabel: 'Review providers',
        });
    }

    if (erroredSessions > 0) {
        alerts.push({
            id: 'session-errors',
            severity: 'critical',
            title: 'Supervised sessions have failed',
            detail: `${erroredSessions} session${erroredSessions === 1 ? '' : 's'} ${erroredSessions === 1 ? 'is' : 'are'} in an error state and may need restart or log review.`,
            href: '/dashboard/session',
            hrefLabel: 'Open sessions',
        });
    }

    return alerts.sort((left, right) => {
        const order = { critical: 0, warning: 1, info: 2 } as const;
        return order[left.severity] - order[right.severity];
    });
}

function getServerTone(status: string): string {
    switch (status) {
        case 'connected':
            return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
        case 'connecting':
        case 'restarting':
            return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
        case 'error':
            return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
        default:
            return 'border-slate-500/30 bg-slate-500/10 text-slate-200';
    }
}

function getSessionTone(status: DashboardSessionSummary['status']): string {
    switch (status) {
        case 'running':
            return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
        case 'starting':
        case 'restarting':
            return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
        case 'error':
            return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
        default:
            return 'border-slate-500/30 bg-slate-500/10 text-slate-200';
    }
}

function getProviderTone(provider: DashboardProviderSummary): string {
    if (!provider.configured) {
        return 'border-slate-500/30 bg-slate-500/10 text-slate-200';
    }

    if (isProviderDegraded(provider)) {
        return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
    }

    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
}

function formatQuotaValue(value: number | null): string {
    if (value === null) {
        return '—';
    }

    return value.toLocaleString();
}

function formatFallbackLabel(entry: DashboardFallbackSummary): string {
    return entry.model ? `${entry.provider} · ${entry.model}` : entry.provider;
}

function getAlertTone(severity: DashboardAlert['severity']): string {
    switch (severity) {
        case 'critical':
            return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
        case 'warning':
            return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
        default:
            return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200';
    }
}

export function DashboardHomeView({
    generatedAtLabel,
    currentTimestamp,
    mcpStatus,
    startupStatus,
    servers,
    traffic,
    providers,
    fallbackChain,
    sessions,
    onStartSession,
    onStopSession,
    onRestartSession,
    pendingSessionActionId,
}: DashboardHomeViewProps) {
    const overviewMetrics = buildOverviewMetrics(mcpStatus, sessions, providers);
    const startupChecklist = buildStartupChecklist(startupStatus);
    const dashboardAlerts = buildDashboardAlerts(mcpStatus, startupStatus, servers, providers, sessions);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:px-8">
                <header className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/30">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-3">
                            <span className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                                Borg 1.0 control plane
                            </span>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-semibold tracking-tight text-white">Operator dashboard</h1>
                                <p className="max-w-3xl text-sm text-slate-300">
                                    One page to see whether the MCP router is alive, which providers can take traffic, and what your supervised CLI sessions are doing.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                            <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5">
                                Refreshed {generatedAtLabel}
                            </span>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                        {overviewMetrics.map((metric) => (
                            <div key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{metric.label}</p>
                                <p className="mt-2 text-3xl font-semibold text-white">{metric.value}</p>
                                <p className="mt-2 text-sm text-slate-400">{metric.detail}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Operator alerts</h2>
                                <p className="mt-1 text-sm text-slate-500">Cross-panel issues that deserve attention before you start driving the swarm.</p>
                            </div>
                            <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-200">
                                {dashboardAlerts.length === 0 ? 'All clear' : `${dashboardAlerts.length} active`}
                            </span>
                        </div>

                        {dashboardAlerts.length === 0 ? (
                            <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                                All major systems look healthy. Router, providers, and supervised sessions are not reporting any cross-panel alerts.
                            </div>
                        ) : (
                            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                {dashboardAlerts.map((alert) => (
                                    <div key={alert.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-[0.2em] ${getAlertTone(alert.severity)}`}>
                                                    {alert.severity}
                                                </div>
                                                <h3 className="mt-3 text-base font-semibold text-white">{alert.title}</h3>
                                                <p className="mt-2 text-sm text-slate-300">{alert.detail}</p>
                                            </div>
                                        </div>
                                        <Link
                                            href={alert.href}
                                            title={alert.hrefLabel}
                                            aria-label={alert.hrefLabel}
                                            className="mt-4 inline-flex text-sm font-medium text-cyan-200 transition hover:text-cyan-100"
                                        >
                                            {alert.hrefLabel} →
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </header>

                <div className="grid gap-6 xl:grid-cols-2">
                    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/20">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Overview</p>
                                <h2 className="mt-2 text-xl font-semibold text-white">Router posture</h2>
                                <p className="mt-2 text-sm text-slate-400">Quick health readout for first-time operators.</p>
                            </div>
                            <div className={`rounded-full border px-3 py-1 text-xs font-medium ${mcpStatus.initialized ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>
                                {mcpStatus.initialized ? 'Initialized' : 'Offline'}
                            </div>
                        </div>

                        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                                <dt className="text-sm text-slate-400">Connected servers</dt>
                                <dd className="mt-2 text-2xl font-semibold text-white">{mcpStatus.connectedCount}</dd>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                                <dt className="text-sm text-slate-400">Indexed tools</dt>
                                <dd className="mt-2 text-2xl font-semibold text-white">{mcpStatus.toolCount}</dd>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                                <dt className="text-sm text-slate-400">Running sessions</dt>
                                <dd className="mt-2 text-2xl font-semibold text-white">{sessions.filter((session) => session.status === 'running').length}</dd>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                                <dt className="text-sm text-slate-400">Configured providers</dt>
                                <dd className="mt-2 text-2xl font-semibold text-white">{providers.filter((provider) => provider.configured).length}</dd>
                            </div>
                        </dl>

                        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Startup readiness</h3>
                                    <p className="mt-1 text-sm text-slate-500">Boot phases reported directly from core startup state.</p>
                                </div>
                                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${startupStatus.ready ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
                                    {startupStatus.ready ? 'Ready' : 'Warming up'}
                                </span>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                {startupChecklist.map((item) => (
                                    <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-medium text-white">{item.label}</span>
                                            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${item.ready ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
                                                {item.ready ? 'Ready' : 'Pending'}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-slate-400">{item.detail}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/20">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">MCP Router</p>
                                <h2 className="mt-2 text-xl font-semibold text-white">Server health and traffic</h2>
                                <p className="mt-2 text-sm text-slate-400">Live server posture plus the latest router activity.</p>
                            </div>
                            <Link
                                href="/dashboard/mcp"
                                title="Open the full MCP router dashboard with server list, tools, and configuration controls"
                                aria-label="Open detailed MCP dashboard"
                                className="text-sm font-medium text-cyan-200 transition hover:text-cyan-100"
                            >
                                Detailed MCP view →
                            </Link>
                        </div>

                        <div className="mt-6 space-y-3">
                            {servers.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400">
                                    No MCP servers registered yet.
                                </div>
                            ) : servers.map((server) => (
                                <div key={server.name} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-base font-semibold text-white">{server.name}</h3>
                                                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getServerTone(server.status)}`}>
                                                    {sentenceCase(server.status)}
                                                </span>
                                            </div>
                                            <p className="mt-2 break-all font-mono text-xs text-slate-400">
                                                {server.config.command} {server.config.args.join(' ')}
                                            </p>
                                        </div>
                                        <div className="text-right text-sm text-slate-300">
                                            <div>{server.toolCount} tools</div>
                                            <div className="text-xs text-slate-500">{server.config.env.length} env vars</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                            <div className="flex items-center justify-between gap-4">
                                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Recent traffic</h3>
                                <Link
                                    href="/dashboard/mcp/inspector"
                                    title="Open the live MCP inspector to trace requests, responses, and tool invocations"
                                    aria-label="Open MCP traffic inspector"
                                    className="text-sm font-medium text-cyan-200 transition hover:text-cyan-100"
                                >
                                    Open inspector →
                                </Link>
                            </div>

                            <div className="mt-4 space-y-3">
                                {traffic.length === 0 ? (
                                    <p className="text-sm text-slate-400">No router traffic captured yet.</p>
                                ) : traffic.slice(0, 5).map((event, index) => (
                                    <div key={`${event.server}-${event.method}-${event.timestamp}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-sm">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${event.success ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                                <span className="font-medium text-white">{event.server}</span>
                                                <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-300">{event.method}</span>
                                            </div>
                                            <span className="text-xs text-slate-500">{formatRelativeTimestamp(event.timestamp, currentTimestamp)}</span>
                                        </div>
                                        <p className="mt-2 text-sm text-slate-300">{summarizeTrafficEvent(event)}</p>
                                        <div className="mt-2 text-xs text-slate-500">Latency {event.latencyMs}ms</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/20">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Sessions</p>
                                <h2 className="mt-2 text-xl font-semibold text-white">Supervised CLI runtime</h2>
                                <p className="mt-2 text-sm text-slate-400">Inspect live session state, recent output, and restart posture.</p>
                            </div>
                            <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs font-medium text-slate-200">
                                {sessions.length} total
                            </span>
                        </div>

                        <div className="mt-6 space-y-3">
                            {sessions.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400">
                                    No supervised sessions are registered yet.
                                </div>
                            ) : sessions.map((session) => {
                                const latestLog = session.logs[session.logs.length - 1];
                                const isPending = pendingSessionActionId === session.id;
                                const isRunning = session.status === 'running';
                                const canStart = session.status === 'created' || session.status === 'stopped' || session.status === 'error';
                                const canStop = session.status === 'starting' || session.status === 'running' || session.status === 'restarting';

                                return (
                                    <div key={session.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <h3 className="text-base font-semibold text-white">{session.name}</h3>
                                                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getSessionTone(session.status)}`}>
                                                        {sentenceCase(session.status)}
                                                    </span>
                                                    <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">
                                                        {session.cliType}
                                                    </span>
                                                </div>
                                                <p className="mt-2 break-all font-mono text-xs text-slate-400">{session.worktreePath ?? session.workingDirectory}</p>
                                                <p className="mt-2 text-xs text-slate-500">
                                                    Last activity {formatRelativeTimestamp(session.lastActivityAt, currentTimestamp)} · Restarted {session.restartCount}/{session.maxRestartAttempts}
                                                </p>
                                                {session.autoRestart === false ? (
                                                    <p className="mt-2 text-xs text-amber-300">
                                                        Manual restart only · Borg will not auto-restart this session after a crash.
                                                    </p>
                                                ) : null}
                                                {session.status === 'restarting' && session.scheduledRestartAt ? (
                                                    <p className="mt-2 text-xs text-amber-300">
                                                        Restart queued {formatRestartCountdown(session.scheduledRestartAt, currentTimestamp)}
                                                    </p>
                                                ) : null}
                                                {latestLog ? (
                                                    <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-300">
                                                        <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                                                            <span>Latest {latestLog.stream}</span>
                                                            <span>{formatRelativeTimestamp(latestLog.timestamp, currentTimestamp)}</span>
                                                        </div>
                                                        <p className="line-clamp-3 whitespace-pre-wrap break-words">{latestLog.message}</p>
                                                    </div>
                                                ) : null}
                                                {session.lastError ? (
                                                    <p className="mt-3 text-sm text-rose-300">{session.lastError}</p>
                                                ) : null}
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    disabled={!onStartSession || !canStart || isPending}
                                                    onClick={() => onStartSession?.(session.id)}
                                                    title={`Start session ${session.name} (${session.cliType})`}
                                                    aria-label={`Start session ${session.name}`}
                                                    className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {isPending && canStart ? 'Starting…' : isRunning ? 'Running' : 'Start'}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={!onStopSession || !canStop || isPending}
                                                    onClick={() => onStopSession?.(session.id)}
                                                    title={`Stop session ${session.name}`}
                                                    aria-label={`Stop session ${session.name}`}
                                                    className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {isPending && canStop ? 'Stopping…' : 'Stop'}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={!onRestartSession || isPending}
                                                    onClick={() => onRestartSession?.(session.id)}
                                                    title={`Restart session ${session.name} and reattach supervision`}
                                                    aria-label={`Restart session ${session.name}`}
                                                    className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:border-cyan-400 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {isPending ? 'Working…' : 'Restart'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/20">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Providers</p>
                                <h2 className="mt-2 text-xl font-semibold text-white">Quota and fallback posture</h2>
                                <p className="mt-2 text-sm text-slate-400">Which providers are configured, how much headroom remains, and where fallback will go next.</p>
                            </div>
                            <Link
                                href="/dashboard/billing"
                                title="Open provider billing and quota analytics with fallback chain controls"
                                aria-label="Open detailed provider billing dashboard"
                                className="text-sm font-medium text-cyan-200 transition hover:text-cyan-100"
                            >
                                Detailed provider view →
                            </Link>
                        </div>

                        <div className="mt-6 space-y-3">
                            {providers.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400">
                                    No provider data available yet.
                                </div>
                            ) : providers.map((provider) => {
                                const usagePercent = getQuotaUsagePercent(provider);
                                return (
                                    <div key={provider.provider} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-base font-semibold text-white">{provider.name}</h3>
                                                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getProviderTone(provider)}`}>
                                                        {provider.configured ? sentenceCase(provider.availability ?? (provider.authenticated ? 'healthy' : 'degraded')) : 'Not configured'}
                                                    </span>
                                                </div>
                                                <p className="mt-2 text-sm text-slate-400">
                                                    {provider.authMethod ? `${provider.authMethod} · ` : ''}{provider.tier}
                                                    {provider.resetDate ? ` · resets ${provider.resetDate}` : ''}
                                                </p>
                                                {provider.lastError ? (
                                                    <p className="mt-2 text-sm text-rose-300">{provider.lastError}</p>
                                                ) : null}
                                            </div>
                                            <div className="text-right text-sm text-slate-300">
                                                <div>Used {formatQuotaValue(provider.used)}</div>
                                                <div>Remaining {formatQuotaValue(provider.remaining)}</div>
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <div className="h-2 rounded-full bg-slate-800">
                                                <div
                                                    className="h-2 rounded-full bg-cyan-400 transition-all"
                                                    style={{ width: `${usagePercent ?? 100}%` }}
                                                />
                                            </div>
                                            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                                <span>Limit {formatQuotaValue(provider.limit)}</span>
                                                <span>{usagePercent === null ? 'Usage limit unavailable' : `${usagePercent}% used`}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Fallback chain</h3>
                            <div className="mt-4 space-y-2">
                                {fallbackChain.length === 0 ? (
                                    <p className="text-sm text-slate-400">No fallback chain is exposed yet.</p>
                                ) : fallbackChain.map((entry) => (
                                    <div key={`${entry.priority}-${entry.provider}-${entry.model ?? 'default'}`} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm">
                                        <div>
                                            <span className="font-medium text-white">{entry.priority}. {formatFallbackLabel(entry)}</span>
                                            <p className="mt-1 text-xs text-slate-500">{entry.reason}</p>
                                        </div>
                                        <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">priority {entry.priority}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}