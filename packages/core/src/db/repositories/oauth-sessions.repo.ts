/**
 * @file oauth-sessions.repo.ts
 * @module packages/core/src/db/repositories/oauth-sessions.repo
 *
 * WHAT:
 * Repository for OAuth Sessions (User-Server connection state).
 *
 * WHY:
 * Manages the state of a user's OAuth connection to an external MCP Server (e.g. Google Drive).
 * Stores tokens securely (encrypted at rest ideally, but here just storage).
 */

import {
    OAuthSessionCreateInput,
    OAuthSessionUpdateInput,
} from "../../types/metamcp";
import { desc, eq } from "drizzle-orm";

import { db } from "../index";
import { oauthSessionsTable } from "../metamcp-schema";

export class OAuthSessionsRepository {
    async upsert(input: OAuthSessionCreateInput) {
        // Check if session exists
        const [existingSession] = await db
            .select()
            .from(oauthSessionsTable)
            .where(eq(oauthSessionsTable.mcp_server_uuid, input.mcp_server_uuid));

        if (existingSession) {
            // Update
            const [updatedSession] = await db
                .update(oauthSessionsTable)
                .set({
                    // Merge input fields, keep existing if undefined in input (partial update logic handled by service usually, but here strict)
                    client_information:
                        input.client_information ?? existingSession.client_information,
                    tokens: input.tokens ?? existingSession.tokens,
                    code_verifier: input.code_verifier ?? existingSession.code_verifier,
                    updated_at: new Date(),
                })
                .where(eq(oauthSessionsTable.uuid, existingSession.uuid))
                .returning();

            return updatedSession;
        } else {
            // Create
            const [createdSession] = await db
                .insert(oauthSessionsTable)
                .values({
                    mcp_server_uuid: input.mcp_server_uuid,
                    client_information: input.client_information,
                    tokens: input.tokens,
                    code_verifier: input.code_verifier,
                })
                .returning();

            return createdSession;
        }
    }

    async findByMcpServerUuid(mcpServerUuid: string) {
        const [session] = await db
            .select()
            .from(oauthSessionsTable)
            .where(eq(oauthSessionsTable.mcp_server_uuid, mcpServerUuid));

        return session;
    }

    // Find all sessions (maintenance/admin)
    async findAll() {
        return await db
            .select()
            .from(oauthSessionsTable)
            .orderBy(desc(oauthSessionsTable.updated_at));
    }

    async delete(uuid: string) {
        const [deletedSession] = await db
            .delete(oauthSessionsTable)
            .where(eq(oauthSessionsTable.uuid, uuid))
            .returning();

        return deletedSession;
    }
}

export const oauthSessionsRepository = new OAuthSessionsRepository();
