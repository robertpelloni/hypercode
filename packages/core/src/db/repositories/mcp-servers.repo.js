"use strict";
/**
 * @file mcp-servers.repo.ts
 * @module packages/core/src/db/repositories/mcp-servers.repo
 *
 * WHAT:
 * Repository for managing MCP Servers in the database.
 *
 * WHY:
 * Handles CRUD operations for MCP Servers, including user scoping and validation.
 *
 * HOW:
 * - Uses Drizzle ORM to query `mcpServersTable`.
 * - Handles PostgreSQL errors via `handleDatabaseError` (adapted for likely SQLite usage).
 * - Manages 'ACTIVE'/'INACTIVE' status.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mcpServersRepository = exports.McpServersRepository = void 0;
var drizzle_orm_1 = require("drizzle-orm");
var node_crypto_1 = require("node:crypto");
var fs = require("fs/promises");
var path = require("path");
// Keep console-backed logger until centralized logger wiring is introduced in this package.
var logger = console;
var index_js_1 = require("../index.js");
var metamcp_schema_js_1 = require("../metamcp-schema.js");
function normalizeErrorStatus(status) {
    // The shared Zod enum includes "ERROR" for legacy compatibility,
    // but the DB column only accepts concrete error categories.
    return status === "ERROR" ? "INTERNAL_ERROR" : status;
}
// Helper function to handle Database errors (PostgreSQL & SQLite)
function handleDatabaseError(error, operation, serverName) {
    logger.error("Database error in ".concat(operation, ":"), error);
    // Simplified error handling for Phase 1
    // We can expand this to check for specific PG/SQLite codes later
    // e.g. SQLite "SQLITE_CONSTRAINT: UNIQUE constraint failed"
    var errString = String(error);
    if (errString.includes("UNIQUE constraint failed") || errString.includes("23505")) {
        throw new Error("Server name \"".concat(serverName, "\" already exists. Server names must be unique within your scope."));
    }
    // Handle regex constraint (Check constraint in PG, might be trigger or app logic in SQLite)
    // We rely on Zod validation mostly, but DB constraints catch edge cases.
    // For any other database errors, throw a generic user-friendly message
    throw new Error("Failed to ".concat(operation, " MCP server. Please check your input and try again."));
}
var McpServersRepository = /** @class */ (function () {
    function McpServersRepository() {
    }
    McpServersRepository.prototype.create = function (input, options) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, createdServer, error_1;
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        _j.trys.push([0, 4, , 5]);
                        payload = {
                            uuid: (0, node_crypto_1.randomUUID)(),
                            name: input.name,
                            description: (_a = input.description) !== null && _a !== void 0 ? _a : null,
                            type: input.type,
                            command: (_b = input.command) !== null && _b !== void 0 ? _b : null,
                            args: (_c = input.args) !== null && _c !== void 0 ? _c : [],
                            env: (_d = input.env) !== null && _d !== void 0 ? _d : {},
                            url: (_e = input.url) !== null && _e !== void 0 ? _e : null,
                            bearerToken: (_f = input.bearerToken) !== null && _f !== void 0 ? _f : null,
                            headers: (_g = input.headers) !== null && _g !== void 0 ? _g : {},
                            user_id: (_h = input.user_id) !== null && _h !== void 0 ? _h : "system",
                        };
                        return [4 /*yield*/, index_js_1.db
                                .insert(metamcp_schema_js_1.mcpServersTable)
                                .values(payload)
                                .returning()];
                    case 1:
                        createdServer = (_j.sent())[0];
                        if (!!(options === null || options === void 0 ? void 0 : options.skipSync)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.syncToMcpJson()];
                    case 2:
                        _j.sent();
                        _j.label = 3;
                    case 3: return [2 /*return*/, createdServer];
                    case 4:
                        error_1 = _j.sent();
                        handleDatabaseError(error_1, "create", input.name);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    McpServersRepository.prototype.findAll = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        if (!userId) return [3 /*break*/, 2];
                        return [4 /*yield*/, index_js_1.db
                                .select()
                                .from(metamcp_schema_js_1.mcpServersTable)
                                .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.mcpServersTable.user_id, userId))];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2: return [4 /*yield*/, index_js_1.db.select().from(metamcp_schema_js_1.mcpServersTable)];
                    case 3: return [2 /*return*/, _a.sent()];
                    case 4:
                        error_2 = _a.sent();
                        handleDatabaseError(error_2, "findAll");
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    McpServersRepository.prototype.findPublicMcpServers = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, index_js_1.db
                                .select()
                                .from(metamcp_schema_js_1.mcpServersTable)
                                .where((0, drizzle_orm_1.isNull)(metamcp_schema_js_1.mcpServersTable.user_id))];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_3 = _a.sent();
                        handleDatabaseError(error_3, "findPublicMcpServers");
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    McpServersRepository.prototype.findAccessibleToUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, index_js_1.db
                                .select()
                                .from(metamcp_schema_js_1.mcpServersTable)
                                .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(metamcp_schema_js_1.mcpServersTable.user_id, userId), (0, drizzle_orm_1.isNull)(metamcp_schema_js_1.mcpServersTable.user_id)))];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_4 = _a.sent();
                        handleDatabaseError(error_4, "findAccessibleToUser");
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    McpServersRepository.prototype.findByUuid = function (uuid) {
        return __awaiter(this, void 0, void 0, function () {
            var server, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, index_js_1.db
                                .select()
                                .from(metamcp_schema_js_1.mcpServersTable)
                                .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.mcpServersTable.uuid, uuid))];
                    case 1:
                        server = (_a.sent())[0];
                        return [2 /*return*/, server];
                    case 2:
                        error_5 = _a.sent();
                        handleDatabaseError(error_5, "findByUuid");
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    McpServersRepository.prototype.findByName = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            var server, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, index_js_1.db
                                .select()
                                .from(metamcp_schema_js_1.mcpServersTable)
                                .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.mcpServersTable.name, name))];
                    case 1:
                        server = (_a.sent())[0];
                        return [2 /*return*/, server];
                    case 2:
                        error_6 = _a.sent();
                        handleDatabaseError(error_6, "findByName");
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Find server by name within user scope (for uniqueness checks)
    McpServersRepository.prototype.findByNameAndUserId = function (name, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var server;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select() // .select() implicit returns all fields in Drizzle usually, but better to be safe
                            .from(metamcp_schema_js_1.mcpServersTable)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(metamcp_schema_js_1.mcpServersTable.name, name), userId
                            ? (0, drizzle_orm_1.eq)(metamcp_schema_js_1.mcpServersTable.user_id, userId)
                            : (0, drizzle_orm_1.isNull)(metamcp_schema_js_1.mcpServersTable.user_id)))
                            .limit(1)];
                    case 1:
                        server = (_a.sent())[0];
                        return [2 /*return*/, server];
                }
            });
        });
    };
    McpServersRepository.prototype.findByUuidAndUser = function (uuid, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var server, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, index_js_1.db
                                .select()
                                .from(metamcp_schema_js_1.mcpServersTable)
                                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(metamcp_schema_js_1.mcpServersTable.uuid, uuid), (0, drizzle_orm_1.eq)(metamcp_schema_js_1.mcpServersTable.user_id, userId)))];
                    case 1:
                        server = (_a.sent())[0];
                        return [2 /*return*/, server];
                    case 2:
                        error_7 = _a.sent();
                        handleDatabaseError(error_7, "findByUuidAndUser");
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    McpServersRepository.prototype.deleteByUuid = function (uuid) {
        return __awaiter(this, void 0, void 0, function () {
            var deletedServer;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .delete(metamcp_schema_js_1.mcpServersTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.mcpServersTable.uuid, uuid))
                            .returning()];
                    case 1:
                        deletedServer = (_a.sent())[0];
                        return [4 /*yield*/, this.syncToMcpJson()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, deletedServer];
                }
            });
        });
    };
    McpServersRepository.prototype.update = function (input, options) {
        return __awaiter(this, void 0, void 0, function () {
            var uuid, user_id, updates, payload, updatedServer, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        uuid = input.uuid, user_id = input.user_id, updates = __rest(input, ["uuid", "user_id"]);
                        payload = __assign(__assign({}, updates), (user_id === undefined
                            ? {}
                            : { user_id: user_id !== null && user_id !== void 0 ? user_id : "system" }));
                        return [4 /*yield*/, index_js_1.db
                                .update(metamcp_schema_js_1.mcpServersTable)
                                .set(payload)
                                .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.mcpServersTable.uuid, uuid))
                                .returning()];
                    case 1:
                        updatedServer = (_a.sent())[0];
                        if (!updatedServer) {
                            throw new Error("MCP Server with UUID ".concat(input.uuid, " not found."));
                        }
                        if (!!(options === null || options === void 0 ? void 0 : options.skipSync)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.syncToMcpJson()];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/, updatedServer];
                    case 4:
                        error_8 = _a.sent();
                        handleDatabaseError(error_8, "update", input.name);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    McpServersRepository.prototype.updateErrorStatus = function (uuid, status) {
        return __awaiter(this, void 0, void 0, function () {
            var error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, index_js_1.db
                                .update(metamcp_schema_js_1.mcpServersTable)
                                .set({ error_status: normalizeErrorStatus(status) })
                                .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.mcpServersTable.uuid, uuid))];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_9 = _a.sent();
                        handleDatabaseError(error_9, "updateErrorStatus");
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    McpServersRepository.prototype.bulkCreate = function (servers) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, result, error_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        payload = servers.map(function (server) {
                            var _a, _b, _c, _d, _e, _f, _g, _h;
                            return ({
                                uuid: (0, node_crypto_1.randomUUID)(),
                                name: server.name,
                                description: (_a = server.description) !== null && _a !== void 0 ? _a : null,
                                type: server.type,
                                command: (_b = server.command) !== null && _b !== void 0 ? _b : null,
                                args: (_c = server.args) !== null && _c !== void 0 ? _c : [],
                                env: (_d = server.env) !== null && _d !== void 0 ? _d : {},
                                url: (_e = server.url) !== null && _e !== void 0 ? _e : null,
                                bearerToken: (_f = server.bearerToken) !== null && _f !== void 0 ? _f : null,
                                headers: (_g = server.headers) !== null && _g !== void 0 ? _g : {},
                                user_id: (_h = server.user_id) !== null && _h !== void 0 ? _h : "system",
                            });
                        });
                        return [4 /*yield*/, index_js_1.db.insert(metamcp_schema_js_1.mcpServersTable).values(payload).returning()];
                    case 1:
                        result = _a.sent();
                        return [4 /*yield*/, this.syncToMcpJson()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, result];
                    case 3:
                        error_10 = _a.sent();
                        // Simplified bulk error handling
                        console.error("Database error in bulk create:", error_10);
                        throw new Error("Failed to bulk create MCP servers. Please check your input and try again.");
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    McpServersRepository.prototype.updateServerErrorStatus = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var updatedServer;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .update(metamcp_schema_js_1.mcpServersTable)
                            .set({
                            error_status: normalizeErrorStatus(input.errorStatus),
                        })
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.mcpServersTable.uuid, input.serverUuid))
                            .returning()];
                    case 1:
                        updatedServer = (_a.sent())[0];
                        // Note: We generally don't sync status updates to mcp.json as it's a configuration file
                        return [2 /*return*/, updatedServer];
                }
            });
        });
    };
    McpServersRepository.prototype.syncToMcpJson = function () {
        return __awaiter(this, void 0, void 0, function () {
            var allServers, jsonOutput, _i, allServers_1, server, config, mcpJsonPath, error_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.findAll()];
                    case 1:
                        allServers = _a.sent();
                        jsonOutput = { mcpServers: {} };
                        for (_i = 0, allServers_1 = allServers; _i < allServers_1.length; _i++) {
                            server = allServers_1[_i];
                            // Skip if name is invalid or missing
                            if (!server.name)
                                continue;
                            config = {
                                command: server.command,
                                args: server.args,
                                env: server.env,
                            };
                            // Only include fields if they are relevant/present
                            if (!config.command)
                                delete config.command;
                            if (!config.args || config.args.length === 0)
                                delete config.args;
                            if (!config.env || Object.keys(config.env).length === 0)
                                delete config.env;
                            // Handle different types if needed (e.g. SSE url)
                            if (server.type !== 'STDIO' && server.url) {
                                config.url = server.url;
                            }
                            // If specialized type, might iterate on schema
                            // For now, mapping simplified 'stdio' style config
                            jsonOutput.mcpServers[server.name] = config;
                        }
                        mcpJsonPath = path.resolve(process.cwd(), "mcp.json");
                        return [4 /*yield*/, fs.writeFile(mcpJsonPath, JSON.stringify(jsonOutput, null, 2), "utf-8")];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_11 = _a.sent();
                        console.error("Failed to sync mcp.json:", error_11);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return McpServersRepository;
}());
exports.McpServersRepository = McpServersRepository;
exports.mcpServersRepository = new McpServersRepository();
