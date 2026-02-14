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
} from "../../types/metamcp";
import { and, desc, eq, isNull, or } from "drizzle-orm";
// import { DatabaseError } from "pg"; // Generic error handling preferred for dual-db support
import { z } from "zod";

// import logger from "@/utils/logger"; // TODO: Port logger or use console
const logger = console;

import { db } from "../index";
import { mcpServersTable } from "../metamcp-schema";

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
    async create(input: McpServerCreateInput): Promise<DatabaseMcpServer> {
        try {
            const [createdServer] = await db
                .insert(mcpServersTable)
                .values(input)
                .returning();

            return createdServer;
        } catch (error: unknown) {
            handleDatabaseError(error, "create", input.name);
        }
    }

    async findAll(): Promise<DatabaseMcpServer[]> {
        return await db
            .select()
            .from(mcpServersTable)
            .orderBy(desc(mcpServersTable.created_at));
    }

    // Find servers accessible to a specific user (public + user's own servers)
    async findAllAccessibleToUser(userId: string): Promise<DatabaseMcpServer[]> {
        return await db
            .select()
            .from(mcpServersTable)
            .where(
                or(
                    isNull(mcpServersTable.user_id), // Public servers
                    eq(mcpServersTable.user_id, userId), // User's own servers
                ),
            )
            .orderBy(desc(mcpServersTable.created_at));
    }

    // Find only public servers (no user ownership)
    async findPublicServers(): Promise<DatabaseMcpServer[]> {
        return await db
            .select()
            .from(mcpServersTable)
            .where(isNull(mcpServersTable.user_id))
            .orderBy(desc(mcpServersTable.created_at));
    }

    // Find servers owned by a specific user
    async findByUserId(userId: string): Promise<DatabaseMcpServer[]> {
        return await db
            .select()
            .from(mcpServersTable)
            .where(eq(mcpServersTable.user_id, userId))
            .orderBy(desc(mcpServersTable.created_at));
    }

    async findByUuid(uuid: string): Promise<DatabaseMcpServer | undefined> {
        const [server] = await db
            .select()
            .from(mcpServersTable)
            .where(eq(mcpServersTable.uuid, uuid))
            .limit(1);

        return server;
    }

    async findByName(name: string): Promise<DatabaseMcpServer | undefined> {
        const [server] = await db
            .select()
            .from(mcpServersTable)
            .where(eq(mcpServersTable.name, name))
            .limit(1);

        return server;
    }

    // Find server by name within user scope (for uniqueness checks)
    async findByNameAndUserId(
        name: string,
        userId: string | null,
    ): Promise<DatabaseMcpServer | undefined> {
        const [server] = await db
            .select()
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

    async deleteByUuid(uuid: string): Promise<DatabaseMcpServer | undefined> {
        const [deletedServer] = await db
            .delete(mcpServersTable)
            .where(eq(mcpServersTable.uuid, uuid))
            .returning();

        return deletedServer;
    }

    async update(
        input: McpServerUpdateInput,
    ): Promise<DatabaseMcpServer | undefined> {
        const { uuid, ...updateData } = input;

        // Filter out undefined values to avoid updating with null/undefined unless intended
        // Drizzle might handle this, but explicit is safer
        // Type casting logic:
        // We need to match the partial update structure.

        try {
            const [updatedServer] = await db
                .update(mcpServersTable)
                .set(updateData)
                .where(eq(mcpServersTable.uuid, uuid))
                .returning();

            return updatedServer;
        } catch (error: unknown) {
            handleDatabaseError(error, "update", input.name ?? "unknown");
        }
    }

    async bulkCreate(
        servers: McpServerCreateInput[],
    ): Promise<DatabaseMcpServer[]> {
        try {
            return await db.insert(mcpServersTable).values(servers).returning();
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
    }) {
        const [updatedServer] = await db
            .update(mcpServersTable)
            .set({
                error_status: input.errorStatus,
            })
            .where(eq(mcpServersTable.uuid, input.serverUuid))
            .returning();

        return updatedServer;
    }
}

export const mcpServersRepository = new McpServersRepository();
