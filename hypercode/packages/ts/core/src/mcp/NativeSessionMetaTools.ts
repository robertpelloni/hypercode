import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';

import { SessionToolWorkingSet } from './SessionToolWorkingSet.js';
import { getToolLoadingDefinitions } from './toolLoadingDefinitions.js';
import {
    executeGetToolSchemaCompatibility,
    executeListAllToolsCompatibility,
    executeListLoadedToolsCompatibility,
    executeLoadToolCompatibility,
    executeSearchToolsCompatibility,
    executeUnloadToolCompatibility,
} from './toolLoadingCompatibility.js';
import {
    pickAutoLoadCandidate,
    rankToolSearchCandidates,
    type RankedToolSearchResult,
} from './toolSearchRanking.js';
import type { ToolContextPayload } from '../services/toolContextMemory.js';

import { executeSemanticAutoCall } from './compatibilityToolRuntime.js';
import { LLMService } from '@hypercode/ai';

type SearchableTool = Tool & {
    server?: string;
    serverDisplayName?: string;
    originalName?: string;
    advertisedName?: string;
    serverTags?: string[];
    toolTags?: string[];
    semanticGroup?: string;
    semanticGroupLabel?: string;
    keywords?: string[];
    alwaysOn?: boolean;
};

type ToolListingCategory = 'downstream';

function createTextResult(text: string, isError = false): CallToolResult {
    return {
        content: [{ type: 'text', text }],
        isError,
    };
}

export class NativeSessionMetaTools {
    private readonly workingSet: SessionToolWorkingSet;
    private readonly catalog = new Map<string, Tool>();
    private toolContextResolver?: (input: { toolName: string; args?: Record<string, unknown> }) => ToolContextPayload | null;
    private llmService?: LLMService;
    private delegatedToolCaller?: (name: string, args: any, meta?: any) => Promise<CallToolResult>;
    private searchPublishedCatalogCb?: (query: string, limit?: number) => Promise<any[]>;
    private installPublishedServerCb?: (identifier: string) => Promise<{ success: boolean; message: string }>;

    constructor(
        workingSet: SessionToolWorkingSet = new SessionToolWorkingSet(),
        options: {
            toolContextResolver?: (input: { toolName: string; args?: Record<string, unknown> }) => ToolContextPayload | null;
            llmService?: LLMService;
            delegatedToolCaller?: (name: string, args: any, meta?: any) => Promise<CallToolResult>;
            searchPublishedCatalog?: (query: string, limit?: number) => Promise<any[]>;
            installPublishedServer?: (identifier: string) => Promise<{ success: boolean; message: string }>;
        } = {},
    ) {
        this.workingSet = workingSet;
        this.toolContextResolver = options.toolContextResolver;
        this.llmService = options.llmService;
        this.delegatedToolCaller = options.delegatedToolCaller;
        this.searchPublishedCatalogCb = options.searchPublishedCatalog;
        this.installPublishedServerCb = options.installPublishedServer;
    }

    public setLLMService(llmService: LLMService): void {
        this.llmService = llmService;
    }

    public setDelegatedToolCaller(caller: (name: string, args: any, meta?: any) => Promise<CallToolResult>): void {
        this.delegatedToolCaller = caller;
    }

    public setToolContextResolver(
        resolver?: (input: { toolName: string; args?: Record<string, unknown> }) => ToolContextPayload | null,
    ): void {
        this.toolContextResolver = resolver;
    }

    public refreshCatalog(tools: Tool[]): void {
        this.catalog.clear();
        tools.forEach((tool) => {
            this.catalog.set(tool.name, tool);
        });
    }

    public listToolDefinitions(): Tool[] {
        return getToolLoadingDefinitions();
    }

    public getVisibleLoadedTools(): Tool[] {
        return this.workingSet.listLoadedTools()
            .map((entry) => {
                const tool = this.catalog.get(entry.name);
                if (!tool) {
                    return null;
                }

                if (entry.hydrated) {
                    return tool;
                }

                return this.toMinimalTool(tool);
            })
            .filter((tool): tool is Tool => tool !== null);
    }

    public getLoadedToolNames(): string[] {
        return this.workingSet.getLoadedToolNames();
    }

    public setAlwaysLoadedTools(names: string[]): void {
        this.workingSet.setAlwaysLoadedTools(names.filter((name) => this.catalog.has(name)));
    }

    public hasTool(name: string): boolean {
        return this.catalog.has(name);
    }

    public loadToolIntoSession(name: string): { loaded: boolean; evicted: string[] } {
        if (!this.catalog.has(name)) {
            return { loaded: false, evicted: [] };
        }

        return {
            loaded: true,
            evicted: this.workingSet.loadTool(name),
        };
    }

    public touchLoadedTool(name: string): boolean {
        return this.workingSet.touchTool(name);
    }

