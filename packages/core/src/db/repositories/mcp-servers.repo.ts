/**
 * @file mcp-servers.repo.ts
 * @module packages/core/src/db/repositories/mcp-servers.repo
 *
 * WHAT:
 * Repository for managing MCP Servers in the database.
 *
 * WHY:
 * Handles CRUD operations for MCP Servers, including user scoping and validation.
 *
 * HOW:
 * - Uses Drizzle ORM to query `mcpServersTable`.
 * - Handles PostgreSQL errors via `handleDatabaseError` (adapted for likely SQLite usage).
 * - Manages 'ACTIVE'/'INACTIVE' status.
 */

import {
    DatabaseMcpServer,
    McpServerCreateInput,
    McpServerErrorStatusEnum,
    McpServerUpdateInput,
} from "../../types/mcp-admin/index.js";
import { and, eq, isNull, or } from "drizzle-orm";
// import { DatabaseError } from "pg"; // Generic error handling preferred for dual-db support
import { z } from "zod";

import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioClient } from "../../mcp/StdioClient.js";
import {
    BorgMcpServerDiscoveryMetadata,
    BorgMcpJsonConfig,
    BorgMcpToolMetadata,
    loadBorgMcpConfig,
    writeBorgMcpConfig,
} from "../../mcp/mcpJsonConfig.js";
import {
    buildBaseServerMetadata,
    buildBinaryDiscoveryMetadata,
    buildFailureDiscoveryMetadata,
    hasReusableMetadataCache,
    hydrateMetadataFromCache,
    type MetadataReloadStrategy,
} from "../../mcp/serverMetadataCache.js";
import { toolsRepository } from "./tools.repo.js";


// Keep console-backed logger until centralized logger wiring is introduced in this package.
const logger = console;

import { db } from "../index.js";
import { mcpServersTable } from "../mcp-admin-schema.js";

type McpServerRow = typeof mcpServersTable.$inferSelect;
type McpServerInsert = typeof mcpServersTable.$inferInsert;

type DiscoveryResult = {
    metadata: BorgMcpServerDiscoveryMetadata;
    tools: BorgMcpToolMetadata[];
};

type MetadataResolutionOptions = {
    strategy?: MetadataReloadStrategy;
};

function normalizeErrorStatus(
    status: z.infer<typeof McpServerErrorStatusEnum>,
): McpServerInsert["error_status"] {
    // The shared Zod enum includes "ERROR" for legacy compatibility,
    // but the DB column only accepts concrete error categories.
    return status === "ERROR" ? "INTERNAL_ERROR" : status;
}

// Helper function to handle Database errors (PostgreSQL & SQLite)
function handleDatabaseError(
    error: unknown,
    operation: string,
    serverName?: string,
): never {
    logger.error(`Database error in ${operation}:`, error);

    // Simplified error handling for Phase 1
    // We can expand this to check for specific PG/SQLite codes later
    // e.g. SQLite "SQLITE_CONSTRAINT: UNIQUE constraint failed"

    const errString = String(error);

    if (errString.includes("UNIQUE constraint failed") || errString.includes("23505")) {
        throw new Error(
            `Server name "${serverName}" already exists. Server names must be unique within your scope.`,
        );
    }

    // Handle regex constraint (Check constraint in PG, might be trigger or app logic in SQLite)
    // We rely on Zod validation mostly, but DB constraints catch edge cases.

    // For any other database errors, throw a generic user-friendly message
    throw new Error(
        `Failed to ${operation} MCP server. Please check your input and try again.`,
    );
}

