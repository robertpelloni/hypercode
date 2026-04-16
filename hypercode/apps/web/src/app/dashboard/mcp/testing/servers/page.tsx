"use client";

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@hypercode/ui';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { Activity, ExternalLink, Loader2, Play, Server, TestTube2, Waypoints, Wrench } from 'lucide-react';

import { buildServerProbeTargets, filterToolsForProbeTarget, type ServerProbeTarget } from '../server-probe-utils';

type ProbeServerSummary = {
    name: string;
    status: string;
    toolCount: number;
};

type ProbeToolSummary = {
    name: string;
    server: string;
    description: string;
};

type ProbeTrafficEvent = {
    server: string;
    method: 'tools/list' | 'tools/call';
    paramsSummary: string;
    latencyMs: number;
    success: boolean;
    timestamp: number;
    toolName?: string;
    error?: string;
};

type ProbeResult = {
    success: boolean;
    target: {
        kind: 'router' | 'server';
        displayName: string;
        serverName: string | null;
        via: string;
    };
    operation: 'tools/list' | 'tools/call';
    startedAt: number;
    endedAt: number;
    latencyMs: number;
    request: unknown;
    response: {
        summary: string;
        payload: unknown;
    };
    trafficEvents: ProbeTrafficEvent[];
};

function isProbeServerSummary(value: unknown): value is ProbeServerSummary {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { name?: unknown }).name === 'string'
        && typeof (value as { status?: unknown }).status === 'string'
        && typeof (value as { toolCount?: unknown }).toolCount === 'number';
}

function isProbeToolSummary(value: unknown): value is ProbeToolSummary {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { name?: unknown }).name === 'string'
        && typeof (value as { server?: unknown }).server === 'string'
        && typeof (value as { description?: unknown }).description === 'string';
}

