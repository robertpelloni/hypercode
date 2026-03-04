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
exports.createFilterListToolsMiddleware = createFilterListToolsMiddleware;
exports.createFilterCallToolMiddleware = createFilterCallToolMiddleware;
exports.clearFilterCache = clearFilterCache;
var drizzle_orm_1 = require("drizzle-orm");
var index_js_1 = require("../../db/index.js");
var schema_js_1 = require("../../db/schema.js");
var tool_name_parser_service_js_1 = require("../tool-name-parser.service.js");
/**
 * Tool status cache for performance
 */
var ToolStatusCache = /** @class */ (function () {
    function ToolStatusCache(ttl) {
        if (ttl === void 0) { ttl = 1000; }
        this.cache = new Map();
        this.expiry = new Map();
        this.ttl = ttl;
    }
    ToolStatusCache.prototype.getCacheKey = function (namespaceUuid, toolName, serverUuid) {
        return "".concat(namespaceUuid, ":").concat(serverUuid, ":").concat(toolName);
    };
    ToolStatusCache.prototype.get = function (namespaceUuid, toolName, serverUuid) {
        var key = this.getCacheKey(namespaceUuid, toolName, serverUuid);
        var expiry = this.expiry.get(key);
        if (!expiry || Date.now() > expiry) {
            this.cache.delete(key);
            this.expiry.delete(key);
            return null;
        }
        return this.cache.get(key) || null;
    };
    ToolStatusCache.prototype.set = function (namespaceUuid, toolName, serverUuid, status) {
        var key = this.getCacheKey(namespaceUuid, toolName, serverUuid);
        this.cache.set(key, status);
        this.expiry.set(key, Date.now() + this.ttl);
    };
    ToolStatusCache.prototype.clear = function (namespaceUuid) {
        if (namespaceUuid) {
            for (var _i = 0, _a = this.cache.keys(); _i < _a.length; _i++) {
                var key = _a[_i];
                if (key.startsWith("".concat(namespaceUuid, ":"))) {
                    this.cache.delete(key);
                    this.expiry.delete(key);
                }
            }
        }
        else {
            this.cache.clear();
            this.expiry.clear();
        }
    };
    return ToolStatusCache;
}());
// Global cache instance
var toolStatusCache = new ToolStatusCache();
/**
 * Get tool status from database with caching
 */