    public async handleToolCall(name: string, args: Record<string, unknown>): Promise<CallToolResult | null> {
        if (name === 'search_tools') {
            return await executeSearchToolsCompatibility(args, (query, limit) => this.searchTools(query, limit));
        }

        if (name === 'search_published_catalog') {
            if (!this.searchPublishedCatalogCb) {
                return createTextResult('Catalog search is not available in this HyperCode session.', true);
            }
            const query = typeof args.query === 'string' ? args.query : '';
            if (!query) return createTextResult('Query is required.', true);
            const limit = typeof args.limit === 'number' ? args.limit : 5;

            try {
                const results = await this.searchPublishedCatalogCb(query, limit);
                return createTextResult(JSON.stringify(results, null, 2));
            } catch (err) {
                return createTextResult(`Search failed: ${err instanceof Error ? err.message : String(err)}`, true);
            }
        }

        if (name === 'install_published_server') {
            if (!this.installPublishedServerCb) {
                return createTextResult('Server installation is not available in this HyperCode session.', true);
            }
            const identifier = typeof args.identifier === 'string' ? args.identifier : '';
            if (!identifier) return createTextResult('Identifier is required.', true);

            try {
                const result = await this.installPublishedServerCb(identifier);
                return createTextResult(result.message, !result.success);
            } catch (err) {
                return createTextResult(`Installation failed: ${err instanceof Error ? err.message : String(err)}`, true);
            }
        }

        if (name === 'load_tool') {
            return await executeLoadToolCompatibility(args, (toolName) => this.catalog.has(toolName), this.workingSet);
        }

        if (name === 'get_tool_schema') {
            return await executeGetToolSchemaCompatibility(
                args,
                (toolName) => this.catalog.get(toolName) ?? null,
                this.workingSet,
                (tool, evictedHydratedTools) => ({
                    name: tool.name,
                    description: tool.description ?? '',
                    inputSchema: tool.inputSchema ?? { type: 'object', properties: {} },
                    evictedHydratedTools,
                }),
            );
        }

        if (name === 'get_tool_context') {
            const toolName = typeof args.name === 'string' ? args.name : '';
            if (!toolName) {
                return createTextResult('Tool context lookup requires a downstream tool name.', true);
            }

            if (!this.toolContextResolver) {
                return createTextResult('Tool context resolver is not available in this HyperCode session.', true);
            }

            const payload = this.toolContextResolver({
                toolName,
                args: typeof args.arguments === 'object' && args.arguments !== null
                    ? args.arguments as Record<string, unknown>
                    : undefined,
            });

            return createTextResult(JSON.stringify(payload ?? {
                toolName,
                query: toolName,
                matchedPaths: [],
                observationCount: 0,
                summaryCount: 0,
                prompt: `JIT tool context for ${toolName}:\nNo relevant prior memory was found.`,
            }));
        }

        if (name === 'unload_tool') {
            return await executeUnloadToolCompatibility(args, this.workingSet);
        }

        if (name === 'list_loaded_tools') {
            return await executeListLoadedToolsCompatibility(this.workingSet);
        }

        if (name === 'list_all_tools') {
            return await executeListAllToolsCompatibility(this.listAllTools(args));
        }

        if (name === 'set_capacity') {
            const rawMax = typeof args.maxLoadedTools === 'number' ? args.maxLoadedTools : undefined;
            const rawHydrated = typeof args.maxHydratedSchemas === 'number' ? args.maxHydratedSchemas : undefined;
            const rawIdle = typeof args.idleEvictionThresholdMs === 'number' ? args.idleEvictionThresholdMs : undefined;

            this.workingSet.reconfigure({
                maxLoadedTools: rawMax,
                maxHydratedSchemas: rawHydrated,
                idleEvictionThresholdMs: rawIdle,
            });

            const updated = this.workingSet.getLimits();
            return createTextResult(
                `Working-set capacity updated: maxLoadedTools=${updated.maxLoadedTools}, maxHydratedSchemas=${updated.maxHydratedSchemas}, idleEvictionThresholdMs=${updated.idleEvictionThresholdMs}`,
            );
        }

        if (name === 'get_eviction_history') {
            return createTextResult(JSON.stringify(this.workingSet.getEvictionHistory()));
        }

        if (name === 'clear_eviction_history') {
            const clearedCount = this.workingSet.getEvictionHistory().length;
            this.workingSet.clearEvictionHistory();
            return createTextResult(`Cleared ${clearedCount} eviction history entr${clearedCount === 1 ? 'y' : 'ies'}.`);
        }

        if (name === 'auto_call_tool') {
            if (!this.llmService || !this.delegatedToolCaller) {
                return createTextResult('Auto-execution is not available in this HyperCode session.', true);
            }

            return await executeSemanticAutoCall(
                args,
                this.llmService,
                (query, limit) => this.searchTools(query, limit),
                this.delegatedToolCaller
            );
        }

        return null;
    }

