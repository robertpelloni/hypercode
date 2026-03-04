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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachTo = exports.executeProxiedTool = void 0;
var types_js_1 = require("@modelcontextprotocol/sdk/types.js");
var toon_serializer_stub_js_1 = require("./stubs/toon.serializer.stub.js");
var JsonConfigProvider_js_1 = require("./config/JsonConfigProvider.js");
var ToolRegistry_js_1 = require("./ToolRegistry.js");
var CodeExecutorService_js_1 = require("./CodeExecutorService.js");
// DB Repositories removed
// Ported Services
var config_import_service_js_1 = require("./config-import.service.js");
var config_service_js_1 = require("./config.service.js");
var tool_set_service_js_1 = require("./tool-set.service.js");
var fetch_metamcp_service_js_1 = require("./fetch-metamcp.service.js");
var mcp_server_pool_service_js_1 = require("./mcp-server-pool.service.js");
var tool_name_parser_service_js_1 = require("./tool-name-parser.service.js");
var common_utils_js_1 = require("./common-utils.js");
var trpc_core_js_1 = require("../lib/trpc-core.js");
// Middleware
var filter_tools_functional_js_1 = require("./metamcp-middleware/filter-tools.functional.js");
var policy_functional_js_1 = require("./metamcp-middleware/policy.functional.js");
var functional_middleware_js_1 = require("./metamcp-middleware/functional-middleware.js");
var logging_functional_js_1 = require("./metamcp-middleware/logging.functional.js");
var tool_overrides_functional_js_1 = require("./metamcp-middleware/tool-overrides.functional.js");
var toolsImplementations = {
    create: function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var tools = _b.tools, mcpServerUuid = _b.mcpServerUuid, serverName = _b.serverName;
        return __generator(this, function (_c) {
            // Register tools in memory
            ToolRegistry_js_1.toolRegistry.registerTools(tools, mcpServerUuid, serverName);
            return [2 /*return*/];
        });
    }); },
};
var agentService = {
    // ... (unchanged) ...
    runAgent: function (task, toolCallback, _policyId) { return __awaiter(void 0, void 0, void 0, function () {
        var mcp, llm, model, prompt, response, raw, parsed, fenced, toolResult;
        var _a, _b, _c, _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    mcp = (0, trpc_core_js_1.getMcpServer)();
                    llm = mcp.llmService;
                    return [4 /*yield*/, llm.modelSelector.selectModel({ taskComplexity: 'medium' })];
                case 1:
                    model = _h.sent();
                    prompt = "You are an autonomous tool-using assistant.\nTask: ".concat(task, "\n\nReturn JSON only:\n{\n  \"analysis\": \"short plan\",\n  \"tool\": { \"name\": \"optional_tool_name\", \"arguments\": {} },\n  \"final\": \"final response\"\n}");
                    return [4 /*yield*/, llm.generateText(model.provider, model.modelId, 'You are a precise JSON-only planner. Use a tool only when required.', prompt)];
                case 2:
                    response = _h.sent();
                    raw = (_b = (_a = response.content) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : '{}';
                    try {
                        parsed = JSON.parse(raw);
                    }
                    catch (_j) {
                        fenced = (_c = raw.match(/```json\s*([\s\S]*?)```/i)) === null || _c === void 0 ? void 0 : _c[1];
                        parsed = fenced ? JSON.parse(fenced) : { final: raw };
                    }
                    toolResult = null;
                    if (!((_d = parsed.tool) === null || _d === void 0 ? void 0 : _d.name)) return [3 /*break*/, 4];
                    return [4 /*yield*/, toolCallback(parsed.tool.name, (_e = parsed.tool.arguments) !== null && _e !== void 0 ? _e : {}, {})];
                case 3:
                    toolResult = _h.sent();
                    _h.label = 4;
                case 4: return [2 /*return*/, {
                        analysis: (_f = parsed.analysis) !== null && _f !== void 0 ? _f : 'No analysis provided.',
                        toolResult: toolResult,
                        final: (_g = parsed.final) !== null && _g !== void 0 ? _g : 'Task processed.',
                        rawModelOutput: raw,
                    }];
            }
        });
    }); },
};
var toolSearchService = {
    searchTools: function (query_1) {
        var args_1 = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args_1[_i - 1] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([query_1], args_1, true), void 0, function (query, limit) {
            var q, all, filtered;
            if (limit === void 0) { limit = 10; }
            return __generator(this, function (_a) {
                q = query.trim().toLowerCase();
                all = ToolRegistry_js_1.toolRegistry.getAllTools();
                filtered = all
                    .filter(function (rt) {
                    var _a, _b;
                    var name = String((_a = rt.tool.name) !== null && _a !== void 0 ? _a : '').toLowerCase();
                    var description = String((_b = rt.tool.description) !== null && _b !== void 0 ? _b : '').toLowerCase();
                    return name.includes(q) || description.includes(q);
                })
                    .slice(0, Math.max(1, limit));
                return [2 /*return*/, filtered.map(function (rt) { return ({
                        name: rt.tool.name,
                        description: rt.tool.description,
                        mcpServerUuid: rt.mcpServerUuid,
                    }); })];
            });
        });
    },
};
var savedScriptService = {
    listScripts: function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, JsonConfigProvider_js_1.jsonConfigProvider.loadScripts()];
        });
    }); },
    getScript: function (name) { return __awaiter(void 0, void 0, void 0, function () {
        var scripts;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, savedScriptService.listScripts()];
                case 1:
                    scripts = _b.sent();
                    return [2 /*return*/, (_a = scripts.find(function (script) { return script.name === name; })) !== null && _a !== void 0 ? _a : null];
            }
        });
    }); },
    saveScript: function (name, code, description) { return __awaiter(void 0, void 0, void 0, function () {
        var script;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    script = {
                        name: name,
                        code: code,
                        description: description !== null && description !== void 0 ? description : null,
                    };
                    return [4 /*yield*/, JsonConfigProvider_js_1.jsonConfigProvider.saveScript(script)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, script];
            }
        });
    }); },
};
/**
 * Filter out tools that are overrides of existing tools to prevent duplicates in database
 * Uses the existing tool overrides cache for optimal performance
 */
