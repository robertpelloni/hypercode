"use strict";
/**
 * @file mcp-servers.zod.ts
 * @module packages/core/src/types/metamcp/mcp-servers.zod
 *
 * WHAT:
 * Zod definitions for MCP Server objects, including database records, API requests, and standard Enums.
 *
 * WHY:
 * Validates data integrity for all MCP server operations (create, update, list).
 * Used by TRPC routers and the Database schema.
 *
 * HOW:
 * - Defines `McpServerTypeEnum` (STDIO/SSE).
 * - Defines `McpServerSchema` matching the DB structure.
 * - Provides strict validation logic for creation (e.g. command vs URL requirements).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerSessionSchema = exports.DatabaseMcpServerSchema = exports.McpServerUpdateInputSchema = exports.McpServerCreateInputSchema = exports.HeadlessUpdateMcpServerResponseSchema = exports.HeadlessDeleteMcpServerResponseSchema = exports.HeadlessGetMcpServerResponseSchema = exports.HeadlessListMcpServersResponseSchema = exports.HeadlessCreateMcpServerResponseSchema = exports.UpdateMcpServerResponseSchema = exports.UpdateMcpServerRequestSchema = exports.DeleteMcpServerResponseSchema = exports.DeleteMcpServerRequestSchema = exports.BulkImportMcpServersResponseSchema = exports.BulkImportMcpServersRequestSchema = exports.BulkImportMcpServerSchema = exports.GetMcpServerResponseSchema = exports.ListMcpServersResponseSchema = exports.CreateMcpServerResponseSchema = exports.McpServerSchema = exports.CreateMcpServerRequestSchema = exports.EditServerFormSchema = exports.createServerFormSchema = exports.McpServerErrorStatusEnum = exports.DockerSessionStatusEnum = exports.McpServerStatusEnum = exports.McpServerTypeEnum = void 0;
var zod_1 = require("zod");
exports.McpServerTypeEnum = zod_1.z.enum(["STDIO", "SSE", "STREAMABLE_HTTP"]);
exports.McpServerStatusEnum = zod_1.z.enum(["ACTIVE", "INACTIVE"]);
exports.DockerSessionStatusEnum = zod_1.z.enum([
    "RUNNING",
    "STOPPED",
    "ERROR",
    "REMOVED",
    "NOT_FOUND",
]);
exports.McpServerErrorStatusEnum = zod_1.z.enum(["NONE", "ERROR", "CONNECTION_FAILED", "TIMEOUT", "INTERNAL_ERROR"]);
// Define the form schema (includes UI-specific fields)
exports.createServerFormSchema = zod_1.z
    .object({
    name: zod_1.z
        .string()
        .min(1, "validation:serverName.required")
        .regex(/^[a-zA-Z0-9_-]+$/, "validation:serverName.invalidCharacters")
        .refine(function (value) { return !/_{2,}/.test(value); }, "validation:serverName.consecutiveUnderscores"),
    description: zod_1.z.string().optional(),
    type: exports.McpServerTypeEnum,
    command: zod_1.z.string().optional(),
    args: zod_1.z.string().optional(),
    url: zod_1.z.string().optional(),
    bearerToken: zod_1.z.string().optional(),
    headers: zod_1.z.string().optional(),
    env: zod_1.z.string().optional(),
    user_id: zod_1.z.string().nullable().optional(),
})
    .refine(function (data) {
    // Command is required for stdio type
    if (data.type === exports.McpServerTypeEnum.Enum.STDIO) {
        return data.command && data.command.trim() !== "";
    }
    return true;
}, {
    message: "validation:command.required",
    path: ["command"],
})
    .refine(function (data) {
    // URL is required for SSE and Streamable HTTP types
    if (data.type === exports.McpServerTypeEnum.Enum.SSE ||
        data.type === exports.McpServerTypeEnum.Enum.STREAMABLE_HTTP) {
        if (!data.url || data.url.trim() === "") {
            return false;
        }
        // Validate URL format
        try {
            new URL(data.url);
            return true;
        }
        catch (_a) {
            return false;
        }
    }
    return true;
}, {
    message: "validation:url.required",
    path: ["url"],
});
// Form schema for editing servers
exports.EditServerFormSchema = zod_1.z
    .object({
    name: zod_1.z
        .string()
        .min(1, "validation:serverName.required")
        .regex(/^[a-zA-Z0-9_-]+$/, "validation:serverName.invalidCharacters")
        .refine(function (value) { return !/_{2,}/.test(value); }, "validation:serverName.consecutiveUnderscores"),
    description: zod_1.z.string().optional(),
    type: exports.McpServerTypeEnum,
    command: zod_1.z.string().optional(),
    args: zod_1.z.string().optional(),
    url: zod_1.z.string().optional(),
    bearerToken: zod_1.z.string().optional(),
    headers: zod_1.z.string().optional(),
    env: zod_1.z.string().optional(),
    user_id: zod_1.z.string().nullable().optional(),
})
    .refine(function (data) {
    // Command is required for stdio type
    if (data.type === exports.McpServerTypeEnum.Enum.STDIO) {
        return data.command && data.command.trim() !== "";
    }
    return true;
}, {
    message: "validation:command.required",
    path: ["command"],
})
    .refine(function (data) {
    // URL is required for SSE and Streamable HTTP types
    if (data.type === exports.McpServerTypeEnum.Enum.SSE ||
        data.type === exports.McpServerTypeEnum.Enum.STREAMABLE_HTTP) {
        if (!data.url || data.url.trim() === "") {
            return false;
        }
        // Validate URL format
        try {
            new URL(data.url);
            return true;
        }
        catch (_a) {
            return false;
        }
    }
    return true;
}, {
    message: "validation:url.required",
    path: ["url"],
});
exports.CreateMcpServerRequestSchema = zod_1.z
    .object({
    name: zod_1.z
        .string()
        .min(1, "Name is required")
        .regex(/^[a-zA-Z0-9_-]+$/, "Server name must only contain letters, numbers, underscores, and hyphens")
        .refine(function (value) { return !/_{2,}/.test(value); }, "Server name cannot contain consecutive underscores"),
    description: zod_1.z.string().optional(),
    type: exports.McpServerTypeEnum,
    command: zod_1.z.string().optional(),
    args: zod_1.z.array(zod_1.z.string()).optional(),
    env: zod_1.z.record(zod_1.z.string()).optional(),
    url: zod_1.z.string().optional(),
    bearerToken: zod_1.z.string().optional(),
    headers: zod_1.z.record(zod_1.z.string()).optional(),
    user_id: zod_1.z.string().nullable().optional(),
})
    .refine(function (data) {
    // For stdio type, command is required and URL should be empty
    if (data.type === "STDIO") {
        return data.command && data.command.trim() !== "";
    }
    // For other types, URL should be provided and valid
    if (!data.url || data.url.trim() === "") {
        return false;
    }
    try {
        new URL(data.url);
        return true;
    }
    catch (_a) {
        return false;
    }
}, {
    message: "Command is required for stdio servers. URL is required and must be valid for sse and streamable_http server types",
});
exports.McpServerSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    type: exports.McpServerTypeEnum,
    command: zod_1.z.string().nullable(),
    args: zod_1.z.array(zod_1.z.string()),
    env: zod_1.z.record(zod_1.z.string()),
    url: zod_1.z.string().nullable(),
    created_at: zod_1.z.string(),
    bearerToken: zod_1.z.string().nullable(),
    headers: zod_1.z.record(zod_1.z.string()),
    user_id: zod_1.z.string().nullable(),
    error_status: exports.McpServerErrorStatusEnum.optional(),
});
exports.CreateMcpServerResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: exports.McpServerSchema.optional(),
    message: zod_1.z.string().optional(),
});
exports.ListMcpServersResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.array(exports.McpServerSchema),
    message: zod_1.z.string().optional(),
});
exports.GetMcpServerResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: exports.McpServerSchema.optional(),
    message: zod_1.z.string().optional(),
});
// Bulk import schemas
exports.BulkImportMcpServerSchema = zod_1.z
    .object({
    command: zod_1.z.string().optional(),
    args: zod_1.z.array(zod_1.z.string()).optional(),
    env: zod_1.z.record(zod_1.z.string()).optional(),
    url: zod_1.z.string().optional(),
    headers: zod_1.z.record(zod_1.z.string()).optional(),
    description: zod_1.z.string().optional(),
    type: zod_1.z
        .string()
        .optional()
        .transform(function (val) {
        if (!val)
            return undefined;
        // Convert to uppercase for case-insensitive matching
        var upperVal = val.toUpperCase();
        // Map common variations to the correct enum values
        if (upperVal === "STDIO" || upperVal === "STD")
            return "STDIO";
        if (upperVal === "SSE")
            return "SSE";
        if (upperVal === "STREAMABLE_HTTP" ||
            upperVal === "STREAMABLEHTTP" ||
            upperVal === "HTTP")
            return "STREAMABLE_HTTP";
        return upperVal; // Return as-is if it doesn't match known patterns
    })
        .pipe(exports.McpServerTypeEnum.optional()),
})
    .refine(function (data) {
    var serverType = data.type || exports.McpServerTypeEnum.Enum.STDIO;
    // For STDIO type, URL can be empty
    if (serverType === exports.McpServerTypeEnum.Enum.STDIO) {
        return true;
    }
    // For other types, URL should be provided and valid
    if (!data.url || data.url.trim() === "") {
        return false;
    }
    try {
        new URL(data.url);
        return true;
    }
    catch (_a) {
        return false;
    }
}, {
    message: "URL is required and must be valid for sse and streamable_http server types",
    path: ["url"],
});
exports.BulkImportMcpServersRequestSchema = zod_1.z.object({
    mcpServers: zod_1.z.record(exports.BulkImportMcpServerSchema),
});
exports.BulkImportMcpServersResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    imported: zod_1.z.number(),
    errors: zod_1.z.array(zod_1.z.string()).optional(),
    message: zod_1.z.string().optional(),
});
exports.DeleteMcpServerRequestSchema = zod_1.z.object({
    uuid: zod_1.z.string().uuid(),
});
exports.DeleteMcpServerResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string().optional(),
    error: zod_1.z.string().optional(),
});
exports.UpdateMcpServerRequestSchema = zod_1.z
    .object({
    uuid: zod_1.z.string().uuid(),
    name: zod_1.z
        .string()
        .min(1, "Name is required")
        .regex(/^[a-zA-Z0-9_-]+$/, "Server name must only contain letters, numbers, underscores, and hyphens")
        .refine(function (value) { return !/_{2,}/.test(value); }, "Server name cannot contain consecutive underscores"),
    description: zod_1.z.string().optional(),
    type: exports.McpServerTypeEnum,
    command: zod_1.z.string().optional(),
    args: zod_1.z.array(zod_1.z.string()).optional(),
    env: zod_1.z.record(zod_1.z.string()).optional(),
    url: zod_1.z.string().optional(),
    bearerToken: zod_1.z.string().optional(),
    headers: zod_1.z.record(zod_1.z.string()).optional(),
    user_id: zod_1.z.string().nullable().optional(),
})
    .refine(function (data) {
    // For stdio type, command is required and URL should be empty
    if (data.type === "STDIO") {
        return data.command && data.command.trim() !== "";
    }
    // For other types, URL should be provided and valid
    if (!data.url || data.url.trim() === "") {
        return false;
    }
    try {
        new URL(data.url);
        return true;
    }
    catch (_a) {
        return false;
    }
}, {
    message: "Command is required for stdio servers. URL is required and must be valid for sse and streamable_http server types",
});
exports.UpdateMcpServerResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: exports.McpServerSchema.optional(),
    message: zod_1.z.string().optional(),
    error: zod_1.z.string().optional(),
});
// Headless API response schemas (simplified without success/failure wrappers)
// Since we now throw TRPCErrors directly, these schemas only represent successful responses
exports.HeadlessCreateMcpServerResponseSchema = zod_1.z.object({
    data: exports.McpServerSchema,
    message: zod_1.z.string(),
});
exports.HeadlessListMcpServersResponseSchema = zod_1.z.object({
    data: zod_1.z.array(exports.McpServerSchema),
});
exports.HeadlessGetMcpServerResponseSchema = zod_1.z.object({
    data: exports.McpServerSchema,
});
exports.HeadlessDeleteMcpServerResponseSchema = zod_1.z.object({
    message: zod_1.z.string(),
});
exports.HeadlessUpdateMcpServerResponseSchema = zod_1.z.object({
    data: exports.McpServerSchema,
    message: zod_1.z.string(),
});
// Repository-specific schemas
exports.McpServerCreateInputSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .regex(/^[a-zA-Z0-9_-]+$/, "Server name must only contain letters, numbers, underscores, and hyphens")
        .refine(function (value) { return !/_{2,}/.test(value); }, "Server name cannot contain consecutive underscores"),
    description: zod_1.z.string().nullable().optional(),
    type: exports.McpServerTypeEnum,
    command: zod_1.z.string().nullable().optional(),
    args: zod_1.z.array(zod_1.z.string()).optional(),
    env: zod_1.z.record(zod_1.z.string()).optional(),
    url: zod_1.z.string().nullable().optional(),
    bearerToken: zod_1.z.string().nullable().optional(),
    headers: zod_1.z.record(zod_1.z.string()).optional(),
    user_id: zod_1.z.string().nullable().optional(),
});
exports.McpServerUpdateInputSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
    name: zod_1.z
        .string()
        .regex(/^[a-zA-Z0-9_-]+$/, "Server name must only contain letters, numbers, underscores, and hyphens")
        .refine(function (value) { return !/_{2,}/.test(value); }, "Server name cannot contain consecutive underscores")
        .optional(),
    description: zod_1.z.string().nullable().optional(),
    type: exports.McpServerTypeEnum.optional(),
    command: zod_1.z.string().nullable().optional(),
    args: zod_1.z.array(zod_1.z.string()).optional(),
    env: zod_1.z.record(zod_1.z.string()).optional(),
    url: zod_1.z.string().nullable().optional(),
    bearerToken: zod_1.z.string().nullable().optional(),
    headers: zod_1.z.record(zod_1.z.string()).optional(),
    user_id: zod_1.z.string().nullable().optional(),
});
// Database-specific schemas (raw database results with Date objects)
exports.DatabaseMcpServerSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    type: exports.McpServerTypeEnum,
    command: zod_1.z.string().nullable(),
    args: zod_1.z.array(zod_1.z.string()),
    env: zod_1.z.record(zod_1.z.string()),
    url: zod_1.z.string().nullable(),
    error_status: exports.McpServerErrorStatusEnum,
    created_at: zod_1.z.date(),
    bearerToken: zod_1.z.string().nullable(),
    headers: zod_1.z.record(zod_1.z.string()),
    user_id: zod_1.z.string().nullable(),
});
// Docker Session schema
exports.DockerSessionSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
    mcp_server_uuid: zod_1.z.string(),
    container_id: zod_1.z.string(),
    container_name: zod_1.z.string(),
    url: zod_1.z.string(),
    status: exports.DockerSessionStatusEnum,
    created_at: zod_1.z.date(),
    updated_at: zod_1.z.date(),
    started_at: zod_1.z.date().nullable().optional(),
    stopped_at: zod_1.z.date().nullable().optional(),
    error_message: zod_1.z.string().nullable().optional(),
    retry_count: zod_1.z.number(),
    last_retry_at: zod_1.z.date().nullable().optional(),
    max_retries: zod_1.z.number(),
});
