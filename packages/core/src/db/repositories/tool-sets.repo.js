"use strict";
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
exports.toolSetsRepository = exports.ToolSetsRepository = void 0;
var drizzle_orm_1 = require("drizzle-orm");
var node_crypto_1 = require("node:crypto");
var index_js_1 = require("../index.js");
var metamcp_schema_js_1 = require("../metamcp-schema.js");
var ToolSetsRepository = /** @class */ (function () {
    function ToolSetsRepository() {
    }
    ToolSetsRepository.prototype.findAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            var sets;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db.select().from(metamcp_schema_js_1.toolSetsTable)];
                    case 1:
                        sets = _a.sent();
                        return [2 /*return*/, Promise.all(sets.map(function (s) { return _this.hydrate(s); }))];
                }
            });
        });
    };
    ToolSetsRepository.prototype.findByUuid = function (uuid) {
        return __awaiter(this, void 0, void 0, function () {
            var set;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db.select().from(metamcp_schema_js_1.toolSetsTable).where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.toolSetsTable.uuid, uuid))];
                    case 1:
                        set = (_a.sent())[0];
                        if (!set)
                            return [2 /*return*/, undefined];
                        return [2 /*return*/, this.hydrate(set)];
                }
            });
        });
    };
    ToolSetsRepository.prototype.create = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var uuid, payload, set;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        uuid = (0, node_crypto_1.randomUUID)();
                        payload = {
                            uuid: uuid,
                            name: input.name,
                            description: (_a = input.description) !== null && _a !== void 0 ? _a : null,
                            user_id: (_b = input.user_id) !== null && _b !== void 0 ? _b : null,
                        };
                        return [4 /*yield*/, index_js_1.db.insert(metamcp_schema_js_1.toolSetsTable).values(payload).returning()];
                    case 1:
                        set = (_c.sent())[0];
                        if (!(input.tools && input.tools.length > 0)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.addTools(uuid, input.tools)];
                    case 2:
                        _c.sent();
                        _c.label = 3;
                    case 3: return [2 /*return*/, this.hydrate(set)];
                }
            });
        });
    };
    ToolSetsRepository.prototype.deleteByUuid = function (uuid) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db.delete(metamcp_schema_js_1.toolSetsTable).where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.toolSetsTable.uuid, uuid))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ToolSetsRepository.prototype.addTools = function (toolSetUuid, toolUuids) {
        return __awaiter(this, void 0, void 0, function () {
            var items;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (toolUuids.length === 0)
                            return [2 /*return*/];
                        items = toolUuids.map(function (toolUuid) { return ({
                            uuid: (0, node_crypto_1.randomUUID)(),
                            tool_set_uuid: toolSetUuid,
                            tool_uuid: toolUuid,
                        }); });
                        return [4 /*yield*/, index_js_1.db.insert(metamcp_schema_js_1.toolSetItemsTable).values(items)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ToolSetsRepository.prototype.hydrate = function (set) {
        return __awaiter(this, void 0, void 0, function () {
            var items;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select()
                            .from(metamcp_schema_js_1.toolSetItemsTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.toolSetItemsTable.tool_set_uuid, set.uuid))];
                    case 1:
                        items = _a.sent();
                        return [2 /*return*/, {
                                uuid: set.uuid,
                                name: set.name,
                                description: set.description,
                                tools: items.map(function (i) { return i.tool_uuid; }),
                            }];
                }
            });
        });
    };
    return ToolSetsRepository;
}());
exports.ToolSetsRepository = ToolSetsRepository;
exports.toolSetsRepository = new ToolSetsRepository();
