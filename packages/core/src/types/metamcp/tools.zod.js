"use strict";
/**
 * @file tools.zod.ts
 * @module packages/core/src/types/metamcp/tools.zod
 *
 * WHAT:
 * Zod definitions for Tools discovered from MCP servers.
 *
 * WHY:
 * Provides validation for tool storage, filtering, and API responses.
 *
 * HOW:
 * - Defines `ToolSchema` matching the DB.
 * - `ToolStatusEnum` for enabling/disabling tools per namespace.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternFilterResponseSchema = exports.FilterResultSchema = exports.SmartFilterRequestSchema = exports.PatternFilterCombinedRequestSchema = exports.PatternFilterRequestSchema = exports.PatternFilterOptionsSchema = exports.DatabaseToolSchema = exports.ToolUpsertInputSchema = exports.ToolCreateInputSchema = exports.CreateToolResponseSchema = exports.CreateToolRequestSchema = exports.GetToolsByMcpServerUuidResponseSchema = exports.GetToolsByMcpServerUuidRequestSchema = exports.ToolSchema = exports.ToolStatusEnum = void 0;
var zod_1 = require("zod");
// Define tool-specific status enum
exports.ToolStatusEnum = zod_1.z.enum(["ACTIVE", "INACTIVE"]);
// Tool schema
exports.ToolSchema = zod_1.z.object({
    uuid: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    title: zod_1.z.string().nullable().optional(),
    description: zod_1.z.string().nullable(),
    toolSchema: zod_1.z.object({
        type: zod_1.z.literal("object"),
        properties: zod_1.z.record(zod_1.z.any()).optional(),
        required: zod_1.z.array(zod_1.z.string()).optional(),
    }),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
    mcp_server_uuid: zod_1.z.string().uuid(),
});
// Get tools by MCP server UUID
exports.GetToolsByMcpServerUuidRequestSchema = zod_1.z.object({
    mcpServerUuid: zod_1.z.string().uuid(),
});
exports.GetToolsByMcpServerUuidResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.array(exports.ToolSchema),
    message: zod_1.z.string().optional(),
});
// Save tools to database
exports.CreateToolRequestSchema = zod_1.z.object({
    mcpServerUuid: zod_1.z.string().uuid(),
    tools: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        description: zod_1.z.string().optional(),
        inputSchema: zod_1.z.object({
            type: zod_1.z.literal("object").optional(),
            properties: zod_1.z.record(zod_1.z.any()).optional(),
            required: zod_1.z.array(zod_1.z.string()).optional(),
        }),
    })),
});
exports.CreateToolResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    count: zod_1.z.number(),
    message: zod_1.z.string().optional(),
    error: zod_1.z.string().optional(),
});
// Repository-specific schemas
exports.ToolCreateInputSchema = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable().optional(),
    toolSchema: zod_1.z.object({
        type: zod_1.z.literal("object"),
        properties: zod_1.z.record(zod_1.z.any()).optional(),
        required: zod_1.z.array(zod_1.z.string()).optional(),
    }),
    mcp_server_uuid: zod_1.z.string(),
});
exports.ToolUpsertInputSchema = zod_1.z.object({
    tools: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        description: zod_1.z.string().nullable().optional(),
        inputSchema: zod_1.z
            .object({
            properties: zod_1.z.record(zod_1.z.any()).optional(),
            required: zod_1.z.array(zod_1.z.string()).optional(),
        })
            .optional(),
    })),
    mcpServerUuid: zod_1.z.string(),
});
// Database-specific schemas (raw database results with Date objects)
exports.DatabaseToolSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
    name: zod_1.z.string(),
    title: zod_1.z.string().nullable().optional(),
    description: zod_1.z.string().nullable(),
    toolSchema: zod_1.z.object({
        type: zod_1.z.literal("object"),
        properties: zod_1.z.record(zod_1.z.any()).optional(),
        required: zod_1.z.array(zod_1.z.string()).optional(),
    }),
    created_at: zod_1.z.date(),
    updated_at: zod_1.z.date(),
    mcp_server_uuid: zod_1.z.string(),
});
exports.PatternFilterOptionsSchema = zod_1.z.object({
    caseSensitive: zod_1.z.boolean().optional(),
    matchDescription: zod_1.z.boolean().optional(),
    matchServer: zod_1.z.boolean().optional(),
});
exports.PatternFilterRequestSchema = zod_1.z.object({
    mcpServerUuid: zod_1.z.string().uuid().optional(),
    patterns: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]),
    options: exports.PatternFilterOptionsSchema.optional(),
});
exports.PatternFilterCombinedRequestSchema = zod_1.z.object({
    mcpServerUuid: zod_1.z.string().uuid().optional(),
    include: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
    exclude: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
    servers: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
});
exports.SmartFilterRequestSchema = zod_1.z.object({
    mcpServerUuid: zod_1.z.string().uuid().optional(),
    query: zod_1.z.string(),
    options: exports.PatternFilterOptionsSchema.optional(),
});
exports.FilterResultSchema = zod_1.z.object({
    items: zod_1.z.array(exports.ToolSchema),
    matched: zod_1.z.number(),
    total: zod_1.z.number(),
    patterns: zod_1.z.array(zod_1.z.string()),
});
exports.PatternFilterResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: exports.FilterResultSchema.optional(),
    message: zod_1.z.string().optional(),
    error: zod_1.z.string().optional(),
});
