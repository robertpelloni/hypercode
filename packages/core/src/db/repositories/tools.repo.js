"use strict";
/**
 * @file tools.repo.ts
 * @module packages/core/src/db/repositories/tools.repo
 *
 * WHAT:
 * Repository for managing MCP Tools.
 *
 * WHY:
 * Handles CRUD operations for Tools discovered from servers.
 * Supports bulk upserting tools during server synchronization.
 *
 * HOW:
 * - Upserts tools using `onConflictDoUpdate`.
 * - Handles bulk deletions of obsolete tools.
 * - Exposes a feature-flagged post-upsert hook for optional AI enhancement pipelines.
 */
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
exports.toolsRepository = exports.ToolsRepository = void 0;
var drizzle_orm_1 = require("drizzle-orm");
// import { descriptionEnhancerService } from "../../lib/ai/description-enhancer.service";
// import { toolSearchService } from "../../lib/ai/tool-search.service";
var index_js_1 = require("../index.js");
var metamcp_schema_js_1 = require("../metamcp-schema.js");
var node_crypto_1 = require("node:crypto");
function runPostUpsertHooks(tools) {
    // Optional future integration point for AI description enhancement / embeddings.
    // Disabled by default to preserve current behavior and avoid introducing hidden async side effects.
    if (process.env.ENABLE_TOOL_AI_POST_PROCESSING !== "true") {
        return;
    }
    if (tools.length === 0) {
        return;
    }
    console.info("[ToolsRepository] ENABLE_TOOL_AI_POST_PROCESSING=true; ".concat(tools.length, " tools queued for post-processing hook."));
}
var ToolsRepository = /** @class */ (function () {
    function ToolsRepository() {
    }
    ToolsRepository.prototype.findByMcpServerUuid = function (mcpServerUuid) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select()
                            .from(metamcp_schema_js_1.toolsTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.toolsTable.mcp_server_uuid, mcpServerUuid))
                            .orderBy(metamcp_schema_js_1.toolsTable.name)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ToolsRepository.prototype.findAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db.select().from(metamcp_schema_js_1.toolsTable).orderBy(metamcp_schema_js_1.toolsTable.name)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ToolsRepository.prototype.create = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, createdTool;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        payload = {
                            uuid: (0, node_crypto_1.randomUUID)(),
                            name: input.name,
                            description: (_a = input.description) !== null && _a !== void 0 ? _a : null,
                            toolSchema: input.toolSchema,
                            mcp_server_uuid: input.mcp_server_uuid,
                        };
                        return [4 /*yield*/, index_js_1.db.insert(metamcp_schema_js_1.toolsTable).values(payload).returning()];
                    case 1:
                        createdTool = (_b.sent())[0];
                        return [2 /*return*/, createdTool];
                }
            });
        });
    };
    ToolsRepository.prototype.bulkUpsert = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var toolsToInsert, results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!input.tools || input.tools.length === 0) {
                            return [2 /*return*/, []];
                        }
                        toolsToInsert = input.tools.map(function (tool) { return ({
                            uuid: (0, node_crypto_1.randomUUID)(),
                            name: tool.name,
                            description: tool.description || "",
                            // Cast to any to satisfy type checker if needed, but schema matches
                            toolSchema: __assign({ type: "object" }, tool.inputSchema),
                            mcp_server_uuid: input.mcpServerUuid,
                        }); });
                        return [4 /*yield*/, index_js_1.db
                                .insert(metamcp_schema_js_1.toolsTable)
                                .values(toolsToInsert)
                                .onConflictDoUpdate({
                                target: [metamcp_schema_js_1.toolsTable.mcp_server_uuid, metamcp_schema_js_1.toolsTable.name],
                                set: {
                                    description: (0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["excluded.description"], ["excluded.description"]))),
                                    toolSchema: (0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["excluded.tool_schema"], ["excluded.tool_schema"]))),
                                    updated_at: new Date(),
                                },
                            })
                                .returning()];
                    case 1:
                        results = _a.sent();
                        runPostUpsertHooks(results);
                        return [2 /*return*/, results];
                }
            });
        });
    };
    ToolsRepository.prototype.findByUuid = function (uuid) {
        return __awaiter(this, void 0, void 0, function () {
            var tool;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select()
                            .from(metamcp_schema_js_1.toolsTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.toolsTable.uuid, uuid))
                            .limit(1)];
                    case 1:
                        tool = (_a.sent())[0];
                        return [2 /*return*/, tool];
                }
            });
        });
    };
    ToolsRepository.prototype.deleteByUuid = function (uuid) {
        return __awaiter(this, void 0, void 0, function () {
            var deletedTool;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .delete(metamcp_schema_js_1.toolsTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.toolsTable.uuid, uuid))
                            .returning()];
                    case 1:
                        deletedTool = (_a.sent())[0];
                        return [2 /*return*/, deletedTool];
                }
            });
        });
    };
    /**
     * Delete tools that are no longer present in the current tool list
     * @param mcpServerUuid - UUID of the MCP server
     * @param currentToolNames - Array of tool names that currently exist in the MCP server
     * @returns Array of deleted tools
     */
    ToolsRepository.prototype.deleteObsoleteTools = function (mcpServerUuid, currentToolNames) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(currentToolNames.length === 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, index_js_1.db
                                .delete(metamcp_schema_js_1.toolsTable)
                                .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.toolsTable.mcp_server_uuid, mcpServerUuid))
                                .returning()];
                    case 1: 
                    // If no tools are provided, delete all tools for this server
                    return [2 /*return*/, _a.sent()];
                    case 2: return [4 /*yield*/, index_js_1.db
                            .delete(metamcp_schema_js_1.toolsTable)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(metamcp_schema_js_1.toolsTable.mcp_server_uuid, mcpServerUuid), (0, drizzle_orm_1.notInArray)(metamcp_schema_js_1.toolsTable.name, currentToolNames)))
                            .returning()];
                    case 3: 
                    // Delete tools that are in DB but not in current tool list
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Sync tools for a server: upsert current tools and delete obsolete ones
     * @param input - Tool upsert input containing tools and server UUID
     * @returns Object with upserted and deleted tools
     */
    ToolsRepository.prototype.syncTools = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var currentToolNames, deleted, upserted;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        currentToolNames = input.tools.map(function (tool) { return tool.name; });
                        return [4 /*yield*/, this.deleteObsoleteTools(input.mcpServerUuid, currentToolNames)];
                    case 1:
                        deleted = _a.sent();
                        upserted = [];
                        if (!(input.tools.length > 0)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.bulkUpsert(input)];
                    case 2:
                        upserted = _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/, { upserted: upserted, deleted: deleted }];
                }
            });
        });
    };
    return ToolsRepository;
}());
exports.ToolsRepository = ToolsRepository;
exports.toolsRepository = new ToolsRepository();
var templateObject_1, templateObject_2;
