/**
 * @file index.ts
 * @module packages/core/src/db/index
 *
 * WHAT:
 * Database connection initialization for Drizzle ORM.
 *
 * WHY:
 * Provides a singleton `db` instance used by all repositories.
 * Supports switching between SQLite (dev) and PostgreSQL (prod) via env vars,
 * though predominantly targets SQLite for this local-first architecture.
 */

import { createRequire } from "node:module";
import * as schema from "./mcp-admin-schema.js";
import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { isSqliteUnavailableError } from "./sqliteAvailability.js";

dotenv.config();

const require = createRequire(import.meta.url);
type BetterSqlite3Database = import("better-sqlite3").Database;
type BetterSqlite3Constructor = typeof import("better-sqlite3");

function initializeSchema(database: BetterSqlite3Database): void {
    database.pragma("foreign_keys = ON");

    database.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            email_verified INTEGER NOT NULL DEFAULT 0,
            image TEXT,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            expires_at INTEGER NOT NULL,
            token TEXT NOT NULL UNIQUE,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            ip_address TEXT,
            user_agent TEXT,
            user_id TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            provider_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            access_token TEXT,
            refresh_token TEXT,
            id_token TEXT,
            access_token_expires_at INTEGER,
            refresh_token_expires_at INTEGER,
            scope TEXT,
            password TEXT,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS verifications (
            id TEXT PRIMARY KEY,
            identifier TEXT NOT NULL,
            value TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );

        CREATE TABLE IF NOT EXISTS mcp_servers (
            uuid TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            type TEXT NOT NULL DEFAULT 'STDIO',
            command TEXT,
            args TEXT NOT NULL DEFAULT '[]',
            env TEXT NOT NULL DEFAULT '{}',
            url TEXT,
            error_status TEXT NOT NULL DEFAULT 'NONE',
            always_on INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            bearer_token TEXT,
            headers TEXT NOT NULL DEFAULT '{}',
            user_id TEXT NOT NULL,
            source_published_server_uuid TEXT
        );

        CREATE TABLE IF NOT EXISTS oauth_sessions (
            uuid TEXT PRIMARY KEY,
            mcp_server_uuid TEXT NOT NULL,
            client_information TEXT NOT NULL DEFAULT '{}',
            tokens TEXT,
            code_verifier TEXT,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (mcp_server_uuid) REFERENCES mcp_servers(uuid) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tools (
            uuid TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            tool_schema TEXT NOT NULL,
            is_deferred INTEGER NOT NULL DEFAULT 0,
            always_on INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            mcp_server_uuid TEXT NOT NULL,
            FOREIGN KEY (mcp_server_uuid) REFERENCES mcp_servers(uuid) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS namespaces (
            uuid TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            user_id TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS endpoints (
            uuid TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            namespace_uuid TEXT NOT NULL,
            enable_api_key_auth INTEGER NOT NULL DEFAULT 1,
            enable_oauth INTEGER NOT NULL DEFAULT 0,
            enable_max_rate INTEGER NOT NULL DEFAULT 0,
            enable_client_max_rate INTEGER NOT NULL DEFAULT 0,
            max_rate INTEGER,
            max_rate_seconds INTEGER,
            client_max_rate INTEGER,
            client_max_rate_seconds INTEGER,
            client_max_rate_strategy TEXT,
            client_max_rate_strategy_key TEXT,
            use_query_param_auth INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            user_id TEXT,
            FOREIGN KEY (namespace_uuid) REFERENCES namespaces(uuid) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS namespace_server_mappings (
            uuid TEXT PRIMARY KEY,
            namespace_uuid TEXT NOT NULL,
            mcp_server_uuid TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'ACTIVE',
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (namespace_uuid) REFERENCES namespaces(uuid) ON DELETE CASCADE,
            FOREIGN KEY (mcp_server_uuid) REFERENCES mcp_servers(uuid) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS namespace_tool_mappings (
            uuid TEXT PRIMARY KEY,
            namespace_uuid TEXT NOT NULL,
            tool_uuid TEXT NOT NULL,
            mcp_server_uuid TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'ACTIVE',
            override_name TEXT,
            override_title TEXT,
            override_description TEXT,
            override_annotations TEXT DEFAULT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (namespace_uuid) REFERENCES namespaces(uuid) ON DELETE CASCADE,
            FOREIGN KEY (tool_uuid) REFERENCES tools(uuid) ON DELETE CASCADE,
            FOREIGN KEY (mcp_server_uuid) REFERENCES mcp_servers(uuid) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS api_keys (
            uuid TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            key TEXT NOT NULL UNIQUE,
            user_id TEXT,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            is_active INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS config (
            id TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            description TEXT,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );

        CREATE TABLE IF NOT EXISTS oauth_clients (
            client_id TEXT PRIMARY KEY,
            client_secret TEXT,
            client_name TEXT NOT NULL,
            redirect_uris TEXT NOT NULL DEFAULT '[]',
            grant_types TEXT NOT NULL DEFAULT '["authorization_code","refresh_token"]',
            response_types TEXT NOT NULL DEFAULT '["code"]',
            token_endpoint_auth_method TEXT NOT NULL DEFAULT 'none',
            scope TEXT DEFAULT 'admin',
            client_uri TEXT,
            logo_uri TEXT,
            contacts TEXT,
            tos_uri TEXT,
            policy_uri TEXT,
            software_id TEXT,
            software_version TEXT,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );

        CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
            code TEXT PRIMARY KEY,
            client_id TEXT NOT NULL,
            redirect_uri TEXT NOT NULL,
            scope TEXT NOT NULL DEFAULT 'admin',
            user_id TEXT NOT NULL,
            code_challenge TEXT,
            code_challenge_method TEXT,
            expires_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (client_id) REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS oauth_access_tokens (
            access_token TEXT PRIMARY KEY,
            client_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            scope TEXT NOT NULL DEFAULT 'admin',
            expires_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (client_id) REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS docker_sessions (
            uuid TEXT PRIMARY KEY,
            mcp_server_uuid TEXT NOT NULL,
            container_id TEXT NOT NULL,
            container_name TEXT,
            url TEXT,
            status TEXT NOT NULL DEFAULT 'PENDING',
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            started_at INTEGER,
            stopped_at INTEGER,
            error_message TEXT,
            retry_count INTEGER NOT NULL DEFAULT 0,
            last_retry_at INTEGER,
            max_retries INTEGER NOT NULL DEFAULT 3,
            FOREIGN KEY (mcp_server_uuid) REFERENCES mcp_servers(uuid) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS policies (
            uuid TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            rules TEXT NOT NULL DEFAULT '{}',
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );

        CREATE TABLE IF NOT EXISTS tool_call_logs (
            uuid TEXT PRIMARY KEY,
            tool_name TEXT NOT NULL,
            mcp_server_uuid TEXT,
            namespace_uuid TEXT,
            endpoint_uuid TEXT,
            args TEXT,
            result TEXT,
            error TEXT,
            duration_ms INTEGER,
            session_id TEXT,
            parent_call_uuid TEXT,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (mcp_server_uuid) REFERENCES mcp_servers(uuid) ON DELETE SET NULL,
            FOREIGN KEY (namespace_uuid) REFERENCES namespaces(uuid) ON DELETE SET NULL,
            FOREIGN KEY (endpoint_uuid) REFERENCES endpoints(uuid) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS tool_sets (
            uuid TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            user_id TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tool_set_items (
            uuid TEXT PRIMARY KEY,
            tool_set_uuid TEXT NOT NULL,
            tool_uuid TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (tool_set_uuid) REFERENCES tool_sets(uuid) ON DELETE CASCADE,
            FOREIGN KEY (tool_uuid) REFERENCES tools(uuid) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS saved_scripts (
            uuid TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            code TEXT NOT NULL,
            language TEXT NOT NULL DEFAULT 'javascript',
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            user_id TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS workflows (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            nodes_json TEXT NOT NULL DEFAULT '[]',
            edges_json TEXT NOT NULL DEFAULT '[]',
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            user_id TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS mcp_servers_name_idx ON mcp_servers(name);
        CREATE INDEX IF NOT EXISTS mcp_servers_user_id_idx ON mcp_servers(user_id);
        CREATE UNIQUE INDEX IF NOT EXISTS mcp_servers_name_user_unique ON mcp_servers(name, user_id);

        CREATE INDEX IF NOT EXISTS oauth_sessions_mcp_server_uuid_idx ON oauth_sessions(mcp_server_uuid);
        CREATE UNIQUE INDEX IF NOT EXISTS oauth_sessions_unique_per_server_idx ON oauth_sessions(mcp_server_uuid);

        CREATE INDEX IF NOT EXISTS tools_mcp_server_uuid_idx ON tools(mcp_server_uuid);
        CREATE UNIQUE INDEX IF NOT EXISTS tools_unique_tool_name_per_server_idx ON tools(mcp_server_uuid, name);

        CREATE INDEX IF NOT EXISTS namespaces_user_id_idx ON namespaces(user_id);
        CREATE UNIQUE INDEX IF NOT EXISTS namespaces_name_user_unique_idx ON namespaces(name, user_id);

        CREATE INDEX IF NOT EXISTS endpoints_namespace_uuid_idx ON endpoints(namespace_uuid);
        CREATE INDEX IF NOT EXISTS endpoints_user_id_idx ON endpoints(user_id);
        CREATE UNIQUE INDEX IF NOT EXISTS endpoints_name_unique ON endpoints(name);

        CREATE INDEX IF NOT EXISTS nsm_namespace_uuid_idx ON namespace_server_mappings(namespace_uuid);
        CREATE INDEX IF NOT EXISTS nsm_mcp_server_uuid_idx ON namespace_server_mappings(mcp_server_uuid);
        CREATE UNIQUE INDEX IF NOT EXISTS nsm_unique_idx ON namespace_server_mappings(namespace_uuid, mcp_server_uuid);

        CREATE INDEX IF NOT EXISTS ntm_namespace_uuid_idx ON namespace_tool_mappings(namespace_uuid);
        CREATE INDEX IF NOT EXISTS ntm_tool_uuid_idx ON namespace_tool_mappings(tool_uuid);
        CREATE UNIQUE INDEX IF NOT EXISTS ntm_unique_idx ON namespace_tool_mappings(namespace_uuid, tool_uuid);

        CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys(user_id);
        CREATE INDEX IF NOT EXISTS api_keys_key_idx ON api_keys(key);
        CREATE UNIQUE INDEX IF NOT EXISTS api_keys_name_per_user_idx ON api_keys(user_id, name);

        CREATE INDEX IF NOT EXISTS oac_client_id_idx ON oauth_authorization_codes(client_id);
        CREATE INDEX IF NOT EXISTS oac_user_id_idx ON oauth_authorization_codes(user_id);

        CREATE INDEX IF NOT EXISTS oat_client_id_idx ON oauth_access_tokens(client_id);
        CREATE INDEX IF NOT EXISTS oat_user_id_idx ON oauth_access_tokens(user_id);

        CREATE INDEX IF NOT EXISTS ds_mcp_server_uuid_idx ON docker_sessions(mcp_server_uuid);
        CREATE UNIQUE INDEX IF NOT EXISTS ds_unique_server_idx ON docker_sessions(mcp_server_uuid);

        CREATE UNIQUE INDEX IF NOT EXISTS policies_name_unique_idx ON policies(name);

        CREATE INDEX IF NOT EXISTS tcl_tool_name_idx ON tool_call_logs(tool_name);
        CREATE INDEX IF NOT EXISTS tcl_mcp_server_uuid_idx ON tool_call_logs(mcp_server_uuid);
        CREATE INDEX IF NOT EXISTS tcl_created_at_idx ON tool_call_logs(created_at);

        CREATE UNIQUE INDEX IF NOT EXISTS tool_sets_name_user_unique_idx ON tool_sets(name, user_id);

        CREATE INDEX IF NOT EXISTS tsi_tool_set_uuid_idx ON tool_set_items(tool_set_uuid);
        CREATE INDEX IF NOT EXISTS tsi_tool_uuid_idx ON tool_set_items(tool_uuid);
        CREATE UNIQUE INDEX IF NOT EXISTS tsi_unique_idx ON tool_set_items(tool_set_uuid, tool_uuid);

        CREATE UNIQUE INDEX IF NOT EXISTS saved_scripts_name_user_unique_idx ON saved_scripts(name, user_id);

        -- MCP Registry Intelligence: Published Catalog Tables
        -- published_mcp_servers: canonical catalog from external registries
        CREATE TABLE IF NOT EXISTS published_mcp_servers (
            uuid TEXT PRIMARY KEY,
            canonical_id TEXT NOT NULL UNIQUE,
            display_name TEXT NOT NULL,
            description TEXT,
            author TEXT,
            repository_url TEXT,
            homepage_url TEXT,
            icon_url TEXT,
            transport TEXT NOT NULL DEFAULT 'unknown',
            install_method TEXT NOT NULL DEFAULT 'unknown',
            auth_model TEXT NOT NULL DEFAULT 'unknown',
            status TEXT NOT NULL DEFAULT 'discovered',
            confidence INTEGER NOT NULL DEFAULT 0,
            tags TEXT NOT NULL DEFAULT '[]',
            categories TEXT NOT NULL DEFAULT '[]',
            stars INTEGER,
            last_seen_at INTEGER,
            last_verified_at INTEGER,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );

        CREATE INDEX IF NOT EXISTS pms_canonical_id_idx ON published_mcp_servers(canonical_id);
        CREATE INDEX IF NOT EXISTS pms_status_idx ON published_mcp_servers(status);
        CREATE INDEX IF NOT EXISTS pms_transport_idx ON published_mcp_servers(transport);
        CREATE INDEX IF NOT EXISTS pms_install_method_idx ON published_mcp_servers(install_method);
        CREATE INDEX IF NOT EXISTS pms_updated_at_idx ON published_mcp_servers(updated_at);

        -- published_mcp_server_sources: provenance tracking per (server × registry)
        CREATE TABLE IF NOT EXISTS published_mcp_server_sources (
            uuid TEXT PRIMARY KEY,
            server_uuid TEXT NOT NULL,
            source_name TEXT NOT NULL,
            source_url TEXT,
            raw_payload TEXT,
            first_seen_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            last_seen_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (server_uuid) REFERENCES published_mcp_servers(uuid) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS pmss_server_uuid_idx ON published_mcp_server_sources(server_uuid);
        CREATE INDEX IF NOT EXISTS pmss_source_name_idx ON published_mcp_server_sources(source_name);
        CREATE UNIQUE INDEX IF NOT EXISTS pmss_unique_server_source_idx ON published_mcp_server_sources(server_uuid, source_name);

        -- published_mcp_config_recipes: install templates generated by Configurator
        CREATE TABLE IF NOT EXISTS published_mcp_config_recipes (
            uuid TEXT PRIMARY KEY,
            server_uuid TEXT NOT NULL,
            recipe_version INTEGER NOT NULL DEFAULT 1,
            template TEXT NOT NULL,
            required_secrets TEXT NOT NULL DEFAULT '[]',
            required_env TEXT NOT NULL DEFAULT '{}',
            confidence INTEGER NOT NULL DEFAULT 0,
            explanation TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            generated_by TEXT NOT NULL DEFAULT 'Configurator',
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (server_uuid) REFERENCES published_mcp_servers(uuid) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS pmcr_server_uuid_idx ON published_mcp_config_recipes(server_uuid);
        CREATE INDEX IF NOT EXISTS pmcr_is_active_idx ON published_mcp_config_recipes(server_uuid, is_active);

        -- published_mcp_validation_runs: Verifier run results
        CREATE TABLE IF NOT EXISTS published_mcp_validation_runs (
            uuid TEXT PRIMARY KEY,
            server_uuid TEXT NOT NULL,
            run_mode TEXT NOT NULL,
            started_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            finished_at INTEGER,
            outcome TEXT NOT NULL DEFAULT 'pending',
            failure_class TEXT,
            tool_count INTEGER,
            findings_summary TEXT,
            performed_by TEXT NOT NULL DEFAULT 'Verifier',
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (server_uuid) REFERENCES published_mcp_servers(uuid) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS pmvr_server_uuid_idx ON published_mcp_validation_runs(server_uuid);
        CREATE INDEX IF NOT EXISTS pmvr_outcome_idx ON published_mcp_validation_runs(outcome);
        CREATE INDEX IF NOT EXISTS pmvr_created_at_idx ON published_mcp_validation_runs(created_at);

        -- links_backlog: canonical HyperCode link backlog (BobbyBookmarks + future sources)
        CREATE TABLE IF NOT EXISTS links_backlog (
            uuid TEXT PRIMARY KEY,
            url TEXT NOT NULL,
            normalized_url TEXT NOT NULL UNIQUE,
            title TEXT,
            description TEXT,
            tags TEXT NOT NULL DEFAULT '[]',
            source TEXT NOT NULL DEFAULT 'manual',
            is_duplicate INTEGER NOT NULL DEFAULT 0,
            duplicate_of TEXT,
            research_status TEXT NOT NULL DEFAULT 'pending',
            http_status INTEGER,
            page_title TEXT,
            page_description TEXT,
            favicon_url TEXT,
            researched_at INTEGER,
            cluster_id TEXT,
            bobbybookmarks_bookmark_id INTEGER,
            import_session_id INTEGER,
            raw_payload TEXT,
            synced_at INTEGER,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );

        CREATE INDEX IF NOT EXISTS links_backlog_normalized_url_idx ON links_backlog(normalized_url);
        CREATE INDEX IF NOT EXISTS links_backlog_source_idx ON links_backlog(source);
        CREATE INDEX IF NOT EXISTS links_backlog_research_status_idx ON links_backlog(research_status);
        CREATE INDEX IF NOT EXISTS links_backlog_cluster_id_idx ON links_backlog(cluster_id);
        CREATE INDEX IF NOT EXISTS links_backlog_synced_at_idx ON links_backlog(synced_at);

        -- Browser Data
        CREATE TABLE IF NOT EXISTS web_memories (
            id TEXT PRIMARY KEY,
            url TEXT NOT NULL,
            normalized_url TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            selected_text TEXT,
            tags TEXT NOT NULL DEFAULT '[]',
            favicon TEXT,
            source TEXT NOT NULL,
            content_hash TEXT NOT NULL,
            saved_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );

        CREATE TABLE IF NOT EXISTS browser_history (
            id TEXT PRIMARY KEY,
            url TEXT NOT NULL,
            title TEXT NOT NULL,
            domain TEXT NOT NULL,
            visited_at INTEGER NOT NULL,
            visit_count INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS browser_console_logs (
            id TEXT PRIMARY KEY,
            level TEXT NOT NULL,
            message TEXT NOT NULL,
            source TEXT NOT NULL,
            url TEXT,
            line_number INTEGER,
            timestamp INTEGER NOT NULL
        );

        -- Tool Chaining
        CREATE TABLE IF NOT EXISTS tool_chains (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            trigger_pattern TEXT,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );

        CREATE TABLE IF NOT EXISTS tool_chain_steps (
            id TEXT PRIMARY KEY,
            chain_id TEXT NOT NULL,
            step_order INTEGER NOT NULL,
            tool_name TEXT NOT NULL,
            arguments_template TEXT NOT NULL,
            timeout_ms INTEGER,
            failure_policy TEXT NOT NULL DEFAULT 'abort',
            retry_count INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (chain_id) REFERENCES tool_chains(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tool_aliases (
            alias TEXT PRIMARY KEY,
            target_tool TEXT NOT NULL,
            description TEXT,
            default_arguments TEXT NOT NULL DEFAULT '{}',
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );

        -- Council Tables
        CREATE TABLE IF NOT EXISTS council_debates (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            session_id TEXT,
            workspace_id TEXT,
            task_type TEXT NOT NULL DEFAULT 'general',
            status TEXT NOT NULL DEFAULT 'completed',
            consensus REAL NOT NULL DEFAULT 0,
            weighted_consensus REAL NOT NULL DEFAULT 0,
            outcome TEXT NOT NULL,
            rounds INTEGER NOT NULL DEFAULT 1,
            timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            data TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_council_debates_session ON council_debates(session_id);
        CREATE INDEX IF NOT EXISTS idx_council_debates_timestamp ON council_debates(timestamp);

        CREATE TABLE IF NOT EXISTS council_workspaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            config TEXT NOT NULL DEFAULT '{}',
            description TEXT,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );

        CREATE TABLE IF NOT EXISTS workspace_secrets (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );

        CREATE TABLE IF NOT EXISTS imported_sessions (
            uuid TEXT PRIMARY KEY,
            source_tool TEXT NOT NULL,
            source_path TEXT NOT NULL,
            external_session_id TEXT,
            title TEXT,
            session_format TEXT NOT NULL DEFAULT 'generic',
            transcript TEXT NOT NULL,
            excerpt TEXT,
            working_directory TEXT,
            transcript_hash TEXT NOT NULL UNIQUE,
            transcript_archive_path TEXT,
            transcript_metadata_archive_path TEXT,
            transcript_archive_format TEXT,
            transcript_stored_bytes INTEGER,
            normalized_session TEXT NOT NULL,
            metadata TEXT NOT NULL DEFAULT '{}',
            discovered_at INTEGER NOT NULL,
            imported_at INTEGER NOT NULL,
            last_modified_at INTEGER,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );

        CREATE INDEX IF NOT EXISTS idx_imported_sessions_tool ON imported_sessions(source_tool);
        CREATE INDEX IF NOT EXISTS idx_imported_sessions_path ON imported_sessions(source_path);
        CREATE INDEX IF NOT EXISTS idx_imported_sessions_hash ON imported_sessions(transcript_hash);

        CREATE TABLE IF NOT EXISTS imported_session_memories (
            uuid TEXT PRIMARY KEY,
            imported_session_uuid TEXT NOT NULL,
            memory_index INTEGER NOT NULL,
            kind TEXT NOT NULL DEFAULT 'memory',
            content TEXT NOT NULL,
            tags TEXT NOT NULL DEFAULT '[]',
            source TEXT NOT NULL DEFAULT 'heuristic',
            metadata TEXT NOT NULL DEFAULT '{}',
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (imported_session_uuid) REFERENCES imported_sessions(uuid) ON DELETE CASCADE,
            UNIQUE (imported_session_uuid, memory_index)
        );

        CREATE INDEX IF NOT EXISTS idx_imported_session_memories_session ON imported_session_memories(imported_session_uuid);
        CREATE INDEX IF NOT EXISTS idx_imported_session_memories_kind ON imported_session_memories(kind);

        CREATE INDEX IF NOT EXISTS idx_council_workspaces_status ON council_workspaces(status);
    `);

    // Dynamic Migrations for existing databases
    try {
        const tableInfo = database.pragma("table_info(mcp_servers)") as Array<{ name: string }>;
        const hasAlwaysOn = tableInfo.some((col) => col.name === "always_on");
        if (!hasAlwaysOn) {
            database.exec(`ALTER TABLE mcp_servers ADD COLUMN always_on INTEGER NOT NULL DEFAULT 0;`);
            console.info("[DB Migration] Added 'always_on' column to mcp_servers table.");
        }
        const hasSourceCatalogUuid = tableInfo.some((col) => col.name === "source_published_server_uuid");
        if (!hasSourceCatalogUuid) {
            database.exec(`ALTER TABLE mcp_servers ADD COLUMN source_published_server_uuid TEXT;`);
            console.info("[DB Migration] Added 'source_published_server_uuid' column to mcp_servers table.");
        }
    } catch (err) {
        console.warn("[DB Migration] Failed to alter mcp_servers table:", err);
    }

    try {
        const tableInfo = database.pragma("table_info(tools)") as Array<{ name: string }>;
        const hasAlwaysOn = tableInfo.some((col) => col.name === "always_on");
        if (!hasAlwaysOn) {
            database.exec(`ALTER TABLE tools ADD COLUMN always_on INTEGER NOT NULL DEFAULT 0;`);
            console.info("[DB Migration] Added 'always_on' column to tools table.");
        }
    } catch (err) {
        console.warn("[DB Migration] Failed to alter tools table:", err);
    }

    try {
        const tableInfo = database.pragma("table_info(imported_sessions)") as Array<{ name: string }>;
        const ensureColumn = (name: string, sqlText: string) => {
            if (!tableInfo.some((col) => col.name === name)) {
                database.exec(sqlText);
                console.info(`[DB Migration] Added '${name}' column to imported_sessions table.`);
            }
        };

        ensureColumn("transcript_archive_path", `ALTER TABLE imported_sessions ADD COLUMN transcript_archive_path TEXT;`);
        ensureColumn(
            "transcript_metadata_archive_path",
            `ALTER TABLE imported_sessions ADD COLUMN transcript_metadata_archive_path TEXT;`,
        );
        ensureColumn("transcript_archive_format", `ALTER TABLE imported_sessions ADD COLUMN transcript_archive_format TEXT;`);
        ensureColumn("transcript_stored_bytes", `ALTER TABLE imported_sessions ADD COLUMN transcript_stored_bytes INTEGER;`);
    } catch (err) {
        console.warn("[DB Migration] Failed to alter imported_sessions table:", err);
    }
}

const dbPath = process.env.DATABASE_URL || "metamcp.db";
const resolvedDbPath = dbPath.startsWith("file:")
    ? dbPath.slice(5)
    : path.resolve(process.cwd(), dbPath);
const dbDir = path.dirname(resolvedDbPath);

function createDrizzleDatabase(sqlite: BetterSqlite3Database) {
    return drizzle(sqlite, { schema });
}

type HyperDb = ReturnType<typeof createDrizzleDatabase>;

type SqliteRuntime = {
    sqlite: BetterSqlite3Database;
    db: HyperDb;
};

let sqliteRuntime: SqliteRuntime | null = null;
let sqliteInitializationError: unknown = null;

function buildSqliteUnavailableError(error: unknown): Error {
    const reason = error instanceof Error ? error.message : String(error);
    const wrapped = new Error(
        `SQLite runtime is unavailable for HyperCode DB-backed features (${reason}). ` +
        `The control plane can still start, but SQLite-backed routes and services remain unavailable until better-sqlite3 loads successfully.`,
    );
    if (error instanceof Error) {
        Object.defineProperty(wrapped, "cause", {
            value: error,
            enumerable: false,
            configurable: true,
            writable: true,
        });
    }

    return wrapped;
}

function ensureSqliteRuntime(): SqliteRuntime {
    if (sqliteRuntime) {
        return sqliteRuntime;
    }

    if (sqliteInitializationError) {
        throw buildSqliteUnavailableError(sqliteInitializationError);
    }

    try {
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        const Database = require("better-sqlite3") as BetterSqlite3Constructor;
        const sqlite = new Database(resolvedDbPath);
        initializeSchema(sqlite);

        sqliteRuntime = {
            sqlite,
            db: createDrizzleDatabase(sqlite),
        };

        return sqliteRuntime;
    } catch (error) {
        sqliteInitializationError = error;
        if (isSqliteUnavailableError(error)) {
            throw buildSqliteUnavailableError(error);
        }
        throw error;
    }
}

function createLazyProxy<T extends object>(resolveValue: () => T): T {
    const target = {} as T;

    return new Proxy(target, {
        get(_target, property, receiver) {
            return Reflect.get(resolveValue(), property, receiver);
        },
        set(_target, property, value, receiver) {
            return Reflect.set(resolveValue(), property, value, receiver);
        },
        has(_target, property) {
            return Reflect.has(resolveValue(), property);
        },
        ownKeys() {
            return Reflect.ownKeys(resolveValue());
        },
        getOwnPropertyDescriptor(_target, property) {
            const descriptor = Object.getOwnPropertyDescriptor(resolveValue(), property);
            if (!descriptor) {
                return undefined;
            }

            return {
                ...descriptor,
                configurable: true,
            };
        },
    });
}

export const sqliteInstance: BetterSqlite3Database = createLazyProxy(() => ensureSqliteRuntime().sqlite);
export const db: HyperDb = createLazyProxy(() => ensureSqliteRuntime().db);

// Export the schema for convenience
export { schema };
