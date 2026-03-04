"use strict";
/**
 * @file metamcp-schema.ts
 * @description SQLite schema definition for MetaMCP integration into Borg.
 * @module packages/core/src/db/metamcp-schema
 *
 * WHAT:
 * This file defines the database schema for all MetaMCP functionality (Servers, Tools, Namespaces, etc.)
 * adapted for SQLite 3. It mirrors the structure of the original PostgreSQL schema (`metamcp-schema.pg.ts`)
 * but uses SQLite-compatible column types.
 *
 * WHY:
 * Borg runs primarily as a local application where SQLite (`better-sqlite3`) is the standard embedded database.
 * The original MetaMCP uses PostgreSQL (`pg`). To support full feature parity locally without requiring a running
 * Postgres instance, we verify and adapt the schema to SQLite.
 *
 * HOW:
 * - `uuid` columns mapped to `text` (strings).
 * - `jsonb` columns mapped to `text` with `{ mode: 'json' }`.
 * - `timestamp` columns mapped to `integer` with `{ mode: 'timestamp' }` (Unix millis).
 * - `boolean` columns mapped to `integer` with `{ mode: 'boolean' }`.
 * - Enums mapped to simple text checks or handled in application logic (Zod).
 * - Foreign keys enforced via `references()`.
 */
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.savedScriptsTable = exports.toolSetItemsTable = exports.toolSetsTable = exports.toolCallLogsTable = exports.policiesTable = exports.dockerSessionsTable = exports.oauthAccessTokensTable = exports.oauthAuthorizationCodesTable = exports.oauthClientsTable = exports.configTable = exports.apiKeysTable = exports.namespaceToolMappingsTable = exports.namespaceServerMappingsTable = exports.endpointsTable = exports.namespacesTable = exports.verificationsTable = exports.accountsTable = exports.sessionsTable = exports.usersTable = exports.toolsTable = exports.oauthSessionsTable = exports.mcpServersTable = exports.DockerSessionStatusEnum = exports.McpServerErrorStatusEnum = exports.McpServerStatusEnum = exports.McpServerTypeEnum = void 0;
var drizzle_orm_1 = require("drizzle-orm");
var sqlite_core_1 = require("drizzle-orm/sqlite-core");
// -- ENUMS (Defined as const arrays for Zod/App compatibility, stored as TEXT) --
exports.McpServerTypeEnum = ["STDIO", "SSE", "STREAMABLE_HTTP"];
exports.McpServerStatusEnum = ["ACTIVE", "INACTIVE", "ERROR", "CONNECTING"];
exports.McpServerErrorStatusEnum = ["NONE", "CONNECTION_FAILED", "TIMEOUT", "INTERNAL_ERROR"];
exports.DockerSessionStatusEnum = ["PENDING", "RUNNING", "STOPPED", "ERROR", "NOT_FOUND"];
// -- TABLES --
/**
 * Table: mcp_servers
 * Stores configuration for upstream MCP servers (the ones Borg connects TO).
 */
exports.mcpServersTable = (0, sqlite_core_1.sqliteTable)("mcp_servers", {
    uuid: (0, sqlite_core_1.text)("uuid").primaryKey(), // Generated via crypto.randomUUID() in app logic
    name: (0, sqlite_core_1.text)("name").notNull(),
    description: (0, sqlite_core_1.text)("description"),
    type: (0, sqlite_core_1.text)("type", { enum: exports.McpServerTypeEnum }).notNull().default("STDIO"),
    command: (0, sqlite_core_1.text)("command"),
    args: (0, sqlite_core_1.text)("args", { mode: "json" }).$type().notNull().default((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["'[]'"], ["'[]'"])))), // SQLite doesn't support arrays, use JSON
    env: (0, sqlite_core_1.text)("env", { mode: "json" })
        .$type()
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["'{}'"], ["'{}'"])))),
    url: (0, sqlite_core_1.text)("url"),
    error_status: (0, sqlite_core_1.text)("error_status", { enum: exports.McpServerErrorStatusEnum })
        .notNull()
        .default("NONE"),
    created_at: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    bearerToken: (0, sqlite_core_1.text)("bearer_token"),
    headers: (0, sqlite_core_1.text)("headers", { mode: "json" })
        .$type()
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["'{}'"], ["'{}'"])))),
    user_id: (0, sqlite_core_1.text)("user_id").notNull(), // Foreign key to usersTable (if auth exists) or 'system'
}, function (table) { return ({
    nameIdx: (0, sqlite_core_1.index)("mcp_servers_name_idx").on(table.name),
    userIdIdx: (0, sqlite_core_1.index)("mcp_servers_user_id_idx").on(table.user_id),
    nameUserUnique: (0, sqlite_core_1.unique)("mcp_servers_name_user_unique").on(table.name, table.user_id),
}); });
/**
 * Table: oauth_sessions
 * Manages OAuth 2.0 flows for servers that require it.
 */