export class McpServersRepository {
    async create(input: McpServerCreateInput, options?: { skipSync?: boolean; skipDiscovery?: boolean; metadataStrategy?: MetadataReloadStrategy }): Promise<DatabaseMcpServer> {
        try {
            const payload: McpServerInsert = {
                uuid: randomUUID(),
                name: input.name,
                description: input.description ?? null,
                type: input.type,
                command: input.command ?? null,
                args: input.args ?? [],
                env: input.env ?? {},
                url: input.url ?? null,
                bearerToken: input.bearerToken ?? null,
                headers: input.headers ?? {},
                user_id: input.user_id ?? "system",
            };

            const [createdServer] = await db
                .insert(mcpServersTable)
                .values(payload)
                .returning();

            const discovery = await this.resolveDiscoveryResult(createdServer, {
                strategy: this.resolveMetadataStrategy(options),
            });

            if (discovery && this.shouldPersistDiscoveredTools(discovery.metadata)) {
                await this.persistDiscoveredTools(createdServer.uuid, discovery.tools);
            }

            if (!options?.skipSync) {
                await this.syncToMcpJson(discovery ? { [createdServer.name]: discovery.metadata } : {});
            }
            return createdServer;
        } catch (error) {
            handleDatabaseError(error, "create", input.name);
        }
    }

    async findAll(userId?: string): Promise<DatabaseMcpServer[]> {
        try {
            if (userId) {
                return await db
                    .select()
                    .from(mcpServersTable)
                    .where(eq(mcpServersTable.user_id, userId));
            }
            return await db.select().from(mcpServersTable);
        } catch (error) {
            handleDatabaseError(error, "findAll");
        }
    }

    async findPublicMcpServers(): Promise<DatabaseMcpServer[]> {
        try {
            return await db
                .select()
                .from(mcpServersTable)
                .where(isNull(mcpServersTable.user_id));
        } catch (error) {
            handleDatabaseError(error, "findPublicMcpServers");
        }
    }

    async findAccessibleToUser(userId: string): Promise<DatabaseMcpServer[]> {
        try {
            return await db
                .select()
                .from(mcpServersTable)
                .where(
                    or(
                        eq(mcpServersTable.user_id, userId),
                        isNull(mcpServersTable.user_id),
                    ),
                );
        } catch (error) {
            handleDatabaseError(error, "findAccessibleToUser");
        }
    }

    async findByUuid(uuid: string): Promise<DatabaseMcpServer | undefined> {
        try {
            const [server] = await db
                .select()
                .from(mcpServersTable)
                .where(eq(mcpServersTable.uuid, uuid));
            return server;
        } catch (error) {
            handleDatabaseError(error, "findByUuid");
        }
    }

    async findByName(name: string): Promise<DatabaseMcpServer | undefined> {
        try {
            const [server] = await db
                .select()
                .from(mcpServersTable)
                .where(eq(mcpServersTable.name, name));
            return server;
        } catch (error) {
            handleDatabaseError(error, "findByName");
        }
    }

    // Find server by name within user scope (for uniqueness checks)
    async findByNameAndUserId(
        name: string,
        userId: string | null,
    ): Promise<DatabaseMcpServer | undefined> {
        const [server] = await db
            .select() // .select() implicit returns all fields in Drizzle usually, but better to be safe
            .from(mcpServersTable)
            .where(
                and(
                    eq(mcpServersTable.name, name),
                    userId
                        ? eq(mcpServersTable.user_id, userId)
                        : isNull(mcpServersTable.user_id),
                ),
            )
            .limit(1);

        return server;
    }

    async findByUuidAndUser(
        uuid: string,
        userId: string,
    ): Promise<DatabaseMcpServer | undefined> {
        try {
            const [server] = await db
                .select()
                .from(mcpServersTable)
                .where(
                    and(
                        eq(mcpServersTable.uuid, uuid),
                        eq(mcpServersTable.user_id, userId),
                    ),
                );
            return server;
        } catch (error) {
            handleDatabaseError(error, "findByUuidAndUser");
        }
    }

    async deleteByUuid(uuid: string): Promise<DatabaseMcpServer | undefined> {
        const [deletedServer] = await db
            .delete(mcpServersTable)
            .where(eq(mcpServersTable.uuid, uuid))
            .returning();

        await this.syncToMcpJson();
        return deletedServer;
    }

