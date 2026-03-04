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
exports.autoReconnectService = exports.AutoReconnectService = void 0;
var index_js_1 = require("../db/repositories/index.js");
var config_service_js_1 = require("./config.service.js");
var mcp_server_pool_service_js_1 = require("./mcp-server-pool.service.js");
var server_error_tracker_service_js_1 = require("./server-error-tracker.service.js");
var server_health_service_js_1 = require("./server-health.service.js");
var utils_service_js_1 = require("./utils.service.js");
var DEFAULT_CONFIG = {
    maxAttempts: 5,
    baseDelayMs: 1000,
    maxDelayMs: 60000,
    jitterFactor: 0.2,
    autoReconnectOnCrash: true,
    autoReconnectOnHealthFailure: true,
};
var AutoReconnectService = /** @class */ (function () {
    function AutoReconnectService() {
        this.reconnectionStates = new Map();
        this.reconnectionTimers = new Map();
        this.config = __assign({}, DEFAULT_CONFIG);
        this.isEnabled = true;
        this.onReconnectSuccessListeners = [];
        this.onReconnectFailureListeners = [];
        this.onMaxRetriesExceededListeners = [];
    }
    AutoReconnectService.getInstance = function () {
        if (!AutoReconnectService.instance) {
            AutoReconnectService.instance = new AutoReconnectService();
        }
        return AutoReconnectService.instance;
    };
    AutoReconnectService.prototype.configure = function (config) {
        this.config = __assign(__assign({}, this.config), config);
        console.log("AutoReconnectService configured:", this.config);
    };
    AutoReconnectService.prototype.loadConfigFromDb = function () {
        return __awaiter(this, void 0, void 0, function () {
            var maxAttempts, timeout, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, config_service_js_1.configService.getMcpMaxAttempts()];
                    case 1:
                        maxAttempts = _a.sent();
                        return [4 /*yield*/, config_service_js_1.configService.getMcpTimeout()];
                    case 2:
                        timeout = _a.sent();
                        this.config.maxAttempts = Math.max(maxAttempts, 1);
                        this.config.maxDelayMs = Math.min(timeout * 2, 120000);
                        console.log("AutoReconnectService loaded config from DB:", this.config);
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        console.warn("Failed to load auto-reconnect config from DB, using defaults:", error_1);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    AutoReconnectService.prototype.setEnabled = function (enabled) {
        this.isEnabled = enabled;
        if (!enabled) {
            this.cancelAllReconnections();
        }
        console.log("AutoReconnectService ".concat(enabled ? "enabled" : "disabled"));
    };
    AutoReconnectService.prototype.isAutoReconnectEnabled = function () {
        return this.isEnabled;
    };
    AutoReconnectService.prototype.scheduleReconnection = function (serverUuid, serverName, reason) {
        var _a, _b;
        if (!this.isEnabled) {
            console.log("Auto-reconnect disabled, skipping reconnection for ".concat(serverName));
            return;
        }
        if (reason === "crash" && !this.config.autoReconnectOnCrash) {
            console.log("Auto-reconnect on crash disabled, skipping for ".concat(serverName));
            return;
        }
        if (reason === "health_failure" &&
            !this.config.autoReconnectOnHealthFailure) {
            console.log("Auto-reconnect on health failure disabled, skipping for ".concat(serverName));
            return;
        }
        var existingState = this.reconnectionStates.get(serverUuid);
        if (existingState &&
            (existingState.status === "RECONNECTING" ||
                existingState.status === "PENDING")) {
            console.log("Reconnection already in progress for ".concat(serverName, ", skipping"));
            return;
        }
        var state = {
            serverUuid: serverUuid,
            serverName: serverName,
            status: "PENDING",
            currentAttempt: 0,
            maxAttempts: this.config.maxAttempts,
            nextRetryAt: null,
            lastAttemptAt: null,
            lastError: null,
            totalAttempts: (_a = existingState === null || existingState === void 0 ? void 0 : existingState.totalAttempts) !== null && _a !== void 0 ? _a : 0,
            successfulReconnections: (_b = existingState === null || existingState === void 0 ? void 0 : existingState.successfulReconnections) !== null && _b !== void 0 ? _b : 0,
        };
        this.reconnectionStates.set(serverUuid, state);
        console.log("Scheduled reconnection for ".concat(serverName, " (").concat(serverUuid, ") due to ").concat(reason));
        this.attemptReconnection(serverUuid);
    };
    AutoReconnectService.prototype.attemptReconnection = function (serverUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var state, server, serverParams, healthResult, error_2, errorMessage, delayMs, existingTimer, timer;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        state = this.reconnectionStates.get(serverUuid);
                        if (!state) {
                            console.error("No reconnection state found for ".concat(serverUuid));
                            return [2 /*return*/];
                        }
                        if (state.currentAttempt >= state.maxAttempts) {
                            state.status = "MAX_RETRIES_EXCEEDED";
                            console.error("Max reconnection attempts (".concat(state.maxAttempts, ") exceeded for ").concat(state.serverName));
                            this.notifyMaxRetriesExceeded(serverUuid);
                            return [2 /*return*/];
                        }
                        state.currentAttempt++;
                        state.totalAttempts++;
                        state.status = "RECONNECTING";
                        state.lastAttemptAt = new Date();
                        console.log("Attempting reconnection for ".concat(state.serverName, " (attempt ").concat(state.currentAttempt, "/").concat(state.maxAttempts, ")"));
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 7, , 8]);
                        return [4 /*yield*/, index_js_1.mcpServersRepository.findByUuid(serverUuid)];
                    case 2:
                        server = _b.sent();
                        if (!server) {
                            throw new Error("Server not found in database");
                        }
                        return [4 /*yield*/, (0, utils_service_js_1.convertDbServerToParams)(server)];
                    case 3:
                        serverParams = _b.sent();
                        if (!serverParams) {
                            throw new Error("Failed to convert server parameters");
                        }
                        return [4 /*yield*/, server_error_tracker_service_js_1.serverErrorTracker.resetServerErrorState(serverUuid)];
                    case 4:
                        _b.sent();
                        return [4 /*yield*/, mcp_server_pool_service_js_1.mcpServerPool.invalidateIdleSession(serverUuid, serverParams)];
                    case 5:
                        _b.sent();
                        return [4 /*yield*/, server_health_service_js_1.serverHealthService.checkServerHealth(serverUuid)];
                    case 6:
                        healthResult = _b.sent();
                        if (healthResult.success) {
                            state.status = "SUCCEEDED";
                            state.lastError = null;
                            state.currentAttempt = 0;
                            state.nextRetryAt = null;
                            state.successfulReconnections++;
                            console.log("Successfully reconnected to ".concat(state.serverName, " after ").concat(state.totalAttempts, " attempts"));
                            this.notifyReconnectSuccess(serverUuid);
                        }
                        else {
                            throw new Error((_a = healthResult.errorMessage) !== null && _a !== void 0 ? _a : "Health check failed");
                        }
                        return [3 /*break*/, 8];
                    case 7:
                        error_2 = _b.sent();
                        errorMessage = error_2 instanceof Error ? error_2.message : "Unknown error";
                        state.lastError = errorMessage;
                        console.error("Reconnection attempt ".concat(state.currentAttempt, " failed for ").concat(state.serverName, ": ").concat(errorMessage));
                        if (state.currentAttempt < state.maxAttempts) {
                            delayMs = this.calculateBackoffDelay(state.currentAttempt);
                            state.status = "PENDING";
                            state.nextRetryAt = new Date(Date.now() + delayMs);
                            console.log("Scheduling retry for ".concat(state.serverName, " in ").concat(delayMs, "ms"));
                            existingTimer = this.reconnectionTimers.get(serverUuid);
                            if (existingTimer) {
                                clearTimeout(existingTimer);
                            }
                            timer = setTimeout(function () {
                                _this.attemptReconnection(serverUuid);
                            }, delayMs);
                            this.reconnectionTimers.set(serverUuid, timer);
                        }
                        else {
                            state.status = "MAX_RETRIES_EXCEEDED";
                            console.error("All reconnection attempts exhausted for ".concat(state.serverName));
                            this.notifyMaxRetriesExceeded(serverUuid);
                        }
                        this.notifyReconnectFailure(serverUuid, errorMessage);
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    // Exponential backoff: baseDelay * 2^(attempt-1) with jitter to prevent thundering herd
    AutoReconnectService.prototype.calculateBackoffDelay = function (attempt) {
        var exponentialDelay = this.config.baseDelayMs * Math.pow(2, attempt - 1);
        var cappedDelay = Math.min(exponentialDelay, this.config.maxDelayMs);
        var jitter = cappedDelay * this.config.jitterFactor * Math.random();
        return Math.round(cappedDelay + jitter);
    };
    AutoReconnectService.prototype.triggerReconnection = function (serverUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var server, state;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, index_js_1.mcpServersRepository.findByUuid(serverUuid)];
                    case 1:
                        server = _b.sent();
                        if (!server) {
                            return [2 /*return*/, {
                                    serverUuid: serverUuid,
                                    success: false,
                                    attempt: 0,
                                    error: "Server not found",
                                }];
                        }
                        this.cancelReconnection(serverUuid);
                        this.scheduleReconnection(serverUuid, server.name, "manual");
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 2:
                        _b.sent();
                        state = this.reconnectionStates.get(serverUuid);
                        if (!state) {
                            return [2 /*return*/, {
                                    serverUuid: serverUuid,
                                    success: false,
                                    attempt: 0,
                                    error: "Failed to initialize reconnection",
                                }];
                        }
                        return [2 /*return*/, {
                                serverUuid: serverUuid,
                                success: state.status === "SUCCEEDED",
                                attempt: state.currentAttempt,
                                error: (_a = state.lastError) !== null && _a !== void 0 ? _a : undefined,
                                reconnectedAt: state.status === "SUCCEEDED" ? new Date().toISOString() : undefined,
                            }];
                }
            });
        });
    };
    AutoReconnectService.prototype.cancelReconnection = function (serverUuid) {
        var timer = this.reconnectionTimers.get(serverUuid);
        if (timer) {
            clearTimeout(timer);
            this.reconnectionTimers.delete(serverUuid);
        }
        var state = this.reconnectionStates.get(serverUuid);
        if (state) {
            state.status = "CANCELLED";
            state.nextRetryAt = null;
        }
        console.log("Cancelled reconnection for ".concat(serverUuid));
    };
    AutoReconnectService.prototype.cancelAllReconnections = function () {
        for (var _i = 0, _a = this.reconnectionTimers.values(); _i < _a.length; _i++) {
            var timer = _a[_i];
            clearTimeout(timer);
        }
        this.reconnectionTimers.clear();
        for (var _b = 0, _c = this.reconnectionStates.values(); _b < _c.length; _b++) {
            var state = _c[_b];
            if (state.status === "PENDING" || state.status === "RECONNECTING") {
                state.status = "CANCELLED";
                state.nextRetryAt = null;
            }
        }
        console.log("Cancelled all reconnection attempts");
    };
    AutoReconnectService.prototype.getReconnectionState = function (serverUuid) {
        return this.reconnectionStates.get(serverUuid);
    };
    AutoReconnectService.prototype.getAllReconnectionStates = function () {
        return Array.from(this.reconnectionStates.values());
    };
    AutoReconnectService.prototype.getPendingCount = function () {
        return Array.from(this.reconnectionStates.values()).filter(function (s) { return s.status === "PENDING" || s.status === "RECONNECTING"; }).length;
    };
    AutoReconnectService.prototype.getReconnectionSummary = function () {
        var states = Array.from(this.reconnectionStates.values());
        return {
            totalTracked: states.length,
            pending: states.filter(function (s) { return s.status === "PENDING"; }).length,
            reconnecting: states.filter(function (s) { return s.status === "RECONNECTING"; }).length,
            succeeded: states.filter(function (s) { return s.status === "SUCCEEDED"; }).length,
            failed: states.filter(function (s) { return s.status === "FAILED"; }).length,
            cancelled: states.filter(function (s) { return s.status === "CANCELLED"; }).length,
            maxRetriesExceeded: states.filter(function (s) { return s.status === "MAX_RETRIES_EXCEEDED"; }).length,
        };
    };
    AutoReconnectService.prototype.resetReconnectionState = function (serverUuid) {
        this.cancelReconnection(serverUuid);
        this.reconnectionStates.delete(serverUuid);
        console.log("Reset reconnection state for ".concat(serverUuid));
    };
    AutoReconnectService.prototype.clearAllStates = function () {
        this.cancelAllReconnections();
        this.reconnectionStates.clear();
        console.log("Cleared all reconnection states");
    };
    AutoReconnectService.prototype.onReconnectSuccess = function (listener) {
        this.onReconnectSuccessListeners.push(listener);
    };
    AutoReconnectService.prototype.onReconnectFailure = function (listener) {
        this.onReconnectFailureListeners.push(listener);
    };
    AutoReconnectService.prototype.onMaxRetriesExceeded = function (listener) {
        this.onMaxRetriesExceededListeners.push(listener);
    };
    AutoReconnectService.prototype.notifyReconnectSuccess = function (serverUuid) {
        for (var _i = 0, _a = this.onReconnectSuccessListeners; _i < _a.length; _i++) {
            var listener = _a[_i];
            try {
                listener(serverUuid);
            }
            catch (error) {
                console.error("Error in reconnect success listener:", error);
            }
        }
    };
    AutoReconnectService.prototype.notifyReconnectFailure = function (serverUuid, error) {
        for (var _i = 0, _a = this.onReconnectFailureListeners; _i < _a.length; _i++) {
            var listener = _a[_i];
            try {
                listener(serverUuid, error);
            }
            catch (e) {
                console.error("Error in reconnect failure listener:", e);
            }
        }
    };
    AutoReconnectService.prototype.notifyMaxRetriesExceeded = function (serverUuid) {
        for (var _i = 0, _a = this.onMaxRetriesExceededListeners; _i < _a.length; _i++) {
            var listener = _a[_i];
            try {
                listener(serverUuid);
            }
            catch (error) {
                console.error("Error in max retries exceeded listener:", error);
            }
        }
    };
    AutoReconnectService.prototype.getConfig = function () {
        return __assign({}, this.config);
    };
    AutoReconnectService.instance = null;
    return AutoReconnectService;
}());
exports.AutoReconnectService = AutoReconnectService;
exports.autoReconnectService = AutoReconnectService.getInstance();
