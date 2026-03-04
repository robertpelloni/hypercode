"use strict";
/**
 * @file config-schemas.zod.ts
 * @module packages/core/src/types/metamcp/config-schemas.zod
 *
 * WHAT:
 * Comprehensive validation schemas for MetaMCP configuration files.
 * Covers `claude_desktop_config.json`, internal app config, and env var validation.
 *
 * WHY:
 * Ensures that imported configurations (from Claude Desktop) and internal settings
 * (timeouts, auth flags) are strictly typed and safe before use.
 *
 * HOW:
 * - Validates Claude Desktop JSON structure (mcpServers map).
 * - Validates internal KV config values (booleans, timeouts, max attempts).
 * - Provides helper functions `validateClaudeDesktopConfig` and `validateConfigValue`.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigValidationResultSchema = exports.ValidationErrorSchema = exports.ConfigKeyEnum = exports.ConfigKeyValidators = exports.SessionLifetimeConfigValueSchema = exports.MaxAttemptsConfigValueSchema = exports.TimeoutConfigValueSchema = exports.PositiveIntConfigValueSchema = exports.BooleanConfigValueSchema = exports.ClaudeDesktopConfigSchema = exports.ClaudeServerDefinitionSchema = exports.ClaudeSseServerSchema = exports.ClaudeStdioServerSchema = exports.HttpHeadersSchema = exports.EnvVarsSchema = void 0;
exports.validateClaudeDesktopConfig = validateClaudeDesktopConfig;
exports.validateConfigValue = validateConfigValue;
exports.isStdioServer = isStdioServer;
exports.isSseServer = isSseServer;
exports.validatePartialConfig = validatePartialConfig;
var zod_1 = require("zod");
// ============================================================================
// Claude Desktop Config Schema (claude_desktop_config.json)
// ============================================================================
/**
 * Environment variables schema - validates key-value pairs
 */
exports.EnvVarsSchema = zod_1.z
    .record(zod_1.z.string(), zod_1.z.string())
    .describe("Environment variables passed to the MCP server process");
/**
 * HTTP headers schema - validates key-value pairs
 */
exports.HttpHeadersSchema = zod_1.z
    .record(zod_1.z.string(), zod_1.z.string())
    .describe("HTTP headers for SSE/Streamable HTTP connections");
/**
 * STDIO MCP Server definition in Claude Desktop config
 */
exports.ClaudeStdioServerSchema = zod_1.z
    .object({
    command: zod_1.z.string().min(1, "Command is required for STDIO servers"),
    args: zod_1.z.array(zod_1.z.string()).optional().default([]),
    env: exports.EnvVarsSchema.optional().default({}),
})
    .strict();
/**
 * SSE/HTTP MCP Server definition in Claude Desktop config
 */
exports.ClaudeSseServerSchema = zod_1.z
    .object({
    url: zod_1.z.string().url("URL must be a valid URL"),
    headers: exports.HttpHeadersSchema.optional().default({}),
})
    .strict();
/**
 * Combined server definition - can be either STDIO or SSE type
 */
exports.ClaudeServerDefinitionSchema = zod_1.z
    .union([exports.ClaudeStdioServerSchema, exports.ClaudeSseServerSchema])
    .describe("MCP server definition - either STDIO (command-based) or SSE (URL-based)");
/**
 * Full Claude Desktop config file schema
 */
exports.ClaudeDesktopConfigSchema = zod_1.z
    .object({
    mcpServers: zod_1.z
        .record(zod_1.z
        .string()
        .regex(/^[a-zA-Z0-9_-]+$/, "Server name must only contain letters, numbers, underscores, and hyphens"), exports.ClaudeServerDefinitionSchema)
        .describe("Map of server names to their configurations"),
})
    .describe("Claude Desktop configuration file (claude_desktop_config.json)");
// ============================================================================
// MetaMCP Config Key Validation
// ============================================================================
/**
 * Boolean config value schema
 */
exports.BooleanConfigValueSchema = zod_1.z
    .enum(["true", "false"])
    .transform(function (val) { return val === "true"; });
/**
 * Positive integer config value schema
 */
exports.PositiveIntConfigValueSchema = zod_1.z
    .string()
    .refine(function (val) {
    var num = parseInt(val, 10);
    return !isNaN(num) && num > 0;
}, "Value must be a positive integer")
    .transform(function (val) { return parseInt(val, 10); });
/**
 * Timeout value schema (1s to 1h in milliseconds)
 */
exports.TimeoutConfigValueSchema = zod_1.z
    .string()
    .refine(function (val) {
    var num = parseInt(val, 10);
    return !isNaN(num) && num >= 1000 && num <= 3600000;
}, "Timeout must be between 1000ms (1s) and 3600000ms (1h)")
    .transform(function (val) { return parseInt(val, 10); });
/**
 * Max attempts value schema (1-10)
 */
exports.MaxAttemptsConfigValueSchema = zod_1.z
    .string()
    .refine(function (val) {
    var num = parseInt(val, 10);
    return !isNaN(num) && num >= 1 && num <= 10;
}, "Max attempts must be between 1 and 10")
    .transform(function (val) { return parseInt(val, 10); });
