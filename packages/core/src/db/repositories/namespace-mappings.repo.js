"use strict";
/**
 * @file namespace-mappings.repo.ts
 * @module packages/core/src/db/repositories/namespace-mappings.repo
 *
 * WHAT:
 * Repository for Namespace Mappings.
 *
 * WHY:
 * Helper repository for updating statuses and overrides in many-to-many link tables.
 */
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
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
exports.namespaceMappingsRepository = exports.NamespaceMappingsRepository = void 0;
var drizzle_orm_1 = require("drizzle-orm");
var node_crypto_1 = require("node:crypto");
var index_js_1 = require("../index.js");
var metamcp_schema_js_1 = require("../metamcp-schema.js");
var NamespaceMappingsRepository = /** @class */ (function () {
    function NamespaceMappingsRepository() {
    }
    NamespaceMappingsRepository.prototype.updateServerStatus = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var updatedMapping;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .update(metamcp_schema_js_1.namespaceServerMappingsTable)
                            .set({
                            status: input.status,
                        })
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespaceServerMappingsTable.namespace_uuid, input.namespaceUuid), (0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespaceServerMappingsTable.mcp_server_uuid, input.serverUuid)))
                            .returning()];
                    case 1:
                        updatedMapping = (_a.sent())[0];
                        return [2 /*return*/, updatedMapping];
                }
            });
        });
    };
    NamespaceMappingsRepository.prototype.updateToolStatus = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var updatedMapping;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .update(metamcp_schema_js_1.namespaceToolMappingsTable)
                            .set({
                            status: input.status,
                        })
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespaceToolMappingsTable.namespace_uuid, input.namespaceUuid), (0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespaceToolMappingsTable.tool_uuid, input.toolUuid), (0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespaceToolMappingsTable.mcp_server_uuid, input.serverUuid)))
                            .returning()];
                    case 1:
                        updatedMapping = (_a.sent())[0];
                        return [2 /*return*/, updatedMapping];
                }
            });
        });
    };
    NamespaceMappingsRepository.prototype.updateToolOverrides = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var updatedMapping;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .update(metamcp_schema_js_1.namespaceToolMappingsTable)
                            .set({
                            override_name: input.overrideName,
                            override_title: input.overrideTitle,
                            override_description: input.overrideDescription,
                            override_annotations: input.overrideAnnotations,
                        })
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespaceToolMappingsTable.namespace_uuid, input.namespaceUuid), (0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespaceToolMappingsTable.tool_uuid, input.toolUuid), (0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespaceToolMappingsTable.mcp_server_uuid, input.serverUuid)))
                            .returning()];
                    case 1:
                        updatedMapping = (_a.sent())[0];
                        return [2 /*return*/, updatedMapping];
                }
            });
        });
    };
    NamespaceMappingsRepository.prototype.findServerMapping = function (namespaceUuid, serverUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var mapping;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select()
                            .from(metamcp_schema_js_1.namespaceServerMappingsTable)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespaceServerMappingsTable.namespace_uuid, namespaceUuid), (0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespaceServerMappingsTable.mcp_server_uuid, serverUuid)))];
                    case 1:
                        mapping = (_a.sent())[0];
                        return [2 /*return*/, mapping];
                }
            });
        });
    };
    /**
     * Find all namespace UUIDs that use a specific MCP server
     */
    NamespaceMappingsRepository.prototype.findNamespacesByServerUuid = function (serverUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var mappings;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select({
                            namespace_uuid: metamcp_schema_js_1.namespaceServerMappingsTable.namespace_uuid,
                        })
                            .from(metamcp_schema_js_1.namespaceServerMappingsTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespaceServerMappingsTable.mcp_server_uuid, serverUuid))];
                    case 1:
                        mappings = _a.sent();
                        return [2 /*return*/, mappings.map(function (mapping) { return mapping.namespace_uuid; })];
                }
            });
        });
    };
    /**
     * Get all existing tool mappings for a namespace
     */
    NamespaceMappingsRepository.prototype.findToolMappingsByNamespace = function (namespaceUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var mappings;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select()
                            .from(metamcp_schema_js_1.namespaceToolMappingsTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespaceToolMappingsTable.namespace_uuid, namespaceUuid))];
                    case 1:
                        mappings = _a.sent();
                        return [2 /*return*/, mappings];
                }
            });
        });
    };
    NamespaceMappingsRepository.prototype.findToolMapping = function (namespaceUuid, toolUuid, serverUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var mapping;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select()
                            .from(metamcp_schema_js_1.namespaceToolMappingsTable)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespaceToolMappingsTable.namespace_uuid, namespaceUuid), (0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespaceToolMappingsTable.tool_uuid, toolUuid), (0, drizzle_orm_1.eq)(metamcp_schema_js_1.namespaceToolMappingsTable.mcp_server_uuid, serverUuid)))];
                    case 1:
                        mapping = (_a.sent())[0];
                        return [2 /*return*/, mapping];
                }
            });
        });
    };
    /**
     * Bulk upsert namespace tool mappings for a namespace
     * Used when refreshing tools from MetaMCP connection
     */
    NamespaceMappingsRepository.prototype.bulkUpsertNamespaceToolMappings = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var mappingsToInsert;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!input.toolMappings || input.toolMappings.length === 0) {
                            return [2 /*return*/, []];
                        }
                        mappingsToInsert = input.toolMappings.map(function (mapping) { return ({
                            uuid: (0, node_crypto_1.randomUUID)(),
                            namespace_uuid: input.namespaceUuid,
                            tool_uuid: mapping.toolUuid,
                            mcp_server_uuid: mapping.serverUuid,
                            status: (mapping.status || "ACTIVE"),
                        }); });
                        return [4 /*yield*/, index_js_1.db
                                .insert(metamcp_schema_js_1.namespaceToolMappingsTable)
                                .values(mappingsToInsert)
                                .onConflictDoUpdate({
                                target: [
                                    metamcp_schema_js_1.namespaceToolMappingsTable.namespace_uuid,
                                    metamcp_schema_js_1.namespaceToolMappingsTable.tool_uuid,
                                ],
                                set: {
                                    status: (0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["excluded.status"], ["excluded.status"]))),
                                    mcp_server_uuid: (0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["excluded.mcp_server_uuid"], ["excluded.mcp_server_uuid"]))),
                                },
                            })
                                .returning()];
                    case 1: 
                    // Upsert the mappings - if they exist, update the status; if not, insert them
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return NamespaceMappingsRepository;
}());
exports.NamespaceMappingsRepository = NamespaceMappingsRepository;
exports.namespaceMappingsRepository = new NamespaceMappingsRepository();
var templateObject_1, templateObject_2;
