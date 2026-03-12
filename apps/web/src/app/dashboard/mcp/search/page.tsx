"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from "@borg/ui";
import { Loader2, Search, Zap, Code, Layers, ExternalLink, Activity, Database, ArrowDownToLine, Sparkles, Trash2 } from "lucide-react";
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';

type SearchResult = {
    name: string;
    description: string;
    server: string;
    originalName?: string | null;
    loaded?: boolean;
    hydrated?: boolean;
    deferred?: boolean;
    requiresSchemaHydration?: boolean;
    matchReason?: string;
    score?: number;
    rank?: number;
    important?: boolean;
    alwaysShow?: boolean;
    alwaysLoaded?: boolean;
    inputSchema: Record<string, unknown> | null;
};

type WorkingSetTool = {
    name: string;
    hydrated: boolean;
    lastLoadedAt: number;
    lastHydratedAt: number | null;
};

type ToolSelectionTelemetryEvent = {
    id: string;
    type: 'search' | 'load' | 'hydrate' | 'unload';
    timestamp: number;
    query?: string;
    source?: 'runtime-search' | 'cached-ranking' | 'live-aggregator';
    resultCount?: number;
    topResultName?: string;
    topMatchReason?: string;
    toolName?: string;
    status: 'success' | 'error';
    message?: string;
    evictedTools?: string[];
};

type ToolPreferences = {
    importantTools: string[];
    alwaysLoadedTools: string[];
};

type ToolPreferenceMutationInput = {
    importantTools?: string[];
    alwaysLoadedTools?: string[];
};

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

