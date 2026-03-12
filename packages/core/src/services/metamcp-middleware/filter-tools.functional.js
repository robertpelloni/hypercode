import { and, eq } from "drizzle-orm";

import { getAllowedToolsMetadataGuardResult } from "../../mcp/toolAccessGuards.js";
import { parseToolName } from "../tool-name-parser.service.js";

let dbBindingsPromise = null;

async function loadDbBindings() {
    if (!dbBindingsPromise) {
        dbBindingsPromise = Promise.all([
            import("../../db/index.js"),
            import("../../db/schema.js"),
        ]).then(([dbModule, schemaModule]) => ({
            db: dbModule.db,
            mcpServersTable: schemaModule.mcpServersTable,
            namespaceToolMappingsTable: schemaModule.namespaceToolMappingsTable,
            toolsTable: schemaModule.toolsTable,
        }));
    }

    return await dbBindingsPromise;
}

class ToolStatusCache {
    constructor(ttl = 1000) {
        this.cache = new Map();
        this.expiry = new Map();
        this.ttl = ttl;
    }

    getCacheKey(namespaceUuid, toolName, serverUuid) {
        return `${namespaceUuid}:${serverUuid}:${toolName}`;
    }

    get(namespaceUuid, toolName, serverUuid) {
        const key = this.getCacheKey(namespaceUuid, toolName, serverUuid);
        const expiry = this.expiry.get(key);

        if (!expiry || Date.now() > expiry) {
            this.cache.delete(key);
            this.expiry.delete(key);
            return null;
        }

        return this.cache.get(key) || null;
    }

    set(namespaceUuid, toolName, serverUuid, status) {
        const key = this.getCacheKey(namespaceUuid, toolName, serverUuid);
        this.cache.set(key, status);
        this.expiry.set(key, Date.now() + this.ttl);
    }

    clear(namespaceUuid) {
        if (namespaceUuid) {
            for (const key of this.cache.keys()) {
                if (key.startsWith(`${namespaceUuid}:`)) {
                    this.cache.delete(key);
                    this.expiry.delete(key);
                }
            }
        } else {
            this.cache.clear();
            this.expiry.clear();
        }
    }
}

const toolStatusCache = new ToolStatusCache();

async function getToolStatus(namespaceUuid, toolName, serverUuid, useCache = true) {
    if (useCache) {
        const cached = toolStatusCache.get(namespaceUuid, toolName, serverUuid);
        if (cached !== null) {
            return cached;
        }
    }

    try {
        const {
            db,
            namespaceToolMappingsTable,
            toolsTable,
        } = await loadDbBindings();

        const [toolMapping] = await db
            .select({
                status: namespaceToolMappingsTable.status,
            })
            .from(namespaceToolMappingsTable)
            .innerJoin(
                toolsTable,
                eq(toolsTable.uuid, namespaceToolMappingsTable.tool_uuid),
            )
            .where(
                and(
                    eq(namespaceToolMappingsTable.namespace_uuid, namespaceUuid),
                    eq(toolsTable.name, toolName),
                    eq(namespaceToolMappingsTable.mcp_server_uuid, serverUuid),
                ),
            );

        const status = toolMapping?.status || null;

        if (status && useCache) {
            toolStatusCache.set(namespaceUuid, toolName, serverUuid, status);
        }

        return status;
    } catch (error) {
        console.error(
            `Error fetching tool status for ${toolName} in namespace ${namespaceUuid}:`,
            error,
        );
        return null;
    }
}

async function getServerUuidByName(serverName) {
    try {
        const { db, mcpServersTable } = await loadDbBindings();

        const [server] = await db
            .select({ uuid: mcpServersTable.uuid })
            .from(mcpServersTable)
            .where(eq(mcpServersTable.name, serverName));

        return server?.uuid || null;
    } catch (error) {
        console.error(`Error fetching server UUID for ${serverName}:`, error);
        return null;
    }
}

async function filterActiveTools(tools, namespaceUuid, useCache = true) {
    if (!tools || tools.length === 0) {
        return tools;
    }

    const activeTools = [];

    await Promise.allSettled(
        tools.map(async (tool) => {
            try {
                const parsed = parseToolName(tool.name);
                if (!parsed) {
                    activeTools.push(tool);
                    return;
                }

                const serverUuid = await getServerUuidByName(parsed.serverName);
                if (!serverUuid) {
                    activeTools.push(tool);
                    return;
                }

                const status = await getToolStatus(
                    namespaceUuid,
                    parsed.originalToolName,
                    serverUuid,
                    useCache,
                );

                if (status === null || status === "ACTIVE") {
                    activeTools.push(tool);
                }
            } catch (error) {
                console.error(`Error checking tool status for ${tool.name}:`, error);
                activeTools.push(tool);
            }
        }),
    );

    return activeTools;
}

async function isToolAllowed(toolName, namespaceUuid, serverUuid, useCache = true) {
    try {
        const parsed = parseToolName(toolName);
        if (!parsed) {
            return { allowed: true };
        }

        const status = await getToolStatus(
            namespaceUuid,
            parsed.originalToolName,
            serverUuid,
            useCache,
        );

        if (status === null || status === "ACTIVE") {
            return { allowed: true };
        }

        return {
            allowed: false,
            reason: "Tool has been marked as inactive in this namespace",
        };
    } catch (error) {
        console.error(
            `Error checking if tool ${toolName} is allowed in namespace ${namespaceUuid}:`,
            error,
        );
        return { allowed: true };
    }
}

export function createFilterListToolsMiddleware(config = {}) {
    const useCache = config.cacheEnabled ?? true;

    return (handler) => {
        return async (request, context) => {
            const response = await handler(request, context);

            if (response.tools) {
                const filteredTools = await filterActiveTools(
                    response.tools,
                    context.namespaceUuid,
                    useCache,
                );

                return {
                    ...response,
                    tools: filteredTools,
                };
            }

            return response;
        };
    };
}

export function createFilterCallToolMiddleware(config = {}) {
    const useCache = config.cacheEnabled ?? true;
    const customErrorMessage =
        config.customErrorMessage ??
        ((toolName, reason) =>
            `Tool "${toolName}" is currently inactive and disallowed in this namespace: ${reason}`);

    return (handler) => {
        return async (request, context) => {
            const toolName = request.params.name;
            const paramsWithMeta = request.params;

            const metadataGuardResult = getAllowedToolsMetadataGuardResult(
                toolName,
                paramsWithMeta._meta,
            );
            if (metadataGuardResult) {
                return metadataGuardResult;
            }

            const parsed = parseToolName(toolName);
            if (parsed) {
                const serverUuid = await getServerUuidByName(parsed.serverName);
                if (serverUuid) {
                    const { allowed, reason } = await isToolAllowed(
                        toolName,
                        context.namespaceUuid,
                        serverUuid,
                        useCache,
                    );

                    if (!allowed) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: customErrorMessage(
                                        toolName,
                                        reason || "Unknown reason",
                                    ),
                                },
                            ],
                            isError: true,
                        };
                    }
                }
            }

            return handler(request, context);
        };
    };
}

export function clearFilterCache(namespaceUuid) {
    toolStatusCache.clear(namespaceUuid);
}
