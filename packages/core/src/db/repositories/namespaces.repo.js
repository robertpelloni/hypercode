"use strict";
/**
 * @file namespaces.repo.ts
 * @module packages/core/src/db/repositories/namespaces.repo
 *
 * WHAT:
 * Repository for managing Namespaces.
 *
 * WHY:
 * Handles logical grouping of MCP servers/tools.
 * Manages mappings between Namespaces, Servers, and Tools.
 *
 * HOW:
 * - Uses inferred Drizzle typing instead of cast/suppress patterns.
 * - Preserves mapping refresh semantics during namespace update.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.namespacesRepository = exports.NamespacesRepository = void 0;
var drizzle_orm_1 = require("drizzle-orm");
var index_js_1 = require("../index.js");
var metamcp_schema_js_1 = require("../metamcp-schema.js");
var node_crypto_1 = require("node:crypto");
var namespace_mappings_repo_js_1 = require("./namespace-mappings.repo.js");
var namespaceSelect = {
    uuid: metamcp_schema_js_1.namespacesTable.uuid,
    name: metamcp_schema_js_1.namespacesTable.name,
    description: metamcp_schema_js_1.namespacesTable.description,
    created_at: metamcp_schema_js_1.namespacesTable.created_at,
    updated_at: metamcp_schema_js_1.namespacesTable.updated_at,
    user_id: metamcp_schema_js_1.namespacesTable.user_id,
};
var NamespacesRepository = /** @class */ (function () {
    function NamespacesRepository() {
    }
    NamespacesRepository.prototype.create = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, createdNamespace, mappings, serverTools, toolMappings;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        payload = {
                            uuid: (0, node_crypto_1.randomUUID)(),
                            name: input.name,
                            description: (_a = input.description) !== null && _a !== void 0 ? _a : null,
                            user_id: (_b = input.user_id) !== null && _b !== void 0 ? _b : null,
                        };
                        return [4 /*yield*/, index_js_1.db
                                .insert(metamcp_schema_js_1.namespacesTable)
                                .values(payload)
                                .returning(namespaceSelect)];
                    case 1:
                        createdNamespace = (_c.sent())[0];
                        if (!createdNamespace) {
                            throw new Error("Failed to create namespace");
                        }
                        if (!(input.mcpServerUuids && input.mcpServerUuids.length > 0)) return [3 /*break*/, 5];
                        mappings = input.mcpServerUuids.map(function (serverUuid) { return ({
                            uuid: (0, node_crypto_1.randomUUID)(),
                            namespace_uuid: createdNamespace.uuid,
                            mcp_server_uuid: serverUuid,
                            status: "ACTIVE",
                        }); });
                        return [4 /*yield*/, index_js_1.db.insert(metamcp_schema_js_1.namespaceServerMappingsTable).values(mappings)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, index_js_1.db
                                .select({
                                uuid: metamcp_schema_js_1.toolsTable.uuid,
                                mcp_server_uuid: metamcp_schema_js_1.toolsTable.mcp_server_uuid,
                            })
                                .from(metamcp_schema_js_1.toolsTable)
                                .where((0, drizzle_orm_1.inArray)(metamcp_schema_js_1.toolsTable.mcp_server_uuid, input.mcpServerUuids))];
                    case 3:
                        serverTools = _c.sent();
                        if (!(serverTools.length > 0)) return [3 /*break*/, 5];
                        toolMappings = serverTools.map(function (tool) { return ({
                            uuid: (0, node_crypto_1.randomUUID)(),
                            namespace_uuid: createdNamespace.uuid,
                            tool_uuid: tool.uuid,
                            mcp_server_uuid: tool.mcp_server_uuid,
                            status: "ACTIVE",
                        }); });
                        return [4 /*yield*/, index_js_1.db.insert(metamcp_schema_js_1.namespaceToolMappingsTable).values(toolMappings)];
                    case 4:
                        _c.sent();
                        _c.label = 5;
                    case 5: return [2 /*return*/, createdNamespace];
                }
            });
        });
    };
    NamespacesRepository.prototype.findAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select(namespaceSelect)
                            .from(metamcp_schema_js_1.namespacesTable)
                            .orderBy((0, drizzle_orm_1.desc)(metamcp_schema_js_1.namespacesTable.created_at))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Find namespaces accessible to a specific user (public + user's own namespaces)
    NamespacesRepository.prototype.findAllAccessibleToUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select(namespaceSelect)
                            .from(metamcp_schema_js_1.namespacesTable)
                            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(metamcp_schema_js_1.namespacesTable.user_id), (0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespacesTable.user_id, userId)))
                            .orderBy((0, drizzle_orm_1.desc)(metamcp_schema_js_1.namespacesTable.created_at))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Find only public namespaces (no user ownership)
    NamespacesRepository.prototype.findPublicNamespaces = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select(namespaceSelect)
                            .from(metamcp_schema_js_1.namespacesTable)
                            .where((0, drizzle_orm_1.isNull)(metamcp_schema_js_1.namespacesTable.user_id))
                            .orderBy((0, drizzle_orm_1.desc)(metamcp_schema_js_1.namespacesTable.created_at))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Find namespaces owned by a specific user
    NamespacesRepository.prototype.findByUserId = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select(namespaceSelect)
                            .from(metamcp_schema_js_1.namespacesTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespacesTable.user_id, userId))
                            .orderBy((0, drizzle_orm_1.desc)(metamcp_schema_js_1.namespacesTable.created_at))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    NamespacesRepository.prototype.findByUuid = function (uuid) {
        return __awaiter(this, void 0, void 0, function () {
            var namespace;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select(namespaceSelect)
                            .from(metamcp_schema_js_1.namespacesTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespacesTable.uuid, uuid))];
                    case 1:
                        namespace = (_a.sent())[0];
                        return [2 /*return*/, namespace];
                }
            });
        });
    };
    // Find namespace by name within user scope (for uniqueness checks)
    NamespacesRepository.prototype.findByNameAndUserId = function (name, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var namespace;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select(namespaceSelect)
                            .from(metamcp_schema_js_1.namespacesTable)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespacesTable.name, name), userId
                            ? (0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespacesTable.user_id, userId)
                            : (0, drizzle_orm_1.isNull)(metamcp_schema_js_1.namespacesTable.user_id)))
                            .limit(1)];
                    case 1:
                        namespace = (_a.sent())[0];
                        return [2 /*return*/, namespace];
                }
            });
        });
    };
    NamespacesRepository.prototype.findByUuidWithServers = function (uuid) {
        return __awaiter(this, void 0, void 0, function () {
            var namespace, serversData, servers;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.findByUuid(uuid)];
                    case 1:
                        namespace = _a.sent();
                        if (!namespace) {
                            return [2 /*return*/, null];
                        }
                        return [4 /*yield*/, index_js_1.db
                                .select({
                                uuid: metamcp_schema_js_1.mcpServersTable.uuid,
                                name: metamcp_schema_js_1.mcpServersTable.name,
                                description: metamcp_schema_js_1.mcpServersTable.description,
                                type: metamcp_schema_js_1.mcpServersTable.type,
                                command: metamcp_schema_js_1.mcpServersTable.command,
                                args: metamcp_schema_js_1.mcpServersTable.args,
                                url: metamcp_schema_js_1.mcpServersTable.url,
                                env: metamcp_schema_js_1.mcpServersTable.env,
                                bearerToken: metamcp_schema_js_1.mcpServersTable.bearerToken,
                                headers: metamcp_schema_js_1.mcpServersTable.headers,
                                error_status: metamcp_schema_js_1.mcpServersTable.error_status,
                                created_at: metamcp_schema_js_1.mcpServersTable.created_at,
                                user_id: metamcp_schema_js_1.mcpServersTable.user_id,
                                status: metamcp_schema_js_1.namespaceServerMappingsTable.status,
                            })
                                .from(metamcp_schema_js_1.mcpServersTable)
                                .innerJoin(metamcp_schema_js_1.namespaceServerMappingsTable, (0, drizzle_orm_1.eq)(metamcp_schema_js_1.mcpServersTable.uuid, metamcp_schema_js_1.namespaceServerMappingsTable.mcp_server_uuid))
                                .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespaceServerMappingsTable.namespace_uuid, uuid))];
                    case 2:
                        serversData = _a.sent();
                        servers = serversData.map(function (server) { return (__assign(__assign({}, server), { args: server.args || [], env: server.env || {}, headers: server.headers || {} })); });
                        return [2 /*return*/, __assign(__assign({}, namespace), { servers: servers })];
                }
            });
        });
    };
    NamespacesRepository.prototype.findToolsByNamespaceUuid = function (namespaceUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var toolsData;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select({
                            // Tool fields
                            uuid: metamcp_schema_js_1.toolsTable.uuid,
                            name: metamcp_schema_js_1.toolsTable.name,
                            description: metamcp_schema_js_1.toolsTable.description,
                            toolSchema: metamcp_schema_js_1.toolsTable.toolSchema,
                            created_at: metamcp_schema_js_1.toolsTable.created_at,
                            updated_at: metamcp_schema_js_1.toolsTable.updated_at,
                            mcp_server_uuid: metamcp_schema_js_1.toolsTable.mcp_server_uuid,
                            // Server fields
                            serverName: metamcp_schema_js_1.mcpServersTable.name,
                            serverUuid: metamcp_schema_js_1.mcpServersTable.uuid,
                            // Namespace mapping fields
                            status: metamcp_schema_js_1.namespaceToolMappingsTable.status,
                            overrideName: metamcp_schema_js_1.namespaceToolMappingsTable.override_name,
                            overrideTitle: metamcp_schema_js_1.namespaceToolMappingsTable.override_title,
                            overrideDescription: metamcp_schema_js_1.namespaceToolMappingsTable.override_description,
                            overrideAnnotations: metamcp_schema_js_1.namespaceToolMappingsTable.override_annotations,
                        })
                            .from(metamcp_schema_js_1.toolsTable)
                            .innerJoin(metamcp_schema_js_1.namespaceToolMappingsTable, (0, drizzle_orm_1.eq)(metamcp_schema_js_1.toolsTable.uuid, metamcp_schema_js_1.namespaceToolMappingsTable.tool_uuid))
                            .innerJoin(metamcp_schema_js_1.mcpServersTable, (0, drizzle_orm_1.eq)(metamcp_schema_js_1.toolsTable.mcp_server_uuid, metamcp_schema_js_1.mcpServersTable.uuid))
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespaceToolMappingsTable.namespace_uuid, namespaceUuid))
                            .orderBy((0, drizzle_orm_1.desc)(metamcp_schema_js_1.toolsTable.created_at))];
                    case 1:
                        toolsData = _a.sent();
                        return [2 /*return*/, toolsData];
                }
            });
        });
    };
    NamespacesRepository.prototype.deleteByUuid = function (uuid) {
        return __awaiter(this, void 0, void 0, function () {
            var deletedNamespace;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .delete(metamcp_schema_js_1.namespacesTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespacesTable.uuid, uuid))
                            .returning(namespaceSelect)];
                    case 1:
                        deletedNamespace = (_a.sent())[0];
                        return [2 /*return*/, deletedNamespace];
                }
            });
        });
    };
    NamespacesRepository.prototype.update = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var updatedNamespace, existingToolMappings, existingToolStatusMap_1, serverMappings, serverTools, toolMappings;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .update(metamcp_schema_js_1.namespacesTable)
                            .set({
                            name: input.name,
                            description: (_a = input.description) !== null && _a !== void 0 ? _a : null,
                            user_id: (_b = input.user_id) !== null && _b !== void 0 ? _b : null,
                            updated_at: new Date(),
                        })
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespacesTable.uuid, input.uuid))
                            .returning(namespaceSelect)];
                    case 1:
                        updatedNamespace = (_c.sent())[0];
                        if (!updatedNamespace) {
                            throw new Error("Namespace not found");
                        }
                        if (!input.mcpServerUuids) return [3 /*break*/, 8];
                        return [4 /*yield*/, namespace_mappings_repo_js_1.namespaceMappingsRepository.findToolMappingsByNamespace(input.uuid)];
                    case 2:
                        existingToolMappings = _c.sent();
                        existingToolStatusMap_1 = new Map();
                        // Create a map of existing tool statuses by tool_uuid.
                        existingToolMappings.forEach(function (mapping) {
                            existingToolStatusMap_1.set(mapping.tool_uuid, mapping.status);
                        });
                        // Delete existing server mappings.
                        return [4 /*yield*/, index_js_1.db
                                .delete(metamcp_schema_js_1.namespaceServerMappingsTable)
                                .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespaceServerMappingsTable.namespace_uuid, input.uuid))];
                    case 3:
                        // Delete existing server mappings.
                        _c.sent();
                        // Delete existing tool mappings.
                        return [4 /*yield*/, index_js_1.db
                                .delete(metamcp_schema_js_1.namespaceToolMappingsTable)
                                .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespaceToolMappingsTable.namespace_uuid, input.uuid))];
                    case 4:
                        // Delete existing tool mappings.
                        _c.sent();
                        if (!(input.mcpServerUuids.length > 0)) return [3 /*break*/, 8];
                        serverMappings = input.mcpServerUuids.map(function (serverUuid) { return ({
                            uuid: (0, node_crypto_1.randomUUID)(),
                            namespace_uuid: input.uuid,
                            mcp_server_uuid: serverUuid,
                            status: "ACTIVE",
                        }); });
                        return [4 /*yield*/, index_js_1.db.insert(metamcp_schema_js_1.namespaceServerMappingsTable).values(serverMappings)];
                    case 5:
                        _c.sent();
                        return [4 /*yield*/, index_js_1.db
                                .select({
                                uuid: metamcp_schema_js_1.toolsTable.uuid,
                                mcp_server_uuid: metamcp_schema_js_1.toolsTable.mcp_server_uuid,
                            })
                                .from(metamcp_schema_js_1.toolsTable)
                                .where((0, drizzle_orm_1.inArray)(metamcp_schema_js_1.toolsTable.mcp_server_uuid, input.mcpServerUuids))];
                    case 6:
                        serverTools = _c.sent();
                        if (!(serverTools.length > 0)) return [3 /*break*/, 8];
                        toolMappings = serverTools.map(function (tool) { return ({
                            uuid: (0, node_crypto_1.randomUUID)(),
                            namespace_uuid: input.uuid,
                            tool_uuid: tool.uuid,
                            mcp_server_uuid: tool.mcp_server_uuid,
                            // Preserve existing status if tool was previously mapped, otherwise default to ACTIVE.
                            status: existingToolStatusMap_1.get(tool.uuid) || "ACTIVE",
                        }); });
                        return [4 /*yield*/, index_js_1.db.insert(metamcp_schema_js_1.namespaceToolMappingsTable).values(toolMappings)];
                    case 7:
                        _c.sent();
                        _c.label = 8;
                    case 8: return [2 /*return*/, updatedNamespace];
                }
            });
        });
    };
    return NamespacesRepository;
}());
exports.NamespacesRepository = NamespacesRepository;
exports.namespacesRepository = new NamespacesRepository();
