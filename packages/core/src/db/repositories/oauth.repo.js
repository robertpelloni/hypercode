"use strict";
/**
 * @file oauth.repo.ts
 * @module packages/core/src/db/repositories/oauth.repo
 *
 * WHAT:
 * Repository for OAuth Clients, Authorization Codes, and Access Tokens.
 *
 * WHY:
 * Manages the internal OAuth 2.0 provider state.
 *
 * HOW:
 * - Handles Client registration/retrieval.
 * - Manages Code and Token lifecycle.
 */
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
exports.oauthRepository = exports.OAuthRepository = void 0;
var drizzle_orm_1 = require("drizzle-orm"); // Removed unused 'and', 'desc'
var index_js_1 = require("../index.js");
var metamcp_schema_js_1 = require("../metamcp-schema.js");
var OAuthRepository = /** @class */ (function () {
    function OAuthRepository() {
    }
    // --- OAuth Clients ---
    OAuthRepository.prototype.createClient = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, createdClient;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        payload = {
                            client_id: input.client_id,
                            client_secret: input.client_secret,
                            client_name: input.client_name,
                            redirect_uris: input.redirect_uris,
                            grant_types: input.grant_types,
                            response_types: input.response_types,
                            token_endpoint_auth_method: input.token_endpoint_auth_method,
                            scope: input.scope,
                            client_uri: input.client_uri,
                            logo_uri: input.logo_uri,
                            contacts: input.contacts,
                            tos_uri: input.tos_uri,
                            policy_uri: input.policy_uri,
                            software_id: input.software_id,
                            software_version: input.software_version,
                            created_at: input.created_at,
                            updated_at: input.updated_at,
                        };
                        return [4 /*yield*/, index_js_1.db
                                .insert(metamcp_schema_js_1.oauthClientsTable)
                                .values(payload)
                                .returning()];
                    case 1:
                        createdClient = (_a.sent())[0];
                        return [2 /*return*/, createdClient];
                }
            });
        });
    };
    OAuthRepository.prototype.findClientById = function (clientId) {
        return __awaiter(this, void 0, void 0, function () {
            var client;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select()
                            .from(metamcp_schema_js_1.oauthClientsTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.oauthClientsTable.client_id, clientId))];
                    case 1:
                        client = (_a.sent())[0];
                        return [2 /*return*/, client];
                }
            });
        });
    };
    // --- Authorization Codes ---
    OAuthRepository.prototype.createAuthorizationCode = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Generate code logic is handled by service; repo expects code string?
                // Wait, the input schema doesn't have 'code'. The schema in `metamcp-schema` has `code` as PK.
                // The `OAuthAuthorizationCodeCreateInput` from Zod types MIGHT be missing 'code' if it expects DB generation?
                // Checking `oauth.zod.ts`: `OAuthAuthorizationCodeCreateInputSchema` has: client_id, redirect_uri, scope, user_id, etc. NO code.
                // So we need to generate it here or pass it.
                // So we need to generate it here or pass it.
                // Actually, `oauthAuthorizationCodesTable` has `code` as PK.
                // It seems missing `code`. The service handles it entirely.
                // We add `code` to the params explicitly.
                throw new Error("Method not fully implemented: Code generation required. Call with generated code.");
            });
        });
    };
    // Implemented version expecting code to be passed (overloading the type essentially)
    OAuthRepository.prototype.createAuthorizationCodeWithCode = function (code, input) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, createdCode;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        payload = {
                            code: code,
                            client_id: input.client_id,
                            redirect_uri: input.redirect_uri,
                            scope: input.scope,
                            user_id: input.user_id,
                            code_challenge: (_a = input.code_challenge) !== null && _a !== void 0 ? _a : null,
                            code_challenge_method: (_b = input.code_challenge_method) !== null && _b !== void 0 ? _b : null,
                            expires_at: new Date(input.expires_at),
                        };
                        return [4 /*yield*/, index_js_1.db
                                .insert(metamcp_schema_js_1.oauthAuthorizationCodesTable)
                                .values(payload)
                                .returning()];
                    case 1:
                        createdCode = (_c.sent())[0];
                        return [2 /*return*/, createdCode];
                }
            });
        });
    };
    OAuthRepository.prototype.findAuthorizationCode = function (code) {
        return __awaiter(this, void 0, void 0, function () {
            var authCode;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select()
                            .from(metamcp_schema_js_1.oauthAuthorizationCodesTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.oauthAuthorizationCodesTable.code, code))];
                    case 1:
                        authCode = (_a.sent())[0];
                        return [2 /*return*/, authCode];
                }
            });
        });
    };
    OAuthRepository.prototype.deleteAuthorizationCode = function (code) {
        return __awaiter(this, void 0, void 0, function () {
            var deletedCode;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .delete(metamcp_schema_js_1.oauthAuthorizationCodesTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.oauthAuthorizationCodesTable.code, code))
                            .returning()];
                    case 1:
                        deletedCode = (_a.sent())[0];
                        return [2 /*return*/, deletedCode];
                }
            });
        });
    };
    OAuthRepository.prototype.deleteExpiredAuthorizationCodes = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .delete(metamcp_schema_js_1.oauthAuthorizationCodesTable)
                            .where((0, drizzle_orm_1.lt)(metamcp_schema_js_1.oauthAuthorizationCodesTable.expires_at, new Date()))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // --- Access Tokens ---
    // Similar issue: input doesn't have token string.
    OAuthRepository.prototype.createAccessTokenWithToken = function (accessToken, input) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, createdToken;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        payload = {
                            access_token: accessToken,
                            client_id: input.client_id,
                            user_id: input.user_id,
                            scope: input.scope,
                            expires_at: new Date(input.expires_at),
                        };
                        return [4 /*yield*/, index_js_1.db
                                .insert(metamcp_schema_js_1.oauthAccessTokensTable)
                                .values(payload)
                                .returning()];
                    case 1:
                        createdToken = (_a.sent())[0];
                        return [2 /*return*/, createdToken];
                }
            });
        });
    };
    OAuthRepository.prototype.findAccessToken = function (accessToken) {
        return __awaiter(this, void 0, void 0, function () {
            var token;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select()
                            .from(metamcp_schema_js_1.oauthAccessTokensTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.oauthAccessTokensTable.access_token, accessToken))];
                    case 1:
                        token = (_a.sent())[0];
                        return [2 /*return*/, token];
                }
            });
        });
    };
    OAuthRepository.prototype.deleteExpiredAccessTokens = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .delete(metamcp_schema_js_1.oauthAccessTokensTable)
                            .where((0, drizzle_orm_1.lt)(metamcp_schema_js_1.oauthAccessTokensTable.expires_at, new Date()))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return OAuthRepository;
}());
exports.OAuthRepository = OAuthRepository;
exports.oauthRepository = new OAuthRepository();
