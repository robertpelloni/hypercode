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
exports.jsonConfigProvider = exports.JsonConfigProvider = void 0;
var promises_1 = require("fs/promises");
var path_1 = require("path");
var crypto_1 = require("crypto");
var JsonConfigProvider = /** @class */ (function () {
    function JsonConfigProvider(workspaceRoot) {
        if (workspaceRoot === void 0) { workspaceRoot = process.cwd(); }
        this.config = { mcpServers: {} };
        this.configPath = path_1.default.join(workspaceRoot, 'mcp.json');
    }
    JsonConfigProvider.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 6]);
                        return [4 /*yield*/, promises_1.default.readFile(this.configPath, 'utf-8')];
                    case 1:
                        data = _a.sent();
                        this.config = JSON.parse(data);
                        return [3 /*break*/, 6];
                    case 2:
                        error_1 = _a.sent();
                        if (!(error_1.code === 'ENOENT')) return [3 /*break*/, 4];
                        // File doesn't exist, create default
                        return [4 /*yield*/, this.saveConfig()];
                    case 3:
                        // File doesn't exist, create default
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        console.error("Failed to load mcp.json from ".concat(this.configPath, ":"), error_1);
                        throw error_1;
                    case 5: return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    JsonConfigProvider.prototype.loadMcpServers = function () {
        return __awaiter(this, void 0, void 0, function () {
            var servers, _i, _a, _b, name_1, config;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.init()];
                    case 1:
                        _c.sent(); // Reload on every access to catch manual edits
                        servers = [];
                        for (_i = 0, _a = Object.entries(this.config.mcpServers || {}); _i < _a.length; _i++) {
                            _b = _a[_i], name_1 = _b[0], config = _b[1];
                            // Basic validation/transformation
                            if (config.command) {
                                servers.push({
                                    name: name_1,
                                    type: 'stdio',
                                    command: config.command,
                                    args: config.args,
                                    env: config.env,
                                    disabled: config.disabled
                                });
                            }
                            else if (config.url) {
                                servers.push({
                                    name: name_1,
                                    type: 'sse',
                                    url: config.url,
                                    disabled: config.disabled
                                });
                            }
                        }
                        return [2 /*return*/, servers];
                }
            });
        });
    };
    JsonConfigProvider.prototype.saveMcpServers = function (servers) {
        return __awaiter(this, void 0, void 0, function () {
            var newMcpServers, _i, servers_1, server;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        newMcpServers = {};
                        for (_i = 0, servers_1 = servers; _i < servers_1.length; _i++) {
                            server = servers_1[_i];
                            if (server.type === 'stdio') {
                                newMcpServers[server.name] = {
                                    command: server.command,
                                    args: server.args,
                                    env: server.env,
                                    disabled: server.disabled
                                };
                            }
                            else if (server.type === 'sse') {
                                newMcpServers[server.name] = {
                                    url: server.url,
                                    disabled: server.disabled
                                };
                            }
                        }
                        this.config.mcpServers = newMcpServers;
                        return [4 /*yield*/, this.saveConfig()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    JsonConfigProvider.prototype.getSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.init()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, this.config];
                }
            });
        });
    };
    JsonConfigProvider.prototype.loadScripts = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.init()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, this.config.scripts || []];
                }
            });
        });
    };
    JsonConfigProvider.prototype.saveScript = function (script) {
        return __awaiter(this, void 0, void 0, function () {
            var existingIndex;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.init()];
                    case 1:
                        _a.sent();
                        if (!this.config.scripts) {
                            this.config.scripts = [];
                        }
                        // Generate UUID if missing
                        if (!script.uuid) {
                            script.uuid = crypto_1.default.randomUUID();
                        }
                        existingIndex = this.config.scripts.findIndex(function (s) {
                            return s.name === script.name || (s.uuid && s.uuid === script.uuid);
                        });
                        if (existingIndex >= 0) {
                            this.config.scripts[existingIndex] = __assign(__assign({}, this.config.scripts[existingIndex]), script);
                        }
                        else {
                            this.config.scripts.push(script);
                        }
                        return [4 /*yield*/, this.saveConfig()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    JsonConfigProvider.prototype.deleteScript = function (nameOrUuid) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.init()];
                    case 1:
                        _a.sent();
                        if (!this.config.scripts)
                            return [2 /*return*/];
                        this.config.scripts = this.config.scripts.filter(function (s) { return s.name !== nameOrUuid && s.uuid !== nameOrUuid; });
                        return [4 /*yield*/, this.saveConfig()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    JsonConfigProvider.prototype.saveConfig = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, promises_1.default.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return JsonConfigProvider;
}());
exports.JsonConfigProvider = JsonConfigProvider;
exports.jsonConfigProvider = new JsonConfigProvider(process.cwd());