    private searchTools(query: string, limit: number): RankedToolSearchResult[] {
        const rankedResults = rankToolSearchCandidates(
            Array.from(this.catalog.values()).map((tool) => {
                const searchableTool = tool as SearchableTool;
                return {
                name: tool.name,
                description: tool.description ?? '',
                serverName: searchableTool.server,
                serverDisplayName: searchableTool.serverDisplayName,
                originalName: searchableTool.originalName,
                advertisedName: searchableTool.advertisedName,
                serverTags: searchableTool.serverTags,
                toolTags: searchableTool.toolTags,
                semanticGroup: searchableTool.semanticGroup,
                semanticGroupLabel: searchableTool.semanticGroupLabel,
                keywords: searchableTool.keywords,
                alwaysOn: searchableTool.alwaysOn,
                inputSchema: tool.inputSchema,
                loaded: this.workingSet.isLoaded(tool.name),
                hydrated: this.workingSet.isHydrated(tool.name),
                deferred: !this.workingSet.isHydrated(tool.name),
                };
            }),
            query,
            limit,
        );

        const autoLoadDecision = pickAutoLoadCandidate(rankedResults, query);
        if (!autoLoadDecision) {
            return rankedResults;
        }

        const { loaded, evicted } = this.loadToolIntoSession(autoLoadDecision.toolName);
        if (!loaded) {
            return rankedResults;
        }

        return rankedResults.map((result) => {
            if (result.name === autoLoadDecision.toolName) {
                return {
                    ...result,
                    loaded: true,
                    autoLoaded: true,
                    matchReason: `${result.matchReason}; ${autoLoadDecision.reason}`,
                };
            }

            if (evicted.includes(result.name)) {
                return {
                    ...result,
                    loaded: false,
                };
            }

            return result;
        });
    }

    private listAllTools(args: Record<string, unknown>): {
        summary: {
            total: number;
            loaded: number;
            hydrated: number;
            alwaysOn: number;
            categories: Record<ToolListingCategory, number>;
        };
        tools: Array<{
            name: string;
            description: string;
            category: ToolListingCategory;
            serverName?: string;
            serverDisplayName?: string;
            advertisedName?: string;
            originalName?: string;
            alwaysOn: boolean;
            loaded: boolean;
            hydrated: boolean;
            deferred: boolean;
            requiresSchemaHydration: boolean;
            inputSchema: unknown;
        }>;
    } {
        const query = typeof args.query === 'string' ? args.query.trim().toLowerCase() : '';
        const requestedCategory = typeof args.category === 'string' ? args.category : 'all';
        const limit = typeof args.limit === 'number' ? Math.max(1, Math.round(args.limit)) : 100;

        const tools = Array.from(this.catalog.values())
            .map((tool) => {
                const searchableTool = tool as SearchableTool;
                return {
                    name: tool.name,
                    description: tool.description ?? '',
                    category: 'downstream' as const,
                    serverName: searchableTool.server,
                    serverDisplayName: searchableTool.serverDisplayName,
                    advertisedName: searchableTool.advertisedName,
                    originalName: searchableTool.originalName,
                    alwaysOn: Boolean(searchableTool.alwaysOn),
                    loaded: this.workingSet.isLoaded(tool.name),
                    hydrated: this.workingSet.isHydrated(tool.name),
                    deferred: !this.workingSet.isHydrated(tool.name),
                    requiresSchemaHydration: !this.workingSet.isHydrated(tool.name),
                    inputSchema: tool.inputSchema ?? { type: 'object', properties: {} },
                };
            })
            .filter((tool) => requestedCategory === 'all' || requestedCategory === tool.category)
            .filter((tool) => {
                if (!query) {
                    return true;
                }

                const haystack = [
                    tool.name,
                    tool.description,
                    tool.serverName,
                    tool.serverDisplayName,
                    tool.advertisedName,
                    tool.originalName,
                ].filter(Boolean).join(' ').toLowerCase();

                return haystack.includes(query);
            })
            .sort((left, right) => {
                if (left.alwaysOn !== right.alwaysOn) {
                    return left.alwaysOn ? -1 : 1;
                }
                if (left.loaded !== right.loaded) {
                    return left.loaded ? -1 : 1;
                }
                if (left.hydrated !== right.hydrated) {
                    return left.hydrated ? -1 : 1;
                }
                return left.name.localeCompare(right.name);
            })
            .slice(0, limit);

        return {
            summary: {
                total: tools.length,
                loaded: tools.filter((tool) => tool.loaded).length,
                hydrated: tools.filter((tool) => tool.hydrated).length,
                alwaysOn: tools.filter((tool) => tool.alwaysOn).length,
                categories: {
                    downstream: tools.length,
                },
            },
            tools,
        };
    }

    private toMinimalTool(tool: Tool): Tool {
        return {
            name: tool.name,
            description: `[Deferred] ${tool.description ?? 'No description'}`,
            inputSchema: {
                type: 'object',
                properties: {},
            },
        };
    }
}
