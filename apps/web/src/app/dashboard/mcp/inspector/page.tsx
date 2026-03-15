"use client";

import { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from "@borg/ui";
import { Button } from "@borg/ui";
import { Loader2, Play, Wrench, Search, ChevronRight, Layers, Database, ExternalLink, Link2, Activity, ArrowDownToLine, Sparkles, Trash2, Clock, Zap, AlertTriangle } from "lucide-react";
import { TrafficInspector } from '@/components/TrafficInspector';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';

type InspectorTool = {
    name: string;
    description: string;
    server: string;
    inputSchema: Record<string, unknown> | null;
    always_on?: boolean;
};

type WorkingSetTool = {
    name: string;
    hydrated: boolean;
    lastLoadedAt: number;
    lastHydratedAt: number | null;
    lastAccessedAt: number;
};

type ToolSelectionTelemetryEvent = {
    id: string;
    type: 'search' | 'load' | 'hydrate' | 'unload';
    timestamp: number;
    query?: string;
    profile?: string;
    source?: 'runtime-search' | 'cached-ranking' | 'live-aggregator';
    resultCount?: number;
    topResultName?: string;
    topMatchReason?: string;
    topScore?: number;
    secondResultName?: string;
    secondScore?: number;
    scoreGap?: number;
    toolName?: string;
    status: 'success' | 'error';
    message?: string;
    evictedTools?: string[];
    latencyMs?: number;
    autoLoadReason?: string;
    autoLoadConfidence?: number;
    autoLoadEvaluated?: boolean;
    autoLoadOutcome?: 'loaded' | 'skipped' | 'not-applicable';
    autoLoadSkipReason?: string;
    autoLoadMinConfidence?: number;
    autoLoadExecutionStatus?: 'success' | 'error' | 'not-attempted';
    autoLoadExecutionError?: string;
};

type EvictionEvent = {
    toolName: string;
    timestamp: number;
    tier: 'loaded' | 'hydrated';
    idleEvicted: boolean;
    idleDurationMs: number;
};

type ToolPreferences = {
    importantTools: string[];
    alwaysLoadedTools: string[];
    autoLoadMinConfidence: number;
    maxLoadedTools?: number;
    maxHydratedSchemas?: number;
    idleEvictionThresholdMs?: number;
};

type ToolPreferenceMutationInput = {
    importantTools?: string[];
    alwaysLoadedTools?: string[];
    autoLoadMinConfidence?: number;
    maxLoadedTools?: number;
    maxHydratedSchemas?: number;
    idleEvictionThresholdMs?: number;
};

type TelemetryFilter = 'all' | 'search' | 'load' | 'hydrate' | 'unload' | 'errors';

function formatRelativeTimestamp(timestamp: number | null): string {
    if (!timestamp) {
        return '—';
    }

    const deltaSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
    if (deltaSeconds < 60) {
        return `${deltaSeconds}s ago`;
    }

    const deltaMinutes = Math.round(deltaSeconds / 60);
    if (deltaMinutes < 60) {
        return `${deltaMinutes}m ago`;
    }

    const deltaHours = Math.round(deltaMinutes / 60);
    return `${deltaHours}h ago`;
}

function InspectorDashboardContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const utils = trpc.useUtils();
    const { data: tools, isLoading: isLoadingTools } = trpc.mcp.listTools.useQuery();
    const workingSetQuery = trpc.mcp.getWorkingSet.useQuery(undefined, { refetchInterval: 4000 });
    const telemetryQuery = trpc.mcp.getToolSelectionTelemetry.useQuery(undefined, { refetchInterval: 4000 });
    const preferencesQuery = trpc.mcp.getToolPreferences.useQuery();
    const evictionHistoryQuery = trpc.mcp.getWorkingSetEvictionHistory.useQuery(undefined, { refetchInterval: 6000 });
    const dbToolsQuery = trpc.tools.list.useQuery();

    const [toolFilter, setToolFilter] = useState('');
    const [telemetryFilter, setTelemetryFilter] = useState<TelemetryFilter>('all');
    const [selectedTool, setSelectedTool] = useState<InspectorTool | null>(null);
    const [argsJson, setArgsJson] = useState('{}');
    const [result, setResult] = useState<any | null>(null);
    const [hydratedSchema, setHydratedSchema] = useState<Record<string, unknown> | null>(null);
    const [maxLoadedToolsDraft, setMaxLoadedToolsDraft] = useState(16);
    const [maxHydratedSchemasDraft, setMaxHydratedSchemasDraft] = useState(8);
    const [idleEvictionThresholdDraftMs, setIdleEvictionThresholdDraftMs] = useState(5 * 60 * 1000);

    const toolList = useMemo(() => ((tools || []) as InspectorTool[]), [tools]);

    const updateSelectedToolUrl = (toolName: string | null) => {
        const params = new URLSearchParams(searchParams.toString());

        if (toolName) {
            params.set('tool', toolName);
        } else {
            params.delete('tool');
        }

        const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.replace(nextUrl, { scroll: false });
    };

    const selectTool = (tool: InspectorTool | null, options?: { updateUrl?: boolean }) => {
        setSelectedTool(tool);
        setResult(null);
        setHydratedSchema(null);
        setArgsJson('{}');

        if (options?.updateUrl !== false) {
            updateSelectedToolUrl(tool?.name ?? null);
        }
    };

    const handleCopySelectedToolLink = async () => {
        if (!selectedTool || typeof window === 'undefined' || !navigator.clipboard) {
            return;
        }

        const targetUrl = new URL(window.location.href);
        targetUrl.searchParams.set('tool', selectedTool.name);

        await navigator.clipboard.writeText(targetUrl.toString());
        toast.success('Inspector link copied');
    };

    const loadMutation = trpc.mcp.loadTool.useMutation({
        onSuccess: async (data) => {
            toast.success(data.message || 'Tool loaded');
            await utils.mcp.getWorkingSet.invalidate();
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    const unloadMutation = trpc.mcp.unloadTool.useMutation({
        onSuccess: async (data) => {
            toast.success(data.message || 'Tool unloaded');
            await utils.mcp.getWorkingSet.invalidate();
            setHydratedSchema(null);
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    const schemaMutation = trpc.mcp.getToolSchema.useMutation({
        onSuccess: async (data) => {
            setHydratedSchema((data?.inputSchema as Record<string, unknown> | null) ?? null);
            const evicted = Array.isArray(data?.evictedHydratedTools) ? data.evictedHydratedTools.length : 0;
            toast.success(evicted > 0 ? `Schema hydrated. ${evicted} older schema(s) were de-hydrated.` : 'Schema hydrated.');
            await utils.mcp.getWorkingSet.invalidate();
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    const runMutation = trpc.agent.runTool.useMutation({
        onSuccess: (data) => {
            setResult(data);
            toast.success("Tool executed successfully");
        },
        onError: (err) => {
            setResult({ error: err.message });
            toast.error("Tool execution failed");
        }
    });

    const parsedArgs = (() => {
        try {
            return { ok: true as const, value: JSON.parse(argsJson) };
        } catch (e) {
            return {
                ok: false as const,
                error: e instanceof Error ? e.message : 'Invalid JSON',
            };
        }
    })();

    const workingSet = (workingSetQuery.data?.tools || []) as WorkingSetTool[];
    const workingSetLimits = workingSetQuery.data?.limits as {
        maxLoadedTools?: number;
        maxHydratedSchemas?: number;
        idleEvictionThresholdMs?: number;
    } | undefined;
    const telemetry = (telemetryQuery.data || []) as ToolSelectionTelemetryEvent[];
    const evictionHistory = (evictionHistoryQuery.data || []) as EvictionEvent[];
    const preferences = (preferencesQuery.data as ToolPreferences | undefined) ?? {
        importantTools: [],
        alwaysLoadedTools: [],
        autoLoadMinConfidence: 0.85,
    };
    const dbTools = dbToolsQuery.data ?? [];
    const dbAlwaysOnTools = new Set(dbTools.filter((t: any) => t.always_on).map((t: any) => t.name));

    const alwaysLoadedTools = new Set(preferences.alwaysLoadedTools);
    const loadedToolNames = new Set(workingSet.map((tool) => tool.name));
    const hydratedToolNames = new Set(workingSet.filter((tool) => tool.hydrated).map((tool) => tool.name));
    const setPreferencesMutation = trpc.mcp.setToolPreferences.useMutation({
        onSuccess: async () => {
            toast.success('Always-on tool profile updated');
            await Promise.all([
                utils.mcp.getToolPreferences.invalidate(),
                utils.mcp.getWorkingSet.invalidate(),
            ]);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
    const setDbAlwaysOnMutation = trpc.tools.setAlwaysOn.useMutation({
        onSuccess: async () => {
            await Promise.all([
                dbToolsQuery.refetch(),
                utils.mcp.getWorkingSet.invalidate(),
            ]);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const clearTelemetryMutation = trpc.mcp.clearToolSelectionTelemetry.useMutation({
        onSuccess: async () => {
            toast.success('Telemetry history cleared');
            await telemetryQuery.refetch();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const clearEvictionHistoryMutation = trpc.mcp.clearWorkingSetEvictionHistory.useMutation({
        onSuccess: async () => {
            toast.success('Eviction history cleared');
            await evictionHistoryQuery.refetch();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const filteredTools = toolList.filter((tool) => {
        if (!toolFilter.trim()) return true;
        const q = toolFilter.toLowerCase();
        return String(tool.name || '').toLowerCase().includes(q) ||
            String(tool.description || '').toLowerCase().includes(q) ||
            String(tool.server || '').toLowerCase().includes(q);
    });

    const filteredTelemetry = telemetry.filter((event) => {
        if (telemetryFilter === 'all') {
            return true;
        }

        if (telemetryFilter === 'errors') {
            return event.status === 'error';
        }

        return event.type === telemetryFilter;
    }).slice(0, 12);

    useEffect(() => {
        const requestedServer = searchParams.get('server');
        const requestedMode = searchParams.get('mode');

        if (!requestedServer) {
            return;
        }

        setToolFilter((currentFilter) => {
            if (currentFilter === requestedServer) {
                return currentFilter;
            }

            if (!currentFilter || requestedMode === 'edit-tools') {
                return requestedServer;
            }

            return currentFilter;
        });
    }, [searchParams]);

    useEffect(() => {
        const requestedTool = searchParams.get('tool');
        if (toolList.length === 0) {
            return;
        }

        if (!requestedTool) {
            if (selectedTool) {
                selectTool(null, { updateUrl: false });
            }
            return;
        }

        const matchedTool = toolList.find((tool) => tool.name === requestedTool);
        if (!matchedTool) {
            if (selectedTool) {
                selectTool(null, { updateUrl: false });
            }
            return;
        }

        if (selectedTool?.name === matchedTool.name) {
            return;
        }

        selectTool(matchedTool, { updateUrl: false });
        setToolFilter((currentFilter) => currentFilter || matchedTool.name);
    }, [searchParams, selectedTool, toolList]);

    const handleRun = () => {
        if (!selectedTool) return;
        if (!parsedArgs.ok) {
            toast.error("Invalid JSON arguments");
            return;
        }
        runMutation.mutate({
            toolName: selectedTool.name,
            arguments: parsedArgs.value
        });
    };

    const selectedToolSchema = hydratedSchema ?? selectedTool?.inputSchema ?? null;
    const selectedIsLoaded = selectedTool ? loadedToolNames.has(selectedTool.name) : false;
    const selectedIsHydrated = selectedTool ? hydratedToolNames.has(selectedTool.name) : false;
    const selectedIsAlwaysLoadedConfig = selectedTool ? alwaysLoadedTools.has(selectedTool.name) : false;
    const selectedIsAlwaysLoadedDb = selectedTool ? dbAlwaysOnTools.has(selectedTool.name) : false;
    const selectedIsAlwaysLoaded = selectedIsAlwaysLoadedConfig || selectedIsAlwaysLoadedDb;

    const updateToolPreferences = (next: ToolPreferenceMutationInput) => {
        setPreferencesMutation.mutate(next as never);
    };

    const saveCapacity = () => {
        const nextMax = Math.max(4, Math.min(64, Math.round(maxLoadedToolsDraft)));
        const nextHydrated = Math.max(2, Math.min(32, Math.round(maxHydratedSchemasDraft)));
        const nextIdleEvictionThresholdMs = Math.max(10_000, Math.min(24 * 60 * 60 * 1000, Math.round(idleEvictionThresholdDraftMs)));

        setMaxLoadedToolsDraft(nextMax);
        setMaxHydratedSchemasDraft(nextHydrated);
        setIdleEvictionThresholdDraftMs(nextIdleEvictionThresholdMs);

        if (
            nextMax === (preferences.maxLoadedTools ?? 16)
            && nextHydrated === (preferences.maxHydratedSchemas ?? 8)
            && nextIdleEvictionThresholdMs === (preferences.idleEvictionThresholdMs ?? (5 * 60 * 1000))
        ) {
            return;
        }

        updateToolPreferences({
            importantTools: preferences.importantTools,
            alwaysLoadedTools: preferences.alwaysLoadedTools,
            autoLoadMinConfidence: preferences.autoLoadMinConfidence,
            maxLoadedTools: nextMax,
            maxHydratedSchemas: nextHydrated,
            idleEvictionThresholdMs: nextIdleEvictionThresholdMs,
        });
    };

    const idleEvictionThresholdMinutes = Math.max(0.17, Number((idleEvictionThresholdDraftMs / 60000).toFixed(2)));

    const toggleAlwaysLoaded = (toolName: string) => {
        const next = new Set(alwaysLoadedTools);
        const isCurrentlyOn = alwaysLoadedTools.has(toolName) || dbAlwaysOnTools.has(toolName);

        if (isCurrentlyOn) {
            next.delete(toolName);
            setDbAlwaysOnMutation.mutate({ uuid: toolName, alwaysOn: false });
        } else {
            next.add(toolName);
            setDbAlwaysOnMutation.mutate({ uuid: toolName, alwaysOn: true });
        }

        updateToolPreferences({
            importantTools: preferences.importantTools,
            alwaysLoadedTools: Array.from(next),
            autoLoadMinConfidence: preferences.autoLoadMinConfidence,
            maxLoadedTools: preferences.maxLoadedTools,
            maxHydratedSchemas: preferences.maxHydratedSchemas,
            idleEvictionThresholdMs: preferences.idleEvictionThresholdMs,
        });
    };

    useEffect(() => {
        setMaxLoadedToolsDraft(preferences.maxLoadedTools ?? 16);
        setMaxHydratedSchemasDraft(preferences.maxHydratedSchemas ?? 8);
        setIdleEvictionThresholdDraftMs(preferences.idleEvictionThresholdMs ?? (5 * 60 * 1000));
    }, [preferences.maxLoadedTools, preferences.maxHydratedSchemas, preferences.idleEvictionThresholdMs]);

    return (
        <div className="p-8 space-y-8 h-full flex flex-col">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Inspector</h1>
                    <p className="text-zinc-500">
                        Inspect tools, manage the session working set, and watch live router traffic with less guesswork and more receipts
                    </p>
                    {searchParams.get('server') ? (
                        <p className="mt-2 text-xs uppercase tracking-wider text-cyan-300">
                            Server focus: {searchParams.get('server')}
                        </p>
                    ) : null}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                        <div className="text-xs uppercase tracking-wider text-zinc-500">Aggregated tools</div>
                        <div className="mt-1 text-2xl font-semibold text-white">{tools?.length ?? 0}</div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                        <div className="text-xs uppercase tracking-wider text-zinc-500">Loaded tools</div>
                        <div className="mt-1 text-2xl font-semibold text-white">{workingSet.length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                        <div className="text-xs uppercase tracking-wider text-zinc-500">Hydrated schemas</div>
                        <div className="mt-1 text-2xl font-semibold text-white">{workingSet.filter((tool) => tool.hydrated).length}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-12 gap-6 min-h-0">
                {/* Tool Selection Sidebar */}
                <Card className="col-span-3 bg-zinc-900 border-zinc-800 flex flex-col overflow-hidden">
                    <CardHeader className="pb-3 border-b border-zinc-800">
                        <div className="space-y-3">
                            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                <Search className="h-4 w-4" /> Available Tools
                            </CardTitle>
                            <input
                                value={toolFilter}
                                onChange={(e) => setToolFilter(e.target.value)}
                                placeholder="Filter tools..."
                                title="Filter aggregated tools by name, description, or server"
                                aria-label="Filter inspector tool list"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto">
                        {isLoadingTools ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-800/50">
                                {filteredTools.map((tool) => (
                                    <button
                                        key={tool.name}
                                        onClick={() => selectTool(tool)}
                                        title={`Select ${tool.name} from ${tool.server ?? 'unknown server'} for inspection`}
                                        aria-label={`Select tool ${tool.name}`}
                                        className={`w-full text-left p-3 text-sm hover:bg-zinc-800 transition-colors flex items-center justify-between group ${selectedTool?.name === tool.name ? 'bg-blue-900/20 text-blue-400 border-l-2 border-l-blue-500' : 'text-zinc-300'
                                            }`}
                                    >
                                        <div className="truncate pr-2">
                                            <div className="font-mono">{tool.name}</div>
                                                <div className="text-xs text-zinc-500 truncate flex items-center gap-2">
                                                    <span>{tool.server ?? 'unknown'}</span>
                                                    {loadedToolNames.has(tool.name) ? <span className="text-emerald-400">• loaded</span> : null}
                                                    {hydratedToolNames.has(tool.name) ? <span className="text-purple-400">• schema</span> : null}
                                                </div>
                                        </div>
                                        <ChevronRight className={`h-4 w-4 text-zinc-600 group-hover:text-zinc-400 ${selectedTool?.name === tool.name ? 'text-blue-500' : ''
                                            }`} />
                                    </button>
                                ))}
                                {filteredTools.length === 0 && (
                                    <div className="p-4 text-xs text-zinc-500 text-center">
                                        No tools match "{toolFilter}".
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Execution Pane */}
                <Card className="col-span-6 bg-zinc-900 border-zinc-800 flex flex-col overflow-hidden">
                    {selectedTool ? (
                        <>
                            <CardHeader className="pb-4 border-b border-zinc-800">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-xl font-mono text-white flex items-center gap-2">
                                            <Wrench className="h-5 w-5 text-purple-500" />
                                            {selectedTool.name}
                                        </CardTitle>
                                        <p className="text-sm text-zinc-400 mt-1">{selectedTool.description}</p>
                                        <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider">
                                            <span className="bg-zinc-800 px-2 py-1 rounded text-zinc-400">{selectedTool.server}</span>
                                            <span className={`px-2 py-1 rounded ${selectedIsLoaded ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500'}`}>
                                                {selectedIsLoaded ? 'loaded' : 'not loaded'}
                                            </span>
                                            <span className={`px-2 py-1 rounded ${selectedIsHydrated ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20' : 'bg-zinc-800 text-zinc-500'}`}>
                                                {selectedIsHydrated ? 'schema hydrated' : 'metadata only'}
                                            </span>
                                            <span className={`px-2 py-1 rounded ${selectedIsAlwaysLoaded ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20' : 'bg-zinc-800 text-zinc-500'}`}>
                                                {selectedIsAlwaysLoaded ? 'always on' : 'standard'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap justify-end gap-2">
                                        <Button
                                            onClick={handleCopySelectedToolLink}
                                            variant="outline"
                                            title="Copy a shareable inspector URL with this tool preselected"
                                            aria-label={`Copy inspector link for ${selectedTool.name}`}
                                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                        >
                                            <Link2 className="mr-2 h-4 w-4" />
                                            Copy link
                                        </Button>
                                        <Button
                                            onClick={() => loadMutation.mutate({ name: selectedTool.name })}
                                            disabled={loadMutation.isPending}
                                            variant="outline"
                                            title="Load this tool into the active session working set"
                                            aria-label={`Load tool ${selectedTool.name}`}
                                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                        >
                                            Load
                                        </Button>
                                        <Button
                                            onClick={() => schemaMutation.mutate({ name: selectedTool.name })}
                                            disabled={schemaMutation.isPending}
                                            variant="outline"
                                            title="Hydrate and fetch full input schema for this tool"
                                            aria-label={`Hydrate schema for ${selectedTool.name}`}
                                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                        >
                                            <Database className="mr-2 h-4 w-4" />
                                            Schema
                                        </Button>
                                        <Button
                                            onClick={() => unloadMutation.mutate({ name: selectedTool.name })}
                                            disabled={unloadMutation.isPending || !selectedIsLoaded}
                                            variant="outline"
                                            title="Unload this tool from the current working set"
                                            aria-label={`Unload tool ${selectedTool.name}`}
                                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                        >
                                            Unload
                                        </Button>
                                        <Button
                                            onClick={() => toggleAlwaysLoaded(selectedTool.name)}
                                            disabled={setPreferencesMutation.isPending || setDbAlwaysOnMutation.isPending}
                                            variant="outline"
                                            title="Keep this tool warm so it is reloaded automatically into the session working set"
                                            aria-label={`${selectedIsAlwaysLoaded ? 'Disable' : 'Enable'} always-on loading for ${selectedTool.name}`}
                                            className={selectedIsAlwaysLoaded ? "border-cyan-500/30 text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20" : "border-cyan-700/50 text-cyan-500 hover:bg-cyan-950/30"}
                                        >
                                            {selectedIsAlwaysLoaded ? 'Disable always-on' : 'Enable always-on'}
                                        </Button>
                                        <Button
                                            onClick={handleRun}
                                            disabled={runMutation.isPending || !parsedArgs.ok}
                                            title="Execute the selected tool with the JSON arguments below"
                                            aria-label={`Run tool ${selectedTool.name}`}
                                            className="bg-green-600 hover:bg-green-500"
                                        >
                                            {runMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                            Run Tool
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Arguments Input */}
                                <div className="space-y-2">
                                    <label className="text-xs text-zinc-500 uppercase font-bold">Arguments (JSON)</label>
                                    <div className="relative">
                                        <textarea
                                            value={argsJson}
                                            onChange={(e) => setArgsJson(e.target.value)}
                                            title="JSON arguments payload passed to the selected tool"
                                            aria-label="Tool execution JSON arguments"
                                            className={`w-full h-40 bg-zinc-950 border rounded-md p-4 font-mono text-sm text-zinc-300 focus:ring-1 focus:ring-blue-500 outline-none resize-none ${parsedArgs.ok ? 'border-zinc-800' : 'border-red-900/50'}`}
                                        />
                                        {/* Schema Helper (Visual only for now) */}
                                        <div className="absolute top-2 right-2 text-[10px] text-zinc-600 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                                            {parsedArgs.ok ? 'JSON Valid' : 'JSON Invalid'}
                                        </div>
                                    </div>
                                    {!parsedArgs.ok && (
                                        <div className="text-xs text-red-400">{parsedArgs.error}</div>
                                    )}
                                    {selectedToolSchema && (
                                        <div className="text-xs text-zinc-500">
                                            Expected keys: <code className="bg-zinc-800 px-1 rounded">{JSON.stringify(((selectedToolSchema as { properties?: Record<string, unknown> }).properties ? Object.keys((selectedToolSchema as { properties?: Record<string, unknown> }).properties || {}) : []))}</code>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-zinc-500 uppercase font-bold">Schema Preview</label>
                                    <div className="bg-zinc-950 border border-zinc-800 rounded-md p-4 font-mono text-xs text-zinc-300 overflow-auto max-h-[240px]">
                                        <pre>{JSON.stringify(selectedToolSchema ?? { type: 'object', properties: {} }, null, 2)}</pre>
                                    </div>
                                </div>

                                {/* Results Output */}
                                <div className="space-y-2 flex-1 flex flex-col min-h-0">
                                    <label className="text-xs text-zinc-500 uppercase font-bold">Execution Result</label>
                                    <div className={`flex-1 bg-zinc-950 border border-zinc-800 rounded-md p-4 font-mono text-sm overflow-auto min-h-[200px] ${result?.error ? 'text-red-400 border-red-900/30' : 'text-green-400'
                                        }`}>
                                        {result ? (
                                            <pre>{JSON.stringify(result, null, 2)}</pre>
                                        ) : (
                                            <span className="text-zinc-600 italic">Waiting for execution...</span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4">
                            <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center">
                                <Search className="h-8 w-8 text-zinc-600" />
                            </div>
                            <p className="text-lg">Select a tool to inspect</p>
                        </div>
                    )}
                </Card>

                <Card className="col-span-3 bg-zinc-900 border-zinc-800 flex flex-col overflow-hidden">
                    <CardHeader className="pb-3 border-b border-zinc-800">
                        <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                            <Layers className="h-4 w-4" /> Session Working Set
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto space-y-0">
                        <div className="p-3 border-b border-zinc-800/70 space-y-3 bg-zinc-950/30">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded border border-zinc-800 bg-zinc-950/70 p-2">
                                    <div className="uppercase tracking-wider text-zinc-500">Loaded cap</div>
                                    <div className="mt-1 text-sm font-semibold text-white">{workingSetLimits?.maxLoadedTools ?? 0}</div>
                                </div>
                                <div className="rounded border border-zinc-800 bg-zinc-950/70 p-2">
                                    <div className="uppercase tracking-wider text-zinc-500">Schema cap</div>
                                    <div className="mt-1 text-sm font-semibold text-white">{workingSetLimits?.maxHydratedSchemas ?? 0}</div>
                                </div>
                                <div className="rounded border border-zinc-800 bg-zinc-950/70 p-2 col-span-2">
                                    <div className="uppercase tracking-wider text-zinc-500">Idle threshold</div>
                                    <div className="mt-1 text-sm font-semibold text-white">
                                        {Math.max(0.17, Number((((workingSetLimits?.idleEvictionThresholdMs ?? 0) / 60000)).toFixed(2)))} min
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">Loaded cap</span>
                                    <span className="text-xs text-zinc-300">{maxLoadedToolsDraft}</span>
                                </div>
                                <input
                                    type="range"
                                    min={4}
                                    max={64}
                                    step={1}
                                    value={maxLoadedToolsDraft}
                                    onChange={(e) => setMaxLoadedToolsDraft(Number(e.target.value))}
                                    className="w-full"
                                    title="Maximum number of loaded tools before eviction"
                                    aria-label="Maximum loaded tools"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">Schema cap</span>
                                    <span className="text-xs text-zinc-300">{maxHydratedSchemasDraft}</span>
                                </div>
                                <input
                                    type="range"
                                    min={2}
                                    max={32}
                                    step={1}
                                    value={maxHydratedSchemasDraft}
                                    onChange={(e) => setMaxHydratedSchemasDraft(Number(e.target.value))}
                                    className="w-full"
                                    title="Maximum number of hydrated schemas before eviction"
                                    aria-label="Maximum hydrated schemas"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">Idle threshold (min)</span>
                                    <span className="text-xs text-zinc-300">{idleEvictionThresholdMinutes}</span>
                                </div>
                                <input
                                    type="range"
                                    min={0.17}
                                    max={1440}
                                    step={0.01}
                                    value={idleEvictionThresholdMinutes}
                                    onChange={(e) => setIdleEvictionThresholdDraftMs(Math.round(Number(e.target.value) * 60_000))}
                                    className="w-full"
                                    title="Idle duration threshold in minutes before idle-biased eviction"
                                    aria-label="Idle eviction threshold"
                                />
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                                onClick={saveCapacity}
                                disabled={setPreferencesMutation.isPending}
                                title="Apply working-set capacity limits and idle threshold"
                                aria-label="Apply working-set capacity limits"
                            >
                                Apply capacity
                            </Button>
                        </div>

                        {workingSet.length > 0 ? (
                            <div className="divide-y divide-zinc-800/50">
                                {workingSet.map((tool) => {
                                    const idleSecs = tool.lastAccessedAt
                                        ? Math.max(0, Math.round((Date.now() - tool.lastAccessedAt) / 1000))
                                        : null;
                                    const idleLabel = idleSecs === null ? null
                                        : idleSecs < 60 ? `${idleSecs}s idle`
                                        : idleSecs < 3600 ? `${Math.round(idleSecs / 60)}m idle`
                                        : `${Math.round(idleSecs / 3600)}h idle`;
                                    const isLongIdle = idleSecs !== null && idleSecs > 300;
                                    return (
                                    <div key={tool.name} className="p-3 space-y-2">
                                        <div className="font-mono text-xs text-zinc-200 break-all">{tool.name}</div>
                                        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wider">
                                            <span className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">loaded</span>
                                            {tool.hydrated ? (
                                                <span className="bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded text-purple-300">schema</span>
                                            ) : null}
                                            {(alwaysLoadedTools.has(tool.name) || dbAlwaysOnTools.has(tool.name)) ? (
                                                <span className="bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded text-cyan-300">always on</span>
                                            ) : null}
                                            {idleLabel ? (
                                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded ${isLongIdle ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-zinc-800 text-zinc-500'}`}>
                                                    <Clock className="h-2.5 w-2.5" />{idleLabel}
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => selectTool(toolList.find((item) => item.name === tool.name) ?? null)}
                                                variant="outline"
                                                title={`Focus ${tool.name} in the inspector`}
                                                aria-label={`Focus loaded tool ${tool.name}`}
                                                className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                            >
                                                Focus
                                            </Button>
                                            <Button
                                                onClick={() => unloadMutation.mutate({ name: tool.name })}
                                                variant="outline"
                                                title={`Unload ${tool.name} from the working set`}
                                                aria-label={`Unload loaded tool ${tool.name}`}
                                                className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                            >
                                                Unload
                                            </Button>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-4 text-xs text-zinc-500 text-center">
                                No tools loaded yet. Use search or the left panel to build a working set.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                <CardHeader className="pb-3 border-b border-zinc-800 flex flex-row items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-white text-base flex items-center gap-2">
                            <Activity className="h-4 w-4 text-emerald-400" />
                            Search & working-set telemetry
                        </CardTitle>
                        <p className="text-xs text-zinc-500 mt-1">Correlate discovery, loads, schema hydration, and evictions without leaving the execution surface.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={telemetryFilter}
                            onChange={(event) => setTelemetryFilter(event.target.value as TelemetryFilter)}
                            title="Filter telemetry to specific event types or errors"
                            aria-label="Telemetry event filter"
                            className="bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-300 outline-none"
                        >
                            <option value="all">All events</option>
                            <option value="search">Searches</option>
                            <option value="load">Loads</option>
                            <option value="hydrate">Hydrations</option>
                            <option value="unload">Unloads</option>
                            <option value="errors">Errors</option>
                        </select>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={clearTelemetryMutation.isPending || telemetry.length === 0}
                            onClick={() => clearTelemetryMutation.mutate()}
                            title="Clear the current telemetry history shown in this panel"
                            aria-label="Clear inspector telemetry history"
                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                        >
                            {clearTelemetryMutation.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-2 h-3.5 w-3.5" />}
                            Clear
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="grid gap-3 lg:grid-cols-2">
                        {filteredTelemetry.length > 0 ? (
                            filteredTelemetry.map((event) => (
                                <div key={event.id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {event.type === 'search' ? <Sparkles className="h-4 w-4 text-blue-400" /> : null}
                                            {event.type === 'load' ? <ArrowDownToLine className="h-4 w-4 text-emerald-400" /> : null}
                                            {event.type === 'hydrate' ? <Database className="h-4 w-4 text-purple-400" /> : null}
                                            {event.type === 'unload' ? <Layers className="h-4 w-4 text-zinc-400" /> : null}
                                            <span className="text-xs uppercase tracking-wider text-zinc-300">{event.type}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded border ${event.status === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-300'}`}>
                                                {event.status}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-zinc-500">{formatRelativeTimestamp(event.timestamp)}</span>
                                    </div>

                    {event.query ? <div className="text-xs text-zinc-400 break-all">query: <span className="text-zinc-200">{event.query}</span></div> : null}
                                    {event.toolName ? <div className="text-xs text-zinc-400 break-all">tool: <span className="font-mono text-zinc-200">{event.toolName}</span></div> : null}
                                    {typeof event.resultCount === 'number' ? <div className="text-xs text-zinc-400">results: <span className="text-zinc-200">{event.resultCount}</span></div> : null}
                                    {event.topResultName ? <div className="text-xs text-zinc-400 break-all">top result: <span className="font-mono text-zinc-200">{event.topResultName}</span>{typeof event.topScore === 'number' ? <span className="text-zinc-500 ml-1">score {event.topScore}</span> : null}</div> : null}
                                    {typeof event.scoreGap === 'number' ? <div className="text-xs text-zinc-400">score gap: <span className="text-zinc-200">{event.scoreGap}</span></div> : null}
                                    {event.topMatchReason ? <div className="text-xs text-zinc-400">why: <span className="text-zinc-200">{event.topMatchReason}</span></div> : null}
                                    {event.profile ? <div className="text-xs text-zinc-500">profile: {event.profile}</div> : null}
                                    {event.source ? <div className="text-xs text-zinc-500">source: {event.source}</div> : null}
                                    {typeof event.latencyMs === 'number' ? <div className="text-xs text-zinc-500">latency: {event.latencyMs}ms</div> : null}
                                    {/* Auto-load decision */}
                                    {event.autoLoadEvaluated ? (
                                        <div className={`flex items-center gap-1.5 text-xs rounded px-2 py-1 ${event.autoLoadOutcome === 'loaded' ? 'bg-emerald-500/10 text-emerald-300' : event.autoLoadOutcome === 'skipped' ? 'bg-amber-500/10 text-amber-300' : 'bg-zinc-800 text-zinc-500'}`}>
                                            {event.autoLoadOutcome === 'loaded' ? <Zap className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                                            auto-load: {event.autoLoadOutcome}
                                            {typeof event.autoLoadConfidence === 'number' ? <span className="opacity-70">({(event.autoLoadConfidence * 100).toFixed(0)}% conf)</span> : null}
                                            {event.autoLoadSkipReason ? <span className="opacity-70 ml-1">— {event.autoLoadSkipReason}</span> : null}
                                        </div>
                                    ) : null}
                                    {event.evictedTools && event.evictedTools.length > 0 ? (
                                        <div className="text-xs text-amber-300 break-all">evicted: {event.evictedTools.join(', ')}</div>
                                    ) : null}
                                    {event.message ? <div className="text-xs text-zinc-500 break-all">{event.message}</div> : null}
                                </div>
                            ))
                        ) : (
                            <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-500 text-center lg:col-span-2">
                                No telemetry events match the current filter yet.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Eviction History */}
            <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                <CardHeader className="pb-3 border-b border-zinc-800 flex flex-row items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-white text-base flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-400" />
                            Working-set eviction history
                        </CardTitle>
                        <p className="text-xs text-zinc-500 mt-1">Recent tool evictions from the session working set, annotated with idle duration and eviction reason.</p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={clearEvictionHistoryMutation.isPending || evictionHistory.length === 0}
                        onClick={() => clearEvictionHistoryMutation.mutate()}
                        title="Clear the eviction history ring buffer"
                        aria-label="Clear working-set eviction history"
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                        {clearEvictionHistoryMutation.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-2 h-3.5 w-3.5" />}
                        Clear
                    </Button>
                </CardHeader>
                <CardContent className="p-4">
                    {evictionHistory.length > 0 ? (
                        <div className="grid gap-2 lg:grid-cols-3">
                            {evictionHistory.slice(0, 20).map((ev, i) => {
                                const idleSecs = Math.round(ev.idleDurationMs / 1000);
                                const idleLabel = idleSecs < 60 ? `${idleSecs}s` : idleSecs < 3600 ? `${Math.round(idleSecs / 60)}m` : `${Math.round(idleSecs / 3600)}h`;
                                return (
                                    <div key={`${ev.toolName}-${ev.timestamp}-${i}`} className={`rounded-lg border p-3 space-y-1 text-xs ${ev.idleEvicted ? 'border-amber-500/20 bg-amber-500/5' : 'border-zinc-800 bg-zinc-950/60'}`}>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`uppercase tracking-wider px-1.5 py-0.5 rounded text-[10px] ${ev.tier === 'loaded' ? 'bg-red-500/10 text-red-300' : 'bg-purple-500/10 text-purple-300'}`}>
                                                {ev.tier}
                                            </span>
                                            <span className="text-zinc-500">{formatRelativeTimestamp(ev.timestamp)}</span>
                                        </div>
                                        <div className="font-mono text-zinc-200 break-all">{ev.toolName}</div>
                                        <div className="flex items-center gap-1.5 text-zinc-400">
                                            <Clock className="h-3 w-3" />
                                            <span>idle {idleLabel}</span>
                                            {ev.idleEvicted ? <span className="text-amber-300 ml-1">• idle eviction</span> : <span className="text-zinc-500 ml-1">• capacity eviction</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-500 text-center">
                            No evictions recorded yet in this session.
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                <CardHeader className="pb-3 border-b border-zinc-800 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-white text-base">Router traffic</CardTitle>
                        <p className="text-xs text-zinc-500 mt-1">Borrowing the good idea from mcp-use: keep RPC visibility close to the execution surface.</p>
                    </div>
                    <a
                        href="/dashboard/inspector"
                        title="Open the global inspector for broader traffic and runtime diagnostics"
                        aria-label="Open global inspector"
                        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
                    >
                        Open global inspector
                        <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="min-h-[420px]">
                        <TrafficInspector />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function InspectorDashboard() {
    return (
        <Suspense fallback={<div className="p-8 text-sm text-zinc-500">Loading inspector…</div>}>
            <InspectorDashboardContent />
        </Suspense>
    );
}
