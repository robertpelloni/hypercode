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
exports.AuditService = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
var AuditService = /** @class */ (function () {
    function AuditService(logDir) {
        if (logDir === void 0) { logDir = '.borg/audit'; }
        var _this = this;
        this.buffer = [];
        var absoluteLogDir = path_1.default.isAbsolute(logDir) ? logDir : path_1.default.join(process.cwd(), logDir);
        if (!fs_1.default.existsSync(absoluteLogDir)) {
            fs_1.default.mkdirSync(absoluteLogDir, { recursive: true });
        }
        // Rotate logs by day
        var date = new Date().toISOString().split('T')[0];
        this.logPath = path_1.default.join(absoluteLogDir, "audit-".concat(date, ".jsonl"));
        // Auto-flush every 5 seconds
        this.flushInterval = setInterval(function () { return _this.flush(); }, 5000);
    }
    AuditService.prototype.log = function (action, params, level) {
        if (level === void 0) { level = 'INFO'; }
        var entry = {
            timestamp: Date.now(),
            action: action,
            params: params,
            level: level
        };
        this.buffer.push(entry);
    };
    AuditService.prototype.flush = function () {
        return __awaiter(this, void 0, void 0, function () {
            var chunk, lines, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.buffer.length === 0)
                            return [2 /*return*/];
                        chunk = this.buffer.splice(0, this.buffer.length);
                        lines = chunk.map(function (e) { return JSON.stringify(e); }).join('\n') + '\n';
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, fs_1.default.promises.appendFile(this.logPath, lines, 'utf8')];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        console.error("[AuditService] Failed to flush logs", e_1);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    AuditService.prototype.queryLogs = function () {
        return __awaiter(this, arguments, void 0, function (limit) {
            var content, lines, e_2;
            if (limit === void 0) { limit = 100; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!fs_1.default.existsSync(this.logPath))
                            return [2 /*return*/, []];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, fs_1.default.promises.readFile(this.logPath, 'utf8')];
                    case 2:
                        content = _a.sent();
                        lines = content.trim().split('\n');
                        return [2 /*return*/, lines
                                .map(function (line) {
                                try {
                                    return JSON.parse(line);
                                }
                                catch (_a) {
                                    return null;
                                }
                            })
                                .filter(function (l) { return l !== null; })
                                .slice(-limit)
                                .reverse()]; // Newest first
                    case 3:
                        e_2 = _a.sent();
                        console.error("[AuditService] Failed to query logs", e_2);
                        return [2 /*return*/, []];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    AuditService.prototype.getLogs = function () {
        return __awaiter(this, arguments, void 0, function (limit) {
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.queryLogs(limit)];
            });
        });
    };
    AuditService.prototype.query = function (filter) {
        return __awaiter(this, void 0, void 0, function () {
            var logs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.queryLogs(filter.limit || 100)];
                    case 1:
                        logs = _a.sent();
                        return [2 /*return*/, logs.filter(function (log) {
                                if (filter.level && log.level !== filter.level)
                                    return false;
                                if (filter.action && log.action !== filter.action)
                                    return false;
                                return true;
                            })];
                }
            });
        });
    };
    return AuditService;
}());
exports.AuditService = AuditService;