function getToolStatus(namespaceUuid_1, toolName_1, serverUuid_1) {
    return __awaiter(this, arguments, void 0, function (namespaceUuid, toolName, serverUuid, useCache) {
        var cached, toolMapping, status_1, error_1;
        if (useCache === void 0) { useCache = true; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Check cache first
                    if (useCache) {
                        cached = toolStatusCache.get(namespaceUuid, toolName, serverUuid);
                        if (cached !== null) {
                            return [2 /*return*/, cached];
                        }
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, index_js_1.db
                            .select({
                            status: schema_js_1.namespaceToolMappingsTable.status,
                        })
                            .from(schema_js_1.namespaceToolMappingsTable)
                            .innerJoin(schema_js_1.toolsTable, (0, drizzle_orm_1.eq)(schema_js_1.toolsTable.uuid, schema_js_1.namespaceToolMappingsTable.tool_uuid))
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.namespaceToolMappingsTable.namespace_uuid, namespaceUuid), (0, drizzle_orm_1.eq)(schema_js_1.toolsTable.name, toolName), (0, drizzle_orm_1.eq)(schema_js_1.namespaceToolMappingsTable.mcp_server_uuid, serverUuid)))];
                case 2:
                    toolMapping = (_a.sent())[0];
                    status_1 = ((toolMapping === null || toolMapping === void 0 ? void 0 : toolMapping.status) || null);
                    // Cache the result if found and caching is enabled
                    if (status_1 && useCache) {
                        toolStatusCache.set(namespaceUuid, toolName, serverUuid, status_1);
                    }
                    return [2 /*return*/, status_1];
                case 3:
                    error_1 = _a.sent();
                    console.error("Error fetching tool status for ".concat(toolName, " in namespace ").concat(namespaceUuid, ":"), error_1);
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get server UUID by name
 */
function getServerUuidByName(serverName) {
    return __awaiter(this, void 0, void 0, function () {
        var server, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, index_js_1.db
                            .select({ uuid: schema_js_1.mcpServersTable.uuid })
                            .from(schema_js_1.mcpServersTable)
                            .where((0, drizzle_orm_1.eq)(schema_js_1.mcpServersTable.name, serverName))];
                case 1:
                    server = (_a.sent())[0];
                    return [2 /*return*/, (server === null || server === void 0 ? void 0 : server.uuid) || null];
                case 2:
                    error_2 = _a.sent();
                    console.error("Error fetching server UUID for ".concat(serverName, ":"), error_2);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Filter tools based on their status in the namespace
 */
function filterActiveTools(tools_1, namespaceUuid_1) {
    return __awaiter(this, arguments, void 0, function (tools, namespaceUuid, useCache) {
        var activeTools;
        var _this = this;
        if (useCache === void 0) { useCache = true; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!tools || tools.length === 0) {
                        return [2 /*return*/, tools];
                    }
                    activeTools = [];
                    return [4 /*yield*/, Promise.allSettled(tools.map(function (tool) { return __awaiter(_this, void 0, void 0, function () {
                            var parsed, serverUuid, status_2, error_3;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 3, , 4]);
                                        parsed = (0, tool_name_parser_service_js_1.parseToolName)(tool.name);
                                        if (!parsed) {
                                            // If tool name doesn't follow expected format, include it
                                            activeTools.push(tool);
                                            return [2 /*return*/];
                                        }
                                        return [4 /*yield*/, getServerUuidByName(parsed.serverName)];
                                    case 1:
                                        serverUuid = _a.sent();
                                        if (!serverUuid) {
                                            // If server not found, include the tool (fallback behavior)
                                            activeTools.push(tool);
                                            return [2 /*return*/];
                                        }
                                        return [4 /*yield*/, getToolStatus(namespaceUuid, parsed.originalToolName, serverUuid, useCache)];
                                    case 2:
                                        status_2 = _a.sent();
                                        // If no mapping exists or tool is active, include it
                                        if (status_2 === null || status_2 === "ACTIVE") {
                                            activeTools.push(tool);
                                        }
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_3 = _a.sent();
                                        console.error("Error checking tool status for ".concat(tool.name, ":"), error_3);
                                        // On error, include the tool (fail-safe behavior)
                                        activeTools.push(tool);
                                        return [3 /*break*/, 4];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 1:
                    _a.sent();
                    return [2 /*return*/, activeTools];
            }
        });
    });
}
/**
 * Check if a tool is allowed to be called
 */
function isToolAllowed(toolName_1, namespaceUuid_1, serverUuid_1) {
    return __awaiter(this, arguments, void 0, function (toolName, namespaceUuid, serverUuid, useCache) {
        var parsed, status_3, error_4;
        if (useCache === void 0) { useCache = true; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    parsed = (0, tool_name_parser_service_js_1.parseToolName)(toolName);
                    if (!parsed) {
                        // If tool name doesn't follow expected format, allow it
                        return [2 /*return*/, { allowed: true }];
                    }
                    return [4 /*yield*/, getToolStatus(namespaceUuid, parsed.originalToolName, serverUuid, useCache)];
                case 1:
                    status_3 = _a.sent();
                    // If no mapping exists or tool is active, allow it
                    if (status_3 === null || status_3 === "ACTIVE") {
                        return [2 /*return*/, { allowed: true }];
                    }
                    // Tool is inactive
                    return [2 /*return*/, {
                            allowed: false,
                            reason: "Tool has been marked as inactive in this namespace",
                        }];
                case 2:
                    error_4 = _a.sent();
                    console.error("Error checking if tool ".concat(toolName, " is allowed in namespace ").concat(namespaceUuid, ":"), error_4);
                    // On error, allow the tool (fail-safe behavior)
                    return [2 /*return*/, { allowed: true }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Creates a List Tools middleware that filters out inactive tools
 */
function createFilterListToolsMiddleware(config) {
    var _this = this;
    var _a;
    if (config === void 0) { config = {}; }
    var useCache = (_a = config.cacheEnabled) !== null && _a !== void 0 ? _a : true;
    return function (handler) {
        return function (request, context) { return __awaiter(_this, void 0, void 0, function () {
            var response, filteredTools;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, handler(request, context)];
                    case 1:
                        response = _a.sent();
                        if (!response.tools) return [3 /*break*/, 3];
                        return [4 /*yield*/, filterActiveTools(response.tools, context.namespaceUuid, useCache)];
                    case 2:
                        filteredTools = _a.sent();
                        return [2 /*return*/, __assign(__assign({}, response), { tools: filteredTools })];
                    case 3: return [2 /*return*/, response];
                }
            });
        }); };
    };
}
/**
 * Creates a Call Tool middleware that blocks calls to inactive tools
 */
function createFilterCallToolMiddleware(config) {
    var _this = this;
    var _a, _b;
    if (config === void 0) { config = {}; }
    var useCache = (_a = config.cacheEnabled) !== null && _a !== void 0 ? _a : true;
    var customErrorMessage = (_b = config.customErrorMessage) !== null && _b !== void 0 ? _b : (function (toolName, reason) {
        return "Tool \"".concat(toolName, "\" is currently inactive and disallowed in this namespace: ").concat(reason);
    });
    return function (handler) {
        return function (request, context) { return __awaiter(_this, void 0, void 0, function () {
            var toolName, paramsWithMeta, allowedTools, parsed, serverUuid, _a, allowed, reason;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        toolName = request.params.name;
                        paramsWithMeta = request.params;
                        allowedTools = (_b = paramsWithMeta._meta) === null || _b === void 0 ? void 0 : _b.allowedTools;
                        if (allowedTools && Array.isArray(allowedTools)) {
                            if (!allowedTools.includes(toolName)) {
                                return [2 /*return*/, {
                                        content: [{ type: "text", text: "Access denied: Tool '".concat(toolName, "' is not in the allowed tools list for this agent.") }],
                                        isError: true
                                    }];
                            }
                        }
                        parsed = (0, tool_name_parser_service_js_1.parseToolName)(toolName);
                        if (!parsed) return [3 /*break*/, 3];
                        return [4 /*yield*/, getServerUuidByName(parsed.serverName)];
                    case 1:
                        serverUuid = _c.sent();
                        if (!serverUuid) return [3 /*break*/, 3];
                        return [4 /*yield*/, isToolAllowed(toolName, context.namespaceUuid, serverUuid, useCache)];
                    case 2:
                        _a = _c.sent(), allowed = _a.allowed, reason = _a.reason;
                        if (!allowed) {
                            // Return error response instead of calling the handler
                            return [2 /*return*/, {
                                    content: [
                                        {
                                            type: "text",
                                            text: customErrorMessage(toolName, reason || "Unknown reason"),
                                        },
                                    ],
                                    isError: true,
                                }];
                        }
                        _c.label = 3;
                    case 3: 
                    // Tool is allowed, call the original handler
                    return [2 /*return*/, handler(request, context)];
                }
            });
        }); };
    };
}
/**
 * Utility function to clear cache
 */
function clearFilterCache(namespaceUuid) {
    toolStatusCache.clear(namespaceUuid);
}
