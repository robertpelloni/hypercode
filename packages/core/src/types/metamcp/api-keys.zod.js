"use strict";
/**
 * @file api-keys.zod.ts
 * @module packages/core/src/types/metamcp/api-keys.zod
 *
 * WHAT:
 * Zod definitions for API Key management.
 *
 * WHY:
 * Validates creation and management of API keys used for authentication against Endpoints.
 * Defines the `ApiKeyTypeEnum` (MCP/ADMIN).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyUpdateInputSchema = exports.ApiKeyCreateInputSchema = exports.ValidateApiKeyResponseSchema = exports.ValidateApiKeyRequestSchema = exports.ListApiKeysResponseSchema = exports.DeleteApiKeyResponseSchema = exports.DeleteApiKeyRequestSchema = exports.UpdateApiKeyResponseSchema = exports.UpdateApiKeyRequestSchema = exports.CreateApiKeyResponseSchema = exports.CreateApiKeyRequestSchema = exports.CreateApiKeyFormSchema = exports.ApiKeySchema = exports.ApiKeyTypeEnum = void 0;
var zod_1 = require("zod");
// API Key type enum
exports.ApiKeyTypeEnum = zod_1.z.enum(["MCP", "ADMIN"]);
// Base API Key schemas
exports.ApiKeySchema = zod_1.z.object({
    uuid: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    key: zod_1.z.string(),
    user_id: zod_1.z.string().nullable(),
    type: exports.ApiKeyTypeEnum.default("MCP"),
    created_at: zod_1.z.date(),
    is_active: zod_1.z.boolean(),
});
exports.CreateApiKeyFormSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1, "validation:apiKeyName.required")
        .max(100, "Name must be less than 100 characters")
        .regex(/^[a-zA-Z0-9_\s-]+$/, "Name can only contain letters, numbers, spaces, underscores, and hyphens"),
    type: exports.ApiKeyTypeEnum.default("MCP"),
    user_id: zod_1.z.string().nullable().optional(),
});
exports.CreateApiKeyRequestSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1, "validation:apiKeyName.required")
        .max(100, "Name must be less than 100 characters")
        .regex(/^[a-zA-Z0-9_\s-]+$/, "Name can only contain letters, numbers, spaces, underscores, and hyphens"),
    type: exports.ApiKeyTypeEnum.default("MCP"),
    user_id: zod_1.z.string().nullable().optional(),
});
exports.CreateApiKeyResponseSchema = zod_1.z.object({
    uuid: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    key: zod_1.z.string(),
    type: exports.ApiKeyTypeEnum,
    created_at: zod_1.z.date(),
});
exports.UpdateApiKeyRequestSchema = zod_1.z.object({
    uuid: zod_1.z.string().uuid(),
    name: zod_1.z
        .string()
        .min(1, "validation:apiKeyName.required")
        .max(100, "Name must be less than 100 characters")
        .regex(/^[a-zA-Z0-9_\s-]+$/, "Name can only contain letters, numbers, spaces, underscores, and hyphens")
        .optional(),
    type: exports.ApiKeyTypeEnum.optional(),
    is_active: zod_1.z.boolean().optional(),
});
exports.UpdateApiKeyResponseSchema = zod_1.z.object({
    uuid: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    key: zod_1.z.string(),
    type: exports.ApiKeyTypeEnum,
    created_at: zod_1.z.date(),
    is_active: zod_1.z.boolean(),
});
exports.DeleteApiKeyRequestSchema = zod_1.z.object({
    uuid: zod_1.z.string().uuid(),
});
exports.DeleteApiKeyResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string(),
});
exports.ListApiKeysResponseSchema = zod_1.z.object({
    apiKeys: zod_1.z.array(zod_1.z.object({
        uuid: zod_1.z.string().uuid(),
        name: zod_1.z.string(),
        key: zod_1.z.string(),
        type: exports.ApiKeyTypeEnum,
        created_at: zod_1.z.date(),
        is_active: zod_1.z.boolean(),
        user_id: zod_1.z.string().nullable(),
    })),
});
exports.ValidateApiKeyRequestSchema = zod_1.z.object({
    key: zod_1.z.string(),
});
exports.ValidateApiKeyResponseSchema = zod_1.z.object({
    valid: zod_1.z.boolean(),
    user_id: zod_1.z.string().optional(),
    key_uuid: zod_1.z.string().uuid().optional(),
    type: exports.ApiKeyTypeEnum.optional(),
});
// Repository schemas
exports.ApiKeyCreateInputSchema = zod_1.z.object({
    name: zod_1.z.string(),
    type: exports.ApiKeyTypeEnum.default("MCP"),
    user_id: zod_1.z.string().nullable().optional(),
    is_active: zod_1.z.boolean().optional().default(true),
});
exports.ApiKeyUpdateInputSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    type: exports.ApiKeyTypeEnum.optional(),
    is_active: zod_1.z.boolean().optional(),
});
