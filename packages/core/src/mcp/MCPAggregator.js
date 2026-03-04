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
exports.MCPAggregator = void 0;
var index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
var stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
var path_1 = require("path");
var fs_1 = require("fs");
var MCPAggregator = /** @class */ (function () {
    function MCPAggregator(configPath) {
        this.clients = new Map();
        this.configPath = configPath || path_1.default.join(process.cwd(), 'config', 'mcp_servers.json');
    }
    MCPAggregator.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var configStr, config, _i, _a, _b, name_1, serverCfg, e_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!fs_1.default.existsSync(this.configPath))
                            return [2 /*return*/];
                        configStr = fs_1.default.readFileSync(this.configPath, 'utf8');
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 6, , 7]);
                        config = JSON.parse(configStr);
                        _i = 0, _a = Object.entries(config);
                        _c.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 5];
                        _b = _a[_i], name_1 = _b[0], serverCfg = _b[1];
                        if (!serverCfg.enabled) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.connectToServer(name_1, serverCfg)];
                    case 3:
                        _c.sent();
                        _c.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        e_1 = _c.sent();
                        console.error("[MCPAggregator] Failed to load config:", e_1);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    MCPAggregator.prototype.connectToServer = function (name, config) {
        return __awaiter(this, void 0, void 0, function () {
            var transport, client, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[MCPAggregator] Connecting to downstream server: ".concat(name, "..."));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        transport = new stdio_js_1.StdioClientTransport({
                            command: config.command,
                            args: config.args,
                            env: __assign(__assign({}, process.env), config.env)
                        });
                        client = new index_js_1.Client({ name: "borg-aggregator", version: "1.0.0" }, { capabilities: {} });
                        return [4 /*yield*/, client.connect(transport)];
                    case 2:
                        _a.sent();
                        this.clients.set(name, client);
                        console.log("[MCPAggregator] \u2713 Connected to ".concat(name));
                        return [3 /*break*/, 4];
                    case 3:
                        e_2 = _a.sent();
                        console.error("[MCPAggregator] \u274C Failed to connect to ".concat(name, ":"), e_2);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    MCPAggregator.prototype.executeTool = function (name, args) {
        return __awaiter(this, void 0, void 0, function () {
            var separatorIndex, serverName, toolName, client, _i, _a, _b, serverName, client, tools, e_3;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        separatorIndex = name.indexOf("__");
                        if (!(separatorIndex !== -1)) return [3 /*break*/, 2];
                        serverName = name.substring(0, separatorIndex);
                        toolName = name.substring(separatorIndex + 2);
                        client = this.clients.get(serverName);
                        if (!client) return [3 /*break*/, 2];
                        return [4 /*yield*/, client.callTool({ name: toolName, arguments: args })];
                    case 1: return [2 /*return*/, _c.sent()];
                    case 2:
                        _i = 0, _a = this.clients.entries();
                        _c.label = 3;
                    case 3:
                        if (!(_i < _a.length)) return [3 /*break*/, 10];
                        _b = _a[_i], serverName = _b[0], client = _b[1];
                        _c.label = 4;
                    case 4:
                        _c.trys.push([4, 8, , 9]);
                        return [4 /*yield*/, client.listTools()];
                    case 5:
                        tools = _c.sent();
                        if (!tools.tools.find(function (t) { return t.name === name; })) return [3 /*break*/, 7];
                        return [4 /*yield*/, client.callTool({ name: name, arguments: args })];
                    case 6: return [2 /*return*/, _c.sent()];
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        e_3 = _c.sent();
                        return [3 /*break*/, 9];
                    case 9:
                        _i++;
                        return [3 /*break*/, 3];
                    case 10: throw new Error("Tool '".concat(name, "' not found in any connected MCP server."));
                }
            });
        });
    };
    MCPAggregator.prototype.listAggregatedTools = function () {
        return __awaiter(this, void 0, void 0, function () {
            var allTools, _loop_1, _i, _a, _b, serverName, client;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        allTools = [];
                        _loop_1 = function (serverName, client) {
                            var result, namespaced, e_4;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        _d.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, client.listTools()];
                                    case 1:
                                        result = _d.sent();
                                        namespaced = result.tools.map(function (t) { return (__assign(__assign({}, t), { name: "".concat(serverName, "__").concat(t.name), _originalName: t.name, description: "[".concat(serverName, "] ").concat(t.description) })); });
                                        allTools.push.apply(allTools, namespaced);
                                        return [3 /*break*/, 3];
                                    case 2:
                                        e_4 = _d.sent();
                                        console.error("[MCPAggregator] Error listing tools from ".concat(serverName, ":"), e_4);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        };
                        _i = 0, _a = this.clients.entries();
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        _b = _a[_i], serverName = _b[0], client = _b[1];
                        return [5 /*yield**/, _loop_1(serverName, client)];
                    case 2:
                        _c.sent();
                        _c.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, allTools];
                }
            });
        });
    };
    MCPAggregator.prototype.addServerConfig = function (name, config) {
        return __awaiter(this, void 0, void 0, function () {
            var currentConfig, dir;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // 1. Update runtime
                    return [4 /*yield*/, this.connectToServer(name, config)];
                    case 1:
                        // 1. Update runtime
                        _a.sent();
                        // 2. Persist to disk
                        try {
                            currentConfig = {};
                            if (fs_1.default.existsSync(this.configPath)) {
                                currentConfig = JSON.parse(fs_1.default.readFileSync(this.configPath, 'utf8'));
                            }
                            currentConfig[name] = config;
                            dir = path_1.default.dirname(this.configPath);
                            if (!fs_1.default.existsSync(dir))
                                fs_1.default.mkdirSync(dir, { recursive: true });
                            fs_1.default.writeFileSync(this.configPath, JSON.stringify(currentConfig, null, 2));
                            console.log("[MCPAggregator] Saved config for ".concat(name));
                        }
                        catch (e) {
                            console.error("[MCPAggregator] Failed to save config:", e);
                            throw new Error("Failed to persist server config");
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    MCPAggregator.prototype.listServers = function () {
        return __awaiter(this, void 0, void 0, function () {
            var config, servers, _i, _a, _b, name_2, cfg, client, status_1, toolCount, tools, e_5;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        config = fs_1.default.existsSync(this.configPath)
                            ? JSON.parse(fs_1.default.readFileSync(this.configPath, 'utf8'))
                            : {};
                        servers = [];
                        _i = 0, _a = Object.entries(config);
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 7];
                        _b = _a[_i], name_2 = _b[0], cfg = _b[1];
                        client = this.clients.get(name_2);
                        status_1 = 'stopped';
                        toolCount = 0;
                        if (!client) return [3 /*break*/, 5];
                        status_1 = 'connected';
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, client.listTools()];
                    case 3:
                        tools = _c.sent();
                        toolCount = tools.tools.length;
                        return [3 /*break*/, 5];
                    case 4:
                        e_5 = _c.sent();
                        status_1 = 'error';
                        return [3 /*break*/, 5];
                    case 5:
                        servers.push({
                            name: name_2,
                            config: cfg,
                            status: status_1,
                            toolCount: toolCount
                        });
                        _c.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 1];
                    case 7: return [2 /*return*/, servers];
                }
            });
        });
    };
    MCPAggregator.prototype.shutdown = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, client;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _i = 0, _a = this.clients.values();
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        client = _a[_i];
                        return [4 /*yield*/, client.close()];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return MCPAggregator;
}());
exports.MCPAggregator = MCPAggregator;
