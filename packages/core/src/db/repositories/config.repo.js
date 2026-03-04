"use strict";
/**
 * @file config.repo.ts
 * @module packages/core/src/db/repositories/config.repo
 *
 * WHAT:
 * Repository for Global Configuration.
 *
 * WHY:
 * Stores app-wide settings (e.g. timeouts, auth flags).
 * Note: Config table is simple Key-Value store.
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
exports.configRepo = exports.ConfigRepository = void 0;
var drizzle_orm_1 = require("drizzle-orm");
var index_js_1 = require("../index.js");
var metamcp_schema_js_1 = require("../metamcp-schema.js");
var ConfigRepository = /** @class */ (function () {
    function ConfigRepository() {
    }
    ConfigRepository.prototype.get = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var config;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select({ value: metamcp_schema_js_1.configTable.value })
                            .from(metamcp_schema_js_1.configTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.configTable.id, key))];
                    case 1:
                        config = (_b.sent())[0];
                        return [2 /*return*/, (_a = config === null || config === void 0 ? void 0 : config.value) !== null && _a !== void 0 ? _a : null];
                }
            });
        });
    };
    ConfigRepository.prototype.findAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            var configs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select({ id: metamcp_schema_js_1.configTable.id, value: metamcp_schema_js_1.configTable.value })
                            .from(metamcp_schema_js_1.configTable)];
                    case 1:
                        configs = _a.sent();
                        return [2 /*return*/, configs.reduce(function (acc, curr) {
                                var _a;
                                return (__assign(__assign({}, acc), (_a = {}, _a[curr.id] = curr.value, _a)));
                            }, {})];
                }
            });
        });
    };
    ConfigRepository.prototype.set = function (key, value) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .insert(metamcp_schema_js_1.configTable)
                            .values({
                            id: key,
                            value: value,
                        })
                            .onConflictDoUpdate({
                            target: metamcp_schema_js_1.configTable.id,
                            set: {
                                value: value,
                                updated_at: new Date(),
                            },
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ConfigRepository.prototype.delete = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db.delete(metamcp_schema_js_1.configTable).where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.configTable.id, key))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return ConfigRepository;
}());
exports.ConfigRepository = ConfigRepository;
exports.configRepo = new ConfigRepository();
