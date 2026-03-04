"use strict";
/**
 * @file policies.zod.ts
 * @module packages/core/src/types/metamcp/policies.zod
 *
 * WHAT:
 * Zod definitions for Access Control Policies.
 *
 * WHY:
 * Defines Allow/Deny rules for resources, used by the middleware pipeline to enforce security.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeletePolicySchema = exports.UpdatePolicySchema = exports.CreatePolicySchema = exports.PolicySchema = exports.PolicyRuleSchema = void 0;
var zod_1 = require("zod");
exports.PolicyRuleSchema = zod_1.z.object({
    allow: zod_1.z.array(zod_1.z.string()),
    deny: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.PolicySchema = zod_1.z.object({
    uuid: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    rules: exports.PolicyRuleSchema,
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.CreatePolicySchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    rules: exports.PolicyRuleSchema,
});
exports.UpdatePolicySchema = zod_1.z.object({
    uuid: zod_1.z.string(),
    name: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
    rules: exports.PolicyRuleSchema.optional(),
});
exports.DeletePolicySchema = zod_1.z.object({
    uuid: zod_1.z.string(),
});