/**
 * Session lifetime value schema (1 minute to 1 year in milliseconds)
 */
exports.SessionLifetimeConfigValueSchema = zod_1.z
    .string()
    .refine(function (val) {
    var num = parseInt(val, 10);
    // 1 minute (60000ms) to 1 year (31536000000ms)
    return !isNaN(num) && num >= 60000 && num <= 31536000000;
}, "Session lifetime must be between 60000ms (1 min) and 31536000000ms (1 year)")
    .transform(function (val) { return parseInt(val, 10); });
/**
 * Config key to validation schema mapping
 */
exports.ConfigKeyValidators = {
    DISABLE_SIGNUP: exports.BooleanConfigValueSchema,
    DISABLE_SSO_SIGNUP: exports.BooleanConfigValueSchema,
    DISABLE_BASIC_AUTH: exports.BooleanConfigValueSchema,
    MCP_RESET_TIMEOUT_ON_PROGRESS: exports.BooleanConfigValueSchema,
    MCP_TIMEOUT: exports.TimeoutConfigValueSchema,
    MCP_MAX_TOTAL_TIMEOUT: exports.TimeoutConfigValueSchema,
    MCP_MAX_ATTEMPTS: exports.MaxAttemptsConfigValueSchema,
    SESSION_LIFETIME: exports.SessionLifetimeConfigValueSchema,
};
// Define the Enum for runtime usage (matching config.service.ts expectations)
exports.ConfigKeyEnum = zod_1.z.enum([
    "DISABLE_SIGNUP",
    "DISABLE_SSO_SIGNUP",
    "DISABLE_BASIC_AUTH",
    "MCP_RESET_TIMEOUT_ON_PROGRESS",
    "MCP_TIMEOUT",
    "MCP_MAX_TOTAL_TIMEOUT",
    "MCP_MAX_ATTEMPTS",
    "SESSION_LIFETIME",
]);
// ============================================================================
// Validation Result Types
// ============================================================================
/**
 * Single validation error
 */
exports.ValidationErrorSchema = zod_1.z.object({
    path: zod_1.z.string().describe("JSON path to the error location"),
    message: zod_1.z.string().describe("Human-readable error message"),
    code: zod_1.z.string().optional().describe("Error code for programmatic handling"),
});
/**
 * Validation result for config imports
 */
exports.ConfigValidationResultSchema = zod_1.z.object({
    valid: zod_1.z.boolean(),
    errors: zod_1.z.array(exports.ValidationErrorSchema).optional(),
    warnings: zod_1.z.array(exports.ValidationErrorSchema).optional(),
    data: zod_1.z.unknown().optional().describe("Parsed and validated data if valid"),
});
// ============================================================================
// Validation Utilities
// ============================================================================
/**
 * Validate a Claude Desktop config JSON string
 */
function validateClaudeDesktopConfig(configJson) {
    try {
        var parsed = JSON.parse(configJson);
        var result = exports.ClaudeDesktopConfigSchema.safeParse(parsed);
        if (result.success) {
            return {
                valid: true,
                data: result.data,
            };
        }
        return {
            valid: false,
            errors: result.error.issues.map(function (issue) { return ({
                path: issue.path.join("."),
                message: issue.message,
                code: issue.code,
            }); }),
        };
    }
    catch (error) {
        return {
            valid: false,
            errors: [
                {
                    path: "",
                    message: error instanceof SyntaxError
                        ? "Invalid JSON: ".concat(error.message)
                        : "Failed to parse configuration",
                    code: "PARSE_ERROR",
                },
            ],
        };
    }
}
/**
 * Validate a single config key-value pair
 */
function validateConfigValue(key, value) {
    var validator = exports.ConfigKeyValidators[key];
    if (!validator) {
        return {
            valid: false,
            errors: [
                {
                    path: key,
                    message: "Unknown configuration key: ".concat(key),
                    code: "UNKNOWN_KEY",
                },
            ],
        };
    }
    var result = validator.safeParse(value);
    if (result.success) {
        return {
            valid: true,
            data: result.data,
        };
    }
    return {
        valid: false,
        errors: result.error.issues.map(function (issue) { return ({
            path: key,
            message: issue.message,
            code: issue.code,
        }); }),
    };
}
/**
 * Check if a server definition is STDIO type
 */
function isStdioServer(server) {
    return "command" in server;
}
/**
 * Check if a server definition is SSE type
 */
function isSseServer(server) {
    return "url" in server;
}
/**
 * Validate a partial config object (for API updates)
 */
function validatePartialConfig(configs) {
    var errors = [];
    var validated = {};
    for (var _i = 0, _a = Object.entries(configs); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        var result = validateConfigValue(key, value);
        if (!result.valid && result.errors) {
            errors.push.apply(errors, result.errors);
        }
        else if (result.valid) {
            validated[key] = result.data;
        }
    }
    return errors.length > 0
        ? { valid: false, errors: errors }
        : { valid: true, data: validated };
}
