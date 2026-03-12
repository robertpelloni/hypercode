import { z } from 'zod';
import fs from 'node:fs/promises';
import { mcpServersRepository, toolsRepository } from '../db/repositories/index.js';
import { t, publicProcedure, adminProcedure, getMcpAggregator, getMcpServer } from '../lib/trpc-core.js';
import { namespaceToolName } from '../mcp/namespaces.js';
import { pickAutoLoadCandidate, rankToolSearchCandidates } from '../mcp/toolSearchRanking.js';
import { toolSelectionTelemetry } from '../mcp/toolSelectionTelemetry.js';
import { getBorgMcpJsoncPath, loadBorgMcpConfig, stripJsonComments, writeBorgMcpConfig } from '../mcp/mcpJsonConfig.js';
import {
    buildToolPreferenceSettings,
    mergeToolPreferences,
    readToolPreferencesFromSettings,
    type ToolPreferences,
} from './mcp-tool-preferences.js';

type McpToolCallResult = {
    content?: Array<{ type?: string; text?: string }>;
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

function recordAutoLoadTelemetry(toolName: string, message: string): void {
    toolSelectionTelemetry.record({
        type: 'load',
        toolName,
        status: 'success',
        message,
        evictedTools: parseEvictedToolsFromMessage(message),
    });
}

async function getCachedToolInventory() {
    const [servers, tools] = await Promise.all([
        mcpServersRepository.findAll(),
        toolsRepository.findAll(),
    ]);

    const serverNames = new Map(servers.map((server) => [server.uuid, server.name]));
    const toolCounts = new Map<string, number>();

    for (const tool of tools) {
        toolCounts.set(tool.mcp_server_uuid, (toolCounts.get(tool.mcp_server_uuid) ?? 0) + 1);
    }

    return {
        servers,
        toolCounts,
        tools: tools.map((tool) => {
            const serverName = serverNames.get(tool.mcp_server_uuid) ?? 'unknown';
            return {
                name: namespaceToolName(serverName, tool.name),
                description: tool.description ?? '',
                server: serverName,
                inputSchema: tool.toolSchema ?? null,
            };
        }),
    };
}

async function readToolPreferences(): Promise<ToolPreferences> {
    try {
        const config = await loadBorgMcpConfig();
        const settings = config.settings as { toolSelection?: { importantTools?: unknown; alwaysLoadedTools?: unknown } } | undefined;
        return readToolPreferencesFromSettings(settings?.toolSelection);
    } catch {
        return { importantTools: [], alwaysLoadedTools: [] };
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
                return {
                    name: server.name ?? 'unknown',
                    status: runtime?.status ?? (server.error_status === 'NONE' ? 'cached' : server.error_status.toLowerCase()),
                    toolCount: runtime?.toolCount ?? toolCounts.get(server.uuid) ?? 0,
                    config: {
                        command: runtime?.config?.command ?? server.command ?? '',
                        args: runtime?.config?.args ?? server.args ?? [],
                        env: runtime?.config?.env
                            ? Object.keys(runtime.config.env)
                            : Object.keys(server.env ?? {}),
                    },
                };
            });
        } catch {
            return [];
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
                inputSchema: tool.inputSchema ?? null,
            }));
        } catch {
            return [];
        }
    }),

    traffic: publicProcedure.query(async () => {
        const aggregator = getMcpAggregator();
        try {
            return await aggregator?.getTrafficEvents?.() ?? [];
        } catch {
            return [];
        }
    }),

    searchTools: publicProcedure.input(z.object({
        query: z.string().default(''),
    })).query(async ({ input }) => {
        try {
            const { tools } = await getCachedToolInventory();
            const preferences = await readToolPreferences();
            const normalizedQuery = input.query.trim().toLowerCase();
            const server = getMcpServer();

            if (server) {
                await ensureAlwaysLoadedTools(server, preferences);
                try {
                    const result = await server.executeTool('search_tools', { query: input.query });
                    const rankedResults = parseToolJson<Array<{
                        name: string;
                        description: string;
                        serverName?: string;
                        originalName?: string;
                        loaded?: boolean;
                        hydrated?: boolean;
                        deferred?: boolean;
                        requiresSchemaHydration?: boolean;
                        matchReason?: string;
                        score?: number;
                        rank?: number;
                        autoLoaded?: boolean;
                        mcpServerUuid?: string;
                    }>>(result, []);

                    if (rankedResults.length > 0) {
                        const mappedResults = rankedResults.map((tool, index) => ({
                            name: tool.name,
                            description: tool.description ?? '',
                            server: tool.serverName ?? 'unknown',
                            originalName: tool.originalName ?? null,
                            loaded: Boolean(tool.loaded),
                            hydrated: Boolean(tool.hydrated),
                            deferred: Boolean(tool.deferred),
                            requiresSchemaHydration: Boolean(tool.requiresSchemaHydration),
                            matchReason: tool.matchReason ?? 'matched available metadata',
                            score: tool.score ?? 0,
                            rank: tool.rank ?? (index + 1),
                            autoLoaded: Boolean(tool.autoLoaded),
                            inputSchema: null,
                        }));

                        const autoLoadedResult = mappedResults.find((tool) => tool.autoLoaded);
                        if (autoLoadedResult) {
                            recordAutoLoadTelemetry(autoLoadedResult.name, `Tool '${autoLoadedResult.name}' auto-loaded from search.`);
                        }

                        toolSelectionTelemetry.record({
                            type: 'search',
                            query: input.query,
                            source: 'runtime-search',
                            resultCount: mappedResults.length,
                            topResultName: mappedResults[0]?.name,
                            topMatchReason: mappedResults[0]?.matchReason,
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
                        originalName: tool.name.includes('__') ? tool.name.split('__').slice(1).join('__') : undefined,
                        deferred: tool.inputSchema == null,
                        hydrated: tool.inputSchema != null,
                    })),
                    normalizedQuery,
                    normalizedQuery ? 10 : tools.length,
                );

                const autoLoadDecision = server
                    ? pickAutoLoadCandidate(rankedCandidateResults, normalizedQuery)
                    : null;

                if (server && autoLoadDecision) {
                    try {
                        const loadResult = await server.executeTool('load_tool', { name: autoLoadDecision.toolName });
                        recordAutoLoadTelemetry(autoLoadDecision.toolName, getToolTextContent(loadResult));
                    } catch {
                        // Ignore auto-load failures here and still return ranked search results.
                    }
                }

                const rankedResults = rankedCandidateResults.map((tool, index) => ({
                    name: tool.name,
                    description: tool.description ?? '',
                    server: tool.serverName ?? 'unknown',
                    originalName: tool.originalName ?? null,
                    loaded: tool.loaded || tool.name === autoLoadDecision?.toolName,
                    hydrated: tool.hydrated,
                    deferred: tool.deferred,
                    requiresSchemaHydration: tool.requiresSchemaHydration,
                    matchReason: tool.name === autoLoadDecision?.toolName
                        ? `${tool.matchReason}; ${autoLoadDecision.reason}`
                        : tool.matchReason,
                    score: tool.score,
                    rank: index + 1,
                    autoLoaded: tool.name === autoLoadDecision?.toolName,
                    inputSchema: null,
                }));

                toolSelectionTelemetry.record({
                    type: 'search',
                    query: input.query,
                    source: 'cached-ranking',
                    resultCount: rankedResults.length,
                    topResultName: rankedResults[0]?.name,
                    topMatchReason: rankedResults[0]?.matchReason,
                    status: 'success',
                });

                return mergeToolPreferences(rankedResults, preferences, tools);
            }

            const aggregator = getMcpAggregator();
            const liveTools = await aggregator?.searchTools?.(input.query) ?? [];
            const mappedLiveTools = liveTools.map((tool) => ({
                name: tool.name,
                description: tool.description ?? '',
                server: tool.server ?? 'unknown',
                originalName: null,
                loaded: false,
                hydrated: tool.inputSchema != null,
                deferred: tool.inputSchema == null,
                requiresSchemaHydration: tool.inputSchema == null,
                matchReason: normalizedQuery ? 'matched live aggregated catalog' : 'available tool in the current catalog',
                score: 0,
                rank: 0,
                inputSchema: tool.inputSchema ?? null,
            }));

            toolSelectionTelemetry.record({
                type: 'search',
                query: input.query,
                source: 'live-aggregator',
                resultCount: mappedLiveTools.length,
                topResultName: mappedLiveTools[0]?.name,
                topMatchReason: mappedLiveTools[0]?.matchReason,
                status: 'success',
            });

            return mergeToolPreferences(mappedLiveTools, preferences, tools);
        } catch {
            toolSelectionTelemetry.record({
                type: 'search',
                query: input.query,
                status: 'error',
                message: 'search failed',
            });
            return [];
        }
    }),

    getToolSelectionTelemetry: publicProcedure.query(() => toolSelectionTelemetry.list()),

    getToolPreferences: publicProcedure.query(async () => readToolPreferences()),

    setToolPreferences: adminProcedure.input(z.object({
        importantTools: z.array(z.string().min(1)).default([]),
        alwaysLoadedTools: z.array(z.string().min(1)).default([]),
    })).mutation(async ({ input }) => {
        const next = await writeToolPreferences({
            importantTools: input.importantTools,
            alwaysLoadedTools: input.alwaysLoadedTools,
        });
        const server = getMcpServer();
        if (server) {
            await ensureAlwaysLoadedTools(server, next);
        }
        return { ok: true, ...next };
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
                    content: `// Borg MCP configuration\n${JSON.stringify(fallbackConfig, null, 2)}\n`,
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

    clearToolSelectionTelemetry: adminProcedure.mutation(() => {
        toolSelectionTelemetry.clear();
        return { ok: true };
    }),

    getWorkingSet: publicProcedure.query(async () => {
        const server = getMcpServer();
        if (!server) {
            return {
                limits: { maxLoadedTools: 0, maxHydratedSchemas: 0 },
                tools: [],
            };
        }

        try {
            await ensureAlwaysLoadedTools(server, await readToolPreferences());
            const result = await server.executeTool('list_loaded_tools', {});
            return parseToolJson(result, {
                limits: { maxLoadedTools: 0, maxHydratedSchemas: 0 },
                tools: [],
            });
        } catch {
            return {
                limits: { maxLoadedTools: 0, maxHydratedSchemas: 0 },
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

        const result = await server.executeTool('load_tool', { name: input.name });
        const message = getToolTextContent(result);
        const evictedTools = parseEvictedToolsFromMessage(message);
        toolSelectionTelemetry.record({
            type: 'load',
            toolName: input.name,
            status: 'success',
            message,
            evictedTools,
        });
        return {
            ok: true,
            message,
        };
    }),

    unloadTool: publicProcedure.input(z.object({
        name: z.string().min(1),
    })).mutation(async ({ input }) => {
        const server = getMcpServer();
        if (!server) {
            throw new Error('MCP Server not initialized');
        }

        const result = await server.executeTool('unload_tool', { name: input.name });
        const message = getToolTextContent(result);
        toolSelectionTelemetry.record({
            type: 'unload',
            toolName: input.name,
            status: 'success',
            message,
        });
        return {
            ok: true,
            message,
        };
    }),

    getToolSchema: publicProcedure.input(z.object({
        name: z.string().min(1),
    })).mutation(async ({ input }) => {
        const server = getMcpServer();
        if (!server) {
            throw new Error('MCP Server not initialized');
        }

        const result = await server.executeTool('get_tool_schema', { name: input.name });
        const parsed = parseToolJson(result, {
            inputSchema: null,
            evictedHydratedTools: [],
        });
        toolSelectionTelemetry.record({
            type: 'hydrate',
            toolName: input.name,
            status: 'success',
            message: 'schema hydrated',
            evictedTools: Array.isArray(parsed.evictedHydratedTools) ? parsed.evictedHydratedTools : [],
        });
        return parsed;
    }),

    /** Get aggregator status and stats */
    getStatus: publicProcedure.query(async () => {
        const aggregator = getMcpAggregator();

        try {
            const [{ servers, tools }, liveServers] = await Promise.all([
                getCachedToolInventory(),
                aggregator?.listServers?.() ?? Promise.resolve([]),
            ]);

            return {
                initialized: Boolean(aggregator),
                serverCount: servers.length,
                toolCount: tools.length,
                connectedCount: liveServers.filter((s) => s.status === 'connected').length,
            };
        } catch {
            return { initialized: false, serverCount: 0, toolCount: 0, connectedCount: 0 };
        }
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
