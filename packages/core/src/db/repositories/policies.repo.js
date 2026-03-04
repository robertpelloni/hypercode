"use strict";
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
exports.policiesRepository = exports.PoliciesRepository = void 0;
var drizzle_orm_1 = require("drizzle-orm");
var node_crypto_1 = require("node:crypto");
var index_js_1 = require("../index.js");
var metamcp_schema_js_1 = require("../metamcp-schema.js");
var policies_zod_js_1 = require("../../types/metamcp/policies.zod.js");
var PoliciesRepository = /** @class */ (function () {
    function PoliciesRepository() {
    }
    PoliciesRepository.prototype.findAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            var policies;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db.select().from(metamcp_schema_js_1.policiesTable).orderBy((0, drizzle_orm_1.desc)(metamcp_schema_js_1.policiesTable.createdAt))];
                    case 1:
                        policies = _a.sent();
                        return [2 /*return*/, policies.map(function (policy) { return _this.mapToDomain(policy); })];
                }
            });
        });
    };
    PoliciesRepository.prototype.findByUuid = function (uuid) {
        return __awaiter(this, void 0, void 0, function () {
            var policy;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db.select().from(metamcp_schema_js_1.policiesTable).where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.policiesTable.uuid, uuid))];
                    case 1:
                        policy = (_a.sent())[0];
                        return [2 /*return*/, policy ? this.mapToDomain(policy) : undefined];
                }
            });
        });
    };
    PoliciesRepository.prototype.create = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, policy;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        payload = {
                            uuid: (0, node_crypto_1.randomUUID)(),
                            name: input.name,
                            description: (_a = input.description) !== null && _a !== void 0 ? _a : null,
                            rules: input.rules,
                        };
                        return [4 /*yield*/, index_js_1.db.insert(metamcp_schema_js_1.policiesTable).values(payload).returning()];
                    case 1:
                        policy = (_b.sent())[0];
                        return [2 /*return*/, this.mapToDomain(policy)];
                }
            });
        });
    };
    PoliciesRepository.prototype.update = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var policy;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db.update(metamcp_schema_js_1.policiesTable)
                            .set(__assign(__assign(__assign(__assign({}, (input.name && { name: input.name })), (input.description !== undefined && { description: input.description })), (input.rules && { rules: input.rules })), { updatedAt: new Date() }))
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.policiesTable.uuid, input.uuid))
                            .returning()];
                    case 1:
                        policy = (_a.sent())[0];
                        if (!policy)
                            throw new Error("Policy not found");
                        return [2 /*return*/, this.mapToDomain(policy)];
                }
            });
        });
    };
    PoliciesRepository.prototype.delete = function (uuid) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db.delete(metamcp_schema_js_1.policiesTable).where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.policiesTable.uuid, uuid))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PoliciesRepository.prototype.mapToDomain = function (dbPolicy) {
        return {
            uuid: dbPolicy.uuid,
            name: dbPolicy.name,
            description: dbPolicy.description,
            rules: policies_zod_js_1.PolicySchema.shape.rules.parse(dbPolicy.rules),
            createdAt: new Date(dbPolicy.createdAt),
            updatedAt: new Date(dbPolicy.updatedAt),
        };
    };
    return PoliciesRepository;
}());
exports.PoliciesRepository = PoliciesRepository;
exports.policiesRepository = new PoliciesRepository();
