import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import fs from 'node:fs/promises';
import { t, publicProcedure, adminProcedure, getMcpAggregator, getMcpServer } from '../lib/trpc-core.js';
import { mcpServerPool } from '../services/mcp-server-pool.service.js';
import { getCachedToolInventory } from '../mcp/cachedToolInventory.js';
import { parseNamespacedToolName } from '../mcp/namespaces.js';
import { isSqliteUnavailableError } from '../db/sqliteAvailability.js';
import {
    evaluateAutoLoadCandidate,
    rankToolSearchCandidates,
    type ToolSearchProfile,
    type ToolSearchScoreBreakdown,
} from '../mcp/toolSearchRanking.js';
import { toolSelectionTelemetry } from '../mcp/toolSelectionTelemetry.js';
import { getBorgMcpJsoncPath, loadBorgMcpConfig, stripJsonComments, writeBorgMcpConfig } from '../mcp/mcpJsonConfig.js';
import {
    applyToolPreferencePatch,
    buildToolPreferenceSettings,
    mergeToolPreferences,
    readToolPreferencesFromSettings,
    type ToolPreferences,
} from './mcp-tool-preferences.js';
import { rethrowSqliteUnavailableAsTrpc } from './sqliteTrpc.js';

type McpToolCallResult = {
    content?: Array<{ type?: string; text?: string }>;
};

type ServerProbeTrafficEvent = {
    server: string;
    method: 'tools/list' | 'tools/call';
    paramsSummary: string;
    latencyMs: number;
    success: boolean;
    timestamp: number;
    toolName?: string;
    error?: string;
};

function getToolTextContent(result: unknown): string {
    const toolResult = result as McpToolCallResult | null | undefined;
    return toolResult?.content?.find((item) => item?.type === 'text')?.text ?? '';
}

function parseToolJson<T>(result: unknown, fallback: T): T {
    const text = getToolTextContent(result);
    if (!text) {
        return fallback;
    }

    try {
        return JSON.parse(text) as T;
    } catch {
        return fallback;
    }
}

function parseEvictedToolsFromMessage(message: string): string[] {
    const match = message.match(/Evicted idle tools:\s*(.+?)\.?$/i);
    if (!match?.[1]) {
        return [];
    }

    return match[1]
        .split(',')
        .map((tool) => tool.trim())
        .filter(Boolean);
}

type WorkingSetSnapshot = {
    limits?: {
        maxLoadedTools?: number;
        maxHydratedSchemas?: number;
        idleEvictionThresholdMs?: number;
    };
    tools?: Array<{ hydrated?: boolean }>;
};

async function readWorkingSetSnapshot(
    server: NonNullable<ReturnType<typeof getMcpServer>>,
): Promise<{
    loadedToolCount: number;
    hydratedSchemaCount: number;
    maxLoadedTools: number;
    maxHydratedSchemas: number;
    idleEvictionThresholdMs: number;
    loadedUtilizationPct: number;
    hydratedUtilizationPct: number;
}> {
    const snapshot = parseToolJson<WorkingSetSnapshot>(
        await server.executeTool('list_loaded_tools', {}),
        { limits: {}, tools: [] },
    );

    const loadedToolCount = Array.isArray(snapshot.tools) ? snapshot.tools.length : 0;
    const hydratedSchemaCount = Array.isArray(snapshot.tools)
        ? snapshot.tools.filter((tool) => Boolean(tool?.hydrated)).length
        : 0;
    const maxLoadedTools = Math.max(1, snapshot.limits?.maxLoadedTools ?? 0);
    const maxHydratedSchemas = Math.max(1, snapshot.limits?.maxHydratedSchemas ?? 0);
    const idleEvictionThresholdMs = Math.max(0, snapshot.limits?.idleEvictionThresholdMs ?? 0);

    return {
        loadedToolCount,
        hydratedSchemaCount,
        maxLoadedTools,
        maxHydratedSchemas,
        idleEvictionThresholdMs,
        loadedUtilizationPct: Math.min(100, Math.round((loadedToolCount / maxLoadedTools) * 100)),
        hydratedUtilizationPct: Math.min(100, Math.round((hydratedSchemaCount / maxHydratedSchemas) * 100)),
    };
}

function toSerializablePayload(value: unknown): unknown {
    try {
        return JSON.parse(JSON.stringify(value, (_key, current) => {
            if (typeof current === 'bigint') {
                return current.toString();
            }

            if (current instanceof Error) {
                return {
                    name: current.name,
                    message: current.message,
                    stack: current.stack,
                };
            }

            if (typeof current === 'undefined') {
                return null;
            }

            return current;
        }));
    } catch {
        return String(value);
    }
}

function summarizeProbePayload(value: unknown): string {
    const textContent = getToolTextContent(value);
    if (textContent) {
        return textContent.length > 180 ? `${textContent.slice(0, 177)}...` : textContent;
    }

    if (Array.isArray(value)) {
        return `Array(${value.length})`;
    }

    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        if (Array.isArray(record.tools)) {
            return `Returned ${record.tools.length} tool${record.tools.length === 1 ? '' : 's'}`;
        }

        const keys = Object.keys(record);
        return keys.length > 0
            ? `Object with keys: ${keys.slice(0, 6).join(', ')}`
            : 'Empty object';
    }

    if (typeof value === 'string') {
        return value.length > 180 ? `${value.slice(0, 177)}...` : value;
    }

    if (value === null || typeof value === 'undefined') {
        return 'No payload returned';
    }

    return String(value);
}

function collectServerProbeTrafficEvents(options: {
    startedAt: number;
    targetKind: 'router' | 'server';
    operation: 'tools/list' | 'tools/call';
    serverName?: string;
    toolName?: string;
}): ServerProbeTrafficEvent[] {
    const aggregator = getMcpAggregator() as { getTrafficEvents?: () => ServerProbeTrafficEvent[] } | null;
    const events = aggregator?.getTrafficEvents?.() ?? [];
    const normalizedToolName = options.toolName
        ? (parseNamespacedToolName(options.toolName)?.toolName ?? options.toolName)
        : undefined;

    return events.filter((event) => {
        if (event.timestamp < options.startedAt) {
            return false;
        }

        if (event.method !== options.operation) {
            return false;
        }

        if (options.targetKind === 'server' && options.serverName && event.server !== options.serverName) {
            return false;
        }

        if (normalizedToolName && event.toolName && event.toolName !== normalizedToolName && event.toolName !== options.toolName) {
            return false;
        }

        return true;
    });
}

function toLatencyMs(startedAt: number): number {
    return Math.max(0, Date.now() - startedAt);
}

