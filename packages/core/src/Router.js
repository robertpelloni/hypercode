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
exports.Router = void 0;
var index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
var stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
/**
 * Router (MCP Aggregator)
 *
 * The central hub that manages connections to multiple MCP servers and provides
 * a unified tool interface. This is HyperCode's "Meta-MCP" layer.
 *
 * Architecture:
 * - Maintains a Map of named MCP `Client` connections (e.g., "filesystem", "browser", "search").
 * - Each client connects via stdio transport to a child process running an MCP server.
 * - `listTools()` aggregates tools from ALL connected servers into a single flat list.
 * - `callTool()` uses a cached tool→client mapping for O(1) lookup (Phase 63 optimization).
 *
 * Performance:
 * - The `toolCache` avoids the previous O(N) linear scan that called `listTools()` on
 *   every client for every `callTool` invocation. Now it's O(1) with lazy cache refresh.
 */
var Router = /** @class */ (function () {
    function Router(config) {
        if (config === void 0) { config = {}; }
        this.config = config;
        /** Map of server name → MCP Client connection */
        this.clients = new Map();
        /** Cache mapping tool name → owning client name for O(1) lookup in callTool */
        this.toolCache = new Map();
        console.log("Router initialized");
    }
    /**
     * Connects to a local MCP server via stdio transport.
     * Idempotent — returns existing client if already connected.
     *
     * @param name - Unique identifier for this server (e.g., "filesystem", "browser")
     * @param command - The executable to spawn (e.g., "node", "python")
     * @param args - Arguments to pass to the command (e.g., ["./dist/server.js"])
     * @returns The connected MCP Client instance
     */
    Router.prototype.connectToServer = function (name, command, args) {
        return __awaiter(this, void 0, void 0, function () {
            var transport, client;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.clients.has(name))
                            return [2 /*return*/, this.clients.get(name)];
                        transport = new stdio_js_1.StdioClientTransport({
                            command: command,
                            args: args,
                        });
                        client = new index_js_1.Client({
                            name: "hypercode-router",
                            version: "0.1.0",
                        }, {
                            capabilities: {},
                        });
                        return [4 /*yield*/, client.connect(transport)];
                    case 1:
                        _a.sent();
                        this.clients.set(name, client);
                        console.log("Connected to MCP Server: ".concat(name));
                        return [2 /*return*/, client];
                }
            });
        });
    };
    /**
     * Aggregates tools from all connected MCP servers.
     * Also rebuilds the toolCache for O(1) lookups in callTool.
     *
     * @returns Flat array of all available tools across all connected servers
     */
    Router.prototype.listTools = function () {
        return __awaiter(this, void 0, void 0, function () {
            var allTools, _i, _a, _b, name_1, client, result, _c, _d, tool, e_1;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        allTools = [];
                        this.toolCache.clear(); // Invalidate cache on refresh
                        _i = 0, _a = this.clients.entries();
                        _e.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        _b = _a[_i], name_1 = _b[0], client = _b[1];
                        _e.label = 2;
                    case 2:
                        _e.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, client.listTools()];
                    case 3:
                        result = _e.sent();
                        // Populate cache: tool.name → server name
                        // Future: prefix with `${name}__` for namespacing if tool names collide
                        for (_c = 0, _d = result.tools; _c < _d.length; _c++) {
                            tool = _d[_c];
                            this.toolCache.set(tool.name, name_1);
                            allTools.push(tool);
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        e_1 = _e.sent();
                        console.error("Failed to list tools from ".concat(name_1), e_1);
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, allTools];
                }
            });
        });
    };
    /**
     * Calls a tool by name, routing to the correct MCP server.
     * Uses cached tool→client mapping for O(1) lookup.
     * On cache miss, refreshes the cache by calling listTools() once.
     *
     * @param name - The tool name to invoke (e.g., "read_file", "search_web")
     * @param args - Arguments to pass to the tool
     * @returns The tool execution result
     * @throws Error if the tool is not found in any connected server
     */
    Router.prototype.callTool = function (name, args) {
        return __awaiter(this, void 0, void 0, function () {
            var clientName, client;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        clientName = this.toolCache.get(name);
                        if (!!clientName) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.listTools()];
                    case 1:
                        _a.sent();
                        clientName = this.toolCache.get(name);
                        _a.label = 2;
                    case 2:
                        if (!clientName) return [3 /*break*/, 4];
                        client = this.clients.get(clientName);
                        if (!client) return [3 /*break*/, 4];
                        return [4 /*yield*/, client.callTool({ name: name, arguments: args })];
                    case 3: return [2 /*return*/, (_a.sent())];
                    case 4: throw new Error("Tool ".concat(name, " not found in any connected MCP server."));
                }
            });
        });
    };
    /**
     * Returns a specific MCP client by name.
     * Useful for direct server interaction outside of the tool abstraction.
     */
    Router.prototype.getClient = function (name) {
        return this.clients.get(name);
    };
    return Router;
}());
exports.Router = Router;
