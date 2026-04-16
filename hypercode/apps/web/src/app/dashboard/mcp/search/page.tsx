"use client";

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from "@hypercode/ui";
import { Loader2, Search, Zap, Code, Layers, ExternalLink, Activity, Database, ArrowDownToLine, Sparkles, Trash2, SlidersHorizontal, History } from "lucide-react";
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { PageStatusBanner } from '@/components/PageStatusBanner';

type SearchResult = {
    name: string;
    description: string;
    server: string;
    serverDisplayName?: string;
    serverTags?: string[];
    toolTags?: string[];
    semanticGroup?: string;
    semanticGroupLabel?: string;
    advertisedName?: string;
    keywords?: string[];
    alwaysOn?: boolean;
    originalName?: string | null;
    loaded?: boolean;
    hydrated?: boolean;
    deferred?: boolean;
    requiresSchemaHydration?: boolean;
    matchReason?: string;
    score?: number;
    scoreBreakdown?: {
        primaryMatchScore: number;
        tokenMatchScore: number;
        tokenMatchCount: number;
        profileBoostScore: number;
        loadedBoostScore: number;
        alwaysOnBoostScore: number;
        hydratedBoostScore: number;
        noQueryBaseScore: number;
    };
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
    lastAccessedAt: number;
};

type ToolSearchProfile = 'web-research' | 'repo-coding' | 'browser-automation' | 'local-ops' | 'database';

type ToolSelectionTelemetryEvent = {
    id: string;
    type: 'search' | 'load' | 'hydrate' | 'unload';
    timestamp: number;
    query?: string;
    profile?: string;
    source?: 'runtime-search' | 'cached-ranking' | 'live-aggregator' | 'manual-action';
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
    loadedToolCount?: number;
    hydratedSchemaCount?: number;
    maxLoadedTools?: number;
    maxHydratedSchemas?: number;
    idleEvictionThresholdMs?: number;
    loadedUtilizationPct?: number;
    hydratedUtilizationPct?: number;
};

type WorkingSetEvictionEvent = {
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
    maxLoadedTools: number;
    maxHydratedSchemas: number;
    idleEvictionThresholdMs: number;
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
type TelemetrySourceFilter = 'all' | 'runtime-search' | 'cached-ranking' | 'live-aggregator' | 'manual-action';
type TelemetryTriagePreset = 'errors-now' | 'runtime-failures' | 'manual-failures' | 'load-incidents' | 'hydration-failures' | 'auto-load-skips' | 'live-aggregator-focus';
type EvictionReasonFilter = 'all' | 'idle-biased' | 'capacity';
type EvictionTierFilter = 'all' | WorkingSetEvictionEvent['tier'];
type EvictionWindowPreset = 'all' | '5m' | '15m' | '1h' | '24h';

const TELEMETRY_FILTERS_STORAGE_KEY = 'hypercode.mcp.search.telemetryFilters.v1';
const TELEMETRY_TYPE_QUERY_KEY = 'telemetryType';
const TELEMETRY_STATUS_QUERY_KEY = 'telemetryStatus';
const TELEMETRY_WINDOW_QUERY_KEY = 'telemetryWindow';
const TELEMETRY_SOURCE_QUERY_KEY = 'telemetrySource';
const TELEMETRY_TOOL_QUERY_KEY = 'telemetryTool';
const TELEMETRY_BUCKET_START_QUERY_KEY = 'telemetryBucketStart';
const TELEMETRY_BUCKET_END_QUERY_KEY = 'telemetryBucketEnd';
const EVICTION_FILTERS_STORAGE_KEY = 'hypercode.mcp.search.evictionFilters.v1';
const EVICTION_REASON_QUERY_KEY = 'evictionReason';
const EVICTION_TIER_QUERY_KEY = 'evictionTier';
const EVICTION_WINDOW_QUERY_KEY = 'evictionWindow';

type TelemetryTrendBucket = {
    start: number;
    end: number;
    label: string;
};

function isSearchResult(value: unknown): value is SearchResult {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { name?: unknown }).name === 'string'
        && typeof (value as { server?: unknown }).server === 'string'
        && typeof (value as { description?: unknown }).description === 'string'
        && Object.prototype.hasOwnProperty.call(value, 'inputSchema');
}

function isWorkingSetTool(value: unknown): value is WorkingSetTool {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { name?: unknown }).name === 'string'
        && typeof (value as { hydrated?: unknown }).hydrated === 'boolean'
        && typeof (value as { lastLoadedAt?: unknown }).lastLoadedAt === 'number'
        && (typeof (value as { lastHydratedAt?: unknown }).lastHydratedAt === 'number'
            || (value as { lastHydratedAt?: unknown }).lastHydratedAt === null)
        && typeof (value as { lastAccessedAt?: unknown }).lastAccessedAt === 'number';
}

function isToolSelectionTelemetryEvent(value: unknown): value is ToolSelectionTelemetryEvent {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { id?: unknown }).id === 'string'
        && typeof (value as { type?: unknown }).type === 'string'
        && typeof (value as { timestamp?: unknown }).timestamp === 'number'
        && typeof (value as { status?: unknown }).status === 'string';
}

function isWorkingSetEvictionEvent(value: unknown): value is WorkingSetEvictionEvent {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { toolName?: unknown }).toolName === 'string'
        && typeof (value as { timestamp?: unknown }).timestamp === 'number'
        && typeof (value as { tier?: unknown }).tier === 'string'
        && typeof (value as { idleEvicted?: unknown }).idleEvicted === 'boolean'
        && typeof (value as { idleDurationMs?: unknown }).idleDurationMs === 'number';
}

function isToolPreferences(value: unknown): value is ToolPreferences {
    return typeof value === 'object'
        && value !== null
        && Array.isArray((value as { importantTools?: unknown }).importantTools)
        && Array.isArray((value as { alwaysLoadedTools?: unknown }).alwaysLoadedTools)
        && typeof (value as { autoLoadMinConfidence?: unknown }).autoLoadMinConfidence === 'number'
        && typeof (value as { maxLoadedTools?: unknown }).maxLoadedTools === 'number'
        && typeof (value as { maxHydratedSchemas?: unknown }).maxHydratedSchemas === 'number'
        && typeof (value as { idleEvictionThresholdMs?: unknown }).idleEvictionThresholdMs === 'number';
}

function isWorkingSetSnapshot(value: unknown): value is { tools: WorkingSetTool[]; limits?: { maxLoadedTools?: number; maxHydratedSchemas?: number; idleEvictionThresholdMs?: number } } {
    return typeof value === 'object'
        && value !== null
        && Array.isArray((value as { tools?: unknown }).tools)
        && ((value as { tools: unknown[] }).tools).every(isWorkingSetTool);
}

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

    const targetBucketCount = options.windowPreset === 'all'
        ? 6
        : options.windowPreset === '24h'
            ? 6
            : 5;
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

function formatDurationCompact(durationMs: number): string {
    const clamped = Math.max(0, Math.round(durationMs));
    const seconds = Math.round(clamped / 1000);

    if (seconds < 60) {
        return `${seconds}s`;
    }

    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
        return `${minutes}m`;
    }

    const hours = Math.round(minutes / 60);
    return `${hours}h`;
}

function formatTelemetryBucketRange(start: number, end: number): string {
    const sameDay = new Date(start).toDateString() === new Date(end).toDateString();
    const startLabel = sameDay
        ? new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : new Date(start).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const endLabel = sameDay
        ? new Date(end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : new Date(end).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    return `${startLabel} → ${endLabel}`;
}

function resolveEvictionWindowStart(windowPreset: EvictionWindowPreset): number | null {
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

export default function SearchDashboard() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-zinc-400">Loading search dashboard...</div>}>
            <SearchDashboardContent />
        </Suspense>
    );
}

function SearchDashboardContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState('');
    const [profile, setProfile] = useState<ToolSearchProfile | 'default'>('default');
    const [autoLoadMinConfidenceDraft, setAutoLoadMinConfidenceDraft] = useState(0.85);
    const [maxLoadedToolsDraft, setMaxLoadedToolsDraft] = useState(16);
    const [maxHydratedSchemasDraft, setMaxHydratedSchemasDraft] = useState(8);
    const [idleEvictionThresholdDraftMs, setIdleEvictionThresholdDraftMs] = useState(5 * 60 * 1000);
    const [jsoncDraft, setJsoncDraft] = useState('');
    const [telemetryTypeFilter, setTelemetryTypeFilter] = useState<'all' | ToolSelectionTelemetryEvent['type']>('all');
    const [telemetryStatusFilter, setTelemetryStatusFilter] = useState<'all' | ToolSelectionTelemetryEvent['status']>('all');
    const [telemetryWindowFilter, setTelemetryWindowFilter] = useState<TelemetryWindowPreset>('15m');
    const [telemetrySourceFilter, setTelemetrySourceFilter] = useState<TelemetrySourceFilter>('all');
    const [telemetryToolFilter, setTelemetryToolFilter] = useState<string>('all');
    const [telemetryBucketTimeFilter, setTelemetryBucketTimeFilter] = useState<{
        start: number;
        end: number;
        source?: TelemetrySourceFilter;
    } | null>(null);
    const [activeLoadToolName, setActiveLoadToolName] = useState<string | null>(null);
    const [activeHydrationToolName, setActiveHydrationToolName] = useState<string | null>(null);
    const [activeUnloadToolName, setActiveUnloadToolName] = useState<string | null>(null);
    const [activeLaneAction, setActiveLaneAction] = useState<string | null>(null);
    const [evictionReasonFilter, setEvictionReasonFilter] = useState<EvictionReasonFilter>('all');
    const [evictionTierFilter, setEvictionTierFilter] = useState<EvictionTierFilter>('all');
    const [evictionWindowFilter, setEvictionWindowFilter] = useState<EvictionWindowPreset>('all');
    const utils = trpc.useUtils();
    const searchQuery = trpc.mcp.searchTools.useQuery(
        { query, profile: profile === 'default' ? undefined : profile },
        { enabled: query.trim().length > 0 },
    );
    const workingSetQuery = trpc.mcp.getWorkingSet.useQuery(undefined, { refetchInterval: 4000 });
    const evictionHistoryQuery = trpc.mcp.getWorkingSetEvictionHistory.useQuery(undefined, { refetchInterval: 8000 });
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

    const clearEvictionHistoryMutation = trpc.mcp.clearWorkingSetEvictionHistory.useMutation({
        onSuccess: async (data) => {
            toast.success(data?.message || 'Eviction history cleared');
            await evictionHistoryQuery.refetch();
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
            await Promise.all([
                utils.mcp.getWorkingSet.invalidate(),
                utils.mcp.searchTools.invalidate(),
                utils.mcp.getToolSelectionTelemetry.invalidate(),
            ]);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const hydrateMutation = trpc.mcp.getToolSchema.useMutation({
        onSuccess: async (_data, variables) => {
            const toolName = (variables as { name?: string } | undefined)?.name ?? 'tool';
            toast.success(`Schema hydrated for ${toolName}`);
            await Promise.all([
                utils.mcp.getWorkingSet.invalidate(),
                utils.mcp.searchTools.invalidate(),
                utils.mcp.getToolSelectionTelemetry.invalidate(),
            ]);
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

    const searchResultsUnavailable = searchQuery.data !== undefined
        && (!Array.isArray(searchQuery.data) || !searchQuery.data.every(isSearchResult));
    const results = !searchResultsUnavailable && Array.isArray(searchQuery.data) ? (searchQuery.data as SearchResult[]) : [];
    const isLoading = searchQuery.isLoading;
    const searchError = searchQuery.error?.message ?? (searchResultsUnavailable ? 'Tool search results are unavailable.' : null);
    const workingSetUnavailable = Boolean(workingSetQuery.error)
        || (workingSetQuery.data !== undefined && !isWorkingSetSnapshot(workingSetQuery.data));
    const workingSetSnapshot = !workingSetUnavailable && isWorkingSetSnapshot(workingSetQuery.data)
        ? workingSetQuery.data
        : null;
    const workingSet: WorkingSetTool[] = workingSetSnapshot?.tools ?? [];
    const workingSetError = workingSetQuery.error?.message ?? (workingSetUnavailable ? 'Working set snapshot is unavailable.' : null);
    const allToolsQuery = trpc.mcp.listTools.useQuery(undefined, { refetchInterval: 15000 });
    const allToolsUnavailable = Boolean(allToolsQuery.error)
        || (allToolsQuery.data !== undefined && (!Array.isArray(allToolsQuery.data) || !allToolsQuery.data.every(isSearchResult)));
    const allKnownTools = !allToolsUnavailable && Array.isArray(allToolsQuery.data) ? (allToolsQuery.data as SearchResult[]) : [];
    const allToolsError = allToolsQuery.error?.message ?? (allToolsUnavailable ? 'Tool catalog is unavailable.' : null);
    const telemetryUnavailable = Boolean(telemetryQuery.error)
        || (telemetryQuery.data !== undefined && (!Array.isArray(telemetryQuery.data) || !telemetryQuery.data.every(isToolSelectionTelemetryEvent)));
    const telemetryEvents = !telemetryUnavailable && Array.isArray(telemetryQuery.data) ? (telemetryQuery.data as ToolSelectionTelemetryEvent[]) : [];
    const telemetryError = telemetryQuery.error?.message ?? (telemetryUnavailable ? 'Tool-selection telemetry is unavailable.' : null);
    const evictionHistoryUnavailable = Boolean(evictionHistoryQuery.error)
        || (evictionHistoryQuery.data !== undefined && (!Array.isArray(evictionHistoryQuery.data) || !evictionHistoryQuery.data.every(isWorkingSetEvictionEvent)));
    const evictionHistoryError = evictionHistoryQuery.error?.message ?? (evictionHistoryUnavailable ? 'Working-set eviction history is unavailable.' : null);
    const telemetryWindowStart = resolveTelemetryWindowStart(telemetryWindowFilter);
    const telemetryEventsPreStatusFilter = telemetryEvents
        .filter((event) => telemetryWindowStart == null || event.timestamp >= telemetryWindowStart)
        .filter((event) => telemetryTypeFilter === 'all' || event.type === telemetryTypeFilter)
        .filter((event) => telemetrySourceFilter === 'all' || event.source === telemetrySourceFilter)
        .filter((event) => {
            if (!telemetryBucketTimeFilter) {
                return true;
            }

            return event.timestamp >= telemetryBucketTimeFilter.start && event.timestamp < telemetryBucketTimeFilter.end;
        })
        .filter((event) => {
            if (telemetryToolFilter === 'all') {
                return true;
            }

            if (event.toolName === telemetryToolFilter) {
                return true;
            }

            return event.type === 'search' && event.topResultName === telemetryToolFilter;
        });
    const filteredTelemetryEvents = telemetryEventsPreStatusFilter
        .filter((event) => telemetryStatusFilter === 'all' || event.status === telemetryStatusFilter);
    const telemetry = filteredTelemetryEvents.slice(0, 12);
    const telemetryFiltersAtDefault = telemetryTypeFilter === 'all'
        && telemetryStatusFilter === 'all'
        && telemetryWindowFilter === '15m'
        && telemetrySourceFilter === 'all'
        && telemetryToolFilter === 'all'
        && telemetryBucketTimeFilter == null;
    const telemetrySummary = {
        total: filteredTelemetryEvents.length,
        success: filteredTelemetryEvents.filter((event) => event.status === 'success').length,
        error: filteredTelemetryEvents.filter((event) => event.status === 'error').length,
        ignoredResults: filteredTelemetryEvents.reduce((sum, event) => sum + (event.ignoredResultCount ?? 0), 0),
    };
    const telemetryConfidenceStats = filteredTelemetryEvents.reduce((accumulator, event) => {
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
        ? Number((((telemetryConfidenceStats.confidenceSum / telemetryConfidenceStats.total) * 100)).toFixed(1))
        : null;
    const telemetryMeanScoreGap = telemetryConfidenceStats.scoreGapCount > 0
        ? Number((telemetryConfidenceStats.scoreGapSum / telemetryConfidenceStats.scoreGapCount).toFixed(3))
        : null;
    const telemetryAutoLoadSkipReasonBreakdown = filteredTelemetryEvents
        .reduce((accumulator, event) => {
            if (event.autoLoadOutcome !== 'skipped' || !event.autoLoadSkipReason) {
                return accumulator;
            }

            accumulator.set(event.autoLoadSkipReason, (accumulator.get(event.autoLoadSkipReason) ?? 0) + 1);
            return accumulator;
        }, new Map<string, number>());
    const telemetryAutoLoadSkipReasonRows = Array.from(telemetryAutoLoadSkipReasonBreakdown.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason))
        .slice(0, 5);
    const telemetryErrorToolRows = Array.from(filteredTelemetryEvents.reduce((accumulator, event) => {
        if (event.status !== 'error' || !event.toolName) {
            return accumulator;
        }

        accumulator.set(event.toolName, (accumulator.get(event.toolName) ?? 0) + 1);
        return accumulator;
    }, new Map<string, number>()).entries())
        .map(([toolName, count]) => ({ toolName, count }))
        .sort((left, right) => right.count - left.count || left.toolName.localeCompare(right.toolName))
        .slice(0, 6);
    const telemetryAmbiguousSearchRows = filteredTelemetryEvents
        .filter((event) => event.type === 'search' && typeof event.scoreGap === 'number' && Boolean(event.secondResultName))
        .map((event) => ({
            id: event.id,
            query: event.query ?? event.topResultName ?? 'n/a',
            topResultName: event.topResultName ?? 'n/a',
            secondResultName: event.secondResultName ?? 'n/a',
            scoreGap: Number((event.scoreGap ?? 0).toFixed(3)),
            confidencePct: typeof event.autoLoadConfidence === 'number' ? Math.round(event.autoLoadConfidence * 100) : null,
            timestamp: event.timestamp,
        }))
        .sort((left, right) => left.scoreGap - right.scoreGap || right.timestamp - left.timestamp)
        .slice(0, 6);
    const telemetryTrendBuckets = buildTelemetryTrendBuckets({
        windowPreset: telemetryWindowFilter,
        windowStart: telemetryWindowStart,
        events: telemetryEventsPreStatusFilter,
    });
    const telemetryStatusTrend = telemetryTrendBuckets.map((bucket) => {
        const bucketEvents = telemetryEventsPreStatusFilter.filter((event) => event.timestamp >= bucket.start && event.timestamp < bucket.end);
        const successCount = bucketEvents.filter((event) => event.status === 'success').length;
        const errorCount = bucketEvents.filter((event) => event.status === 'error').length;

        return {
            start: bucket.start,
            end: bucket.end,
            label: bucket.label,
            total: bucketEvents.length,
            successCount,
            errorCount,
        };
    });
    const telemetrySourceStats = (['runtime-search', 'cached-ranking', 'live-aggregator', 'manual-action'] as const)
        .map((source) => {
            const sourceEvents = filteredTelemetryEvents.filter((event) => event.source === source);
            const errorCount = sourceEvents.filter((event) => event.status === 'error').length;
            const avgLatencyMs = sourceEvents.length > 0
                ? Math.round(sourceEvents.reduce((sum, event) => sum + (event.latencyMs ?? 0), 0) / sourceEvents.length)
                : 0;
            const errorRatePercent = sourceEvents.length > 0
                ? Math.round((errorCount / sourceEvents.length) * 100)
                : 0;

            return {
                source,
                count: sourceEvents.length,
                success: sourceEvents.filter((event) => event.status === 'success').length,
                error: errorCount,
                errorRatePercent,
                avgLatencyMs,
                trend: telemetryTrendBuckets.map((bucket) => {
                    const bucketEvents = sourceEvents.filter((event) => event.timestamp >= bucket.start && event.timestamp < bucket.end);
                    const bucketErrors = bucketEvents.filter((event) => event.status === 'error').length;
                    const toolCounts: Record<string, number> = {};
                    bucketEvents.forEach((event) => {
                        if (event.status === 'error' && event.toolName) {
                            toolCounts[event.toolName] = (toolCounts[event.toolName] ?? 0) + 1;
                        }
                    });
                    const topFailingTool = Object.entries(toolCounts).sort((left, right) => right[1] - left[1])[0]?.[0];

                    return {
                        start: bucket.start,
                        end: bucket.end,
                        label: bucket.label,
                        count: bucketEvents.length,
                        errorCount: bucketErrors,
                        topFailingTool,
                    };
                }),
            };
        });
    const maxTelemetrySourceCount = telemetrySourceStats.reduce((max, item) => Math.max(max, item.count), 0);
    const maxTelemetryTrendBucketCount = telemetrySourceStats.reduce((max, source) => {
        const sourceMax = source.trend.reduce((bucketMax, bucket) => Math.max(bucketMax, bucket.count), 0);
        return Math.max(max, sourceMax);
    }, 0);
    const recentEvictions = !evictionHistoryUnavailable && Array.isArray(evictionHistoryQuery.data)
        ? (evictionHistoryQuery.data as WorkingSetEvictionEvent[])
        : [];
    const evictionSummary = recentEvictions.reduce((accumulator, event) => {
        accumulator.total += 1;
        if (event.idleEvicted) {
            accumulator.idleEvictions += 1;
        } else {
            accumulator.capacityEvictions += 1;
        }

        if (event.tier === 'loaded') {
            accumulator.loadedTierEvictions += 1;
        } else {
            accumulator.hydratedTierEvictions += 1;
        }

        accumulator.longestIdleDurationMs = Math.max(accumulator.longestIdleDurationMs, Math.max(0, event.idleDurationMs ?? 0));
        return accumulator;
    }, {
        total: 0,
        idleEvictions: 0,
        capacityEvictions: 0,
        loadedTierEvictions: 0,
        hydratedTierEvictions: 0,
        longestIdleDurationMs: 0,
    });
    const evictionWindowStart = resolveEvictionWindowStart(evictionWindowFilter);
    const filteredEvictions = recentEvictions.filter((event) => {
        const windowMatch = evictionWindowStart == null || event.timestamp >= evictionWindowStart;
        const reasonMatch = evictionReasonFilter === 'all'
            || (evictionReasonFilter === 'idle-biased' ? event.idleEvicted : !event.idleEvicted);
        const tierMatch = evictionTierFilter === 'all' || event.tier === evictionTierFilter;
        return windowMatch && reasonMatch && tierMatch;
    });
    const evictionFiltersAtDefault = evictionReasonFilter === 'all'
        && evictionTierFilter === 'all'
        && evictionWindowFilter === 'all';
    const preferencesUnavailable = Boolean(preferencesQuery.error)
        || (preferencesQuery.data !== undefined && !isToolPreferences(preferencesQuery.data));
    const preferences = !preferencesUnavailable && isToolPreferences(preferencesQuery.data) ? preferencesQuery.data : {
        importantTools: [],
        alwaysLoadedTools: ['search_tools', 'read_file', 'write_file', 'grep_search', 'execute_command', 'browser__open'],
        autoLoadMinConfidence: 0.85,
        maxLoadedTools: 16,
        maxHydratedSchemas: 8,
        idleEvictionThresholdMs: 5 * 60 * 1000,
    };
    const preferencesError = preferencesQuery.error?.message ?? (preferencesUnavailable ? 'Tool preferences are unavailable.' : null);
    const importantTools = new Set(preferences.importantTools);
    const alwaysLoadedTools = new Set(preferences.alwaysLoadedTools);
    const loadedToolNames = new Set<string>();
    const workingSetByName = new Map<string, WorkingSetTool>();
    for (const tool of workingSet) {
        loadedToolNames.add(tool.name);
        workingSetByName.set(tool.name, tool);
    }
    const alwaysOnAdvertisedNames = new Set(
        allKnownTools
            .filter((tool) => Boolean(tool.alwaysOn))
            .map((tool) => tool.name),
    );
    const alwaysOnWorkingSet = workingSet.filter((tool) => alwaysOnAdvertisedNames.has(tool.name));
    const keepWarmWorkingSet = workingSet.filter((tool) => alwaysLoadedTools.has(tool.name) && !alwaysOnAdvertisedNames.has(tool.name));
    const dynamicWorkingSet = workingSet.filter((tool) => !alwaysLoadedTools.has(tool.name) && !alwaysOnAdvertisedNames.has(tool.name));
    const sortedAlwaysOnWorkingSet = [...alwaysOnWorkingSet].sort((left, right) => left.lastAccessedAt - right.lastAccessedAt);
    const sortedKeepWarmWorkingSet = [...keepWarmWorkingSet].sort((left, right) => left.lastAccessedAt - right.lastAccessedAt);
    const sortedDynamicWorkingSet = [...dynamicWorkingSet].sort((left, right) => left.lastAccessedAt - right.lastAccessedAt);
    const sortedAlwaysOnCatalog = [...allKnownTools]
        .filter((tool) => Boolean(tool.alwaysOn) || alwaysOnAdvertisedNames.has(tool.name))
        .sort((left, right) => left.name.localeCompare(right.name));
    const sortedKeepWarmCatalog = [...allKnownTools]
        .filter((tool) => alwaysLoadedTools.has(tool.name) && !alwaysOnAdvertisedNames.has(tool.name))
        .sort((left, right) => left.name.localeCompare(right.name));
    const hydratedCount = workingSet.filter((tool) => tool.hydrated).length;
    const workingSetLimits = workingSetSnapshot?.limits;
    const idleEvictionThresholdMs = Math.max(
        0,
        (workingSetLimits?.idleEvictionThresholdMs ?? 0),
    );

    useEffect(() => {
        if (jsoncEditorQuery.data?.content && jsoncDraft.length === 0) {
            setJsoncDraft(jsoncEditorQuery.data.content);
        }
    }, [jsoncDraft.length, jsoncEditorQuery.data?.content]);

    useEffect(() => {
        const normalized = Math.max(0.5, Math.min(0.99, preferences.autoLoadMinConfidence ?? 0.85));
        setAutoLoadMinConfidenceDraft(normalized);
    }, [preferences.autoLoadMinConfidence]);

    useEffect(() => {
        setMaxLoadedToolsDraft(preferences.maxLoadedTools ?? 16);
        setMaxHydratedSchemasDraft(preferences.maxHydratedSchemas ?? 8);
        setIdleEvictionThresholdDraftMs(preferences.idleEvictionThresholdMs ?? (5 * 60 * 1000));
    }, [preferences.maxLoadedTools, preferences.maxHydratedSchemas, preferences.idleEvictionThresholdMs]);

    useEffect(() => {
        let hasHydratedFromUrl = false;

        const urlType = searchParams.get(TELEMETRY_TYPE_QUERY_KEY);
        const urlStatus = searchParams.get(TELEMETRY_STATUS_QUERY_KEY);
        const urlWindow = searchParams.get(TELEMETRY_WINDOW_QUERY_KEY);
        const urlSource = searchParams.get(TELEMETRY_SOURCE_QUERY_KEY);
        const urlTool = searchParams.get(TELEMETRY_TOOL_QUERY_KEY);
        const urlBucketStart = searchParams.get(TELEMETRY_BUCKET_START_QUERY_KEY);
        const urlBucketEnd = searchParams.get(TELEMETRY_BUCKET_END_QUERY_KEY);

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

        if (urlSource && ['all', 'runtime-search', 'cached-ranking', 'live-aggregator', 'manual-action'].includes(urlSource)) {
            setTelemetrySourceFilter(urlSource as TelemetrySourceFilter);
            hasHydratedFromUrl = true;
        }

        if (urlTool) {
            setTelemetryToolFilter(urlTool);
            hasHydratedFromUrl = true;
        }

        if (urlBucketStart && urlBucketEnd) {
            const parsedStart = Number(urlBucketStart);
            const parsedEnd = Number(urlBucketEnd);
            if (Number.isFinite(parsedStart) && Number.isFinite(parsedEnd) && parsedStart < parsedEnd) {
                setTelemetryBucketTimeFilter({
                    start: parsedStart,
                    end: parsedEnd,
                    source: urlSource && ['runtime-search', 'cached-ranking', 'live-aggregator', 'manual-action'].includes(urlSource)
                        ? (urlSource as TelemetrySourceFilter)
                        : undefined,
                });
                hasHydratedFromUrl = true;
            }
        }

        if (hasHydratedFromUrl) {
            return;
        }

        try {
            const raw = window.localStorage.getItem(TELEMETRY_FILTERS_STORAGE_KEY);
            if (!raw) {
                return;
            }

            const parsed = JSON.parse(raw) as {
                type?: string;
                status?: string;
                window?: string;
                source?: string;
                tool?: string;
                bucketStart?: number;
                bucketEnd?: number;
                bucketSource?: string;
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

            if (parsed.source && ['all', 'runtime-search', 'cached-ranking', 'live-aggregator', 'manual-action'].includes(parsed.source)) {
                setTelemetrySourceFilter(parsed.source as TelemetrySourceFilter);
            }

            if (parsed.tool && parsed.tool.trim().length > 0) {
                setTelemetryToolFilter(parsed.tool);
            }

            if (
                typeof parsed.bucketStart === 'number'
                && typeof parsed.bucketEnd === 'number'
                && Number.isFinite(parsed.bucketStart)
                && Number.isFinite(parsed.bucketEnd)
                && parsed.bucketStart < parsed.bucketEnd
            ) {
                setTelemetryBucketTimeFilter({
                    start: parsed.bucketStart,
                    end: parsed.bucketEnd,
                    source: parsed.bucketSource && ['runtime-search', 'cached-ranking', 'live-aggregator', 'manual-action'].includes(parsed.bucketSource)
                        ? (parsed.bucketSource as TelemetrySourceFilter)
                        : undefined,
                });
            }
        } catch {
            // Ignore invalid persisted filter payloads and continue with defaults.
        }
    }, [searchParams]);

    useEffect(() => {
        try {
            window.localStorage.setItem(
                TELEMETRY_FILTERS_STORAGE_KEY,
                JSON.stringify({
                    type: telemetryTypeFilter,
                    status: telemetryStatusFilter,
                    window: telemetryWindowFilter,
                    source: telemetrySourceFilter,
                    tool: telemetryToolFilter,
                    bucketStart: telemetryBucketTimeFilter?.start,
                    bucketEnd: telemetryBucketTimeFilter?.end,
                    bucketSource: telemetryBucketTimeFilter?.source,
                }),
            );
        } catch {
            // Ignore storage write failures (private mode/quota) and keep UI functional.
        }
    }, [telemetryBucketTimeFilter, telemetrySourceFilter, telemetryStatusFilter, telemetryToolFilter, telemetryTypeFilter, telemetryWindowFilter]);

    useEffect(() => {
        const nextParams = new URLSearchParams(searchParams.toString());

        if (telemetryTypeFilter === 'all') {
            nextParams.delete(TELEMETRY_TYPE_QUERY_KEY);
        } else {
            nextParams.set(TELEMETRY_TYPE_QUERY_KEY, telemetryTypeFilter);
        }

        if (telemetryStatusFilter === 'all') {
            nextParams.delete(TELEMETRY_STATUS_QUERY_KEY);
        } else {
            nextParams.set(TELEMETRY_STATUS_QUERY_KEY, telemetryStatusFilter);
        }

        if (telemetryWindowFilter === '15m') {
            nextParams.delete(TELEMETRY_WINDOW_QUERY_KEY);
        } else {
            nextParams.set(TELEMETRY_WINDOW_QUERY_KEY, telemetryWindowFilter);
        }

        if (telemetrySourceFilter === 'all') {
            nextParams.delete(TELEMETRY_SOURCE_QUERY_KEY);
        } else {
            nextParams.set(TELEMETRY_SOURCE_QUERY_KEY, telemetrySourceFilter);
        }

        if (telemetryToolFilter === 'all') {
            nextParams.delete(TELEMETRY_TOOL_QUERY_KEY);
        } else {
            nextParams.set(TELEMETRY_TOOL_QUERY_KEY, telemetryToolFilter);
        }

        if (!telemetryBucketTimeFilter) {
            nextParams.delete(TELEMETRY_BUCKET_START_QUERY_KEY);
            nextParams.delete(TELEMETRY_BUCKET_END_QUERY_KEY);
        } else {
            nextParams.set(TELEMETRY_BUCKET_START_QUERY_KEY, String(telemetryBucketTimeFilter.start));
            nextParams.set(TELEMETRY_BUCKET_END_QUERY_KEY, String(telemetryBucketTimeFilter.end));
        }

        const currentQuery = searchParams.toString();
        const nextQuery = nextParams.toString();
        if (currentQuery === nextQuery) {
            return;
        }

        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }, [pathname, router, searchParams, telemetryBucketTimeFilter, telemetrySourceFilter, telemetryStatusFilter, telemetryToolFilter, telemetryTypeFilter, telemetryWindowFilter]);

    useEffect(() => {
        let hasHydratedFromUrl = false;

        const urlReason = searchParams.get(EVICTION_REASON_QUERY_KEY);
        const urlTier = searchParams.get(EVICTION_TIER_QUERY_KEY);
        const urlWindow = searchParams.get(EVICTION_WINDOW_QUERY_KEY);

        if (urlReason && ['all', 'idle-biased', 'capacity'].includes(urlReason)) {
            setEvictionReasonFilter(urlReason as EvictionReasonFilter);
            hasHydratedFromUrl = true;
        }

        if (urlTier && ['all', 'loaded', 'hydrated'].includes(urlTier)) {
            setEvictionTierFilter(urlTier as EvictionTierFilter);
            hasHydratedFromUrl = true;
        }

        if (urlWindow && ['all', '5m', '15m', '1h', '24h'].includes(urlWindow)) {
            setEvictionWindowFilter(urlWindow as EvictionWindowPreset);
            hasHydratedFromUrl = true;
        }

        if (hasHydratedFromUrl) {
            return;
        }

        try {
            const raw = window.localStorage.getItem(EVICTION_FILTERS_STORAGE_KEY);
            if (!raw) {
                return;
            }

            const parsed = JSON.parse(raw) as {
                reason?: string;
                tier?: string;
                window?: string;
            };

            if (parsed.reason && ['all', 'idle-biased', 'capacity'].includes(parsed.reason)) {
                setEvictionReasonFilter(parsed.reason as EvictionReasonFilter);
            }

            if (parsed.tier && ['all', 'loaded', 'hydrated'].includes(parsed.tier)) {
                setEvictionTierFilter(parsed.tier as EvictionTierFilter);
            }

            if (parsed.window && ['all', '5m', '15m', '1h', '24h'].includes(parsed.window)) {
                setEvictionWindowFilter(parsed.window as EvictionWindowPreset);
            }
        } catch {
            // Ignore invalid persisted filter payloads and continue with defaults.
        }
    }, [searchParams]);

    useEffect(() => {
        try {
            window.localStorage.setItem(
                EVICTION_FILTERS_STORAGE_KEY,
                JSON.stringify({
                    reason: evictionReasonFilter,
                    tier: evictionTierFilter,
                    window: evictionWindowFilter,
                }),
            );
        } catch {
            // Ignore storage write failures (private mode/quota) and keep UI functional.
        }
    }, [evictionReasonFilter, evictionTierFilter, evictionWindowFilter]);

    useEffect(() => {
        const nextParams = new URLSearchParams(searchParams.toString());

        if (evictionReasonFilter === 'all') {
            nextParams.delete(EVICTION_REASON_QUERY_KEY);
        } else {
            nextParams.set(EVICTION_REASON_QUERY_KEY, evictionReasonFilter);
        }

        if (evictionTierFilter === 'all') {
            nextParams.delete(EVICTION_TIER_QUERY_KEY);
        } else {
            nextParams.set(EVICTION_TIER_QUERY_KEY, evictionTierFilter);
        }

        if (evictionWindowFilter === 'all') {
            nextParams.delete(EVICTION_WINDOW_QUERY_KEY);
        } else {
            nextParams.set(EVICTION_WINDOW_QUERY_KEY, evictionWindowFilter);
        }

        const currentQuery = searchParams.toString();
        const nextQuery = nextParams.toString();
        if (currentQuery === nextQuery) {
            return;
        }

        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }, [pathname, router, searchParams, evictionReasonFilter, evictionTierFilter, evictionWindowFilter]);

    const updateToolPreferences = (next: ToolPreferenceMutationInput) => {
        setPreferencesMutation.mutate(next);
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
            alwaysLoadedTools: Array.from(next),
        });
    };

    const saveAutoLoadMinConfidence = () => {
        const normalized = Math.max(0.5, Math.min(0.99, Number(autoLoadMinConfidenceDraft)));
        setAutoLoadMinConfidenceDraft(normalized);

        if (Math.abs(normalized - preferences.autoLoadMinConfidence) < 0.0001) {
            return;
        }

        updateToolPreferences({
            autoLoadMinConfidence: normalized,
        });
    };

    const saveCapacity = () => {
        const nextMax = Math.max(4, Math.min(64, Math.round(maxLoadedToolsDraft)));
        const nextHydrated = Math.max(2, Math.min(32, Math.round(maxHydratedSchemasDraft)));
        const nextIdleEvictionThresholdMs = Math.max(10_000, Math.min(24 * 60 * 60 * 1000, Math.round(idleEvictionThresholdDraftMs)));
        setMaxLoadedToolsDraft(nextMax);
        setMaxHydratedSchemasDraft(nextHydrated);
        setIdleEvictionThresholdDraftMs(nextIdleEvictionThresholdMs);

        if (
            nextMax === preferences.maxLoadedTools
            && nextHydrated === preferences.maxHydratedSchemas
            && nextIdleEvictionThresholdMs === preferences.idleEvictionThresholdMs
        ) {
            return;
        }

        updateToolPreferences({
            maxLoadedTools: nextMax,
            maxHydratedSchemas: nextHydrated,
            idleEvictionThresholdMs: nextIdleEvictionThresholdMs,
        });
    };

    const idleEvictionThresholdMinutes = Math.max(0.17, Number((idleEvictionThresholdDraftMs / 60000).toFixed(2)));

    const resetTelemetryFilters = () => {
        setTelemetryTypeFilter('all');
        setTelemetryStatusFilter('all');
        setTelemetryWindowFilter('15m');
        setTelemetrySourceFilter('all');
        setTelemetryToolFilter('all');
        setTelemetryBucketTimeFilter(null);

        try {
            window.localStorage.removeItem(TELEMETRY_FILTERS_STORAGE_KEY);
        } catch {
            // Ignore local storage cleanup errors.
        }
    };

    const resetEvictionFilters = () => {
        setEvictionReasonFilter('all');
        setEvictionTierFilter('all');
        setEvictionWindowFilter('all');

        try {
            window.localStorage.removeItem(EVICTION_FILTERS_STORAGE_KEY);
        } catch {
            // Ignore local storage cleanup errors.
        }
    };

    const focusTelemetryFromEviction = (toolName: string) => {
        setTelemetryToolFilter(toolName);
        setTelemetryStatusFilter('error');
        setTelemetryBucketTimeFilter(null);
    };

    const copyEvictionShareLink = async () => {
        if (typeof window === 'undefined' || !navigator.clipboard) {
            toast.error('Clipboard unavailable');
            return;
        }

        const nextParams = new URLSearchParams(searchParams.toString());

        if (evictionReasonFilter === 'all') {
            nextParams.delete(EVICTION_REASON_QUERY_KEY);
        } else {
            nextParams.set(EVICTION_REASON_QUERY_KEY, evictionReasonFilter);
        }

        if (evictionTierFilter === 'all') {
            nextParams.delete(EVICTION_TIER_QUERY_KEY);
        } else {
            nextParams.set(EVICTION_TIER_QUERY_KEY, evictionTierFilter);
        }

        if (evictionWindowFilter === 'all') {
            nextParams.delete(EVICTION_WINDOW_QUERY_KEY);
        } else {
            nextParams.set(EVICTION_WINDOW_QUERY_KEY, evictionWindowFilter);
        }

        const shareUrl = `${window.location.origin}${pathname}${nextParams.toString() ? `?${nextParams.toString()}` : ''}`;

        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Eviction share link copied');
        } catch {
            toast.error('Failed to copy eviction share link');
        }
    };

    const copyEvictionSummary = async () => {
        if (typeof window === 'undefined' || !navigator.clipboard) {
            toast.error('Clipboard unavailable');
            return;
        }

        const filterSummary = [
            `reason=${evictionReasonFilter}`,
            `tier=${evictionTierFilter}`,
            `window=${evictionWindowFilter}`,
        ].join(', ');
        const currentScopeUrl = `${window.location.origin}${pathname}${window.location.search}`;
        const topEvictedTools = Array.from(filteredEvictions.reduce((accumulator, event) => {
            accumulator.set(event.toolName, (accumulator.get(event.toolName) ?? 0) + 1);
            return accumulator;
        }, new Map<string, number>()).entries())
            .map(([toolName, count]) => ({ toolName, count }))
            .sort((left, right) => right.count - left.count || left.toolName.localeCompare(right.toolName))
            .slice(0, 5);
        const topEvictedToolsSummary = topEvictedTools.length > 0
            ? topEvictedTools.map((row) => `${row.toolName}:${row.count}`).join(', ')
            : 'none';

        const summary = [
            'MCP Search eviction summary',
            `Generated at: ${new Date().toISOString()}`,
            `Filters: ${filterSummary}`,
            `Scope URL: ${currentScopeUrl}`,
            `Events: showing=${Math.min(filteredEvictions.length, 10)}/${filteredEvictions.length}, total=${recentEvictions.length}`,
            `Breakdown: idle-biased=${evictionSummary.idleEvictions}, capacity=${evictionSummary.capacityEvictions}, loaded-tier=${evictionSummary.loadedTierEvictions}, hydrated-tier=${evictionSummary.hydratedTierEvictions}, max-idle=${formatDurationCompact(evictionSummary.longestIdleDurationMs)}`,
            `Top evicted tools: ${topEvictedToolsSummary}`,
        ].join('\n');

        try {
            await navigator.clipboard.writeText(summary);
            toast.success('Eviction summary copied');
        } catch {
            toast.error('Failed to copy eviction summary');
        }
    };

    const applyTelemetryPreset = (preset: TelemetryTriagePreset) => {
        setTelemetryBucketTimeFilter(null);
        setTelemetryToolFilter('all');

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

        if (preset === 'manual-failures') {
            setTelemetryTypeFilter('all');
            setTelemetryStatusFilter('error');
            setTelemetryWindowFilter('1h');
            setTelemetrySourceFilter('manual-action');
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

    const isTelemetryPresetActive = (preset: TelemetryTriagePreset): boolean => {
        if (telemetryBucketTimeFilter != null || telemetryToolFilter !== 'all') {
            return false;
        }

        if (preset === 'errors-now') {
            return telemetryTypeFilter === 'all'
                && telemetryStatusFilter === 'error'
                && telemetryWindowFilter === '15m'
                && telemetrySourceFilter === 'all';
        }

        if (preset === 'runtime-failures') {
            return telemetryTypeFilter === 'all'
                && telemetryStatusFilter === 'error'
                && telemetryWindowFilter === '1h'
                && telemetrySourceFilter === 'runtime-search';
        }

        if (preset === 'manual-failures') {
            return telemetryTypeFilter === 'all'
                && telemetryStatusFilter === 'error'
                && telemetryWindowFilter === '1h'
                && telemetrySourceFilter === 'manual-action';
        }

        if (preset === 'load-incidents') {
            return telemetryTypeFilter === 'load'
                && telemetryStatusFilter === 'error'
                && telemetryWindowFilter === '1h'
                && telemetrySourceFilter === 'all';
        }

        if (preset === 'hydration-failures') {
            return telemetryTypeFilter === 'hydrate'
                && telemetryStatusFilter === 'error'
                && telemetryWindowFilter === '24h'
                && telemetrySourceFilter === 'all';
        }

        if (preset === 'auto-load-skips') {
            return telemetryTypeFilter === 'search'
                && telemetryStatusFilter === 'all'
                && telemetryWindowFilter === '1h'
                && telemetrySourceFilter === 'cached-ranking';
        }

        return telemetryTypeFilter === 'all'
            && telemetryStatusFilter === 'all'
            && telemetryWindowFilter === '15m'
            && telemetrySourceFilter === 'live-aggregator';
    };

    const telemetryTriagePresets = [
        { value: 'errors-now', label: 'Errors now' },
        { value: 'runtime-failures', label: 'Runtime failures' },
        { value: 'manual-failures', label: 'Manual failures' },
        { value: 'load-incidents', label: 'Load incidents' },
        { value: 'hydration-failures', label: 'Hydration failures' },
        { value: 'auto-load-skips', label: 'Auto-load skips' },
        { value: 'live-aggregator-focus', label: 'Live aggregator' },
    ] as const satisfies ReadonlyArray<{ value: TelemetryTriagePreset; label: string }>;
    const activeTelemetryPreset = telemetryTriagePresets.find((preset) => isTelemetryPresetActive(preset.value)) ?? null;

    const copyTelemetryShareLink = async () => {
        const nextParams = new URLSearchParams();

        if (telemetryTypeFilter !== 'all') {
            nextParams.set(TELEMETRY_TYPE_QUERY_KEY, telemetryTypeFilter);
        }

        if (telemetryStatusFilter !== 'all') {
            nextParams.set(TELEMETRY_STATUS_QUERY_KEY, telemetryStatusFilter);
        }

        if (telemetryWindowFilter !== '15m') {
            nextParams.set(TELEMETRY_WINDOW_QUERY_KEY, telemetryWindowFilter);
        }

        if (telemetrySourceFilter !== 'all') {
            nextParams.set(TELEMETRY_SOURCE_QUERY_KEY, telemetrySourceFilter);
        }

        if (telemetryToolFilter !== 'all') {
            nextParams.set(TELEMETRY_TOOL_QUERY_KEY, telemetryToolFilter);
        }

        if (telemetryBucketTimeFilter) {
            nextParams.set(TELEMETRY_BUCKET_START_QUERY_KEY, String(telemetryBucketTimeFilter.start));
            nextParams.set(TELEMETRY_BUCKET_END_QUERY_KEY, String(telemetryBucketTimeFilter.end));
        }

        const shareUrl = `${window.location.origin}${pathname}${nextParams.toString() ? `?${nextParams.toString()}` : ''}`;

        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Share link copied');
        } catch {
            toast.error('Failed to copy share link');
        }
    };

    const buildInspectorTelemetryHref = (options?: {
        source?: TelemetrySourceFilter;
        status?: 'all' | ToolSelectionTelemetryEvent['status'];
        tool?: string | null;
        bucket?: { start: number; end: number } | null;
    }): string => {
        const params = new URLSearchParams();
        const source = options?.source ?? telemetrySourceFilter;
        const status = options?.status ?? telemetryStatusFilter;
        const tool = options?.tool ?? (telemetryToolFilter === 'all' ? null : telemetryToolFilter);
        const bucket = options?.bucket ?? telemetryBucketTimeFilter;

        if (telemetryTypeFilter !== 'all') {
            params.set(TELEMETRY_TYPE_QUERY_KEY, telemetryTypeFilter);
        }

        if (status !== 'all') {
            params.set(TELEMETRY_STATUS_QUERY_KEY, status);
        }

        if (telemetryWindowFilter !== '15m') {
            params.set(TELEMETRY_WINDOW_QUERY_KEY, telemetryWindowFilter);
        }

        if (source !== 'all') {
            params.set(TELEMETRY_SOURCE_QUERY_KEY, source);
        }

        if (tool && tool !== 'all') {
            params.set(TELEMETRY_TOOL_QUERY_KEY, tool);
        }

        if (bucket) {
            params.set(TELEMETRY_BUCKET_START_QUERY_KEY, String(bucket.start));
            params.set(TELEMETRY_BUCKET_END_QUERY_KEY, String(bucket.end));
        }

        const query = params.toString();
        return query ? `/dashboard/mcp/inspector?${query}` : '/dashboard/mcp/inspector';
    };

    const copyTelemetrySummary = async () => {
        if (typeof window === 'undefined' || !navigator.clipboard) {
            toast.error('Clipboard unavailable');
            return;
        }

        const dominantSourceByVolume = telemetrySourceStats
            .filter((source) => source.count > 0)
            .sort((left, right) => right.count - left.count || right.error - left.error)[0] ?? null;
        const dominantSourceByErrors = telemetrySourceStats
            .filter((source) => source.error > 0)
            .sort((left, right) => right.error - left.error || right.count - left.count)[0] ?? null;
        const dominantSourceByErrorRate = telemetrySourceStats
            .filter((source) => source.count > 0)
            .sort((left, right) => {
                const leftRate = left.error / left.count;
                const rightRate = right.error / right.count;
                return rightRate - leftRate || right.error - left.error || right.count - left.count;
            })[0] ?? null;
        const focusedSourceIncidentUrl = (() => {
            if (!dominantSourceByErrors) {
                return null;
            }

            const nextParams = new URLSearchParams();

            if (telemetryTypeFilter !== 'all') {
                nextParams.set(TELEMETRY_TYPE_QUERY_KEY, telemetryTypeFilter);
            }

            nextParams.set(TELEMETRY_STATUS_QUERY_KEY, 'error');

            if (telemetryWindowFilter !== '15m') {
                nextParams.set(TELEMETRY_WINDOW_QUERY_KEY, telemetryWindowFilter);
            }

            nextParams.set(TELEMETRY_SOURCE_QUERY_KEY, dominantSourceByErrors.source);

            if (telemetryToolFilter !== 'all') {
                nextParams.set(TELEMETRY_TOOL_QUERY_KEY, telemetryToolFilter);
            }

            if (telemetryBucketTimeFilter) {
                nextParams.set(TELEMETRY_BUCKET_START_QUERY_KEY, String(telemetryBucketTimeFilter.start));
                nextParams.set(TELEMETRY_BUCKET_END_QUERY_KEY, String(telemetryBucketTimeFilter.end));
            }

            return `${window.location.origin}${pathname}?${nextParams.toString()}`;
        })();
        const currentScopeUrl = `${window.location.origin}${pathname}${window.location.search}`;

        const filterSummary = [
            `type=${telemetryTypeFilter}`,
            `status=${telemetryStatusFilter}`,
            `window=${telemetryWindowFilter}`,
            `source=${telemetrySourceFilter}`,
            `tool=${telemetryToolFilter}`,
            `bucket=${telemetryBucketTimeFilter ? formatTelemetryBucketRange(telemetryBucketTimeFilter.start, telemetryBucketTimeFilter.end) : 'all'}`,
        ].join(', ');
        const topFailingTools = telemetryErrorToolRows.length > 0
            ? telemetryErrorToolRows.map((row) => `${row.toolName}:${row.count}`).join(', ')
            : 'none';
        const topSkipReasons = telemetryAutoLoadSkipReasonRows.length > 0
            ? telemetryAutoLoadSkipReasonRows.map((row) => `${row.reason}:${row.count}`).join(', ')
            : 'none';
        const formatScoreGap = (scoreGap: number): string => scoreGap.toFixed(3);
        const ambiguousSearchRows = telemetryAmbiguousSearchRows.length > 0
            ? telemetryAmbiguousSearchRows.slice(0, 3).map((row) => `${row.topResultName} vs ${row.secondResultName} (gap ${formatScoreGap(row.scoreGap)})`).join(' | ')
            : 'none';
        const formatErrorRatePercent = (errorCount: number, totalCount: number): string => (
            totalCount > 0 ? `${((errorCount / totalCount) * 100).toFixed(1)}%` : 'n/a'
        );
        const summary = [
            `MCP Search telemetry summary`,
            `Generated at: ${new Date().toISOString()}`,
            `Filters: ${filterSummary}`,
            `Active preset: ${activeTelemetryPreset ? activeTelemetryPreset.label : 'custom'}`,
            `Scope URL: ${currentScopeUrl}`,
            `Segment scope: ${telemetryBucketTimeFilter && telemetryStatusFilter !== 'all' ? `${telemetryStatusFilter} within ${formatTelemetryBucketRange(telemetryBucketTimeFilter.start, telemetryBucketTimeFilter.end)}` : 'none'}`,
            `Events: total=${telemetrySummary.total}, success=${telemetrySummary.success}, error=${telemetrySummary.error}, ignored=${telemetrySummary.ignoredResults}`,
            `Dominant source (volume): ${dominantSourceByVolume ? `${dominantSourceByVolume.source} (${dominantSourceByVolume.count} events, ${dominantSourceByVolume.error} errors, ${formatErrorRatePercent(dominantSourceByVolume.error, dominantSourceByVolume.count)} error rate)` : 'none'}`,
            `Dominant source (errors): ${dominantSourceByErrors ? `${dominantSourceByErrors.source} (${dominantSourceByErrors.error} errors, ${formatErrorRatePercent(dominantSourceByErrors.error, dominantSourceByErrors.count)} error rate)` : 'none'}`,
            `Dominant source (error-rate): ${dominantSourceByErrorRate ? `${dominantSourceByErrorRate.source} (${formatErrorRatePercent(dominantSourceByErrorRate.error, dominantSourceByErrorRate.count)} error rate on ${dominantSourceByErrorRate.count} events)` : 'none'}`,
            `Focused source URL: ${focusedSourceIncidentUrl ?? 'none'}`,
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

    const hydrateToolSchema = async (toolName: string, isLoaded: boolean) => {
        setActiveHydrationToolName(toolName);

        try {
            if (!isLoaded) {
                const loaded = await loadTool(toolName);
                if (!loaded) {
                    return false;
                }
            }

            await hydrateMutation.mutateAsync({ name: toolName });
            return true;
        } catch {
            // Mutation callbacks already emit actionable toasts.
            return false;
        } finally {
            setActiveHydrationToolName((current) => (current === toolName ? null : current));
        }
    };

    const loadTool = async (toolName: string) => {
        setActiveLoadToolName(toolName);

        try {
            await loadMutation.mutateAsync({ name: toolName });
            return true;
        } catch {
            // Mutation callbacks already emit actionable toasts.
            return false;
        } finally {
            setActiveLoadToolName((current) => (current === toolName ? null : current));
        }
    };

    const unloadTool = async (toolName: string) => {
        setActiveUnloadToolName(toolName);

        try {
            await unloadMutation.mutateAsync({ name: toolName });
            return true;
        } catch {
            // Mutation callbacks already emit actionable toasts.
            return false;
        } finally {
            setActiveUnloadToolName((current) => (current === toolName ? null : current));
        }
    };

    const runLaneAction = async (
        laneId: 'always-on-lane' | 'keep-warm-lane',
        action: 'load' | 'hydrate' | 'unload',
        tools: SearchResult[],
    ) => {
        const actionKey = `${laneId}:${action}`;
        setActiveLaneAction(actionKey);

        try {
            const candidateTools = tools.filter((tool) => {
                const loaded = loadedToolNames.has(tool.name);
                const hydrated = Boolean(workingSetByName.get(tool.name)?.hydrated || tool.hydrated);

                if (action === 'load') {
                    return !loaded;
                }

                if (action === 'unload') {
                    return loaded;
                }

                return !hydrated;
            });

            if (candidateTools.length === 0) {
                toast.info(action === 'load'
                    ? 'All lane tools are already loaded'
                    : action === 'unload'
                        ? 'All lane tools are already unloaded'
                        : 'All lane tools are already hydrated');
                return;
            }

            let succeeded = 0;

            for (const tool of candidateTools) {
                if (action === 'load') {
                    const loaded = await loadTool(tool.name);
                    if (loaded) {
                        succeeded += 1;
                    }
                    continue;
                }

                if (action === 'unload') {
                    const unloaded = await unloadTool(tool.name);
                    if (unloaded) {
                        succeeded += 1;
                    }
                    continue;
                }

                const loaded = loadedToolNames.has(tool.name);
                const hydrated = await hydrateToolSchema(tool.name, loaded);
                if (hydrated) {
                    succeeded += 1;
                }
            }

            toast.success(action === 'load'
                ? `Loaded ${succeeded} lane tool${succeeded === 1 ? '' : 's'}`
                : action === 'unload'
                    ? `Unloaded ${succeeded} lane tool${succeeded === 1 ? '' : 's'}`
                    : `Hydrated ${succeeded} lane tool${succeeded === 1 ? '' : 's'}`);
        } finally {
            setActiveLaneAction((current) => (current === actionKey ? null : current));
        }
    };

    return (
        <div className="p-8 space-y-8 h-full flex flex-col">
            <PageStatusBanner status="beta" message="MCP Semantic Search" note="Tool discovery and ranking are functional. Schema hydration depth and score tuning are ongoing." />
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

                            <div className="space-y-2">
                                <div className="text-xs uppercase tracking-wider text-zinc-500">Task profile</div>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { value: 'default', label: 'Default' },
                                        { value: 'repo-coding', label: 'Repo coding' },
                                        { value: 'web-research', label: 'Web research' },
                                        { value: 'browser-automation', label: 'Browser automation' },
                                        { value: 'local-ops', label: 'Local ops' },
                                        { value: 'database', label: 'Database' },
                                    ].map((option) => {
                                        const isActive = profile === option.value;

                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setProfile(option.value as ToolSearchProfile | 'default')}
                                                className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${isActive
                                                    ? 'border-blue-500/50 bg-blue-500/15 text-blue-200'
                                                    : 'border-zinc-700 bg-zinc-950/70 text-zinc-300 hover:bg-zinc-800'
                                                    }`}
                                                title={`Bias ranking toward ${option.label.toLowerCase()} workflows`}
                                                aria-label={`Use ${option.label} task profile`}
                                            >
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <p className="text-xs text-zinc-500">
                                Tip: describe the outcome you want (for example, “sync issues from github repo” or “extract text from pdf”).
                                Ranking uses match reason + metadata confidence so the best candidates surface first.
                                {profile !== 'default' ? ` Active profile: ${profile}.` : ''}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                                    <div className="text-xs uppercase tracking-wider text-zinc-500">Matches</div>
                                    <div className="mt-1 text-2xl font-semibold text-white">{results.length}</div>
                                </div>
                                <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                                    <div className="text-xs uppercase tracking-wider text-zinc-500">Loaded</div>
                                    <div className="mt-1 text-2xl font-semibold text-white">{workingSetError ? '—' : workingSet.length}</div>
                                </div>
                                <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                                    <div className="text-xs uppercase tracking-wider text-zinc-500">Hydrated schemas</div>
                                    <div className="mt-1 text-2xl font-semibold text-white">{workingSetError ? '—' : hydratedCount}</div>
                                </div>
                                <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                                    <div className="text-xs uppercase tracking-wider text-zinc-500">Always-on tools</div>
                                    <div className="mt-1 text-2xl font-semibold text-white">{allToolsError ? '—' : alwaysOnAdvertisedNames.size}</div>
                                    <div className={`mt-1 text-xs ${allToolsError ? 'text-red-300' : 'text-zinc-500'}`}>
                                        {allToolsError ? allToolsError : 'Advertised immediately by always-on MCP servers.'}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                                    <div className="text-xs uppercase tracking-wider text-zinc-500">Keep warm tools</div>
                                    <div className="mt-1 text-2xl font-semibold text-white">{preferencesError ? '—' : alwaysLoadedTools.size}</div>
                                    <div className={`mt-1 text-xs ${preferencesError ? 'text-red-300' : 'text-zinc-500'}`}>
                                        {preferencesError ? preferencesError : 'Pinned tools HyperCode auto-loads into the working set.'}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 md:col-span-3 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-xs uppercase tracking-wider text-zinc-500">Auto-load confidence floor</div>
                                            <div className="mt-1 text-2xl font-semibold text-white">
                                                {preferencesError ? '—' : `${Math.round((preferences.autoLoadMinConfidence ?? 0.85) * 100)}%`}
                                            </div>
                                        </div>
                                        <div className="text-xs text-zinc-500 text-right max-w-xs">
                                            {preferencesError ?? 'Cached ranking auto-loads only when confidence is above this threshold.'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min={0.5}
                                            max={0.99}
                                            step={0.01}
                                            value={autoLoadMinConfidenceDraft}
                                            onChange={(event) => setAutoLoadMinConfidenceDraft(Number(event.target.value))}
                                            className="w-full"
                                            title="Set minimum confidence required before HyperCode auto-loads the top ranked tool"
                                            aria-label="Auto-load confidence threshold"
                                            disabled={Boolean(preferencesError)}
                                        />
                                        <input
                                            type="number"
                                            min={0.5}
                                            max={0.99}
                                            step={0.01}
                                            value={autoLoadMinConfidenceDraft.toFixed(2)}
                                            onChange={(event) => setAutoLoadMinConfidenceDraft(Number(event.target.value))}
                                            className="w-24 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
                                            title="Numeric confidence threshold between 0.50 and 0.99"
                                            aria-label="Auto-load confidence threshold numeric input"
                                            disabled={Boolean(preferencesError)}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                                            onClick={saveAutoLoadMinConfidence}
                                            disabled={setPreferencesMutation.isPending || Boolean(preferencesError)}
                                            title="Save auto-load confidence threshold"
                                            aria-label="Save auto-load confidence threshold"
                                        >
                                            Save
                                        </Button>
                                    </div>
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
                                        const hydratedFromWorkingSet = workingSetByName.get(tool.name)?.hydrated ?? false;
                                        const isHydrated = Boolean(tool.hydrated) || hydratedFromWorkingSet;
                                        const scoreBreakdownRows = tool.scoreBreakdown
                                            ? [
                                                { label: 'primary match', value: tool.scoreBreakdown.primaryMatchScore },
                                                {
                                                    label: `token matches (${tool.scoreBreakdown.tokenMatchCount})`,
                                                    value: tool.scoreBreakdown.tokenMatchScore,
                                                },
                                                { label: 'profile boost', value: tool.scoreBreakdown.profileBoostScore },
                                                { label: 'loaded boost', value: tool.scoreBreakdown.loadedBoostScore },
                                                { label: 'always-on boost', value: tool.scoreBreakdown.alwaysOnBoostScore },
                                                { label: 'hydrated boost', value: tool.scoreBreakdown.hydratedBoostScore },
                                                { label: 'no-query baseline', value: tool.scoreBreakdown.noQueryBaseScore },
                                            ].filter((entry) => entry.value > 0)
                                            : [];

                                        return (
                                            <div key={tool.name} className="p-5 hover:bg-zinc-950/60 transition-colors space-y-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <div className="font-mono text-blue-400 font-medium text-lg mb-1 break-all">{tool.name}</div>
                                                        {tool.advertisedName && tool.advertisedName !== tool.name ? (
                                                            <div className="text-xs text-cyan-300 mb-2 break-all">
                                                                advertised as <span className="font-mono">{tool.advertisedName}</span>
                                                            </div>
                                                        ) : null}
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            {tool.rank ? (
                                                                <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-blue-300 uppercase tracking-wider">
                                                                    rank #{tool.rank}
                                                                </span>
                                                            ) : null}
                                                            <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 uppercase tracking-wider">
                                                                {tool.serverDisplayName || tool.server}
                                                            </span>
                                                            {tool.semanticGroupLabel ? (
                                                                <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-indigo-300 uppercase tracking-wider">
                                                                    {tool.semanticGroupLabel}
                                                                </span>
                                                            ) : null}
                                                            {isLoaded ? (
                                                                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 uppercase tracking-wider">
                                                                    loaded
                                                                </span>
                                                            ) : null}
                                                            {isHydrated ? (
                                                                <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded text-purple-300 uppercase tracking-wider">
                                                                    schema ready
                                                                </span>
                                                            ) : null}
                                                            {tool.requiresSchemaHydration ? (
                                                                <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-amber-300 uppercase tracking-wider">
                                                                    metadata only
                                                                </span>
                                                            ) : null}
                                                            {(tool.alwaysOn || alwaysOnAdvertisedNames.has(tool.name)) ? (
                                                                <span className="text-[10px] bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded text-sky-300 uppercase tracking-wider">
                                                                    server always-on
                                                                </span>
                                                            ) : null}
                                                            {(tool.alwaysLoaded || alwaysLoadedTools.has(tool.name)) ? (
                                                                <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded text-cyan-300 uppercase tracking-wider">
                                                                    keep warm profile
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
                                                        {scoreBreakdownRows.length > 0 ? (
                                                            <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-950/50 p-3">
                                                                <div className="text-[10px] uppercase tracking-wider text-zinc-500">Score decomposition</div>
                                                                <div className="mt-2 grid gap-1 text-xs text-zinc-300 md:grid-cols-2">
                                                                    {scoreBreakdownRows.map((row) => (
                                                                        <div key={row.label} className="flex items-center justify-between gap-2 rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1">
                                                                            <span className="text-zinc-400">{row.label}</span>
                                                                            <span className="font-mono text-zinc-100">+{row.value}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                        {(tool.serverTags?.length || tool.toolTags?.length) ? (
                                                            <div className="mt-3 grid gap-2 text-xs text-zinc-500 md:grid-cols-2">
                                                                <div>
                                                                    <span className="uppercase tracking-wider text-zinc-600">Server tags</span>
                                                                    <div className="mt-1 text-zinc-300">{(tool.serverTags ?? []).join(', ') || 'n/a'}</div>
                                                                </div>
                                                                <div>
                                                                    <span className="uppercase tracking-wider text-zinc-600">Tool tags</span>
                                                                    <div className="mt-1 text-zinc-300">{(tool.toolTags ?? []).join(', ') || 'n/a'}</div>
                                                                </div>
                                                            </div>
                                                        ) : null}
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
                                                        onClick={() => {
                                                            void loadTool(tool.name);
                                                        }}
                                                        disabled={loadMutation.isPending || activeLoadToolName === tool.name}
                                                        title="Load this tool into the active working set so it is immediately callable"
                                                        aria-label={`Load tool ${tool.name}`}
                                                        className="bg-blue-600 hover:bg-blue-500 text-white"
                                                    >
                                                        {activeLoadToolName === tool.name ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                                                Loading...
                                                            </>
                                                        ) : 'Load tool'}
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
                                                        aria-label={`${(tool.alwaysLoaded || alwaysLoadedTools.has(tool.name)) ? 'Stop keeping' : 'Keep'} tool ${tool.name} warm`}
                                                        variant="outline"
                                                        className="border-cyan-700 text-cyan-200 hover:bg-cyan-950/30"
                                                    >
                                                        {(tool.alwaysLoaded || alwaysLoadedTools.has(tool.name)) ? 'Disable keep warm' : 'Keep warm'}
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
                                                        onClick={() => {
                                                            void hydrateToolSchema(tool.name, isLoaded);
                                                        }}
                                                        disabled={hydrateMutation.isPending || loadMutation.isPending || activeHydrationToolName === tool.name || isHydrated}
                                                        title={isLoaded ? "Hydrate this tool's schema into the active working set" : "Load then hydrate this tool schema into the active working set"}
                                                        aria-label={`Hydrate schema for tool ${tool.name}`}
                                                        variant="outline"
                                                        className="border-purple-700 text-purple-200 hover:bg-purple-950/30"
                                                    >
                                                        {activeHydrationToolName === tool.name ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                                                Hydrating...
                                                            </>
                                                        ) : isLoaded ? 'Hydrate schema' : 'Load + hydrate'}
                                                    </Button>
                                                    <Button
                                                        onClick={() => {
                                                            void unloadTool(tool.name);
                                                        }}
                                                        disabled={unloadMutation.isPending || !isLoaded || activeUnloadToolName === tool.name}
                                                        title="Unload this tool from the current working set"
                                                        aria-label={`Unload tool ${tool.name}`}
                                                        variant="outline"
                                                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                                    >
                                                        {activeUnloadToolName === tool.name ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                                                Unloading...
                                                            </>
                                                        ) : 'Unload'}
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : searchError ? (
                                <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 py-12 px-6 text-center text-amber-200">
                                    <div className="font-medium">Tool search unavailable</div>
                                    <div className="mt-2 text-sm text-amber-200/80">{searchError}</div>
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
                                    <div className="mt-1 text-xl font-semibold text-white">{workingSetError ? '—' : (workingSetLimits?.maxLoadedTools ?? 0)}</div>
                                </div>
                                <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                                    <div className="text-xs uppercase tracking-wider text-zinc-500">Schema cap</div>
                                    <div className="mt-1 text-xl font-semibold text-white">{workingSetError ? '—' : (workingSetLimits?.maxHydratedSchemas ?? 0)}</div>
                                </div>
                                <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 col-span-2">
                                    <div className="text-xs uppercase tracking-wider text-zinc-500">Idle eviction threshold</div>
                                    <div className="mt-1 text-xl font-semibold text-white">
                                        {workingSetError ? 'unavailable' : `${Math.max(0.17, Number(((workingSetLimits?.idleEvictionThresholdMs ?? 0) / 60000).toFixed(2)))} min`}
                                    </div>
                                </div>
                            </div>

                            {workingSetError ? (
                                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
                                    Working set unavailable: {workingSetError}
                                </div>
                            ) : null}

                            <div className="space-y-3 max-h-[420px] overflow-y-auto">
                                {workingSet.length > 0 ? (
                                    <>
                                        {[
                                            { label: 'Server always-on', tone: 'text-sky-300', tools: sortedAlwaysOnWorkingSet },
                                            { label: 'Keep warm profile', tone: 'text-cyan-300', tools: sortedKeepWarmWorkingSet },
                                            { label: 'Dynamic loaded', tone: 'text-zinc-300', tools: sortedDynamicWorkingSet },
                                        ].map((section) => (
                                            <div key={section.label} className="space-y-2">
                                                <div className={`text-[10px] uppercase tracking-wider ${section.tone}`}>
                                                    {section.label} ({section.tools.length})
                                                </div>
                                                {section.tools.length > 0 ? section.tools.map((tool) => (
                                                    <div key={tool.name} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
                                                        {(() => {
                                                            const idleMs = tool.lastAccessedAt > 0 ? Math.max(0, Date.now() - tool.lastAccessedAt) : 0;
                                                            const nearingIdleEviction = idleEvictionThresholdMs > 0 && idleMs >= idleEvictionThresholdMs;
                                                            return (
                                                                <>
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <div className="font-mono text-sm text-zinc-100 break-all">{tool.name}</div>
                                                                <div className="text-xs text-zinc-500 mt-1">
                                                                    loaded {formatRelativeTimestamp(tool.lastLoadedAt)} • touched {formatRelativeTimestamp(tool.lastAccessedAt)} • idle {formatDurationCompact(idleMs)}
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
                                                        {nearingIdleEviction ? (
                                                            <div className="text-[10px] rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-200 uppercase tracking-wider">
                                                                High eviction risk: idle beyond threshold ({formatDurationCompact(idleEvictionThresholdMs)})
                                                            </div>
                                                        ) : null}
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <Link
                                                                href={`/dashboard/mcp/inspector?tool=${encodeURIComponent(tool.name)}`}
                                                                title="Inspect this loaded tool"
                                                                aria-label={`Inspect loaded tool ${tool.name}`}
                                                                className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                                                            >
                                                                Inspect
                                                            </Link>
                                                            <Button
                                                                onClick={() => {
                                                                    void hydrateToolSchema(tool.name, true);
                                                                }}
                                                                disabled={hydrateMutation.isPending || activeHydrationToolName === tool.name || tool.hydrated}
                                                                variant="outline"
                                                                title="Hydrate this loaded tool schema"
                                                                aria-label={`Hydrate loaded tool ${tool.name}`}
                                                                className="w-full border-purple-700 text-purple-200 hover:bg-purple-950/30"
                                                            >
                                                                {activeHydrationToolName === tool.name ? (
                                                                    <>
                                                                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                                                        Hydrating...
                                                                    </>
                                                                ) : 'Hydrate'}
                                                            </Button>
                                                            <Button
                                                                onClick={() => {
                                                                    void unloadTool(tool.name);
                                                                }}
                                                                disabled={activeUnloadToolName === tool.name}
                                                                variant="outline"
                                                                title="Remove this loaded tool from the active session"
                                                                aria-label={`Unload loaded tool ${tool.name}`}
                                                                className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                                            >
                                                                {activeUnloadToolName === tool.name ? (
                                                                    <>
                                                                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                                                        Unloading...
                                                                    </>
                                                                ) : 'Unload'}
                                                            </Button>
                                                        </div>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                )) : (
                                                    <div className="rounded-lg border border-dashed border-zinc-800 p-3 text-xs text-zinc-500 text-center">
                                                        none
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-500 text-center">
                                        No tools currently loaded.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-3 border-b border-zinc-800">
                            <CardTitle className="text-white flex items-center gap-2 text-base">
                                <SlidersHorizontal className="h-4 w-4 text-violet-400" />
                                Working-set capacity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <p className="text-xs text-zinc-500">
                                Controls how many tools/schemas the session keeps warm and when long-idle tools become preferred eviction candidates.
                            </p>

                            {/* maxLoadedTools slider */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs uppercase tracking-wider text-zinc-400">Loaded tools cap</span>
                                    <span className="text-sm font-semibold text-white">{maxLoadedToolsDraft}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min={4}
                                        max={64}
                                        step={1}
                                        value={maxLoadedToolsDraft}
                                        onChange={(e) => setMaxLoadedToolsDraft(Number(e.target.value))}
                                        className="w-full"
                                        title="Maximum number of tools loaded simultaneously before LRU eviction (4–64)"
                                        aria-label="Maximum loaded tools"
                                    />
                                    <input
                                        type="number"
                                        min={4}
                                        max={64}
                                        step={1}
                                        value={maxLoadedToolsDraft}
                                        onChange={(e) => setMaxLoadedToolsDraft(Number(e.target.value))}
                                        className="w-16 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
                                        title="Loaded tools cap (4–64)"
                                        aria-label="Loaded tools cap numeric input"
                                    />
                                </div>
                            </div>

                            {/* maxHydratedSchemas slider */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs uppercase tracking-wider text-zinc-400">Hydrated schemas cap</span>
                                    <span className="text-sm font-semibold text-white">{maxHydratedSchemasDraft}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min={2}
                                        max={32}
                                        step={1}
                                        value={maxHydratedSchemasDraft}
                                        onChange={(e) => setMaxHydratedSchemasDraft(Number(e.target.value))}
                                        className="w-full"
                                        title="Maximum number of hydrated schemas kept warm simultaneously before LRU eviction (2–32)"
                                        aria-label="Maximum hydrated schemas"
                                    />
                                    <input
                                        type="number"
                                        min={2}
                                        max={32}
                                        step={1}
                                        value={maxHydratedSchemasDraft}
                                        onChange={(e) => setMaxHydratedSchemasDraft(Number(e.target.value))}
                                        className="w-16 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
                                        title="Hydrated schemas cap (2–32)"
                                        aria-label="Hydrated schemas cap numeric input"
                                    />
                                </div>
                            </div>

                            {/* idleEvictionThresholdMs slider */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs uppercase tracking-wider text-zinc-400">Idle eviction threshold (minutes)</span>
                                    <span className="text-sm font-semibold text-white">{idleEvictionThresholdMinutes}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min={0.17}
                                        max={1440}
                                        step={0.01}
                                        value={idleEvictionThresholdMinutes}
                                        onChange={(e) => setIdleEvictionThresholdDraftMs(Math.round(Number(e.target.value) * 60_000))}
                                        className="w-full"
                                        title="Idle duration threshold (minutes) after which tools are preferred eviction candidates"
                                        aria-label="Idle eviction threshold in minutes"
                                    />
                                    <input
                                        type="number"
                                        min={0.17}
                                        max={1440}
                                        step={0.01}
                                        value={idleEvictionThresholdMinutes}
                                        onChange={(e) => setIdleEvictionThresholdDraftMs(Math.round(Number(e.target.value) * 60_000))}
                                        className="w-20 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
                                        title="Idle eviction threshold in minutes"
                                        aria-label="Idle eviction threshold numeric input"
                                    />
                                </div>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                                onClick={saveCapacity}
                                disabled={setPreferencesMutation.isPending}
                                title="Save working-set capacity limits and apply them to the live session"
                                aria-label="Save working-set capacity limits"
                            >
                                Apply capacity
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-3 border-b border-zinc-800">
                            <CardTitle className="text-white flex items-center gap-2 text-base">
                                <Database className="h-4 w-4 text-sky-300" />
                                Tool visibility lanes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <p className="text-xs text-zinc-500">
                                Always-on tools are advertised immediately by always-on servers, while keep-warm tools are your pinned preload set.
                                Both lanes expose direct load/hydrate/unload actions so you can prepare working-set depth before the next call.
                            </p>

                            {([
                                {
                                    id: 'always-on-lane',
                                    label: 'Always-on advertised',
                                    tone: 'text-sky-300',
                                    tools: sortedAlwaysOnCatalog,
                                    empty: 'No always-on advertised tools detected in catalog.',
                                },
                                {
                                    id: 'keep-warm-lane',
                                    label: 'Keep warm profile',
                                    tone: 'text-cyan-300',
                                    tools: sortedKeepWarmCatalog,
                                    empty: 'No keep-warm profile tools configured yet.',
                                },
                            ] as const).map((lane) => {
                                const laneLoadedCount = lane.tools.filter((tool) => loadedToolNames.has(tool.name)).length;
                                const laneHydratedCount = lane.tools.filter((tool) => Boolean(workingSetByName.get(tool.name)?.hydrated || tool.hydrated)).length;
                                const hasLoadCandidates = laneLoadedCount < lane.tools.length;
                                const hasHydrateCandidates = laneHydratedCount < lane.tools.length;
                                const hasUnloadCandidates = laneLoadedCount > 0;

                                return (
                                <div key={lane.id} className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className={`text-[10px] uppercase tracking-wider ${lane.tone}`}>
                                            {lane.label} ({lane.tools.length})
                                        </div>
                                        <div className="text-[10px] text-zinc-500">
                                            {laneLoadedCount}/{lane.tools.length} loaded • {laneHydratedCount}/{lane.tools.length} schema
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    void runLaneAction(lane.id, 'load', lane.tools as SearchResult[]);
                                                }}
                                                disabled={loadMutation.isPending || hydrateMutation.isPending || unloadMutation.isPending || activeLaneAction != null || lane.tools.length === 0 || !hasLoadCandidates}
                                                title={hasLoadCandidates ? `Load all ${lane.label.toLowerCase()} tools into working set` : `All ${lane.label.toLowerCase()} tools are already loaded`}
                                                aria-label={`Load all ${lane.label.toLowerCase()} tools`}
                                                className="border-blue-700 text-blue-200 hover:bg-blue-950/30"
                                            >
                                                {activeLaneAction === `${lane.id}:load` ? (
                                                    <>
                                                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                        Loading...
                                                    </>
                                                ) : 'Load all'}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    void runLaneAction(lane.id, 'hydrate', lane.tools as SearchResult[]);
                                                }}
                                                disabled={loadMutation.isPending || hydrateMutation.isPending || unloadMutation.isPending || activeLaneAction != null || lane.tools.length === 0 || !hasHydrateCandidates}
                                                title={hasHydrateCandidates ? `Hydrate all ${lane.label.toLowerCase()} tools` : `All ${lane.label.toLowerCase()} tools are already hydrated`}
                                                aria-label={`Hydrate all ${lane.label.toLowerCase()} tools`}
                                                className="border-purple-700 text-purple-200 hover:bg-purple-950/30"
                                            >
                                                {activeLaneAction === `${lane.id}:hydrate` ? (
                                                    <>
                                                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                        Hydrating...
                                                    </>
                                                ) : 'Hydrate all'}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    void runLaneAction(lane.id, 'unload', lane.tools as SearchResult[]);
                                                }}
                                                disabled={loadMutation.isPending || hydrateMutation.isPending || unloadMutation.isPending || activeLaneAction != null || lane.tools.length === 0 || !hasUnloadCandidates}
                                                title={hasUnloadCandidates ? `Unload all ${lane.label.toLowerCase()} tools` : `All ${lane.label.toLowerCase()} tools are already unloaded`}
                                                aria-label={`Unload all ${lane.label.toLowerCase()} tools`}
                                                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                            >
                                                {activeLaneAction === `${lane.id}:unload` ? (
                                                    <>
                                                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                        Unloading...
                                                    </>
                                                ) : 'Unload all'}
                                            </Button>
                                        </div>
                                    </div>
                                    {allToolsError ? (
                                        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200 text-center">
                                            {allToolsError}
                                        </div>
                                    ) : lane.tools.length > 0 ? (
                                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                            {lane.tools.map((tool) => {
                                                const loaded = loadedToolNames.has(tool.name);
                                                const hydrated = Boolean(workingSetByName.get(tool.name)?.hydrated || tool.hydrated);

                                                return (
                                                    <div key={`${lane.id}-${tool.name}`} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <div className="font-mono text-xs text-zinc-100 break-all">{tool.name}</div>
                                                                <div className="text-[10px] text-zinc-500 mt-1 break-all">{tool.serverDisplayName || tool.server}</div>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                {loaded ? (
                                                                    <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300 uppercase tracking-wider">
                                                                        loaded
                                                                    </span>
                                                                ) : null}
                                                                {hydrated ? (
                                                                    <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded text-purple-300 uppercase tracking-wider">
                                                                        schema
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    void loadTool(tool.name);
                                                                }}
                                                                disabled={loadMutation.isPending || loaded || activeLoadToolName === tool.name}
                                                                title="Load this lane tool into working set"
                                                                aria-label={`Load ${tool.name} from ${lane.label}`}
                                                                className="border-blue-700 text-blue-200 hover:bg-blue-950/30"
                                                            >
                                                                {activeLoadToolName === tool.name ? (
                                                                    <>
                                                                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                                                        Loading...
                                                                    </>
                                                                ) : loaded ? 'Loaded' : 'Load'}
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    void hydrateToolSchema(tool.name, loaded);
                                                                }}
                                                                disabled={hydrateMutation.isPending || loadMutation.isPending || activeHydrationToolName === tool.name || hydrated}
                                                                title={loaded ? "Hydrate schema for this lane tool" : "Load then hydrate schema for this lane tool"}
                                                                aria-label={`Hydrate schema for ${tool.name} from ${lane.label}`}
                                                                className="border-purple-700 text-purple-200 hover:bg-purple-950/30"
                                                            >
                                                                {activeHydrationToolName === tool.name ? (
                                                                    <>
                                                                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                                                        Hydrating...
                                                                    </>
                                                                ) : loaded ? 'Hydrate' : 'Load + hydrate'}
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    void unloadTool(tool.name);
                                                                }}
                                                                disabled={unloadMutation.isPending || !loaded || activeUnloadToolName === tool.name}
                                                                title={loaded ? 'Unload this lane tool from working set' : 'Tool is already unloaded'}
                                                                aria-label={`Unload ${tool.name} from ${lane.label}`}
                                                                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                                            >
                                                                {activeUnloadToolName === tool.name ? (
                                                                    <>
                                                                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                                                        Unloading...
                                                                    </>
                                                                ) : loaded ? 'Unload' : 'Unloaded'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-zinc-800 p-3 text-xs text-zinc-500 text-center">
                                            {lane.empty}
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-3 border-b border-zinc-800 flex flex-row items-center justify-between gap-3">
                            <CardTitle className="text-white flex items-center gap-2 text-base">
                                <History className="h-4 w-4 text-amber-400" />
                                Recent evictions
                            </CardTitle>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={clearEvictionHistoryMutation.isPending || recentEvictions.length === 0 || Boolean(evictionHistoryError)}
                                onClick={() => clearEvictionHistoryMutation.mutate()}
                                title="Clear the recent working-set eviction history"
                                aria-label="Clear working-set eviction history"
                                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                            >
                                {clearEvictionHistoryMutation.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-2 h-3.5 w-3.5" />}
                                Clear
                            </Button>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="rounded-md border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-zinc-300">events: {evictionSummary.total}</span>
                                <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-200">idle-biased: {evictionSummary.idleEvictions}</span>
                                <span className="rounded-md border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-zinc-300">capacity: {evictionSummary.capacityEvictions}</span>
                                <span className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-red-300">loaded-tier: {evictionSummary.loadedTierEvictions}</span>
                                <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-purple-300">hydrated-tier: {evictionSummary.hydratedTierEvictions}</span>
                                <span className="rounded-md border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-zinc-300">max idle: {formatDurationCompact(evictionSummary.longestIdleDurationMs)}</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="text-zinc-500 uppercase tracking-wider">triage</span>
                                {([
                                    { key: 'all', label: 'all reasons' },
                                    { key: 'idle-biased', label: 'idle-biased' },
                                    { key: 'capacity', label: 'capacity' },
                                ] as const).map((option) => (
                                    <button
                                        key={`search-eviction-reason-${option.key}`}
                                        type="button"
                                        onClick={() => setEvictionReasonFilter(option.key)}
                                        aria-pressed={evictionReasonFilter === option.key}
                                        className={`rounded-md border px-2 py-1 transition-colors ${evictionReasonFilter === option.key
                                            ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                                            : 'border-zinc-700 bg-zinc-950/70 text-zinc-300 hover:bg-zinc-800'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                                {([
                                    { key: 'all', label: 'all tiers' },
                                    { key: 'loaded', label: 'loaded' },
                                    { key: 'hydrated', label: 'hydrated' },
                                ] as const).map((option) => (
                                    <button
                                        key={`search-eviction-tier-${option.key}`}
                                        type="button"
                                        onClick={() => setEvictionTierFilter(option.key)}
                                        aria-pressed={evictionTierFilter === option.key}
                                        className={`rounded-md border px-2 py-1 transition-colors ${evictionTierFilter === option.key
                                            ? 'border-violet-500/40 bg-violet-500/15 text-violet-200'
                                            : 'border-zinc-700 bg-zinc-950/70 text-zinc-300 hover:bg-zinc-800'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                                {([
                                    { key: 'all', label: 'all time' },
                                    { key: '5m', label: '5m' },
                                    { key: '15m', label: '15m' },
                                    { key: '1h', label: '1h' },
                                    { key: '24h', label: '24h' },
                                ] as const).map((option) => (
                                    <button
                                        key={`search-eviction-window-${option.key}`}
                                        type="button"
                                        onClick={() => setEvictionWindowFilter(option.key)}
                                        aria-pressed={evictionWindowFilter === option.key}
                                        className={`rounded-md border px-2 py-1 transition-colors ${evictionWindowFilter === option.key
                                            ? 'border-sky-500/40 bg-sky-500/15 text-sky-200'
                                            : 'border-zinc-700 bg-zinc-950/70 text-zinc-300 hover:bg-zinc-800'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                                <span className="rounded-md border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-zinc-300">
                                    showing: {Math.min(filteredEvictions.length, 10)}/{filteredEvictions.length} filtered ({recentEvictions.length} total)
                                </span>
                                <button
                                    type="button"
                                    onClick={resetEvictionFilters}
                                    disabled={evictionFiltersAtDefault}
                                    className="ml-auto rounded-md border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
                                    title="Reset eviction filters to defaults"
                                    aria-label="Reset eviction filters"
                                >
                                    Reset filters
                                </button>
                                <button
                                    type="button"
                                    onClick={copyEvictionShareLink}
                                    className="rounded-md border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-zinc-300 transition-colors hover:bg-zinc-800"
                                    title="Copy URL with current eviction filter scope"
                                    aria-label="Copy eviction share link"
                                >
                                    Copy link
                                </button>
                                <button
                                    type="button"
                                    onClick={copyEvictionSummary}
                                    className="rounded-md border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-zinc-300 transition-colors hover:bg-zinc-800"
                                    title="Copy a text summary of current eviction triage scope"
                                    aria-label="Copy eviction summary"
                                >
                                    Copy summary
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="text-zinc-500 uppercase tracking-wider">Active filters</span>
                                {evictionReasonFilter !== 'all' ? (
                                    <button
                                        type="button"
                                        onClick={() => setEvictionReasonFilter('all')}
                                        className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-200 transition-colors hover:bg-amber-500/20"
                                        title="Clear eviction reason filter"
                                        aria-label="Clear eviction reason filter"
                                    >
                                        reason: {evictionReasonFilter} ×
                                    </button>
                                ) : null}
                                {evictionTierFilter !== 'all' ? (
                                    <button
                                        type="button"
                                        onClick={() => setEvictionTierFilter('all')}
                                        className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-violet-200 transition-colors hover:bg-violet-500/20"
                                        title="Clear eviction tier filter"
                                        aria-label="Clear eviction tier filter"
                                    >
                                        tier: {evictionTierFilter} ×
                                    </button>
                                ) : null}
                                {evictionWindowFilter !== 'all' ? (
                                    <button
                                        type="button"
                                        onClick={() => setEvictionWindowFilter('all')}
                                        className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-sky-200 transition-colors hover:bg-sky-500/20"
                                        title="Clear eviction window filter"
                                        aria-label="Clear eviction window filter"
                                    >
                                        window: {evictionWindowFilter} ×
                                    </button>
                                ) : null}
                                {evictionFiltersAtDefault ? (
                                    <span className="rounded-md border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-zinc-500">
                                        default scope
                                    </span>
                                ) : null}
                            </div>

                            {evictionHistoryError ? (
                                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200 text-center">
                                    {evictionHistoryError}
                                </div>
                            ) : filteredEvictions.length > 0 ? (
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {filteredEvictions.slice(0, 10).map((event, index) => (
                                        <div key={`${event.toolName}-${event.timestamp}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                                            <div className="min-w-0">
                                                <span className="font-mono text-xs text-zinc-200 break-all block">{event.toolName}</span>
                                                <span className="text-[10px] text-zinc-500 block mt-0.5">
                                                    idle {formatDurationCompact(event.idleDurationMs ?? 0)}
                                                    <span className={`ml-1 rounded px-1.5 py-0.5 ${event.idleEvicted ? 'bg-amber-500/10 text-amber-300' : 'bg-zinc-800 text-zinc-400'}`}>
                                                        {event.idleEvicted ? 'idle-biased' : 'capacity'}
                                                    </span>
                                                </span>
                                                <div className="mt-1 flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => focusTelemetryFromEviction(event.toolName)}
                                                        className="inline-flex items-center text-[10px] text-cyan-300 hover:text-cyan-200"
                                                        title={`Focus telemetry on ${event.toolName}`}
                                                        aria-label={`Focus telemetry on ${event.toolName}`}
                                                    >
                                                        Focus telemetry
                                                    </button>
                                                    <Link
                                                        href={`/dashboard/mcp/inspector?telemetryStatus=error&telemetryTool=${encodeURIComponent(event.toolName)}`}
                                                        className="inline-flex items-center text-[10px] text-zinc-400 hover:text-zinc-200"
                                                        title={`Open inspector telemetry errors filtered to ${event.toolName}`}
                                                        aria-label={`Open inspector error telemetry for ${event.toolName}`}
                                                    >
                                                        Open in inspector
                                                    </Link>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${event.tier === 'loaded' ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>
                                                    {event.tier}
                                                </span>
                                                <span className="text-[10px] text-zinc-500">{formatRelativeTimestamp(event.timestamp)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed border-zinc-800 p-4 text-xs text-zinc-500 text-center">
                                    No eviction events match the current reason/tier/window filter.
                                </div>
                            )}
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
                                disabled={clearTelemetryMutation.isPending || telemetry.length === 0 || Boolean(telemetryError)}
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
                            <div className="mb-3 grid gap-2">
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="text-zinc-500 uppercase tracking-wider">Presets</span>
                                    {telemetryTriagePresets.map((preset) => (
                                        (() => {
                                            const isActive = isTelemetryPresetActive(preset.value);

                                            return (
                                        <button
                                            key={`telemetry-preset-${preset.value}`}
                                            type="button"
                                            onClick={() => applyTelemetryPreset(preset.value)}
                                            className={`rounded-md border px-2 py-1 transition-colors ${isActive
                                                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                                                : 'border-zinc-700 bg-zinc-950/70 text-zinc-300 hover:bg-zinc-800'
                                                }`}
                                            title={isActive
                                                ? `${preset.label} telemetry triage preset is active`
                                                : `Apply ${preset.label.toLowerCase()} telemetry triage preset`}
                                            aria-label={`Apply ${preset.label} telemetry triage preset`}
                                            aria-pressed={isActive}
                                        >
                                            {preset.label}
                                        </button>
                                            );
                                        })()
                                    ))}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="text-zinc-500 uppercase tracking-wider">Active filters</span>
                                    {telemetryTypeFilter !== 'all' ? (
                                        <button
                                            type="button"
                                            onClick={() => setTelemetryTypeFilter('all')}
                                            className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-blue-200 transition-colors hover:bg-blue-500/20"
                                            title="Clear telemetry type filter"
                                            aria-label="Clear telemetry type filter"
                                        >
                                            type: {telemetryTypeFilter} ×
                                        </button>
                                    ) : null}
                                    {telemetryStatusFilter !== 'all' ? (
                                        <button
                                            type="button"
                                            onClick={() => setTelemetryStatusFilter('all')}
                                            className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-cyan-200 transition-colors hover:bg-cyan-500/20"
                                            title="Clear telemetry status filter"
                                            aria-label="Clear telemetry status filter"
                                        >
                                            status: {telemetryStatusFilter} ×
                                        </button>
                                    ) : null}
                                    {telemetryWindowFilter !== '15m' ? (
                                        <button
                                            type="button"
                                            onClick={() => setTelemetryWindowFilter('15m')}
                                            className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-violet-200 transition-colors hover:bg-violet-500/20"
                                            title="Clear telemetry window filter"
                                            aria-label="Clear telemetry window filter"
                                        >
                                            window: {telemetryWindowFilter} ×
                                        </button>
                                    ) : null}
                                    {telemetrySourceFilter !== 'all' ? (
                                        <button
                                            type="button"
                                            onClick={() => setTelemetrySourceFilter('all')}
                                            className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-200 transition-colors hover:bg-amber-500/20"
                                            title="Clear telemetry source filter"
                                            aria-label="Clear telemetry source filter"
                                        >
                                            source: {telemetrySourceFilter} ×
                                        </button>
                                    ) : null}
                                    {telemetryToolFilter !== 'all' ? (
                                        <button
                                            type="button"
                                            onClick={() => setTelemetryToolFilter('all')}
                                            className="rounded-md border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-1 text-fuchsia-200 transition-colors hover:bg-fuchsia-500/20"
                                            title="Clear telemetry tool filter"
                                            aria-label="Clear telemetry tool filter"
                                        >
                                            tool: {telemetryToolFilter} ×
                                        </button>
                                    ) : null}
                                    {telemetryBucketTimeFilter ? (
                                        <button
                                            type="button"
                                            onClick={() => setTelemetryBucketTimeFilter(null)}
                                            className="rounded-md border border-teal-500/30 bg-teal-500/10 px-2 py-1 text-teal-200 transition-colors hover:bg-teal-500/20"
                                            title="Clear telemetry bucket time filter"
                                            aria-label="Clear telemetry bucket time filter"
                                        >
                                            bucket: {formatTelemetryBucketRange(telemetryBucketTimeFilter.start, telemetryBucketTimeFilter.end)} ×
                                        </button>
                                    ) : null}
                                    {activeTelemetryPreset ? (
                                        <span
                                            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-200"
                                            title="Currently matched telemetry triage preset"
                                        >
                                            preset: {activeTelemetryPreset.label}
                                        </span>
                                    ) : null}
                                    {telemetryFiltersAtDefault ? (
                                        <span className="rounded-md border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-zinc-500">
                                            default scope
                                        </span>
                                    ) : null}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="rounded-md border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-zinc-300">
                                        total: {telemetrySummary.total}
                                    </span>
                                    <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-300">
                                        success: {telemetrySummary.success}
                                    </span>
                                    <span className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-red-300">
                                        errors: {telemetrySummary.error}
                                    </span>
                                    <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-200">
                                        ignored results: {telemetrySummary.ignoredResults}
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="text-zinc-500 uppercase tracking-wider">Type</span>
                                    {(['all', 'search', 'load', 'hydrate', 'unload'] as const).map((option) => {
                                        const active = telemetryTypeFilter === option;
                                        return (
                                            <button
                                                key={`telemetry-type-${option}`}
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
                                                key={`telemetry-status-${option}`}
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
                                                key={`telemetry-window-${option.value}`}
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
                                    {([
                                        { value: 'all', label: 'All' },
                                        { value: 'runtime-search', label: 'Runtime' },
                                        { value: 'cached-ranking', label: 'Cached' },
                                        { value: 'live-aggregator', label: 'Live' },
                                        { value: 'manual-action', label: 'Manual' },
                                    ] as const).map((option) => {
                                        const active = telemetrySourceFilter === option.value;
                                        return (
                                            <button
                                                key={`telemetry-source-filter-${option.value}`}
                                                type="button"
                                                onClick={() => setTelemetrySourceFilter(option.value)}
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
                                        className="ml-auto rounded-md border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-zinc-300 transition-colors hover:bg-zinc-800"
                                        title="Reset telemetry type/status/window/source filters to defaults"
                                        aria-label="Reset telemetry filters"
                                    >
                                        Reset filters
                                    </button>

                                    <button
                                        type="button"
                                        onClick={copyTelemetryShareLink}
                                        className="rounded-md border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-zinc-300 transition-colors hover:bg-zinc-800"
                                        title="Copy URL with current telemetry filters"
                                        aria-label="Copy telemetry share link"
                                    >
                                        Copy link
                                    </button>

                                    <button
                                        type="button"
                                        onClick={copyTelemetrySummary}
                                        className="rounded-md border border-zinc-700 bg-zinc-950/70 px-2 py-1 text-zinc-300 transition-colors hover:bg-zinc-800"
                                        title="Copy a concise telemetry summary for handoff"
                                        aria-label="Copy telemetry summary"
                                    >
                                        Copy summary
                                    </button>

                                    <Link
                                        href={buildInspectorTelemetryHref()}
                                        className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-blue-200 transition-colors hover:bg-blue-500/20"
                                        title="Open MCP Inspector with current telemetry scope"
                                        aria-label="Open MCP Inspector with current telemetry scope"
                                    >
                                        Open Inspector
                                    </Link>
                                </div>
                            </div>

                            <div className="mb-4 space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                                <div className="text-[10px] uppercase tracking-wider text-zinc-500">Status trend ({telemetryWindowFilter})</div>
                                {telemetryStatusTrend.some((bucket) => bucket.total > 0) ? (
                                    <div className="grid grid-cols-6 gap-1">
                                        {telemetryStatusTrend.map((bucket) => {
                                            const bucketSelected = telemetryBucketTimeFilter != null
                                                && telemetryBucketTimeFilter.start === bucket.start
                                                && telemetryBucketTimeFilter.end === bucket.end;
                                            const successWidth = bucket.total > 0 ? Math.round((bucket.successCount / bucket.total) * 100) : 0;
                                            const errorWidth = bucket.total > 0 ? Math.round((bucket.errorCount / bucket.total) * 100) : 0;
                                            const drilldownDisabled = bucket.total === 0;
                                            const successDrilldownDisabled = drilldownDisabled || bucket.successCount === 0;
                                            const errorDrilldownDisabled = drilldownDisabled || bucket.errorCount === 0;

                                            return (
                                                <div
                                                    key={`status-trend-${bucket.label}`}
                                                    className={`space-y-1 rounded-sm border px-0.5 py-0.5 transition-colors ${drilldownDisabled
                                                        ? 'opacity-40'
                                                        : ''
                                                        } ${bucketSelected
                                                        ? 'border-teal-500/50 bg-teal-500/10'
                                                        : 'border-transparent hover:border-zinc-700/80'
                                                        }`}
                                                    title={[
                                                        `${bucket.label} • ${bucket.successCount} ok / ${bucket.errorCount} err`,
                                                        drilldownDisabled ? 'No events in this bucket' : 'Click bar background to focus bucket window. Click green/red segments for success/error drilldown.',
                                                    ].join('\n')}
                                                >
                                                    <div
                                                        role="button"
                                                        tabIndex={drilldownDisabled ? -1 : 0}
                                                        onClick={() => {
                                                            if (drilldownDisabled) {
                                                                return;
                                                            }

                                                            setTelemetryBucketTimeFilter({
                                                                start: bucket.start,
                                                                end: bucket.end,
                                                                source: telemetrySourceFilter !== 'all' ? telemetrySourceFilter : undefined,
                                                            });
                                                        }}
                                                        onKeyDown={(event) => {
                                                            if (drilldownDisabled) {
                                                                return;
                                                            }

                                                            if (event.key === 'Enter' || event.key === ' ') {
                                                                event.preventDefault();
                                                                setTelemetryBucketTimeFilter({
                                                                    start: bucket.start,
                                                                    end: bucket.end,
                                                                    source: telemetrySourceFilter !== 'all' ? telemetrySourceFilter : undefined,
                                                                });
                                                            }
                                                        }}
                                                        className={`h-2 w-full rounded border border-zinc-800/80 bg-zinc-900/80 overflow-hidden flex ${drilldownDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                                        title={drilldownDisabled ? 'No events in this bucket' : 'Focus bucket time range'}
                                                        aria-label={drilldownDisabled ? `${bucket.label} has no events` : `Focus bucket ${bucket.label} time range`}
                                                    >
                                                        <button
                                                            type="button"
                                                            disabled={successDrilldownDisabled}
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                setTelemetryBucketTimeFilter({
                                                                    start: bucket.start,
                                                                    end: bucket.end,
                                                                    source: telemetrySourceFilter !== 'all' ? telemetrySourceFilter : undefined,
                                                                });
                                                                setTelemetryStatusFilter('success');
                                                            }}
                                                            className="h-full bg-emerald-500/70 hover:bg-emerald-500/85 disabled:cursor-not-allowed"
                                                            style={{ width: `${successWidth}%` }}
                                                            title={successDrilldownDisabled ? 'No success events in this bucket' : `Focus success events for ${bucket.label}`}
                                                            aria-label={successDrilldownDisabled ? `${bucket.label} has no success events` : `Focus success events for ${bucket.label}`}
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled={errorDrilldownDisabled}
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                setTelemetryBucketTimeFilter({
                                                                    start: bucket.start,
                                                                    end: bucket.end,
                                                                    source: telemetrySourceFilter !== 'all' ? telemetrySourceFilter : undefined,
                                                                });
                                                                setTelemetryStatusFilter('error');
                                                            }}
                                                            className="h-full bg-red-500/75 hover:bg-red-500/90 disabled:cursor-not-allowed"
                                                            style={{ width: `${errorWidth}%` }}
                                                            title={errorDrilldownDisabled ? 'No error events in this bucket' : `Focus error events for ${bucket.label}`}
                                                            aria-label={errorDrilldownDisabled ? `${bucket.label} has no error events` : `Focus error events for ${bucket.label}`}
                                                        />
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

                            <div className="mb-4 space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                                <div className="text-[10px] uppercase tracking-wider text-zinc-500">Per-source breakdown</div>
                                {telemetrySourceStats.some((item) => item.count > 0) ? (
                                    <div className="space-y-2">
                                        {telemetrySourceStats.map((item) => {
                                            const widthPercent = maxTelemetrySourceCount > 0
                                                ? Math.max(6, Math.round((item.count / maxTelemetrySourceCount) * 100))
                                                : 0;

                                            return (
                                                <div key={`telemetry-source-${item.source}`} className="space-y-2">
                                                    <div className="flex items-center justify-between gap-3 text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-zinc-300">{item.source}</span>
                                                            <span className={`rounded border px-1.5 py-0.5 text-[10px] ${item.errorRatePercent >= 50
                                                                ? 'border-red-500/30 bg-red-500/10 text-red-300'
                                                                : item.errorRatePercent >= 20
                                                                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                                                                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                                                }`}>
                                                                err {item.errorRatePercent}%
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-zinc-500">
                                                                {item.count} events • {item.success} ok / {item.error} err • avg {item.avgLatencyMs}ms
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setTelemetrySourceFilter(item.source);
                                                                    setTelemetryStatusFilter('error');
                                                                }}
                                                                disabled={item.error === 0}
                                                                className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-200 disabled:opacity-40"
                                                                title="Focus this source and show only error events"
                                                                aria-label={`Focus failing events for ${item.source}`}
                                                            >
                                                                Focus failures
                                                            </button>
                                                            <Link
                                                                href={buildInspectorTelemetryHref({
                                                                    source: item.source,
                                                                    status: 'error',
                                                                    bucket: telemetryBucketTimeFilter && telemetryBucketTimeFilter.source === item.source
                                                                        ? { start: telemetryBucketTimeFilter.start, end: telemetryBucketTimeFilter.end }
                                                                        : null,
                                                                })}
                                                                className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-200 transition-colors hover:bg-blue-500/20"
                                                                title="Open Inspector with this source failure scope"
                                                                aria-label={`Open inspector for ${item.source} failures`}
                                                            >
                                                                Open in Inspector
                                                            </Link>
                                                        </div>
                                                    </div>
                                                    <div className="h-1.5 w-full rounded bg-zinc-800/80">
                                                        <div
                                                            className="h-1.5 rounded bg-gradient-to-r from-cyan-500/70 to-blue-500/70"
                                                            style={{ width: `${widthPercent}%` }}
                                                        />
                                                    </div>

                                                    {item.trend.length > 0 ? (
                                                        <div className="space-y-1">
                                                            <div className="text-[10px] uppercase tracking-wider text-zinc-500">trend ({telemetryWindowFilter})</div>
                                                            <div className="grid grid-cols-6 gap-1">
                                                                {item.trend.map((bucket) => {
                                                                    const bucketSelected = telemetryBucketTimeFilter != null
                                                                        && telemetryBucketTimeFilter.start === bucket.start
                                                                        && telemetryBucketTimeFilter.end === bucket.end;
                                                                    const intensity = maxTelemetryTrendBucketCount > 0
                                                                        ? Math.max(0, Math.min(1, bucket.count / maxTelemetryTrendBucketCount))
                                                                        : 0;
                                                                    const errorRatio = bucket.count > 0
                                                                        ? bucket.errorCount / bucket.count
                                                                        : 0;
                                                                    const bucketErrorRatePercent = bucket.count > 0
                                                                        ? Math.round((bucket.errorCount / bucket.count) * 100)
                                                                        : 0;
                                                                    const drilldownDisabled = bucket.count === 0;

                                                                    return (
                                                                        <button
                                                                            type="button"
                                                                            key={`${item.source}-${bucket.label}`}
                                                                            disabled={drilldownDisabled}
                                                                            className={`space-y-1 rounded-sm border px-0.5 py-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${bucketSelected
                                                                                ? 'border-teal-500/50 bg-teal-500/10'
                                                                                : 'border-transparent hover:border-zinc-700/80'
                                                                                }`}
                                                                            onClick={() => {
                                                                                setTelemetrySourceFilter(item.source);
                                                                                setTelemetryStatusFilter('error');
                                                                                setTelemetryBucketTimeFilter({
                                                                                    start: bucket.start,
                                                                                    end: bucket.end,
                                                                                    source: item.source,
                                                                                });
                                                                                if (bucket.topFailingTool) {
                                                                                    setTelemetryToolFilter(bucket.topFailingTool);
                                                                                }
                                                                            }}
                                                                            title={[
                                                                                `${item.source} • ${bucket.label}`,
                                                                                `${bucket.count} events • ${bucket.errorCount} errors`,
                                                                                `Error rate: ${bucketErrorRatePercent}%`,
                                                                                bucket.topFailingTool ? `Top failing tool: ${bucket.topFailingTool}` : null,
                                                                                drilldownDisabled ? 'No events in this bucket' : 'Click to focus this source bucket',
                                                                            ].filter(Boolean).join('\n')}
                                                                            aria-label={drilldownDisabled
                                                                                ? `${item.source} ${bucket.label} has no events`
                                                                                : `Focus ${item.source} ${bucket.label} failures`}
                                                                        >
                                                                            <div className="h-2 rounded border border-zinc-800/80 bg-zinc-900/80 overflow-hidden">
                                                                                <div
                                                                                    className="h-full bg-cyan-500/80"
                                                                                    style={{ width: `${Math.round(intensity * 100)}%` }}
                                                                                />
                                                                                {errorRatio > 0 ? (
                                                                                    <div
                                                                                        className="-mt-2 h-full bg-red-500/70"
                                                                                        style={{ width: `${Math.round(errorRatio * 100)}%` }}
                                                                                    />
                                                                                ) : null}
                                                                            </div>
                                                                            <div className="text-[9px] text-zinc-500 text-center">{bucket.label}</div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-xs text-zinc-500">
                                        No source telemetry in the selected filter window.
                                    </div>
                                )}
                            </div>

                            {telemetryErrorToolRows.length > 0 ? (
                                <div className="mb-4 space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Top failing tools (current scope)</div>
                                    <div className="space-y-1">
                                        {telemetryErrorToolRows.map((row) => (
                                            <div key={`search-error-tool-${row.toolName}`} className="flex items-center justify-between gap-2 rounded border border-zinc-800/70 bg-zinc-900/60 px-2 py-1 text-[10px]">
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
                                <div className="mb-4 space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
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
                                            title="Focus cached ranking decisions likely affected by ambiguity"
                                            aria-label="Focus ambiguous cached ranking decisions"
                                        >
                                            Focus ambiguity
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        {telemetryAmbiguousSearchRows.map((row) => (
                                            <div key={`search-ambiguity-${row.id}`} className="rounded border border-zinc-800/70 bg-zinc-900/60 px-2 py-1 text-[10px] space-y-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="truncate text-zinc-300" title={row.query}>{row.query}</span>
                                                    <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-amber-200">
                                                        gap {row.scoreGap}
                                                    </span>
                                                </div>
                                                <div className="text-zinc-500 truncate" title={`${row.topResultName} vs ${row.secondResultName}`}>
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

                            {telemetryConfidenceStats.total > 0 ? (
                                <div className="mb-4 space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-[10px] uppercase tracking-wider text-zinc-500">Auto-load confidence bands</div>
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
                                            title="Focus search ranking scope where confidence falls below the auto-load floor"
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
                                            title="Focus confidence-near-threshold search events"
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
                                            title="Focus high-confidence search events"
                                            aria-label="Focus high-confidence auto-load events"
                                        >
                                            <span>High confidence</span>
                                            <span>{telemetryConfidenceStats.highConfidence}</span>
                                        </button>
                                    </div>
                                </div>
                            ) : null}

                            {telemetryAutoLoadSkipReasonRows.length > 0 ? (
                                <div className="mb-4 space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Top auto-load skip reasons</div>
                                    <div className="space-y-1">
                                        {telemetryAutoLoadSkipReasonRows.map((row) => (
                                            <div key={`search-skip-reason-${row.reason}`} className="flex items-center justify-between gap-2 rounded border border-zinc-800/70 bg-zinc-900/60 px-2 py-1 text-[10px]">
                                                <span className="truncate text-zinc-300" title={row.reason}>{row.reason}</span>
                                                <span className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-zinc-300">{row.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            <div className="space-y-3 max-h-[420px] overflow-y-auto">
                                {telemetryError ? (
                                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200 text-center">
                                        {telemetryError}
                                    </div>
                                ) : telemetry.length > 0 ? (
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
                                            {event.profile ? <div className="text-xs text-zinc-400 break-all">profile: <span className="text-zinc-200">{event.profile}</span></div> : null}
                                            {event.toolName ? <div className="text-xs text-zinc-400 break-all">tool: <span className="font-mono text-zinc-200">{event.toolName}</span></div> : null}
                                            {typeof event.resultCount === 'number' ? <div className="text-xs text-zinc-400">results: <span className="text-zinc-200">{event.resultCount}</span></div> : null}
                                            {event.topResultName ? <div className="text-xs text-zinc-400 break-all">top result: <span className="font-mono text-zinc-200">{event.topResultName}</span></div> : null}
                                            {event.topMatchReason ? <div className="text-xs text-zinc-400">why: <span className="text-zinc-200">{event.topMatchReason}</span></div> : null}
                                            {typeof event.topScore === 'number' ? <div className="text-xs text-zinc-400">top score: <span className="text-zinc-200">{event.topScore.toFixed(1)}</span></div> : null}
                                            {event.secondResultName ? <div className="text-xs text-zinc-400 break-all">second result: <span className="font-mono text-zinc-200">{event.secondResultName}</span></div> : null}
                                            {event.secondMatchReason ? <div className="text-xs text-zinc-500">second why: <span className="text-zinc-300">{event.secondMatchReason}</span></div> : null}
                                            {typeof event.secondScore === 'number' ? <div className="text-xs text-zinc-500">second score: <span className="text-zinc-300">{event.secondScore.toFixed(1)}</span></div> : null}
                                            {typeof event.scoreGap === 'number' ? <div className="text-xs text-zinc-400">score gap: <span className="text-zinc-200">{event.scoreGap.toFixed(1)}</span></div> : null}
                                            {typeof event.ignoredResultCount === 'number' ? <div className="text-xs text-amber-300">ignored results: {event.ignoredResultCount}</div> : null}
                                            {event.ignoredResultNames && event.ignoredResultNames.length > 0 ? <div className="text-xs text-zinc-400 break-all">ignored top choices: <span className="font-mono text-zinc-200">{event.ignoredResultNames.join(', ')}</span></div> : null}
                                            {typeof event.autoLoadConfidence === 'number' ? (
                                                <div className="text-xs text-cyan-300">confidence: {(event.autoLoadConfidence * 100).toFixed(0)}%</div>
                                            ) : null}
                                            {typeof event.autoLoadMinConfidence === 'number' ? (
                                                <div className="text-xs text-zinc-400">confidence floor: {(event.autoLoadMinConfidence * 100).toFixed(0)}%</div>
                                            ) : null}
                                            {event.autoLoadEvaluated ? (
                                                <div className="text-xs text-zinc-400">auto-load evaluated: <span className="text-zinc-200">yes</span></div>
                                            ) : null}
                                            {event.autoLoadOutcome ? (
                                                <div className="text-xs text-zinc-400">auto-load outcome: <span className="text-zinc-200">{event.autoLoadOutcome}</span></div>
                                            ) : null}
                                            {event.autoLoadExecutionStatus ? (
                                                <div className="text-xs text-zinc-400">auto-load execution: <span className="text-zinc-200">{event.autoLoadExecutionStatus}</span></div>
                                            ) : null}
                                            {event.autoLoadReason ? <div className="text-xs text-cyan-300 break-all">auto-load: {event.autoLoadReason}</div> : null}
                                            {event.autoLoadSkipReason ? <div className="text-xs text-amber-300 break-all">auto-load skipped: {event.autoLoadSkipReason}</div> : null}
                                            {event.autoLoadExecutionError ? <div className="text-xs text-red-300 break-all">auto-load failed: {event.autoLoadExecutionError}</div> : null}
                                            {typeof event.latencyMs === 'number' ? <div className="text-xs text-zinc-500">latency: {event.latencyMs}ms</div> : null}
                                            {typeof event.loadedToolCount === 'number' && typeof event.maxLoadedTools === 'number' ? (
                                                <div className="text-xs text-zinc-500">
                                                    loaded working set: <span className="text-zinc-200">{event.loadedToolCount}/{event.maxLoadedTools}</span>
                                                    {typeof event.loadedUtilizationPct === 'number' ? ` (${event.loadedUtilizationPct}%)` : ''}
                                                </div>
                                            ) : null}
                                            {typeof event.hydratedSchemaCount === 'number' && typeof event.maxHydratedSchemas === 'number' ? (
                                                <div className="text-xs text-zinc-500">
                                                    hydrated schemas: <span className="text-zinc-200">{event.hydratedSchemaCount}/{event.maxHydratedSchemas}</span>
                                                    {typeof event.hydratedUtilizationPct === 'number' ? ` (${event.hydratedUtilizationPct}%)` : ''}
                                                </div>
                                            ) : null}
                                            {typeof event.idleEvictionThresholdMs === 'number' ? (
                                                <div className="text-xs text-zinc-500">
                                                    idle eviction threshold: <span className="text-zinc-200">{formatDurationCompact(event.idleEvictionThresholdMs)}</span>
                                                </div>
                                            ) : null}
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
                                title="Edit the HyperCode MCP JSONC configuration. Changes are saved to the HyperCode config mcp.jsonc file (typically ~/.hypercode/mcp.jsonc)."
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
