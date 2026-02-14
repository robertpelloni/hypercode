/**
 * @file oauth.repo.ts
 * @module packages/core/src/db/repositories/oauth.repo
 *
 * WHAT:
 * Repository for OAuth Clients, Authorization Codes, and Access Tokens.
 *
 * WHY:
 * Manages the internal OAuth 2.0 provider state.
 *
 * HOW:
 * - Handles Client registration/retrieval.
 * - Manages Code and Token lifecycle.
 */

import {
    OAuthAccessToken,
    OAuthAccessTokenCreateInput,
    OAuthAuthorizationCode,
    OAuthAuthorizationCodeCreateInput,
    OAuthClient,
    OAuthClientCreateInput,
} from "../../types/metamcp";
import { and, desc, eq, lt } from "drizzle-orm";

import { db } from "../index";
import {
    oauthAccessTokensTable,
    oauthAuthorizationCodesTable,
    oauthClientsTable,
} from "../metamcp-schema";

export class OAuthRepository {
    // --- OAuth Clients ---

    async createClient(input: OAuthClientCreateInput): Promise<OAuthClient> {
        const [createdClient] = await db
            .insert(oauthClientsTable)
            .values({
                client_id: input.client_id,
                client_secret: input.client_secret,
                client_name: input.client_name,
                redirect_uris: input.redirect_uris,
                grant_types: input.grant_types,
                response_types: input.response_types,
                token_endpoint_auth_method: input.token_endpoint_auth_method,
                scope: input.scope,
                client_uri: input.client_uri,
                logo_uri: input.logo_uri,
                contacts: input.contacts,
                tos_uri: input.tos_uri,
                policy_uri: input.policy_uri,
                software_id: input.software_id,
                software_version: input.software_version,
            })
            .returning();

        return createdClient;
    }

    async findClientById(clientId: string): Promise<OAuthClient | undefined> {
        const [client] = await db
            .select()
            .from(oauthClientsTable)
            .where(eq(oauthClientsTable.client_id, clientId));

        return client;
    }

    // --- Authorization Codes ---

    async createAuthorizationCode(
        input: OAuthAuthorizationCodeCreateInput,
    ): Promise<OAuthAuthorizationCode> {
        // Generate code logic is handled by service; repo expects code string?
        // Wait, the input schema doesn't have 'code'. The schema in `metamcp-schema` has `code` as PK.
        // The `OAuthAuthorizationCodeCreateInput` from Zod types MIGHT be missing 'code' if it expects DB generation?
        // Checking `oauth.zod.ts`: `OAuthAuthorizationCodeCreateInputSchema` has: client_id, redirect_uri, scope, user_id, etc. NO code.
        // So we need to generate it here or pass it.
        // Let's assume we pass it or generate it.
        // Actually, `oauthAuthorizationCodesTable` has `code` as PK.
        // I should check `OAuthAuthorizationCodeCreateInputSchema` definition again.
        // It seems missing `code`. The service probably handles it.
        // I will add `code` to the input here manually or update Zod.
        // Let's add it to the params for now.

        throw new Error(
            "Method not fully implemented: Code generation required. Call with generated code.",
        );
    }

    // Implemented version expecting code to be passed (overloading the type essentially)
    async createAuthorizationCodeWithCode(
        code: string,
        input: OAuthAuthorizationCodeCreateInput,
    ): Promise<OAuthAuthorizationCode> {
        const [createdCode] = await db
            .insert(oauthAuthorizationCodesTable)
            .values({
                code: code,
                client_id: input.client_id,
                redirect_uri: input.redirect_uri,
                scope: input.scope,
                user_id: input.user_id,
                code_challenge: input.code_challenge,
                code_challenge_method: input.code_challenge_method,
                expires_at: new Date(input.expires_at), // Convert timestamp number to Date
            })
            .returning();

        return createdCode;
    }

    async findAuthorizationCode(
        code: string,
    ): Promise<OAuthAuthorizationCode | undefined> {
        const [authCode] = await db
            .select()
            .from(oauthAuthorizationCodesTable)
            .where(eq(oauthAuthorizationCodesTable.code, code));

        return authCode;
    }

    async deleteAuthorizationCode(
        code: string,
    ): Promise<OAuthAuthorizationCode | undefined> {
        const [deletedCode] = await db
            .delete(oauthAuthorizationCodesTable)
            .where(eq(oauthAuthorizationCodesTable.code, code))
            .returning();

        return deletedCode;
    }

    async deleteExpiredAuthorizationCodes(): Promise<void> {
        await db
            .delete(oauthAuthorizationCodesTable)
            .where(lt(oauthAuthorizationCodesTable.expires_at, new Date()));
    }

    // --- Access Tokens ---

    // Similar issue: input doesn't have token string.
    async createAccessTokenWithToken(
        accessToken: string,
        input: OAuthAccessTokenCreateInput,
    ): Promise<OAuthAccessToken> {
        const [createdToken] = await db
            .insert(oauthAccessTokensTable)
            .values({
                access_token: accessToken,
                client_id: input.client_id,
                user_id: input.user_id,
                scope: input.scope,
                expires_at: new Date(input.expires_at),
            })
            .returning();

        return createdToken;
    }

    async findAccessToken(
        accessToken: string,
    ): Promise<OAuthAccessToken | undefined> {
        const [token] = await db
            .select()
            .from(oauthAccessTokensTable)
            .where(eq(oauthAccessTokensTable.access_token, accessToken));

        return token;
    }

    async deleteExpiredAccessTokens(): Promise<void> {
        await db
            .delete(oauthAccessTokensTable)
            .where(lt(oauthAccessTokensTable.expires_at, new Date()));
    }
}

export const oauthRepository = new OAuthRepository();
