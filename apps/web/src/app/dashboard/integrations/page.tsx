"use client";

import { useState } from 'react';
import type { ComponentType } from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@hypercode/ui';
import { Bot, Cable, Check, Copy, Download, ExternalLink, FileJson, FolderCode, Globe, Loader2, Puzzle, RefreshCcw, Settings2, Sparkles, TerminalSquare } from 'lucide-react';
import { toast } from 'sonner';
import { PageStatusBanner } from '@/components/PageStatusBanner';

import { trpc } from '@/utils/trpc';
import {
    getExternalClientRows,
    getConnectedBridgeClientRows,
    getBridgeClientEmptyStateMessage,
    getBridgeClientStatDetail,
    getIntegrationOverview,
    getInstallSurfaceRows,
    getStatusBadgeClasses,
    type StartupStatusSummary,
} from './integration-catalog';

type SupportedClient = 'claude-desktop' | 'cursor' | 'vscode';
type ClientConfigPreview = {
    client: SupportedClient;
    targetPath: string;
    existed: boolean;
    serverCount: number;
    document: Record<string, unknown>;
    json: string;
};
type ClientConfigSyncResult = ClientConfigPreview & {
    written: boolean;
};

const MCP_SYNC_CLIENTS: SupportedClient[] = ['claude-desktop', 'cursor', 'vscode'];
const CLIENT_LABELS: Record<SupportedClient, string> = {
    'claude-desktop': 'Claude Desktop',
    'cursor': 'Cursor',
    'vscode': 'VS Code',
};

