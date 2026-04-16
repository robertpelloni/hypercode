"use client";

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@hypercode/ui";
import { Badge } from "@hypercode/ui";
import { Button } from "@hypercode/ui";
import { Activity, FileText, Shield, Server, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { trpc } from '@/utils/trpc';
import { PageStatusBanner } from '@/components/PageStatusBanner';

type SystemStartupMode = {
    requestedRuntime?: string;
    activeRuntime?: string;
    requestedPort?: number;
    activePort?: number;
    portDecision?: string;
    portReason?: string;
    launchMode?: string;
    dashboardMode?: string;
    installDecision?: string;
    installReason?: string;
    buildDecision?: string;
    buildReason?: string;
    updatedAt?: string;
};

function isStartupStatusPayload(value: unknown): value is {
    ready?: boolean;
    uptime?: number;
    runtime?: { version?: string };
    startupMode?: SystemStartupMode | null;
    checks?: {
        mcpAggregator?: { liveReady?: boolean };
        configSync?: { ready?: boolean };
        memory?: { ready?: boolean };
        browser?: { ready?: boolean };
        sessionSupervisor?: { ready?: boolean };
        extensionBridge?: { ready?: boolean };
        executionEnvironment?: { ready?: boolean };
    };
    blockingReasons?: Array<{ code: string; detail?: string }>;
} {
    const candidate = value as {
        ready?: unknown;
        uptime?: unknown;
        runtime?: unknown;
        startupMode?: unknown;
        checks?: unknown;
        blockingReasons?: unknown;
    };

    const runtime = candidate?.runtime as { version?: unknown } | undefined;
    const checks = candidate?.checks as {
        mcpAggregator?: { liveReady?: unknown };
        configSync?: { ready?: unknown };
        memory?: { ready?: unknown };
        browser?: { ready?: unknown };
        sessionSupervisor?: { ready?: unknown };
        extensionBridge?: { ready?: unknown };
        executionEnvironment?: { ready?: unknown };
    } | undefined;

    return typeof value === 'object'
        && value !== null
        && (candidate.ready === undefined || typeof candidate.ready === 'boolean')
        && (candidate.uptime === undefined || typeof candidate.uptime === 'number')
        && (candidate.runtime === undefined || (
            typeof candidate.runtime === 'object'
            && candidate.runtime !== null
            && (runtime?.version === undefined || typeof runtime.version === 'string')
        ))
        && (candidate.startupMode === undefined || candidate.startupMode === null || typeof candidate.startupMode === 'object')
        && (candidate.checks === undefined || (
            typeof candidate.checks === 'object'
            && candidate.checks !== null
            && (checks?.mcpAggregator?.liveReady === undefined || typeof checks.mcpAggregator.liveReady === 'boolean')
            && (checks?.configSync?.ready === undefined || typeof checks.configSync.ready === 'boolean')
            && (checks?.memory?.ready === undefined || typeof checks.memory.ready === 'boolean')
            && (checks?.browser?.ready === undefined || typeof checks.browser.ready === 'boolean')
            && (checks?.sessionSupervisor?.ready === undefined || typeof checks.sessionSupervisor.ready === 'boolean')
            && (checks?.extensionBridge?.ready === undefined || typeof checks.extensionBridge.ready === 'boolean')
            && (checks?.executionEnvironment?.ready === undefined || typeof checks.executionEnvironment.ready === 'boolean')
        ))
        && (candidate.blockingReasons === undefined || (
            Array.isArray(candidate.blockingReasons)
            && candidate.blockingReasons.every((reason) =>
                typeof reason === 'object'
                && reason !== null
                && typeof (reason as { code?: unknown }).code === 'string'
                && (
                    (reason as { detail?: unknown }).detail === undefined
                    || typeof (reason as { detail?: unknown }).detail === 'string'
                )
            )
        ));
}

function formatUptime(seconds: number): string {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}

function getStartupModeRows(startupMode: SystemStartupMode | null | undefined): Array<{ label: string; value: string; detail?: string }> {
    if (!startupMode) {
        return [];
    }

    return [
        {
            label: 'Requested runtime',
            value: startupMode.requestedRuntime?.trim() || '—',
            detail: startupMode.activeRuntime ? `Active runtime: ${startupMode.activeRuntime}` : undefined,
        },
        {
            label: 'Launch mode',
            value: startupMode.launchMode?.trim() || '—',
            detail: startupMode.dashboardMode?.trim() ? `Dashboard: ${startupMode.dashboardMode}` : undefined,
        },
        {
            label: 'Control-plane port',
            value: typeof startupMode.activePort === 'number' ? String(startupMode.activePort) : '—',
            detail: [
                typeof startupMode.requestedPort === 'number' ? `Requested: ${startupMode.requestedPort}` : null,
                startupMode.portDecision?.trim() || null,
                startupMode.portReason?.trim() || null,
            ].filter(Boolean).join(' • ') || undefined,
        },
        {
            label: 'Install decision',
            value: startupMode.installDecision?.trim() || '—',
            detail: startupMode.installReason?.trim() || undefined,
        },
        {
            label: 'Build decision',
            value: startupMode.buildDecision?.trim() || '—',
            detail: startupMode.buildReason?.trim() || undefined,
        },
    ];
}

export default function SystemOverview() {
    const { data: startupStatus, isLoading } = trpc.startupStatus.useQuery(undefined, { refetchInterval: 10000 });
    const startupStatusUnavailable = startupStatus !== undefined && !isStartupStatusPayload(startupStatus);
    const statusData = !startupStatusUnavailable && isStartupStatusPayload(startupStatus) ? startupStatus : undefined;

    const checks = statusData?.checks;
    const startupMode = (statusData?.startupMode ?? null) as SystemStartupMode | null;
    const startupModeRows = getStartupModeRows(startupMode);
    const startupModeUpdatedAt = startupMode?.updatedAt ? Date.parse(startupMode.updatedAt) : Number.NaN;
    const subsystems: { label: string; ready: boolean | undefined }[] = [
        { label: 'MCP Aggregator', ready: checks?.mcpAggregator?.liveReady },
        { label: 'Config Sync', ready: checks?.configSync?.ready },
        { label: 'Memory', ready: checks?.memory?.ready },
        { label: 'Browser', ready: checks?.browser?.ready },
        { label: 'Session Supervisor', ready: checks?.sessionSupervisor?.ready },
        { label: 'Extension Bridge', ready: checks?.extensionBridge?.ready },
        { label: 'Execution Env', ready: checks?.executionEnvironment?.ready },
    ];

    const readyCount = subsystems.filter((s) => s.ready === true).length;
    const overallReady = statusData?.ready === true;

    return (
        <div className="p-8 space-y-8 h-full overflow-y-auto w-full max-w-[1200px] mx-auto">
            <PageStatusBanner status="beta" message="System overview aggregates subsystem readiness from the startup status contract." />

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Server className="h-8 w-8 text-violet-500" />
                        System Overview
                    </h1>
                    <p className="text-zinc-500 mt-1">
                        HyperCode operator console — subsystem health, uptime, and quick navigation.
                    </p>
                </div>
                {statusData ? (
                    <Badge className={overallReady ? 'bg-green-900 text-green-300' : 'bg-amber-900 text-amber-300'}>
                        {overallReady ? 'Ready' : 'Pending'}
                    </Badge>
                ) : null}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="pt-6 flex items-center gap-4">
                        <Clock className="h-8 w-8 text-zinc-400 shrink-0" />
                        <div>
                            <p className="text-xs text-zinc-500 uppercase tracking-wider">Uptime</p>
                            <p className="text-2xl font-bold text-white">
                                {isLoading || startupStatusUnavailable ? '—' : formatUptime(statusData?.uptime ?? 0)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="pt-6 flex items-center gap-4">
                        <Activity className="h-8 w-8 text-zinc-400 shrink-0" />
                        <div>
                            <p className="text-xs text-zinc-500 uppercase tracking-wider">Subsystems</p>
                            <p className="text-2xl font-bold text-white">
                                {isLoading || startupStatusUnavailable ? '—' : `${readyCount}/${subsystems.length}`}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="pt-6 flex items-center gap-4">
                        <Server className="h-8 w-8 text-zinc-400 shrink-0" />
                        <div>
                            <p className="text-xs text-zinc-500 uppercase tracking-wider">Version</p>
                            <p className="text-2xl font-bold text-white">
                                {isLoading || startupStatusUnavailable ? '—' : (statusData?.runtime?.version ?? '—')}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {startupStatusUnavailable ? (
                <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                    System startup status is unavailable due to malformed data.
                </div>
            ) : null}

            {startupModeRows.length > 0 ? (
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-white text-lg">Startup mode</CardTitle>
                        <CardDescription>Persisted runtime provenance from the latest HyperCode startup handoff.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {Number.isFinite(startupModeUpdatedAt) ? (
                            <div className="inline-flex rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
                                Updated {Math.max(0, Math.floor((Date.now() - startupModeUpdatedAt) / 60000)) < 1 ? 'just now' : `${Math.max(1, Math.floor((Date.now() - startupModeUpdatedAt) / 60000))}m ago`}
                            </div>
                        ) : null}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {startupModeRows.map((row) => (
                                <div key={row.label} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                                    <div className="text-[10px] uppercase tracking-wide text-zinc-500">{row.label}</div>
                                    <div className="mt-1 text-sm font-medium text-white">{row.value}</div>
                                    {row.detail ? <div className="mt-1 text-xs text-zinc-400">{row.detail}</div> : null}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            {/* Subsystem checks */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white text-lg">Subsystem Status</CardTitle>
                    <CardDescription>Real-time readiness from the startup contract.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center gap-2 text-zinc-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading...</span>
                        </div>
                    ) : startupStatusUnavailable ? (
                        <div className="text-sm text-red-300">Subsystem readiness is unavailable due to malformed data.</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {subsystems.map((sub) => (
                                <div key={sub.label} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
                                    {sub.ready === true ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                    ) : (
                                        <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                                    )}
                                    <span className="text-sm text-zinc-300">{sub.label}</span>
                                    <Badge className={`ml-auto text-xs ${sub.ready ? 'bg-green-900/50 text-green-400' : 'bg-amber-900/50 text-amber-400'}`}>
                                        {sub.ready ? 'Ready' : 'Pending'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Blocking reasons */}
            {!startupStatusUnavailable && !overallReady && statusData?.blockingReasons && statusData.blockingReasons.length > 0 && (
                <Card className="bg-amber-950/20 border-amber-800/40">
                    <CardHeader>
                        <CardTitle className="text-amber-300 text-base flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" /> Boot Pending
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-1">
                            {statusData.blockingReasons.map((reason) => (
                                <li key={reason.code} className="text-sm text-amber-200/80">
                                    <span className="font-mono text-amber-400 mr-2">[{reason.code}]</span>
                                    {reason.detail}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Navigation cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                            <Activity className="h-4 w-4 text-green-500" /> Health
                        </CardTitle>
                        <CardDescription>Server health, MCP servers, crash rates.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="outline" size="sm" className="border-zinc-700 hover:bg-zinc-800">
                            <Link href="/dashboard/health">Open Health</Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                            <FileText className="h-4 w-4 text-cyan-500" /> Logs
                        </CardTitle>
                        <CardDescription>Execution logs, tool calls, error rates.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="outline" size="sm" className="border-zinc-700 hover:bg-zinc-800">
                            <Link href="/dashboard/logs">Open Logs</Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                            <Shield className="h-4 w-4 text-indigo-500" /> Audit
                        </CardTitle>
                        <CardDescription>System audit trail for operator review.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="outline" size="sm" className="border-zinc-700 hover:bg-zinc-800">
                            <Link href="/dashboard/audit">Open Audit</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