exports.oauthSessionsTable = (0, sqlite_core_1.sqliteTable)("oauth_sessions", {
    uuid: (0, sqlite_core_1.text)("uuid").primaryKey(),
    mcp_server_uuid: (0, sqlite_core_1.text)("mcp_server_uuid")
        .notNull()
        .references(function () { return exports.mcpServersTable.uuid; }, { onDelete: "cascade" }),
    client_information: (0, sqlite_core_1.text)("client_information", { mode: "json" })
        .$type()
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_5 || (templateObject_5 = __makeTemplateObject(["'{}'"], ["'{}'"])))),
    tokens: (0, sqlite_core_1.text)("tokens", { mode: "json" }).$type(),
    code_verifier: (0, sqlite_core_1.text)("code_verifier"),
    created_at: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_6 || (templateObject_6 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    updated_at: (0, sqlite_core_1.integer)("updated_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_7 || (templateObject_7 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
}, function (table) { return ({
    serverIdx: (0, sqlite_core_1.index)("oauth_sessions_mcp_server_uuid_idx").on(table.mcp_server_uuid),
    uniquePerServer: (0, sqlite_core_1.unique)("oauth_sessions_unique_per_server_idx").on(table.mcp_server_uuid),
}); });
/**
 * Table: tools
 * Caches discovered tools from MCP servers to avoid constant re-discovery.
 */
