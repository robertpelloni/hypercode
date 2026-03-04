"use strict";
/**
 * @file api-keys.repo.ts
 * @module packages/core/src/db/repositories/api-keys.repo
 *
 * WHAT:
 * Repository for managing API Keys.
 *
 * WHY:
 * Handles secure creation (generation) and management of API Keys.
 * Implements key generation using `nanoid`.
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
exports.apiKeysRepository = exports.ApiKeysRepository = void 0;
var drizzle_orm_1 = require("drizzle-orm");
var nanoid_1 = require("nanoid");
var index_js_1 = require("../index.js");
var metamcp_schema_js_1 = require("../metamcp-schema.js");
var node_crypto_1 = require("node:crypto");
var nanoid = (0, nanoid_1.customAlphabet)("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 64);
var ApiKeysRepository = /** @class */ (function () {
    function ApiKeysRepository() {
    }
    /**
     * Generate a new API key with the specified format: sk_mt_{64-char-nanoid}
     */
    ApiKeysRepository.prototype.generateApiKey = function () {
        var keyPart = nanoid();
        var key = "sk_mt_".concat(keyPart);
        return key;
    };
    ApiKeysRepository.prototype.create = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var key, payload, createdApiKey;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        key = this.generateApiKey();
                        payload = {
                            uuid: (0, node_crypto_1.randomUUID)(),
                            name: input.name,
                            key: key,
                            user_id: (_a = input.user_id) !== null && _a !== void 0 ? _a : null,
                            is_active: (_b = input.is_active) !== null && _b !== void 0 ? _b : true,
                        };
                        return [4 /*yield*/, index_js_1.db
                                .insert(metamcp_schema_js_1.apiKeysTable)
                                .values(payload)
                                .returning({
                                uuid: metamcp_schema_js_1.apiKeysTable.uuid,
                                name: metamcp_schema_js_1.apiKeysTable.name,
                                key: metamcp_schema_js_1.apiKeysTable.key, // Original code returns 'key' here too
                                user_id: metamcp_schema_js_1.apiKeysTable.user_id,
                                created_at: metamcp_schema_js_1.apiKeysTable.created_at,
                                is_active: metamcp_schema_js_1.apiKeysTable.is_active,
                            })];
                    case 1:
                        createdApiKey = (_c.sent())[0];
                        if (!createdApiKey) {
                            throw new Error("Failed to create API key");
                        }
                        return [2 /*return*/, __assign(__assign({}, createdApiKey), { type: "MCP", key: key })];
                }
            });
        });
    };
    ApiKeysRepository.prototype.findByUserId = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select({
                            uuid: metamcp_schema_js_1.apiKeysTable.uuid,
                            name: metamcp_schema_js_1.apiKeysTable.name,
                            key: metamcp_schema_js_1.apiKeysTable.key,
                            created_at: metamcp_schema_js_1.apiKeysTable.created_at,
                            is_active: metamcp_schema_js_1.apiKeysTable.is_active,
                        })
                            .from(metamcp_schema_js_1.apiKeysTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.apiKeysTable.user_id, userId))
                            .orderBy((0, drizzle_orm_1.desc)(metamcp_schema_js_1.apiKeysTable.created_at))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Find all API keys (both public and user-owned)
    ApiKeysRepository.prototype.findAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select({
                            uuid: metamcp_schema_js_1.apiKeysTable.uuid,
                            name: metamcp_schema_js_1.apiKeysTable.name,
                            key: metamcp_schema_js_1.apiKeysTable.key,
                            created_at: metamcp_schema_js_1.apiKeysTable.created_at,
                            is_active: metamcp_schema_js_1.apiKeysTable.is_active,
                            user_id: metamcp_schema_js_1.apiKeysTable.user_id,
                        })
                            .from(metamcp_schema_js_1.apiKeysTable)
                            .orderBy((0, drizzle_orm_1.desc)(metamcp_schema_js_1.apiKeysTable.created_at))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Find public API keys (no user ownership)
    ApiKeysRepository.prototype.findPublicApiKeys = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select({
                            uuid: metamcp_schema_js_1.apiKeysTable.uuid,
                            name: metamcp_schema_js_1.apiKeysTable.name,
                            key: metamcp_schema_js_1.apiKeysTable.key,
                            created_at: metamcp_schema_js_1.apiKeysTable.created_at,
                            is_active: metamcp_schema_js_1.apiKeysTable.is_active,
                            user_id: metamcp_schema_js_1.apiKeysTable.user_id,
                        })
                            .from(metamcp_schema_js_1.apiKeysTable)
                            .where((0, drizzle_orm_1.isNull)(metamcp_schema_js_1.apiKeysTable.user_id))
                            .orderBy((0, drizzle_orm_1.desc)(metamcp_schema_js_1.apiKeysTable.created_at))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Find API keys accessible to a specific user (public + user's own keys)
    ApiKeysRepository.prototype.findAccessibleToUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select({
                            uuid: metamcp_schema_js_1.apiKeysTable.uuid,
                            name: metamcp_schema_js_1.apiKeysTable.name,
                            key: metamcp_schema_js_1.apiKeysTable.key,
                            created_at: metamcp_schema_js_1.apiKeysTable.created_at,
                            is_active: metamcp_schema_js_1.apiKeysTable.is_active,
                            user_id: metamcp_schema_js_1.apiKeysTable.user_id,
                        })
                            .from(metamcp_schema_js_1.apiKeysTable)
                            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(metamcp_schema_js_1.apiKeysTable.user_id), // Public API keys
                        (0, drizzle_orm_1.eq)(metamcp_schema_js_1.apiKeysTable.user_id, userId)))
                            .orderBy((0, drizzle_orm_1.desc)(metamcp_schema_js_1.apiKeysTable.created_at))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ApiKeysRepository.prototype.findByUuid = function (uuid, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var apiKey;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select({
                            uuid: metamcp_schema_js_1.apiKeysTable.uuid,
                            name: metamcp_schema_js_1.apiKeysTable.name,
                            key: metamcp_schema_js_1.apiKeysTable.key,
                            created_at: metamcp_schema_js_1.apiKeysTable.created_at,
                            is_active: metamcp_schema_js_1.apiKeysTable.is_active,
                            user_id: metamcp_schema_js_1.apiKeysTable.user_id,
                        })
                            .from(metamcp_schema_js_1.apiKeysTable)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(metamcp_schema_js_1.apiKeysTable.uuid, uuid), (0, drizzle_orm_1.eq)(metamcp_schema_js_1.apiKeysTable.user_id, userId)))];
                    case 1:
                        apiKey = (_a.sent())[0];
                        return [2 /*return*/, apiKey];
                }
            });
        });
    };
    // Find API key by UUID with access control (user can access their own keys + public keys)
    ApiKeysRepository.prototype.findByUuidWithAccess = function (uuid, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var apiKey;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select({
                            uuid: metamcp_schema_js_1.apiKeysTable.uuid,
                            name: metamcp_schema_js_1.apiKeysTable.name,
                            key: metamcp_schema_js_1.apiKeysTable.key,
                            created_at: metamcp_schema_js_1.apiKeysTable.created_at,
                            is_active: metamcp_schema_js_1.apiKeysTable.is_active,
                            user_id: metamcp_schema_js_1.apiKeysTable.user_id,
                        })
                            .from(metamcp_schema_js_1.apiKeysTable)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(metamcp_schema_js_1.apiKeysTable.uuid, uuid), userId
                            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(metamcp_schema_js_1.apiKeysTable.user_id), // Public API keys
                            (0, drizzle_orm_1.eq)(metamcp_schema_js_1.apiKeysTable.user_id, userId))
                            : (0, drizzle_orm_1.isNull)(metamcp_schema_js_1.apiKeysTable.user_id)))];
                    case 1:
                        apiKey = (_a.sent())[0];
                        return [2 /*return*/, apiKey];
                }
            });
        });
    };
    ApiKeysRepository.prototype.validateApiKey = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var apiKey;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select({
                            uuid: metamcp_schema_js_1.apiKeysTable.uuid,
                            user_id: metamcp_schema_js_1.apiKeysTable.user_id,
                            is_active: metamcp_schema_js_1.apiKeysTable.is_active,
                        })
                            .from(metamcp_schema_js_1.apiKeysTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.apiKeysTable.key, key))];
                    case 1:
                        apiKey = (_a.sent())[0];
                        if (!apiKey) {
                            return [2 /*return*/, { valid: false }];
                        }
                        // Check if key is active
                        if (!apiKey.is_active) {
                            return [2 /*return*/, { valid: false }];
                        }
                        return [2 /*return*/, {
                                valid: true,
                                user_id: apiKey.user_id,
                                key_uuid: apiKey.uuid,
                                type: "MCP", // Hardcoded default as schema removed it
                            }];
                }
            });
        });
    };
    ApiKeysRepository.prototype.update = function (uuid, userId, input) {
        return __awaiter(this, void 0, void 0, function () {
            var updatedApiKey;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .update(metamcp_schema_js_1.apiKeysTable)
                            .set(__assign(__assign({}, (input.name && { name: input.name })), (input.is_active !== undefined && { is_active: input.is_active })))
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(metamcp_schema_js_1.apiKeysTable.uuid, uuid), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(metamcp_schema_js_1.apiKeysTable.user_id, userId), (0, drizzle_orm_1.isNull)(metamcp_schema_js_1.apiKeysTable.user_id))))
                            .returning({
                            uuid: metamcp_schema_js_1.apiKeysTable.uuid,
                            name: metamcp_schema_js_1.apiKeysTable.name,
                            key: metamcp_schema_js_1.apiKeysTable.key,
                            created_at: metamcp_schema_js_1.apiKeysTable.created_at,
                            is_active: metamcp_schema_js_1.apiKeysTable.is_active,
                        })];
                    case 1:
                        updatedApiKey = (_a.sent())[0];
                        if (!updatedApiKey) {
                            throw new Error("Failed to update API key or API key not found");
                        }
                        return [2 /*return*/, updatedApiKey];
                }
            });
        });
    };
    ApiKeysRepository.prototype.delete = function (uuid, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var deletedApiKey;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .delete(metamcp_schema_js_1.apiKeysTable)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(metamcp_schema_js_1.apiKeysTable.uuid, uuid), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(metamcp_schema_js_1.apiKeysTable.user_id, userId), (0, drizzle_orm_1.isNull)(metamcp_schema_js_1.apiKeysTable.user_id))))
                            .returning({
                            uuid: metamcp_schema_js_1.apiKeysTable.uuid,
                            name: metamcp_schema_js_1.apiKeysTable.name,
                        })];
                    case 1:
                        deletedApiKey = (_a.sent())[0];
                        if (!deletedApiKey) {
                            throw new Error("Failed to delete API key or API key not found");
                        }
                        return [2 /*return*/, deletedApiKey];
                }
            });
        });
    };
    return ApiKeysRepository;
}());
exports.ApiKeysRepository = ApiKeysRepository;
exports.apiKeysRepository = new ApiKeysRepository();
