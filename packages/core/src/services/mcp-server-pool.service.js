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
exports.mcpServerPool = exports.McpServerPool = void 0;
var config_service_js_1 = require("./config.service.js");
var auto_reconnect_service_js_1 = require("./auto-reconnect.service.js");
var mcp_client_service_js_1 = require("./mcp-client.service.js");
var server_error_tracker_service_js_1 = require("./server-error-tracker.service.js");
var McpServerPool = /** @class */ (function () {
    function McpServerPool(defaultIdleCount) {
        if (defaultIdleCount === void 0) { defaultIdleCount = 1; }
        // Idle sessions: serverUuid -> ConnectedClient (no sessionId assigned yet)
        this.idleSessions = {};
        // Active sessions: sessionId -> Record<serverUuid, ConnectedClient>
        this.activeSessions = {};
        // Mapping: sessionId -> Set<serverUuid> for cleanup tracking
        this.sessionToServers = {};
        // Session creation timestamps: sessionId -> timestamp
        this.sessionTimestamps = {};
        // Server parameters cache: serverUuid -> ServerParameters
        this.serverParamsCache = {};
        // Track ongoing idle session creation to prevent duplicates
        this.creatingIdleSessions = new Set();
        // Session cleanup timer
        this.cleanupTimer = null;
        this.defaultIdleCount = defaultIdleCount;
        this.startCleanupTimer();
    }
    /**
     * Get the singleton instance
     */
    McpServerPool.getInstance = function (defaultIdleCount) {
        if (defaultIdleCount === void 0) { defaultIdleCount = 1; }
        if (!McpServerPool.instance) {
            McpServerPool.instance = new McpServerPool(defaultIdleCount);
        }
        return McpServerPool.instance;
    };
    /**
     * Get or create a session for a specific MCP server
     */
    McpServerPool.prototype.getSession = function (sessionId, serverUuid, params, namespaceUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var idleClient, newClient;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        // Update server params cache
                        this.serverParamsCache[serverUuid] = params;
                        // Check if we already have an active session for this sessionId and server
                        if ((_a = this.activeSessions[sessionId]) === null || _a === void 0 ? void 0 : _a[serverUuid]) {
                            return [2 /*return*/, this.activeSessions[sessionId][serverUuid]];
                        }
                        // Initialize session if it doesn't exist
                        if (!this.activeSessions[sessionId]) {
                            this.activeSessions[sessionId] = {};
                            this.sessionToServers[sessionId] = new Set();
                            this.sessionTimestamps[sessionId] = Date.now();
                        }
                        idleClient = this.idleSessions[serverUuid];
                        if (idleClient) {
                            // Convert idle session to active session
                            delete this.idleSessions[serverUuid];
                            this.activeSessions[sessionId][serverUuid] = idleClient;
                            this.sessionToServers[sessionId].add(serverUuid);
                            console.log("Converted idle session to active for server ".concat(serverUuid, ", session ").concat(sessionId));
                            // Create a new idle session to replace the one we just used (ASYNC - NON-BLOCKING)
                            this.createIdleSessionAsync(serverUuid, params, namespaceUuid);
                            return [2 /*return*/, idleClient];
                        }
                        return [4 /*yield*/, this.createNewConnection(params, namespaceUuid)];
                    case 1:
                        newClient = _b.sent();
                        if (!newClient) {
                            return [2 /*return*/, undefined];
                        }
                        this.activeSessions[sessionId][serverUuid] = newClient;
                        this.sessionToServers[sessionId].add(serverUuid);
                        console.log("Created new active session for server ".concat(serverUuid, ", session ").concat(sessionId));
                        // Also create an idle session for future use (ASYNC - NON-BLOCKING)
                        this.createIdleSessionAsync(serverUuid, params, namespaceUuid);
                        return [2 /*return*/, newClient];
                }
            });
        });
    };
    /**
     * Create a new connection for a server
     */
    McpServerPool.prototype.createNewConnection = function (params, namespaceUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var connectedClient;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("Creating new connection for server ".concat(params.name, " (").concat(params.uuid, ") with namespace: ").concat(namespaceUuid || "none"));
                        return [4 /*yield*/, (0, mcp_client_service_js_1.connectMetaMcpClient)(params, function (exitCode, signal) {
                                console.log("Crash handler callback called for server ".concat(params.name, " (").concat(params.uuid, ") with namespace: ").concat(namespaceUuid || "none"));
                                // Handle process crash - always set up crash handler
                                if (namespaceUuid) {
                                    // If we have a namespace context, use it
                                    _this.handleServerCrash(params.uuid, namespaceUuid, exitCode, signal).catch(function (error) {
                                        console.error("Error handling server crash for ".concat(params.uuid, " in ").concat(namespaceUuid, ":"), error);
                                    });
                                }
                                else {
                                    // If no namespace context, still track the crash globally
                                    _this.handleServerCrashWithoutNamespace(params.uuid, exitCode, signal).catch(function (error) {
                                        console.error("Error handling server crash for ".concat(params.uuid, " (no namespace):"), error);
                                    });
                                }
                            })];
                    case 1:
                        connectedClient = _a.sent();
                        if (!connectedClient) {
                            return [2 /*return*/, undefined];
                        }
                        return [2 /*return*/, connectedClient];
                }
            });
        });
    };
    /**
     * Create an idle session for a server (blocking version for initial setup)
     */
    McpServerPool.prototype.createIdleSession = function (serverUuid, params, namespaceUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var newClient;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Don't create if we already have an idle session for this server
                        if (this.idleSessions[serverUuid]) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.createNewConnection(params, namespaceUuid)];
                    case 1:
                        newClient = _a.sent();
                        if (newClient) {
                            this.idleSessions[serverUuid] = newClient;
                            console.log("Created idle session for server ".concat(serverUuid));
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create an idle session for a server asynchronously (non-blocking)
     */
    McpServerPool.prototype.createIdleSessionAsync = function (serverUuid, params, namespaceUuid) {
        var _this = this;
        // Don't create if we already have an idle session or are already creating one
        if (this.idleSessions[serverUuid] ||
            this.creatingIdleSessions.has(serverUuid)) {
            return;
        }
        // Mark that we're creating an idle session for this server
        this.creatingIdleSessions.add(serverUuid);
        // Create the session in the background (fire and forget)
        this.createNewConnection(params, namespaceUuid)
            .then(function (newClient) {
            if (newClient && !_this.idleSessions[serverUuid]) {
                _this.idleSessions[serverUuid] = newClient;
                console.log("Created background idle session for server [".concat(params.name, "] ").concat(serverUuid));
            }
            else if (newClient) {
                // We already have an idle session, cleanup the extra one
                newClient.cleanup().catch(function (error) {
                    console.error("Error cleaning up extra idle session for ".concat(serverUuid, ":"), error);
                });
            }
        })
            .catch(function (error) {
            console.error("Error creating background idle session for ".concat(serverUuid, ":"), error);
        })
            .finally(function () {
            // Remove from creating set
            _this.creatingIdleSessions.delete(serverUuid);
        });
    };
    /**
     * Ensure idle sessions exist for all servers
     */
    McpServerPool.prototype.ensureIdleSessions = function (serverParams, namespaceUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var promises;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        promises = Object.entries(serverParams).map(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                            var uuid = _b[0], params = _b[1];
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        if (!!this.idleSessions[uuid]) return [3 /*break*/, 2];
                                        return [4 /*yield*/, this.createIdleSession(uuid, params, namespaceUuid)];
                                    case 1:
                                        _c.sent();
                                        _c.label = 2;
                                    case 2: return [2 /*return*/];
                                }
                            });
                        }); });
                        return [4 /*yield*/, Promise.allSettled(promises)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Cleanup a session by sessionId
     */
    McpServerPool.prototype.cleanupSession = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var activeSession, serverUuids;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        activeSession = this.activeSessions[sessionId];
                        if (!activeSession) {
                            return [2 /*return*/];
                        }
                        // Cleanup all connections for this session
                        return [4 /*yield*/, Promise.allSettled(Object.entries(activeSession).map(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                                var _serverUuid = _b[0], client = _b[1];
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0: return [4 /*yield*/, client.cleanup()];
                                        case 1:
                                            _c.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }))];
                    case 1:
                        // Cleanup all connections for this session
                        _a.sent();
                        // Remove from active sessions
                        delete this.activeSessions[sessionId];
                        // Clean up session timestamp
                        delete this.sessionTimestamps[sessionId];
                        serverUuids = this.sessionToServers[sessionId];
                        if (serverUuids) {
                            // For each server this session was using, create new idle sessions if needed (ASYNC - NON-BLOCKING)
                            Array.from(serverUuids).forEach(function (serverUuid) {
                                var params = _this.serverParamsCache[serverUuid];
                                if (params) {
                                    // Note: We don't have namespaceUuid here, so we can't track crashes properly
                                    // This is a limitation of the current design - we'll need to pass namespaceUuid from the caller
                                    _this.createIdleSessionAsync(serverUuid, params);
                                }
                            });
                            delete this.sessionToServers[sessionId];
                        }
                        console.log("Cleaned up MCP server pool session ".concat(sessionId));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Cleanup all sessions
     */
    McpServerPool.prototype.cleanupAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            var activeSessionIds;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        activeSessionIds = Object.keys(this.activeSessions);
                        return [4 /*yield*/, Promise.allSettled(activeSessionIds.map(function (sessionId) { return _this.cleanupSession(sessionId); }))];
                    case 1:
                        _a.sent();
                        // Cleanup all idle sessions
                        return [4 /*yield*/, Promise.allSettled(Object.entries(this.idleSessions).map(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                                var _uuid = _b[0], client = _b[1];
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0: return [4 /*yield*/, client.cleanup()];
                                        case 1:
                                            _c.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }))];
                    case 2:
                        // Cleanup all idle sessions
                        _a.sent();
                        // Clear all state
                        this.idleSessions = {};
                        this.activeSessions = {};
                        this.sessionToServers = {};
                        this.sessionTimestamps = {};
                        this.serverParamsCache = {};
                        this.creatingIdleSessions.clear();
                        // Clear cleanup timer
                        if (this.cleanupTimer) {
                            clearInterval(this.cleanupTimer);
                            this.cleanupTimer = null;
                        }
                        console.log("Cleaned up all MCP server pool sessions");
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get pool status for monitoring
     */
    McpServerPool.prototype.getPoolStatus = function () {
        var _this = this;
        var idle = Object.keys(this.idleSessions).length;
        var active = Object.keys(this.activeSessions).reduce(function (total, sessionId) {
            return total + Object.keys(_this.activeSessions[sessionId]).length;
        }, 0);
        return {
            idle: idle,
            active: active,
            activeSessionIds: Object.keys(this.activeSessions),
            idleServerUuids: Object.keys(this.idleSessions),
        };
    };
    /**
     * Get active session connections for a specific session (for debugging/monitoring)
     */
    McpServerPool.prototype.getSessionConnections = function (sessionId) {
        return this.activeSessions[sessionId];
    };
    /**
     * Get all active session IDs (for debugging/monitoring)
     */
    McpServerPool.prototype.getActiveSessionIds = function () {
        return Object.keys(this.activeSessions);
    };
    /**
     * Invalidate and refresh idle session for a specific server
     * This should be called when a server's parameters (command, args, etc.) change
     */
    McpServerPool.prototype.invalidateIdleSession = function (serverUuid, params, namespaceUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var existingIdleSession, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("Invalidating idle session for server ".concat(serverUuid));
                        // Update server params cache
                        this.serverParamsCache[serverUuid] = params;
                        existingIdleSession = this.idleSessions[serverUuid];
                        if (!existingIdleSession) return [3 /*break*/, 5];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, existingIdleSession.cleanup()];
                    case 2:
                        _a.sent();
                        console.log("Cleaned up existing idle session for server ".concat(serverUuid));
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        console.error("Error cleaning up existing idle session for server ".concat(serverUuid, ":"), error_1);
                        return [3 /*break*/, 4];
                    case 4:
                        delete this.idleSessions[serverUuid];
                        _a.label = 5;
                    case 5:
                        // Remove from creating set if it's in progress
                        this.creatingIdleSessions.delete(serverUuid);
                        // Create a new idle session with updated parameters
                        return [4 /*yield*/, this.createIdleSession(serverUuid, params, namespaceUuid)];
                    case 6:
                        // Create a new idle session with updated parameters
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Invalidate and refresh idle sessions for multiple servers
     */
    McpServerPool.prototype.invalidateIdleSessions = function (serverParams, namespaceUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var promises;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        promises = Object.entries(serverParams).map(function (_a) {
                            var serverUuid = _a[0], params = _a[1];
                            return _this.invalidateIdleSession(serverUuid, params, namespaceUuid);
                        });
                        return [4 /*yield*/, Promise.allSettled(promises)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Clean up idle session for a specific server without creating a new one
     * This should be called when a server is being deleted
     */
    McpServerPool.prototype.cleanupIdleSession = function (serverUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var existingIdleSession, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("Cleaning up idle session for server ".concat(serverUuid));
                        existingIdleSession = this.idleSessions[serverUuid];
                        if (!existingIdleSession) return [3 /*break*/, 5];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, existingIdleSession.cleanup()];
                    case 2:
                        _a.sent();
                        console.log("Cleaned up idle session for server ".concat(serverUuid));
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _a.sent();
                        console.error("Error cleaning up idle session for server ".concat(serverUuid, ":"), error_2);
                        return [3 /*break*/, 4];
                    case 4:
                        delete this.idleSessions[serverUuid];
                        _a.label = 5;
                    case 5:
                        // Remove from creating set if it's in progress
                        this.creatingIdleSessions.delete(serverUuid);
                        // Remove from server params cache
                        delete this.serverParamsCache[serverUuid];
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Ensure idle session exists for a newly created server
     * This should be called when a new server is created
     */
    McpServerPool.prototype.ensureIdleSessionForNewServer = function (serverUuid, params, namespaceUuid) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("Ensuring idle session exists for new server ".concat(serverUuid));
                        // Update server params cache
                        this.serverParamsCache[serverUuid] = params;
                        if (!(!this.idleSessions[serverUuid] &&
                            !this.creatingIdleSessions.has(serverUuid))) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.createIdleSession(serverUuid, params, namespaceUuid)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Handle server process crash
     */
    McpServerPool.prototype.handleServerCrash = function (serverUuid, namespaceUuid, exitCode, signal) {
        return __awaiter(this, void 0, void 0, function () {
            var serverName;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.warn("Handling server crash for ".concat(serverUuid, " in namespace ").concat(namespaceUuid));
                        return [4 /*yield*/, server_error_tracker_service_js_1.serverErrorTracker.recordServerCrash(serverUuid, exitCode, signal)];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, this.cleanupServerSessions(serverUuid)];
                    case 2:
                        _c.sent();
                        serverName = (_b = (_a = this.serverParamsCache[serverUuid]) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "server-".concat(serverUuid);
                        auto_reconnect_service_js_1.autoReconnectService.scheduleReconnection(serverUuid, serverName, "crash");
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Handle server process crash without namespace context
     * This is used when servers are created without a specific namespace
     */
    McpServerPool.prototype.handleServerCrashWithoutNamespace = function (serverUuid, exitCode, signal) {
        return __awaiter(this, void 0, void 0, function () {
            var serverName;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.warn("Handling server crash for ".concat(serverUuid, " (no namespace context)"));
                        console.log("Recording crash for server ".concat(serverUuid));
                        return [4 /*yield*/, server_error_tracker_service_js_1.serverErrorTracker.recordServerCrash(serverUuid, exitCode, signal)];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, this.cleanupServerSessions(serverUuid)];
                    case 2:
                        _c.sent();
                        serverName = (_b = (_a = this.serverParamsCache[serverUuid]) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "server-".concat(serverUuid);
                        auto_reconnect_service_js_1.autoReconnectService.scheduleReconnection(serverUuid, serverName, "crash");
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Clean up all sessions for a specific server
     */
    McpServerPool.prototype.cleanupServerSessions = function (serverUuid) {
        return __awaiter(this, void 0, void 0, function () {
            var idleSession, error_3, _i, _a, _b, sessionId, sessionServers, error_4;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        idleSession = this.idleSessions[serverUuid];
                        if (!idleSession) return [3 /*break*/, 5];
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, idleSession.cleanup()];
                    case 2:
                        _d.sent();
                        console.log("Cleaned up idle session for crashed server ".concat(serverUuid));
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _d.sent();
                        console.error("Error cleaning up idle session for crashed server ".concat(serverUuid, ":"), error_3);
                        return [3 /*break*/, 4];
                    case 4:
                        delete this.idleSessions[serverUuid];
                        _d.label = 5;
                    case 5:
                        _i = 0, _a = Object.entries(this.activeSessions);
                        _d.label = 6;
                    case 6:
                        if (!(_i < _a.length)) return [3 /*break*/, 12];
                        _b = _a[_i], sessionId = _b[0], sessionServers = _b[1];
                        if (!sessionServers[serverUuid]) return [3 /*break*/, 11];
                        _d.label = 7;
                    case 7:
                        _d.trys.push([7, 9, , 10]);
                        return [4 /*yield*/, sessionServers[serverUuid].cleanup()];
                    case 8:
                        _d.sent();
                        console.log("Cleaned up active session ".concat(sessionId, " for crashed server ").concat(serverUuid));
                        return [3 /*break*/, 10];
                    case 9:
                        error_4 = _d.sent();
                        console.error("Error cleaning up active session ".concat(sessionId, " for crashed server ").concat(serverUuid, ":"), error_4);
                        return [3 /*break*/, 10];
                    case 10:
                        delete sessionServers[serverUuid];
                        (_c = this.sessionToServers[sessionId]) === null || _c === void 0 ? void 0 : _c.delete(serverUuid);
                        _d.label = 11;
                    case 11:
                        _i++;
                        return [3 /*break*/, 6];
                    case 12:
                        // Remove from creating set
                        this.creatingIdleSessions.delete(serverUuid);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if a server is in error state
     */
    McpServerPool.prototype.isServerInErrorState = function (serverUuid) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, server_error_tracker_service_js_1.serverErrorTracker.isServerInErrorState(serverUuid)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Reset error state for a server (e.g., after manual recovery)
     */
    McpServerPool.prototype.resetServerErrorState = function (serverUuid) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // Reset crash attempts and error status
                    return [4 /*yield*/, server_error_tracker_service_js_1.serverErrorTracker.resetServerErrorState(serverUuid)];
                    case 1:
                        // Reset crash attempts and error status
                        _a.sent();
                        console.log("Reset error state for server ".concat(serverUuid));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Start the automatic cleanup timer for expired sessions
     */
    McpServerPool.prototype.startCleanupTimer = function () {
        var _this = this;
        // Check for expired sessions every 5 minutes
        this.cleanupTimer = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.cleanupExpiredSessions()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); }, 5 * 60 * 1000); // 5 minutes
    };
    /**
     * Clean up expired sessions based on session lifetime setting
     * Preserves idle sessions for warmup
     */
    McpServerPool.prototype.cleanupExpiredSessions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var sessionLifetime, now, expiredSessionIds, _i, _a, _b, sessionId, timestamp, error_5;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, config_service_js_1.configService.getSessionLifetime()];
                    case 1:
                        sessionLifetime = _c.sent();
                        // If session lifetime is null, sessions are infinite - skip cleanup
                        if (sessionLifetime === null) {
                            return [2 /*return*/];
                        }
                        now = Date.now();
                        expiredSessionIds = [];
                        // Find expired active sessions (never clean up idle sessions as they are for warmup)
                        for (_i = 0, _a = Object.entries(this.sessionTimestamps); _i < _a.length; _i++) {
                            _b = _a[_i], sessionId = _b[0], timestamp = _b[1];
                            // Only clean up active sessions, never idle sessions
                            if (this.activeSessions[sessionId] && now - timestamp > sessionLifetime) {
                                expiredSessionIds.push(sessionId);
                            }
                        }
                        if (!(expiredSessionIds.length > 0)) return [3 /*break*/, 3];
                        console.log("Cleaning up ".concat(expiredSessionIds.length, " expired MCP server pool sessions: ").concat(expiredSessionIds.join(", ")));
                        return [4 /*yield*/, Promise.allSettled(expiredSessionIds.map(function (sessionId) { return _this.cleanupSession(sessionId); }))];
                    case 2:
                        _c.sent();
                        _c.label = 3;
                    case 3: return [3 /*break*/, 5];
                    case 4:
                        error_5 = _c.sent();
                        console.error("Error during automatic session cleanup:", error_5);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get session age in milliseconds
     */
    McpServerPool.prototype.getSessionAge = function (sessionId) {
        var timestamp = this.sessionTimestamps[sessionId];
        return timestamp ? Date.now() - timestamp : undefined;
    };
    /**
     * Check if a session is expired
     */
    McpServerPool.prototype.isSessionExpired = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var age, sessionLifetime;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        age = this.getSessionAge(sessionId);
                        if (age === undefined)
                            return [2 /*return*/, false];
                        return [4 /*yield*/, config_service_js_1.configService.getSessionLifetime()];
                    case 1:
                        sessionLifetime = _a.sent();
                        if (sessionLifetime === null) {
                            return [2 /*return*/, false];
                        }
                        return [2 /*return*/, age > sessionLifetime];
                }
            });
        });
    };
    // Singleton instance
    McpServerPool.instance = null;
    return McpServerPool;
}());
exports.McpServerPool = McpServerPool;
// Create a singleton instance
exports.mcpServerPool = McpServerPool.getInstance();
