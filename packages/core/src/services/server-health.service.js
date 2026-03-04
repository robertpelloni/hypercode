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
exports.serverHealthService = exports.ServerHealthService = void 0;
var index_js_1 = require("../db/repositories/index.js");
var config_service_js_1 = require("./config.service.js");
var auto_reconnect_service_js_1 = require("./auto-reconnect.service.js");
var mcp_client_service_js_1 = require("./mcp-client.service.js");
var server_error_tracker_service_js_1 = require("./server-error-tracker.service.js");
var utils_service_js_1 = require("./utils.service.js");
var ServerHealthService = /** @class */ (function () {
    function ServerHealthService() {
        this.healthStates = new Map();
        this.periodicCheckInterval = null;
        this.lastFullCheckAt = null;
        this.isRunning = false;
        this.DEFAULT_CHECK_INTERVAL_MS = 60000;
        this.DEFAULT_TIMEOUT_MS = 10000;
        this.DEFAULT_UNHEALTHY_THRESHOLD = 3;
    }
    ServerHealthService.getInstance = function () {
        if (!ServerHealthService.instance) {
            ServerHealthService.instance = new ServerHealthService();
        }
        return ServerHealthService.instance;
    };
    ServerHealthService.prototype.checkServerHealth = function (serverUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, checkedAt, server, serverParams, isInErrorState, timeoutMs_1, connectionResult, responseTimeMs, result, error_1, responseTimeMs, errorMessage, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = Date.now();
                        checkedAt = new Date().toISOString();
                        return [4 /*yield*/, index_js_1.mcpServersRepository.findByUuid(serverUuid)];
                    case 1:
                        server = _a.sent();
                        if (!server) {
                            return [2 /*return*/, {
                                    serverUuid: serverUuid,
                                    success: false,
                                    responseTimeMs: Date.now() - startTime,
                                    errorMessage: "Server not found",
                                    checkedAt: checkedAt,
                                }];
                        }
                        return [4 /*yield*/, (0, utils_service_js_1.convertDbServerToParams)(server)];
                    case 2:
                        serverParams = _a.sent();
                        if (!serverParams) {
                            return [2 /*return*/, {
                                    serverUuid: serverUuid,
                                    success: false,
                                    responseTimeMs: Date.now() - startTime,
                                    errorMessage: "Failed to convert server parameters",
                                    checkedAt: checkedAt,
                                }];
                        }
                        return [4 /*yield*/, server_error_tracker_service_js_1.serverErrorTracker.isServerInErrorState(serverUuid)];
                    case 3:
                        isInErrorState = _a.sent();
                        if (isInErrorState) {
                            this.updateHealthState(serverUuid, server.name, {
                                serverUuid: serverUuid,
                                success: false,
                                responseTimeMs: Date.now() - startTime,
                                errorMessage: "Server is in ERROR state due to repeated crashes",
                                checkedAt: checkedAt,
                            });
                            return [2 /*return*/, {
                                    serverUuid: serverUuid,
                                    success: false,
                                    responseTimeMs: Date.now() - startTime,
                                    errorMessage: "Server is in ERROR state due to repeated crashes",
                                    checkedAt: checkedAt,
                                }];
                        }
                        this.setServerStatus(serverUuid, server.name, "CHECKING");
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 7, , 8]);
                        return [4 /*yield*/, this.getTimeoutMs()];
                    case 5:
                        timeoutMs_1 = _a.sent();
                        return [4 /*yield*/, Promise.race([
                                this.performHealthCheck(serverParams),
                                new Promise(function (resolve) {
                                    return setTimeout(function () {
                                        return resolve({
                                            success: false,
                                            errorMessage: "Health check timed out",
                                        });
                                    }, timeoutMs_1);
                                }),
                            ])];
                    case 6:
                        connectionResult = _a.sent();
                        responseTimeMs = Date.now() - startTime;
                        result = {
                            serverUuid: serverUuid,
                            success: connectionResult.success,
                            responseTimeMs: responseTimeMs,
                            toolCount: connectionResult.success
                                ? connectionResult.toolCount
                                : undefined,
                            errorMessage: connectionResult.success
                                ? undefined
                                : connectionResult.errorMessage,
                            checkedAt: checkedAt,
                        };
                        this.updateHealthState(serverUuid, server.name, result);
                        return [2 /*return*/, result];
                    case 7:
                        error_1 = _a.sent();
                        responseTimeMs = Date.now() - startTime;
                        errorMessage = error_1 instanceof Error ? error_1.message : "Unknown error";
                        result = {
                            serverUuid: serverUuid,
                            success: false,
                            responseTimeMs: responseTimeMs,
                            errorMessage: errorMessage,
                            checkedAt: checkedAt,
                        };
                        this.updateHealthState(serverUuid, server.name, result);
                        return [2 /*return*/, result];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    ServerHealthService.prototype.performHealthCheck = function (serverParams) {
        return __awaiter(this, void 0, void 0, function () {
            var connectedClient, toolsResult, toolCount, error_2, error_3;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 8, , 9]);
                        return [4 /*yield*/, (0, mcp_client_service_js_1.connectMetaMcpClient)(serverParams)];
                    case 1:
                        connectedClient = _c.sent();
                        if (!connectedClient) {
                            return [2 /*return*/, { success: false, errorMessage: "Failed to connect to server" }];
                        }
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 5, , 7]);
                        return [4 /*yield*/, connectedClient.client.listTools()];
                    case 3:
                        toolsResult = _c.sent();
                        toolCount = (_b = (_a = toolsResult.tools) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
                        return [4 /*yield*/, connectedClient.cleanup()];
                    case 4:
                        _c.sent();
                        return [2 /*return*/, { success: true, toolCount: toolCount }];
                    case 5:
                        error_2 = _c.sent();
                        return [4 /*yield*/, connectedClient.cleanup().catch(function () { })];
                    case 6:
                        _c.sent();
                        return [2 /*return*/, {
                                success: false,
                                errorMessage: error_2 instanceof Error ? error_2.message : "Failed to list tools",
                            }];
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        error_3 = _c.sent();
                        return [2 /*return*/, {
                                success: false,
                                errorMessage: error_3 instanceof Error ? error_3.message : "Connection failed",
                            }];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    ServerHealthService.prototype.checkMultipleServers = function (serverUuids) {
        return __awaiter(this, void 0, void 0, function () {
            var uuidsToCheck, allServers, results;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        uuidsToCheck = serverUuids;
                        if (!(!uuidsToCheck || uuidsToCheck.length === 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, index_js_1.mcpServersRepository.findAll()];
                    case 1:
                        allServers = _a.sent();
                        uuidsToCheck = allServers.map(function (s) { return s.uuid; });
                        _a.label = 2;
                    case 2: return [4 /*yield*/, Promise.allSettled((uuidsToCheck || []).map(function (uuid) { return _this.checkServerHealth(uuid); }))];
                    case 3:
                        results = _a.sent();
                        this.lastFullCheckAt = new Date();
                        return [2 /*return*/, results.map(function (result, index) {
                                var _a, _b;
                                if (result.status === "fulfilled") {
                                    return result.value;
                                }
                                return {
                                    serverUuid: uuidsToCheck[index],
                                    success: false,
                                    responseTimeMs: 0,
                                    errorMessage: (_b = (_a = result.reason) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : "Unknown error",
                                    checkedAt: new Date().toISOString(),
                                };
                            })];
                }
            });
        });
    };
    ServerHealthService.prototype.setServerStatus = function (serverUuid, serverName, status) {
        var existing = this.healthStates.get(serverUuid);
        if (existing) {
            existing.status = status;
        }
        else {
            this.healthStates.set(serverUuid, {
                serverUuid: serverUuid,
                serverName: serverName,
                status: status,
                lastChecked: null,
                lastHealthy: null,
                responseTimeMs: null,
                errorMessage: null,
                consecutiveFailures: 0,
                toolCount: null,
            });
        }
    };
    ServerHealthService.prototype.updateHealthState = function (serverUuid, serverName, result) {
        var _a, _b, _c, _d, _e;
        var existing = this.healthStates.get(serverUuid);
        var now = new Date();
        if (result.success) {
            this.healthStates.set(serverUuid, {
                serverUuid: serverUuid,
                serverName: serverName,
                status: "HEALTHY",
                lastChecked: now,
                lastHealthy: now,
                responseTimeMs: result.responseTimeMs,
                errorMessage: null,
                consecutiveFailures: 0,
                toolCount: (_a = result.toolCount) !== null && _a !== void 0 ? _a : null,
            });
        }
        else {
            var consecutiveFailures = ((_b = existing === null || existing === void 0 ? void 0 : existing.consecutiveFailures) !== null && _b !== void 0 ? _b : 0) + 1;
            var unhealthyThreshold = this.DEFAULT_UNHEALTHY_THRESHOLD;
            var isNowUnhealthy = consecutiveFailures >= unhealthyThreshold;
            this.healthStates.set(serverUuid, {
                serverUuid: serverUuid,
                serverName: serverName,
                status: isNowUnhealthy ? "UNHEALTHY" : "UNKNOWN",
                lastChecked: now,
                lastHealthy: (_c = existing === null || existing === void 0 ? void 0 : existing.lastHealthy) !== null && _c !== void 0 ? _c : null,
                responseTimeMs: result.responseTimeMs,
                errorMessage: (_d = result.errorMessage) !== null && _d !== void 0 ? _d : null,
                consecutiveFailures: consecutiveFailures,
                toolCount: (_e = existing === null || existing === void 0 ? void 0 : existing.toolCount) !== null && _e !== void 0 ? _e : null,
            });
            if (isNowUnhealthy) {
                auto_reconnect_service_js_1.autoReconnectService.scheduleReconnection(serverUuid, serverName, "health_failure");
            }
        }
    };
    ServerHealthService.prototype.getServerHealth = function (serverUuid) {
        var state = this.healthStates.get(serverUuid);
        if (!state)
            return undefined;
        return this.stateToHealthInfo(state);
    };
    ServerHealthService.prototype.getAllServerHealth = function () {
        var _this = this;
        return Array.from(this.healthStates.values()).map(function (state) {
            return _this.stateToHealthInfo(state);
        });
    };
    ServerHealthService.prototype.stateToHealthInfo = function (state) {
        var _a, _b, _c, _d;
        return {
            serverUuid: state.serverUuid,
            serverName: state.serverName,
            status: state.status,
            lastChecked: (_b = (_a = state.lastChecked) === null || _a === void 0 ? void 0 : _a.toISOString()) !== null && _b !== void 0 ? _b : null,
            lastHealthy: (_d = (_c = state.lastHealthy) === null || _c === void 0 ? void 0 : _c.toISOString()) !== null && _d !== void 0 ? _d : null,
            responseTimeMs: state.responseTimeMs,
            errorMessage: state.errorMessage,
            consecutiveFailures: state.consecutiveFailures,
            toolCount: state.toolCount,
        };
    };
    ServerHealthService.prototype.getHealthSummary = function () {
        var _a, _b;
        var states = Array.from(this.healthStates.values());
        return {
            totalServers: states.length,
            healthyCount: states.filter(function (s) { return s.status === "HEALTHY"; }).length,
            unhealthyCount: states.filter(function (s) { return s.status === "UNHEALTHY"; }).length,
            unknownCount: states.filter(function (s) { return s.status === "UNKNOWN"; }).length,
            checkingCount: states.filter(function (s) { return s.status === "CHECKING"; }).length,
            lastFullCheckAt: (_b = (_a = this.lastFullCheckAt) === null || _a === void 0 ? void 0 : _a.toISOString()) !== null && _b !== void 0 ? _b : null,
        };
    };
    ServerHealthService.prototype.startPeriodicChecks = function () {
        return __awaiter(this, void 0, void 0, function () {
            var intervalMs;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.isRunning) {
                            console.log("Periodic health checks already running");
                            return [2 /*return*/];
                        }
                        this.isRunning = true;
                        return [4 /*yield*/, this.getCheckIntervalMs()];
                    case 1:
                        intervalMs = _a.sent();
                        console.log("Starting periodic health checks with interval: ".concat(intervalMs, "ms"));
                        return [4 /*yield*/, this.checkMultipleServers()];
                    case 2:
                        _a.sent();
                        this.periodicCheckInterval = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                            var error_4;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, this.checkMultipleServers()];
                                    case 1:
                                        _a.sent();
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_4 = _a.sent();
                                        console.error("Error during periodic health check:", error_4);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); }, intervalMs);
                        return [2 /*return*/];
                }
            });
        });
    };
    ServerHealthService.prototype.stopPeriodicChecks = function () {
        if (this.periodicCheckInterval) {
            clearInterval(this.periodicCheckInterval);
            this.periodicCheckInterval = null;
        }
        this.isRunning = false;
        console.log("Stopped periodic health checks");
    };
    ServerHealthService.prototype.getCheckIntervalMs = function () {
        return __awaiter(this, void 0, void 0, function () {
            var config, parsed, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, config_service_js_1.configService.getConfig("HEALTH_CHECK_INTERVAL")];
                    case 1:
                        config = _b.sent();
                        if (config) {
                            parsed = parseInt(config, 10);
                            if (!isNaN(parsed) && parsed >= 5000) {
                                return [2 /*return*/, parsed];
                            }
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        _a = _b.sent();
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/, this.DEFAULT_CHECK_INTERVAL_MS];
                }
            });
        });
    };
    ServerHealthService.prototype.getTimeoutMs = function () {
        return __awaiter(this, void 0, void 0, function () {
            var timeout, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, config_service_js_1.configService.getMcpTimeout()];
                    case 1:
                        timeout = _b.sent();
                        return [2 /*return*/, Math.min(timeout, this.DEFAULT_TIMEOUT_MS)];
                    case 2:
                        _a = _b.sent();
                        return [2 /*return*/, this.DEFAULT_TIMEOUT_MS];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ServerHealthService.prototype.clearHealthState = function (serverUuid) {
        this.healthStates.delete(serverUuid);
    };
    ServerHealthService.prototype.clearAllHealthStates = function () {
        this.healthStates.clear();
        this.lastFullCheckAt = null;
    };
    ServerHealthService.instance = null;
    return ServerHealthService;
}());
exports.ServerHealthService = ServerHealthService;
exports.serverHealthService = ServerHealthService.getInstance();