export default function SearchDashboard() {
    const [query, setQuery] = useState('');
    const [jsoncDraft, setJsoncDraft] = useState('');
    const utils = trpc.useUtils();
    const searchQuery = trpc.mcp.searchTools.useQuery(
        { query },
        { enabled: query.trim().length > 0 },
    );
    const workingSetQuery = trpc.mcp.getWorkingSet.useQuery(undefined, { refetchInterval: 4000 });
    const telemetryQuery = trpc.mcp.getToolSelectionTelemetry.useQuery(undefined, { refetchInterval: 4000 });
    const preferencesQuery = trpc.mcp.getToolPreferences.useQuery();
    const jsoncEditorQuery = trpc.mcp.getJsoncEditor.useQuery();
    const clearTelemetryMutation = trpc.mcp.clearToolSelectionTelemetry.useMutation({
        onSuccess: async () => {
            toast.success('Telemetry history cleared');
            await telemetryQuery.refetch();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const loadMutation = trpc.mcp.loadTool.useMutation({
        onSuccess: async (data) => {
            toast.success(data.message || 'Tool loaded');
            await Promise.all([
                utils.mcp.getWorkingSet.invalidate(),
                utils.mcp.searchTools.invalidate(),
            ]);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const unloadMutation = trpc.mcp.unloadTool.useMutation({
        onSuccess: async (data) => {
            toast.success(data.message || 'Tool unloaded');
            await utils.mcp.getWorkingSet.invalidate();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const setPreferencesMutation = trpc.mcp.setToolPreferences.useMutation({
        onSuccess: async () => {
            toast.success('Important tools updated');
            await Promise.all([
                utils.mcp.getToolPreferences.invalidate(),
                utils.mcp.searchTools.invalidate(),
            ]);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const saveJsoncMutation = trpc.mcp.saveJsoncEditor.useMutation({
        onSuccess: async () => {
            toast.success('mcp.jsonc saved');
            await Promise.all([
                utils.mcp.getJsoncEditor.invalidate(),
                utils.mcp.getToolPreferences.invalidate(),
                utils.mcp.searchTools.invalidate(),
            ]);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const callToolMutation = trpc.mcp.callTool.useMutation({
        onSuccess: () => {
            toast.success('Tool invoked');
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const results = (searchQuery.data || []) as SearchResult[];
    const isLoading = searchQuery.isLoading;
    const workingSet = ((workingSetQuery.data?.tools as WorkingSetTool[] | undefined) ?? []);
    const telemetry = ((telemetryQuery.data as ToolSelectionTelemetryEvent[] | undefined) ?? []).slice(0, 12);
    const preferences = (preferencesQuery.data as ToolPreferences | undefined) ?? {
        importantTools: [],
        alwaysLoadedTools: [],
    };
    const importantTools = new Set(preferences.importantTools);
    const alwaysLoadedTools = new Set(preferences.alwaysLoadedTools);
    const loadedToolNames = new Set(workingSet.map((tool) => tool.name));
    const hydratedCount = workingSet.filter((tool) => tool.hydrated).length;

    useEffect(() => {
        if (jsoncEditorQuery.data?.content && jsoncDraft.length === 0) {
            setJsoncDraft(jsoncEditorQuery.data.content);
        }
    }, [jsoncDraft.length, jsoncEditorQuery.data?.content]);

    const updateToolPreferences = (next: ToolPreferenceMutationInput) => {
        setPreferencesMutation.mutate(next as never);
    };

    const toggleImportant = (toolName: string) => {
        const next = new Set(importantTools);
        if (next.has(toolName)) {
            next.delete(toolName);
        } else {
            next.add(toolName);
        }

        updateToolPreferences({
            importantTools: Array.from(next),
            alwaysLoadedTools: Array.from(alwaysLoadedTools),
        });
    };

    const toggleAlwaysLoaded = (toolName: string) => {
        const next = new Set(alwaysLoadedTools);
        if (next.has(toolName)) {
            next.delete(toolName);
        } else {
            next.add(toolName);
        }

        updateToolPreferences({
            importantTools: Array.from(importantTools),
            alwaysLoadedTools: Array.from(next),
        });
    };

    return (
        <div className="p-8 space-y-8 h-full flex flex-col">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Semantic Search</h1>
                    <p className="text-zinc-500">
                        Search, load, and triage tools without dumping the entire catalog into the model’s face
                    </p>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_380px] min-h-0 flex-1">
                <div className="space-y-6 min-h-0 flex flex-col">
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-white flex items-center gap-2">
                                <Search className="h-5 w-5 text-blue-400" />
                                Search tools by intent
                            </CardTitle>
                            <p className="text-sm text-zinc-500">
                                Inspired by the better inspector palettes: search should get you to the right tool fast, not ask you to babysit a giant list.
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="What do you want to achieve? e.g. process csv files"
                                    title="Search the aggregated MCP tool catalog by intent, capability, server name, and tool metadata"
                                    aria-label="Search MCP tools by intent"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 pl-12 text-base text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    autoFocus
                                />
                            </div>

                            <p className="text-xs text-zinc-500">
                                Tip: describe the outcome you want (for example, “sync issues from github repo” or “extract text from pdf”).
                                Ranking uses match reason + metadata confidence so the best candidates surface first.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                                    <div className="text-xs uppercase tracking-wider text-zinc-500">Matches</div>
                                    <div className="mt-1 text-2xl font-semibold text-white">{results.length}</div>
                                </div>
                                <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                                    <div className="text-xs uppercase tracking-wider text-zinc-500">Loaded</div>
                                    <div className="mt-1 text-2xl font-semibold text-white">{workingSet.length}</div>
                                </div>
                                <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                                    <div className="text-xs uppercase tracking-wider text-zinc-500">Hydrated schemas</div>
                                    <div className="mt-1 text-2xl font-semibold text-white">{hydratedCount}</div>
                                </div>
                                <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 md:col-span-3">
                                    <div className="text-xs uppercase tracking-wider text-zinc-500">Always-on tools</div>
                                    <div className="mt-1 text-2xl font-semibold text-white">{alwaysLoadedTools.size}</div>
                                    <div className="mt-1 text-xs text-zinc-500">Pinned warm tools auto-load into the session working set when MCP state refreshes.</div>
                                </div>
                            </div>

                            {!query && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-80">
                                    <div className="p-4 rounded border border-dashed border-zinc-800 text-sm text-zinc-500 flex items-center gap-3">
                                        <Zap className="h-4 w-4" /> “memory store tools”
                                    </div>
                                    <div className="p-4 rounded border border-dashed border-zinc-800 text-sm text-zinc-500 flex items-center gap-3">
                                        <Code className="h-4 w-4" /> “github issue search”
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800 min-h-0 flex-1 flex flex-col">
                        <CardHeader className="pb-3 border-b border-zinc-800">
                            <CardTitle className="text-white text-base">Search results</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 overflow-y-auto flex-1">
                            {isLoading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                                </div>
                            ) : results.length > 0 ? (
                                <div className="divide-y divide-zinc-800/80">
                                    {results.map((tool) => {
                                        const isLoaded = tool.loaded ?? loadedToolNames.has(tool.name);

                                        return (
                                            <div key={tool.name} className="p-5 hover:bg-zinc-950/60 transition-colors space-y-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <div className="font-mono text-blue-400 font-medium text-lg mb-1 break-all">{tool.name}</div>
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            {tool.rank ? (
                                                                <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-blue-300 uppercase tracking-wider">
                                                                    rank #{tool.rank}
                                                                </span>
                                                            ) : null}
                                                            <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 uppercase tracking-wider">
                                                                {tool.server}
                                                            </span>
                                                            {isLoaded ? (
                                                                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 uppercase tracking-wider">
                                                                    loaded
                                                                </span>
                                                            ) : null}
                                                            {tool.hydrated ? (
                                                                <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded text-purple-300 uppercase tracking-wider">
                                                                    schema ready
                                                                </span>
                                                            ) : null}
                                                            {tool.requiresSchemaHydration ? (
                                                                <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-amber-300 uppercase tracking-wider">
                                                                    metadata only
                                                                </span>
                                                            ) : null}
                                                            {(tool.alwaysLoaded || alwaysLoadedTools.has(tool.name)) ? (
                                                                <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded text-cyan-300 uppercase tracking-wider">
                                                                    always on
                                                                </span>
                                                            ) : null}
                                                            {(tool.important || importantTools.has(tool.name)) ? (
                                                                <span className="text-[10px] bg-fuchsia-500/10 border border-fuchsia-500/20 px-2 py-0.5 rounded text-fuchsia-300 uppercase tracking-wider">
                                                                    always show
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <p className="text-zinc-400 text-sm">{tool.description || 'No description available.'}</p>
                                                        <div className="mt-3 grid gap-2 text-xs text-zinc-500 md:grid-cols-2">
                                                            <div>
                                                                <span className="uppercase tracking-wider text-zinc-600">Why it matched</span>
                                                                <div className="mt-1 text-zinc-300">{tool.matchReason ?? 'matched available tool metadata'}</div>
                                                            </div>
                                                            <div>
                                                                <span className="uppercase tracking-wider text-zinc-600">Original tool</span>
                                                                <div className="mt-1 font-mono text-zinc-300 break-all">{tool.originalName || 'n/a'}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Link
                                                        href={`/dashboard/mcp/inspector?tool=${encodeURIComponent(tool.name)}`}
                                                        title="Open the MCP inspector with this tool preselected"
                                                        aria-label={`Inspect tool ${tool.name}`}
                                                        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white shrink-0"
                                                    >
                                                        Inspect
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                    </Link>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        onClick={() => loadMutation.mutate({ name: tool.name })}
                                                        disabled={loadMutation.isPending}
                                                        title="Load this tool into the active working set so it is immediately callable"
                                                        aria-label={`Load tool ${tool.name}`}
                                                        className="bg-blue-600 hover:bg-blue-500 text-white"
                                                    >
                                                        Load tool
                                                    </Button>
                                                    <Button
                                                        onClick={() => toggleImportant(tool.name)}
                                                        disabled={setPreferencesMutation.isPending}
                                                        title="Pin this tool so it is always shown in search results"
                                                        aria-label={`${(tool.important || importantTools.has(tool.name)) ? 'Unmark' : 'Mark'} tool ${tool.name} as important`}
                                                        variant="outline"
                                                        className="border-fuchsia-700 text-fuchsia-200 hover:bg-fuchsia-950/30"
                                                    >
                                                        {(tool.important || importantTools.has(tool.name)) ? 'Unmark important' : 'Mark important'}
                                                    </Button>
                                                    <Button
                                                        onClick={() => toggleAlwaysLoaded(tool.name)}
                                                        disabled={setPreferencesMutation.isPending}
                                                        title="Keep this tool warm so it auto-loads into the active working set"
                                                        aria-label={`${(tool.alwaysLoaded || alwaysLoadedTools.has(tool.name)) ? 'Stop keeping' : 'Keep'} tool ${tool.name} always loaded`}
                                                        variant="outline"
                                                        className="border-cyan-700 text-cyan-200 hover:bg-cyan-950/30"
                                                    >
                                                        {(tool.alwaysLoaded || alwaysLoadedTools.has(tool.name)) ? 'Disable always-on' : 'Keep warm'}
                                                    </Button>
                                                    <Button
                                                        onClick={() => callToolMutation.mutate({ name: tool.name, args: {} })}
                                                        disabled={callToolMutation.isPending}
                                                        title="Invoke this tool immediately with an empty/default argument payload"
                                                        aria-label={`Call tool ${tool.name} now`}
                                                        variant="outline"
                                                        className="border-emerald-700 text-emerald-200 hover:bg-emerald-950/30"
                                                    >
                                                        Call now
                                                    </Button>
                                                    <Button
                                                        onClick={() => unloadMutation.mutate({ name: tool.name })}
                                                        disabled={unloadMutation.isPending || !isLoaded}
                                                        title="Unload this tool from the current working set"
                                                        aria-label={`Unload tool ${tool.name}`}
                                                        variant="outline"
                                                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                                    >
                                                        Unload
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : query ? (
                                <div className="text-center text-zinc-500 py-12 px-6">
                                    No tools found matching “{query}”.
                                </div>
                            ) : (
                                <div className="text-center text-zinc-500 py-12 px-6">
                                    Start typing to search across available MCP capabilities.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-3 border-b border-zinc-800">
                            <CardTitle className="text-white flex items-center gap-2 text-base">
                                <Layers className="h-4 w-4 text-indigo-400" />
                                Session working set
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                                    <div className="text-xs uppercase tracking-wider text-zinc-500">Loaded cap</div>
                                    <div className="mt-1 text-xl font-semibold text-white">{workingSetQuery.data?.limits?.maxLoadedTools ?? 0}</div>
                                </div>
                                <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                                    <div className="text-xs uppercase tracking-wider text-zinc-500">Schema cap</div>
                                    <div className="mt-1 text-xl font-semibold text-white">{workingSetQuery.data?.limits?.maxHydratedSchemas ?? 0}</div>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-[420px] overflow-y-auto">
                                {workingSet.length > 0 ? (
                                    workingSet.map((tool) => (
                                        <div key={tool.name} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="font-mono text-sm text-zinc-100 break-all">{tool.name}</div>
                                                    <div className="text-xs text-zinc-500 mt-1">
                                                        loaded {formatRelativeTimestamp(tool.lastLoadedAt)}
                                                    </div>
                                                </div>
                                                {tool.hydrated ? (
                                                    <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded text-purple-300 uppercase tracking-wider">
                                                        schema ready
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 uppercase tracking-wider">
                                                        metadata only
                                                    </span>
                                                )}
                                            </div>
                                            {alwaysLoadedTools.has(tool.name) ? (
                                                <div className="text-[10px] uppercase tracking-wider text-cyan-300">Always-on profile</div>
                                            ) : null}
                                            <div className="grid grid-cols-2 gap-2">
                                                <Link
                                                    href={`/dashboard/mcp/inspector?tool=${encodeURIComponent(tool.name)}`}
                                                    title="Inspect this loaded tool"
                                                    aria-label={`Inspect loaded tool ${tool.name}`}
                                                    className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                                                >
                                                    Inspect
                                                </Link>
                                                <Button
                                                    onClick={() => unloadMutation.mutate({ name: tool.name })}
                                                    variant="outline"
                                                    title="Remove this loaded tool from the active session"
                                                    aria-label={`Unload loaded tool ${tool.name}`}
                                                    className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                                >
                                                    Unload
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-500 text-center">
                                        No tools currently loaded.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-3 border-b border-zinc-800 flex flex-row items-center justify-between gap-3">
                            <CardTitle className="text-white flex items-center gap-2 text-base">
                                <Activity className="h-4 w-4 text-emerald-400" />
                                Search & loading telemetry
                            </CardTitle>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={clearTelemetryMutation.isPending || telemetry.length === 0}
                                onClick={() => clearTelemetryMutation.mutate()}
                                title="Clear the recent search/load telemetry timeline shown in this panel"
                                aria-label="Clear MCP search telemetry history"
                                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                            >
                                {clearTelemetryMutation.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-2 h-3.5 w-3.5" />}
                                Clear
                            </Button>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="space-y-3 max-h-[420px] overflow-y-auto">
                                {telemetry.length > 0 ? (
                                    telemetry.map((event) => (
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
                                            {event.topResultName ? <div className="text-xs text-zinc-400 break-all">top result: <span className="font-mono text-zinc-200">{event.topResultName}</span></div> : null}
                                            {event.topMatchReason ? <div className="text-xs text-zinc-400">why: <span className="text-zinc-200">{event.topMatchReason}</span></div> : null}
                                            {event.source ? <div className="text-xs text-zinc-500">source: {event.source}</div> : null}
                                            {event.evictedTools && event.evictedTools.length > 0 ? (
                                                <div className="text-xs text-amber-300 break-all">evicted: {event.evictedTools.join(', ')}</div>
                                            ) : null}
                                            {event.message ? <div className="text-xs text-zinc-500 break-all">{event.message}</div> : null}
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-500 text-center">
                                        Telemetry will appear as searches, loads, hydrations, and evictions happen.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-3 border-b border-zinc-800">
                            <CardTitle className="text-white text-base">mcp.jsonc editor</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="text-xs text-zinc-500 break-all">{jsoncEditorQuery.data?.path ?? 'mcp.jsonc'}</div>
                            <textarea
                                value={jsoncDraft}
                                onChange={(event) => setJsoncDraft(event.target.value)}
                                title="Edit the Borg MCP JSONC configuration. Changes are saved to the root mcp.jsonc file."
                                aria-label="MCP JSONC configuration editor"
                                className="w-full h-48 bg-zinc-950 border border-zinc-800 rounded-md p-3 font-mono text-xs text-zinc-200 outline-none"
                                spellCheck={false}
                            />
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => saveJsoncMutation.mutate({ content: jsoncDraft })}
                                    disabled={saveJsoncMutation.isPending || jsoncDraft.trim().length < 2}
                                    title="Save JSONC changes and refresh MCP config-dependent views"
                                    aria-label="Save MCP JSONC configuration"
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white"
                                >
                                    Save JSONC
                                </Button>
                                <Button
                                    variant="outline"
                                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                    onClick={() => setJsoncDraft(jsoncEditorQuery.data?.content ?? '')}
                                    title="Discard unsaved edits and restore the latest loaded JSONC content"
                                    aria-label="Reset MCP JSONC editor to loaded content"
                                >
                                    Reset
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