    async update(input: McpServerUpdateInput, options?: { skipSync?: boolean; skipDiscovery?: boolean; metadataStrategy?: MetadataReloadStrategy }): Promise<DatabaseMcpServer> {
        try {
            const { uuid, user_id, ...updates } = input;
            const payload: Partial<McpServerInsert> = {
                ...updates,
                ...(user_id === undefined
                    ? {}
                    : { user_id: user_id ?? "system" }),
            };

            const [updatedServer] = await db
                .update(mcpServersTable)
                .set(payload)
                .where(eq(mcpServersTable.uuid, uuid))
                .returning();

            if (!updatedServer) {
                throw new Error(`MCP Server with UUID ${input.uuid} not found.`);
            }

            const discovery = await this.resolveDiscoveryResult(updatedServer, {
                strategy: this.resolveMetadataStrategy(options),
            });

            if (discovery && this.shouldPersistDiscoveredTools(discovery.metadata)) {
                await this.persistDiscoveredTools(updatedServer.uuid, discovery.tools);
            }

            if (!options?.skipSync) {
                await this.syncToMcpJson(discovery ? { [updatedServer.name]: discovery.metadata } : {});
            }
            return updatedServer;
        } catch (error) {
            handleDatabaseError(error, "update", input.name);
        }
    }

    async reloadMetadata(
        serverUuid: string,
        strategy: Exclude<MetadataReloadStrategy, 'skip'> = 'binary',
    ): Promise<{ server: DatabaseMcpServer; metadata: BorgMcpServerDiscoveryMetadata; toolCount: number }> {
        const server = await this.findByUuid(serverUuid);
        if (!server) {
            throw new Error(`MCP Server with UUID ${serverUuid} not found.`);
        }

        const discovery = await this.resolveDiscoveryResult(server, { strategy });
        if (!discovery) {
            throw new Error(`No metadata was produced for server ${server.name}.`);
        }

        if (this.shouldPersistDiscoveredTools(discovery.metadata)) {
            await this.persistDiscoveredTools(server.uuid, discovery.tools);
        }

        await this.syncToMcpJson({ [server.name]: discovery.metadata });

        return {
            server,
            metadata: discovery.metadata,
            toolCount: discovery.metadata.toolCount,
        };
    }

    async clearMetadataCache(
        serverUuid: string,
    ): Promise<{ server: DatabaseMcpServer; metadata: BorgMcpServerDiscoveryMetadata; toolCount: number }> {
        const server = await this.findByUuid(serverUuid);
        if (!server) {
            throw new Error(`MCP Server with UUID ${serverUuid} not found.`);
        }

        await toolsRepository.deleteObsoleteTools(server.uuid, []);

        const clearedAt = new Date().toISOString();
        const metadata: BorgMcpServerDiscoveryMetadata = {
            ...buildBaseServerMetadata(server),
            status: 'pending',
            metadataVersion: 2,
            metadataSource: 'derived',
            discoveredAt: undefined,
            lastAttemptedBinaryLoadAt: undefined,
            lastSuccessfulBinaryLoadAt: undefined,
            cacheHydratedAt: undefined,
            reloadableFromCache: false,
            toolCount: 0,
            tools: [],
            error: `Cache cleared at ${clearedAt}`,
        };

        await this.syncToMcpJson({ [server.name]: metadata });

        return {
            server,
            metadata,
            toolCount: 0,
        };
    }

    async updateErrorStatus(
        uuid: string,
        status: z.infer<typeof McpServerErrorStatusEnum>,
    ): Promise<void> {
        try {
            await db
                .update(mcpServersTable)
                .set({ error_status: normalizeErrorStatus(status) })
                .where(eq(mcpServersTable.uuid, uuid));
        } catch (error) {
            handleDatabaseError(error, "updateErrorStatus");
        }
    }

