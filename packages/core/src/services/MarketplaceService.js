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
exports.MarketplaceService = exports.MarketplaceEntrySchema = void 0;
var zod_1 = require("zod");
var McpmRegistry_js_1 = require("../skills/McpmRegistry.js");
var McpmInstaller_js_1 = require("../skills/McpmInstaller.js");
// import { MeshService } from './MeshService.js';
var mcp_registry_1 = require("@borg/mcp-registry");
var path_1 = require("path");
exports.MarketplaceEntrySchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    author: zod_1.z.string().optional(),
    type: zod_1.z.enum(['agent', 'tool', 'skill']),
    source: zod_1.z.enum(['official', 'community', 'local']),
    url: zod_1.z.string().optional(), // Git URL or Mesh Key
    verified: zod_1.z.boolean().default(false),
    peerCount: zod_1.z.number().default(0),
    installed: zod_1.z.boolean().default(false),
    tags: zod_1.z.array(zod_1.z.string()).default([])
});
var MarketplaceService = /** @class */ (function () {
    function MarketplaceService(installDir, meshService) {
        this.installDir = installDir;
        this.legacyRegistry = new McpmRegistry_js_1.McpmRegistry();
        // Internal MCP Server registry
        var registry = new mcp_registry_1.Registry();
        this.mcpRegistry = registry.list();
        this.installer = new McpmInstaller_js_1.McpmInstaller(installDir);
        // this.meshService = meshService;
    }
    /**
     * Aggregates tools from Registry (Official) and Mesh (Community)
     */
    MarketplaceService.prototype.list = function (filter) {
        return __awaiter(this, void 0, void 0, function () {
            var officialItems, entries, _i, _a, server, _b, entries_1, entry, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, this.legacyRegistry.search(filter || '')];
                    case 1:
                        officialItems = _d.sent();
                        entries = officialItems.map(function (item) { return ({
                            id: item.name,
                            name: item.name,
                            description: "Official Skill",
                            author: "Borg Ecosystem",
                            type: 'skill', // Legacy are mostly skills
                            source: 'official',
                            url: item.url,
                            verified: true,
                            peerCount: 1,
                            installed: false,
                            tags: item.tags || []
                        }); });
                        // Load new MCP Servers from registry.json
                        for (_i = 0, _a = this.mcpRegistry; _i < _a.length; _i++) {
                            server = _a[_i];
                            // Apply simple filter if provided
                            if (filter && !server.name.toLowerCase().includes(filter.toLowerCase()) &&
                                !server.description.toLowerCase().includes(filter.toLowerCase())) {
                                continue;
                            }
                            entries.push({
                                id: server.package, // Package name is unique ID
                                name: server.name,
                                description: server.description,
                                author: "MCP Registry",
                                type: 'tool', // MCP servers are essentially tool providers
                                source: 'official',
                                url: "https://www.npmjs.com/package/".concat(server.package),
                                verified: true,
                                peerCount: 1,
                                installed: false,
                                tags: ['mcp', server.type]
                            });
                        }
                        _b = 0, entries_1 = entries;
                        _d.label = 2;
                    case 2:
                        if (!(_b < entries_1.length)) return [3 /*break*/, 5];
                        entry = entries_1[_b];
                        _c = entry;
                        return [4 /*yield*/, this.checkInstalled(entry.id)];
                    case 3:
                        _c.installed = _d.sent();
                        _d.label = 4;
                    case 4:
                        _b++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/, entries];
                }
            });
        });
    };
    MarketplaceService.prototype.install = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Delegate to existing McpmInstaller
                // It currently takes a 'skillName' which matches the registry 'name'
                return [2 /*return*/, this.installer.install(id)];
            });
        });
    };
    MarketplaceService.prototype.publish = function (manifest) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                /*
                if (!this.meshService) {
                    throw new Error("MeshService not available for publishing.");
                }
                // TODO: Implement broadcasting via MeshService
                */
                return [2 /*return*/, "Published to Mesh (Simulation - Out of Scope)"];
            });
        });
    };
    MarketplaceService.prototype.checkInstalled = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var fs, mcpJsonPath, mcpJsonRaw, mcpConfig, _i, _a, _b, serverName, serverConfig, configStr, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('fs/promises'); })];
                    case 1:
                        fs = _e.sent();
                        _e.label = 2;
                    case 2:
                        _e.trys.push([2, 4, , 5]);
                        mcpJsonPath = path_1.default.join(process.cwd(), 'mcp.json');
                        return [4 /*yield*/, fs.readFile(mcpJsonPath, 'utf-8')];
                    case 3:
                        mcpJsonRaw = _e.sent();
                        mcpConfig = JSON.parse(mcpJsonRaw);
                        // The ID is the package name. In mcp.json, servers are usually named after the package without scopes, or similar.
                        // But we can check if the command includes the package name id
                        if (mcpConfig && mcpConfig.mcpServers) {
                            for (_i = 0, _a = Object.entries(mcpConfig.mcpServers); _i < _a.length; _i++) {
                                _b = _a[_i], serverName = _b[0], serverConfig = _b[1];
                                configStr = JSON.stringify(serverConfig);
                                if (configStr.includes(id)) {
                                    return [2 /*return*/, true];
                                }
                            }
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        _c = _e.sent();
                        return [3 /*break*/, 5];
                    case 5:
                        _e.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, fs.access(path_1.default.join(this.installDir, id))];
                    case 6:
                        _e.sent();
                        return [2 /*return*/, true];
                    case 7:
                        _d = _e.sent();
                        return [2 /*return*/, false];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    return MarketplaceService;
}());
exports.MarketplaceService = MarketplaceService;