exports.toolsTable = (0, sqlite_core_1.sqliteTable)("tools", {
    uuid: (0, sqlite_core_1.text)("uuid").primaryKey(),
    name: (0, sqlite_core_1.text)("name").notNull(),
    description: (0, sqlite_core_1.text)("description"),
    // Schema is stored as JSON text
    toolSchema: (0, sqlite_core_1.text)("tool_schema", { mode: "json" })
        .$type()
        .notNull(),
    created_at: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_8 || (templateObject_8 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    updated_at: (0, sqlite_core_1.integer)("updated_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_9 || (templateObject_9 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    mcp_server_uuid: (0, sqlite_core_1.text)("mcp_server_uuid")
        .notNull()
        .references(function () { return exports.mcpServersTable.uuid; }, { onDelete: "cascade" }),
}, function (table) { return ({
    serverIdx: (0, sqlite_core_1.index)("tools_mcp_server_uuid_idx").on(table.mcp_server_uuid),
    uniqueNamePerServer: (0, sqlite_core_1.unique)("tools_unique_tool_name_per_server_idx").on(table.mcp_server_uuid, table.name),
}); });
// -- Better-Auth Tables (Simplified for SQLite) --
exports.usersTable = (0, sqlite_core_1.sqliteTable)("users", {
    id: (0, sqlite_core_1.text)("id").primaryKey(),
    name: (0, sqlite_core_1.text)("name").notNull(),
    email: (0, sqlite_core_1.text)("email").notNull().unique(),
    emailVerified: (0, sqlite_core_1.integer)("email_verified", { mode: "boolean" }).notNull().default(false),
    image: (0, sqlite_core_1.text)("image"),
    createdAt: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_10 || (templateObject_10 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    updatedAt: (0, sqlite_core_1.integer)("updated_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_11 || (templateObject_11 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
});
exports.sessionsTable = (0, sqlite_core_1.sqliteTable)("sessions", {
    id: (0, sqlite_core_1.text)("id").primaryKey(),
    expiresAt: (0, sqlite_core_1.integer)("expires_at", { mode: "timestamp" }).notNull(),
    token: (0, sqlite_core_1.text)("token").notNull().unique(),
    createdAt: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_12 || (templateObject_12 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    updatedAt: (0, sqlite_core_1.integer)("updated_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_13 || (templateObject_13 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    ipAddress: (0, sqlite_core_1.text)("ip_address"),
    userAgent: (0, sqlite_core_1.text)("user_agent"),
    userId: (0, sqlite_core_1.text)("user_id")
        .notNull()
        .references(function () { return exports.usersTable.id; }, { onDelete: "cascade" }),
});
exports.accountsTable = (0, sqlite_core_1.sqliteTable)("accounts", {
    id: (0, sqlite_core_1.text)("id").primaryKey(),
    accountId: (0, sqlite_core_1.text)("account_id").notNull(),
    providerId: (0, sqlite_core_1.text)("provider_id").notNull(),
    userId: (0, sqlite_core_1.text)("user_id")
        .notNull()
        .references(function () { return exports.usersTable.id; }, { onDelete: "cascade" }),
    accessToken: (0, sqlite_core_1.text)("access_token"),
    refreshToken: (0, sqlite_core_1.text)("refresh_token"),
    idToken: (0, sqlite_core_1.text)("id_token"),
    accessTokenExpiresAt: (0, sqlite_core_1.integer)("access_token_expires_at", { mode: "timestamp" }),
    refreshTokenExpiresAt: (0, sqlite_core_1.integer)("refresh_token_expires_at", { mode: "timestamp" }),
    scope: (0, sqlite_core_1.text)("scope"),
    password: (0, sqlite_core_1.text)("password"),
    createdAt: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_14 || (templateObject_14 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    updatedAt: (0, sqlite_core_1.integer)("updated_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_15 || (templateObject_15 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
});
exports.verificationsTable = (0, sqlite_core_1.sqliteTable)("verifications", {
    id: (0, sqlite_core_1.text)("id").primaryKey(),
    identifier: (0, sqlite_core_1.text)("identifier").notNull(),
    value: (0, sqlite_core_1.text)("value").notNull(),
    expiresAt: (0, sqlite_core_1.integer)("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_16 || (templateObject_16 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    updatedAt: (0, sqlite_core_1.integer)("updated_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_17 || (templateObject_17 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
});
// -- CORE METAMCP TABLES --
/**
 * Table: namespaces
 * Logical groupings for tools (e.g. "coding", "search", "personal").
 */
exports.namespacesTable = (0, sqlite_core_1.sqliteTable)("namespaces", {
    uuid: (0, sqlite_core_1.text)("uuid").primaryKey(),
    name: (0, sqlite_core_1.text)("name").notNull(),
    description: (0, sqlite_core_1.text)("description"),
    created_at: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_18 || (templateObject_18 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    updated_at: (0, sqlite_core_1.integer)("updated_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_19 || (templateObject_19 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    user_id: (0, sqlite_core_1.text)("user_id").references(function () { return exports.usersTable.id; }, {
        onDelete: "cascade",
    }),
}, function (table) { return ({
    userIdIdx: (0, sqlite_core_1.index)("namespaces_user_id_idx").on(table.user_id),
    nameUserUnique: (0, sqlite_core_1.unique)("namespaces_name_user_unique_idx").on(table.name, table.user_id),
}); });
/**
 * Table: endpoints
 * Defines routing endpoints (HTTP/SSE) that expose Namespaces to the outside world.
 */
exports.endpointsTable = (0, sqlite_core_1.sqliteTable)("endpoints", {
    uuid: (0, sqlite_core_1.text)("uuid").primaryKey(),
    name: (0, sqlite_core_1.text)("name").notNull(),
    description: (0, sqlite_core_1.text)("description"),
    namespace_uuid: (0, sqlite_core_1.text)("namespace_uuid")
        .notNull()
        .references(function () { return exports.namespacesTable.uuid; }, { onDelete: "cascade" }),
    enable_api_key_auth: (0, sqlite_core_1.integer)("enable_api_key_auth", { mode: "boolean" }).notNull().default(true),
    enable_oauth: (0, sqlite_core_1.integer)("enable_oauth", { mode: "boolean" }).notNull().default(false),
    enable_max_rate: (0, sqlite_core_1.integer)("enable_max_rate", { mode: "boolean" }).notNull().default(false),
    enable_client_max_rate: (0, sqlite_core_1.integer)("enable_client_max_rate", { mode: "boolean" })
        .notNull()
        .default(false),
    max_rate: (0, sqlite_core_1.integer)("max_rate"),
    max_rate_seconds: (0, sqlite_core_1.integer)("max_rate_seconds"),
    client_max_rate: (0, sqlite_core_1.integer)("client_max_rate"),
    client_max_rate_seconds: (0, sqlite_core_1.integer)("client_max_rate_seconds"),
    client_max_rate_strategy: (0, sqlite_core_1.text)("client_max_rate_strategy"),
    client_max_rate_strategy_key: (0, sqlite_core_1.text)("client_max_rate_strategy_key"),
    use_query_param_auth: (0, sqlite_core_1.integer)("use_query_param_auth", { mode: "boolean" })
        .notNull()
        .default(false),
    created_at: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_20 || (templateObject_20 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    updated_at: (0, sqlite_core_1.integer)("updated_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_21 || (templateObject_21 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    user_id: (0, sqlite_core_1.text)("user_id").references(function () { return exports.usersTable.id; }, {
        onDelete: "cascade",
    }),
}, function (table) { return ({
    namespaceIdx: (0, sqlite_core_1.index)("endpoints_namespace_uuid_idx").on(table.namespace_uuid),
    userIdIdx: (0, sqlite_core_1.index)("endpoints_user_id_idx").on(table.user_id),
    nameUnique: (0, sqlite_core_1.unique)("endpoints_name_unique").on(table.name),
}); });
/**
 * Table: namespace_server_mappings
 * M2M Link: Namespaces <-> MCPServers.
 */
exports.namespaceServerMappingsTable = (0, sqlite_core_1.sqliteTable)("namespace_server_mappings", {
    uuid: (0, sqlite_core_1.text)("uuid").primaryKey(),
    namespace_uuid: (0, sqlite_core_1.text)("namespace_uuid")
        .notNull()
        .references(function () { return exports.namespacesTable.uuid; }, { onDelete: "cascade" }),
    mcp_server_uuid: (0, sqlite_core_1.text)("mcp_server_uuid")
        .notNull()
        .references(function () { return exports.mcpServersTable.uuid; }, { onDelete: "cascade" }),
    status: (0, sqlite_core_1.text)("status", { enum: exports.McpServerStatusEnum }) // ACTIVE/INACTIVE
        .notNull()
        .default("ACTIVE"),
    created_at: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_22 || (templateObject_22 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
}, function (table) { return ({
    namespaceIdx: (0, sqlite_core_1.index)("nsm_namespace_uuid_idx").on(table.namespace_uuid),
    serverIdx: (0, sqlite_core_1.index)("nsm_mcp_server_uuid_idx").on(table.mcp_server_uuid),
    uniqueMapping: (0, sqlite_core_1.unique)("nsm_unique_idx").on(table.namespace_uuid, table.mcp_server_uuid),
}); });
/**
 * Table: namespace_tool_mappings
 * M2M Link: Namespaces <-> Tools (Overrides & Status).
 * Allows a namespace to "rename" a tool or disable it specifically for that namespace.
 */
exports.namespaceToolMappingsTable = (0, sqlite_core_1.sqliteTable)("namespace_tool_mappings", {
    uuid: (0, sqlite_core_1.text)("uuid").primaryKey(),
    namespace_uuid: (0, sqlite_core_1.text)("namespace_uuid")
        .notNull()
        .references(function () { return exports.namespacesTable.uuid; }, { onDelete: "cascade" }),
    tool_uuid: (0, sqlite_core_1.text)("tool_uuid")
        .notNull()
        .references(function () { return exports.toolsTable.uuid; }, { onDelete: "cascade" }),
    mcp_server_uuid: (0, sqlite_core_1.text)("mcp_server_uuid")
        .notNull()
        .references(function () { return exports.mcpServersTable.uuid; }, { onDelete: "cascade" }),
    status: (0, sqlite_core_1.text)("status", { enum: exports.McpServerStatusEnum })
        .notNull()
        .default("ACTIVE"),
    override_name: (0, sqlite_core_1.text)("override_name"),
    override_title: (0, sqlite_core_1.text)("override_title"),
    override_description: (0, sqlite_core_1.text)("override_description"),
    override_annotations: (0, sqlite_core_1.text)("override_annotations", { mode: "json" })
        .$type()
        .default(null),
    created_at: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_23 || (templateObject_23 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
}, function (table) { return ({
    namespaceIdx: (0, sqlite_core_1.index)("ntm_namespace_uuid_idx").on(table.namespace_uuid),
    toolIdx: (0, sqlite_core_1.index)("ntm_tool_uuid_idx").on(table.tool_uuid),
    uniqueMapping: (0, sqlite_core_1.unique)("ntm_unique_idx").on(table.namespace_uuid, table.tool_uuid),
}); });
/**
 * Table: api_keys
 * API Keys for accessing Endpoints.
 */
exports.apiKeysTable = (0, sqlite_core_1.sqliteTable)("api_keys", {
    uuid: (0, sqlite_core_1.text)("uuid").primaryKey(),
    name: (0, sqlite_core_1.text)("name").notNull(),
    key: (0, sqlite_core_1.text)("key").notNull().unique(),
    user_id: (0, sqlite_core_1.text)("user_id").references(function () { return exports.usersTable.id; }, {
        onDelete: "cascade",
    }),
    created_at: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_24 || (templateObject_24 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    is_active: (0, sqlite_core_1.integer)("is_active", { mode: "boolean" }).notNull().default(true),
}, function (table) { return ({
    userIdIdx: (0, sqlite_core_1.index)("api_keys_user_id_idx").on(table.user_id),
    keyIdx: (0, sqlite_core_1.index)("api_keys_key_idx").on(table.key),
    namePerUserUnique: (0, sqlite_core_1.unique)("api_keys_name_per_user_idx").on(table.user_id, table.name),
}); });
/**
 * Table: config
 * Global application configuration settings.
 */
exports.configTable = (0, sqlite_core_1.sqliteTable)("config", {
    id: (0, sqlite_core_1.text)("id").primaryKey(),
    value: (0, sqlite_core_1.text)("value").notNull(),
    description: (0, sqlite_core_1.text)("description"),
    created_at: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_25 || (templateObject_25 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    updated_at: (0, sqlite_core_1.integer)("updated_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_26 || (templateObject_26 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
});
// -- OAUTH PROVIDER TABLES --
exports.oauthClientsTable = (0, sqlite_core_1.sqliteTable)("oauth_clients", {
    client_id: (0, sqlite_core_1.text)("client_id").primaryKey(),
    client_secret: (0, sqlite_core_1.text)("client_secret"),
    client_name: (0, sqlite_core_1.text)("client_name").notNull(),
    redirect_uris: (0, sqlite_core_1.text)("redirect_uris", { mode: "json" })
        .$type()
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_27 || (templateObject_27 = __makeTemplateObject(["'[]'"], ["'[]'"])))),
    grant_types: (0, sqlite_core_1.text)("grant_types", { mode: "json" })
        .$type()
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_28 || (templateObject_28 = __makeTemplateObject(["'[\"authorization_code\",\"refresh_token\"]'"], ["'[\"authorization_code\",\"refresh_token\"]'"])))),
    response_types: (0, sqlite_core_1.text)("response_types", { mode: "json" })
        .$type()
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_29 || (templateObject_29 = __makeTemplateObject(["'[\"code\"]'"], ["'[\"code\"]'"])))),
    token_endpoint_auth_method: (0, sqlite_core_1.text)("token_endpoint_auth_method")
        .notNull()
        .default("none"),
    scope: (0, sqlite_core_1.text)("scope").default("admin"),
    client_uri: (0, sqlite_core_1.text)("client_uri"),
    logo_uri: (0, sqlite_core_1.text)("logo_uri"),
    contacts: (0, sqlite_core_1.text)("contacts", { mode: "json" }).$type(),
    tos_uri: (0, sqlite_core_1.text)("tos_uri"),
    policy_uri: (0, sqlite_core_1.text)("policy_uri"),
    software_id: (0, sqlite_core_1.text)("software_id"),
    software_version: (0, sqlite_core_1.text)("software_version"),
    created_at: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_30 || (templateObject_30 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    updated_at: (0, sqlite_core_1.integer)("updated_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_31 || (templateObject_31 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
});
exports.oauthAuthorizationCodesTable = (0, sqlite_core_1.sqliteTable)("oauth_authorization_codes", {
    code: (0, sqlite_core_1.text)("code").primaryKey(),
    client_id: (0, sqlite_core_1.text)("client_id")
        .notNull()
        .references(function () { return exports.oauthClientsTable.client_id; }, { onDelete: "cascade" }),
    redirect_uri: (0, sqlite_core_1.text)("redirect_uri").notNull(),
    scope: (0, sqlite_core_1.text)("scope").notNull().default("admin"),
    user_id: (0, sqlite_core_1.text)("user_id")
        .notNull()
        .references(function () { return exports.usersTable.id; }, { onDelete: "cascade" }),
    code_challenge: (0, sqlite_core_1.text)("code_challenge"),
    code_challenge_method: (0, sqlite_core_1.text)("code_challenge_method"),
    expires_at: (0, sqlite_core_1.integer)("expires_at", { mode: "timestamp" }).notNull(),
    created_at: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_32 || (templateObject_32 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
}, function (table) { return ({
    ctxClientId: (0, sqlite_core_1.index)("oac_client_id_idx").on(table.client_id),
    ctxUserId: (0, sqlite_core_1.index)("oac_user_id_idx").on(table.user_id),
}); });
exports.oauthAccessTokensTable = (0, sqlite_core_1.sqliteTable)("oauth_access_tokens", {
    access_token: (0, sqlite_core_1.text)("access_token").primaryKey(),
    client_id: (0, sqlite_core_1.text)("client_id")
        .notNull()
        .references(function () { return exports.oauthClientsTable.client_id; }, { onDelete: "cascade" }),
    user_id: (0, sqlite_core_1.text)("user_id")
        .notNull()
        .references(function () { return exports.usersTable.id; }, { onDelete: "cascade" }),
    scope: (0, sqlite_core_1.text)("scope").notNull().default("admin"),
    expires_at: (0, sqlite_core_1.integer)("expires_at", { mode: "timestamp" }).notNull(),
    created_at: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_33 || (templateObject_33 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
}, function (table) { return ({
    clientIdx: (0, sqlite_core_1.index)("oat_client_id_idx").on(table.client_id),
    userIdx: (0, sqlite_core_1.index)("oat_user_id_idx").on(table.user_id),
}); });
/**
 * Table: docker_sessions
 * Manages Docker-in-Docker containers for sandboxed MCP servers.
 */
exports.dockerSessionsTable = (0, sqlite_core_1.sqliteTable)("docker_sessions", {
    uuid: (0, sqlite_core_1.text)("uuid").primaryKey(),
    mcp_server_uuid: (0, sqlite_core_1.text)("mcp_server_uuid")
        .notNull()
        .references(function () { return exports.mcpServersTable.uuid; }, { onDelete: "cascade" }),
    container_id: (0, sqlite_core_1.text)("container_id").notNull(),
    container_name: (0, sqlite_core_1.text)("container_name"),
    url: (0, sqlite_core_1.text)("url"),
    status: (0, sqlite_core_1.text)("status", { enum: exports.DockerSessionStatusEnum }).notNull().default("PENDING"),
    created_at: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_34 || (templateObject_34 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    updated_at: (0, sqlite_core_1.integer)("updated_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_35 || (templateObject_35 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    started_at: (0, sqlite_core_1.integer)("started_at", { mode: "timestamp" }),
    stopped_at: (0, sqlite_core_1.integer)("stopped_at", { mode: "timestamp" }),
    error_message: (0, sqlite_core_1.text)("error_message"),
    retry_count: (0, sqlite_core_1.integer)("retry_count").notNull().default(0),
    last_retry_at: (0, sqlite_core_1.integer)("last_retry_at", { mode: "timestamp" }),
    max_retries: (0, sqlite_core_1.integer)("max_retries").notNull().default(3),
}, function (table) { return ({
    serverIdx: (0, sqlite_core_1.index)("ds_mcp_server_uuid_idx").on(table.mcp_server_uuid),
    uniqueServer: (0, sqlite_core_1.unique)("ds_unique_server_idx").on(table.mcp_server_uuid),
}); });
/**
 * Table: policies
 * Access control policies.
 */
exports.policiesTable = (0, sqlite_core_1.sqliteTable)("policies", {
    uuid: (0, sqlite_core_1.text)("uuid").primaryKey(),
    name: (0, sqlite_core_1.text)("name").notNull(),
    description: (0, sqlite_core_1.text)("description"),
    rules: (0, sqlite_core_1.text)("rules", { mode: "json" })
        .$type()
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_36 || (templateObject_36 = __makeTemplateObject(["'{}'"], ["'{}'"])))),
    createdAt: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_37 || (templateObject_37 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    updatedAt: (0, sqlite_core_1.integer)("updated_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_38 || (templateObject_38 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
}, function (table) { return ({
    uniqueName: (0, sqlite_core_1.unique)("policies_name_unique_idx").on(table.name),
}); });
/**
 * Table: tool_call_logs
 * Observability logs for tool execution.
 */
exports.toolCallLogsTable = (0, sqlite_core_1.sqliteTable)("tool_call_logs", {
    uuid: (0, sqlite_core_1.text)("uuid").primaryKey(),
    tool_name: (0, sqlite_core_1.text)("tool_name").notNull(),
    mcp_server_uuid: (0, sqlite_core_1.text)("mcp_server_uuid")
        .references(function () { return exports.mcpServersTable.uuid; }, { onDelete: "set null" }),
    namespace_uuid: (0, sqlite_core_1.text)("namespace_uuid")
        .references(function () { return exports.namespacesTable.uuid; }, { onDelete: "set null" }),
    endpoint_uuid: (0, sqlite_core_1.text)("endpoint_uuid")
        .references(function () { return exports.endpointsTable.uuid; }, { onDelete: "set null" }),
    args: (0, sqlite_core_1.text)("args", { mode: "json" }).$type(),
    result: (0, sqlite_core_1.text)("result", { mode: "json" }).$type(),
    error: (0, sqlite_core_1.text)("error"),
    duration_ms: (0, sqlite_core_1.integer)("duration_ms"),
    session_id: (0, sqlite_core_1.text)("session_id"),
    parent_call_uuid: (0, sqlite_core_1.text)("parent_call_uuid"),
    created_at: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_39 || (templateObject_39 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
}, function (table) { return ({
    toolNameIdx: (0, sqlite_core_1.index)("tcl_tool_name_idx").on(table.tool_name),
    serverIdx: (0, sqlite_core_1.index)("tcl_mcp_server_uuid_idx").on(table.mcp_server_uuid),
    createdAtIdx: (0, sqlite_core_1.index)("tcl_created_at_idx").on(table.created_at),
}); });
/**
 * Table: tool_sets
 * Reusable groupings of tools.
 */
exports.toolSetsTable = (0, sqlite_core_1.sqliteTable)("tool_sets", {
    uuid: (0, sqlite_core_1.text)("uuid").primaryKey(),
    name: (0, sqlite_core_1.text)("name").notNull(),
    description: (0, sqlite_core_1.text)("description"),
    created_at: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_40 || (templateObject_40 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    updated_at: (0, sqlite_core_1.integer)("updated_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_41 || (templateObject_41 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    user_id: (0, sqlite_core_1.text)("user_id").references(function () { return exports.usersTable.id; }, {
        onDelete: "cascade",
    }),
}, function (table) { return ({
    nameUserUnique: (0, sqlite_core_1.unique)("tool_sets_name_user_unique_idx").on(table.name, table.user_id),
}); });
/**
 * Table: tool_set_items
 * Joint table for ToolSets <-> Tools.
 */
exports.toolSetItemsTable = (0, sqlite_core_1.sqliteTable)("tool_set_items", {
    uuid: (0, sqlite_core_1.text)("uuid").primaryKey(),
    tool_set_uuid: (0, sqlite_core_1.text)("tool_set_uuid")
        .notNull()
        .references(function () { return exports.toolSetsTable.uuid; }, { onDelete: "cascade" }),
    tool_uuid: (0, sqlite_core_1.text)("tool_uuid")
        .notNull()
        .references(function () { return exports.toolsTable.uuid; }, { onDelete: "cascade" }),
    created_at: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_42 || (templateObject_42 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
}, function (table) { return ({
    setIdx: (0, sqlite_core_1.index)("tsi_tool_set_uuid_idx").on(table.tool_set_uuid),
    toolIdx: (0, sqlite_core_1.index)("tsi_tool_uuid_idx").on(table.tool_uuid),
    uniqueItem: (0, sqlite_core_1.unique)("tsi_unique_idx").on(table.tool_set_uuid, table.tool_uuid),
}); });
/**
 * Table: saved_scripts
 * User-defined scripts (JavaScript/Python) for tasks.
 */
exports.savedScriptsTable = (0, sqlite_core_1.sqliteTable)("saved_scripts", {
    uuid: (0, sqlite_core_1.text)("uuid").primaryKey(),
    name: (0, sqlite_core_1.text)("name").notNull(),
    description: (0, sqlite_core_1.text)("description"),
    code: (0, sqlite_core_1.text)("code").notNull(),
    language: (0, sqlite_core_1.text)("language").notNull().default("javascript"),
    created_at: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_43 || (templateObject_43 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    updated_at: (0, sqlite_core_1.integer)("updated_at", { mode: "timestamp" })
        .notNull()
        .default((0, drizzle_orm_1.sql)(templateObject_44 || (templateObject_44 = __makeTemplateObject(["(strftime('%s', 'now'))"], ["(strftime('%s', 'now'))"])))),
    user_id: (0, sqlite_core_1.text)("user_id").references(function () { return exports.usersTable.id; }, {
        onDelete: "cascade",
    }),
}, function (table) { return ({
    nameUserUnique: (0, sqlite_core_1.unique)("saved_scripts_name_user_unique_idx").on(table.name, table.user_id),
}); });
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9, templateObject_10, templateObject_11, templateObject_12, templateObject_13, templateObject_14, templateObject_15, templateObject_16, templateObject_17, templateObject_18, templateObject_19, templateObject_20, templateObject_21, templateObject_22, templateObject_23, templateObject_24, templateObject_25, templateObject_26, templateObject_27, templateObject_28, templateObject_29, templateObject_30, templateObject_31, templateObject_32, templateObject_33, templateObject_34, templateObject_35, templateObject_36, templateObject_37, templateObject_38, templateObject_39, templateObject_40, templateObject_41, templateObject_42, templateObject_43, templateObject_44;
