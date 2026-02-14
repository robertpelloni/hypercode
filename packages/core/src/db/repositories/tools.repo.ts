/**
 * @file tools.repo.ts
 * @module packages/core/src/db/repositories/tools.repo
 *
 * WHAT:
 * Repository for managing MCP Tools.
 *
 * WHY:
 * Handles CRUD operations for Tools discovered from servers.
 * Supports bulk upserting tools during server synchronization.
 *
 * HOW:
 * - Upserts tools using `onConflictDoUpdate`.
 * - Handles bulk deletions of obsolete tools.
 * - [TODO] Integrates with AI Description Enhancer (stubbed for now).
 */

import {
    DatabaseTool,
    ToolCreateInput,
    ToolUpsertInput,
} from "../../types/metamcp";
import { and, eq, notInArray, sql } from "drizzle-orm";

// TODO: Port and enable AI services in Phase 3
// import { descriptionEnhancerService } from "../../lib/ai/description-enhancer.service";
// import { toolSearchService } from "../../lib/ai/tool-search.service";

import { db } from "../index";
import { toolsTable } from "../metamcp-schema";

export class ToolsRepository {
    async findByMcpServerUuid(mcpServerUuid: string): Promise<DatabaseTool[]> {
        return await db
            .select()
            .from(toolsTable)
            .where(eq(toolsTable.mcp_server_uuid, mcpServerUuid))
            .orderBy(toolsTable.name);
    }

    async findAll(): Promise<DatabaseTool[]> {
        return await db.select().from(toolsTable).orderBy(toolsTable.name);
    }

    async create(input: ToolCreateInput): Promise<DatabaseTool> {
        const [createdTool] = await db.insert(toolsTable).values(input).returning();

        return createdTool;
    }

    async bulkUpsert(input: ToolUpsertInput): Promise<DatabaseTool[]> {
        if (!input.tools || input.tools.length === 0) {
            return [];
        }

        // Format tools for database insertion
        const toolsToInsert = input.tools.map((tool) => ({
            name: tool.name,
            description: tool.description || "",
            // Cast to any to satisfy type checker if needed, but schema matches
            toolSchema: {
                type: "object" as const,
                ...tool.inputSchema,
            },
            mcp_server_uuid: input.mcpServerUuid,
        }));

        // Batch insert all tools with upsert
        // Note: Drizzle's `returning` behavior depends on the driver. better-sqlite3 supports it.
        const results = await db
            .insert(toolsTable)
            .values(toolsToInsert)
            .onConflictDoUpdate({
                target: [toolsTable.mcp_server_uuid, toolsTable.name],
                set: {
                    description: sql`excluded.description`,
                    toolSchema: sql`excluded.tool_schema`,
                    updated_at: new Date(),
                },
            })
            .returning();

        // TODO: Enable AI background tasks in Phase 3
        /*
        // Async update embeddings and enhance descriptions for all upserted tools
        // We do this in the background to not block the request
        Promise.allSettled(
          results.map(async (tool) => {
            try {
              // 1. Enhance description (Optional, needs API Key)
              await descriptionEnhancerService.enhanceToolDescription({
                uuid: tool.uuid,
                name: tool.name,
                description: tool.description,
                toolSchema: tool.toolSchema,
              });
    
              // 2. Update embedding (Will use enhanced description if available, or fall back to original)
              // We might need to wait for step 1 to finish so the DB has the new description
              await toolSearchService.updateToolEmbedding(tool.uuid);
            } catch (err) {
              console.error(
                `Failed to process background tasks for tool ${tool.name} (${tool.uuid}):`,
                err,
              );
            }
          }),
        );
        */

        return results;
    }

    async findByUuid(uuid: string): Promise<DatabaseTool | undefined> {
        const [tool] = await db
            .select()
            .from(toolsTable)
            .where(eq(toolsTable.uuid, uuid))
            .limit(1);

        return tool;
    }

    async deleteByUuid(uuid: string): Promise<DatabaseTool | undefined> {
        const [deletedTool] = await db
            .delete(toolsTable)
            .where(eq(toolsTable.uuid, uuid))
            .returning();

        return deletedTool;
    }

    /**
     * Delete tools that are no longer present in the current tool list
     * @param mcpServerUuid - UUID of the MCP server
     * @param currentToolNames - Array of tool names that currently exist in the MCP server
     * @returns Array of deleted tools
     */
    async deleteObsoleteTools(
        mcpServerUuid: string,
        currentToolNames: string[],
    ): Promise<DatabaseTool[]> {
        if (currentToolNames.length === 0) {
            // If no tools are provided, delete all tools for this server
            return await db
                .delete(toolsTable)
                .where(eq(toolsTable.mcp_server_uuid, mcpServerUuid))
                .returning();
        }

        // Delete tools that are in DB but not in current tool list
        return await db
            .delete(toolsTable)
            .where(
                and(
                    eq(toolsTable.mcp_server_uuid, mcpServerUuid),
                    notInArray(toolsTable.name, currentToolNames),
                ),
            )
            .returning();
    }

    /**
     * Sync tools for a server: upsert current tools and delete obsolete ones
     * @param input - Tool upsert input containing tools and server UUID
     * @returns Object with upserted and deleted tools
     */
    async syncTools(input: ToolUpsertInput): Promise<{
        upserted: DatabaseTool[];
        deleted: DatabaseTool[];
    }> {
        const currentToolNames = input.tools.map((tool) => tool.name);

        // First, delete obsolete tools
        const deleted = await this.deleteObsoleteTools(
            input.mcpServerUuid,
            currentToolNames,
        );

        // Then, upsert current tools
        let upserted: DatabaseTool[] = [];
        if (input.tools.length > 0) {
            upserted = await this.bulkUpsert(input);
        }

        return { upserted, deleted };
    }
}

export const toolsRepository = new ToolsRepository();