function buildIgnoredSearchResultTelemetry<T extends { name: string }>(
    results: T[],
    loadedToolName?: string,
): {
    ignoredResultCount: number;
    ignoredResultNames: string[];
} {
    const ignoredResults = results.filter((result) => result.name !== loadedToolName);

    return {
        ignoredResultCount: ignoredResults.length,
        ignoredResultNames: ignoredResults.slice(0, 3).map((result) => result.name),
    };
}

function buildDefaultScoreBreakdown(score = 0): ToolSearchScoreBreakdown {
    return {
        primaryMatchScore: score,
        tokenMatchScore: 0,
        tokenMatchCount: 0,
        profileBoostScore: 0,
        loadedBoostScore: 0,
        alwaysOnBoostScore: 0,
        hydratedBoostScore: 0,
        noQueryBaseScore: 0,
    };
}

const toolSearchProfileSchema = z.enum(['web-research', 'repo-coding', 'browser-automation', 'local-ops', 'database']);

async function readToolPreferences(): Promise<ToolPreferences> {
    try {
        const config = await loadBorgMcpConfig();
        const settings = config.settings as { toolSelection?: { importantTools?: unknown; alwaysLoadedTools?: unknown; autoLoadMinConfidence?: unknown; maxLoadedTools?: unknown; maxHydratedSchemas?: unknown; idleEvictionThresholdMs?: unknown } } | undefined;
        return readToolPreferencesFromSettings(settings?.toolSelection);
    } catch {
        return { importantTools: [], alwaysLoadedTools: ['search_tools', 'read_file', 'write_file', 'grep_search', 'execute_command', 'browser__open'], autoLoadMinConfidence: 0.85, maxLoadedTools: 16, maxHydratedSchemas: 8, idleEvictionThresholdMs: 5 * 60 * 1000 };
    }
}

async function writeToolPreferences(nextPreferences: ToolPreferences): Promise<ToolPreferences> {
    const config = await loadBorgMcpConfig();
    const existingSettings = config.settings && typeof config.settings === 'object'
        ? config.settings as Record<string, unknown>
        : {};

    const normalized = readToolPreferencesFromSettings(nextPreferences);
    const nextSettings = buildToolPreferenceSettings(existingSettings, normalized);

    await writeBorgMcpConfig({
        ...config,
        settings: nextSettings,
    });

    return normalized;
}

async function ensureAlwaysLoadedTools(server: NonNullable<ReturnType<typeof getMcpServer>>, preferences: ToolPreferences): Promise<void> {
    if (typeof server.setAlwaysLoadedTools === 'function') {
        server.setAlwaysLoadedTools(preferences.alwaysLoadedTools);
    }

    if (preferences.alwaysLoadedTools.length === 0) {
        return;
    }

    const workingSet = parseToolJson<{ tools?: Array<{ name?: string }> }>(await server.executeTool('list_loaded_tools', {}), { tools: [] });
    const loadedTools = new Set((workingSet.tools ?? [])
        .map((tool) => typeof tool?.name === 'string' ? tool.name : '')
        .filter(Boolean));

    for (const toolName of preferences.alwaysLoadedTools) {
        if (loadedTools.has(toolName)) {
            continue;
        }

        try {
            await server.executeTool('load_tool', { name: toolName });
            loadedTools.add(toolName);
        } catch {
            // Ignore load failures here so the dashboard can still render the rest of the state.
        }
    }
}

