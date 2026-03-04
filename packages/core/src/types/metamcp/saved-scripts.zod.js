"use strict";
/**
 * @file saved-scripts.zod.ts
 * @module packages/core/src/types/metamcp/saved-scripts.zod
 *
 * WHAT:
 * Zod definitions for User Scripts.
 *
 * WHY:
 * Validates the storage of executable code snippets (JS/Python) that users can save and run via the dashboard.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteSavedScriptResponseSchema = exports.DeleteSavedScriptRequestSchema = exports.GetSavedScriptsResponseSchema = exports.SavedScriptSchema = void 0;
var zod_1 = require("zod");
exports.SavedScriptSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable().optional(),
    code: zod_1.z.string(),
    userId: zod_1.z.string().nullable().optional(),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
exports.GetSavedScriptsResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    data: zod_1.z.array(exports.SavedScriptSchema),
});
exports.DeleteSavedScriptRequestSchema = zod_1.z.object({
    uuid: zod_1.z.string(),
});
exports.DeleteSavedScriptResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string().optional(),
});