function TargetStatusPill({ target }: { target: ServerProbeTarget }) {
    if (target.kind === 'router') {
        return <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-cyan-200">aggregated</span>;
    }

    const normalized = String(target.status ?? 'unknown').toLowerCase();
    const tone = normalized.includes('connected') || normalized.includes('ready')
        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
        : normalized.includes('error') || normalized.includes('failed')
            ? 'border-red-500/20 bg-red-500/10 text-red-200'
            : 'border-zinc-700 bg-zinc-800 text-zinc-300';

    return <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${tone}`}>{target.status ?? 'unknown'}</span>;
}

export default function MCPServerProbePage(): React.JSX.Element {
    return (
        <Suspense fallback={<div className="p-8 text-center text-zinc-400">Loading MCP server probe...</div>}>
            <MCPServerProbePageContent />
        </Suspense>
    );
}

function MCPServerProbePageContent(): React.JSX.Element {
    const searchParams = useSearchParams();
    const serversQuery = trpc.mcp.listServers.useQuery();
    const toolsQuery = trpc.mcp.listTools.useQuery();
    const runServerTestMutation = trpc.mcp.runServerTest.useMutation({
        onSuccess: (data: ProbeResult) => {
            toast[data.success ? 'success' : 'error'](`${data.target.displayName}: ${data.response.summary}`);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
    const serversUnavailable = serversQuery.isError
        || (serversQuery.data !== undefined && (!Array.isArray(serversQuery.data) || !serversQuery.data.every(isProbeServerSummary)));
    const toolsUnavailable = toolsQuery.isError
        || (toolsQuery.data !== undefined && (!Array.isArray(toolsQuery.data) || !toolsQuery.data.every(isProbeToolSummary)));
    const isLoadingServers = serversQuery.isLoading;
    const isLoadingTools = toolsQuery.isLoading;
    const serversErrorMessage = serversQuery.error?.message ?? 'Probe target server inventory is unavailable.';
    const toolsErrorMessage = toolsQuery.error?.message ?? 'Tool inventory is unavailable.';

    const serverList = !serversUnavailable && Array.isArray(serversQuery.data)
        ? (serversQuery.data as ProbeServerSummary[])
        : [];
    const toolList = !toolsUnavailable && Array.isArray(toolsQuery.data)
        ? (toolsQuery.data as ProbeToolSummary[])
        : [];
    const targets = useMemo(() => buildServerProbeTargets(serverList), [serverList]);

    const [selectedTargetId, setSelectedTargetId] = useState('router');
    const [operation, setOperation] = useState<'tools/list' | 'tools/call'>('tools/list');
    const [selectedToolName, setSelectedToolName] = useState('');
    const [argsJson, setArgsJson] = useState('{}');
    const [result, setResult] = useState<ProbeResult | null>(null);

    const selectedTarget = useMemo(
        () => targets.find((target) => target.id === selectedTargetId) ?? targets[0] ?? null,
        [selectedTargetId, targets],
    );

    const availableTools = useMemo(
        () => filterToolsForProbeTarget(toolList, selectedTarget),
        [selectedTarget, toolList],
    );

    useEffect(() => {
        const requestedTarget = searchParams.get('target');
        if (!requestedTarget) {
            return;
        }

        const normalizedRequestedTarget = requestedTarget === 'router' ? 'router' : `server:${requestedTarget.replace(/^server:/, '')}`;
        const matchedTarget = targets.find((target) => target.id === normalizedRequestedTarget || target.serverName === requestedTarget);
        if (matchedTarget) {
            setSelectedTargetId(matchedTarget.id);
        }
    }, [searchParams, targets]);

    useEffect(() => {
        if (operation !== 'tools/call') {
            return;
        }

        if (!availableTools.some((tool) => tool.name === selectedToolName)) {
            setSelectedToolName(availableTools[0]?.name ?? '');
        }
    }, [availableTools, operation, selectedToolName]);

    const parsedArgs = useMemo(() => {
        try {
            return { ok: true as const, value: JSON.parse(argsJson) as Record<string, unknown> };
        } catch (error) {
            return {
                ok: false as const,
                error: error instanceof Error ? error.message : 'Invalid JSON',
            };
        }
    }, [argsJson]);

    const canRunCallProbe = operation === 'tools/list' || (selectedToolName.length > 0 && parsedArgs.ok);

    const handleRunProbe = async () => {
        if (!selectedTarget) {
            return;
        }

        if (operation === 'tools/call' && !parsedArgs.ok) {
            toast.error('Tool arguments must be valid JSON.');
            return;
        }

        const probeResult = await runServerTestMutation.mutateAsync({
            targetKind: selectedTarget.kind,
            serverName: selectedTarget.serverName,
            operation,
            toolName: operation === 'tools/call' ? selectedToolName : undefined,
            args: operation === 'tools/call' && parsedArgs.ok ? parsedArgs.value : {},
        });
        setResult(probeResult as ProbeResult);
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Server probes</h1>
                    <p className="mt-2 max-w-3xl text-zinc-500">
                        Run a client-style probe against the HyperCode router or any downstream MCP server and inspect the exact request plus response payload without leaving the dashboard.
                    </p>
                </div>
                <Link
                    href="/dashboard/mcp/inspector"
                    className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
                    title="Open the broader MCP inspector and traffic surface"
                    aria-label="Open MCP inspector"
                >
                    Open inspector
                    <ExternalLink className="h-4 w-4" />
                </Link>
            </div>

            {serversUnavailable || toolsUnavailable ? (
                <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300 space-y-1">
                    {serversUnavailable ? <div>{serversErrorMessage}</div> : null}
                    {toolsUnavailable ? <div>{toolsErrorMessage}</div> : null}
                </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-zinc-800 bg-zinc-900">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs uppercase tracking-wider text-zinc-500">Probe targets</div>
                                <div className="mt-1 text-3xl font-semibold text-white">{serversUnavailable ? '—' : targets.length}</div>
                            </div>
                            <TestTube2 className="h-5 w-5 text-fuchsia-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-zinc-800 bg-zinc-900">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs uppercase tracking-wider text-zinc-500">Downstream servers</div>
                                <div className="mt-1 text-3xl font-semibold text-white">{serversUnavailable ? '—' : serverList.length}</div>
                            </div>
                            <Server className="h-5 w-5 text-blue-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-zinc-800 bg-zinc-900">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs uppercase tracking-wider text-zinc-500">Callable tools</div>
                                <div className="mt-1 text-3xl font-semibold text-white">{toolsUnavailable ? '—' : availableTools.length}</div>
                            </div>
                            <Wrench className="h-5 w-5 text-emerald-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <Card className="border-zinc-800 bg-zinc-900">
                    <CardHeader>
                        <CardTitle className="text-white text-base">Targets</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {isLoadingServers ? (
                            <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>
                        ) : serversUnavailable ? (
                            <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-300">
                                {serversErrorMessage}
                            </div>
                        ) : targets.map((target) => (
                            <button
                                key={target.id}
                                type="button"
                                onClick={() => setSelectedTargetId(target.id)}
                                className={`w-full rounded-lg border p-4 text-left transition-colors ${selectedTarget?.id === target.id ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'}`}
                                title={`Focus ${target.label} for interactive probing`}
                                aria-label={`Focus probe target ${target.label}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold text-white">{target.label}</div>
                                        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{target.description}</p>
                                    </div>
                                    <TargetStatusPill target={target} />
                                </div>
                                {target.kind === 'server' ? (
                                    <div className="mt-3 text-xs text-zinc-400">
                                        {target.toolCount ?? 0} cached tool{target.toolCount === 1 ? '' : 's'}
                                    </div>
                                ) : null}
                            </button>
                        ))}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-zinc-800 bg-zinc-900">
                        <CardHeader>
                            <CardTitle className="text-white text-base">Interactive probe</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {!selectedTarget ? (
                                <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-500">Choose a target to start probing.</div>
                            ) : (
                                <>
                                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-300">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Waypoints className="h-4 w-4 text-cyan-400" />
                                            <span className="font-semibold text-white">{selectedTarget.label}</span>
                                            <span className="text-zinc-500">via {selectedTarget.kind === 'router' ? 'HyperCode router' : 'direct downstream connection'}</span>
                                        </div>
                                        <p className="mt-2 text-xs text-zinc-500">
                                            {selectedTarget.kind === 'router'
                                                ? 'This simulates a client probing HyperCode’s aggregated router surface. Router traffic below reflects downstream calls HyperCode made on your behalf.'
                                                : 'This bypasses HyperCode’s tool-selection layer and hits the downstream server directly, which is handy when you want to separate upstream routing issues from server-specific breakage.'}
                                        </p>
                                    </div>

                                    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                                        <div>
                                            <label className="mb-1.5 block text-xs uppercase tracking-wider text-zinc-500">Operation</label>
                                            <select
                                                value={operation}
                                                onChange={(event) => setOperation(event.target.value as 'tools/list' | 'tools/call')}
                                                className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-cyan-500"
                                            >
                                                <option value="tools/list">tools/list</option>
                                                <option value="tools/call">tools/call</option>
                                            </select>
                                        </div>

                                        {operation === 'tools/call' ? (
                                            <div>
                                                <label className="mb-1.5 block text-xs uppercase tracking-wider text-zinc-500">Tool</label>
                                                <select
                                                    value={selectedToolName}
                                                    onChange={(event) => setSelectedToolName(event.target.value)}
                                                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-cyan-500"
                                                    disabled={isLoadingTools || toolsUnavailable || availableTools.length === 0}
                                                >
                                                    {toolsUnavailable ? <option value="">{toolsErrorMessage}</option> : availableTools.length === 0 ? <option value="">No tools available for this target</option> : null}
                                                    {availableTools.map((tool) => (
                                                        <option key={tool.name} value={tool.name}>{tool.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : null}
                                    </div>

                                    {operation === 'tools/call' ? (
                                        <div>
                                            <label className="mb-1.5 block text-xs uppercase tracking-wider text-zinc-500">Arguments JSON</label>
                                            <textarea
                                                value={argsJson}
                                                onChange={(event) => setArgsJson(event.target.value)}
                                                className={`h-40 w-full rounded-md border bg-zinc-950 p-3 font-mono text-sm text-white outline-none focus:ring-1 focus:ring-cyan-500 ${parsedArgs.ok ? 'border-zinc-800' : 'border-red-500/40'}`}
                                                placeholder="{}"
                                            />
                                            {!parsedArgs.ok ? <p className="mt-2 text-xs text-red-300">{parsedArgs.error}</p> : null}
                                        </div>
                                    ) : null}

                                    <div className="flex flex-wrap items-center gap-3">
                                        <Button
                                            type="button"
                                            onClick={() => void handleRunProbe()}
                                            disabled={runServerTestMutation.isPending || !canRunCallProbe}
                                            className="bg-cyan-600 text-white hover:bg-cyan-500"
                                            title="Run the selected interactive probe"
                                            aria-label="Run interactive probe"
                                        >
                                            {runServerTestMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                            Run probe
                                        </Button>
                                        <span className="text-xs text-zinc-500">The result includes request payload, response payload, latency, and any matching HyperCode router traffic captured during the probe window.</span>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-800 bg-zinc-900">
                        <CardHeader>
                            <CardTitle className="text-white text-base">Latest result</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!result ? (
                                <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-500">Run a probe to capture a request/response transcript.</div>
                            ) : (
                                <>
                                    <div className={`rounded-lg border p-4 ${result.success ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-red-500/20 bg-red-500/10'}`}>
                                        <div className="flex flex-wrap items-center gap-2 text-sm">
                                            <span className="font-semibold text-white">{result.target.displayName}</span>
                                            <span className="rounded-full border border-zinc-700 bg-zinc-900/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-300">{result.operation}</span>
                                            <span className="text-zinc-400">{result.latencyMs}ms</span>
                                        </div>
                                        <p className="mt-2 text-sm text-zinc-200">{result.response.summary}</p>
                                    </div>

                                    <div className="grid gap-4 xl:grid-cols-2">
                                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                                            <div className="text-xs uppercase tracking-wider text-zinc-500">Request</div>
                                            <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-zinc-300">{JSON.stringify(result.request, null, 2)}</pre>
                                        </div>
                                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                                            <div className="text-xs uppercase tracking-wider text-zinc-500">Response</div>
                                            <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-zinc-300">{JSON.stringify(result.response.payload, null, 2)}</pre>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="text-xs uppercase tracking-wider text-zinc-500">Matching HyperCode router traffic</div>
                                            <Link
                                                href="/dashboard/inspector"
                                                className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
                                                title="Open the global traffic inspector"
                                                aria-label="Open the global traffic inspector"
                                            >
                                                <Activity className="h-3.5 w-3.5" />
                                                Global inspector
                                            </Link>
                                        </div>
                                        {result.trafficEvents.length === 0 ? (
                                            <p className="mt-3 text-sm text-zinc-500">No HyperCode router traffic matched this probe window. Direct downstream probes only record the explicit request/response transcript above.</p>
                                        ) : (
                                            <div className="mt-3 space-y-3">
                                                {result.trafficEvents.map((event, index) => (
                                                    <div key={`${event.server}-${event.timestamp}-${index}`} className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3">
                                                        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-zinc-400">
                                                            <span className="text-white">{event.server}</span>
                                                            <span>{event.method}</span>
                                                            {event.toolName ? <span>· {event.toolName}</span> : null}
                                                            <span>{event.latencyMs}ms</span>
                                                            <span className={event.success ? 'text-emerald-300' : 'text-red-300'}>{event.success ? 'success' : 'error'}</span>
                                                        </div>
                                                        <p className="mt-2 text-sm text-zinc-300">{event.paramsSummary || event.error || 'No parameter summary captured.'}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
