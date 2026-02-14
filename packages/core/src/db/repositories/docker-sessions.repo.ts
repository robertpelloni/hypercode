/**
 * @file docker-sessions.repo.ts
 * @module packages/core/src/db/repositories/docker-sessions.repo
 *
 * WHAT:
 * Repository for Docker Sessions.
 *
 * WHY:
 * Tracks running Docker containers for MCP servers created dynamically.
 */

// Schema definition for Create input (since not in Zod types explicitly yet? check imports)
// Assuming we match the table insert structure.
import { desc, eq } from "drizzle-orm";

import { db } from "../index";
import { dockerSessionsTable } from "../metamcp-schema";

export class DockerSessionsRepository {
    async create(input: {
        container_id: string;
        container_name: string;
        mcp_server_uuid: string;
        status: string; // "RUNNING"
    }) {
        const [createdSession] = await db
            .insert(dockerSessionsTable)
            .values(input)
            .returning();

        return createdSession;
    }

    async findByMcpServerUuid(mcpServerUuid: string) {
        const [session] = await db
            .select()
            .from(dockerSessionsTable)
            .where(eq(dockerSessionsTable.mcp_server_uuid, mcpServerUuid));

        return session;
    }

    async updateStatus(containerId: string, status: string) {
        const [updatedSession] = await db
            .update(dockerSessionsTable)
            .set({
                status: status,
                updated_at: new Date(),
            })
            .where(eq(dockerSessionsTable.container_id, containerId))
            .returning();

        return updatedSession;
    }

    async delete(uuid: string) {
        const [deletedSession] = await db
            .delete(dockerSessionsTable)
            .where(eq(dockerSessionsTable.uuid, uuid))
            .returning();

        return deletedSession;
    }
}

export const dockerSessionsRepository = new DockerSessionsRepository();
