"use strict";
/**
 * @file tool-sets.zod.ts
 * @module packages/core/src/types/metamcp/tool-sets.zod
 *
 * WHAT:
 * Zod definitions for Tool Sets.
 *
 * WHY:
 * Tool Sets allow users to group random tools into convenient bundles for assignment to Agents or tasks.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteToolSetResponseSchema = exports.DeleteToolSetRequestSchema = exports.GetToolSetsResponseSchema = exports.ToolSetSchema = void 0;
var zod_1 = require("zod");
exports.ToolSetSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable().optional(),
    tools: zod_1.z.array(zod_1.z.string()),
});
exports.GetToolSetsResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    data: zod_1.z.array(exports.ToolSetSchema),
});
exports.DeleteToolSetRequestSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
});
exports.DeleteToolSetResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string().optional(),
});
