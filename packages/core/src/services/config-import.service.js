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
exports.configImportService = exports.ConfigImportService = void 0;
var index_js_1 = require("../types/metamcp/index.js");
var mcp_servers_repo_js_1 = require("../db/repositories/mcp-servers.repo.js");
function normalizeServerDefinition(value) {
    if (!value || typeof value !== "object") {
        return {};
    }
    var record = value;
    var args = Array.isArray(record.args)
        ? record.args.filter(function (arg) { return typeof arg === "string"; })
        : [];
    var env = record.env && typeof record.env === "object"
        ? Object.fromEntries(Object.entries(record.env).filter(function (_a) {
            var val = _a[1];
            return typeof val === "string";
        }))
        : {};
    return {
        command: typeof record.command === "string" ? record.command : undefined,
        args: args,
        env: env,
        url: typeof record.url === "string" ? record.url : undefined,
    };
}
var ConfigImportService = /** @class */ (function () {
    function ConfigImportService() {
    }
    ConfigImportService.prototype.importClaudeConfig = function (configJson, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var config, serversToCreate, errors, _i, _a, _b, name_1, definition, safeName, def, _c, serversToCreate_1, server, error_1;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 5, , 6]);
                        config = JSON.parse(configJson);
                        if (!config.mcpServers || typeof config.mcpServers !== "object") {
                            throw new Error("Invalid configuration: 'mcpServers' object not found.");
                        }
                        serversToCreate = [];
                        errors = [];
                        for (_i = 0, _a = Object.entries(config.mcpServers); _i < _a.length; _i++) {
                            _b = _a[_i], name_1 = _b[0], definition = _b[1];
                            safeName = name_1.replace(/[^a-zA-Z0-9_-]/g, "_");
                            def = normalizeServerDefinition(definition);
                            if (def.command) {
                                // Stdio Server
                                serversToCreate.push({
                                    name: safeName,
                                    type: index_js_1.McpServerTypeEnum.Enum.STDIO,
                                    command: def.command,
                                    args: def.args || [],
                                    env: def.env || {},
                                    user_id: userId,
                                });
                            }
                            else if (def.url) {
                                // SSE Server (Assuming SSE for URL-based in config, usually)
                                serversToCreate.push({
                                    name: safeName,
                                    type: index_js_1.McpServerTypeEnum.Enum.SSE,
                                    url: def.url,
                                    user_id: userId,
                                });
                            }
                            else {
                                errors.push("Skipped '".concat(name_1, "': Unknown server type (no command or url)"));
                            }
                        }
                        if (!(serversToCreate.length > 0)) return [3 /*break*/, 4];
                        _c = 0, serversToCreate_1 = serversToCreate;
                        _d.label = 1;
                    case 1:
                        if (!(_c < serversToCreate_1.length)) return [3 /*break*/, 4];
                        server = serversToCreate_1[_c];
                        return [4 /*yield*/, mcp_servers_repo_js_1.mcpServersRepository.create(server)];
                    case 2:
                        _d.sent();
                        _d.label = 3;
                    case 3:
                        _c++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, {
                            imported: serversToCreate.length,
                            skipped: errors,
                        }];
                    case 5:
                        error_1 = _d.sent();
                        console.error("Config import failed:", error_1);
                        throw error_1;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return ConfigImportService;
}());
exports.ConfigImportService = ConfigImportService;
exports.configImportService = new ConfigImportService();
