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
exports.mapOverrideNameToOriginal = mapOverrideNameToOriginal;
exports.createToolOverridesListToolsMiddleware = createToolOverridesListToolsMiddleware;
exports.createToolOverridesCallToolMiddleware = createToolOverridesCallToolMiddleware;
exports.clearOverrideCache = clearOverrideCache;
function mergeAnnotations(original, namespaceOverrides) {
    if (!namespaceOverrides || Object.keys(namespaceOverrides).length === 0) {
        return original;
    }
    var baseAnnotations = (original ? __assign({}, original) : {});
    for (var _i = 0, _a = Object.entries(namespaceOverrides); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        baseAnnotations[key] = value;
    }
    return baseAnnotations;
}
// Override resolver
function getToolOverrides(namespaceUuid_1, serverName_1, toolName_1) {
    return __awaiter(this, arguments, void 0, function (namespaceUuid, serverName, toolName, useCache, isPersistent) {
        if (useCache === void 0) { useCache = true; }
        if (isPersistent === void 0) { isPersistent = false; }
        return __generator(this, function (_a) {
            return [2 /*return*/, null];
        });
    });
}
/**
 * Apply overrides to tools
 */
function applyToolOverrides(tools_1, namespaceUuid_1) {
    return __awaiter(this, arguments, void 0, function (tools, namespaceUuid, useCache, isPersistent) {
        if (useCache === void 0) { useCache = true; }
        if (isPersistent === void 0) { isPersistent = false; }
        return __generator(this, function (_a) {
            if (!tools || tools.length === 0) {
                return [2 /*return*/, tools];
            }
            return [2 /*return*/, tools];
        });
    });
}
/**
 * Map override name back to original name for tool calls
 */
function mapOverrideNameToOriginal(toolName_1, namespaceUuid_1) {
    return __awaiter(this, arguments, void 0, function (toolName, namespaceUuid, useCache) {
        if (useCache === void 0) { useCache = true; }
        return __generator(this, function (_a) {
            return [2 /*return*/, toolName];
        });
    });
}
/**
 * Creates a List Tools middleware that applies tool name/description overrides
 */
function createToolOverridesListToolsMiddleware(config) {
    var _this = this;
    var _a, _b;
    if (config === void 0) { config = {}; }
    var useCache = (_a = config.cacheEnabled) !== null && _a !== void 0 ? _a : true;
    var isPersistent = (_b = config.persistentCacheOnListTools) !== null && _b !== void 0 ? _b : false;
    return function (handler) {
        return function (request, context) { return __awaiter(_this, void 0, void 0, function () {
            var response, overriddenTools;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, handler(request, context)];
                    case 1:
                        response = _a.sent();
                        if (!response.tools) return [3 /*break*/, 3];
                        return [4 /*yield*/, applyToolOverrides(response.tools, context.namespaceUuid, useCache, isPersistent)];
                    case 2:
                        overriddenTools = _a.sent();
                        return [2 /*return*/, __assign(__assign({}, response), { tools: overriddenTools })];
                    case 3: return [2 /*return*/, response];
                }
            });
        }); };
    };
}
/**
 * Creates a Call Tool middleware that maps override names back to original names
 */
function createToolOverridesCallToolMiddleware(config) {
    var _this = this;
    var _a;
    if (config === void 0) { config = {}; }
    var useCache = (_a = config.cacheEnabled) !== null && _a !== void 0 ? _a : true;
    return function (handler) {
        return function (request, context) { return __awaiter(_this, void 0, void 0, function () {
            var originalToolName, modifiedRequest;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, mapOverrideNameToOriginal(request.params.name, context.namespaceUuid, useCache)];
                    case 1:
                        originalToolName = _a.sent();
                        modifiedRequest = __assign(__assign({}, request), { params: __assign(__assign({}, request.params), { name: originalToolName }) });
                        // Call the original handler with the modified request
                        return [2 /*return*/, handler(modifiedRequest, context)];
                }
            });
        }); };
    };
}
/**
 * Utility function to clear override cache
 */
function clearOverrideCache(namespaceUuid) {
    // No-op as cache is disabled
}
