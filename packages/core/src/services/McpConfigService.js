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
exports.McpConfigService = void 0;
var fs = require("fs/promises");
var path = require("path");
var mcp_servers_repo_js_1 = require("../db/repositories/mcp-servers.repo.js");
var McpConfigService = /** @class */ (function () {
    function McpConfigService() {
    }
    /**
     * Reads mcp.json and updates the database to match.
     * This makes mcp.json the authoritative source for config entry existence/content.
     */
    McpConfigService.prototype.syncWithDatabase = function () {
        return __awaiter(this, void 0, void 0, function () {
            var fileContent, e_1, config, servers, _i, _a, _b, name_1, serverConfig, type, existing, error_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.log('[McpConfigService] Syncing Database with mcp.json...');
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 13, , 14]);
                        fileContent = void 0;
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, fs.readFile(McpConfigService.MCP_JSON_PATH, 'utf-8')];
                    case 3:
                        fileContent = _c.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_1 = _c.sent();
                        if (e_1.code === 'ENOENT') {
                            console.log('[McpConfigService] mcp.json not found. Skipping sync.');
                            return [2 /*return*/];
                        }
                        throw e_1;
                    case 5:
                        config = JSON.parse(fileContent);
                        servers = config.mcpServers || {};
                        _i = 0, _a = Object.entries(servers);
                        _c.label = 6;
                    case 6:
                        if (!(_i < _a.length)) return [3 /*break*/, 12];
                        _b = _a[_i], name_1 = _b[0], serverConfig = _b[1];
                        type = 'STDIO';
                        if (serverConfig.url) {
                            type = 'SSE'; // Simplified assumption, could be STREAMABLE_HTTP
                        }
                        return [4 /*yield*/, mcp_servers_repo_js_1.mcpServersRepository.findByName(name_1)];
                    case 7:
                        existing = _c.sent();
                        if (!existing) return [3 /*break*/, 9];
                        // Update
                        return [4 /*yield*/, mcp_servers_repo_js_1.mcpServersRepository.update({
                                uuid: existing.uuid,
                                name: name_1, // shouldn't change
                                command: serverConfig.command,
                                args: serverConfig.args,
                                env: serverConfig.env,
                                url: serverConfig.url,
                                // Preserve other fields
                            }, { skipSync: true })];
                    case 8:
                        // Update
                        _c.sent();
                        console.log("[McpConfigService] Updated server: ".concat(name_1));
                        return [3 /*break*/, 11];
                    case 9: 
                    // Create
                    return [4 /*yield*/, mcp_servers_repo_js_1.mcpServersRepository.create({
                            name: name_1,
                            type: type,
                            command: serverConfig.command,
                            args: serverConfig.args,
                            env: serverConfig.env,
                            url: serverConfig.url,
                        }, { skipSync: true })];
                    case 10:
                        // Create
                        _c.sent();
                        console.log("[McpConfigService] Created server: ".concat(name_1));
                        _c.label = 11;
                    case 11:
                        _i++;
                        return [3 /*break*/, 6];
                    case 12:
                        console.log('[McpConfigService] Sync complete.');
                        return [3 /*break*/, 14];
                    case 13:
                        error_1 = _c.sent();
                        console.error('[McpConfigService] Sync failed:', error_1);
                        return [3 /*break*/, 14];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    McpConfigService.MCP_JSON_PATH = path.resolve(process.cwd(), 'mcp.json');
    return McpConfigService;
}());
exports.McpConfigService = McpConfigService;
