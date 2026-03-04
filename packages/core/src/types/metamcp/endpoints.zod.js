"use strict";
/**
 * @file endpoints.zod.ts
 * @module packages/core/src/types/metamcp/endpoints.zod
 *
 * WHAT:
 * Zod definitions for Routing Endpoints (exposing namespaces via HTTP/SSE).
 *
 * WHY:
 * Defines configuration for API Gateway-like features: API Key Auth, Rate Limiting, OAuth, and Origin restrictions.
 * Validates endpoint creation forms and maps DB results.
 *
 * HOW:
 * - Extends `NamespaceSchema`.
 * - Validates numeric fields for rate limits.
 * - Handles optional auth toggles.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseEndpointWithNamespaceSchema = exports.DatabaseEndpointSchema = exports.EndpointUpdateInputSchema = exports.EndpointCreateInputSchema = exports.DeleteEndpointResponseSchema = exports.DeleteEndpointRequestSchema = exports.UpdateEndpointResponseSchema = exports.UpdateEndpointRequestSchema = exports.GetEndpointResponseSchema = exports.ListEndpointsResponseSchema = exports.CreateEndpointResponseSchema = exports.EndpointWithNamespaceSchema = exports.EndpointSchema = exports.CreateEndpointRequestSchema = exports.editEndpointFormSchema = exports.createEndpointFormSchema = void 0;
var zod_1 = require("zod");
var namespaces_zod_js_1 = require("./namespaces.zod.js");
// Endpoint schema definitions
exports.createEndpointFormSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1, "validation:endpointName.required")
        .regex(/^[a-zA-Z0-9_-]+$/, "validation:endpointName.urlCompatible"),
    description: zod_1.z.string().optional(),
    namespaceUuid: zod_1.z.string().uuid("Please select a valid namespace"),
    enableApiKeyAuth: zod_1.z.boolean(),
    enableClientMaxRate: zod_1.z.boolean(),
    enableMaxRate: zod_1.z.boolean(),
    maxRateSeconds: zod_1.z.number().min(1, "validation:maxRateSeconds").optional(),
    maxRate: zod_1.z.number().min(1, "validation:maxRate").optional(),
    clientMaxRate: zod_1.z.number().min(1, "validation:clientMaxRate").optional(),
    clientMaxRateSeconds: zod_1.z
        .number()
        .min(1, "validation:clientMaxRateSeconds")
        .optional(),
    clientMaxRateStrategy: zod_1.z.string().optional(),
    clientMaxRateStrategyKey: zod_1.z.string().optional(),
    enableOauth: zod_1.z.boolean(),
    useQueryParamAuth: zod_1.z.boolean(),
    createMcpServer: zod_1.z.boolean(),
    user_id: zod_1.z.string().nullable().optional(),
});
exports.editEndpointFormSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1, "validation:endpointName.required")
        .regex(/^[a-zA-Z0-9_-]+$/, "validation:endpointName.urlCompatible"),
    description: zod_1.z.string().optional(),
    namespaceUuid: zod_1.z.string().uuid("Please select a valid namespace"),
    enableApiKeyAuth: zod_1.z.boolean().optional(),
    enableClientMaxRate: zod_1.z.boolean(),
    enableMaxRate: zod_1.z.boolean(),
    maxRateSeconds: zod_1.z.number().min(1, "validation:maxRateSeconds").optional(),
    maxRate: zod_1.z.number().min(1, "validation:maxRate").optional(),
    clientMaxRate: zod_1.z.number().min(1, "validation:clientMaxRate").optional(),
    clientMaxRateSeconds: zod_1.z
        .number()
        .min(1, "validation:clientMaxRateSeconds")
        .optional(),
    clientMaxRateStrategy: zod_1.z.string().optional(),
    clientMaxRateStrategyKey: zod_1.z.string().optional(),
    enableOauth: zod_1.z.boolean().optional(),
    useQueryParamAuth: zod_1.z.boolean().optional(),
    user_id: zod_1.z.string().nullable().optional(),
});
exports.CreateEndpointRequestSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1, "validation:endpointName.required")
        .regex(/^[a-zA-Z0-9_-]+$/, "validation:endpointName.urlCompatible"),
    description: zod_1.z.string().optional(),
    namespaceUuid: zod_1.z.string().uuid(),
    enableApiKeyAuth: zod_1.z.boolean().default(true),
    enableClientMaxRate: zod_1.z.boolean(),
    enableMaxRate: zod_1.z.boolean(),
    maxRateSeconds: zod_1.z.number().min(1, "validation:maxRateSeconds").optional(),
    maxRate: zod_1.z.number().min(1, "validation:maxRate").optional(),
    clientMaxRate: zod_1.z.number().min(1, "validation:clientMaxRate").optional(),
    clientMaxRateSeconds: zod_1.z
        .number()
        .min(1, "validation:clientMaxRateSeconds")
        .optional(),
    clientMaxRateStrategy: zod_1.z.string().optional(),
    clientMaxRateStrategyKey: zod_1.z.string().optional(),
    enableOauth: zod_1.z.boolean().default(false),
    useQueryParamAuth: zod_1.z.boolean().default(false),
    createMcpServer: zod_1.z.boolean().default(true),
    user_id: zod_1.z.string().nullable().optional(),
    origin: zod_1.z.string().url().optional(),
});
exports.EndpointSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    namespace_uuid: zod_1.z.string(),
    enable_api_key_auth: zod_1.z.boolean(),
    enableClientMaxRate: zod_1.z.boolean(),
    enableMaxRate: zod_1.z.boolean(),
    maxRateSeconds: zod_1.z.number().min(1, "validation:maxRateSeconds").optional(),
    maxRate: zod_1.z.number().min(1, "validation:maxRate").optional(),
    clientMaxRate: zod_1.z.number().min(1, "validation:clientMaxRate").optional(),
    clientMaxRateSeconds: zod_1.z
        .number()
        .min(1, "validation:clientMaxRateSeconds")
        .optional(),
    clientMaxRateStrategy: zod_1.z.string().optional(),
    clientMaxRateStrategyKey: zod_1.z.string().optional(),
    enable_oauth: zod_1.z.boolean(),
    use_query_param_auth: zod_1.z.boolean(),
    created_at: zod_1.z.string(),
    updated_at: zod_1.z.string(),
    user_id: zod_1.z.string().nullable(),
});
// Extended endpoint schema with namespace details
exports.EndpointWithNamespaceSchema = exports.EndpointSchema.extend({
    namespace: namespaces_zod_js_1.NamespaceSchema,
});
exports.CreateEndpointResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: exports.EndpointSchema.optional(),
    message: zod_1.z.string().optional(),
});
exports.ListEndpointsResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.array(exports.EndpointWithNamespaceSchema),
    message: zod_1.z.string().optional(),
});
exports.GetEndpointResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: exports.EndpointWithNamespaceSchema.optional(),
    message: zod_1.z.string().optional(),
});
exports.UpdateEndpointRequestSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
    name: zod_1.z
        .string()
        .min(1, "validation:endpointName.required")
        .regex(/^[a-zA-Z0-9_-]+$/, "validation:endpointName.urlCompatible"),
    description: zod_1.z.string().optional(),
    namespaceUuid: zod_1.z.string().uuid(),
    enableApiKeyAuth: zod_1.z.boolean().optional(),
    enableClientMaxRate: zod_1.z.boolean(),
    enableMaxRate: zod_1.z.boolean(),
    maxRateSeconds: zod_1.z.number().min(1, "validation:maxRateSeconds").optional(),
    maxRate: zod_1.z.number().min(1, "validation:maxRate").optional(),
    clientMaxRate: zod_1.z.number().min(1, "validation:clientMaxRate").optional(),
    clientMaxRateSeconds: zod_1.z
        .number()
        .min(1, "validation:clientMaxRateSeconds")
        .optional(),
    clientMaxRateStrategy: zod_1.z.string().optional(),
    clientMaxRateStrategyKey: zod_1.z.string().optional(),
    enableOauth: zod_1.z.boolean().optional(),
    useQueryParamAuth: zod_1.z.boolean().optional(),
    user_id: zod_1.z.string().nullable().optional(),
});
exports.UpdateEndpointResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: exports.EndpointSchema.optional(),
    message: zod_1.z.string().optional(),
});
exports.DeleteEndpointRequestSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
});
exports.DeleteEndpointResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string().optional(),
});
// Repository-specific schemas
exports.EndpointCreateInputSchema = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable().optional(),
    namespace_uuid: zod_1.z.string(),
    enable_api_key_auth: zod_1.z.boolean().optional().default(true),
    enable_max_rate: zod_1.z.boolean(),
    enable_client_max_rate: zod_1.z.boolean(),
    max_rate_seconds: zod_1.z.number().nullable().optional(),
    max_rate: zod_1.z.number().nullable().optional(),
    client_max_rate: zod_1.z.number().nullable().optional(),
    client_max_rate_seconds: zod_1.z.number().nullable().optional(),
    client_max_rate_strategy: zod_1.z.string().nullable().optional(),
    client_max_rate_strategy_key: zod_1.z.string().nullable().optional(),
    enable_oauth: zod_1.z.boolean().optional().default(false),
    use_query_param_auth: zod_1.z.boolean().optional().default(false),
    user_id: zod_1.z.string().nullable().optional(),
});
exports.EndpointUpdateInputSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable().optional(),
    namespace_uuid: zod_1.z.string(),
    enable_api_key_auth: zod_1.z.boolean().optional(),
    enable_max_rate: zod_1.z.boolean(),
    enable_client_max_rate: zod_1.z.boolean(),
    max_rate_seconds: zod_1.z.number().nullable().optional(),
    max_rate: zod_1.z.number().nullable().optional(),
    client_max_rate: zod_1.z.number().nullable().optional(),
    client_max_rate_seconds: zod_1.z.number().nullable().optional(),
    client_max_rate_strategy: zod_1.z.string().nullable().optional(),
    client_max_rate_strategy_key: zod_1.z.string().nullable().optional(),
    enable_oauth: zod_1.z.boolean().optional(),
    use_query_param_auth: zod_1.z.boolean().optional(),
    user_id: zod_1.z.string().nullable().optional(),
});
// Database-specific schemas (raw database results with Date objects)
exports.DatabaseEndpointSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    namespace_uuid: zod_1.z.string(),
    enable_api_key_auth: zod_1.z.boolean(),
    enable_max_rate: zod_1.z.boolean(),
    enable_client_max_rate: zod_1.z.boolean(),
    max_rate_seconds: zod_1.z.number().nullable().optional(),
    max_rate: zod_1.z.number().nullable().optional(),
    client_max_rate: zod_1.z.number().nullable().optional(),
    client_max_rate_seconds: zod_1.z.number().nullable().optional(),
    client_max_rate_strategy: zod_1.z.string().nullable().optional(),
    client_max_rate_strategy_key: zod_1.z.string().nullable().optional(),
    enable_oauth: zod_1.z.boolean(),
    use_query_param_auth: zod_1.z.boolean(),
    created_at: zod_1.z.date(),
    updated_at: zod_1.z.date(),
    user_id: zod_1.z.string().nullable(),
});
exports.DatabaseEndpointWithNamespaceSchema = exports.DatabaseEndpointSchema.extend({
    namespace: namespaces_zod_js_1.DatabaseNamespaceSchema,
});
