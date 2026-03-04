"use strict";
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
exports.toolSetService = exports.ToolSetService = void 0;
var drizzle_orm_1 = require("drizzle-orm");
var node_crypto_1 = require("node:crypto");
var index_js_1 = require("../db/index.js");
var metamcp_schema_js_1 = require("../db/metamcp-schema.js");
var ToolSetService = /** @class */ (function () {
    function ToolSetService() {
    }
    ToolSetService.prototype.listToolSets = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var conditions, sets, results, _i, sets_1, set, items;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        conditions = [];
                        if (userId) {
                            conditions.push((0, drizzle_orm_1.eq)(metamcp_schema_js_1.toolSetsTable.user_id, userId));
                        }
                        else {
                            conditions.push((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["", " IS NULL"], ["", " IS NULL"])), metamcp_schema_js_1.toolSetsTable.user_id));
                        }
                        return [4 /*yield*/, index_js_1.db
                                .select()
                                .from(metamcp_schema_js_1.toolSetsTable)
                                .where(drizzle_orm_1.sql.join(conditions, (0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject([" AND "], [" AND "])))))];
                    case 1:
                        sets = _a.sent();
                        results = [];
                        _i = 0, sets_1 = sets;
                        _a.label = 2;
                    case 2:
                        if (!(_i < sets_1.length)) return [3 /*break*/, 5];
                        set = sets_1[_i];
                        return [4 /*yield*/, index_js_1.db
                                .select({ name: metamcp_schema_js_1.toolsTable.name })
                                .from(metamcp_schema_js_1.toolSetItemsTable)
                                .innerJoin(metamcp_schema_js_1.toolsTable, (0, drizzle_orm_1.eq)(metamcp_schema_js_1.toolSetItemsTable.tool_uuid, metamcp_schema_js_1.toolsTable.uuid))
                                .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.toolSetItemsTable.tool_set_uuid, set.uuid))];
                    case 3:
                        items = _a.sent();
                        results.push({
                            uuid: set.uuid,
                            name: set.name,
                            description: set.description,
                            tools: items.map(function (i) { return i.name; }),
                        });
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/, results];
                }
            });
        });
    };
    ToolSetService.prototype.getToolSet = function (name, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var conditions, set, items;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        conditions = [(0, drizzle_orm_1.eq)(metamcp_schema_js_1.toolSetsTable.name, name)];
                        if (userId) {
                            conditions.push((0, drizzle_orm_1.eq)(metamcp_schema_js_1.toolSetsTable.user_id, userId));
                        }
                        else {
                            conditions.push((0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["", " IS NULL"], ["", " IS NULL"])), metamcp_schema_js_1.toolSetsTable.user_id));
                        }
                        return [4 /*yield*/, index_js_1.db
                                .select()
                                .from(metamcp_schema_js_1.toolSetsTable)
                                .where(drizzle_orm_1.sql.join(conditions, (0, drizzle_orm_1.sql)(templateObject_4 || (templateObject_4 = __makeTemplateObject([" AND "], [" AND "])))))
                                .limit(1)];
                    case 1:
                        set = (_a.sent())[0];
                        if (!set)
                            return [2 /*return*/, undefined];
                        return [4 /*yield*/, index_js_1.db
                                .select({ name: metamcp_schema_js_1.toolsTable.name })
                                .from(metamcp_schema_js_1.toolSetItemsTable)
                                .innerJoin(metamcp_schema_js_1.toolsTable, (0, drizzle_orm_1.eq)(metamcp_schema_js_1.toolSetItemsTable.tool_uuid, metamcp_schema_js_1.toolsTable.uuid))
                                .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.toolSetItemsTable.tool_set_uuid, set.uuid))];
                    case 2:
                        items = _a.sent();
                        return [2 /*return*/, {
                                uuid: set.uuid,
                                name: set.name,
                                description: set.description,
                                tools: items.map(function (i) { return i.name; }),
                            }];
                }
            });
        });
    };
    ToolSetService.prototype.createToolSet = function (name, tools, description, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db.transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            var set;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, tx
                                            .insert(metamcp_schema_js_1.toolSetsTable)
                                            .values({
                                            uuid: (0, node_crypto_1.randomUUID)(),
                                            name: name,
                                            description: description,
                                            user_id: userId,
                                        })
                                            .onConflictDoUpdate({
                                            target: [metamcp_schema_js_1.toolSetsTable.name, metamcp_schema_js_1.toolSetsTable.user_id],
                                            set: { description: (0, drizzle_orm_1.sql)(templateObject_5 || (templateObject_5 = __makeTemplateObject(["excluded.description"], ["excluded.description"]))) } // Update desc if exists
                                        })
                                            .returning()];
                                    case 1:
                                        set = (_a.sent())[0];
                                        // Clear existing items if updating
                                        return [4 /*yield*/, tx
                                                .delete(metamcp_schema_js_1.toolSetItemsTable)
                                                .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.toolSetItemsTable.tool_set_uuid, set.uuid))];
                                    case 2:
                                        // Clear existing items if updating
                                        _a.sent();
                                        if (!(tools.length > 0)) return [3 /*break*/, 4];
                                        return [4 /*yield*/, tx.insert(metamcp_schema_js_1.toolSetItemsTable).values(tools.map(function (toolUuid) { return ({
                                                uuid: (0, node_crypto_1.randomUUID)(),
                                                tool_set_uuid: set.uuid,
                                                tool_uuid: toolUuid,
                                            }); }))];
                                    case 3:
                                        _a.sent();
                                        _a.label = 4;
                                    case 4: return [2 /*return*/, {
                                            uuid: set.uuid,
                                            name: set.name,
                                            description: set.description,
                                            tools: tools,
                                        }];
                                }
                            });
                        }); })];
                    case 1: 
                    // Transactional creation
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return ToolSetService;
}());
exports.ToolSetService = ToolSetService;
exports.toolSetService = new ToolSetService();
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5;
