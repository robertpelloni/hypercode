import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { RequestOptions } from "@modelcontextprotocol/sdk/shared/protocol.js";
import {
    CallToolRequestSchema,
    CallToolResult,
    CompatibilityCallToolResultSchema,
    GetPromptRequestSchema,
    ListPromptsRequestSchema,
    ListResourcesRequestSchema,
    ListResourceTemplatesRequestSchema,
    ListToolsRequestSchema,
    ListToolsResultSchema,
    ReadResourceRequestSchema,
    Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { toonSerializer } from "./stubs/toon.serializer.stub.js";
import { jsonConfigProvider } from "./config/JsonConfigProvider.js";
import { toolRegistry } from "./ToolRegistry.js";
import { SavedScriptConfig } from "../interfaces/IConfigProvider.js";

import { codeExecutorService } from "./CodeExecutorService.js";
import { deferredLoadingService } from "./deferred-loading.service.js";
import { toolsRepository, mcpServersRepository } from "../db/repositories/index.js";

// Ported Services
import { configImportService } from "./config-import.service.js";
import { configService } from "./config.service.js";
import { toolSetService } from "./tool-set.service.js";
import { ConnectedClient } from "./mcp-client.service.js";
import { getMcpServers } from "./mcp-config-discovery.service.js";
import { mcpServerPool } from "./mcp-server-pool.service.js";
import { toolsSyncCache } from "./tools-sync-cache.service.js";
import { parseToolName } from "./tool-name-parser.service.js";
import { sanitizeName } from "./common-utils.js";
import { getAgentMemoryService, getMcpServer } from "../lib/trpc-core.js";
import { SessionToolWorkingSet } from "./metamcp-session-working-set.service.js";
import { getCompatibilityToolDefinitions } from "../mcp/compatibilityToolDefinitions.js";
import { getToolLoadingDefinitions } from "../mcp/toolLoadingDefinitions.js";
import {
    getDownstreamPrompt,
    listDownstreamPrompts,
    listDownstreamResources,
    listDownstreamResourceTemplates,
    readDownstreamResource,
} from "../mcp/downstreamDiscovery.js";
import {
    createCompatibleAgentRunner,
    executeCompatibleImportConfig,
    executeCompatibleRunCode,
    executeCompatibleRunAgent,
    executeCompatibleRunPython,
    executeCompatibleSearchMemory,
    executeCompatibleSaveMemory,
    executeCompatibleSaveScript,
    executeSemanticAutoCall,
} from "../mcp/compatibilityToolRuntime.js";
import {
    executeGetToolSchemaCompatibility,
    executeListLoadedToolsCompatibility,
    executeLoadToolCompatibility,
    executeSearchToolsCompatibility,
    executeUnloadToolCompatibility,
} from "../mcp/toolLoadingCompatibility.js";
import { rankToolSearchCandidates } from "../mcp/toolSearchRanking.js";
import { executeSavedScriptTool, listSavedScriptTools } from "../mcp/savedScriptExecution.js";
import {
    executeCompatibleListToolSets,
    executeCompatibleLoadToolSet,
    executeCompatibleSaveToolSet,
} from "../mcp/toolSetCompatibility.js";

// Middleware
import {
    createFilterCallToolMiddleware,
    createFilterListToolsMiddleware,
} from "./legacy-proxy-middleware/filter-tools.functional.js";
import { createPolicyMiddleware } from "./legacy-proxy-middleware/policy.functional.js";
import {
    CallToolHandler,
    compose,
    ListToolsHandler,
    MetaMCPHandlerContext,
} from "./legacy-proxy-middleware/functional-middleware.js";
import { createLoggingMiddleware } from "./legacy-proxy-middleware/logging.functional.js";
import {
    createToolOverridesCallToolMiddleware,
    createToolOverridesListToolsMiddleware,
    mapOverrideNameToOriginal,
} from "./legacy-proxy-middleware/tool-overrides.functional.js";

const toolsImplementations = {
    create: async ({
        tools,
        mcpServerUuid,
        serverName
    }: {
        tools: Tool[];
        mcpServerUuid: string;
        serverName: string;
    }) => {
        // Register tools in memory
        toolRegistry.registerTools(tools, mcpServerUuid, serverName);
    },
};

const agentService = {
    runAgent: async (
        task: string,
        toolCallback: (toolName: string, toolArgs: unknown, meta?: Record<string, unknown>) => Promise<unknown>,
        policyId?: string,
    ) => {
        const mcp = getMcpServer();
        const runner = createCompatibleAgentRunner(mcp.llmService);
        return await runner.runAgent(task, toolCallback, policyId);
    },
};
function searchRegisteredTools(
    query: string,
    limit: number,
    options?: {
        isLoaded?: (toolName: string) => boolean;
        isHydrated?: (toolName: string) => boolean;
    },
): Array<ReturnType<typeof rankToolSearchCandidates>[number] & { rank: number; mcpServerUuid?: string }> {
    const all = toolRegistry.getAllTools();
    const serverUuidByToolName = new Map(all.map((registeredTool) => [registeredTool.tool.name, registeredTool.mcpServerUuid]));

    return rankToolSearchCandidates(
        all.map((registeredTool) => ({
            name: registeredTool.tool.name,
            description: registeredTool.tool.description ?? '',
            serverName: registeredTool.serverName,
            originalName: parseToolName(registeredTool.tool.name)?.originalToolName,
            loaded: options?.isLoaded?.(registeredTool.tool.name) ?? false,
            hydrated: options?.isHydrated?.(registeredTool.tool.name) ?? !registeredTool.isDeferred,
            deferred: registeredTool.isDeferred ?? false,
        })),
        query,
        limit,
    ).map((result, index) => ({
        ...result,
        rank: index + 1,
        mcpServerUuid: serverUuidByToolName.get(result.name),
    }));
}

const savedScriptService = {
    listScripts: async (): Promise<SavedScriptConfig[]> => {
        return jsonConfigProvider.loadScripts();
    },
    getScript: async (name: string) => {
        const scripts = await savedScriptService.listScripts();
        return scripts.find((script: SavedScriptConfig) => script.name === name) ?? null;
    },
    saveScript: async (name: string, code: string, description?: string) => {
        const script: SavedScriptConfig = {
            name,
            code,
            description: description ?? null,
        };
        return await jsonConfigProvider.saveScript(script);
    },
};

/**
 * Filter out tools that are overrides of existing tools to prevent duplicates in database
 * Uses the existing tool overrides cache for optimal performance
 */
async function filterOutOverrideTools(
    tools: Tool[],
    namespaceUuid: string,
    serverName: string,
): Promise<Tool[]> {
    if (!tools || tools.length === 0) {
        return tools;
    }

    const filteredTools: Tool[] = [];

    await Promise.allSettled(
        tools.map(async (tool) => {
            try {
                // Check if this tool name is actually an override name for an existing tool
                // by using the existing mapOverrideNameToOriginal function
                const fullToolName = `${sanitizeName(serverName)}__${tool.name}`;
                const originalName = await mapOverrideNameToOriginal(
                    fullToolName,
                    namespaceUuid,
                    true, // use cache
                );

                // If the original name is different from the current name,
                // this tool is an override and should be filtered out
                if (originalName !== fullToolName) {
                    // This is an override, skip it (don't save to database)
                    return;
                }

                // This is not an override, include it
                filteredTools.push(tool);
            } catch (error) {
                console.error(
                    `Error checking if tool ${tool.name} is an override:`,
                    error,
                );
                // On error, include the tool (fail-safe behavior)
                filteredTools.push(tool);
            }
        }),
    );

    return filteredTools;
}

/**
 * Allows executing a tool programmatically through the full MetaMCP proxy stack.
 * Set during attachTo initialization.
 */
export let executeProxiedTool: ((name: string, args: any) => Promise<CallToolResult>) | null = null;

export const attachTo = async (
    server: Server,
    namespaceUuid: string,
    sessionId: string,
    nativeToolDefinitions: Tool[],
    nativeToolHandler: (name: string, args: unknown) => Promise<CallToolResult>,
    includeInactiveServers: boolean = false,
    options: {
        registerDiscoveryHandlers?: boolean;
    } = {},
) => {
    const toolToClient: Record<string, ConnectedClient> = {};
    const toolToServerUuid: Record<string, string> = {};
    const promptToClient: Record<string, ConnectedClient> = {};
    const resourceToClient: Record<string, ConnectedClient> = {};

    // Session-specific map of "loaded" tools that should be exposed to the client
    // Key: toolName, Value: true
    // Limited to 200 items to prevent unbounded growth in long sessions
    const toolWorkingSet = new SessionToolWorkingSet();
    const deferredSchemaMode = process.env.MCP_DEFER_TOOL_SCHEMAS === 'true'
        || process.env.MCP_PROGRESSIVE_MODE === 'true';
    const registerDiscoveryHandlers = options.registerDiscoveryHandlers ?? true;
    const getAlwaysVisibleTools = async (): Promise<string[]> => {
        try {
            const configTools = await jsonConfigProvider.loadAlwaysVisibleTools();
            const dbTools = await toolsRepository.findAll();
            const dbServers = await mcpServersRepository.findAll();
            
            const alwaysOnServers = new Set(
                dbServers.filter(s => s.always_on).map(s => s.uuid)
            );
            
            const alwaysOnToolNames = dbTools
                .filter(t => t.always_on || alwaysOnServers.has(t.mcp_server_uuid))
                .map(t => {
                    const server = dbServers.find(s => s.uuid === t.mcp_server_uuid);
                    const serverName = server?.name || 'unknown';
                    return `${sanitizeName(serverName)}__${t.name}`;
                });
                
            return [...new Set([...configTools, ...alwaysOnToolNames])];
        } catch (error) {
            console.error("Error loading always-visible tools", error);
            return [];
        }
    };

    // Helper function to detect if a server is the same instance
    const isSameServerInstance = (
        params: { name?: string; url?: string | null },
        _serverUuid: string,
    ): boolean => {
        // Check if server name is exactly the same as our current server instance
        // This prevents exact recursive calls to the same server
        if (params.name === `metamcp-unified-${namespaceUuid}`) {
            return true;
        }

        return false;
    };

    // Server instance is passed in, so we don't create it here.
    // However, we might want to ensure capabilities are set if not already?
    // The caller (MCPServer) handles Server creation and capability definition.

    // Create the handler context
    const handlerContext: MetaMCPHandlerContext = {
        namespaceUuid,
        sessionId,
    };

    // ----------------------------------------------------------------------
    // Handler Implementations (Unwrapped)
    // ----------------------------------------------------------------------

    const originalListToolsHandler: ListToolsHandler = async (
        request,
        context,
    ) => {
        // 1. Meta Tools
        const metaTools: Tool[] = [
            ...getToolLoadingDefinitions({
                descriptions: {
                    search_tools: "Semantically search for available tools across all connected MCP servers. Use this to find tools for a specific task.",
                    load_tool: "Load a specific tool by name into your context so you can use it. In progressive mode this loads lightweight metadata first; use get_tool_schema to hydrate the full parameter schema when needed.",
                    get_tool_schema: "Explicitly fetch and hydrate the full JSON schema for a deferred tool after search/load, reducing default token overhead for sub-agents.",
                    get_tool_context: "Fetch compact Borg memory context before calling a downstream tool so the model can reuse recent observations, summaries, and file-specific learnings.",
                    unload_tool: "Remove a previously loaded tool from the current session working set so it no longer appears in the exposed tool list.",
                    list_loaded_tools: "List tools currently loaded into the session working set, including whether their full schemas are hydrated.",
                    clear_eviction_history: "Clear the bounded recent eviction-history buffer for the current session working set.",
                },
            }),
            ...getCompatibilityToolDefinitions(),
        ];

        // 2. Native Tools (Pre-loaded / Standard Lib)
        // Add native tools to metaTools list so they are always available
        // We prefix them if needed, or assume they are global.
        // For Borg, standard tools are global.
        if (nativeToolDefinitions && nativeToolDefinitions.length > 0) {
            metaTools.push(...nativeToolDefinitions);
        }

        // 3. Saved Scripts
        // Fetch user-defined saved scripts and expose them as tools
        try {
            const scriptTools = await listSavedScriptTools(
                { loadScripts: savedScriptService.listScripts },
                (script) => `[Saved Script] ${script.description || "No description"}`,
            );
            metaTools.push(...scriptTools);
        } catch (e) {
            console.error("Error fetching saved scripts", e);
        }

        const serverParams = await getMcpServers(
            context.namespaceUuid,
            includeInactiveServers,
        );

        const visitedServers = new Set<string>();
        const allServerEntries = Object.entries(serverParams);
        const allAvailableTools: Tool[] = [];

        console.log(`[DEBUG-TOOLS] 📋 Processing ${allServerEntries.length} servers`);

        await Promise.allSettled(
            allServerEntries.map(async ([mcpServerUuid, params]) => {
                if (visitedServers.has(mcpServerUuid)) return;

                const session = await mcpServerPool.getSession(
                    context.sessionId,
                    mcpServerUuid,
                    params,
                    namespaceUuid,
                );
                if (!session) {
                    console.log(`[DEBUG-TOOLS] ❌ No session for: ${params.name}`);
                    return;
                }

                const serverVersion = session.client.getServerVersion();
                const actualServerName = serverVersion?.name || params.name || "";
                const ourServerName = `metamcp-unified-${namespaceUuid}`;
                if (actualServerName === ourServerName) return;
                if (isSameServerInstance(params, mcpServerUuid)) return;

                visitedServers.add(mcpServerUuid);

                const capabilities = session.client.getServerCapabilities();
                if (!capabilities?.tools) return;

                const serverName = params.name || session.client.getServerVersion()?.name || "";

                try {
                    const allServerTools: Tool[] = [];
                    let cursor: string | undefined = undefined;
                    let hasMore = true;

                    while (hasMore) {
                        const result = await session.client.request(
                            {
                                method: "tools/list",
                                params: { cursor, _meta: request.params?._meta }
                            },
                            ListToolsResultSchema as unknown as import("zod").ZodType<any>
                        ) as import("@modelcontextprotocol/sdk/types.js").ListToolsResult;
                        if (result.tools) allServerTools.push(...result.tools);
                        cursor = result.nextCursor;
                        hasMore = !!result.nextCursor;
                    }

                    if (allServerTools.length > 0) {
                        try {
                            const toolsToSave = await filterOutOverrideTools(
                                allServerTools,
                                namespaceUuid,
                                serverName
                            );
                            if (toolsToSave.length > 0) {
                                // Use in-memory registry with namespaced names to match Proxy/Dashboard expectations
                                const namespacedTools = toolsToSave.map(t => ({
                                    ...t,
                                    name: `${sanitizeName(serverName)}__${t.name}`
                                }));
                                if (deferredSchemaMode) {
                                    namespacedTools.forEach((tool) => {
                                        deferredLoadingService.cacheToolSchema(tool.name, tool);
                                        const deferred = deferredLoadingService.createDeferredTool(tool, mcpServerUuid);
                                        const minimalTool = deferredLoadingService.createMinimalTool(deferred);
                                        toolRegistry.registerTool(minimalTool, mcpServerUuid, serverName, {
                                            isDeferred: true,
                                            fullTool: tool,
                                        });
                                    });
                                } else {
                                    toolRegistry.registerTools(
                                        namespacedTools,
                                        mcpServerUuid,
                                        serverName
                                    );
                                }
                            }
                        } catch (e) {
                            console.error("DB Save Error", e);
                        }
                    }

                    allServerTools.forEach(tool => {
                        const toolName = `${sanitizeName(serverName)}__${tool.name}`;
                        toolToClient[toolName] = session;
                        toolToServerUuid[toolName] = mcpServerUuid;
                        const namespacedTool = {
                            ...tool,
                            name: toolName
                        };

                        if (deferredSchemaMode) {
                            deferredLoadingService.cacheToolSchema(toolName, namespacedTool);
                        }

                        allAvailableTools.push({
                            ...(deferredSchemaMode
                                ? deferredLoadingService.createMinimalTool(
                                    deferredLoadingService.createDeferredTool(namespacedTool, mcpServerUuid)
                                )
                                : namespacedTool)
                        });
                    });

                } catch (error) {
                    console.error(`Error fetching tools from ${serverName}:`, error);
                }
            })
        );

        const resultTools = [...metaTools];
        const alwaysVisibleTools = new Set(await getAlwaysVisibleTools());
        toolWorkingSet.setAlwaysLoadedTools(
            allAvailableTools
                .filter((tool) => alwaysVisibleTools.has(tool.name))
                .map((tool) => tool.name),
        );

        allAvailableTools.forEach(tool => {
            if (toolWorkingSet.isLoaded(tool.name)) {
                if (deferredSchemaMode && toolWorkingSet.isHydrated(tool.name)) {
                    const cachedSchema = deferredLoadingService.getCachedSchema(tool.name);
                    resultTools.push(cachedSchema ?? tool);
                    return;
                }

                resultTools.push(tool);
            }
        });

        return { tools: resultTools };
    };

    // ----------------------------------------------------------------------
    // Middleware Composition & Recursive Handling
    // ----------------------------------------------------------------------

    // We need a mechanism to allow _internalCallToolImpl to call the *final composed function* (recursiveCallToolHandler).
    // However, recursiveCallToolHandler is composed *using* a handler that calls _internalCallToolImpl.
    // This creates a circular dependency:
    // recursiveCallToolHandler -> middleware -> internalHandler -> recursiveCallToolHandler

    // To solve this cleanly, we use a mutable reference pattern.
    let recursiveCallToolHandlerRef: CallToolHandler | null = null;

    // The "delegate" handler simply calls whatever function is currently in the reference.
    const delegateHandler: CallToolHandler = async (request, context) => {
        if (!recursiveCallToolHandlerRef) {
            throw new Error("Handler not initialized");
        }
        return recursiveCallToolHandlerRef(request, context);
    };

    /**
     * Internal implementation that does the actual work.
     */
    const _internalCallToolImpl = async (
        name: string,
        args: any,
        meta?: any
    ): Promise<CallToolResult> => {

        // Check for TOON request
        const useToon = meta?.toon === true || meta?.toon === "true";

        const formatResult = (result: CallToolResult): CallToolResult => {
            if (!useToon) return result;

            // Attempt to compress JSON content
            const newContent = result.content.map(item => {
                if (item.type === "text") {
                    try {
                        // Try to parse as JSON first
                        const data = JSON.parse(item.text);
                        const serialized = toonSerializer.serialize(data);
                        return { ...item, text: serialized };
                    } catch (e) {
                        // Not JSON, return as is
                        return item;
                    }
                }
                return item;
            });

            return {
                ...result,
                content: newContent
            };
        };

        // 1. Meta Tools
        if (name === "search_tools") {
            return formatResult(await executeSearchToolsCompatibility(
                args,
                (query, limit) => searchRegisteredTools(query, limit, {
                    isLoaded: (toolName) => toolWorkingSet.isLoaded(toolName),
                    isHydrated: (toolName) => toolWorkingSet.isHydrated(toolName),
                }),
            ));
        }

        if (name === "load_tool") {
            return await executeLoadToolCompatibility(args, (toolName) => Boolean(toolToClient[toolName]), toolWorkingSet);
        }

        if (name === "get_tool_schema") {
            return formatResult(await executeGetToolSchemaCompatibility(
                args,
                (toolName) => deferredLoadingService.getCachedSchema(toolName),
                toolWorkingSet,
                (tool, evictedHydratedTools) => ({
                    inputSchema: tool.inputSchema ?? { type: "object", properties: {} },
                    evictedHydratedTools,
                }),
                (toolName) => `Schema for '${toolName}' is not available in cache. Load or rediscover the tool first.`,
                (toolName, tool) => {
                    const registeredTool = toolRegistry.getTool(toolName);
                    if (registeredTool) {
                        toolRegistry.registerTool(tool, registeredTool.mcpServerUuid, registeredTool.serverName, {
                            isDeferred: false,
                            fullTool: tool,
                        });
                    }
                },
            ));
        }

        if (name === "get_tool_context") {
            const toolName = typeof args?.name === 'string' ? args.name : '';
            if (!toolName) {
                return {
                    content: [{ type: 'text', text: 'Tool context lookup requires a downstream tool name.' }],
                    isError: true,
                };
            }

            const service = getAgentMemoryService();
            const payload = service?.getToolContext?.({
                toolName,
                args: typeof args?.arguments === 'object' && args.arguments !== null ? args.arguments : undefined,
            }) ?? {
                toolName,
                query: toolName,
                matchedPaths: [],
                observationCount: 0,
                summaryCount: 0,
                prompt: `JIT tool context for ${toolName}:\nNo relevant prior memory was found.`,
            };

            return formatResult({
                content: [{ type: 'text', text: JSON.stringify(payload) }],
            });
        }

        if (name === "unload_tool") {
            return await executeUnloadToolCompatibility(args, toolWorkingSet);
        }

        if (name === "list_loaded_tools") {
            return formatResult(await executeListLoadedToolsCompatibility(toolWorkingSet));
        }

        if (name === "set_capacity") {
            // Clamp inputs to safe bounds before forwarding to the working-set service.
            const rawMax = typeof args?.maxLoadedTools === 'number' ? args.maxLoadedTools : undefined;
            const rawHydrated = typeof args?.maxHydratedSchemas === 'number' ? args.maxHydratedSchemas : undefined;
            const rawIdle = typeof args?.idleEvictionThresholdMs === 'number' ? args.idleEvictionThresholdMs : undefined;
            const maxLoadedTools = rawMax !== undefined ? Math.max(4, Math.min(64, Math.round(rawMax))) : undefined;
            const maxHydratedSchemas = rawHydrated !== undefined ? Math.max(2, Math.min(32, Math.round(rawHydrated))) : undefined;
            const idleEvictionThresholdMs = rawIdle !== undefined ? Math.max(10_000, Math.min(24 * 60 * 60 * 1000, Math.round(rawIdle))) : undefined;
            toolWorkingSet.reconfigure({ maxLoadedTools, maxHydratedSchemas, idleEvictionThresholdMs });
            const updated = toolWorkingSet.getLimits();
            return {
                content: [{
                    type: 'text',
                    text: `Working-set capacity updated: maxLoadedTools=${updated.maxLoadedTools}, maxHydratedSchemas=${updated.maxHydratedSchemas}, idleEvictionThresholdMs=${updated.idleEvictionThresholdMs}`,
                }],
            };
        }

        if (name === "get_eviction_history") {
            const history = toolWorkingSet.getEvictionHistory();
            return formatResult({
                content: [{ type: 'text', text: JSON.stringify(history) }],
            });
        }

        if (name === "clear_eviction_history") {
            const clearedCount = toolWorkingSet.getEvictionHistory().length;
            toolWorkingSet.clearEvictionHistory();
            return formatResult({
                content: [{
                    type: 'text',
                    text: `Cleared ${clearedCount} eviction history entr${clearedCount === 1 ? 'y' : 'ies'}.`,
                }],
            });
        }

        if (name === "save_script") {
            return await executeCompatibleSaveScript(args, {
                saveScript: async (script) => {
                    await savedScriptService.saveScript(script.name, script.code, script.description ?? undefined);
                },
            });
        }

        if (name === "run_python") {
            return await executeCompatibleRunPython(args, {
                execute: async (code) => await codeExecutorService.executeCode(code),
            });
        }

        if (name === "save_tool_set") {
            return await executeCompatibleSaveToolSet(args, toolWorkingSet, {
                saveToolSet: async (toolSet) => {
                    await toolSetService.createToolSet(
                        toolSet.name,
                        toolSet.tools,
                        toolSet.description ?? undefined,
                    );
                },
            });
        }

        if (name === "load_tool_set") {
            return await executeCompatibleLoadToolSet(
                args,
                {
                    hasTool: (toolName) => Boolean(toolToClient[toolName]),
                    loadToolIntoSession: (toolName) => {
                        const evicted = toolWorkingSet.loadTool(toolName);
                        return {
                            loaded: true,
                            evicted,
                        };
                    },
                },
                {
                    loadToolSets: async () => await toolSetService.listToolSets(),
                },
            );
        }

        if (name === "toolset_list") {
            return await executeCompatibleListToolSets({
                loadToolSets: async () => await toolSetService.listToolSets(),
            });
        }

        if (name === "import_mcp_config") {
            return await executeCompatibleImportConfig(args, configImportService, 'Config import service not available in MetaMCP proxy mode.');
        }

        if (name === "run_code") {
            return formatResult(await executeCompatibleRunCode(args, {
                execute: async ({ code }) => await codeExecutorService.executeCode(
                    code,
                    async (toolName: string, toolArgs: any) => {
                        if (toolName === "run_code" || toolName === "run_agent") {
                            throw new Error("Cannot call run_code/run_agent from within sandbox");
                        }
                        const res = await delegateHandler({
                            method: "tools/call",
                            params: {
                                name: toolName,
                                arguments: toolArgs,
                                _meta: meta
                            }
                        }, handlerContext);

                        return res;
                    }
                ),
            }, {
                formatError: (error) => {
                    const errorInfo = {
                        message: error instanceof Error ? error.message : String(error),
                        name: error instanceof Error ? error.name : "Error",
                        stack: error instanceof Error ? error.stack : undefined,
                    };
                    return {
                        content: [{
                            type: "text",
                            text: `Error: ${errorInfo.message}\nName: ${errorInfo.name}${errorInfo.stack ? `\nStack: ${errorInfo.stack}` : ""}`
                        }],
                        isError: true,
                    };
                },
            }));
        }

        if (name === "run_agent") {
            return formatResult(await executeCompatibleRunAgent(
                args,
                agentService,
                async (toolName, toolArgs, meta) => await delegateHandler({
                    method: "tools/call",
                    params: {
                        name: toolName,
                        arguments: toolArgs,
                        _meta: meta,
                    }
                }, handlerContext),
                'Agent runner not available in MetaMCP proxy mode.',
            ));
        }

        if (name === "auto_call_tool") {
            const mcp = getMcpServer();
            return formatResult(await executeSemanticAutoCall(
                args,
                mcp.llmService,
                (query, limit) => searchRegisteredTools(query, limit, {
                    isLoaded: (toolName) => toolWorkingSet.isLoaded(toolName),
                    isHydrated: (toolName) => toolWorkingSet.isHydrated(toolName),
                }),
                async (toolName, toolArgs, meta) => await delegateHandler({
                    method: "tools/call",
                    params: {
                        name: toolName,
                        arguments: toolArgs,
                        _meta: meta,
                    }
                }, handlerContext)
            ));
        }

        // 3. Memory Tools
        if (name === "save_memory") {
            const service = getAgentMemoryService();

            return await executeCompatibleSaveMemory(args, service, { source: 'tool_call', sessionId });
        }

        if (name === "search_memory") {
            const service = getAgentMemoryService();
            return formatResult(await executeCompatibleSearchMemory(args, service));
        }

        // 2. Saved Scripts execution
        const savedScriptResult = await executeSavedScriptTool(
            name,
            {
                loadScripts: savedScriptService.listScripts,
            },
            meta,
            async (toolName, toolArgs, delegatedMeta) => {
                const res = await delegateHandler({
                    method: "tools/call",
                    params: {
                        name: toolName,
                        arguments: toolArgs,
                        _meta: delegatedMeta,
                    }
                }, handlerContext);
                return res;
            },
        );

        if (savedScriptResult) {
            return formatResult(savedScriptResult);
        }


        // 3. Native Tools
        const nativeTool = nativeToolDefinitions.find(t => t.name === name);
        if (nativeTool) {
            try {
                // Call native handler
                // We wrap it in formatResult just in case, though usually native tools return standard results
                const res = await nativeToolHandler(name, args);
                return formatResult(res);
            } catch (nativeErr: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Native Tool Error: ${nativeErr.message}\nStack: ${nativeErr.stack}`
                    }],
                    isError: true
                };
            }
        }

        // 4. Downstream Tools
        const clientForTool = toolToClient[name];

        if (!clientForTool) {
            throw new Error(`Unknown tool: ${name}`);
        }

        const parsed = parseToolName(name);
        if (!parsed) throw new Error(`Invalid tool name: ${name}`);

        try {
            toolWorkingSet.touchTool(name);
            const abortController = new AbortController();
            const mcpRequestOptions: RequestOptions = {
                signal: abortController.signal,
                timeout: await configService.getMcpTimeout(),
            };

            const result = await clientForTool.client.request(
                {
                    method: "tools/call",
                    params: {
                        name: parsed.originalToolName,
                        arguments: args || {},
                        _meta: meta,
                    }
                },
                CompatibilityCallToolResultSchema,
                mcpRequestOptions
            );
            return formatResult(result as CallToolResult);
        } catch (error) {
            console.error(`Error calling ${name}:`, error);
            throw error;
        }
    };

    const implCallToolHandler: CallToolHandler = async (
        request,
        _context,
    ) => {
        const { name, arguments: args, _meta } = request.params;
        return await _internalCallToolImpl(name, args, _meta);
    };

    // Compose the middleware
    // The composed handler calls implCallToolHandler, which calls _internalCallToolImpl,
    // which might call delegateHandler, which calls recursiveCallToolHandlerRef (this composed stack).
    recursiveCallToolHandlerRef = compose(
        createLoggingMiddleware({ enabled: true }),
        createPolicyMiddleware({ enabled: true }), // Add Policy Middleware
        createFilterCallToolMiddleware({
            cacheEnabled: true,
            customErrorMessage: (toolName, reason) => `Access denied: ${reason}`,
        }),
        createToolOverridesCallToolMiddleware({ cacheEnabled: true }),
    )(implCallToolHandler);


    const listToolsWithMiddleware = compose(
        createToolOverridesListToolsMiddleware({
            cacheEnabled: true,
            persistentCacheOnListTools: true,
        }),
        createFilterListToolsMiddleware({ cacheEnabled: true }),
    )(originalListToolsHandler);


    // Set up the handlers
    server.setRequestHandler(ListToolsRequestSchema, async (request) => {
        return await listToolsWithMiddleware(request, handlerContext);
    });

    executeProxiedTool = async (name: string, args: any) => {
        if (!recursiveCallToolHandlerRef) throw new Error("Proxy Handler not initialized");
        return await recursiveCallToolHandlerRef({
            method: "tools/call",
            params: { name, arguments: args || {}, _meta: {} }
        } as any, handlerContext);
    };

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        if (!recursiveCallToolHandlerRef) throw new Error("Handler not initialized");
        return await recursiveCallToolHandlerRef(request, handlerContext);
    });

    if (registerDiscoveryHandlers) {
        server.setRequestHandler(GetPromptRequestSchema, async (request) => {
            return await getDownstreamPrompt({
                name: request.params.name,
                arguments: request.params.arguments || {},
                meta: request.params._meta,
                promptToClient,
            });
        });

        server.setRequestHandler(ListPromptsRequestSchema, async (request) => {
            return await listDownstreamPrompts({
                context: {
                    namespaceUuid,
                    sessionId,
                    includeInactiveServers,
                },
                cursor: request.params?.cursor,
                meta: request.params?._meta,
                promptToClient,
            });
        });

        server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
            return await listDownstreamResources({
                context: {
                    namespaceUuid,
                    sessionId,
                    includeInactiveServers,
                },
                cursor: request.params?.cursor,
                meta: request.params?._meta,
                resourceToClient,
            });
        });

        server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
            return await readDownstreamResource({
                uri: request.params.uri,
                meta: request.params._meta,
                resourceToClient,
            });
        });

        server.setRequestHandler(ListResourceTemplatesRequestSchema, async (request) => {
            return await listDownstreamResourceTemplates({
                context: {
                    namespaceUuid,
                    sessionId,
                    includeInactiveServers,
                },
                cursor: request.params?.cursor,
                meta: request.params?._meta,
            });
        });
    }

    const cleanup = async () => {
        // Cleanup is now handled by the pool
        await mcpServerPool.cleanupSession(sessionId);
    };

    return { cleanup };
};