function filterOutOverrideTools(tools, namespaceUuid, serverName) {
    return __awaiter(this, void 0, void 0, function () {
        var filteredTools;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!tools || tools.length === 0) {
                        return [2 /*return*/, tools];
                    }
                    filteredTools = [];
                    return [4 /*yield*/, Promise.allSettled(tools.map(function (tool) { return __awaiter(_this, void 0, void 0, function () {
                            var fullToolName, originalName, error_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        fullToolName = "".concat((0, common_utils_js_1.sanitizeName)(serverName), "__").concat(tool.name);
                                        return [4 /*yield*/, (0, tool_overrides_functional_js_1.mapOverrideNameToOriginal)(fullToolName, namespaceUuid, true)];
                                    case 1:
                                        originalName = _a.sent();
                                        // If the original name is different from the current name,
                                        // this tool is an override and should be filtered out
                                        if (originalName !== fullToolName) {
                                            // This is an override, skip it (don't save to database)
                                            return [2 /*return*/];
                                        }
                                        // This is not an override, include it
                                        filteredTools.push(tool);
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_1 = _a.sent();
                                        console.error("Error checking if tool ".concat(tool.name, " is an override:"), error_1);
                                        // On error, include the tool (fail-safe behavior)
                                        filteredTools.push(tool);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 1:
                    _a.sent();
                    return [2 /*return*/, filteredTools];
            }
        });
    });
}
/**
 * Allows executing a tool programmatically through the full MetaMCP proxy stack.
 * Set during attachTo initialization.
 */
exports.executeProxiedTool = null;
var attachTo = function (server_1, namespaceUuid_1, sessionId_1, nativeToolDefinitions_1, nativeToolHandler_1) {
    var args_1 = [];
    for (var _i = 5; _i < arguments.length; _i++) {
        args_1[_i - 5] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([server_1, namespaceUuid_1, sessionId_1, nativeToolDefinitions_1, nativeToolHandler_1], args_1, true), void 0, function (server, namespaceUuid, sessionId, nativeToolDefinitions, nativeToolHandler, includeInactiveServers) {
        var toolToClient, toolToServerUuid, promptToClient, resourceToClient, loadedTools, MAX_LOADED_TOOLS, addToLoadedTools, isSameServerInstance, handlerContext, originalListToolsHandler, recursiveCallToolHandlerRef, delegateHandler, _internalCallToolImpl, implCallToolHandler, listToolsWithMiddleware, cleanup;
        if (includeInactiveServers === void 0) { includeInactiveServers = false; }
        return __generator(this, function (_a) {
            toolToClient = {};
            toolToServerUuid = {};
            promptToClient = {};
            resourceToClient = {};
            loadedTools = new Set();
            MAX_LOADED_TOOLS = 200;
            addToLoadedTools = function (name) {
                if (loadedTools.size >= MAX_LOADED_TOOLS && !loadedTools.has(name)) {
                    // Remove the first item (oldest) if limit reached - effectively a FIFO eviction
                    var first = loadedTools.values().next().value;
                    if (first)
                        loadedTools.delete(first);
                }
                loadedTools.add(name);
            };
            isSameServerInstance = function (params, _serverUuid) {
                // Check if server name is exactly the same as our current server instance
                // This prevents exact recursive calls to the same server
                if (params.name === "metamcp-unified-".concat(namespaceUuid)) {
                    return true;
                }
                return false;
            };
            handlerContext = {
                namespaceUuid: namespaceUuid,
                sessionId: sessionId,
            };
            originalListToolsHandler = function (request, context) { return __awaiter(void 0, void 0, void 0, function () {
                var metaTools, savedScripts, scriptTools, e_1, serverParams, visitedServers, allServerEntries, allAvailableTools, resultTools;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            metaTools = [
                                {
                                    name: "search_tools",
                                    description: "Semantically search for available tools across all connected MCP servers. Use this to find tools for a specific task.",
                                    inputSchema: {
                                        type: "object",
                                        properties: {
                                            query: {
                                                type: "string",
                                                description: "The search query describing what you want to do (e.g., 'manage github issues', 'query database')",
                                            },
                                            limit: {
                                                type: "number",
                                                description: "Max number of results to return (default: 10)",
                                            },
                                        },
                                        required: ["query"],
                                    },
                                },
                                {
                                    name: "load_tool",
                                    description: "Load a specific tool by name into your context so you can use it. Use the names found via search_tools.",
                                    inputSchema: {
                                        type: "object",
                                        properties: {
                                            name: {
                                                type: "string",
                                                description: "The full name of the tool to load (e.g., 'github__create_issue')",
                                            },
                                        },
                                        required: ["name"],
                                    },
                                },
                                {
                                    name: "run_code",
                                    description: "Execute TypeScript/JavaScript code in a secure sandbox. Use this to chain multiple tool calls, process data, or perform logic. You can call other tools from within this code using `await mcp.call('tool_name', args)`.",
                                    inputSchema: {
                                        type: "object",
                                        properties: {
                                            code: {
                                                type: "string",
                                                description: "The TypeScript/JavaScript code to execute. Top-level await is supported.",
                                            },
                                        },
                                        required: ["code"],
                                    },
                                },
                                {
                                    name: "run_python",
                                    description: "Execute Python 3 code. Suitable for data processing or simple scripts. No direct tool calling integration yet (use run_code for tool chaining).",
                                    inputSchema: {
                                        type: "object",
                                        properties: {
                                            code: {
                                                type: "string",
                                                description: "The Python 3 code to execute.",
                                            },
                                        },
                                        required: ["code"],
                                    },
                                },
                                {
                                    name: "run_agent",
                                    description: "Run an autonomous AI agent to perform a task. The agent will analyze your request, find relevant tools, write its own code, and execute it.",
                                    inputSchema: {
                                        type: "object",
                                        properties: {
                                            task: {
                                                type: "string",
                                                description: "The natural language description of the task (e.g., 'Find the latest issue in repo X and summarize it').",
                                            },
                                            policyId: {
                                                type: "string",
                                                description: "Optional UUID of a Policy to restrict the agent's tool access.",
                                            }
                                        },
                                        required: ["task"],
                                    },
                                },
                                {
                                    name: "save_script",
                                    description: "Save a successful code snippet as a reusable tool (Saved Script). The script will be available as a tool in future sessions.",
                                    inputSchema: {
                                        type: "object",
                                        properties: {
                                            name: {
                                                type: "string",
                                                description: "The name of the new tool (must be unique, alphanumeric).",
                                            },
                                            description: {
                                                type: "string",
                                                description: "Description of what this script does.",
                                            },
                                            code: {
                                                type: "string",
                                                description: "The code to save.",
                                            },
                                        },
                                        required: ["name", "code"],
                                    },
                                },
                                {
                                    name: "save_tool_set",
                                    description: "Save the currently loaded tools as a 'Tool Set' (Profile). This allows you to restore this working environment later.",
                                    inputSchema: {
                                        type: "object",
                                        properties: {
                                            name: {
                                                type: "string",
                                                description: "Name of the tool set (e.g., 'web_dev', 'data_analysis').",
                                            },
                                            description: {
                                                type: "string",
                                                description: "Description of the tool set.",
                                            },
                                        },
                                        required: ["name"],
                                    },
                                },
                                {
                                    name: "load_tool_set",
                                    description: "Load a previously saved Tool Set (Profile). This will add all tools in the set to your current context.",
                                    inputSchema: {
                                        type: "object",
                                        properties: {
                                            name: {
                                                type: "string",
                                                description: "Name of the tool set to load.",
                                            },
                                        },
                                        required: ["name"],
                                    },
                                },
                                {
                                    name: "import_mcp_config",
                                    description: "Import MCP servers from a JSON configuration file content (e.g., claude_desktop_config.json).",
                                    inputSchema: {
                                        type: "object",
                                        properties: {
                                            configJson: {
                                                type: "string",
                                                description: "The content of the JSON configuration file.",
                                            },
                                        },
                                        required: ["configJson"],
                                    },
                                },
                                // --- Phase 7: Memory Tools (claude-mem parity) ---
                                {
                                    name: "save_memory",
                                    description: "Save a fact, instruction, or knowledge snippet to your long-term memory. Use this to remember user preferences, project details, or learnings for future sessions.",
                                    inputSchema: {
                                        type: "object",
                                        properties: {
                                            content: {
                                                type: "string",
                                                description: "The information to remember.",
                                            },
                                            type: {
                                                type: "string",
                                                enum: ["working", "long_term"],
                                                description: "Type of memory. 'long_term' persists across sessions. 'working' is for the current task context.",
                                                default: "long_term"
                                            },
                                        },
                                        required: ["content"],
                                    },
                                },
                                {
                                    name: "search_memory",
                                    description: "Search your memory for relevant facts or context.",
                                    inputSchema: {
                                        type: "object",
                                        properties: {
                                            query: {
                                                type: "string",
                                                description: "The search query.",
                                            },
                                            limit: {
                                                type: "number",
                                                description: "Max results.",
                                                default: 5
                                            },
                                        },
                                        required: ["query"],
                                    },
                                },
                            ];
                            // 2. Native Tools (Pre-loaded / Standard Lib)
                            // Add native tools to metaTools list so they are always available
                            // We prefix them if needed, or assume they are global.
                            // For Borg, standard tools are global.
                            if (nativeToolDefinitions && nativeToolDefinitions.length > 0) {
                                metaTools.push.apply(metaTools, nativeToolDefinitions);
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, savedScriptService.listScripts()];
                        case 2:
                            savedScripts = _a.sent();
                            scriptTools = savedScripts.map(function (script) { return ({
                                name: "script__".concat(script.name),
                                description: "[Saved Script] ".concat(script.description || "No description"),
                                inputSchema: {
                                    type: "object",
                                    properties: {}, // Scripts currently take no args
                                    additionalProperties: true
                                }
                            }); });
                            metaTools.push.apply(metaTools, scriptTools);
                            return [3 /*break*/, 4];
                        case 3:
                            e_1 = _a.sent();
                            console.error("Error fetching saved scripts", e_1);
                            return [3 /*break*/, 4];
                        case 4: return [4 /*yield*/, (0, fetch_metamcp_service_js_1.getMcpServers)(context.namespaceUuid, includeInactiveServers)];
                        case 5:
                            serverParams = _a.sent();
                            visitedServers = new Set();
                            allServerEntries = Object.entries(serverParams);
                            allAvailableTools = [];
                            console.log("[DEBUG-TOOLS] \uD83D\uDCCB Processing ".concat(allServerEntries.length, " servers"));
                            return [4 /*yield*/, Promise.allSettled(allServerEntries.map(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                                    var session, serverVersion, actualServerName, ourServerName, capabilities, serverName, allServerTools, cursor, hasMore, result, toolsToSave, namespacedTools, e_2, error_2;
                                    var _c, _d;
                                    var mcpServerUuid = _b[0], params = _b[1];
                                    return __generator(this, function (_e) {
                                        switch (_e.label) {
                                            case 0:
                                                if (visitedServers.has(mcpServerUuid))
                                                    return [2 /*return*/];
                                                return [4 /*yield*/, mcp_server_pool_service_js_1.mcpServerPool.getSession(context.sessionId, mcpServerUuid, params, namespaceUuid)];
                                            case 1:
                                                session = _e.sent();
                                                if (!session) {
                                                    console.log("[DEBUG-TOOLS] \u274C No session for: ".concat(params.name));
                                                    return [2 /*return*/];
                                                }
                                                serverVersion = session.client.getServerVersion();
                                                actualServerName = (serverVersion === null || serverVersion === void 0 ? void 0 : serverVersion.name) || params.name || "";
                                                ourServerName = "metamcp-unified-".concat(namespaceUuid);
                                                if (actualServerName === ourServerName)
                                                    return [2 /*return*/];
                                                if (isSameServerInstance(params, mcpServerUuid))
                                                    return [2 /*return*/];
                                                visitedServers.add(mcpServerUuid);
                                                capabilities = session.client.getServerCapabilities();
                                                if (!(capabilities === null || capabilities === void 0 ? void 0 : capabilities.tools))
                                                    return [2 /*return*/];
                                                serverName = params.name || ((_c = session.client.getServerVersion()) === null || _c === void 0 ? void 0 : _c.name) || "";
                                                _e.label = 2;
                                            case 2:
                                                _e.trys.push([2, 10, , 11]);
                                                allServerTools = [];
                                                cursor = undefined;
                                                hasMore = true;
                                                _e.label = 3;
                                            case 3:
                                                if (!hasMore) return [3 /*break*/, 5];
                                                return [4 /*yield*/, session.client.request({
                                                        method: "tools/list",
                                                        params: { cursor: cursor, _meta: (_d = request.params) === null || _d === void 0 ? void 0 : _d._meta }
                                                    }, types_js_1.ListToolsResultSchema)];
                                            case 4:
                                                result = _e.sent();
                                                if (result.tools)
                                                    allServerTools.push.apply(allServerTools, result.tools);
                                                cursor = result.nextCursor;
                                                hasMore = !!result.nextCursor;
                                                return [3 /*break*/, 3];
                                            case 5:
                                                if (!(allServerTools.length > 0)) return [3 /*break*/, 9];
                                                _e.label = 6;
                                            case 6:
                                                _e.trys.push([6, 8, , 9]);
                                                return [4 /*yield*/, filterOutOverrideTools(allServerTools, namespaceUuid, serverName)];
                                            case 7:
                                                toolsToSave = _e.sent();
                                                if (toolsToSave.length > 0) {
                                                    namespacedTools = toolsToSave.map(function (t) { return (__assign(__assign({}, t), { name: "".concat((0, common_utils_js_1.sanitizeName)(serverName), "__").concat(t.name) })); });
                                                    ToolRegistry_js_1.toolRegistry.registerTools(namespacedTools, mcpServerUuid, serverName);
                                                }
                                                return [3 /*break*/, 9];
                                            case 8:
                                                e_2 = _e.sent();
                                                console.error("DB Save Error", e_2);
                                                return [3 /*break*/, 9];
                                            case 9:
                                                allServerTools.forEach(function (tool) {
                                                    var toolName = "".concat((0, common_utils_js_1.sanitizeName)(serverName), "__").concat(tool.name);
                                                    toolToClient[toolName] = session;
                                                    toolToServerUuid[toolName] = mcpServerUuid;
                                                    allAvailableTools.push(__assign(__assign({}, tool), { name: toolName }));
                                                });
                                                return [3 /*break*/, 11];
                                            case 10:
                                                error_2 = _e.sent();
                                                console.error("Error fetching tools from ".concat(serverName, ":"), error_2);
                                                return [3 /*break*/, 11];
                                            case 11: return [2 /*return*/];
                                        }
                                    });
                                }); }))];
                        case 6:
                            _a.sent();
                            resultTools = __spreadArray([], metaTools, true);
                            allAvailableTools.forEach(function (tool) {
                                if (loadedTools.has(tool.name)) {
                                    resultTools.push(tool);
                                }
                            });
                            return [2 /*return*/, { tools: resultTools }];
                    }
                });
            }); };
            recursiveCallToolHandlerRef = null;
            delegateHandler = function (request, context) { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (!recursiveCallToolHandlerRef) {
                        throw new Error("Handler not initialized");
                    }
                    return [2 /*return*/, recursiveCallToolHandlerRef(request, context)];
                });
            }); };
            _internalCallToolImpl = function (name, args, meta) { return __awaiter(void 0, void 0, void 0, function () {
                var useToon, formatResult, _a, query, limit, results, toolName, _b, scriptName, code, description, saved, error_3, code, output, error_4, _c, setName, description, toolsToSave, saved, error_5, setName, set, count, missing, _i, _d, toolName, msg, error_6, configJson, result, error_7, code, result, error_8, errorInfo, _e, task, policyId_1, result, error_9, errorInfo, _f, content, _g, type, service, _h, query, _j, limit, service, results, scriptName, script, result, error_10, errorInfo, nativeTool, res, nativeErr_1, clientForTool, parsed, abortController, mcpRequestOptions, result, error_11;
                var _k;
                return __generator(this, function (_l) {
                    switch (_l.label) {
                        case 0:
                            useToon = (meta === null || meta === void 0 ? void 0 : meta.toon) === true || (meta === null || meta === void 0 ? void 0 : meta.toon) === "true";
                            formatResult = function (result) {
                                if (!useToon)
                                    return result;
                                // Attempt to compress JSON content
                                var newContent = result.content.map(function (item) {
                                    if (item.type === "text") {
                                        try {
                                            // Try to parse as JSON first
                                            var data = JSON.parse(item.text);
                                            var serialized = toon_serializer_stub_js_1.toonSerializer.serialize(data);
                                            return __assign(__assign({}, item), { text: serialized });
                                        }
                                        catch (e) {
                                            // Not JSON, return as is
                                            return item;
                                        }
                                    }
                                    return item;
                                });
                                return __assign(__assign({}, result), { content: newContent });
                            };
                            if (!(name === "search_tools")) return [3 /*break*/, 2];
                            _a = args, query = _a.query, limit = _a.limit;
                            return [4 /*yield*/, toolSearchService.searchTools(query, limit)];
                        case 1:
                            results = _l.sent();
                            return [2 /*return*/, formatResult({
                                    content: [
                                        {
                                            type: "text",
                                            text: JSON.stringify(results, null, 2),
                                        },
                                    ],
                                })];
                        case 2:
                            if (name === "load_tool") {
                                toolName = args.name;
                                if (toolToClient[toolName]) {
                                    addToLoadedTools(toolName);
                                    return [2 /*return*/, {
                                            content: [
                                                {
                                                    type: "text",
                                                    text: "Tool '".concat(toolName, "' loaded."),
                                                }
                                            ]
                                        }];
                                }
                                else {
                                    return [2 /*return*/, {
                                            content: [
                                                {
                                                    type: "text",
                                                    text: "Tool '".concat(toolName, "' not found."),
                                                },
                                            ],
                                            isError: true,
                                        }];
                                }
                            }
                            if (!(name === "save_script")) return [3 /*break*/, 6];
                            _b = args, scriptName = _b.name, code = _b.code, description = _b.description;
                            _l.label = 3;
                        case 3:
                            _l.trys.push([3, 5, , 6]);
                            return [4 /*yield*/, savedScriptService.saveScript(scriptName, code, description)];
                        case 4:
                            saved = _l.sent();
                            return [2 /*return*/, {
                                    content: [{ type: "text", text: "Script '".concat(saved.name, "' saved successfully.") }]
                                }];
                        case 5:
                            error_3 = _l.sent();
                            return [2 /*return*/, {
                                    content: [{ type: "text", text: "Failed to save script: ".concat(error_3.message) }],
                                    isError: true
                                }];
                        case 6:
                            if (!(name === "run_python")) return [3 /*break*/, 10];
                            code = args.code;
                            _l.label = 7;
                        case 7:
                            _l.trys.push([7, 9, , 10]);
                            return [4 /*yield*/, CodeExecutorService_js_1.codeExecutorService.executeCode(code)];
                        case 8:
                            output = _l.sent();
                            return [2 /*return*/, {
                                    content: [{ type: "text", text: output }]
                                }];
                        case 9:
                            error_4 = _l.sent();
                            return [2 /*return*/, {
                                    content: [{ type: "text", text: "Execution failed: ".concat(error_4.message) }],
                                    isError: true
                                }];
                        case 10:
                            if (!(name === "save_tool_set")) return [3 /*break*/, 14];
                            _c = args, setName = _c.name, description = _c.description;
                            _l.label = 11;
                        case 11:
                            _l.trys.push([11, 13, , 14]);
                            toolsToSave = Array.from(loadedTools);
                            if (toolsToSave.length === 0) {
                                return [2 /*return*/, {
                                        content: [{ type: "text", text: "No tools currently loaded to save." }],
                                        isError: true
                                    }];
                            }
                            return [4 /*yield*/, tool_set_service_js_1.toolSetService.createToolSet(setName, toolsToSave, description)];
                        case 12:
                            saved = _l.sent();
                            return [2 /*return*/, {
                                    content: [{ type: "text", text: "Tool Set '".concat(saved.name, "' saved with ").concat(saved.tools.length, " tools.") }]
                                }];
                        case 13:
                            error_5 = _l.sent();
                            return [2 /*return*/, {
                                    content: [{ type: "text", text: "Failed to save tool set: ".concat(error_5.message) }],
                                    isError: true
                                }];
                        case 14:
                            if (!(name === "load_tool_set")) return [3 /*break*/, 18];
                            setName = args.name;
                            _l.label = 15;
                        case 15:
                            _l.trys.push([15, 17, , 18]);
                            return [4 /*yield*/, tool_set_service_js_1.toolSetService.getToolSet(setName)];
                        case 16:
                            set = _l.sent();
                            if (!set) {
                                return [2 /*return*/, {
                                        content: [{ type: "text", text: "Tool Set '".concat(setName, "' not found.") }],
                                        isError: true
                                    }];
                            }
                            count = 0;
                            missing = [];
                            for (_i = 0, _d = set.tools; _i < _d.length; _i++) {
                                toolName = _d[_i];
                                if (toolToClient[toolName]) {
                                    addToLoadedTools(toolName);
                                    count++;
                                }
                                else {
                                    missing.push(toolName);
                                }
                            }
                            msg = "Loaded ".concat(count, " tools from set '").concat(setName, "'.");
                            if (missing.length > 0) {
                                msg += " Warning: ".concat(missing.length, " tools could not be found (might be offline): ").concat(missing.join(", "));
                            }
                            return [2 /*return*/, {
                                    content: [{ type: "text", text: msg }]
                                }];
                        case 17:
                            error_6 = _l.sent();
                            return [2 /*return*/, {
                                    content: [{ type: "text", text: "Failed to load tool set: ".concat(error_6.message) }],
                                    isError: true
                                }];
                        case 18:
                            if (!(name === "import_mcp_config")) return [3 /*break*/, 22];
                            configJson = args.configJson;
                            _l.label = 19;
                        case 19:
                            _l.trys.push([19, 21, , 22]);
                            return [4 /*yield*/, config_import_service_js_1.configImportService.importClaudeConfig(configJson)];
                        case 20:
                            result = _l.sent();
                            return [2 /*return*/, {
                                    content: [{
                                            type: "text",
                                            text: "Imported ".concat(result.imported, " servers. Skipped: ").concat(JSON.stringify(result.skipped))
                                        }]
                                }];
                        case 21:
                            error_7 = _l.sent();
                            return [2 /*return*/, {
                                    content: [{ type: "text", text: "Import failed: ".concat(error_7.message) }],
                                    isError: true
                                }];
                        case 22:
                            if (!(name === "run_code")) return [3 /*break*/, 26];
                            code = args.code;
                            _l.label = 23;
                        case 23:
                            _l.trys.push([23, 25, , 26]);
                            return [4 /*yield*/, CodeExecutorService_js_1.codeExecutorService.executeCode(code, function (toolName, toolArgs) { return __awaiter(void 0, void 0, void 0, function () {
                                    var res;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                if (toolName === "run_code" || toolName === "run_agent") {
                                                    throw new Error("Cannot call run_code/run_agent from within sandbox");
                                                }
                                                return [4 /*yield*/, delegateHandler({
                                                        method: "tools/call",
                                                        params: {
                                                            name: toolName,
                                                            arguments: toolArgs,
                                                            _meta: meta
                                                        }
                                                    }, handlerContext)];
                                            case 1:
                                                res = _a.sent();
                                                return [2 /*return*/, res];
                                        }
                                    });
                                }); })];
                        case 24:
                            result = _l.sent();
                            return [2 /*return*/, formatResult({
                                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                                })];
                        case 25:
                            error_8 = _l.sent();
                            errorInfo = {
                                message: (error_8 === null || error_8 === void 0 ? void 0 : error_8.message) || String(error_8),
                                name: (error_8 === null || error_8 === void 0 ? void 0 : error_8.name) || "Error",
                                stack: (error_8 === null || error_8 === void 0 ? void 0 : error_8.stack) || undefined,
                            };
                            return [2 /*return*/, {
                                    content: [{
                                            type: "text",
                                            text: "Error: ".concat(errorInfo.message, "\nName: ").concat(errorInfo.name).concat(errorInfo.stack ? "\nStack: ".concat(errorInfo.stack) : "")
                                        }],
                                    isError: true
                                }];
                        case 26:
                            if (!(name === "run_agent")) return [3 /*break*/, 30];
                            _e = args, task = _e.task, policyId_1 = _e.policyId;
                            _l.label = 27;
                        case 27:
                            _l.trys.push([27, 29, , 30]);
                            return [4 /*yield*/, agentService.runAgent(task, function (toolName, toolArgs, meta) { return __awaiter(void 0, void 0, void 0, function () {
                                    var callMeta, res;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                if (toolName === "run_code" || toolName === "run_agent") {
                                                    throw new Error("Recursive agent calls restricted.");
                                                }
                                                callMeta = __assign(__assign({}, meta), (policyId_1 ? { policyId: policyId_1 } : {}));
                                                return [4 /*yield*/, delegateHandler({
                                                        method: "tools/call",
                                                        params: {
                                                            name: toolName,
                                                            arguments: toolArgs,
                                                            _meta: callMeta
                                                        }
                                                    }, handlerContext)];
                                            case 1:
                                                res = _a.sent();
                                                return [2 /*return*/, res];
                                        }
                                    });
                                }); }, policyId_1)];
                        case 28:
                            result = _l.sent();
                            return [2 /*return*/, formatResult({
                                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                                })];
                        case 29:
                            error_9 = _l.sent();
                            errorInfo = {
                                message: (error_9 === null || error_9 === void 0 ? void 0 : error_9.message) || String(error_9),
                                name: (error_9 === null || error_9 === void 0 ? void 0 : error_9.name) || "Error",
                                stack: (error_9 === null || error_9 === void 0 ? void 0 : error_9.stack) || undefined,
                            };
                            return [2 /*return*/, {
                                    content: [{
                                            type: "text",
                                            text: "Agent Error: ".concat(errorInfo.message, "\nName: ").concat(errorInfo.name).concat(errorInfo.stack ? "\nStack: ".concat(errorInfo.stack) : "")
                                        }],
                                    isError: true
                                }];
                        case 30:
                            if (!(name === "save_memory")) return [3 /*break*/, 32];
                            _f = args, content = _f.content, _g = _f.type, type = _g === void 0 ? "long_term" : _g;
                            service = (0, trpc_core_js_1.getAgentMemoryService)();
                            if (!service)
                                return [2 /*return*/, { content: [{ type: "text", text: "Memory service not available." }], isError: true }];
                            return [4 /*yield*/, service.add(content, type, 'agent', { source: 'tool_call', sessionId: sessionId })];
                        case 31:
                            _l.sent();
                            return [2 /*return*/, {
                                    content: [{ type: "text", text: "Memory saved (".concat(type, ").") }]
                                }];
                        case 32:
                            if (!(name === "search_memory")) return [3 /*break*/, 34];
                            _h = args, query = _h.query, _j = _h.limit, limit = _j === void 0 ? 5 : _j;
                            service = (0, trpc_core_js_1.getAgentMemoryService)();
                            if (!service)
                                return [2 /*return*/, { content: [{ type: "text", text: "Memory service not available." }], isError: true }];
                            return [4 /*yield*/, service.search(query, { limit: limit })];
                        case 33:
                            results = _l.sent();
                            return [2 /*return*/, formatResult({
                                    content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
                                })];
                        case 34:
                            if (!name.startsWith("script__")) return [3 /*break*/, 39];
                            scriptName = name.replace("script__", "");
                            return [4 /*yield*/, savedScriptService.getScript(scriptName)];
                        case 35:
                            script = _l.sent();
                            if (!script) return [3 /*break*/, 39];
                            _l.label = 36;
                        case 36:
                            _l.trys.push([36, 38, , 39]);
                            return [4 /*yield*/, CodeExecutorService_js_1.codeExecutorService.executeCode(script.code, function (toolName, toolArgs) { return __awaiter(void 0, void 0, void 0, function () {
                                    var res;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                if (toolName === "run_code" || toolName.startsWith("script__")) {
                                                    throw new Error("Recursion restricted in saved scripts");
                                                }
                                                return [4 /*yield*/, delegateHandler({
                                                        method: "tools/call",
                                                        params: {
                                                            name: toolName,
                                                            arguments: toolArgs,
                                                            _meta: meta
                                                        }
                                                    }, handlerContext)];
                                            case 1:
                                                res = _a.sent();
                                                return [2 /*return*/, res];
                                        }
                                    });
                                }); })];
                        case 37:
                            result = _l.sent();
                            return [2 /*return*/, formatResult({
                                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                                })];
                        case 38:
                            error_10 = _l.sent();
                            errorInfo = {
                                message: (error_10 === null || error_10 === void 0 ? void 0 : error_10.message) || String(error_10),
                                name: (error_10 === null || error_10 === void 0 ? void 0 : error_10.name) || "Error",
                                stack: (error_10 === null || error_10 === void 0 ? void 0 : error_10.stack) || undefined,
                            };
                            return [2 /*return*/, {
                                    content: [{
                                            type: "text",
                                            text: "Script Error: ".concat(errorInfo.message, "\nName: ").concat(errorInfo.name).concat(errorInfo.stack ? "\nStack: ".concat(errorInfo.stack) : "")
                                        }],
                                    isError: true
                                }];
                        case 39:
                            nativeTool = nativeToolDefinitions.find(function (t) { return t.name === name; });
                            if (!nativeTool) return [3 /*break*/, 43];
                            _l.label = 40;
                        case 40:
                            _l.trys.push([40, 42, , 43]);
                            return [4 /*yield*/, nativeToolHandler(name, args)];
                        case 41:
                            res = _l.sent();
                            return [2 /*return*/, formatResult(res)];
                        case 42:
                            nativeErr_1 = _l.sent();
                            return [2 /*return*/, {
                                    content: [{
                                            type: "text",
                                            text: "Native Tool Error: ".concat(nativeErr_1.message, "\nStack: ").concat(nativeErr_1.stack)
                                        }],
                                    isError: true
                                }];
                        case 43:
                            clientForTool = toolToClient[name];
                            if (!clientForTool) {
                                throw new Error("Unknown tool: ".concat(name));
                            }
                            parsed = (0, tool_name_parser_service_js_1.parseToolName)(name);
                            if (!parsed)
                                throw new Error("Invalid tool name: ".concat(name));
                            _l.label = 44;
                        case 44:
                            _l.trys.push([44, 47, , 48]);
                            abortController = new AbortController();
                            _k = {
                                signal: abortController.signal
                            };
                            return [4 /*yield*/, config_service_js_1.configService.getMcpTimeout()];
                        case 45:
                            mcpRequestOptions = (_k.timeout = _l.sent(),
                                _k);
                            return [4 /*yield*/, clientForTool.client.request({
                                    method: "tools/call",
                                    params: {
                                        name: parsed.originalToolName,
                                        arguments: args || {},
                                        _meta: meta,
                                    }
                                }, types_js_1.CompatibilityCallToolResultSchema, mcpRequestOptions)];
                        case 46:
                            result = _l.sent();
                            return [2 /*return*/, formatResult(result)];
                        case 47:
                            error_11 = _l.sent();
                            console.error("Error calling ".concat(name, ":"), error_11);
                            throw error_11;
                        case 48: return [2 /*return*/];
                    }
                });
            }); };
            implCallToolHandler = function (request, _context) { return __awaiter(void 0, void 0, void 0, function () {
                var _a, name, args, _meta;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = request.params, name = _a.name, args = _a.arguments, _meta = _a._meta;
                            return [4 /*yield*/, _internalCallToolImpl(name, args, _meta)];
                        case 1: return [2 /*return*/, _b.sent()];
                    }
                });
            }); };
            // Compose the middleware
            // The composed handler calls implCallToolHandler, which calls _internalCallToolImpl,
            // which might call delegateHandler, which calls recursiveCallToolHandlerRef (this composed stack).
            recursiveCallToolHandlerRef = (0, functional_middleware_js_1.compose)((0, logging_functional_js_1.createLoggingMiddleware)({ enabled: true }), (0, policy_functional_js_1.createPolicyMiddleware)({ enabled: true }), // Add Policy Middleware
            (0, filter_tools_functional_js_1.createFilterCallToolMiddleware)({
                cacheEnabled: true,
                customErrorMessage: function (toolName, reason) { return "Access denied: ".concat(reason); },
            }), (0, tool_overrides_functional_js_1.createToolOverridesCallToolMiddleware)({ cacheEnabled: true }))(implCallToolHandler);
            listToolsWithMiddleware = (0, functional_middleware_js_1.compose)((0, tool_overrides_functional_js_1.createToolOverridesListToolsMiddleware)({
                cacheEnabled: true,
                persistentCacheOnListTools: true,
            }), (0, filter_tools_functional_js_1.createFilterListToolsMiddleware)({ cacheEnabled: true }))(originalListToolsHandler);
            // Set up the handlers
            server.setRequestHandler(types_js_1.ListToolsRequestSchema, function (request) { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, listToolsWithMiddleware(request, handlerContext)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); });
            exports.executeProxiedTool = function (name, args) { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!recursiveCallToolHandlerRef)
                                throw new Error("Proxy Handler not initialized");
                            return [4 /*yield*/, recursiveCallToolHandlerRef({
                                    method: "tools/call",
                                    params: { name: name, arguments: args || {}, _meta: {} }
                                }, handlerContext)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); };
            server.setRequestHandler(types_js_1.CallToolRequestSchema, function (request) { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!recursiveCallToolHandlerRef)
                                throw new Error("Handler not initialized");
                            return [4 /*yield*/, recursiveCallToolHandlerRef(request, handlerContext)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); });
            // Get Prompt Handler
            server.setRequestHandler(types_js_1.GetPromptRequestSchema, function (request) { return __awaiter(void 0, void 0, void 0, function () {
                var name, clientForPrompt, parsed, promptName, response, error_12;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            name = request.params.name;
                            clientForPrompt = promptToClient[name];
                            if (!clientForPrompt) {
                                throw new Error("Unknown prompt: ".concat(name));
                            }
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            parsed = (0, tool_name_parser_service_js_1.parseToolName)(name);
                            if (!parsed) {
                                throw new Error("Invalid prompt name format: ".concat(name));
                            }
                            promptName = parsed.originalToolName;
                            return [4 /*yield*/, clientForPrompt.client.request({
                                    method: "prompts/get",
                                    params: {
                                        name: promptName,
                                        arguments: request.params.arguments || {},
                                        _meta: request.params._meta,
                                    },
                                }, types_js_1.GetPromptResultSchema)];
                        case 2:
                            response = _b.sent();
                            return [2 /*return*/, response];
                        case 3:
                            error_12 = _b.sent();
                            console.error("Error getting prompt through ".concat((_a = clientForPrompt.client.getServerVersion()) === null || _a === void 0 ? void 0 : _a.name, ":"), error_12);
                            throw error_12;
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            // List Prompts Handler
            server.setRequestHandler(types_js_1.ListPromptsRequestSchema, function (request) { return __awaiter(void 0, void 0, void 0, function () {
                var serverParams, allPrompts, visitedServers, validPromptServers;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, (0, fetch_metamcp_service_js_1.getMcpServers)(namespaceUuid, includeInactiveServers)];
                        case 1:
                            serverParams = _b.sent();
                            allPrompts = [];
                            visitedServers = new Set();
                            validPromptServers = Object.entries(serverParams).filter(function (_a) {
                                var uuid = _a[0], params = _a[1];
                                // Skip if we've already visited this server to prevent circular references
                                if (visitedServers.has(uuid)) {
                                    console.log("Skipping already visited server in prompts: ".concat(params.name || uuid));
                                    return false;
                                }
                                // Check if this server is the same instance to prevent self-referencing
                                if (isSameServerInstance(params, uuid)) {
                                    console.log("Skipping self-referencing server in prompts: ".concat(params.name || uuid));
                                    return false;
                                }
                                // Mark this server as visited
                                visitedServers.add(uuid);
                                return true;
                            });
                            return [4 /*yield*/, Promise.allSettled(validPromptServers.map(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                                    var session, serverVersion, actualServerName, ourServerName, capabilities, serverName, result, promptsWithSource, error_13;
                                    var _c, _d, _e;
                                    var uuid = _b[0], params = _b[1];
                                    return __generator(this, function (_f) {
                                        switch (_f.label) {
                                            case 0: return [4 /*yield*/, mcp_server_pool_service_js_1.mcpServerPool.getSession(sessionId, uuid, params, namespaceUuid)];
                                            case 1:
                                                session = _f.sent();
                                                if (!session)
                                                    return [2 /*return*/];
                                                serverVersion = session.client.getServerVersion();
                                                actualServerName = (serverVersion === null || serverVersion === void 0 ? void 0 : serverVersion.name) || params.name || "";
                                                ourServerName = "metamcp-unified-".concat(namespaceUuid);
                                                if (actualServerName === ourServerName) {
                                                    console.log("Skipping self-referencing MetaMCP server in prompts: \"".concat(actualServerName, "\""));
                                                    return [2 /*return*/];
                                                }
                                                capabilities = session.client.getServerCapabilities();
                                                if (!(capabilities === null || capabilities === void 0 ? void 0 : capabilities.prompts))
                                                    return [2 /*return*/];
                                                serverName = params.name || ((_c = session.client.getServerVersion()) === null || _c === void 0 ? void 0 : _c.name) || "";
                                                _f.label = 2;
                                            case 2:
                                                _f.trys.push([2, 4, , 5]);
                                                return [4 /*yield*/, session.client.request({
                                                        method: "prompts/list",
                                                        params: {
                                                            cursor: (_d = request.params) === null || _d === void 0 ? void 0 : _d.cursor,
                                                            _meta: (_e = request.params) === null || _e === void 0 ? void 0 : _e._meta,
                                                        },
                                                    }, types_js_1.ListPromptsResultSchema)];
                                            case 3:
                                                result = _f.sent();
                                                if (result.prompts) {
                                                    promptsWithSource = result.prompts.map(function (prompt) {
                                                        var promptName = "".concat((0, common_utils_js_1.sanitizeName)(serverName), "__").concat(prompt.name);
                                                        promptToClient[promptName] = session;
                                                        return __assign(__assign({}, prompt), { name: promptName, description: prompt.description || "" });
                                                    });
                                                    allPrompts.push.apply(allPrompts, promptsWithSource);
                                                }
                                                return [3 /*break*/, 5];
                                            case 4:
                                                error_13 = _f.sent();
                                                console.error("Error fetching prompts from: ".concat(serverName), error_13);
                                                return [3 /*break*/, 5];
                                            case 5: return [2 /*return*/];
                                        }
                                    });
                                }); }))];
                        case 2:
                            _b.sent();
                            return [2 /*return*/, {
                                    prompts: allPrompts,
                                    nextCursor: (_a = request.params) === null || _a === void 0 ? void 0 : _a.cursor,
                                }];
                    }
                });
            }); });
            // List Resources Handler
            server.setRequestHandler(types_js_1.ListResourcesRequestSchema, function (request) { return __awaiter(void 0, void 0, void 0, function () {
                var serverParams, allResources, visitedServers, validResourceServers;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, (0, fetch_metamcp_service_js_1.getMcpServers)(namespaceUuid, includeInactiveServers)];
                        case 1:
                            serverParams = _b.sent();
                            allResources = [];
                            visitedServers = new Set();
                            validResourceServers = Object.entries(serverParams).filter(function (_a) {
                                var uuid = _a[0], params = _a[1];
                                // Skip if we've already visited this server to prevent circular references
                                if (visitedServers.has(uuid)) {
                                    console.log("Skipping already visited server in resources: ".concat(params.name || uuid));
                                    return false;
                                }
                                // Check if this server is the same instance to prevent self-referencing
                                if (isSameServerInstance(params, uuid)) {
                                    console.log("Skipping self-referencing server in resources: ".concat(params.name || uuid));
                                    return false;
                                }
                                // Mark this server as visited
                                visitedServers.add(uuid);
                                return true;
                            });
                            return [4 /*yield*/, Promise.allSettled(validResourceServers.map(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                                    var session, serverVersion, actualServerName, ourServerName, capabilities, serverName, result, resourcesWithSource, error_14;
                                    var _c, _d, _e;
                                    var uuid = _b[0], params = _b[1];
                                    return __generator(this, function (_f) {
                                        switch (_f.label) {
                                            case 0: return [4 /*yield*/, mcp_server_pool_service_js_1.mcpServerPool.getSession(sessionId, uuid, params, namespaceUuid)];
                                            case 1:
                                                session = _f.sent();
                                                if (!session)
                                                    return [2 /*return*/];
                                                serverVersion = session.client.getServerVersion();
                                                actualServerName = (serverVersion === null || serverVersion === void 0 ? void 0 : serverVersion.name) || params.name || "";
                                                ourServerName = "metamcp-unified-".concat(namespaceUuid);
                                                if (actualServerName === ourServerName) {
                                                    console.log("Skipping self-referencing MetaMCP server in resources: \"".concat(actualServerName, "\""));
                                                    return [2 /*return*/];
                                                }
                                                capabilities = session.client.getServerCapabilities();
                                                if (!(capabilities === null || capabilities === void 0 ? void 0 : capabilities.resources))
                                                    return [2 /*return*/];
                                                serverName = params.name || ((_c = session.client.getServerVersion()) === null || _c === void 0 ? void 0 : _c.name) || "";
                                                _f.label = 2;
                                            case 2:
                                                _f.trys.push([2, 4, , 5]);
                                                return [4 /*yield*/, session.client.request({
                                                        method: "resources/list",
                                                        params: {
                                                            cursor: (_d = request.params) === null || _d === void 0 ? void 0 : _d.cursor,
                                                            _meta: (_e = request.params) === null || _e === void 0 ? void 0 : _e._meta,
                                                        },
                                                    }, types_js_1.ListResourcesResultSchema)];
                                            case 3:
                                                result = _f.sent();
                                                if (result.resources) {
                                                    resourcesWithSource = result.resources.map(function (resource) {
                                                        resourceToClient[resource.uri] = session;
                                                        return __assign(__assign({}, resource), { name: resource.name || "" });
                                                    });
                                                    allResources.push.apply(allResources, resourcesWithSource);
                                                }
                                                return [3 /*break*/, 5];
                                            case 4:
                                                error_14 = _f.sent();
                                                console.error("Error fetching resources from: ".concat(serverName), error_14);
                                                return [3 /*break*/, 5];
                                            case 5: return [2 /*return*/];
                                        }
                                    });
                                }); }))];
                        case 2:
                            _b.sent();
                            return [2 /*return*/, {
                                    resources: allResources,
                                    nextCursor: (_a = request.params) === null || _a === void 0 ? void 0 : _a.cursor,
                                }];
                    }
                });
            }); });
            // Read Resource Handler
            server.setRequestHandler(types_js_1.ReadResourceRequestSchema, function (request) { return __awaiter(void 0, void 0, void 0, function () {
                var uri, clientForResource, error_15;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            uri = request.params.uri;
                            clientForResource = resourceToClient[uri];
                            if (!clientForResource) {
                                throw new Error("Unknown resource: ".concat(uri));
                            }
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, clientForResource.client.request({
                                    method: "resources/read",
                                    params: {
                                        uri: uri,
                                        _meta: request.params._meta,
                                    },
                                }, types_js_1.ReadResourceResultSchema)];
                        case 2: return [2 /*return*/, _b.sent()];
                        case 3:
                            error_15 = _b.sent();
                            console.error("Error reading resource through ".concat((_a = clientForResource.client.getServerVersion()) === null || _a === void 0 ? void 0 : _a.name, ":"), error_15);
                            throw error_15;
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            // List Resource Templates Handler
            server.setRequestHandler(types_js_1.ListResourceTemplatesRequestSchema, function (request) { return __awaiter(void 0, void 0, void 0, function () {
                var serverParams, allTemplates, visitedServers, validTemplateServers;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, (0, fetch_metamcp_service_js_1.getMcpServers)(namespaceUuid, includeInactiveServers)];
                        case 1:
                            serverParams = _b.sent();
                            allTemplates = [];
                            visitedServers = new Set();
                            validTemplateServers = Object.entries(serverParams).filter(function (_a) {
                                var uuid = _a[0], params = _a[1];
                                // Skip if we've already visited this server to prevent circular references
                                if (visitedServers.has(uuid)) {
                                    console.log("Skipping already visited server in resource templates: ".concat(params.name || uuid));
                                    return false;
                                }
                                // Check if this server is the same instance to prevent self-referencing
                                if (isSameServerInstance(params, uuid)) {
                                    console.log("Skipping self-referencing server in resource templates: ".concat(params.name || uuid));
                                    return false;
                                }
                                // Mark this server as visited
                                visitedServers.add(uuid);
                                return true;
                            });
                            return [4 /*yield*/, Promise.allSettled(validTemplateServers.map(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                                    var session, serverVersion, actualServerName, ourServerName, capabilities, serverName, result, templatesWithSource, error_16;
                                    var _c, _d, _e;
                                    var uuid = _b[0], params = _b[1];
                                    return __generator(this, function (_f) {
                                        switch (_f.label) {
                                            case 0: return [4 /*yield*/, mcp_server_pool_service_js_1.mcpServerPool.getSession(sessionId, uuid, params, namespaceUuid)];
                                            case 1:
                                                session = _f.sent();
                                                if (!session)
                                                    return [2 /*return*/];
                                                serverVersion = session.client.getServerVersion();
                                                actualServerName = (serverVersion === null || serverVersion === void 0 ? void 0 : serverVersion.name) || params.name || "";
                                                ourServerName = "metamcp-unified-".concat(namespaceUuid);
                                                if (actualServerName === ourServerName) {
                                                    console.log("Skipping self-referencing MetaMCP server in resource templates: \"".concat(actualServerName, "\""));
                                                    return [2 /*return*/];
                                                }
                                                capabilities = session.client.getServerCapabilities();
                                                if (!(capabilities === null || capabilities === void 0 ? void 0 : capabilities.resources))
                                                    return [2 /*return*/];
                                                serverName = params.name || ((_c = session.client.getServerVersion()) === null || _c === void 0 ? void 0 : _c.name) || "";
                                                _f.label = 2;
                                            case 2:
                                                _f.trys.push([2, 4, , 5]);
                                                return [4 /*yield*/, session.client.request({
                                                        method: "resources/templates/list",
                                                        params: {
                                                            cursor: (_d = request.params) === null || _d === void 0 ? void 0 : _d.cursor,
                                                            _meta: (_e = request.params) === null || _e === void 0 ? void 0 : _e._meta,
                                                        },
                                                    }, types_js_1.ListResourceTemplatesResultSchema)];
                                            case 3:
                                                result = _f.sent();
                                                if (result.resourceTemplates) {
                                                    templatesWithSource = result.resourceTemplates.map(function (template) { return (__assign(__assign({}, template), { name: template.name || "" })); });
                                                    allTemplates.push.apply(allTemplates, templatesWithSource);
                                                }
                                                return [3 /*break*/, 5];
                                            case 4:
                                                error_16 = _f.sent();
                                                console.error("Error fetching resource templates from: ".concat(serverName), error_16);
                                                return [2 /*return*/];
                                            case 5: return [2 /*return*/];
                                        }
                                    });
                                }); }))];
                        case 2:
                            _b.sent();
                            return [2 /*return*/, {
                                    resourceTemplates: allTemplates,
                                    nextCursor: (_a = request.params) === null || _a === void 0 ? void 0 : _a.cursor,
                                }];
                    }
                });
            }); });
            cleanup = function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: 
                        // Cleanup is now handled by the pool
                        return [4 /*yield*/, mcp_server_pool_service_js_1.mcpServerPool.cleanupSession(sessionId)];
                        case 1:
                            // Cleanup is now handled by the pool
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
            return [2 /*return*/, { cleanup: cleanup }];
        });
    });
};
exports.attachTo = attachTo;