function StatCard({
    title,
    value,
    detail,
    icon: Icon,
    tone,
}: {
    title: string;
    value: string;
    detail: string;
    icon: ComponentType<{ className?: string }>;
    tone: string;
}) {
    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5 flex items-start justify-between gap-4">
                <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">{title}</div>
                    <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
                    <div className="mt-1 text-sm text-zinc-400">{detail}</div>
                </div>
                <div className={`rounded-full border border-zinc-800 bg-zinc-950 p-3 ${tone}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </CardContent>
        </Card>
    );
}

export default function IntegrationsDashboard() {
    const [copiedActionId, setCopiedActionId] = useState<string | null>(null);
    const [selectedSyncClient, setSelectedSyncClient] = useState<SupportedClient>('claude-desktop');
    const mcpServersClient = trpc.mcpServers as any;
    const toolsClient = trpc.tools as any;

    const startupStatusQuery = trpc.startupStatus.useQuery(undefined, { refetchInterval: 10000 });
    const browserStatusQuery = trpc.browser.status.useQuery(undefined, { refetchInterval: 5000 });
    const syncTargetsQuery = mcpServersClient.syncTargets.useQuery();
    const cliDetectionsQuery = toolsClient?.detectCliHarnesses?.useQuery
        ? toolsClient.detectCliHarnesses.useQuery()
        : ({ data: [], isLoading: false } as { data: []; isLoading: boolean });
    const installArtifactsQuery = toolsClient?.detectInstallSurfaces?.useQuery
        ? toolsClient.detectInstallSurfaces.useQuery(undefined, { refetchInterval: 10000 })
        : ({ data: [], isLoading: false } as { data: []; isLoading: boolean });
    const startupStatus: StartupStatusSummary | null = (startupStatusQuery.data ?? null) as StartupStatusSummary | null;
    const previewQuery = mcpServersClient.exportClientConfig.useQuery(
        { client: selectedSyncClient },
        { enabled: true },
    ) as {
        data?: ClientConfigPreview;
        isLoading: boolean;
        isRefetching: boolean;
        refetch: () => Promise<unknown>;
    };
    const syncMutation = mcpServersClient.syncClientConfig.useMutation({
        onSuccess: (result: ClientConfigSyncResult) => {
            toast.success(`Synced ${CLIENT_LABELS[result.client]} config to ${result.targetPath}`);
            void syncTargetsQuery.refetch();
            void previewQuery.refetch();
        },
        onError: (error: Error) => {
            toast.error(`Sync failed: ${error.message}`);
        },
    }) as {
        isPending: boolean;
        mutate: (input: { client: SupportedClient }) => void;
    };
    const previewErrorMessage = (previewQuery as { error?: { message?: string } }).error?.message ?? null;
    const startupStatusUnavailable = startupStatusQuery.isError || (startupStatusQuery.data !== undefined && (!startupStatusQuery.data || typeof startupStatusQuery.data !== 'object' || Array.isArray(startupStatusQuery.data)));
    const browserStatusUnavailable = browserStatusQuery.isError || (browserStatusQuery.data !== undefined && (!browserStatusQuery.data || typeof browserStatusQuery.data !== 'object' || Array.isArray(browserStatusQuery.data)));
    const syncTargetsUnavailable = syncTargetsQuery.isError || (syncTargetsQuery.data !== undefined && !Array.isArray(syncTargetsQuery.data));
    const cliDetectionsUnavailable = cliDetectionsQuery.isError || (cliDetectionsQuery.data !== undefined && !Array.isArray(cliDetectionsQuery.data));
    const installArtifactsUnavailable = installArtifactsQuery.isError || (installArtifactsQuery.data !== undefined && !Array.isArray(installArtifactsQuery.data));
    const previewUnavailable = Boolean(previewErrorMessage) || (previewQuery.data !== undefined && (!previewQuery.data || typeof previewQuery.data !== 'object' || Array.isArray(previewQuery.data) || typeof previewQuery.data.json !== 'string'));
    const safeStartupStatus = startupStatusUnavailable ? null : startupStatus;
    const safeBrowserStatus = browserStatusUnavailable ? undefined : browserStatusQuery.data;
    const safeSyncTargets = syncTargetsUnavailable ? undefined : syncTargetsQuery.data;
    const safeCliDetections = cliDetectionsUnavailable ? undefined : cliDetectionsQuery.data;
    const safeInstallArtifacts = installArtifactsUnavailable ? undefined : installArtifactsQuery.data;

    const overview = getIntegrationOverview(
        safeStartupStatus,
        safeBrowserStatus,
        safeSyncTargets,
        safeCliDetections,
    );
    const clientRows = getExternalClientRows(safeSyncTargets);
    const connectedBridgeClients = getConnectedBridgeClientRows(safeStartupStatus);
    const installSurfaceRows = getInstallSurfaceRows(safeInstallArtifacts);
    const selectedClientRow = clientRows.find((row) => row.id === selectedSyncClient);
    const isPreviewLoading = previewQuery.isLoading || previewQuery.isRefetching;
    const isSyncing = syncMutation.isPending;

    const isLoading = startupStatusQuery.isLoading || browserStatusQuery.isLoading || syncTargetsQuery.isLoading || cliDetectionsQuery.isLoading || installArtifactsQuery.isLoading;

    const handleCopyOperatorAction = async (surfaceId: string, value: string, successLabel: string) => {
        if (typeof navigator === 'undefined' || !navigator.clipboard) {
            toast.error('Clipboard unavailable in this browser');
            return;
        }

        try {
            await navigator.clipboard.writeText(value);
            setCopiedActionId(surfaceId);
            toast.success(`${successLabel} copied`);
            window.setTimeout(() => {
                setCopiedActionId((current) => (current === surfaceId ? null : current));
            }, 1500);
        } catch (error) {
            toast.error(`Copy failed: ${error instanceof Error ? error.message : 'Clipboard unavailable'}`);
        }
    };

    const handleSyncClient = (client: SupportedClient) => {
        setSelectedSyncClient(client);
        syncMutation.mutate({ client });
    };

    return (
        <div className="p-8 space-y-8 h-full overflow-y-auto">
            <PageStatusBanner
                status="beta"
                message="Integration Hub"
                note="Install-surface discovery, bridge readiness, and MCP client target detection are live. Full two-way browser and IDE workflow parity is still in progress."
            />
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Integration Hub</h1>
                    <p className="mt-2 max-w-3xl text-zinc-500">
                        Install HyperCode into the environments you actually use: browser bridges, VS Code, and MCP-aware clients.
                        This page centralizes extension package locations, supported MCP client sync targets, and live bridge readiness so setup is less treasure hunt, more control plane.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link href="/dashboard/browser" className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800">
                        Browser runtime
                        <ExternalLink className="h-4 w-4" />
                    </Link>
                    <Link href="/dashboard/mcp/settings" className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800">
                        MCP client sync
                        <ExternalLink className="h-4 w-4" />
                    </Link>
                    <Link href="/dashboard/mcp/ai-tools" className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800">
                        AI tools directory
                        <ExternalLink className="h-4 w-4" />
                    </Link>
                </div>
            </div>

            {startupStatusUnavailable || browserStatusUnavailable || syncTargetsUnavailable || cliDetectionsUnavailable || installArtifactsUnavailable ? (
                <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-300 space-y-1">
                    {startupStatusUnavailable ? <div>{startupStatusQuery.error?.message ?? 'Startup integration status is unavailable.'}</div> : null}
                    {browserStatusUnavailable ? <div>{browserStatusQuery.error?.message ?? 'Browser runtime status is unavailable.'}</div> : null}
                    {syncTargetsUnavailable ? <div>{syncTargetsQuery.error?.message ?? 'MCP client target detection is unavailable.'}</div> : null}
                    {cliDetectionsUnavailable ? <div>{cliDetectionsQuery.error?.message ?? 'CLI harness detection is unavailable.'}</div> : null}
                    {installArtifactsUnavailable ? <div>{installArtifactsQuery.error?.message ?? 'Install surface artifact detection is unavailable.'}</div> : null}
                </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                <StatCard
                    title="Extension bridge clients"
                    value={startupStatusUnavailable ? '—' : String(overview.extensionClientCount)}
                    detail={startupStatusUnavailable ? (startupStatusQuery.error?.message ?? 'Extension bridge status unavailable.') : getBridgeClientStatDetail(overview)}
                    icon={Cable}
                    tone="text-cyan-400"
                />
                <StatCard
                    title="Browser runtime"
                    value={browserStatusUnavailable ? 'Unavailable' : overview.browserRuntimeReady ? 'Ready' : 'Offline'}
                    detail={browserStatusUnavailable ? (browserStatusQuery.error?.message ?? 'Browser runtime status unavailable.') : `${overview.browserPageCount} active page${overview.browserPageCount === 1 ? '' : 's'} tracked`}
                    icon={Globe}
                    tone="text-emerald-400"
                />
                <StatCard
                    title="Synced MCP clients"
                    value={syncTargetsUnavailable ? '—' : String(overview.syncedClientCount)}
                    detail={syncTargetsUnavailable ? (syncTargetsQuery.error?.message ?? 'MCP sync target detection unavailable.') : 'Detected config targets with existing HyperCode-ready files'}
                    icon={Settings2}
                    tone="text-violet-400"
                />
                <StatCard
                    title="Installed CLI harnesses"
                    value={cliDetectionsUnavailable ? '—/—' : `${overview.installedHarnessCount}/${overview.totalHarnessCount}`}
                    detail={cliDetectionsUnavailable ? (cliDetectionsQuery.error?.message ?? 'CLI harness detection unavailable.') : 'Local coding harnesses discovered on PATH'}
                    icon={Bot}
                    tone="text-amber-400"
                />
                <StatCard
                    title="Execution environment"
                    value={startupStatusUnavailable ? 'Unavailable' : overview.executionPreferredShell ?? (overview.executionEnvironmentReady ? 'Ready' : 'Pending')}
                    detail={startupStatusUnavailable ? (startupStatusQuery.error?.message ?? 'Execution environment status unavailable.') : `${overview.verifiedExecutionToolCount} verified tools${overview.supportsPosixShell ? ' · POSIX available' : ''}`}
                    icon={TerminalSquare}
                    tone="text-emerald-400"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-white">Installable HyperCode surfaces</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {installArtifactsUnavailable ? (
                            <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-300">
                                {installArtifactsQuery.error?.message ?? 'Install surface artifact detection is unavailable.'}
                            </div>
                        ) : installSurfaceRows.map((surface) => (
                            <div key={surface.id} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-white">{surface.title}</span>
                                            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300">
                                                {surface.platforms}
                                            </span>
                                            <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${getStatusBadgeClasses(surface.statusTone)}`}>
                                                {surface.statusLabel}
                                            </span>
                                        </div>
                                        <div className="mt-2 text-xs text-zinc-400">Repo path</div>
                                        <div className="mt-1 font-mono text-xs text-zinc-300">{surface.repoPath}</div>
                                    </div>

                                    <Link href={surface.managementHref} className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800">
                                        {surface.managementLabel}
                                        <ExternalLink className="h-4 w-4" />
                                    </Link>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                    <div>
                                        <div className="text-[10px] uppercase tracking-wide text-zinc-500">Build / package</div>
                                        <div className="mt-1 rounded border border-zinc-800 bg-black/20 px-3 py-2 font-mono text-xs text-zinc-300">
                                            {surface.buildHint}
                                        </div>
                                        <div className="mt-3 text-[10px] uppercase tracking-wide text-zinc-500">Detected artifact</div>
                                        <div className="mt-1 rounded border border-zinc-800 bg-black/20 px-3 py-2 font-mono text-xs text-zinc-300">
                                            {surface.artifactStatus.artifactPath ?? 'Not detected yet'}
                                        </div>
                                        <div className="mt-2 text-xs text-zinc-400">{surface.artifactStatus.detail}</div>
                                        <div className="mt-3 text-[10px] uppercase tracking-wide text-zinc-500">Artifact metadata</div>
                                        <div className="mt-1 flex flex-wrap gap-2">
                                            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300">
                                                {surface.artifactVersionLabel}
                                            </span>
                                            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300">
                                                {surface.artifactKindLabel}
                                            </span>
                                            <span className={`rounded-full border px-2 py-1 text-[11px] ${getStatusBadgeClasses(surface.artifactFreshnessTone)}`}>
                                                {surface.artifactFreshnessLabel}
                                            </span>
                                        </div>
                                        <div className="mt-2 text-xs text-zinc-400">{surface.artifactUpdatedLabel}</div>
                                        <div className="mt-1 text-xs text-zinc-500">{surface.artifactTimestampLabel}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase tracking-wide text-zinc-500">Install hint</div>
                                        <div className="mt-1 rounded border border-zinc-800 bg-black/20 px-3 py-2 text-xs text-zinc-300">
                                            {surface.installHint}
                                        </div>
                                        <div className="mt-3 text-[10px] uppercase tracking-wide text-zinc-500">Next step</div>
                                        <div className="mt-1 rounded border border-zinc-800 bg-black/20 px-3 py-2 text-xs text-zinc-300">
                                            <span className="font-medium text-white">{surface.nextStepLabel}</span>
                                            <div className="mt-1 text-zinc-400">{surface.nextStepDetail}</div>
                                        </div>
                                        <div className="mt-3 text-[10px] uppercase tracking-wide text-zinc-500">Operator action</div>
                                        <div className="mt-1 rounded border border-zinc-800 bg-black/20 px-3 py-2 text-xs text-zinc-300">
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="font-medium text-white">{surface.operatorActionLabel}</span>
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
                                                    onClick={() => handleCopyOperatorAction(surface.id, surface.operatorActionValue, surface.operatorActionCopyLabel)}
                                                >
                                                    {copiedActionId === surface.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                                    {copiedActionId === surface.id ? 'Copied' : surface.operatorActionCopyLabel}
                                                </button>
                                            </div>
                                            <div className="mt-1 font-mono text-[11px] text-zinc-300 break-all">{surface.operatorActionValue}</div>
                                            <div className="mt-1 text-zinc-400">{surface.operatorActionDetail}</div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[10px] uppercase tracking-wide text-zinc-500">Exposed capabilities</div>
                                    <ul className="mt-2 grid gap-2 md:grid-cols-2">
                                        {surface.capabilities.map((capability) => (
                                            <li key={capability} className="rounded border border-zinc-800 bg-black/20 px-3 py-2 text-xs text-zinc-300">
                                                {capability}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-white">Quick routing</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-zinc-300">
                        <Link href="/dashboard/browser" className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 hover:border-zinc-700 hover:bg-zinc-950">
                            <Globe className="mt-0.5 h-4 w-4 text-cyan-400" />
                            <div>
                                <div className="font-medium text-white">Browser bridge & telemetry</div>
                                <div className="mt-1 text-xs text-zinc-400">History search, screenshots, proxy fetch, CDP debug, memory capture, and page-to-RAG ingestion.</div>
                            </div>
                        </Link>

                        <Link href="/dashboard/mcp/settings" className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 hover:border-zinc-700 hover:bg-zinc-950">
                            <Settings2 className="mt-0.5 h-4 w-4 text-violet-400" />
                            <div>
                                <div className="font-medium text-white">Client config sync</div>
                                <div className="mt-1 text-xs text-zinc-400">Preview and write HyperCode-managed MCP configs for Claude Desktop, Cursor, and VS Code.</div>
                            </div>
                        </Link>

                        <Link href="/dashboard/mcp/ai-tools" className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 hover:border-zinc-700 hover:bg-zinc-950">
                            <Sparkles className="mt-0.5 h-4 w-4 text-amber-400" />
                            <div>
                                <div className="font-medium text-white">CLI harness directory</div>
                                <div className="mt-1 text-xs text-zinc-400">See which local harnesses are installed, how many sessions are running, and which providers are connected.</div>
                            </div>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white">Connected bridge clients</CardTitle>
                </CardHeader>
                <CardContent>
                    {startupStatusUnavailable ? (
                        <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-300">
                            {startupStatusQuery.error?.message ?? 'Extension bridge status is unavailable.'}
                        </div>
                    ) : connectedBridgeClients.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-400">
                            {getBridgeClientEmptyStateMessage(overview)}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {connectedBridgeClients.map((client) => (
                                <div key={client.clientId} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-white">{client.clientName}</span>
                                                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-cyan-300">
                                                    {client.clientType}
                                                </span>
                                            </div>
                                            <div className="mt-2 text-xs text-zinc-400">
                                                {client.platform ?? 'Unknown platform'}{client.version ? ` · v${client.version}` : ''}
                                            </div>
                                        </div>
                                        <div className="text-xs text-zinc-500">Last seen {client.lastSeenLabel}</div>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Non-MCP capabilities</div>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {client.capabilities.map((capability) => (
                                                    <span key={capability} className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300">
                                                        {capability}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Advertised hook phases</div>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {client.hookPhases.map((phase) => (
                                                    <span key={phase} className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[11px] text-violet-200">
                                                        {phase}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white">Known MCP / extension client targets</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2 p-12 text-zinc-500">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Checking integration targets…
                        </div>
                    ) : syncTargetsUnavailable ? (
                        <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-300">
                            {syncTargetsQuery.error?.message ?? 'MCP client target detection is unavailable.'}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {clientRows.map((row) => (
                                <div key={row.id} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-white">{row.label}</span>
                                                <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${getStatusBadgeClasses(row.statusTone)}`}>
                                                    {row.statusLabel}
                                                </span>
                                                {row.autoSyncSupported ? (
                                                    <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-blue-300">
                                                        auto-sync supported
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="mt-2 text-xs text-zinc-500">Windows config path</div>
                                            <div className="mt-1 break-all font-mono text-xs text-zinc-300">{row.resolvedPath}</div>
                                            <div className="mt-2 text-xs text-zinc-400">{row.notes}</div>
                                            {row.autoSyncSupported && MCP_SYNC_CLIENTS.includes(row.id as SupportedClient) ? (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-[11px] text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
                                                        onClick={() => setSelectedSyncClient(row.id as SupportedClient)}
                                                    >
                                                        <FileJson className="h-3.5 w-3.5" />
                                                        Preview HyperCode config
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-[11px] text-blue-200 transition hover:border-blue-400/40 hover:bg-blue-500/20"
                                                        onClick={() => handleSyncClient(row.id as SupportedClient)}
                                                        disabled={isSyncing}
                                                    >
                                                        {isSyncing && selectedSyncClient === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                                        Add HyperCode as MCP server
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-[11px] text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
                                                        onClick={() => handleCopyOperatorAction(`sync-target-${row.id}`, row.resolvedPath, 'Copy path')}
                                                    >
                                                        {copiedActionId === `sync-target-${row.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                                        {copiedActionId === `sync-target-${row.id}` ? 'Copied' : 'Copy path'}
                                                    </button>
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                                            <FolderCode className="h-4 w-4" />
                                            {row.detected ? 'Detected on this machine' : 'Not detected from HyperCode yet'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white">Quick MCP registration</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 xl:grid-cols-[minmax(320px,420px)_1fr]">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-4">
                        <div>
                            <div className="text-sm font-medium text-white">{CLIENT_LABELS[selectedSyncClient]}</div>
                            <div className="mt-1 text-xs text-zinc-500">
                                Preview or write HyperCode-managed MCP config directly from the Integration Hub without leaving this setup flow.
                            </div>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div>
                                <div className="text-zinc-500">Target path</div>
                                <div className="break-all font-mono text-xs text-zinc-300">
                                    {selectedClientRow?.resolvedPath ?? 'Loading…'}
                                </div>
                            </div>
                            <div>
                                <div className="text-zinc-500">Current status</div>
                                <div className="text-zinc-300">
                                    {selectedClientRow?.detected ? 'Existing config detected' : 'Ready to create HyperCode-managed config'}
                                </div>
                            </div>
                            <div>
                                <div className="text-zinc-500">MCP servers included</div>
                                <div className="text-zinc-300">{previewUnavailable ? '—' : previewQuery.data?.serverCount ?? 0}</div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                onClick={() => void previewQuery.refetch()}
                                variant="outline"
                                className="border-zinc-700 hover:bg-zinc-800"
                                disabled={isPreviewLoading}
                            >
                                {isPreviewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                                Refresh preview
                            </Button>
                            <Button
                                onClick={() => handleSyncClient(selectedSyncClient)}
                                className="bg-blue-600 hover:bg-blue-500 text-white"
                                disabled={isPreviewLoading || isSyncing || syncTargetsUnavailable || previewUnavailable}
                            >
                                {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                Add HyperCode as MCP server
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-sm font-medium text-white">Generated preview</div>
                                <div className="text-xs text-zinc-500">
                                    This is the exact JSON HyperCode will merge into {CLIENT_LABELS[selectedSyncClient]}.
                                </div>
                            </div>
                            {previewUnavailable ? (
                                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs text-red-300">
                                    preview unavailable
                                </span>
                            ) : previewQuery.data?.existed ? (
                                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">
                                    merging into existing file
                                </span>
                            ) : (
                                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400">
                                    new file preview
                                </span>
                            )}
                        </div>

                        {isPreviewLoading ? (
                            <div className="flex justify-center p-12">
                                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                            </div>
                        ) : previewUnavailable ? (
                            <div className="rounded-md border border-red-900/40 bg-red-950/20 p-6 text-sm text-red-300">
                                {previewErrorMessage ?? 'Client config preview is unavailable.'}
                            </div>
                        ) : previewQuery.data ? (
                            <pre className="max-h-[520px] overflow-auto rounded-md border border-zinc-800 bg-black/30 p-4 text-xs text-zinc-200">
                                {previewQuery.data.json}
                            </pre>
                        ) : (
                            <div className="rounded-md border border-zinc-800 bg-black/20 p-6 text-sm text-zinc-500">
                                Preview unavailable.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white">What this page covers now</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3 text-sm text-zinc-300">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                        <div className="flex items-center gap-2 font-medium text-white"><Puzzle className="h-4 w-4 text-cyan-400" /> Browser & editor surfaces</div>
                        <div className="mt-2 text-xs text-zinc-400">Install roots, packaging hints, and management links for the browser bridge and VS Code extension.</div>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                        <div className="flex items-center gap-2 font-medium text-white"><Cable className="h-4 w-4 text-violet-400" /> Live readiness</div>
                        <div className="mt-2 text-xs text-zinc-400">Extension bridge clients, browser runtime readiness, MCP target detection, and local harness install state.</div>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                        <div className="flex items-center gap-2 font-medium text-white"><Settings2 className="h-4 w-4 text-amber-400" /> Next connection steps</div>
                        <div className="mt-2 text-xs text-zinc-400">Direct routes into browser runtime controls, MCP config sync, and the AI tools/provider directory.</div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
