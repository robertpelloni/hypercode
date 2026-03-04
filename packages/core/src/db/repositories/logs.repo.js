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
exports.logsRepository = exports.LogsRepository = void 0;
var drizzle_orm_1 = require("drizzle-orm");
var node_crypto_1 = require("node:crypto");
var index_js_1 = require("../index.js");
var metamcp_schema_js_1 = require("../metamcp-schema.js");
var LogsRepository = /** @class */ (function () {
    function LogsRepository() {
    }
    LogsRepository.prototype.create = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var payload;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        payload = {
                            uuid: (0, node_crypto_1.randomUUID)(),
                            tool_name: input.toolName,
                            // level: input.level, // Schema doesn't have level/message?
                            // Wait, schema has 'error', 'args', 'result', 'duration_ms'.
                            // 'message' and 'level' are in Zod but not in DB schema shown in Step 6596?
                            // Let's check schema again. Step 6596 lines 553-579.
                            // fields: uuid, tool_name, mcp_server_uuid, namespace_uuid, endpoint_uuid, args, result, error, duration_ms, session_id, parent_call_uuid, created_at.
                            // NO 'message' or 'level'.
                            // So DB stores structured tool call logs.
                            // Zod 'MetaMcpLogEntrySchema' has 'message', 'level'.
                            // Maybe this repo is only for Tool Call Logs?
                            // And system logs go elsewhere?
                            // I will map input to schema fields.
                            // input.message -> maybe mostly implicit?
                            // I'll stick to DB schema fields.
                            args: input.arguments,
                            result: input.result,
                            error: input.error,
                            duration_ms: input.durationMs,
                            session_id: input.sessionId,
                            parent_call_uuid: input.parentCallUuid,
                            // Missing: mcp_server_uuid, namespace_uuid, endpoint_uuid.
                            // I should accept them if available.
                        };
                        return [4 /*yield*/, index_js_1.db.insert(metamcp_schema_js_1.toolCallLogsTable).values(payload)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    LogsRepository.prototype.findAll = function () {
        return __awaiter(this, arguments, void 0, function (limit) {
            var logs;
            if (limit === void 0) { limit = 100; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db
                            .select()
                            .from(metamcp_schema_js_1.toolCallLogsTable)
                            .orderBy((0, drizzle_orm_1.desc)(metamcp_schema_js_1.toolCallLogsTable.created_at))
                            .limit(limit)];
                    case 1:
                        logs = _a.sent();
                        return [2 /*return*/, logs.map(function (log) {
                                var _a, _b, _c, _d, _e;
                                return ({
                                    id: log.uuid,
                                    timestamp: new Date(log.created_at),
                                    level: log.error ? "error" : "info",
                                    message: "Tool call: ".concat(log.tool_name),
                                    toolName: log.tool_name,
                                    error: log.error,
                                    arguments: (_a = log.args) !== null && _a !== void 0 ? _a : undefined,
                                    result: (_b = log.result) !== null && _b !== void 0 ? _b : undefined,
                                    durationMs: (_c = log.duration_ms) === null || _c === void 0 ? void 0 : _c.toString(),
                                    sessionId: (_d = log.session_id) !== null && _d !== void 0 ? _d : undefined,
                                    parentCallUuid: (_e = log.parent_call_uuid) !== null && _e !== void 0 ? _e : undefined,
                                });
                            })];
                }
            });
        });
    };
    LogsRepository.prototype.clear = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, index_js_1.db.delete(metamcp_schema_js_1.toolCallLogsTable)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return LogsRepository;
}());
exports.LogsRepository = LogsRepository;
exports.logsRepository = new LogsRepository();
