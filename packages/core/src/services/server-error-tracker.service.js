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
exports.serverErrorTracker = exports.ServerErrorTracker = void 0;
var index_js_1 = require("../types/metamcp/index.js");
var index_js_2 = require("../db/repositories/index.js");
var config_service_js_1 = require("./config.service.js");
var ServerErrorTracker = /** @class */ (function () {
    function ServerErrorTracker() {
        // Track crash attempts per server
        this.crashAttempts = new Map();
        // Default max attempts before marking as ERROR (fallback if config is not available)
        this.fallbackMaxAttempts = 1;
        // Server-specific max attempts (can be configured per server)
        this.serverMaxAttempts = new Map();
    }
    ServerErrorTracker.getInstance = function () {
        if (!ServerErrorTracker.instance) {
            ServerErrorTracker.instance = new ServerErrorTracker();
        }
        return ServerErrorTracker.instance;
    };
    /**
     * Set max attempts for a specific server
     */
    ServerErrorTracker.prototype.setServerMaxAttempts = function (serverUuid, maxAttempts) {
        this.serverMaxAttempts.set(serverUuid, maxAttempts);
    };
    /**
     * Get max attempts for a specific server
     */
    ServerErrorTracker.prototype.getServerMaxAttempts = function (serverUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var serverSpecific, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        serverSpecific = this.serverMaxAttempts.get(serverUuid);
                        if (serverSpecific !== undefined) {
                            return [2 /*return*/, serverSpecific];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, config_service_js_1.configService.getMcpMaxAttempts()];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        error_1 = _a.sent();
                        console.warn("Failed to get MCP max attempts from config, using fallback:", error_1);
                        return [2 /*return*/, this.fallbackMaxAttempts];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Record a server crash and check if it should be marked as ERROR
     */
    ServerErrorTracker.prototype.recordServerCrash = function (serverUuid, exitCode, signal) {
        return __awaiter(this, void 0, void 0, function () {
            var currentAttempts, newAttempts, maxAttempts, crashInfo, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.info("recordServerCrash called for server ".concat(serverUuid));
                        currentAttempts = this.crashAttempts.get(serverUuid) || 0;
                        newAttempts = currentAttempts + 1;
                        // Update crash attempts tracking
                        this.crashAttempts.set(serverUuid, newAttempts);
                        return [4 /*yield*/, this.getServerMaxAttempts(serverUuid)];
                    case 1:
                        maxAttempts = _a.sent();
                        console.info("Server ".concat(serverUuid, " crashed. Attempt ").concat(newAttempts, "/").concat(maxAttempts));
                        if (!(newAttempts >= maxAttempts)) return [3 /*break*/, 5];
                        console.warn("Server ".concat(serverUuid, " has crashed ").concat(newAttempts, " times. Marking as ERROR."));
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.markServerAsError(serverUuid)];
                    case 3:
                        _a.sent();
                        crashInfo = {
                            serverUuid: serverUuid,
                            exitCode: exitCode,
                            signal: signal,
                            timestamp: new Date(),
                        };
                        console.error("Server marked as ERROR due to repeated crashes:", crashInfo);
                        return [3 /*break*/, 5];
                    case 4:
                        error_2 = _a.sent();
                        console.error("Failed to mark server ".concat(serverUuid, " as ERROR:"), error_2);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Mark a server as ERROR
     */
    ServerErrorTracker.prototype.markServerAsError = function (serverUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        // Update the server-level error status
                        return [4 /*yield*/, index_js_2.mcpServersRepository.updateServerErrorStatus({
                                serverUuid: serverUuid,
                                errorStatus: index_js_1.McpServerErrorStatusEnum.Enum.ERROR,
                            })];
                    case 1:
                        // Update the server-level error status
                        _a.sent();
                        console.error("Server ".concat(serverUuid, " marked as ERROR at server level"));
                        return [3 /*break*/, 3];
                    case 2:
                        error_3 = _a.sent();
                        console.error("Error marking server ".concat(serverUuid, " as ERROR:"), error_3);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Reset crash attempts for a server (e.g., after successful recovery)
     */
    ServerErrorTracker.prototype.resetServerAttempts = function (serverUuid) {
        this.crashAttempts.delete(serverUuid);
    };
    /**
     * Get current crash attempts for a server
     */
    ServerErrorTracker.prototype.getServerAttempts = function (serverUuid) {
        return this.crashAttempts.get(serverUuid) || 0;
    };
    /**
     * Check if a server is in ERROR state
     */
    ServerErrorTracker.prototype.isServerInErrorState = function (serverUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var server, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, index_js_2.mcpServersRepository.findByUuid(serverUuid)];
                    case 1:
                        server = _a.sent();
                        return [2 /*return*/, (server === null || server === void 0 ? void 0 : server.error_status) === index_js_1.McpServerErrorStatusEnum.Enum.ERROR];
                    case 2:
                        error_4 = _a.sent();
                        console.error("Error checking server error state for ".concat(serverUuid, ":"), error_4);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Reset error state for a server (e.g., after manual recovery)
     */
    ServerErrorTracker.prototype.resetServerErrorState = function (serverUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        // Reset crash attempts
                        this.resetServerAttempts(serverUuid);
                        // Update the database to clear the error status
                        return [4 /*yield*/, index_js_2.mcpServersRepository.updateServerErrorStatus({
                                serverUuid: serverUuid,
                                errorStatus: index_js_1.McpServerErrorStatusEnum.Enum.NONE,
                            })];
                    case 1:
                        // Update the database to clear the error status
                        _a.sent();
                        console.info("Reset error state for server ".concat(serverUuid));
                        return [3 /*break*/, 3];
                    case 2:
                        error_5 = _a.sent();
                        console.error("Error resetting error state for server ".concat(serverUuid, ":"), error_5);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ServerErrorTracker.instance = null;
    return ServerErrorTracker;
}());
exports.ServerErrorTracker = ServerErrorTracker;
// Export singleton instance
exports.serverErrorTracker = ServerErrorTracker.getInstance();
