"use strict";
/**
 * @file namespaces.zod.ts
 * @module packages/core/src/types/metamcp/namespaces.zod
 *
 * WHAT:
 * Zod definitions for Namespaces, which are logical groupings of MCP Servers.
 *
 * WHY:
 * Namespaces allow users to organize tools from different servers into cohesive units (e.g. "Coding", "General").
 * This file handles validation for creating namespaces, assigning servers, and overriding tool names/descriptions.
 *
 * HOW:
 * - Imports `McpServerSchema` and `ToolSchema`.
 * - Defines `NamespaceSchema` and `NamespaceToolSchema` (with override fields).
 * - Defines requests for updating namespace-server and namespace-tool mappings.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseNamespaceToolSchema = exports.DatabaseNamespaceWithServersSchema = exports.DatabaseNamespaceServerSchema = exports.DatabaseNamespaceSchema = exports.NamespaceToolOverridesUpdateSchema = exports.NamespaceToolStatusUpdateSchema = exports.NamespaceServerStatusUpdateSchema = exports.NamespaceUpdateInputSchema = exports.NamespaceCreateInputSchema = exports.RefreshNamespaceToolsResponseSchema = exports.RefreshNamespaceToolsRequestSchema = exports.UpdateNamespaceToolOverridesResponseSchema = exports.UpdateNamespaceToolOverridesRequestSchema = exports.UpdateNamespaceToolStatusResponseSchema = exports.UpdateNamespaceToolStatusRequestSchema = exports.UpdateNamespaceServerStatusResponseSchema = exports.UpdateNamespaceServerStatusRequestSchema = exports.DeleteNamespaceResponseSchema = exports.DeleteNamespaceRequestSchema = exports.UpdateNamespaceResponseSchema = exports.UpdateNamespaceRequestSchema = exports.GetNamespaceToolsResponseSchema = exports.GetNamespaceToolsRequestSchema = exports.GetNamespaceResponseSchema = exports.ListNamespacesResponseSchema = exports.CreateNamespaceResponseSchema = exports.NamespaceWithServersSchema = exports.NamespaceToolSchema = exports.NamespaceServerSchema = exports.NamespaceSchema = exports.CreateNamespaceRequestSchema = exports.editNamespaceFormSchema = exports.createNamespaceFormSchema = void 0;
var zod_1 = require("zod");
var mcp_servers_zod_js_1 = require("./mcp-servers.zod.js");
var tools_zod_js_1 = require("./tools.zod.js");
var ToolAnnotationsSchema = zod_1.z.record(zod_1.z.unknown());
// Namespace schema definitions
exports.createNamespaceFormSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "validation:namespaceName.required"),
    description: zod_1.z.string().optional(),
    mcpServerUuids: zod_1.z.array(zod_1.z.string()).optional(),
    user_id: zod_1.z.string().nullable().optional(),
});
exports.editNamespaceFormSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "validation:namespaceName.required"),
    description: zod_1.z.string().optional(),
    mcpServerUuids: zod_1.z.array(zod_1.z.string()).optional(),
    user_id: zod_1.z.string().nullable().optional(),
});
exports.CreateNamespaceRequestSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "validation:namespaceName.required"),
    description: zod_1.z.string().optional(),
    mcpServerUuids: zod_1.z.array(zod_1.z.string()).optional(),
    user_id: zod_1.z.string().nullable().optional(),
});
exports.NamespaceSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    created_at: zod_1.z.string(),
    updated_at: zod_1.z.string(),
    user_id: zod_1.z.string().nullable(),
});
// Server within namespace schema - extends McpServerSchema with namespace-specific status
exports.NamespaceServerSchema = mcp_servers_zod_js_1.McpServerSchema.extend({
    status: mcp_servers_zod_js_1.McpServerStatusEnum,
    error_status: mcp_servers_zod_js_1.McpServerErrorStatusEnum.optional(),
});
// Tool within namespace schema - extends ToolSchema with namespace-specific status and server info
exports.NamespaceToolSchema = tools_zod_js_1.ToolSchema.extend({
    serverName: zod_1.z.string(),
    serverUuid: zod_1.z.string(),
    status: tools_zod_js_1.ToolStatusEnum, // Status from namespace tool mapping
    overrideName: zod_1.z.string().nullable().optional(),
    overrideTitle: zod_1.z.string().nullable().optional(),
    overrideDescription: zod_1.z.string().nullable().optional(),
    overrideAnnotations: ToolAnnotationsSchema.nullable().optional(),
});
exports.NamespaceWithServersSchema = exports.NamespaceSchema.extend({
    servers: zod_1.z.array(exports.NamespaceServerSchema),
});
exports.CreateNamespaceResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: exports.NamespaceSchema.optional(),
    message: zod_1.z.string().optional(),
});
exports.ListNamespacesResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.array(exports.NamespaceSchema),
    message: zod_1.z.string().optional(),
});
exports.GetNamespaceResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: exports.NamespaceWithServersSchema.optional(),
    message: zod_1.z.string().optional(),
});
// Get namespace tools from mapping table
exports.GetNamespaceToolsRequestSchema = zod_1.z.object({
    namespaceUuid: zod_1.z.string().uuid(),
});
exports.GetNamespaceToolsResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.array(exports.NamespaceToolSchema),
    message: zod_1.z.string().optional(),
});
exports.UpdateNamespaceRequestSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
    name: zod_1.z.string().min(1, "validation:namespaceName.required"),
    description: zod_1.z.string().optional(),
    mcpServerUuids: zod_1.z.array(zod_1.z.string()).optional(),
    user_id: zod_1.z.string().nullable().optional(),
});
exports.UpdateNamespaceResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: exports.NamespaceSchema.optional(),
    message: zod_1.z.string().optional(),
});
exports.DeleteNamespaceRequestSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
});
exports.DeleteNamespaceResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string().optional(),
});
// Namespace server status management schemas
exports.UpdateNamespaceServerStatusRequestSchema = zod_1.z.object({
    namespaceUuid: zod_1.z.string(),
    serverUuid: zod_1.z.string(),
    status: mcp_servers_zod_js_1.McpServerStatusEnum,
});
exports.UpdateNamespaceServerStatusResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string().optional(),
});
// Namespace tool status management schemas
exports.UpdateNamespaceToolStatusRequestSchema = zod_1.z.object({
    namespaceUuid: zod_1.z.string().uuid(),
    toolUuid: zod_1.z.string().uuid(),
    serverUuid: zod_1.z.string().uuid(),
    status: tools_zod_js_1.ToolStatusEnum,
});
exports.UpdateNamespaceToolStatusResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string(),
});
// Namespace tool overrides management schemas
exports.UpdateNamespaceToolOverridesRequestSchema = zod_1.z.object({
    namespaceUuid: zod_1.z.string().uuid(),
    toolUuid: zod_1.z.string().uuid(),
    serverUuid: zod_1.z.string().uuid(),
    overrideName: zod_1.z.string().nullable().optional(),
    overrideTitle: zod_1.z.string().nullable().optional(),
    overrideDescription: zod_1.z.string().nullable().optional(),
    overrideAnnotations: ToolAnnotationsSchema.nullable().optional(),
});
exports.UpdateNamespaceToolOverridesResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string(),
});
// Refresh tools from MetaMCP connection
exports.RefreshNamespaceToolsRequestSchema = zod_1.z.object({
    namespaceUuid: zod_1.z.string().uuid(),
    tools: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(), // This will contain "ServerName__toolName" format
        description: zod_1.z.string().optional(),
        inputSchema: zod_1.z.record(zod_1.z.any()),
        // Remove serverUuid since we'll resolve it from the tool name
    })),
});
exports.RefreshNamespaceToolsResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string(),
    toolsCreated: zod_1.z.number().optional(),
    mappingsCreated: zod_1.z.number().optional(),
});
// Repository-specific schemas
exports.NamespaceCreateInputSchema = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable().optional(),
    mcpServerUuids: zod_1.z.array(zod_1.z.string()).optional(),
    user_id: zod_1.z.string().nullable().optional(),
});
exports.NamespaceUpdateInputSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable().optional(),
    mcpServerUuids: zod_1.z.array(zod_1.z.string()).optional(),
    user_id: zod_1.z.string().nullable().optional(),
});
exports.NamespaceServerStatusUpdateSchema = zod_1.z.object({
    namespaceUuid: zod_1.z.string(),
    serverUuid: zod_1.z.string(),
    status: mcp_servers_zod_js_1.McpServerStatusEnum,
});
exports.NamespaceToolStatusUpdateSchema = zod_1.z.object({
    namespaceUuid: zod_1.z.string(),
    toolUuid: zod_1.z.string(),
    serverUuid: zod_1.z.string(),
    status: tools_zod_js_1.ToolStatusEnum,
});
exports.NamespaceToolOverridesUpdateSchema = zod_1.z.object({
    namespaceUuid: zod_1.z.string(),
    toolUuid: zod_1.z.string(),
    serverUuid: zod_1.z.string(),
    overrideName: zod_1.z.string().nullable().optional(),
    overrideTitle: zod_1.z.string().nullable().optional(),
    overrideDescription: zod_1.z.string().nullable().optional(),
    overrideAnnotations: ToolAnnotationsSchema.nullable().optional(),
});
// Database-specific schemas (raw database results with Date objects)
exports.DatabaseNamespaceSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    created_at: zod_1.z.date(),
    updated_at: zod_1.z.date(),
    user_id: zod_1.z.string().nullable(),
});
exports.DatabaseNamespaceServerSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    type: zod_1.z.enum(["STDIO", "SSE", "STREAMABLE_HTTP"]),
    command: zod_1.z.string().nullable(),
    args: zod_1.z.array(zod_1.z.string()),
    url: zod_1.z.string().nullable(),
    env: zod_1.z.record(zod_1.z.string()),
    bearerToken: zod_1.z.string().nullable(),
    headers: zod_1.z.record(zod_1.z.string()),
    created_at: zod_1.z.date(),
    user_id: zod_1.z.string().nullable(),
    status: mcp_servers_zod_js_1.McpServerStatusEnum,
});
exports.DatabaseNamespaceWithServersSchema = exports.DatabaseNamespaceSchema.extend({
    servers: zod_1.z.array(exports.DatabaseNamespaceServerSchema),
});
exports.DatabaseNamespaceToolSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    toolSchema: zod_1.z.object({
        type: zod_1.z.literal("object"),
        properties: zod_1.z.record(zod_1.z.any()).optional(),
    }),
    created_at: zod_1.z.date(),
    updated_at: zod_1.z.date(),
    mcp_server_uuid: zod_1.z.string(),
    status: tools_zod_js_1.ToolStatusEnum,
    serverName: zod_1.z.string(),
    serverUuid: zod_1.z.string(),
    overrideName: zod_1.z.string().nullable().optional(),
    overrideTitle: zod_1.z.string().nullable().optional(),
    overrideDescription: zod_1.z.string().nullable().optional(),
    overrideAnnotations: ToolAnnotationsSchema.nullable().optional(),
});
