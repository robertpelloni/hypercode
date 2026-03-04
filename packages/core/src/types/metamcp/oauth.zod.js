"use strict";
/**
 * @file oauth.zod.ts
 * @module packages/core/src/types/metamcp/oauth.zod
 *
 * WHAT:
 * Zod definitions for the internal OAuth 2.0 Provider.
 *
 * WHY:
 * Validates all OAuth flows: Client Registration, Auth Codes, Access Tokens, and Session management.
 * Used when MetaMCP acts as an OAuth provider or consumer.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseOAuthSessionSchema = exports.OAuthSessionUpdateInputSchema = exports.OAuthSessionCreateInputSchema = exports.UpsertOAuthSessionResponseSchema = exports.UpsertOAuthSessionRequestSchema = exports.GetOAuthSessionResponseSchema = exports.GetOAuthSessionRequestSchema = exports.OAuthSessionSchema = exports.OAuthAccessTokenCreateInputSchema = exports.OAuthAuthorizationCodeCreateInputSchema = exports.OAuthClientCreateInputSchema = exports.OAuthAccessTokenSchema = exports.OAuthAuthorizationCodeSchema = exports.OAuthClientSchema = exports.OAuthTokensSchema = exports.OAuthClientInformationSchema = void 0;
var zod_1 = require("zod");
// OAuth Client Information schema (matching MCP SDK)
exports.OAuthClientInformationSchema = zod_1.z.object({
    client_id: zod_1.z.string(),
    client_secret: zod_1.z.string().optional(),
    client_id_issued_at: zod_1.z.number().optional(),
    client_secret_expires_at: zod_1.z.number().optional(),
});
// OAuth Tokens schema (matching MCP SDK)
exports.OAuthTokensSchema = zod_1.z.object({
    access_token: zod_1.z.string(),
    token_type: zod_1.z.string(),
    expires_in: zod_1.z.number().optional(),
    scope: zod_1.z.string().optional(),
    refresh_token: zod_1.z.string().optional(),
});
// OAuth Client schema for registered clients
exports.OAuthClientSchema = zod_1.z.object({
    client_id: zod_1.z.string(),
    client_secret: zod_1.z.string().nullable(),
    client_name: zod_1.z.string(),
    redirect_uris: zod_1.z.array(zod_1.z.string()),
    grant_types: zod_1.z.array(zod_1.z.string()),
    response_types: zod_1.z.array(zod_1.z.string()),
    token_endpoint_auth_method: zod_1.z.string(),
    scope: zod_1.z.string().nullable(),
    client_uri: zod_1.z.string().nullable(),
    logo_uri: zod_1.z.string().nullable(),
    contacts: zod_1.z.array(zod_1.z.string()).nullable(),
    tos_uri: zod_1.z.string().nullable(),
    policy_uri: zod_1.z.string().nullable(),
    software_id: zod_1.z.string().nullable(),
    software_version: zod_1.z.string().nullable(),
    created_at: zod_1.z.date(),
    updated_at: zod_1.z.date().optional(),
});
// OAuth Authorization Code schema
exports.OAuthAuthorizationCodeSchema = zod_1.z.object({
    code: zod_1.z.string(),
    client_id: zod_1.z.string(),
    redirect_uri: zod_1.z.string(),
    scope: zod_1.z.string(),
    user_id: zod_1.z.string(),
    code_challenge: zod_1.z.string().nullable(),
    code_challenge_method: zod_1.z.string().nullable(),
    expires_at: zod_1.z.date(),
    created_at: zod_1.z.date(),
});
// OAuth Access Token schema
exports.OAuthAccessTokenSchema = zod_1.z.object({
    access_token: zod_1.z.string(),
    client_id: zod_1.z.string(),
    user_id: zod_1.z.string(),
    scope: zod_1.z.string(),
    expires_at: zod_1.z.date(),
    created_at: zod_1.z.date(),
});
// Input schemas for repositories
exports.OAuthClientCreateInputSchema = zod_1.z.object({
    client_id: zod_1.z.string(),
    client_secret: zod_1.z.string().nullable(),
    client_name: zod_1.z.string(),
    redirect_uris: zod_1.z.array(zod_1.z.string()),
    grant_types: zod_1.z.array(zod_1.z.string()),
    response_types: zod_1.z.array(zod_1.z.string()),
    token_endpoint_auth_method: zod_1.z.string(),
    scope: zod_1.z.string().nullable(),
    client_uri: zod_1.z.string().nullable().optional(),
    logo_uri: zod_1.z.string().nullable().optional(),
    contacts: zod_1.z.array(zod_1.z.string()).nullable().optional(),
    tos_uri: zod_1.z.string().nullable().optional(),
    policy_uri: zod_1.z.string().nullable().optional(),
    software_id: zod_1.z.string().nullable().optional(),
    software_version: zod_1.z.string().nullable().optional(),
    created_at: zod_1.z.date(),
    updated_at: zod_1.z.date().optional(),
});
exports.OAuthAuthorizationCodeCreateInputSchema = zod_1.z.object({
    client_id: zod_1.z.string(),
    redirect_uri: zod_1.z.string(),
    scope: zod_1.z.string(),
    user_id: zod_1.z.string(),
    code_challenge: zod_1.z.string().nullable().optional(),
    code_challenge_method: zod_1.z.string().nullable().optional(),
    expires_at: zod_1.z.number(), // timestamp
});
exports.OAuthAccessTokenCreateInputSchema = zod_1.z.object({
    client_id: zod_1.z.string(),
    user_id: zod_1.z.string(),
    scope: zod_1.z.string(),
    expires_at: zod_1.z.number(), // timestamp
});
// Base OAuth Session schema - client_information can be nullable since DB has default {}
exports.OAuthSessionSchema = zod_1.z.object({
    uuid: zod_1.z.string().uuid(),
    mcp_server_uuid: zod_1.z.string().uuid(),
    client_information: exports.OAuthClientInformationSchema.nullable(),
    tokens: exports.OAuthTokensSchema.nullable(),
    code_verifier: zod_1.z.string().nullable(),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
// Get OAuth Session Request
exports.GetOAuthSessionRequestSchema = zod_1.z.object({
    mcp_server_uuid: zod_1.z.string().uuid(),
});
// Get OAuth Session Response
exports.GetOAuthSessionResponseSchema = zod_1.z.union([
    zod_1.z.object({
        success: zod_1.z.literal(true),
        data: exports.OAuthSessionSchema,
        message: zod_1.z.string(),
    }),
    zod_1.z.object({
        success: zod_1.z.literal(false),
        message: zod_1.z.string(),
    }),
]);
// Upsert OAuth Session Request - all fields optional for updates
exports.UpsertOAuthSessionRequestSchema = zod_1.z.object({
    mcp_server_uuid: zod_1.z.string().uuid(),
    client_information: exports.OAuthClientInformationSchema.optional(),
    tokens: exports.OAuthTokensSchema.nullable().optional(),
    code_verifier: zod_1.z.string().nullable().optional(),
});
// Upsert OAuth Session Response
exports.UpsertOAuthSessionResponseSchema = zod_1.z.union([
    zod_1.z.object({
        success: zod_1.z.literal(true),
        data: exports.OAuthSessionSchema,
        message: zod_1.z.string(),
    }),
    zod_1.z.object({
        success: zod_1.z.literal(false),
        error: zod_1.z.string(),
    }),
]);
// Repository-specific schemas
exports.OAuthSessionCreateInputSchema = zod_1.z.object({
    mcp_server_uuid: zod_1.z.string(),
    client_information: exports.OAuthClientInformationSchema.optional(),
    tokens: exports.OAuthTokensSchema.nullable().optional(),
    code_verifier: zod_1.z.string().nullable().optional(),
});
exports.OAuthSessionUpdateInputSchema = zod_1.z.object({
    mcp_server_uuid: zod_1.z.string(),
    client_information: exports.OAuthClientInformationSchema.optional(),
    tokens: exports.OAuthTokensSchema.nullable().optional(),
    code_verifier: zod_1.z.string().nullable().optional(),
});
// Database-specific schemas (raw database results with Date objects)
exports.DatabaseOAuthSessionSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
    mcp_server_uuid: zod_1.z.string(),
    client_information: exports.OAuthClientInformationSchema.nullable(),
    tokens: exports.OAuthTokensSchema.nullable(),
    code_verifier: zod_1.z.string().nullable(),
    created_at: zod_1.z.date(),
    updated_at: zod_1.z.date(),
});
