"use strict";
/**
 * @file oauth-sessions.repo.ts
 * @module packages/core/src/db/repositories/oauth-sessions.repo
 *
 * WHAT:
 * Repository for OAuth Sessions (User-Server connection state).
 *
 * WHY:
 * Manages the state of a user's OAuth connection to an external MCP Server (e.g. Google Drive).
 * Stores tokens securely (encrypted at rest ideally, but here just storage).
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
exports.oauthSessionsRepository = exports.OAuthSessionsRepository = void 0;
var drizzle_orm_1 = require("drizzle-orm");
var node_crypto_1 = require("node:crypto");
var index_js_1 = require("../index.js");
var metamcp_schema_js_1 = require("../metamcp-schema.js");
var OAuthSessionsRepository = /** @class */ (function () {
    function OAuthSessionsRepository() {
    }
    OAuthSessionsRepository.prototype.upsert = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var existingSession, updatedSession, payload, createdSession;
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select()
                            .from(metamcp_schema_js_1.oauthSessionsTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.oauthSessionsTable.mcp_server_uuid, input.mcp_server_uuid))];
                    case 1:
                        existingSession = (_f.sent())[0];
                        if (!existingSession) return [3 /*break*/, 3];
                        return [4 /*yield*/, index_js_1.db
                                .update(metamcp_schema_js_1.oauthSessionsTable)
                                .set({
                                // Merge input fields, keep existing if undefined in input (partial update logic handled by service usually, but here strict)
                                client_information: (_a = input.client_information) !== null && _a !== void 0 ? _a : existingSession.client_information,
                                tokens: (_b = input.tokens) !== null && _b !== void 0 ? _b : existingSession.tokens,
                                code_verifier: (_c = input.code_verifier) !== null && _c !== void 0 ? _c : existingSession.code_verifier,
                                updated_at: new Date(),
                            })
                                .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.oauthSessionsTable.uuid, existingSession.uuid))
                                .returning()];
                    case 2:
                        updatedSession = (_f.sent())[0];
                        return [2 /*return*/, updatedSession];
                    case 3:
                        payload = __assign({ uuid: (0, node_crypto_1.randomUUID)(), mcp_server_uuid: input.mcp_server_uuid, tokens: (_d = input.tokens) !== null && _d !== void 0 ? _d : null, code_verifier: (_e = input.code_verifier) !== null && _e !== void 0 ? _e : null }, (input.client_information ? { client_information: input.client_information } : {}));
                        return [4 /*yield*/, index_js_1.db
                                .insert(metamcp_schema_js_1.oauthSessionsTable)
                                .values(payload)
                                .returning()];
                    case 4:
                        createdSession = (_f.sent())[0];
                        return [2 /*return*/, createdSession];
                }
            });
        });
    };
    OAuthSessionsRepository.prototype.findByMcpServerUuid = function (mcpServerUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var session;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select()
                            .from(metamcp_schema_js_1.oauthSessionsTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.oauthSessionsTable.mcp_server_uuid, mcpServerUuid))];
                    case 1:
                        session = (_a.sent())[0];
                        return [2 /*return*/, session];
                }
            });
        });
    };
    // Find all sessions (maintenance/admin)
    OAuthSessionsRepository.prototype.findAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select()
                            .from(metamcp_schema_js_1.oauthSessionsTable)
                            .orderBy((0, drizzle_orm_1.desc)(metamcp_schema_js_1.oauthSessionsTable.updated_at))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    OAuthSessionsRepository.prototype.delete = function (uuid) {
        return __awaiter(this, void 0, void 0, function () {
            var deletedSession;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .delete(metamcp_schema_js_1.oauthSessionsTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.oauthSessionsTable.uuid, uuid))
                            .returning()];
                    case 1:
                        deletedSession = (_a.sent())[0];
                        return [2 /*return*/, deletedSession];
                }
            });
        });
    };
    return OAuthSessionsRepository;
}());
exports.OAuthSessionsRepository = OAuthSessionsRepository;
exports.oauthSessionsRepository = new OAuthSessionsRepository();
