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

type TelemetryWindowPreset = 'all' | '5m' | '15m' | '1h' | '24h';
type TelemetrySourceFilter = 'all' | 'runtime-search' | 'cached-ranking' | 'live-aggregator';
type TelemetryTriagePreset = 'errors-now' | 'runtime-failures' | 'load-incidents' | 'hydration-failures' | 'live-aggregator-focus';

type TelemetryTrendBucket = {
    start: number;
    end: number;
    label: string;
};

const INSPECTOR_TELEMETRY_FILTERS_STORAGE_KEY = 'borg.mcp.inspector.telemetryFilters.v1';
const INSPECTOR_TELEMETRY_TYPE_QUERY_KEY = 'telemetryType';
const INSPECTOR_TELEMETRY_STATUS_QUERY_KEY = 'telemetryStatus';
const INSPECTOR_TELEMETRY_WINDOW_QUERY_KEY = 'telemetryWindow';
const INSPECTOR_TELEMETRY_SOURCE_QUERY_KEY = 'telemetrySource';
const INSPECTOR_TELEMETRY_SOURCES: Array<{ value: Exclude<TelemetrySourceFilter, 'all'>; label: string }> = [
    { value: 'runtime-search', label: 'Runtime' },
    { value: 'cached-ranking', label: 'Cached' },
    { value: 'live-aggregator', label: 'Live' },
];

function resolveTelemetryWindowStart(windowPreset: TelemetryWindowPreset): number | null {
    const now = Date.now();

    if (windowPreset === '5m') {
        return now - (5 * 60 * 1000);
    }

    if (windowPreset === '15m') {
        return now - (15 * 60 * 1000);
    }

    if (windowPreset === '1h') {
        return now - (60 * 60 * 1000);
    }

    if (windowPreset === '24h') {
        return now - (24 * 60 * 60 * 1000);
    }

    return null;
}