export const mcpRouter = t.router({
    /** List all registered downstream MCP servers */
    listServers: publicProcedure.query(async () => {
        const aggregator = getMcpAggregator();
        try {
            const { servers, toolCounts } = await getCachedToolInventory();
            const runtimeStates = new Map((await aggregator?.listServers?.() ?? []).map((server) => [server.name, server]));

            return servers.map((server) => {
                const runtime = runtimeStates.get(server.name);
                const cachedToolCount = toolCounts.get(server.uuid) ?? 0;
                return {
                    name: server.name ?? 'unknown',
                    displayName: server.displayName ?? server.name ?? 'unknown',
                    tags: server.tags ?? [],
                    status: runtime?.status ?? (server.error_status === 'NONE' ? 'cached' : server.error_status.toLowerCase()),
                    runtimeState: runtime?.status ?? 'stopped',
                    warmupState: runtime?.warmupStatus ?? (server.alwaysOnAdvertised ? 'scheduled' : 'idle'),
                    runtimeConnected: runtime?.status === 'connected',
                    toolCount: runtime?.toolCount ?? cachedToolCount,
                    advertisedToolCount: runtime?.advertisedToolCount ?? cachedToolCount,
                    advertisedSource: runtime?.advertisedSource ?? 'empty',
                    lastConnectedAt: runtime?.lastConnectedAt ? new Date(runtime.lastConnectedAt).toISOString() : null,
                    lastError: runtime?.lastError ?? null,
                    alwaysOn: Boolean(server.alwaysOnAdvertised),
                    config: {
                        command: runtime?.config?.command ?? server.command ?? '',
                        args: runtime?.config?.args ?? server.args ?? [],
                        env: runtime?.config?.env
                            ? Object.keys(runtime.config.env)
                            : Object.keys(server.env ?? {}),
                    },
                };
            });
        } catch (error) {
            if (isSqliteUnavailableError(error)) {
                rethrowSqliteUnavailableAsTrpc('MCP inventory is unavailable', error);
            }
            const message = error instanceof Error ? error.message : String(error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `MCP inventory is unavailable: ${message}`,
            });
        }
    }),

    /** List all aggregated tools across servers */
    listTools: publicProcedure.query(async () => {
        try {
            const { tools } = await getCachedToolInventory();
            if (tools.length > 0) {
                return tools;
            }

            const aggregator = getMcpAggregator();
            const liveTools = await aggregator?.listAggregatedTools?.() ?? [];
            return liveTools.map((tool) => ({
                name: tool.name,
                description: tool.description ?? '',
                server: tool.server ?? 'unknown',
                serverDisplayName: tool.serverDisplayName ?? tool.server ?? 'unknown',
                serverTags: tool.serverTags ?? [],
                toolTags: tool.toolTags ?? [],
                semanticGroup: tool.semanticGroup ?? 'general-utility',
                semanticGroupLabel: tool.semanticGroupLabel ?? 'general utility',
                advertisedName: tool.advertisedName ?? tool.name,
                keywords: tool.keywords ?? [],
                alwaysOn: Boolean(tool.alwaysOn),
                inputSchema: tool.inputSchema ?? null,
            }));
        } catch (error) {
            if (isSqliteUnavailableError(error)) {
                rethrowSqliteUnavailableAsTrpc('MCP inventory is unavailable', error);
            }
            const message = error instanceof Error ? error.message : String(error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `MCP inventory is unavailable: ${message}`,
            });
        }
    }),

    traffic: publicProcedure.query(async () => {
        const aggregator = getMcpAggregator();
        try {
            return await aggregator?.getTrafficEvents?.() ?? [];
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `MCP traffic is unavailable: ${message}`,
            });
        }
    }),

    searchTools: publicProcedure.input(z.object({
        query: z.string().default(''),
        profile: toolSearchProfileSchema.optional(),
    })).query(async ({ input }) => {
        const searchStartedAt = Date.now();
        try {
            const { tools } = await getCachedToolInventory();
            const preferences = await readToolPreferences();
            const normalizedQuery = input.query.trim().toLowerCase();
            const selectedProfile = input.profile as ToolSearchProfile | undefined;
            const server = getMcpServer();

            if (server) {
                await ensureAlwaysLoadedTools(server, preferences);
                try {
                    const result = await server.executeTool('search_tools', { query: input.query });
                    const rankedResults = parseToolJson<Array<{
                        name: string;
                        description: string;
                        serverName?: string;
                        serverDisplayName?: string;
                        originalName?: string;
                        advertisedName?: string;
                        serverTags?: string[];
                        toolTags?: string[];
                        semanticGroup?: string;
                        semanticGroupLabel?: string;
                        keywords?: string[];
                        alwaysOn?: boolean;
                        loaded?: boolean;
                        hydrated?: boolean;
                        deferred?: boolean;
                        requiresSchemaHydration?: boolean;
                        matchReason?: string;
                        score?: number;
                        scoreBreakdown?: ToolSearchScoreBreakdown;
                        rank?: number;
                        autoLoaded?: boolean;
                        mcpServerUuid?: string;
                    }>>(result, []);

                    if (rankedResults.length > 0) {
                        const runtimeMappedResults = rankedResults.map((tool, index) => ({
                            name: tool.name,
                            description: tool.description ?? '',
                            server: tool.serverName ?? 'unknown',
                            serverDisplayName: tool.serverDisplayName ?? tool.serverName ?? 'unknown',
                            serverTags: tool.serverTags ?? [],
                            toolTags: tool.toolTags ?? [],
                            semanticGroup: tool.semanticGroup ?? 'general-utility',
                            semanticGroupLabel: tool.semanticGroupLabel ?? 'general utility',
                            advertisedName: tool.advertisedName ?? tool.name,
                            keywords: tool.keywords ?? [],
                            alwaysOn: Boolean(tool.alwaysOn),
                            originalName: tool.originalName ?? null,
                            loaded: Boolean(tool.loaded),
                            hydrated: Boolean(tool.hydrated),
                            deferred: Boolean(tool.deferred),
                            requiresSchemaHydration: Boolean(tool.requiresSchemaHydration),
                            matchReason: tool.matchReason ?? 'matched available metadata',
                            score: tool.score ?? 0,
                            scoreBreakdown: tool.scoreBreakdown ?? buildDefaultScoreBreakdown(tool.score ?? 0),
                            rank: tool.rank ?? (index + 1),
                            autoLoaded: Boolean(tool.autoLoaded),
                            inputSchema: null,
                        }));

                        const runtimeAutoLoadedToolName = runtimeMappedResults.find((tool) => tool.autoLoaded)?.name;

                        const mappedResults = selectedProfile
                            ? rankToolSearchCandidates(
                                runtimeMappedResults.map((tool) => ({
                                    name: tool.name,
                                    description: tool.description,
                                    serverName: tool.server,
                                    serverDisplayName: tool.serverDisplayName,
                                    advertisedName: tool.advertisedName,
                                    originalName: tool.originalName ?? undefined,
                                    serverTags: tool.serverTags,
                                    toolTags: tool.toolTags,
                                    semanticGroup: tool.semanticGroup,
                                    semanticGroupLabel: tool.semanticGroupLabel,
                                    keywords: tool.keywords,
                                    alwaysOn: tool.alwaysOn,
                                    loaded: tool.loaded,
                                    hydrated: tool.hydrated,
                                    deferred: tool.deferred,
                                })),
                                normalizedQuery,
                                runtimeMappedResults.length,
                                selectedProfile,
                            ).map((tool, index) => ({
                                name: tool.name,
                                description: tool.description ?? '',
                                server: tool.serverName ?? 'unknown',
                                serverDisplayName: tool.serverDisplayName ?? tool.serverName ?? 'unknown',
                                serverTags: tool.serverTags ?? [],
                                toolTags: tool.toolTags ?? [],
                                semanticGroup: tool.semanticGroup ?? 'general-utility',
                                semanticGroupLabel: tool.semanticGroupLabel ?? 'general utility',
                                advertisedName: tool.advertisedName ?? tool.name,
                                keywords: tool.keywords ?? [],
                                alwaysOn: Boolean(tool.alwaysOn),
                                originalName: tool.originalName ?? null,
                                // Merge loaded state: either already loaded or auto-loaded this request.
                                loaded: Boolean(tool.loaded) || tool.name === runtimeAutoLoadedToolName,
                                hydrated: Boolean(tool.hydrated),
                                deferred: Boolean(tool.deferred),
                                requiresSchemaHydration: Boolean(tool.requiresSchemaHydration),
                                matchReason: tool.matchReason ?? 'matched available metadata',
                                score: tool.score ?? 0,
                                scoreBreakdown: tool.scoreBreakdown,
                                rank: index + 1,
                                autoLoaded: tool.name === runtimeAutoLoadedToolName,
                                inputSchema: null,
                            }))
                            : runtimeMappedResults;

                        const autoLoadEvaluation = evaluateAutoLoadCandidate(
                            mappedResults.map((tool) => ({
                                name: tool.name,
                                description: tool.description,
                                serverName: tool.server,
                                serverDisplayName: tool.serverDisplayName,
                                advertisedName: tool.advertisedName,
                                originalName: tool.originalName ?? undefined,
                                serverTags: tool.serverTags,
                                toolTags: tool.toolTags,
                                semanticGroup: tool.semanticGroup,
                                semanticGroupLabel: tool.semanticGroupLabel,
                                keywords: tool.keywords,
                                alwaysOn: tool.alwaysOn,
                                loaded: tool.loaded,
                                hydrated: tool.hydrated,
                                deferred: tool.deferred,
                                autoLoaded: tool.autoLoaded,
                                // Required by RankedToolSearchResult — pass through mapped values.
                                requiresSchemaHydration: tool.requiresSchemaHydration,
                                matchReason: tool.matchReason,
                                score: tool.score,
                                scoreBreakdown: tool.scoreBreakdown,
                            })),
                            normalizedQuery,
                            {
                                minConfidence: preferences.autoLoadMinConfidence,
                            },
                        );

                        const runtimeAutoLoadedResult = mappedResults.find((tool) => tool.autoLoaded);
                        const autoLoadDecision = autoLoadEvaluation.decision;
                        let autoLoadExecutionStatus: 'success' | 'error' | 'not-attempted' = runtimeAutoLoadedResult
                            ? 'success'
                            : 'not-attempted';
                        let autoLoadExecutionError: string | undefined;

                        if (runtimeAutoLoadedResult && server) {
                            let pressure: Awaited<ReturnType<typeof readWorkingSetSnapshot>> | undefined;
                            try {
                                pressure = await readWorkingSetSnapshot(server);
                            } catch {
                                pressure = undefined;
                            }

                            toolSelectionTelemetry.record({
                                type: 'load',
                                toolName: runtimeAutoLoadedResult.name,
                                source: 'runtime-search',
                                status: 'success',
                                message: `Tool '${runtimeAutoLoadedResult.name}' auto-loaded by runtime search.`,
                                autoLoadReason: autoLoadDecision?.reason,
                                autoLoadConfidence: autoLoadDecision?.confidence,
                                scoreGap: autoLoadDecision?.scoreGap,
                                topScore: autoLoadDecision?.topScore,
                                ...pressure,
                            });
                        } else if (!runtimeAutoLoadedResult && autoLoadDecision && server) {
                            const autoLoadStartedAt = Date.now();
                            try {
                                const loadResult = await server.executeTool('load_tool', { name: autoLoadDecision.toolName });
                                autoLoadExecutionStatus = 'success';
                                const loadMessage = getToolTextContent(loadResult);
                                const pressure = await readWorkingSetSnapshot(server);
                                toolSelectionTelemetry.record({
                                    type: 'load',
                                    toolName: autoLoadDecision.toolName,
                                    source: 'runtime-search',
                                    status: 'success',
                                    message: loadMessage,
                                    evictedTools: parseEvictedToolsFromMessage(loadMessage),
                                    latencyMs: toLatencyMs(autoLoadStartedAt),
                                    autoLoadReason: autoLoadDecision.reason,
                                    autoLoadConfidence: autoLoadDecision.confidence,
                                    scoreGap: autoLoadDecision.scoreGap,
                                    topScore: autoLoadDecision.topScore,
                                    ...pressure,
                                });
                            } catch (error) {
                                autoLoadExecutionStatus = 'error';
                                autoLoadExecutionError = error instanceof Error ? error.message : String(error);
                                toolSelectionTelemetry.record({
                                    type: 'load',
                                    toolName: autoLoadDecision.toolName,
                                    source: 'runtime-search',
                                    status: 'error',
                                    message: autoLoadExecutionError,
                                    latencyMs: toLatencyMs(autoLoadStartedAt),
                                    autoLoadReason: autoLoadDecision.reason,
                                    autoLoadConfidence: autoLoadDecision.confidence,
                                    scoreGap: autoLoadDecision.scoreGap,
                                    topScore: autoLoadDecision.topScore,
                                });
                            }
                        }

                        if (!runtimeAutoLoadedResult && autoLoadExecutionStatus === 'success' && autoLoadDecision) {
                            mappedResults.forEach((tool) => {
                                if (tool.name === autoLoadDecision?.toolName) {
                                    tool.autoLoaded = true;
                                    tool.loaded = true;
                                    tool.matchReason = `${tool.matchReason}; ${autoLoadDecision.reason}`;
                                }
                            });
                        }

                        const topScore = typeof mappedResults[0]?.score === 'number' ? mappedResults[0].score : undefined;
                        const secondScore = typeof mappedResults[1]?.score === 'number' ? mappedResults[1].score : 0;
                        const scoreGap = typeof topScore === 'number' ? topScore - secondScore : undefined;
                        const ignoredSearchTelemetry = buildIgnoredSearchResultTelemetry(mappedResults, autoLoadDecision?.toolName);

                        toolSelectionTelemetry.record({
                            type: 'search',
                            query: input.query,
                            profile: selectedProfile,
                            source: 'runtime-search',
                            resultCount: mappedResults.length,
                            topResultName: mappedResults[0]?.name,
                            topMatchReason: mappedResults[0]?.matchReason,
                            topScore,
                            secondResultName: mappedResults[1]?.name,
                            secondMatchReason: mappedResults[1]?.matchReason,
                            secondScore,
                            scoreGap,
                            ignoredResultCount: ignoredSearchTelemetry.ignoredResultCount,
                            ignoredResultNames: ignoredSearchTelemetry.ignoredResultNames,
                            latencyMs: toLatencyMs(searchStartedAt),
                            autoLoadReason: autoLoadDecision?.reason,
                            autoLoadConfidence: autoLoadDecision?.confidence || undefined,
                            autoLoadEvaluated: runtimeAutoLoadedResult ? true : autoLoadEvaluation.evaluated,
                            autoLoadOutcome: runtimeAutoLoadedResult ? 'loaded' : autoLoadEvaluation.outcome,
                            autoLoadSkipReason: runtimeAutoLoadedResult ? undefined : autoLoadEvaluation.skipReason,
                            autoLoadMinConfidence: runtimeAutoLoadedResult ? preferences.autoLoadMinConfidence : autoLoadEvaluation.minConfidence,
                            autoLoadExecutionStatus,
                            autoLoadExecutionError,
                            status: 'success',
                        });

                        return mergeToolPreferences(mappedResults, preferences, tools);
                    }
                } catch {
                    // Fall back to cached ranking when the runtime search tool is unavailable.
                }
            }

            if (tools.length > 0) {
                const rankedCandidateResults = rankToolSearchCandidates(
                    tools.map((tool) => ({
                        name: tool.name,
                        description: tool.description ?? '',
                        serverName: tool.server,
                        serverDisplayName: tool.serverDisplayName,
                        advertisedName: tool.advertisedName,
                        originalName: tool.originalName ?? (tool.name.includes('__') ? tool.name.split('__').slice(1).join('__') : undefined),
                        serverTags: tool.serverTags,
                        toolTags: tool.toolTags,
                        semanticGroup: tool.semanticGroup,
                        semanticGroupLabel: tool.semanticGroupLabel,
                        keywords: tool.keywords,
                        alwaysOn: tool.alwaysOn,
                        deferred: tool.inputSchema == null,
                        hydrated: tool.inputSchema != null,
                    })),
                    normalizedQuery,
                    normalizedQuery ? 10 : tools.length,
                    selectedProfile,
                );

                const autoLoadEvaluation = server
                    ? evaluateAutoLoadCandidate(rankedCandidateResults, normalizedQuery, {
                        minConfidence: preferences.autoLoadMinConfidence,
                    })
                    : {
                        evaluated: false,
                        outcome: 'not-applicable' as const,
                        decision: null,
                        skipReason: 'runtime MCP server unavailable',
                        minConfidence: preferences.autoLoadMinConfidence,
                    };
                const autoLoadDecision = autoLoadEvaluation.decision;
                let autoLoadExecutionStatus: 'success' | 'error' | 'not-attempted' = 'not-attempted';
                let autoLoadExecutionError: string | undefined;

                if (server && autoLoadDecision) {
                    const autoLoadStartedAt = Date.now();
                    try {
                        const loadResult = await server.executeTool('load_tool', { name: autoLoadDecision.toolName });
                        autoLoadExecutionStatus = 'success';
                        const pressure = await readWorkingSetSnapshot(server);
                        toolSelectionTelemetry.record({
                            type: 'load',
                            toolName: autoLoadDecision.toolName,
                            source: 'cached-ranking',
                            status: 'success',
                            message: getToolTextContent(loadResult),
                            evictedTools: parseEvictedToolsFromMessage(getToolTextContent(loadResult)),
                            latencyMs: toLatencyMs(autoLoadStartedAt),
                            autoLoadReason: autoLoadDecision.reason,
                            autoLoadConfidence: autoLoadDecision.confidence,
                            scoreGap: autoLoadDecision.scoreGap,
                            topScore: autoLoadDecision.topScore,
                            ...pressure,
                        });
                    } catch (error) {
                        autoLoadExecutionStatus = 'error';
                        autoLoadExecutionError = error instanceof Error ? error.message : String(error);
                        toolSelectionTelemetry.record({
                            type: 'load',
                            toolName: autoLoadDecision.toolName,
                            source: 'cached-ranking',
                            status: 'error',
                            message: autoLoadExecutionError,
                            latencyMs: toLatencyMs(autoLoadStartedAt),
                            autoLoadReason: autoLoadDecision.reason,
                            autoLoadConfidence: autoLoadDecision.confidence,
                            scoreGap: autoLoadDecision.scoreGap,
                            topScore: autoLoadDecision.topScore,
                        });
                    }
                }

                const rankedResults = rankedCandidateResults.map((tool, index) => ({
                    name: tool.name,
                    description: tool.description ?? '',
                    server: tool.serverName ?? 'unknown',
                    serverDisplayName: tool.serverDisplayName ?? tool.serverName ?? 'unknown',
                    serverTags: tool.serverTags ?? [],
                    toolTags: tool.toolTags ?? [],
                    semanticGroup: tool.semanticGroup ?? 'general-utility',
                    semanticGroupLabel: tool.semanticGroupLabel ?? 'general utility',
                    advertisedName: tool.advertisedName ?? tool.name,
                    keywords: tool.keywords ?? [],
                    alwaysOn: Boolean(tool.alwaysOn),
                    originalName: tool.originalName ?? null,
                    loaded: tool.loaded || tool.name === autoLoadDecision?.toolName,
                    hydrated: tool.hydrated,
                    deferred: tool.deferred,
                    requiresSchemaHydration: tool.requiresSchemaHydration,
                    matchReason: tool.name === autoLoadDecision?.toolName
                        ? `${tool.matchReason}; ${autoLoadDecision.reason}`
                        : tool.matchReason,
                    score: tool.score,
                    scoreBreakdown: tool.scoreBreakdown,
                    rank: index + 1,
                    autoLoaded: tool.name === autoLoadDecision?.toolName,
                    inputSchema: null,
                }));
                const ignoredSearchTelemetry = buildIgnoredSearchResultTelemetry(rankedResults, autoLoadDecision?.toolName);

                toolSelectionTelemetry.record({
                    type: 'search',
                    query: input.query,
                    profile: selectedProfile,
                    source: 'cached-ranking',
                    resultCount: rankedResults.length,
                    topResultName: rankedResults[0]?.name,
                    topMatchReason: rankedResults[0]?.matchReason,
                    topScore: rankedResults[0]?.score,
                    secondResultName: rankedResults[1]?.name,
                    secondMatchReason: rankedResults[1]?.matchReason,
                    secondScore: rankedResults[1]?.score,
                    scoreGap: rankedResults.length > 1 ? (rankedResults[0]?.score ?? 0) - (rankedResults[1]?.score ?? 0) : undefined,
                    ignoredResultCount: ignoredSearchTelemetry.ignoredResultCount,
                    ignoredResultNames: ignoredSearchTelemetry.ignoredResultNames,
                    latencyMs: toLatencyMs(searchStartedAt),
                    autoLoadReason: autoLoadDecision?.reason,
                    autoLoadConfidence: autoLoadDecision?.confidence,
                    autoLoadEvaluated: autoLoadEvaluation.evaluated,
                    autoLoadOutcome: autoLoadEvaluation.outcome,
                    autoLoadSkipReason: autoLoadEvaluation.skipReason,
                    autoLoadMinConfidence: autoLoadEvaluation.minConfidence,
                    autoLoadExecutionStatus,
                    autoLoadExecutionError,
                    status: 'success',
                });

                return mergeToolPreferences(rankedResults, preferences, tools);
            }

            const aggregator = getMcpAggregator();
            const liveTools = await aggregator?.searchTools?.(input.query) ?? [];
            const rankedLiveTools = rankToolSearchCandidates(
                liveTools.map((tool) => ({
                    name: tool.name,
                    description: tool.description ?? '',
                    serverName: tool.server ?? 'unknown',
                    serverDisplayName: tool.serverDisplayName ?? tool.server ?? 'unknown',
                    serverTags: tool.serverTags ?? [],
                    toolTags: tool.toolTags ?? [],
                    semanticGroup: tool.semanticGroup ?? 'general-utility',
                    semanticGroupLabel: tool.semanticGroupLabel ?? 'general utility',
                    advertisedName: tool.advertisedName ?? tool.name,
                    keywords: tool.keywords ?? [],
                    alwaysOn: Boolean(tool.alwaysOn),
                    originalName: null,
                    loaded: false,
                    hydrated: tool.inputSchema != null,
                    deferred: tool.inputSchema == null,
                })),
                normalizedQuery,
                normalizedQuery ? 10 : liveTools.length,
                selectedProfile,
            );
            const mappedLiveTools = rankedLiveTools.map((tool, index) => ({
                name: tool.name,
                description: tool.description ?? '',
                server: tool.serverName ?? 'unknown',
                serverDisplayName: tool.serverDisplayName ?? tool.serverName ?? 'unknown',
                serverTags: tool.serverTags ?? [],
                toolTags: tool.toolTags ?? [],
                semanticGroup: tool.semanticGroup ?? 'general-utility',
                semanticGroupLabel: tool.semanticGroupLabel ?? 'general utility',
                advertisedName: tool.advertisedName ?? tool.name,
                keywords: tool.keywords ?? [],
                alwaysOn: Boolean(tool.alwaysOn),
                originalName: null,
                loaded: false,
                hydrated: tool.hydrated,
                deferred: tool.deferred,
                requiresSchemaHydration: tool.requiresSchemaHydration,
                matchReason: tool.matchReason,
                score: tool.score,
                scoreBreakdown: tool.scoreBreakdown,
                rank: index + 1,
                inputSchema: null,
            }));
            const ignoredSearchTelemetry = buildIgnoredSearchResultTelemetry(mappedLiveTools);

            toolSelectionTelemetry.record({
                type: 'search',
                query: input.query,
                profile: selectedProfile,
                source: 'live-aggregator',
                resultCount: mappedLiveTools.length,
                topResultName: mappedLiveTools[0]?.name,
                topMatchReason: mappedLiveTools[0]?.matchReason,
                topScore: mappedLiveTools[0]?.score,
                secondResultName: mappedLiveTools[1]?.name,
                secondMatchReason: mappedLiveTools[1]?.matchReason,
                secondScore: mappedLiveTools[1]?.score,
                scoreGap: mappedLiveTools.length > 1 ? (mappedLiveTools[0]?.score ?? 0) - (mappedLiveTools[1]?.score ?? 0) : undefined,
                ignoredResultCount: ignoredSearchTelemetry.ignoredResultCount,
                ignoredResultNames: ignoredSearchTelemetry.ignoredResultNames,
                latencyMs: toLatencyMs(searchStartedAt),
                status: 'success',
            });

            return mergeToolPreferences(mappedLiveTools, preferences, tools);
        } catch (error) {
            toolSelectionTelemetry.record({
                type: 'search',
                query: input.query,
                profile: input.profile,
                latencyMs: toLatencyMs(searchStartedAt),
                status: 'error',
                message: error instanceof Error ? error.message : 'search failed',
            });
            const message = error instanceof Error ? error.message : String(error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `MCP tool search is unavailable: ${message}`,
            });
        }
    }),

    getToolSelectionTelemetry: publicProcedure.query(() => toolSelectionTelemetry.list()),

    getToolPreferences: publicProcedure.query(async () => readToolPreferences()),

    setToolPreferences: adminProcedure.input(z.object({
        importantTools: z.array(z.string().min(1)).optional(),
        alwaysLoadedTools: z.array(z.string().min(1)).optional(),
        autoLoadMinConfidence: z.number().min(0.5).max(0.99).optional(),
        maxLoadedTools: z.number().int().min(4).max(64).optional(),
        maxHydratedSchemas: z.number().int().min(2).max(32).optional(),
        idleEvictionThresholdMs: z.number().int().min(10_000).max(24 * 60 * 60 * 1000).optional(),
    }).default({})).mutation(async ({ input }) => {
        const current = await readToolPreferences();
        const next = await writeToolPreferences(applyToolPreferencePatch(current, input));
        const server = getMcpServer();
        if (server) {
            await ensureAlwaysLoadedTools(server, next);
            // Apply the new capacity limits to the live working set immediately.
            try {
                await server.executeTool('set_capacity', {
                    maxLoadedTools: next.maxLoadedTools,
                    maxHydratedSchemas: next.maxHydratedSchemas,
                    idleEvictionThresholdMs: next.idleEvictionThresholdMs,
                });
            } catch {
                // Non-fatal: the working set will apply limits on the next load/hydrate call.
            }
        }
        return { ok: true, ...next };
    }),

    /** Return the bounded recent eviction history for the session working set. */
    getWorkingSetEvictionHistory: publicProcedure.query(async () => {
        const server = getMcpServer();
        if (!server) {
            return [];
        }

        try {
            const result = await server.executeTool('get_eviction_history', {});
            return parseToolJson<Array<{
                toolName: string;
                timestamp: number;
                tier: 'loaded' | 'hydrated';
                idleEvicted: boolean;
                idleDurationMs: number;
            }>>(result, []);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `MCP eviction history is unavailable: ${message}`,
            });
        }
    }),

    /** Clear the bounded recent eviction history for the current session working set. */
    clearWorkingSetEvictionHistory: adminProcedure.mutation(async () => {
        const server = getMcpServer();
        if (!server) {
            return { ok: true, message: 'MCP server unavailable; eviction history already empty.' };
        }

        try {
            const result = await server.executeTool('clear_eviction_history', {});
            return {
                ok: true,
                message: getToolTextContent(result) || 'Eviction history cleared.',
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to clear eviction history: ${message}`,
            });
        }
    }),

    getJsoncEditor: publicProcedure.query(async () => {
        const jsoncPath = getBorgMcpJsoncPath();
        try {
            const content = await fs.readFile(jsoncPath, 'utf-8');
            return { path: jsoncPath, content };
        } catch (error) {
            const errorCode = (error as NodeJS.ErrnoException).code;
            if (errorCode === 'ENOENT') {
                const fallbackConfig = await loadBorgMcpConfig();
                return {
                    path: jsoncPath,
                    content: `// HyperCode MCP configuration\n${JSON.stringify(fallbackConfig, null, 2)}\n`,
                };
            }
            throw error;
        }
    }),

    saveJsoncEditor: adminProcedure.input(z.object({
        content: z.string().min(2),
    })).mutation(async ({ input }) => {
        const parsed = JSON.parse(stripJsonComments(input.content)) as Record<string, unknown>;
        await writeBorgMcpConfig(parsed as never);
        return { ok: true };
    }),

    callTool: publicProcedure.input(z.object({
        name: z.string().min(1),
        args: z.record(z.unknown()).optional().default({}),
    })).mutation(async ({ input }) => {
        const server = getMcpServer();
        if (!server) {
            throw new Error('MCP Server not initialized');
        }

        const result = await server.executeTool(input.name, input.args);
        return {
            ok: true,
            result,
        };
    }),

    runServerTest: publicProcedure.input(z.object({
        targetKind: z.enum(['router', 'server']),
        serverName: z.string().optional(),
        operation: z.enum(['tools/list', 'tools/call']),
        toolName: z.string().optional(),
        args: z.record(z.unknown()).optional().default({}),
    })).mutation(async ({ input }) => {
        const startedAt = Date.now();
        const requestId = `probe-${startedAt}`;
        const normalizedToolName = input.toolName
            ? (parseNamespacedToolName(input.toolName)?.toolName ?? input.toolName)
            : undefined;

        const requestPayload = {
            jsonrpc: '2.0',
            id: requestId,
            method: input.operation,
            params: input.operation === 'tools/call'
                ? {
                    name: input.targetKind === 'server' ? normalizedToolName : input.toolName,
                    arguments: input.args,
                }
                : {},
            target: input.targetKind === 'router'
                ? 'hypercode-router'
                : input.serverName ?? 'unknown-server',
            via: input.targetKind === 'router' ? 'hypercode-router' : 'direct-downstream',
        };

        if (input.targetKind === 'server' && !input.serverName) {
            return {
                success: false,
                target: {
                    kind: 'server' as const,
                    displayName: 'Unknown downstream server',
                    serverName: null,
                    via: 'direct-downstream',
                },
                operation: input.operation,
                startedAt,
                endedAt: Date.now(),
                latencyMs: Date.now() - startedAt,
                request: requestPayload,
                response: {
                    summary: 'Downstream probe requires a server name.',
                    payload: { error: 'Downstream probe requires a server name.' },
                },
                trafficEvents: [],
            };
        }

        if (input.operation === 'tools/call' && !input.toolName) {
            return {
                success: false,
                target: {
                    kind: input.targetKind,
                    displayName: input.targetKind === 'router' ? 'HyperCode router' : input.serverName ?? 'Unknown downstream server',
                    serverName: input.serverName ?? null,
                    via: input.targetKind === 'router' ? 'hypercode-router' : 'direct-downstream',
                },
                operation: input.operation,
                startedAt,
                endedAt: Date.now(),
                latencyMs: Date.now() - startedAt,
                request: requestPayload,
                response: {
                    summary: 'Tool call probe requires a tool name.',
                    payload: { error: 'Tool call probe requires a tool name.' },
                },
                trafficEvents: [],
            };
        }

        try {
            let responsePayload: unknown;

            if (input.targetKind === 'router') {
                const aggregator = getMcpAggregator() as {
                    listAggregatedTools?: () => Promise<unknown[]>;
                    executeTool?: (name: string, args: unknown) => Promise<unknown>;
                } | null;

                if (!aggregator) {
                    throw new Error('HyperCode MCP router is not initialized.');
                }

                if (input.operation === 'tools/list') {
                    const tools = await aggregator.listAggregatedTools?.() ?? [];
                    responsePayload = {
                        toolCount: tools.length,
                        tools: toSerializablePayload(tools),
                    };
                } else {
                    responsePayload = await aggregator.executeTool?.(input.toolName!, input.args);
                }
            } else {
                const aggregator = getMcpAggregator() as {
                    clients?: Map<string, {
                        listTools: () => Promise<unknown[]>;
                        callTool: (toolName: string, args: unknown) => Promise<unknown>;
                    }>;
                } | null;

                const directClient = aggregator?.clients?.get(input.serverName!);
                if (!directClient) {
                    throw new Error(`Downstream server '${input.serverName}' is not currently connected.`);
                }

                if (input.operation === 'tools/list') {
                    const tools = await directClient.listTools();
                    responsePayload = {
                        toolCount: tools.length,
                        tools: toSerializablePayload(tools),
                    };
                } else {
                    responsePayload = await directClient.callTool(normalizedToolName!, input.args);
                }
            }

            const endedAt = Date.now();
            return {
                success: true,
                target: {
                    kind: input.targetKind,
                    displayName: input.targetKind === 'router' ? 'HyperCode router' : input.serverName!,
                    serverName: input.serverName ?? null,
                    via: input.targetKind === 'router' ? 'hypercode-router' : 'direct-downstream',
                },
                operation: input.operation,
                startedAt,
                endedAt,
                latencyMs: endedAt - startedAt,
                request: requestPayload,
                response: {
                    summary: summarizeProbePayload(responsePayload),
                    payload: toSerializablePayload(responsePayload),
                },
                trafficEvents: collectServerProbeTrafficEvents({
                    startedAt,
                    targetKind: input.targetKind,
                    operation: input.operation,
                    serverName: input.serverName,
                    toolName: input.toolName,
                }),
            };
        } catch (error) {
            const endedAt = Date.now();
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                target: {
                    kind: input.targetKind,
                    displayName: input.targetKind === 'router' ? 'HyperCode router' : input.serverName ?? 'Unknown downstream server',
                    serverName: input.serverName ?? null,
                    via: input.targetKind === 'router' ? 'hypercode-router' : 'direct-downstream',
                },
                operation: input.operation,
                startedAt,
                endedAt,
                latencyMs: endedAt - startedAt,
                request: requestPayload,
                response: {
                    summary: message,
                    payload: { error: message },
                },
                trafficEvents: collectServerProbeTrafficEvents({
                    startedAt,
                    targetKind: input.targetKind,
                    operation: input.operation,
                    serverName: input.serverName,
                    toolName: input.toolName,
                }),
            };
        }
    }),

    clearToolSelectionTelemetry: adminProcedure.mutation(() => {
        toolSelectionTelemetry.clear();
        return { ok: true };
    }),

    getWorkingSet: publicProcedure.query(async () => {
        const server = getMcpServer();
        if (!server) {
            return {
                limits: { maxLoadedTools: 0, maxHydratedSchemas: 0, idleEvictionThresholdMs: 0 },
                tools: [],
            };
        }

        try {
            await ensureAlwaysLoadedTools(server, await readToolPreferences());
            const result = await server.executeTool('list_loaded_tools', {});
            return parseToolJson(result, {
                limits: { maxLoadedTools: 0, maxHydratedSchemas: 0, idleEvictionThresholdMs: 0 },
                tools: [],
            });
        } catch {
            return {
                limits: { maxLoadedTools: 0, maxHydratedSchemas: 0, idleEvictionThresholdMs: 0 },
                tools: [],
            };
        }
    }),

    loadTool: publicProcedure.input(z.object({
        name: z.string().min(1),
    })).mutation(async ({ input }) => {
        const server = getMcpServer();
        if (!server) {
            throw new Error('MCP Server not initialized');
        }

        const startedAt = Date.now();
        try {
            const result = await server.executeTool('load_tool', { name: input.name });
            const message = getToolTextContent(result);
            const evictedTools = parseEvictedToolsFromMessage(message);
            const pressure = await readWorkingSetSnapshot(server);
            toolSelectionTelemetry.record({
                type: 'load',
                toolName: input.name,
                source: 'manual-action',
                status: 'success',
                message,
                evictedTools,
                latencyMs: toLatencyMs(startedAt),
                ...pressure,
            });
            return {
                ok: true,
                message,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            toolSelectionTelemetry.record({
                type: 'load',
                toolName: input.name,
                source: 'manual-action',
                status: 'error',
                message,
                latencyMs: toLatencyMs(startedAt),
            });
            throw error;
        }
    }),

    unloadTool: publicProcedure.input(z.object({
        name: z.string().min(1),
    })).mutation(async ({ input }) => {
        const server = getMcpServer();
        if (!server) {
            throw new Error('MCP Server not initialized');
        }

        const startedAt = Date.now();
        try {
            const result = await server.executeTool('unload_tool', { name: input.name });
            const message = getToolTextContent(result);
            const pressure = await readWorkingSetSnapshot(server);
            toolSelectionTelemetry.record({
                type: 'unload',
                toolName: input.name,
                source: 'manual-action',
                status: 'success',
                message,
                latencyMs: toLatencyMs(startedAt),
                ...pressure,
            });
            return {
                ok: true,
                message,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            toolSelectionTelemetry.record({
                type: 'unload',
                toolName: input.name,
                source: 'manual-action',
                status: 'error',
                message,
                latencyMs: toLatencyMs(startedAt),
            });
            throw error;
        }
    }),

    getToolSchema: publicProcedure.input(z.object({
        name: z.string().min(1),
    })).mutation(async ({ input }) => {
        const server = getMcpServer();
        if (!server) {
            throw new Error('MCP Server not initialized');
        }

        const startedAt = Date.now();
        try {
            const result = await server.executeTool('get_tool_schema', { name: input.name });
            const parsed = parseToolJson(result, {
                inputSchema: null,
                evictedHydratedTools: [],
            });
            const pressure = await readWorkingSetSnapshot(server);
            toolSelectionTelemetry.record({
                type: 'hydrate',
                toolName: input.name,
                source: 'manual-action',
                status: 'success',
                message: 'schema hydrated',
                evictedTools: Array.isArray(parsed.evictedHydratedTools) ? parsed.evictedHydratedTools : [],
                latencyMs: toLatencyMs(startedAt),
                ...pressure,
            });
            return parsed;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            toolSelectionTelemetry.record({
                type: 'hydrate',
                toolName: input.name,
                source: 'manual-action',
                status: 'error',
                message,
                latencyMs: toLatencyMs(startedAt),
            });
            throw error;
        }
    }),

    /** Get aggregator status and stats */
    getStatus: publicProcedure.query(async () => {
        const aggregator = getMcpAggregator();
        const poolStatus = mcpServerPool.getPoolStatus();
        const lifecycleModes = mcpServerPool.getLifecycleModes();
        const lifecycleEvents = mcpServerPool.getLifecycleEvents(20);

        try {
            const [{ servers, tools }, liveServers, liveTools] = await Promise.all([
                getCachedToolInventory(),
                aggregator?.listServers?.() ?? Promise.resolve([]),
                aggregator?.listAggregatedTools?.() ?? Promise.resolve([]),
            ]);

            const effectiveServerCount = liveServers.length > 0
                ? liveServers.length
                : servers.length;
            const effectiveToolCount = liveTools.length > 0
                ? liveTools.length
                : tools.length;
            const activeServerRecord = poolStatus.currentActiveServerUuid
                ? servers.find((server) => server.uuid === poolStatus.currentActiveServerUuid)
                : undefined;
            const currentActiveServerName = activeServerRecord?.displayName ?? activeServerRecord?.name ?? null;

            return {
                initialized: Boolean(aggregator),
                aggregatorStatus: aggregator?.getInitializationStatus?.() ?? null,
                serverCount: effectiveServerCount,
                toolCount: effectiveToolCount,
                connectedCount: liveServers.filter((s) => s.status === 'connected').length,
                pool: {
                    idle: poolStatus.idle,
                    active: poolStatus.active,
                    activeSessionCount: poolStatus.activeSessionIds.length,
                    currentActiveServerUuid: poolStatus.currentActiveServerUuid,
                    currentActiveServerName,
                    lastActiveServerSwitchAt: poolStatus.lastActiveServerSwitchAt,
                },
                lifecycle: {
                    lazySessionMode: lifecycleModes.lazySessionMode,
                    singleActiveServerMode: lifecycleModes.singleActiveServerMode,
                    events: lifecycleEvents,
                },
            };
        } catch (error) {
            if (isSqliteUnavailableError(error)) {
                rethrowSqliteUnavailableAsTrpc('MCP inventory is unavailable', error);
            }
            const message = error instanceof Error ? error.message : String(error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `MCP status is unavailable: ${message}`,
            });
        }
    }),

    setLifecycleModes: adminProcedure.input(z.object({
        lazySessionMode: z.boolean().optional(),
        singleActiveServerMode: z.boolean().optional(),
    })).mutation(async ({ input }) => {
        const next = await mcpServerPool.setLifecycleModes({
            lazySessionMode: input.lazySessionMode,
            singleActiveServerMode: input.singleActiveServerMode,
        });

        return {
            ok: true,
            lifecycle: next,
        };
    }),

    /** Add a new downstream MCP server */
    addServer: adminProcedure.input(z.object({
        name: z.string().min(1),
        command: z.string().min(1),
        args: z.array(z.string()).optional().default([]),
        env: z.record(z.string()).optional().default({}),
    })).mutation(async ({ input }) => {
        const aggregator = getMcpAggregator();
        if (!aggregator) throw new Error('MCP Aggregator not initialized');
        if (!aggregator.addServerConfig) {
            throw new Error('MCP Aggregator addServerConfig unavailable');
        }

        await aggregator.addServerConfig(input.name, {
            command: input.command,
            args: input.args,
            env: input.env,
            enabled: true,
        });
        return { success: true, name: input.name };
    }),

    /** Remove a downstream MCP server */
    removeServer: adminProcedure.input(z.object({
        name: z.string(),
    })).mutation(async ({ input }) => {
        const aggregator = getMcpAggregator();
        if (!aggregator) throw new Error('MCP Aggregator not initialized');

        if (!aggregator.removeServerConfig) {
            throw new Error('MCP Aggregator removeServerConfig unavailable');
        }

        await aggregator.removeServerConfig(input.name);

        return { success: true };
    }),
});
