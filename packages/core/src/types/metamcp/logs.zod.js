"use strict";
/**
 * @file logs.zod.ts
 * @module packages/core/src/types/metamcp/logs.zod
 *
 * WHAT:
 * Zod definitions for Observability Logs (Tool Calls & Docker events).
 *
 * WHY:
 * Validates the structure of logs stored in `tool_call_logs`, including tool args, results, duration, and errors.
 * Also handles Docker logs request objects.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetDockerLogsResponseSchema = exports.GetDockerLogsRequestSchema = exports.ListDockerServersResponseSchema = exports.ClearLogsResponseSchema = exports.GetLogsResponseSchema = exports.GetLogsRequestSchema = exports.MetaMcpLogEntrySchema = void 0;
var zod_1 = require("zod");
exports.MetaMcpLogEntrySchema = zod_1.z.object({
    id: zod_1.z.string(),
    timestamp: zod_1.z.date(),
    serverName: zod_1.z.string().optional(), // Now derived from tool_name prefix or similar
    level: zod_1.z.enum(["error", "info", "warn"]),
    message: zod_1.z.string(), // Summary: "Called tool X"
    error: zod_1.z.string().nullable().optional(),
    // New structured fields
    toolName: zod_1.z.string().optional(),
    arguments: zod_1.z.record(zod_1.z.unknown()).optional(),
    result: zod_1.z.record(zod_1.z.unknown()).optional(),
    durationMs: zod_1.z.string().optional(),
    sessionId: zod_1.z.string().optional(),
    parentCallUuid: zod_1.z.string().nullable().optional(),
});
exports.GetLogsRequestSchema = zod_1.z.object({
    limit: zod_1.z.number().int().positive().max(1000).optional(),
    sessionId: zod_1.z.string().optional(),
});
exports.GetLogsResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    data: zod_1.z.array(exports.MetaMcpLogEntrySchema),
    totalCount: zod_1.z.number(),
});
exports.ClearLogsResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    message: zod_1.z.string(),
});
// Docker logs (per MCP server)
exports.ListDockerServersResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    servers: zod_1.z.array(zod_1.z.object({
        serverUuid: zod_1.z.string(),
        containerId: zod_1.z.string(),
        containerName: zod_1.z.string(),
        serverName: zod_1.z.string(),
    })),
});
exports.GetDockerLogsRequestSchema = zod_1.z.object({
    serverUuid: zod_1.z.string(),
    tail: zod_1.z.number().int().positive().max(5000).optional(),
});
exports.GetDockerLogsResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    serverUuid: zod_1.z.string(),
    lines: zod_1.z.array(zod_1.z.string()),
});
