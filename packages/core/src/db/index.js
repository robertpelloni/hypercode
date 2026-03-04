"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = exports.db = void 0;
var better_sqlite3_1 = require("drizzle-orm/better-sqlite3");
var better_sqlite3_2 = require("better-sqlite3");
var schema = require("./metamcp-schema.js");
exports.schema = schema;
var dotenv = require("dotenv");
var path_1 = require("path");
dotenv.config();
// Default to SQLite local file
var dbPath = process.env.DATABASE_URL || "metamcp.db";
// Ensure we are using absolute path if it is a local file
var resolvedDbPath = dbPath.startsWith("file:")
    ? dbPath.slice(5)
    : path_1.default.resolve(process.cwd(), dbPath);
var sqlite = new better_sqlite3_2.default(resolvedDbPath);
exports.db = (0, better_sqlite3_1.drizzle)(sqlite, { schema: schema });