    async bulkCreate(
        servers: McpServerCreateInput[],
    ): Promise<DatabaseMcpServer[]> {
        try {
            const result: DatabaseMcpServer[] = [];
            for (const server of servers) {
                result.push(await this.create(server, { skipSync: true }));
            }
            await this.syncToMcpJson();
            return result;
        } catch (error: unknown) {
            // Simplified bulk error handling
            console.error("Database error in bulk create:", error);
            throw new Error(
                "Failed to bulk create MCP servers. Please check your input and try again.",
            );
        }
    }

    async updateServerErrorStatus(input: {
        serverUuid: string;
        errorStatus: z.infer<typeof McpServerErrorStatusEnum>;
    }): Promise<McpServerRow | undefined> {
        const [updatedServer] = await db
            .update(mcpServersTable)
            .set({
                error_status: normalizeErrorStatus(input.errorStatus),
            })
            .where(eq(mcpServersTable.uuid, input.serverUuid))
            .returning();

        // Note: We generally don't sync status updates to mcp.json as it's a configuration file
        return updatedServer;
    }

    public async syncToMcpJson(metadataOverrides: Record<string, BorgMcpServerDiscoveryMetadata> = {}): Promise<void> {
        try {
            const [allServers, allTools, existingConfig] = await Promise.all([
                this.findAll(),
                toolsRepository.findAll(),
                loadBorgMcpConfig(),
            ]);

            const jsonOutput: BorgMcpJsonConfig = {
                ...existingConfig,
                mcpServers: {},
            };

            const toolsByServerUuid = new Map<string, BorgMcpToolMetadata[]>();
            for (const tool of allTools) {
                const toolList = toolsByServerUuid.get(tool.mcp_server_uuid) ?? [];
                toolList.push({
                    name: tool.name,
                    description: tool.description,
                    inputSchema: {
                        properties: tool.toolSchema?.properties,
                        required: tool.toolSchema?.required,
                    },
                });
                toolsByServerUuid.set(tool.mcp_server_uuid, toolList);
            }

            for (const server of allServers) {
                // Skip if name is invalid or missing
                if (!server.name) continue;

                const config: any = {
                    command: server.command,
                    args: server.args,
                    env: server.env,
                };

                // Only include fields if they are relevant/present
                if (!config.command) delete config.command;
                if (!config.args || config.args.length === 0) delete config.args;
                if (!config.env || Object.keys(config.env).length === 0) delete config.env;

                // Handle different types if needed (e.g. SSE url)
                if (server.type !== 'STDIO' && server.url) {
                    config.url = server.url;
                }

                config.description = server.description;
                config.type = server.type;

                const existingServerConfig = existingConfig.mcpServers?.[server.name];
                const tools = toolsByServerUuid.get(server.uuid) ?? [];
                const overrideMetadata = metadataOverrides[server.name];
                const metadata = overrideMetadata ?? {
                    ...(existingServerConfig?._meta ?? {}),
                    ...buildBaseServerMetadata(server),
                    status: tools.length > 0
                        ? 'ready'
                        : existingServerConfig?._meta?.status ?? 'pending',
                    metadataVersion: existingServerConfig?._meta?.metadataVersion ?? 2,
                    metadataSource: existingServerConfig?._meta?.metadataSource ?? (tools.length > 0 ? 'derived' : undefined),
                    discoveredAt: existingServerConfig?._meta?.discoveredAt,
                    lastAttemptedBinaryLoadAt: existingServerConfig?._meta?.lastAttemptedBinaryLoadAt,
                    lastSuccessfulBinaryLoadAt: existingServerConfig?._meta?.lastSuccessfulBinaryLoadAt,
                    cacheHydratedAt: existingServerConfig?._meta?.cacheHydratedAt,
                    error: existingServerConfig?._meta?.error,
                    reloadableFromCache: existingServerConfig?._meta?.reloadableFromCache ?? tools.length > 0,
                    toolCount: tools.length,
                    tools,
                };

                if (overrideMetadata && overrideMetadata.tools.length === 0 && tools.length > 0) {
                    metadata.tools = tools;
                    metadata.toolCount = tools.length;
                }

                config._meta = metadata;

                // If specialized type, might iterate on schema
                // For now, mapping simplified 'stdio' style config
                jsonOutput.mcpServers[server.name] = config;
            }

            await writeBorgMcpConfig(jsonOutput);
        } catch (error) {
            console.error("Failed to sync mcp.jsonc:", error);
            // Don't throw, as DB operation succeeded
        }
    }

