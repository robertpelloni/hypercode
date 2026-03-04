"use strict";
/**
 * @file docker-sessions.repo.ts
 * @module packages/core/src/db/repositories/docker-sessions.repo
 *
 * WHAT:
 * Repository for Docker Sessions.
 *
 * WHY:
 * Tracks running Docker containers for MCP servers created dynamically.
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
exports.dockerSessionsRepository = exports.DockerSessionsRepository = void 0;
// Schema definition for Create input (since not in Zod types explicitly yet? check imports)
// Assuming we match the table insert structure.
var drizzle_orm_1 = require("drizzle-orm"); // Removed desc
var index_js_1 = require("../index.js");
var metamcp_schema_js_1 = require("../metamcp-schema.js");
var node_crypto_1 = require("node:crypto");
var DockerSessionsRepository = /** @class */ (function () {
    function DockerSessionsRepository() {
    }
    DockerSessionsRepository.prototype.create = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var session;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .insert(metamcp_schema_js_1.dockerSessionsTable)
                            .values(__assign(__assign({}, input), { uuid: (0, node_crypto_1.randomUUID)() }))
                            .returning()];
                    case 1:
                        session = (_a.sent())[0];
                        return [2 /*return*/, session];
                }
            });
        });
    };
    DockerSessionsRepository.prototype.findByMcpServerUuid = function (mcpServerUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var session;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select()
                            .from(metamcp_schema_js_1.dockerSessionsTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.dockerSessionsTable.mcp_server_uuid, mcpServerUuid))];
                    case 1:
                        session = (_a.sent())[0];
                        return [2 /*return*/, session];
                }
            });
        });
    };
    DockerSessionsRepository.prototype.updateStatus = function (containerId, status) {
        return __awaiter(this, void 0, void 0, function () {
            var updatedSession;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .update(metamcp_schema_js_1.dockerSessionsTable)
                            .set({
                            status: status,
                            updated_at: new Date(),
                        })
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.dockerSessionsTable.container_id, containerId))
                            .returning()];
                    case 1:
                        updatedSession = (_a.sent())[0];
                        return [2 /*return*/, updatedSession];
                }
            });
        });
    };
    DockerSessionsRepository.prototype.delete = function (uuid) {
        return __awaiter(this, void 0, void 0, function () {
            var deletedSession;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .delete(metamcp_schema_js_1.dockerSessionsTable)
                            .where((0, drizzle_orm_1.eq)(metamcp_schema_js_1.dockerSessionsTable.uuid, uuid))
                            .returning()];
                    case 1:
                        deletedSession = (_a.sent())[0];
                        return [2 /*return*/, deletedSession];
                }
            });
        });
    };
    return DockerSessionsRepository;
}());
exports.DockerSessionsRepository = DockerSessionsRepository;
exports.dockerSessionsRepository = new DockerSessionsRepository();
