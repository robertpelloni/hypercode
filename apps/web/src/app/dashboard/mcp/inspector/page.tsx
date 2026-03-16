"use client";

import { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from "@borg/ui";
import { Button } from "@borg/ui";
import { Loader2, Play, Wrench, Search, ChevronRight, Layers, Database, ExternalLink, Link2, Activity, ArrowDownToLine, Sparkles, Trash2, Clock, Zap, AlertTriangle } from "lucide-react";
import { TrafficInspector } from '@/components/TrafficInspector';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { PageStatusBanner } from '@/components/PageStatusBanner';

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
    secondMatchReason?: string;
    secondScore?: number;
    scoreGap?: number;
    ignoredResultCount?: number;
    ignoredResultNames?: string[];
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
type TelemetryTriagePreset = 'errors-now' | 'runtime-failures' | 'load-incidents' | 'hydration-failures' | 'auto-load-skips' | 'live-aggregator-focus';

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
const INSPECTOR_TELEMETRY_TOOL_QUERY_KEY = 'telemetryTool';
const INSPECTOR_TELEMETRY_SEARCH_QUERY_KEY = 'telemetrySearch';
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
    // Per-tool filter — set via leaderboard "Focus errors" or source-trend tooltip inference
    const [telemetryToolFilter, setTelemetryToolFilter] = useState<string | null>(null);
    // Pagination for the event card list (12 cards per page)
    const [telemetryPage, setTelemetryPage] = useState(0);
    // Free-text search within the scoped event list (toolName, query, message, source, profile…)
    const [telemetrySearchQuery, setTelemetrySearchQuery] = useState('');
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
    // Baseline: all filters except the per-tool one — used by the leaderboard so it always shows all tools.
    const baselineScopedEvents = telemetry
        .filter((event) => telemetryWindowStart == null || event.timestamp >= telemetryWindowStart)
        .filter((event) => telemetryTypeFilter === 'all' || event.type === telemetryTypeFilter)
        .filter((event) => telemetryStatusFilter === 'all' || event.status === telemetryStatusFilter)
        .filter((event) => telemetrySourceFilter === 'all' || event.source === telemetrySourceFilter);
    const scopedTelemetryEvents = baselineScopedEvents
        .filter((event) => telemetryToolFilter == null || event.toolName === telemetryToolFilter || event.topResultName === telemetryToolFilter);
    // Free-text search applied last — searches across toolName, query, message, source, profile, topResultName, autoLoadSkipReason
    const searchedTelemetryEvents = (() => {
        const q = telemetrySearchQuery.trim().toLowerCase();
        if (!q) return scopedTelemetryEvents;
        return scopedTelemetryEvents.filter((event) => {
            return (
                (event.toolName?.toLowerCase().includes(q)) ||
                (event.topResultName?.toLowerCase().includes(q)) ||
                (event.query?.toLowerCase().includes(q)) ||
                (event.message?.toLowerCase().includes(q)) ||
                (event.source?.toLowerCase().includes(q)) ||
                (event.profile?.toLowerCase().includes(q)) ||
                (event.autoLoadSkipReason?.toLowerCase().includes(q)) ||
                (event.topMatchReason?.toLowerCase().includes(q))
            );
        });
    })();
    const TELEMETRY_PAGE_SIZE = 12;
    const telemetryTotalPages = Math.ceil(searchedTelemetryEvents.length / TELEMETRY_PAGE_SIZE);
    const filteredTelemetry = searchedTelemetryEvents.slice(
        telemetryPage * TELEMETRY_PAGE_SIZE,
        (telemetryPage + 1) * TELEMETRY_PAGE_SIZE,
    );
    const telemetrySummary = {
        total: scopedTelemetryEvents.length,
        success: scopedTelemetryEvents.filter((event) => event.status === 'success').length,
        error: scopedTelemetryEvents.filter((event) => event.status === 'error').length,
        ignoredResults: scopedTelemetryEvents.reduce((sum, event) => sum + (event.ignoredResultCount ?? 0), 0),
    };
    const telemetryConfidenceStats = scopedTelemetryEvents.reduce((accumulator, event) => {
        if (typeof event.autoLoadConfidence !== 'number') {
            return accumulator;
        }

        const confidence = Math.max(0, Math.min(1, event.autoLoadConfidence));
        const floor = Math.max(0.5, Math.min(0.99, event.autoLoadMinConfidence ?? 0.85));
        const nearFloorUpperBound = Math.max(floor, Math.min(0.99, floor + 0.08));

        accumulator.total += 1;
        accumulator.confidenceSum += confidence;

        if (typeof event.scoreGap === 'number') {
            accumulator.scoreGapCount += 1;
            accumulator.scoreGapSum += event.scoreGap;
        }

        if (confidence < floor) {
            accumulator.belowFloor += 1;
            return accumulator;
        }

        if (confidence < nearFloorUpperBound) {
            accumulator.nearFloor += 1;
            return accumulator;
        }

        accumulator.highConfidence += 1;
        return accumulator;
    }, {
        total: 0,
        belowFloor: 0,
        nearFloor: 0,
        highConfidence: 0,
        confidenceSum: 0,
        scoreGapSum: 0,
        scoreGapCount: 0,
    });
    const telemetryMeanConfidencePct = telemetryConfidenceStats.total > 0
        ? Math.round((telemetryConfidenceStats.confidenceSum / telemetryConfidenceStats.total) * 100)
        : null;
    const telemetryMeanScoreGap = telemetryConfidenceStats.scoreGapCount > 0
        ? Number((telemetryConfidenceStats.scoreGapSum / telemetryConfidenceStats.scoreGapCount).toFixed(1))
        : null;
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
    // Latency distribution over the current scope — null when no events carry latencyMs
    const telemetryLatencyStats = (() => {
        const values = scopedTelemetryEvents
            .map((e) => e.latencyMs)
            .filter((v): v is number => v != null)
            .sort((a, b) => a - b);
        if (values.length === 0) return null;
        const pct = (p: number) => values[Math.max(0, Math.ceil(values.length * p / 100) - 1)];
        return {
            count: values.length,
            min: values[0],
            max: values[values.length - 1],
            mean: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
            p50: pct(50),
            p90: pct(90),
            p99: pct(99),
        };
    })();
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
    // Compute per-tool error breakdown from BASELINE events (before tool filter) so the leaderboard
    // always shows all tools and remains usable as a pivot when a specific tool is currently focused.
    const telemetryToolBreakdown = (() => {
        const toolMap = new Map<string, { total: number; errorCount: number; successCount: number }>();
        baselineScopedEvents.forEach((event) => {
            const name = event.toolName ?? event.topResultName;
            if (!name) return;
            const existing = toolMap.get(name) ?? { total: 0, errorCount: 0, successCount: 0 };
            existing.total += 1;
            if (event.status === 'error') existing.errorCount += 1;
            else existing.successCount += 1;
            toolMap.set(name, existing);
        });
        return Array.from(toolMap.entries())
            .map(([toolName, stats]) => ({
                toolName,
                ...stats,
                errorRatePercent: Math.round((stats.errorCount / stats.total) * 100),
            }))
            .filter((t) => t.errorCount > 0)
            .sort((a, b) => b.errorCount - a.errorCount || b.errorRatePercent - a.errorRatePercent)
            .slice(0, 10);
    })();
    // Auto-load decision aggregate stats over the current scope — null when no auto-load events
    const telemetryAutoLoadStats = (() => {
        const evaluated = scopedTelemetryEvents.filter((e) => e.autoLoadEvaluated);
        if (evaluated.length === 0) return null;
        const loaded = evaluated.filter((e) => e.autoLoadOutcome === 'loaded');
        const skipped = evaluated.filter((e) => e.autoLoadOutcome === 'skipped');
        const na = evaluated.filter((e) => e.autoLoadOutcome === 'not-applicable');
        const meanConfPct = (arr: ToolSelectionTelemetryEvent[]) => {
            const withConf = arr.filter((e) => typeof e.autoLoadConfidence === 'number');
            if (withConf.length === 0) return null;
            return Math.round((withConf.reduce((sum, e) => sum + (e.autoLoadConfidence ?? 0), 0) / withConf.length) * 100);
        };
        return {
            total: evaluated.length,
            loadedCount: loaded.length,
            skippedCount: skipped.length,
            naCount: na.length,
            loadedMeanConfPct: meanConfPct(loaded),
            skippedMeanConfPct: meanConfPct(skipped),
            loadRate: Math.round((loaded.length / evaluated.length) * 100),
        };
    })();
    const telemetryAutoLoadSkipReasonBreakdown = (() => {
        const skipReasonMap = new Map<string, number>();
        scopedTelemetryEvents.forEach((event) => {
            if (event.autoLoadOutcome !== 'skipped' || !event.autoLoadSkipReason) {
                return;
            }

            skipReasonMap.set(event.autoLoadSkipReason, (skipReasonMap.get(event.autoLoadSkipReason) ?? 0) + 1);
        });

        return Array.from(skipReasonMap.entries())
            .map(([reason, count]) => ({ reason, count }))
            .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason))
            .slice(0, 5);
    })();

    // Top-failing-tool aggregation — scoped to current filter scope so operators can
    // one-click drilldown from incident overview to exact failing tool context.
    const telemetryErrorToolRows = Array.from(scopedTelemetryEvents.reduce((accumulator, event) => {
        if (event.status !== 'error' || !event.toolName) {
            return accumulator;
        }

        accumulator.set(event.toolName, (accumulator.get(event.toolName) ?? 0) + 1);
        return accumulator;
    }, new Map<string, number>()).entries())
        .map(([toolName, count]) => ({ toolName, count }))
        .sort((left, right) => right.count - left.count || left.toolName.localeCompare(right.toolName))
        .slice(0, 6);
    const telemetryAmbiguousSearchRows = scopedTelemetryEvents
        .filter((event) => event.type === 'search' && typeof event.scoreGap === 'number' && Boolean(event.secondResultName))
        .map((event) => ({
            id: event.id,
            query: event.query ?? event.topResultName ?? 'n/a',
            topResultName: event.topResultName ?? 'n/a',
            secondResultName: event.secondResultName ?? 'n/a',
            scoreGap: Number((event.scoreGap ?? 0).toFixed(1)),
            confidencePct: typeof event.autoLoadConfidence === 'number' ? Math.round(event.autoLoadConfidence * 100) : null,
            timestamp: event.timestamp,
        }))
        .sort((left, right) => left.scoreGap - right.scoreGap || right.timestamp - left.timestamp)
        .slice(0, 6);

    const telemetryFiltersAtDefault = telemetryTypeFilter === 'all'
        && telemetryStatusFilter === 'all'
        && telemetryWindowFilter === '15m'
        && telemetrySourceFilter === 'all'
        && telemetryToolFilter == null
        && telemetrySearchQuery === '';

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

        const urlTool = searchParams.get(INSPECTOR_TELEMETRY_TOOL_QUERY_KEY);
        if (urlTool) {
            setTelemetryToolFilter(urlTool);
            hasHydratedFromUrl = true;
        }

        const urlSearch = searchParams.get(INSPECTOR_TELEMETRY_SEARCH_QUERY_KEY);
        if (urlSearch) {
            setTelemetrySearchQuery(urlSearch);
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
                tool?: string;
                search?: string;
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

            if (parsed.tool) {
                setTelemetryToolFilter(parsed.tool);
            }

            if (parsed.search) {
                setTelemetrySearchQuery(parsed.search);
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
                    tool: telemetryToolFilter ?? undefined,
                    search: telemetrySearchQuery || undefined,
                }),
            );
        } catch {
            // Ignore local storage write failures.
        }
    }, [telemetryTypeFilter, telemetryStatusFilter, telemetryWindowFilter, telemetrySourceFilter, telemetryToolFilter, telemetrySearchQuery]);

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

        if (telemetryToolFilter == null) {
            nextParams.delete(INSPECTOR_TELEMETRY_TOOL_QUERY_KEY);
        } else {
            nextParams.set(INSPECTOR_TELEMETRY_TOOL_QUERY_KEY, telemetryToolFilter);
        }

        if (!telemetrySearchQuery) {
            nextParams.delete(INSPECTOR_TELEMETRY_SEARCH_QUERY_KEY);
        } else {
            nextParams.set(INSPECTOR_TELEMETRY_SEARCH_QUERY_KEY, telemetrySearchQuery);
        }

        const currentQuery = searchParams.toString();
        const nextQuery = nextParams.toString();
        if (currentQuery === nextQuery) {
            return;
        }

        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }, [pathname, router, searchParams, telemetryTypeFilter, telemetryStatusFilter, telemetryWindowFilter, telemetrySourceFilter, telemetryToolFilter, telemetrySearchQuery]);

    // Reset pagination to page 0 whenever any filter changes so stale page offsets are avoided.
    useEffect(() => {
        setTelemetryPage(0);
    }, [telemetryTypeFilter, telemetryStatusFilter, telemetryWindowFilter, telemetrySourceFilter, telemetryToolFilter, telemetrySearchQuery]);

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
        setTelemetryToolFilter(null);
        setTelemetrySearchQuery('');

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

    const copyTelemetrySummary = async () => {
        if (typeof window === 'undefined' || !navigator.clipboard) {
            toast.error('Clipboard unavailable');
            return;
        }

        const dominantSourceByVolume = telemetrySourceBreakdown
            .filter((source) => source.total > 0)
            .sort((left, right) => right.total - left.total || right.errorCount - left.errorCount)[0] ?? null;
        const dominantSourceByErrors = telemetrySourceBreakdown
            .filter((source) => source.errorCount > 0)
            .sort((left, right) => right.errorCount - left.errorCount || right.total - left.total)[0] ?? null;

        const filterSummary = [
            `type=${telemetryTypeFilter}`,
            `status=${telemetryStatusFilter}`,
            `window=${telemetryWindowFilter}`,
            `source=${telemetrySourceFilter}`,
            `tool=${telemetryToolFilter ?? 'all'}`,
            `search=${telemetrySearchQuery || 'none'}`,
        ].join(', ');
        const topFailingTools = telemetryErrorToolRows.length > 0
            ? telemetryErrorToolRows.map((row) => `${row.toolName}:${row.count}`).join(', ')
            : 'none';
        const topSkipReasons = telemetryAutoLoadSkipReasonBreakdown.length > 0
            ? telemetryAutoLoadSkipReasonBreakdown.map((row) => `${row.reason}:${row.count}`).join(', ')
            : 'none';
        const ambiguousSearchRows = telemetryAmbiguousSearchRows.length > 0
            ? telemetryAmbiguousSearchRows.slice(0, 3).map((row) => `${row.topResultName} vs ${row.secondResultName} (gap ${row.scoreGap})`).join(' | ')
            : 'none';
        const summary = [
            `MCP Inspector telemetry summary`,
            `Filters: ${filterSummary}`,
            `Events: total=${telemetrySummary.total}, success=${telemetrySummary.success}, error=${telemetrySummary.error}, ignored=${telemetrySummary.ignoredResults}`,
            `Dominant source (volume): ${dominantSourceByVolume ? `${dominantSourceByVolume.value} (${dominantSourceByVolume.total} events, ${dominantSourceByVolume.errorCount} errors)` : 'none'}`,
            `Dominant source (errors): ${dominantSourceByErrors ? `${dominantSourceByErrors.value} (${dominantSourceByErrors.errorCount} errors)` : 'none'}`,
            `Confidence: belowFloor=${telemetryConfidenceStats.belowFloor}, nearFloor=${telemetryConfidenceStats.nearFloor}, high=${telemetryConfidenceStats.highConfidence}, mean=${telemetryMeanConfidencePct ?? 'n/a'}%, meanGap=${telemetryMeanScoreGap ?? 'n/a'}`,
            `Top failing tools: ${topFailingTools}`,
            `Top skip reasons: ${topSkipReasons}`,
            `Most ambiguous searches: ${ambiguousSearchRows}`,
        ].join('\n');

        try {
            await navigator.clipboard.writeText(summary);
            toast.success('Telemetry summary copied');
        } catch {
            toast.error('Failed to copy telemetry summary');
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

        if (preset === 'auto-load-skips') {
            setTelemetryTypeFilter('search');
            setTelemetryStatusFilter('all');
            setTelemetryWindowFilter('1h');
            setTelemetrySourceFilter('cached-ranking');
            return;
        }

        setTelemetryTypeFilter('all');
        setTelemetryStatusFilter('all');
        setTelemetryWindowFilter('15m');
        setTelemetrySourceFilter('live-aggregator');
    };

    return (
        <div className="p-8 space-y-8 h-full flex flex-col">
            <PageStatusBanner status="beta" message="MCP Tool Inspector" note="Working-set management, schema inspection, and traffic tracing are active. Some telemetry columns are still being wired." />
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
                                { value: 'auto-load-skips', label: 'Auto-load skips' },
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
                            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-200">ignored results: {telemetrySummary.ignoredResults}</span>
                            {telemetryToolFilter != null && (
                                <button
                                    type="button"
                                    onClick={() => setTelemetryToolFilter(null)}
                                    className="rounded-md border border-violet-500/40 bg-violet-500/15 px-2 py-1 text-violet-200 transition-colors hover:bg-violet-500/25"
                                    title="Clear tool focus filter"
                                    aria-label="Clear tool focus filter"
                                >
                                    tool: {telemetryToolFilter} ×
                                </button>
                            )}
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

                        {telemetryToolBreakdown.length > 0 && (
                            <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                                <div className="text-[10px] uppercase tracking-wider text-zinc-500">Tool error leaderboard</div>
                                <div className="space-y-1">
                                    {telemetryToolBreakdown.map((tool) => (
                                        <div key={`inspector-tool-err-${tool.toolName}`} className="flex items-center justify-between gap-2 rounded border border-zinc-800/60 bg-zinc-900/50 px-2 py-1 text-[10px]">
                                            <div className="flex min-w-0 items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setTelemetryToolFilter(tool.toolName)}
                                                    className="truncate text-left text-zinc-200 hover:text-white"
                                                    title={`Focus telemetry on tool: ${tool.toolName}`}
                                                    aria-label={`Focus telemetry on tool ${tool.toolName}`}
                                                >
                                                    {tool.toolName}
                                                </button>
                                                <span className={`shrink-0 rounded border px-1 py-0.5 ${
                                                    tool.errorRatePercent >= 50
                                                        ? 'border-red-500/30 bg-red-500/10 text-red-300'
                                                        : tool.errorRatePercent >= 20
                                                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                                                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                                }`}>
                                                    err {tool.errorRatePercent}%
                                                </span>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2 text-zinc-400">
                                                <span>{tool.successCount} ok / {tool.errorCount} err</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setTelemetryToolFilter(tool.toolName);
                                                        setTelemetryStatusFilter('error');
                                                    }}
                                                    className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-red-200 transition-colors hover:bg-red-500/20"
                                                    title={`Focus errors for tool: ${tool.toolName}`}
                                                    aria-label={`Focus errors for ${tool.toolName}`}
                                                >
                                                    Focus errors
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {telemetryLatencyStats && (
                            <div className="space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                                    Latency statistics ({telemetryLatencyStats.count} samples)
                                </div>
                                <div className="grid grid-cols-6 gap-2">
                                    {([
                                        { label: 'min', value: telemetryLatencyStats.min },
                                        { label: 'p50', value: telemetryLatencyStats.p50 },
                                        { label: 'mean', value: telemetryLatencyStats.mean },
                                        { label: 'p90', value: telemetryLatencyStats.p90 },
                                        { label: 'p99', value: telemetryLatencyStats.p99 },
                                        { label: 'max', value: telemetryLatencyStats.max },
                                    ] as const).map(({ label, value }) => (
                                        <div key={`latency-stat-${label}`} className="text-center">
                                            <div className="text-[10px] text-zinc-500">{label}</div>
                                            <div className={`font-mono text-[11px] font-semibold ${
                                                value > 1000 ? 'text-red-300'
                                                : value > 500 ? 'text-amber-300'
                                                : 'text-emerald-300'
                                            }`}>
                                                {value}ms
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {telemetryAutoLoadStats && (
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
                                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                                    Auto-load decisions ({telemetryAutoLoadStats.total} evaluated)
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="flex flex-col items-center rounded border border-emerald-500/20 bg-emerald-500/8 p-2 gap-0.5">
                                        <span className="font-mono text-sm font-semibold text-emerald-300">{telemetryAutoLoadStats.loadedCount}</span>
                                        <span className="text-[10px] text-zinc-500">loaded</span>
                                        {telemetryAutoLoadStats.loadedMeanConfPct !== null && (
                                            <span className="text-[10px] text-emerald-400">{telemetryAutoLoadStats.loadedMeanConfPct}% conf</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-center rounded border border-amber-500/20 bg-amber-500/8 p-2 gap-0.5">
                                        <span className="font-mono text-sm font-semibold text-amber-300">{telemetryAutoLoadStats.skippedCount}</span>
                                        <span className="text-[10px] text-zinc-500">skipped</span>
                                        {telemetryAutoLoadStats.skippedMeanConfPct !== null && (
                                            <span className="text-[10px] text-amber-400">{telemetryAutoLoadStats.skippedMeanConfPct}% conf</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-center rounded border border-zinc-700 bg-zinc-800/50 p-2 gap-0.5">
                                        <span className="font-mono text-sm font-semibold text-zinc-400">{telemetryAutoLoadStats.naCount}</span>
                                        <span className="text-[10px] text-zinc-500">n/a</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                                        <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${telemetryAutoLoadStats.loadRate}%` }} />
                                    </div>
                                    <span className="text-[10px] text-zinc-500 shrink-0">{telemetryAutoLoadStats.loadRate}% load rate</span>
                                </div>

                                {telemetryAutoLoadSkipReasonBreakdown.length > 0 ? (
                                    <div className="space-y-1">
                                        <div className="text-[10px] uppercase tracking-wider text-zinc-500">Top skip reasons</div>
                                        <div className="space-y-1">
                                            {telemetryAutoLoadSkipReasonBreakdown.map((entry) => (
                                                <div key={`skip-reason-${entry.reason}`} className="flex items-center justify-between gap-2 rounded border border-zinc-800/70 bg-zinc-900/60 px-2 py-1 text-[10px]">
                                                    <span className="truncate text-zinc-300" title={entry.reason}>{entry.reason}</span>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        <span className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-zinc-300">{entry.count}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setTelemetryTypeFilter('search');
                                                                setTelemetrySourceFilter('cached-ranking');
                                                                setTelemetryWindowFilter('1h');
                                                                setTelemetryStatusFilter('all');
                                                                setTelemetrySearchQuery(entry.reason);
                                                            }}
                                                            className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-amber-200 transition-colors hover:bg-amber-500/20"
                                                            title={`Focus telemetry events with skip reason: ${entry.reason}`}
                                                            aria-label={`Focus telemetry skip reason ${entry.reason}`}
                                                        >
                                                            Focus
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )}

                        {telemetryConfidenceStats.total > 0 ? (
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Confidence bands</div>
                                    <div className="text-[10px] text-zinc-500">
                                        avg confidence {telemetryMeanConfidencePct ?? 0}%
                                        {telemetryMeanScoreGap !== null ? ` • avg score gap ${telemetryMeanScoreGap}` : ''}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTelemetryTypeFilter('search');
                                            setTelemetrySourceFilter('cached-ranking');
                                            setTelemetryStatusFilter('all');
                                            setTelemetryWindowFilter('1h');
                                        }}
                                        className="flex items-center justify-between gap-2 rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-left text-red-200 hover:bg-red-500/20"
                                        title="Focus auto-load confidence events below the active confidence floor"
                                        aria-label="Focus below-floor auto-load confidence events"
                                    >
                                        <span>Below floor (high ambiguity)</span>
                                        <span>{telemetryConfidenceStats.belowFloor}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTelemetryTypeFilter('search');
                                            setTelemetrySourceFilter('cached-ranking');
                                            setTelemetryStatusFilter('all');
                                            setTelemetryWindowFilter('1h');
                                        }}
                                        className="flex items-center justify-between gap-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-left text-amber-200 hover:bg-amber-500/20"
                                        title="Focus near-threshold confidence events"
                                        aria-label="Focus near-floor auto-load confidence events"
                                    >
                                        <span>Near floor (borderline)</span>
                                        <span>{telemetryConfidenceStats.nearFloor}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTelemetryTypeFilter('search');
                                            setTelemetrySourceFilter('cached-ranking');
                                            setTelemetryStatusFilter('success');
                                            setTelemetryWindowFilter('1h');
                                        }}
                                        className="flex items-center justify-between gap-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-left text-emerald-200 hover:bg-emerald-500/20"
                                        title="Focus high-confidence search outcomes"
                                        aria-label="Focus high-confidence auto-load events"
                                    >
                                        <span>High confidence</span>
                                        <span>{telemetryConfidenceStats.highConfidence}</span>
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        {telemetryErrorToolRows.length > 0 ? (
                            <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                                <div className="text-[10px] uppercase tracking-wider text-zinc-500">Top failing tools (current scope)</div>
                                <div className="space-y-1">
                                    {telemetryErrorToolRows.map((row) => (
                                        <div key={`inspector-error-tool-${row.toolName}`} className="flex items-center justify-between gap-2 rounded border border-zinc-800/70 bg-zinc-900/60 px-2 py-1 text-[10px]">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTelemetryToolFilter(row.toolName);
                                                    setTelemetryStatusFilter('error');
                                                }}
                                                className="truncate text-left text-zinc-300 hover:text-white"
                                                title={`Focus telemetry on ${row.toolName}`}
                                                aria-label={`Focus telemetry on failing tool ${row.toolName}`}
                                            >
                                                {row.toolName}
                                            </button>
                                            <span className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-red-200">{row.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {telemetryAmbiguousSearchRows.length > 0 ? (
                            <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Most ambiguous search decisions</div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTelemetryTypeFilter('search');
                                            setTelemetrySourceFilter('cached-ranking');
                                            setTelemetryStatusFilter('all');
                                            setTelemetryWindowFilter('1h');
                                        }}
                                        className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200 hover:bg-amber-500/20"
                                        title="Focus cached ranking ambiguity events"
                                        aria-label="Focus ambiguous cached ranking events"
                                    >
                                        Focus ambiguity
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    {telemetryAmbiguousSearchRows.map((row) => (
                                        <div key={`inspector-ambiguity-${row.id}`} className="rounded border border-zinc-800/70 bg-zinc-900/60 px-2 py-1 text-[10px] space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="truncate text-zinc-300" title={row.query}>{row.query}</span>
                                                <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-amber-200">gap {row.scoreGap}</span>
                                            </div>
                                            <div className="truncate text-zinc-500" title={`${row.topResultName} vs ${row.secondResultName}`}>
                                                {row.topResultName} vs {row.secondResultName}
                                            </div>
                                            <div className="flex items-center justify-between gap-2 text-zinc-500">
                                                <span>{row.confidencePct !== null ? `${row.confidencePct}% conf` : 'conf n/a'}</span>
                                                <span>{formatRelativeTimestamp(row.timestamp)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        <div className="relative flex items-center">
                            <Search className="absolute left-2.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
                            <input
                                type="text"
                                value={telemetrySearchQuery}
                                onChange={(e) => setTelemetrySearchQuery(e.target.value)}
                                placeholder="Search events — tool name, query, message, source…"
                                className="w-full rounded-md border border-zinc-700 bg-zinc-950/70 pl-8 pr-8 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                                aria-label="Search telemetry events by free text"
                            />
                            {telemetrySearchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setTelemetrySearchQuery('')}
                                    className="absolute right-2.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                                    aria-label="Clear event search query"
                                    title="Clear search"
                                >
                                    ✕
                                </button>
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

                            <button
                                type="button"
                                onClick={copyTelemetrySummary}
                                className="rounded-md border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-zinc-300 transition-colors hover:bg-zinc-800"
                                title="Copy a concise inspector telemetry summary"
                                aria-label="Copy inspector telemetry summary"
                            >
                                Copy summary
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
                                    {event.secondResultName ? <div className="text-xs text-zinc-500 break-all">second result: <span className="font-mono text-zinc-300">{event.secondResultName}</span>{typeof event.secondScore === 'number' ? <span className="text-zinc-500 ml-1">score {event.secondScore}</span> : null}</div> : null}
                                    {event.secondMatchReason ? <div className="text-xs text-zinc-500">second why: <span className="text-zinc-300">{event.secondMatchReason}</span></div> : null}
                                    {typeof event.scoreGap === 'number' ? <div className="text-xs text-zinc-400">score gap: <span className="text-zinc-200">{event.scoreGap}</span></div> : null}
                                    {typeof event.ignoredResultCount === 'number' ? <div className="text-xs text-amber-300">ignored results: {event.ignoredResultCount}</div> : null}
                                    {event.ignoredResultNames && event.ignoredResultNames.length > 0 ? <div className="text-xs text-zinc-400 break-all">ignored top choices: <span className="font-mono text-zinc-200">{event.ignoredResultNames.join(', ')}</span></div> : null}
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

                    {telemetryTotalPages > 1 && (
                        <div className="flex items-center justify-between text-xs text-zinc-500 mt-1">
                            <span>
                                Showing {telemetryPage * TELEMETRY_PAGE_SIZE + 1}–{Math.min((telemetryPage + 1) * TELEMETRY_PAGE_SIZE, searchedTelemetryEvents.length)} of {searchedTelemetryEvents.length} events
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={telemetryPage === 0}
                                    onClick={() => setTelemetryPage((p) => p - 1)}
                                    className="rounded border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-40"
                                    aria-label="Previous page of telemetry events"
                                >
                                    ← Prev
                                </button>
                                <span>{telemetryPage + 1} / {telemetryTotalPages}</span>
                                <button
                                    type="button"
                                    disabled={telemetryPage >= telemetryTotalPages - 1}
                                    onClick={() => setTelemetryPage((p) => p + 1)}
                                    className="rounded border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-40"
                                    aria-label="Next page of telemetry events"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
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