    private async persistDiscoveredTools(serverUuid: string, tools: BorgMcpToolMetadata[]): Promise<void> {
        await toolsRepository.syncTools({
            mcpServerUuid: serverUuid,
            tools: tools.map((tool) => ({
                name: tool.name,
                description: tool.description ?? undefined,
                inputSchema: tool.inputSchema && typeof tool.inputSchema === 'object'
                    ? {
                        properties: (tool.inputSchema as { properties?: Record<string, unknown> }).properties,
                        required: Array.isArray((tool.inputSchema as { required?: unknown[] }).required)
                            ? (tool.inputSchema as { required: unknown[] }).required.filter((value): value is string => typeof value === 'string')
                            : undefined,
                    }
                    : undefined,
            })),
        });
    }

    private resolveMetadataStrategy(options?: { skipDiscovery?: boolean; metadataStrategy?: MetadataReloadStrategy }): MetadataReloadStrategy {
        if (options?.metadataStrategy) {
            return options.metadataStrategy;
        }

        return options?.skipDiscovery ? 'skip' : 'auto';
    }

    private shouldPersistDiscoveredTools(metadata: BorgMcpServerDiscoveryMetadata): boolean {
        return metadata.status === 'ready';
    }

    private async resolveDiscoveryResult(
        server: DatabaseMcpServer,
        options?: MetadataResolutionOptions,
    ): Promise<DiscoveryResult | undefined> {
        const strategy = options?.strategy ?? 'auto';
        if (strategy === 'skip') {
            return undefined;
        }

        const config = await loadBorgMcpConfig();
        const cachedMetadata = config.mcpServers?.[server.name]?._meta;

        if (strategy === 'cache') {
            if (!cachedMetadata) {
                throw new Error(`No cached metadata exists yet for MCP server ${server.name}.`);
            }

            const hydratedMetadata = hydrateMetadataFromCache(cachedMetadata, server, new Date().toISOString());
            return {
                metadata: hydratedMetadata,
                tools: hydratedMetadata.tools,
            };
        }

        if (strategy === 'auto' && hasReusableMetadataCache(cachedMetadata, server)) {
            const hydratedMetadata = hydrateMetadataFromCache(cachedMetadata!, server, new Date().toISOString());
            return {
                metadata: hydratedMetadata,
                tools: hydratedMetadata.tools,
            };
        }

        return await this.discoverServerTools(server);
    }

    private async discoverServerTools(server: DatabaseMcpServer): Promise<DiscoveryResult> {
        const DISCOVERY_TIMEOUT_MS = 30_000;

        // Validate that the server has enough config to attempt discovery
        if (server.type === 'STDIO' || !server.type) {
            if (!server.command) {
                return {
                    metadata: buildFailureDiscoveryMetadata(
                        server,
                        'failed',
                        new Date().toISOString(),
                        'STDIO server is missing a command, so Borg could not discover tools.',
                    ),
                    tools: [],
                };
            }
        } else if (server.type === 'SSE' || server.type === 'STREAMABLE_HTTP') {
            if (!server.url) {
                return {
                    metadata: buildFailureDiscoveryMetadata(
                        server,
                        'failed',
                        new Date().toISOString(),
                        `${server.type} server is missing a URL, so Borg could not discover tools.`,
                    ),
                    tools: [],
                };
            }
        } else {
            return {
                metadata: buildFailureDiscoveryMetadata(
                    server,
                    'unsupported',
                    new Date().toISOString(),
                    `Discovery is not implemented for server type '${server.type}'.`,
                ),
                tools: [],
            };
        }

        // For STDIO servers, use the existing StdioClient which handles env merging
        if (server.type === 'STDIO' || !server.type) {
            const stdioClient = new StdioClient(server.name, {
                command: server.command!,
                args: server.args ?? [],
                env: server.env ?? {},
                enabled: true,
            });

            try {
                const connectPromise = (async () => {
                    await stdioClient.connect();
                    return await stdioClient.listTools({ throwOnError: true });
                })();

                const rawTools = await Promise.race([
                    connectPromise,
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error(`Discovery timed out after ${DISCOVERY_TIMEOUT_MS / 1000}s`)), DISCOVERY_TIMEOUT_MS),
                    ),
                ]);