function buildTelemetryTrendBuckets(options: {
    windowPreset: TelemetryWindowPreset;
    windowStart: number | null;
    events: ToolSelectionTelemetryEvent[];
}): TelemetryTrendBucket[] {
    if (options.events.length === 0) {
        return [];
    }

    const now = Date.now();
    const earliestEventTimestamp = Math.min(...options.events.map((event) => event.timestamp));
    const computedStart = options.windowStart ?? earliestEventTimestamp;
    const start = Math.min(computedStart, now - 1000);

    const targetBucketCount = options.windowPreset === 'all' || options.windowPreset === '24h' ? 6 : 5;
    const totalWindowMs = Math.max(60_000, now - start);
    const bucketSizeMs = Math.max(1, Math.ceil(totalWindowMs / targetBucketCount));

    return Array.from({ length: targetBucketCount }, (_value, index) => {
        const bucketStart = start + (index * bucketSizeMs);
        const bucketEnd = index === targetBucketCount - 1 ? now : Math.min(now, bucketStart + bucketSizeMs);
        const label = new Date(bucketEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return {
            start: bucketStart,
            end: bucketEnd,
            label,
        };
    });
}

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
    const [telemetryTypeFilter, setTelemetryTypeFilter] = useState<'all' | ToolSelectionTelemetryEvent['type']>('all');
    const [telemetryStatusFilter, setTelemetryStatusFilter] = useState<'all' | ToolSelectionTelemetryEvent['status']>('all');
    const [telemetryWindowFilter, setTelemetryWindowFilter] = useState<TelemetryWindowPreset>('15m');
    const [telemetrySourceFilter, setTelemetrySourceFilter] = useState<TelemetrySourceFilter>('all');
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

    const telemetryWindowStart = resolveTelemetryWindowStart(telemetryWindowFilter);
    const scopedTelemetryEvents = telemetry
        .filter((event) => telemetryWindowStart == null || event.timestamp >= telemetryWindowStart)
        .filter((event) => telemetryTypeFilter === 'all' || event.type === telemetryTypeFilter)
        .filter((event) => telemetryStatusFilter === 'all' || event.status === telemetryStatusFilter)
        .filter((event) => telemetrySourceFilter === 'all' || event.source === telemetrySourceFilter);
    const filteredTelemetry = scopedTelemetryEvents.slice(0, 12);
    const telemetrySummary = {
        total: scopedTelemetryEvents.length,
        success: scopedTelemetryEvents.filter((event) => event.status === 'success').length,
        error: scopedTelemetryEvents.filter((event) => event.status === 'error').length,
    };
    const telemetryTrendBuckets = buildTelemetryTrendBuckets({
        windowPreset: telemetryWindowFilter,
        windowStart: telemetryWindowStart,
        events: scopedTelemetryEvents,
    });
    const telemetryStatusTrend = telemetryTrendBuckets.map((bucket) => {
        const bucketEvents = scopedTelemetryEvents.filter((event) => event.timestamp >= bucket.start && event.timestamp < bucket.end);
        const successCount = bucketEvents.filter((event) => event.status === 'success').length;
        const errorCount = bucketEvents.filter((event) => event.status === 'error').length;

        return {
            label: bucket.label,
            total: bucketEvents.length,
            successCount,
            errorCount,
        };
    });
    const telemetrySourceBreakdown = INSPECTOR_TELEMETRY_SOURCES.map((source) => {
        const sourceEvents = scopedTelemetryEvents.filter((event) => event.source === source.value);
        const successCount = sourceEvents.filter((event) => event.status === 'success').length;
        const errorCount = sourceEvents.filter((event) => event.status === 'error').length;
        const errorRatePercent = sourceEvents.length > 0
            ? Math.round((errorCount / sourceEvents.length) * 100)
            : 0;
        const trend = telemetryTrendBuckets.map((bucket) => {
            const bucketEvents = sourceEvents.filter((event) => event.timestamp >= bucket.start && event.timestamp < bucket.end);
            const bucketErrorEvents = bucketEvents.filter((event) => event.status === 'error');
            // Compute which tool failed most in this bucket for tooltip hints
            const toolCounts: Record<string, number> = {};
            bucketErrorEvents.forEach((e) => {
                if (e.toolName) toolCounts[e.toolName] = (toolCounts[e.toolName] ?? 0) + 1;
            });
            const topFailingTool = Object.entries(toolCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
            const topErrorMessage = bucketErrorEvents[0]?.message;
            return {
                label: bucket.label,
                total: bucketEvents.length,
                successCount: bucketEvents.filter((event) => event.status === 'success').length,
                errorCount: bucketEvents.filter((event) => event.status === 'error').length,
                topFailingTool,
                topErrorMessage,
            };
        });

        return {
            value: source.value,
            label: source.label,
            total: sourceEvents.length,
            successCount,
            errorCount,
            errorRatePercent,
            trend,
        };
    });
    const telemetryFiltersAtDefault = telemetryTypeFilter === 'all'
        && telemetryStatusFilter === 'all'
        && telemetryWindowFilter === '15m'
        && telemetrySourceFilter === 'all';

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

    useEffect(() => {
        let hasHydratedFromUrl = false;

        const urlType = searchParams.get(INSPECTOR_TELEMETRY_TYPE_QUERY_KEY);
        const urlStatus = searchParams.get(INSPECTOR_TELEMETRY_STATUS_QUERY_KEY);
        const urlWindow = searchParams.get(INSPECTOR_TELEMETRY_WINDOW_QUERY_KEY);
        const urlSource = searchParams.get(INSPECTOR_TELEMETRY_SOURCE_QUERY_KEY);

        if (urlType && ['all', 'search', 'load', 'hydrate', 'unload'].includes(urlType)) {
            setTelemetryTypeFilter(urlType as 'all' | ToolSelectionTelemetryEvent['type']);
            hasHydratedFromUrl = true;
        }

        if (urlStatus && ['all', 'success', 'error'].includes(urlStatus)) {
            setTelemetryStatusFilter(urlStatus as 'all' | ToolSelectionTelemetryEvent['status']);
            hasHydratedFromUrl = true;
        }

        if (urlWindow && ['all', '5m', '15m', '1h', '24h'].includes(urlWindow)) {
            setTelemetryWindowFilter(urlWindow as TelemetryWindowPreset);
            hasHydratedFromUrl = true;
        }

        if (urlSource && ['all', 'runtime-search', 'cached-ranking', 'live-aggregator'].includes(urlSource)) {
            setTelemetrySourceFilter(urlSource as TelemetrySourceFilter);
            hasHydratedFromUrl = true;
        }

        if (hasHydratedFromUrl) {
            return;
        }

        try {
            const raw = window.localStorage.getItem(INSPECTOR_TELEMETRY_FILTERS_STORAGE_KEY);
            if (!raw) {
                return;
            }

            const parsed = JSON.parse(raw) as {
                type?: string;
                status?: string;
                window?: string;
                source?: string;
            };

            if (parsed.type && ['all', 'search', 'load', 'hydrate', 'unload'].includes(parsed.type)) {
                setTelemetryTypeFilter(parsed.type as 'all' | ToolSelectionTelemetryEvent['type']);
            }

            if (parsed.status && ['all', 'success', 'error'].includes(parsed.status)) {
                setTelemetryStatusFilter(parsed.status as 'all' | ToolSelectionTelemetryEvent['status']);
            }

            if (parsed.window && ['all', '5m', '15m', '1h', '24h'].includes(parsed.window)) {
                setTelemetryWindowFilter(parsed.window as TelemetryWindowPreset);
            }

            if (parsed.source && ['all', 'runtime-search', 'cached-ranking', 'live-aggregator'].includes(parsed.source)) {
                setTelemetrySourceFilter(parsed.source as TelemetrySourceFilter);
            }
        } catch {
            // Ignore invalid persisted payloads and continue with defaults.
        }
    }, [searchParams]);

    useEffect(() => {
        try {
            window.localStorage.setItem(
                INSPECTOR_TELEMETRY_FILTERS_STORAGE_KEY,
                JSON.stringify({
                    type: telemetryTypeFilter,
                    status: telemetryStatusFilter,
                    window: telemetryWindowFilter,
                    source: telemetrySourceFilter,
                }),
            );
        } catch {
            // Ignore local storage write failures.
        }
    }, [telemetryTypeFilter, telemetryStatusFilter, telemetryWindowFilter, telemetrySourceFilter]);

    useEffect(() => {
        const nextParams = new URLSearchParams(searchParams.toString());

        if (telemetryTypeFilter === 'all') {
            nextParams.delete(INSPECTOR_TELEMETRY_TYPE_QUERY_KEY);
        } else {
            nextParams.set(INSPECTOR_TELEMETRY_TYPE_QUERY_KEY, telemetryTypeFilter);
        }

        if (telemetryStatusFilter === 'all') {
            nextParams.delete(INSPECTOR_TELEMETRY_STATUS_QUERY_KEY);
        } else {
            nextParams.set(INSPECTOR_TELEMETRY_STATUS_QUERY_KEY, telemetryStatusFilter);
        }

        if (telemetryWindowFilter === '15m') {
            nextParams.delete(INSPECTOR_TELEMETRY_WINDOW_QUERY_KEY);
        } else {
            nextParams.set(INSPECTOR_TELEMETRY_WINDOW_QUERY_KEY, telemetryWindowFilter);
        }

        if (telemetrySourceFilter === 'all') {
            nextParams.delete(INSPECTOR_TELEMETRY_SOURCE_QUERY_KEY);
        } else {
            nextParams.set(INSPECTOR_TELEMETRY_SOURCE_QUERY_KEY, telemetrySourceFilter);
        }

        const currentQuery = searchParams.toString();
        const nextQuery = nextParams.toString();
        if (currentQuery === nextQuery) {
            return;
        }

        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }, [pathname, router, searchParams, telemetryTypeFilter, telemetryStatusFilter, telemetryWindowFilter, telemetrySourceFilter]);

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

    const resetTelemetryFilters = () => {
        setTelemetryTypeFilter('all');
        setTelemetryStatusFilter('all');
        setTelemetryWindowFilter('15m');
        setTelemetrySourceFilter('all');

        try {
            window.localStorage.removeItem(INSPECTOR_TELEMETRY_FILTERS_STORAGE_KEY);
        } catch {
            // Ignore local storage cleanup errors.
        }
    };

    const copyTelemetryShareLink = async () => {
        if (typeof window === 'undefined' || !navigator.clipboard) {
            toast.error('Clipboard unavailable');
            return;
        }

        const nextParams = new URLSearchParams(searchParams.toString());
        const shareUrl = `${window.location.origin}${pathname}${nextParams.toString() ? `?${nextParams.toString()}` : ''}`;

        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Share link copied');
        } catch {
            toast.error('Failed to copy share link');
        }
    };

    const applyTelemetryPreset = (preset: TelemetryTriagePreset) => {
        if (preset === 'errors-now') {
            setTelemetryTypeFilter('all');
            setTelemetryStatusFilter('error');
            setTelemetryWindowFilter('15m');
            setTelemetrySourceFilter('all');
            return;
        }

        if (preset === 'runtime-failures') {
            setTelemetryTypeFilter('all');
            setTelemetryStatusFilter('error');
            setTelemetryWindowFilter('1h');
            setTelemetrySourceFilter('runtime-search');
            return;
        }

        if (preset === 'load-incidents') {
            setTelemetryTypeFilter('load');
            setTelemetryStatusFilter('error');
            setTelemetryWindowFilter('1h');
            setTelemetrySourceFilter('all');
            return;
        }

        if (preset === 'hydration-failures') {
            setTelemetryTypeFilter('hydrate');
            setTelemetryStatusFilter('error');
            setTelemetryWindowFilter('24h');
            setTelemetrySourceFilter('all');
            return;
        }

        setTelemetryTypeFilter('all');
        setTelemetryStatusFilter('all');
        setTelemetryWindowFilter('15m');
        setTelemetrySourceFilter('live-aggregator');
    };

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
                    <div className="mb-4 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-zinc-500 uppercase tracking-wider">Presets</span>
                            {([
                                { value: 'errors-now', label: 'Errors now' },
                                { value: 'runtime-failures', label: 'Runtime failures' },
                                { value: 'load-incidents', label: 'Load incidents' },
                                { value: 'hydration-failures', label: 'Hydration failures' },
                                { value: 'live-aggregator-focus', label: 'Live aggregator' },
                            ] as const).map((preset) => (
                                <button
                                    key={`inspector-telemetry-preset-${preset.value}`}
                                    type="button"
                                    onClick={() => applyTelemetryPreset(preset.value)}
                                    className="rounded-md border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-zinc-300 transition-colors hover:bg-zinc-800"
                                    title={`Apply ${preset.label.toLowerCase()} telemetry triage preset`}
                                    aria-label={`Apply ${preset.label} telemetry triage preset`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-md border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-zinc-300">total: {telemetrySummary.total}</span>
                            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-300">success: {telemetrySummary.success}</span>
                            <span className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-red-300">errors: {telemetrySummary.error}</span>
                        </div>

                        <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Status trend ({telemetryWindowFilter})</div>
                            {telemetryStatusTrend.some((bucket) => bucket.total > 0) ? (
                                <div className="grid grid-cols-6 gap-1">
                                    {telemetryStatusTrend.map((bucket) => {
                                        const successWidth = bucket.total > 0 ? Math.round((bucket.successCount / bucket.total) * 100) : 0;
                                        const errorWidth = bucket.total > 0 ? Math.round((bucket.errorCount / bucket.total) * 100) : 0;

                                        return (
                                            <div key={`inspector-status-trend-${bucket.label}`} className="space-y-1" title={`${bucket.label} • ${bucket.successCount} ok / ${bucket.errorCount} err`}>
                                                <div className="h-2 rounded border border-zinc-800/80 bg-zinc-900/80 overflow-hidden flex">
                                                    <div className="h-full bg-emerald-500/70" style={{ width: `${successWidth}%` }} />
                                                    <div className="h-full bg-red-500/75" style={{ width: `${errorWidth}%` }} />
                                                </div>
                                                <div className="text-[9px] text-zinc-500 text-center">{bucket.label}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-xs text-zinc-500">
                                    No status trend data in the selected scope.
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Source trend breakdown</div>
                            {telemetrySourceBreakdown.some((source) => source.total > 0) ? (
                                <div className="space-y-2">
                                    {telemetrySourceBreakdown.map((source) => {
                                        if (source.total === 0) {
                                            return null;
                                        }

                                        return (
                                            <div key={`inspector-source-trend-${source.value}`} className="rounded border border-zinc-800/80 bg-zinc-900/60 p-2 space-y-1.5">
                                                <div className="flex items-center justify-between gap-2 text-[10px]">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setTelemetrySourceFilter(source.value)}
                                                            className="uppercase tracking-wider text-amber-200 hover:text-amber-100"
                                                            title={`Focus telemetry source: ${source.label}`}
                                                            aria-label={`Focus telemetry source ${source.label}`}
                                                        >
                                                            {source.label}
                                                        </button>
                                                        <span className={`rounded border px-1.5 py-0.5 ${source.errorRatePercent >= 50
                                                            ? 'border-red-500/30 bg-red-500/10 text-red-300'
                                                            : source.errorRatePercent >= 20
                                                                ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                                                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                                            }`}>
                                                            err {source.errorRatePercent}%
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-zinc-400">{source.successCount} ok / {source.errorCount} err</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setTelemetrySourceFilter(source.value);
                                                                setTelemetryStatusFilter('error');
                                                            }}
                                                            className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-red-200 transition-colors hover:bg-red-500/20"
                                                            title={`Focus ${source.label} failures`}
                                                            aria-label={`Focus failures for ${source.label}`}
                                                        >
                                                            Focus failures
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-6 gap-1">
                                                    {source.trend.map((bucket) => {
                                                        const successWidth = bucket.total > 0 ? Math.round((bucket.successCount / bucket.total) * 100) : 0;
                                                        const errorWidth = bucket.total > 0 ? Math.round((bucket.errorCount / bucket.total) * 100) : 0;

                                                        return (
                                                            <div
                                                            key={`inspector-source-trend-${source.value}-${bucket.label}`}
                                                            title={[
                                                                `${source.label} • ${bucket.label}`,
                                                                `${bucket.successCount} ok / ${bucket.errorCount} err`,
                                                                bucket.topFailingTool ? `Top failing tool: ${bucket.topFailingTool}` : null,
                                                                bucket.topErrorMessage ? `Error: ${bucket.topErrorMessage}` : null,
                                                            ].filter(Boolean).join('\n')}
                                                        >
                                                                <div className="h-1.5 rounded border border-zinc-800/80 bg-zinc-900/80 overflow-hidden flex">
                                                                    <div className="h-full bg-emerald-500/70" style={{ width: `${successWidth}%` }} />
                                                                    <div className="h-full bg-red-500/75" style={{ width: `${errorWidth}%` }} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-xs text-zinc-500">No source trend data in the selected scope.</div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-zinc-500 uppercase tracking-wider">Type</span>
                            {(['all', 'search', 'load', 'hydrate', 'unload'] as const).map((option) => {
                                const active = telemetryTypeFilter === option;
                                return (
                                    <button
                                        key={`inspector-telemetry-type-${option}`}
                                        type="button"
                                        onClick={() => setTelemetryTypeFilter(option)}
                                        className={`rounded-md border px-2 py-1 transition-colors ${active
                                            ? 'border-blue-500/50 bg-blue-500/15 text-blue-200'
                                            : 'border-zinc-700 bg-zinc-950/70 text-zinc-300 hover:bg-zinc-800'
                                            }`}
                                        title={`Filter telemetry by ${option} events`}
                                        aria-label={`Filter telemetry by ${option} events`}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-zinc-500 uppercase tracking-wider">Status</span>
                            {(['all', 'success', 'error'] as const).map((option) => {
                                const active = telemetryStatusFilter === option;
                                return (
                                    <button
                                        key={`inspector-telemetry-status-${option}`}
                                        type="button"
                                        onClick={() => setTelemetryStatusFilter(option)}
                                        className={`rounded-md border px-2 py-1 transition-colors ${active
                                            ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                                            : 'border-zinc-700 bg-zinc-950/70 text-zinc-300 hover:bg-zinc-800'
                                            }`}
                                        title={`Filter telemetry by ${option} status`}
                                        aria-label={`Filter telemetry by ${option} status`}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-zinc-500 uppercase tracking-wider">Window</span>
                            {([
                                { value: 'all', label: 'All' },
                                { value: '5m', label: '5m' },
                                { value: '15m', label: '15m' },
                                { value: '1h', label: '1h' },
                                { value: '24h', label: '24h' },
                            ] as const).map((option) => {
                                const active = telemetryWindowFilter === option.value;
                                return (
                                    <button
                                        key={`inspector-telemetry-window-${option.value}`}
                                        type="button"
                                        onClick={() => setTelemetryWindowFilter(option.value)}
                                        className={`rounded-md border px-2 py-1 transition-colors ${active
                                            ? 'border-violet-500/50 bg-violet-500/15 text-violet-200'
                                            : 'border-zinc-700 bg-zinc-950/70 text-zinc-300 hover:bg-zinc-800'
                                            }`}
                                        title={`Filter telemetry to ${option.label} window`}
                                        aria-label={`Filter telemetry to ${option.label} window`}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-zinc-500 uppercase tracking-wider">Source</span>
                            {[{ value: 'all', label: 'All' }, ...INSPECTOR_TELEMETRY_SOURCES].map((option) => {
                                const optionValue = option.value as TelemetrySourceFilter;
                                const active = telemetrySourceFilter === optionValue;
                                return (
                                    <button
                                        key={`inspector-telemetry-source-${option.value}`}
                                        type="button"
                                        onClick={() => setTelemetrySourceFilter(optionValue)}
                                        className={`rounded-md border px-2 py-1 transition-colors ${active
                                            ? 'border-amber-500/50 bg-amber-500/15 text-amber-200'
                                            : 'border-zinc-700 bg-zinc-950/70 text-zinc-300 hover:bg-zinc-800'
                                            }`}
                                        title={`Filter telemetry to ${option.label} source`}
                                        aria-label={`Filter telemetry to ${option.label} source`}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}

                            <button
                                type="button"
                                onClick={resetTelemetryFilters}
                                disabled={telemetryFiltersAtDefault}
                                className="ml-auto rounded-md border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
                                title="Reset telemetry filters to defaults"
                                aria-label="Reset telemetry filters"
                            >
                                Reset filters
                            </button>

                            <button
                                type="button"
                                onClick={copyTelemetryShareLink}
                                className="rounded-md border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-zinc-300 transition-colors hover:bg-zinc-800"
                                title="Copy URL with current inspector telemetry filters"
                                aria-label="Copy inspector telemetry share link"
                            >
                                Copy link
                            </button>
                        </div>
                    </div>

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
