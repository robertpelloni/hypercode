"use strict";
/**
 * @file endpoints.repo.ts
 * @module packages/core/src/db/repositories/endpoints.repo
 *
 * WHAT:
 * Repository for managing MCP Endpoints (Gateways).
 *
 * WHY:
 * Handles CRUD for Endpoints, including user access control and namespace linking.
 *
 * HOW:
 * - Uses shared select projections to keep endpoint result shapes consistent.
 * - Uses inferred Drizzle insert/select types to avoid unsafe cast-based queries.
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
exports.endpointsRepository = exports.EndpointsRepository = void 0;
var drizzle_orm_1 = require("drizzle-orm");
var node_crypto_1 = require("node:crypto");
var index_js_1 = require("../index.js");
var metamcp_schema_js_1 = require("../metamcp-schema.js");
var endpointSelect = {
    uuid: metamcp_schema_js_1.endpointsTable.uuid,
    name: metamcp_schema_js_1.endpointsTable.name,
    description: metamcp_schema_js_1.endpointsTable.description,
    namespace_uuid: metamcp_schema_js_1.endpointsTable.namespace_uuid,
    enable_api_key_auth: metamcp_schema_js_1.endpointsTable.enable_api_key_auth,
    enable_oauth: metamcp_schema_js_1.endpointsTable.enable_oauth,
    enable_max_rate: metamcp_schema_js_1.endpointsTable.enable_max_rate,
    enable_client_max_rate: metamcp_schema_js_1.endpointsTable.enable_client_max_rate,
    max_rate: metamcp_schema_js_1.endpointsTable.max_rate,
    client_max_rate: metamcp_schema_js_1.endpointsTable.client_max_rate,
    max_rate_seconds: metamcp_schema_js_1.endpointsTable.max_rate_seconds,
    client_max_rate_seconds: metamcp_schema_js_1.endpointsTable.client_max_rate_seconds,
    client_max_rate_strategy: metamcp_schema_js_1.endpointsTable.client_max_rate_strategy,
    client_max_rate_strategy_key: metamcp_schema_js_1.endpointsTable.client_max_rate_strategy_key,
    use_query_param_auth: metamcp_schema_js_1.endpointsTable.use_query_param_auth,
    created_at: metamcp_schema_js_1.endpointsTable.created_at,
    updated_at: metamcp_schema_js_1.endpointsTable.updated_at,
    user_id: metamcp_schema_js_1.endpointsTable.user_id,
};
var endpointWithNamespaceSelect = __assign(__assign({}, endpointSelect), { namespace: {
        uuid: metamcp_schema_js_1.namespacesTable.uuid,
        name: metamcp_schema_js_1.namespacesTable.name,
        description: metamcp_schema_js_1.namespacesTable.description,
        created_at: metamcp_schema_js_1.namespacesTable.created_at,
        updated_at: metamcp_schema_js_1.namespacesTable.updated_at,
        user_id: metamcp_schema_js_1.namespacesTable.user_id,
    } });
var EndpointsRepository = /** @class */ (function () {
    function EndpointsRepository() {
    }
    EndpointsRepository.prototype.create = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, endpoint;
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            return __generator(this, function (_m) {
                switch (_m.label) {
                    case 0:
                        payload = {
                            uuid: (0, node_crypto_1.randomUUID)(),
                            name: input.name,
                            description: (_a = input.description) !== null && _a !== void 0 ? _a : null,
                            namespace_uuid: input.namespace_uuid,
                            enable_api_key_auth: (_b = input.enable_api_key_auth) !== null && _b !== void 0 ? _b : true,
                            enable_oauth: (_c = input.enable_oauth) !== null && _c !== void 0 ? _c : false,
                            enable_max_rate: input.enable_max_rate,
                            enable_client_max_rate: input.enable_client_max_rate,
                            max_rate: (_d = input.max_rate) !== null && _d !== void 0 ? _d : null,
                            max_rate_seconds: (_e = input.max_rate_seconds) !== null && _e !== void 0 ? _e : null,
                            client_max_rate: (_f = input.client_max_rate) !== null && _f !== void 0 ? _f : null,
                            client_max_rate_seconds: (_g = input.client_max_rate_seconds) !== null && _g !== void 0 ? _g : null,
                            client_max_rate_strategy: (_h = input.client_max_rate_strategy) !== null && _h !== void 0 ? _h : null,
                            client_max_rate_strategy_key: (_j = input.client_max_rate_strategy_key) !== null && _j !== void 0 ? _j : null,
                            use_query_param_auth: (_k = input.use_query_param_auth) !== null && _k !== void 0 ? _k : false,
                            user_id: (_l = input.user_id) !== null && _l !== void 0 ? _l : null,
                        };
                        return [4 /*yield*/, index_js_1.db.insert(metamcp_schema_js_1.endpointsTable).values(payload).returning(endpointSelect)];
                    case 1:
                        endpoint = (_m.sent())[0];
                        if (!endpoint) {
                            throw new Error("Failed to create endpoint");
                        }
                        return [2 /*return*/, endpoint];
                }
            });
        });
    };
    EndpointsRepository.prototype.findAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select(endpointSelect)
                            .from(metamcp_schema_js_1.endpointsTable)
                            .orderBy((0, drizzle_orm_1.desc)(metamcp_schema_js_1.endpointsTable.created_at))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Find endpoints accessible to a specific user (public + user's own endpoints)
    EndpointsRepository.prototype.findAllAccessibleToUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select(endpointSelect)
                            .from(metamcp_schema_js_1.endpointsTable)
                            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(metamcp_schema_js_1.endpointsTable.user_id), (0, drizzle_orm_1.eq)(metamcp_schema_js_1.endpointsTable.user_id, userId)))
                            .orderBy((0, drizzle_orm_1.desc)(metamcp_schema_js_1.endpointsTable.created_at))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Find endpoints accessible to a specific user with namespace data (public + user's own endpoints)
    EndpointsRepository.prototype.findAllAccessibleToUserWithNamespaces = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var endpointsData;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select(endpointWithNamespaceSelect)
                            .from(metamcp_schema_js_1.endpointsTable)
                            .innerJoin(metamcp_schema_js_1.namespacesTable, (0, drizzle_orm_1.eq)(metamcp_schema_js_1.endpointsTable.namespace_uuid, metamcp_schema_js_1.namespacesTable.uuid))
                            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(metamcp_schema_js_1.endpointsTable.user_id), (0, drizzle_orm_1.eq)(metamcp_schema_js_1.endpointsTable.user_id, userId)))
                            .orderBy((0, drizzle_orm_1.desc)(metamcp_schema_js_1.endpointsTable.created_at))];
                    case 1:
                        endpointsData = _a.sent();
                        return [2 /*return*/, endpointsData];
                }
            });
        });
    };
    // Find only public endpoints (no user ownership)
    EndpointsRepository.prototype.findPublicEndpoints = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select(endpointSelect)
                            .from(metamcp_schema_js_1.endpointsTable)
                            .where((0, drizzle_orm_1.isNull)(metamcp_schema_js_1.endpointsTable.user_id))
                            .orderBy((0, drizzle_orm_1.desc)(metamcp_schema_js_1.endpointsTable.created_at))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Find endpoints owned by a specific user
    EndpointsRepository.prototype.findByUserId = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select(endpointSelect)
                            .from(metamcp_schema_js_1.endpointsTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.endpointsTable.user_id, userId))
                            .orderBy((0, drizzle_orm_1.desc)(metamcp_schema_js_1.endpointsTable.created_at))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    EndpointsRepository.prototype.findAllWithNamespaces = function () {
        return __awaiter(this, void 0, void 0, function () {
            var endpointsData;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select(endpointWithNamespaceSelect)
                            .from(metamcp_schema_js_1.endpointsTable)
                            .innerJoin(metamcp_schema_js_1.namespacesTable, (0, drizzle_orm_1.eq)(metamcp_schema_js_1.endpointsTable.namespace_uuid, metamcp_schema_js_1.namespacesTable.uuid))
                            .orderBy((0, drizzle_orm_1.desc)(metamcp_schema_js_1.endpointsTable.created_at))];
                    case 1:
                        endpointsData = _a.sent();
                        return [2 /*return*/, endpointsData];
                }
            });
        });
    };
    EndpointsRepository.prototype.findByUuid = function (uuid) {
        return __awaiter(this, void 0, void 0, function () {
            var endpoint;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select(endpointSelect)
                            .from(metamcp_schema_js_1.endpointsTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.endpointsTable.uuid, uuid))];
                    case 1:
                        endpoint = (_a.sent())[0];
                        return [2 /*return*/, endpoint];
                }
            });
        });
    };
    EndpointsRepository.prototype.findByUuidWithNamespace = function (uuid) {
        return __awaiter(this, void 0, void 0, function () {
            var endpointData;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select(endpointWithNamespaceSelect)
                            .from(metamcp_schema_js_1.endpointsTable)
                            .innerJoin(metamcp_schema_js_1.namespacesTable, (0, drizzle_orm_1.eq)(metamcp_schema_js_1.endpointsTable.namespace_uuid, metamcp_schema_js_1.namespacesTable.uuid))
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.endpointsTable.uuid, uuid))];
                    case 1:
                        endpointData = (_a.sent())[0];
                        return [2 /*return*/, endpointData];
                }
            });
        });
    };
    EndpointsRepository.prototype.findByName = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            var endpoint;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select(endpointSelect)
                            .from(metamcp_schema_js_1.endpointsTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.endpointsTable.name, name))];
                    case 1:
                        endpoint = (_a.sent())[0];
                        return [2 /*return*/, endpoint];
                }
            });
        });
    };
    // Find endpoint by name within user scope (for uniqueness checks)
    EndpointsRepository.prototype.findByNameAndUserId = function (name, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var endpoint;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select(endpointSelect)
                            .from(metamcp_schema_js_1.endpointsTable)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(metamcp_schema_js_1.endpointsTable.name, name), userId
                            ? (0, drizzle_orm_1.eq)(metamcp_schema_js_1.endpointsTable.user_id, userId)
                            : (0, drizzle_orm_1.isNull)(metamcp_schema_js_1.endpointsTable.user_id)))
                            .limit(1)];
                    case 1:
                        endpoint = (_a.sent())[0];
                        return [2 /*return*/, endpoint];
                }
            });
        });
    };
    EndpointsRepository.prototype.deleteByUuid = function (uuid) {
        return __awaiter(this, void 0, void 0, function () {
            var deletedEndpoint;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .delete(metamcp_schema_js_1.endpointsTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.endpointsTable.uuid, uuid))
                            .returning(endpointSelect)];
                    case 1:
                        deletedEndpoint = (_a.sent())[0];
                        return [2 /*return*/, deletedEndpoint];
                }
            });
        });
    };
    EndpointsRepository.prototype.update = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var uuid, updates, payload, updatedEndpoint;
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        uuid = input.uuid, updates = __rest(input, ["uuid"]);
                        payload = __assign(__assign({}, updates), { description: (_a = updates.description) !== null && _a !== void 0 ? _a : null, max_rate: (_b = updates.max_rate) !== null && _b !== void 0 ? _b : null, max_rate_seconds: (_c = updates.max_rate_seconds) !== null && _c !== void 0 ? _c : null, client_max_rate: (_d = updates.client_max_rate) !== null && _d !== void 0 ? _d : null, client_max_rate_seconds: (_e = updates.client_max_rate_seconds) !== null && _e !== void 0 ? _e : null, client_max_rate_strategy: (_f = updates.client_max_rate_strategy) !== null && _f !== void 0 ? _f : null, client_max_rate_strategy_key: (_g = updates.client_max_rate_strategy_key) !== null && _g !== void 0 ? _g : null, user_id: (_h = updates.user_id) !== null && _h !== void 0 ? _h : null, updated_at: new Date() });
                        return [4 /*yield*/, index_js_1.db
                                .update(metamcp_schema_js_1.endpointsTable)
                                .set(payload)
                                .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.endpointsTable.uuid, uuid))
                                .returning(endpointSelect)];
                    case 1:
                        updatedEndpoint = (_j.sent())[0];
                        if (!updatedEndpoint) {
                            throw new Error("Failed to update endpoint");
                        }
                        return [2 /*return*/, updatedEndpoint];
                }
            });
        });
    };
    return EndpointsRepository;
}());
exports.EndpointsRepository = EndpointsRepository;
// Export the repository instance
exports.endpointsRepository = new EndpointsRepository();