                const discoveredAt = new Date().toISOString();
                const metadata = buildBinaryDiscoveryMetadata(server, rawTools, discoveredAt);

                return {
                    metadata,
                    tools: metadata.tools,
                };
            } catch (error) {
                return {
                    metadata: buildFailureDiscoveryMetadata(
                        server,
                        'failed',
                        new Date().toISOString(),
                        error instanceof Error ? error.message : String(error),
                    ),
                    tools: [],
                };
            } finally {
                await stdioClient.close().catch(() => undefined);
            }
        }

        // For SSE and STREAMABLE_HTTP servers, use the MCP SDK transports directly
        let client: Client | null = null;
        let transport: import("@modelcontextprotocol/sdk/shared/transport.js").Transport | null = null;

        try {
            const url = server.url!;

            // Build auth headers
            const headers: Record<string, string> = {};
            if (server.headers && typeof server.headers === 'object') {
                for (const [key, value] of Object.entries(server.headers)) {
                    if (typeof value === 'string') {
                        headers[key] = value;
                    }
                }
            }
            if (server.bearerToken) {
                headers['Authorization'] = `Bearer ${server.bearerToken}`;
            }

            const hasHeaders = Object.keys(headers).length > 0;

            if (server.type === 'SSE') {
                if (!hasHeaders) {
                    transport = new SSEClientTransport(new URL(url));
                } else {
                    transport = new SSEClientTransport(new URL(url), {
                        eventSourceInit: {
                            fetch: (
                                fetchUrl: Parameters<typeof fetch>[0],
                                init?: Parameters<typeof fetch>[1],
                            ) => {
                                const mergedHeaders: HeadersInit = {
                                    ...(init?.headers
                                        ? Object.fromEntries(new Headers(init.headers).entries())
                                        : {}),
                                    ...headers,
                                };
                                return fetch(fetchUrl, { ...init, headers: mergedHeaders });
                            },
                        },
                        requestInit: { headers },
                    });
                }
            } else {
                // STREAMABLE_HTTP
                transport = new StreamableHTTPClientTransport(new URL(url), {
                    requestInit: hasHeaders ? { headers } : undefined,
                });
            }

            client = new Client(
                { name: `borg-discovery-${server.name}`, version: '1.0.0' },
                { capabilities: {} },
            );

            const connectPromise = (async () => {
                await client!.connect(transport!);
                const result = await client!.listTools();
                return result.tools;
            })();

            const rawTools = await Promise.race([
                connectPromise,
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error(`Discovery timed out after ${DISCOVERY_TIMEOUT_MS / 1000}s`)), DISCOVERY_TIMEOUT_MS),
                ),
            ]);

            const discoveredAt = new Date().toISOString();
            const metadata = buildBinaryDiscoveryMetadata(server, rawTools, discoveredAt);

            return {
                metadata,
                tools: metadata.tools,
            };
        } catch (error) {
            return {
                metadata: buildFailureDiscoveryMetadata(
                    server,
                    'failed',
                    new Date().toISOString(),
                    error instanceof Error ? error.message : String(error),
                ),
                tools: [],
            };
        } finally {
            try {
                if (transport) await transport.close();
            } catch { /* ignore cleanup errors */ }
            try {
                if (client) await client.close();
            } catch { /* ignore cleanup errors */ }
        }
    }
}

export const mcpServersRepository = new McpServersRepository();
