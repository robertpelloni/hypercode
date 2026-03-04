"use strict";
/**
 * Code Mode Service - Universal Tool Calling via Code Execution
 *
 * Enables LLMs to write executable code to call tools instead of structured JSON,
 * achieving dramatic context reduction by eliminating tool schema overhead.
 *
 * Features:
 * - LLM generates TypeScript/JS code instead of JSON tool calls
 * - Sandboxed code execution
 * - Tool functions as SDK
 * - 94% context reduction (no schemas in prompt)
 * - Progressive disclosure (load tools as needed)
 * - Error handling and retry
 *
 * Based on the Universal Tool-Calling Protocol (UTCP) concept.
 */
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
exports.createDefaultTools = exports.CodeModeService = exports.CodeExecutor = exports.ToolRegistry = void 0;
/**
 * Tool Registry - Manages available tools as callable functions
 */
var ToolRegistry = /** @class */ (function () {
    function ToolRegistry() {
        this.tools = new Map();
        this.callLog = [];
    }
    /**
     * Register a tool
     */
    ToolRegistry.prototype.register = function (tool) {
        this.tools.set(tool.name, tool);
    };
    /**
     * Register multiple tools
     */
    ToolRegistry.prototype.registerAll = function (tools) {
        for (var _i = 0, tools_1 = tools; _i < tools_1.length; _i++) {
            var tool = tools_1[_i];
            this.register(tool);
        }
    };
    /**
     * Get a tool by name
     */
    ToolRegistry.prototype.get = function (name) {
        return this.tools.get(name);
    };
    /**
     * Get all tool names
     */
    ToolRegistry.prototype.getNames = function () {
        return Array.from(this.tools.keys());
    };
    /**
     * Get all tools
     */
    ToolRegistry.prototype.getAll = function () {
        return Array.from(this.tools.values());
    };
    /**
     * Create callable versions of tools for the sandbox
     */
    ToolRegistry.prototype.createCallables = function () {
        var _this = this;
        var callables = {};
        var _loop_1 = function (name_1, tool) {
            callables[name_1] = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                _this.callLog.push(name_1);
                return tool.fn.apply(tool, args);
            };
        };
        for (var _i = 0, _a = this.tools; _i < _a.length; _i++) {
            var _b = _a[_i], name_1 = _b[0], tool = _b[1];
            _loop_1(name_1, tool);
        }
        return callables;
    };
    /**
     * Get and clear call log
     */
    ToolRegistry.prototype.getCallLog = function () {
        var log = __spreadArray([], this.callLog, true);
        this.callLog = [];
        return log;
    };
    /**
     * Generate minimal tool SDK documentation (for system prompt)
     */
    ToolRegistry.prototype.generateSDKDoc = function () {
        var lines = [
            '// Available Tools SDK',
            '// Call tools directly as functions:',
            '',
        ];
        for (var _i = 0, _a = this.tools.values(); _i < _a.length; _i++) {
            var tool = _a[_i];
            var params = tool.parameters
                ? Object.entries(tool.parameters)
                    .map(function (_a) {
                    var name = _a[0], def = _a[1];
                    return "".concat(name, ": ").concat(def.type);
                })
                    .join(', ')
                : '';
            lines.push("// ".concat(tool.description));
            lines.push("function ".concat(tool.name, "(").concat(params, "): any"));
            lines.push('');
        }
        return lines.join('\n');
    };
    /**
     * Generate compact tool list (for context reduction)
     */
    ToolRegistry.prototype.generateCompactList = function () {
        return this.getNames().join(', ');
    };
    return ToolRegistry;
}());
exports.ToolRegistry = ToolRegistry;
var SandboxService_js_1 = require("../security/SandboxService.js");
/**
 * Code Executor - Sandboxed TypeScript/JavaScript execution
 */
var CodeExecutor = /** @class */ (function () {
    function CodeExecutor(options) {
        if (options === void 0) { options = {}; }
        var _a, _b, _c, _d;
        this.options = {
            timeout: (_a = options.timeout) !== null && _a !== void 0 ? _a : 30000,
            maxOutputLength: (_b = options.maxOutputLength) !== null && _b !== void 0 ? _b : 100000,
            allowAsync: (_c = options.allowAsync) !== null && _c !== void 0 ? _c : true,
            sandboxLevel: (_d = options.sandboxLevel) !== null && _d !== void 0 ? _d : 'strict',
        };
        this.sandboxHelper = new SandboxService_js_1.SandboxService();
    }
    /**
     * Reason: permissive sandbox mode selectively exposes safe global constructors/utilities.
     * What: Reads a global value by key using `globalThis` and returns it as `unknown`.
    * Why: Avoids broad untyped global casts while preserving controlled global pass-through behavior.
     */
    CodeExecutor.prototype.getGlobalValue = function (key) {
        var globalObject = globalThis;
        return globalObject[key];
    };
    /**
     * Execute code in a sandboxed environment
     */
    CodeExecutor.prototype.execute = function (code_1, tools_2) {
        return __awaiter(this, arguments, void 0, function (code, tools, additionalContext) {
            var startTime, toolsCalled, context, unsafeGlobals, finalCode, _a, output, result, error, error_1;
            var _this = this;
            if (additionalContext === void 0) { additionalContext = {}; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        startTime = Date.now();
                        toolsCalled = [];
                        context = __assign(__assign(__assign({}, tools), additionalContext), { 
                            // Track tool calls
                            __trackCall: function (name) {
                                toolsCalled.push(name);
                            } });
                        // Add safe built-ins if permissive
                        if (this.options.sandboxLevel === 'permissive') {
                            unsafeGlobals = [
                                'JSON', 'Math', 'Date', 'Array', 'Object', 'String', 'Number',
                                'Boolean', 'RegExp', 'Map', 'Set', 'Promise'
                            ];
                            unsafeGlobals.forEach(function (g) {
                                var value = _this.getGlobalValue(g);
                                if (value !== undefined) {
                                    context[g] = value;
                                }
                            });
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        finalCode = code;
                        if (this.options.allowAsync) {
                            // Wrap in async IIFE for await support if not already
                            if (!code.trim().startsWith('(async')) {
                                finalCode = "\n                      (async () => {\n                        ".concat(code, "\n                      })()\n                    ");
                            }
                        }
                        return [4 /*yield*/, this.sandboxHelper.execute('node', finalCode, this.options.timeout, context)];
                    case 2:
                        _a = _b.sent(), output = _a.output, result = _a.result, error = _a.error;
                        return [2 /*return*/, {
                                success: !error,
                                result: result,
                                error: error,
                                output: output.slice(0, this.options.maxOutputLength),
                                executionTime: Date.now() - startTime,
                                toolsCalled: toolsCalled,
                            }];
                    case 3:
                        error_1 = _b.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: error_1 instanceof Error ? error_1.message : String(error_1),
                                output: '[Execution Error]',
                                executionTime: Date.now() - startTime,
                                toolsCalled: toolsCalled,
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return CodeExecutor;
}());
exports.CodeExecutor = CodeExecutor;
/**
 * Code Mode Service - Main service for code-based tool calling
 */
var CodeModeService = /** @class */ (function () {
    function CodeModeService(options) {
        if (options === void 0) { options = {}; }
        this.enabled = false;
        this.registry = new ToolRegistry();
        this.executor = new CodeExecutor(options);
    }
    /**
     * Enable Code Mode
     */
    CodeModeService.prototype.enable = function () {
        this.enabled = true;
    };
    /**
     * Disable Code Mode
     */
    CodeModeService.prototype.disable = function () {
        this.enabled = false;
    };
    /**
     * Check if Code Mode is enabled
     */
    CodeModeService.prototype.isEnabled = function () {
        return this.enabled;
    };
    /**
     * Get the tool registry
     */
    CodeModeService.prototype.getRegistry = function () {
        return this.registry;
    };
    /**
     * Register a tool
     */
    CodeModeService.prototype.registerTool = function (tool) {
        this.registry.register(tool);
    };
    /**
     * Register multiple tools
     */
    CodeModeService.prototype.registerTools = function (tools) {
        this.registry.registerAll(tools);
    };
    /**
     * Execute code with access to registered tools
     */
    CodeModeService.prototype.executeCode = function (code_1) {
        return __awaiter(this, arguments, void 0, function (code, additionalContext) {
            var tools;
            if (additionalContext === void 0) { additionalContext = {}; }
            return __generator(this, function (_a) {
                if (!this.enabled) {
                    return [2 /*return*/, {
                            success: false,
                            error: 'Code Mode is not enabled',
                            executionTime: 0,
                            toolsCalled: [],
                        }];
                }
                tools = this.registry.createCallables();
                return [2 /*return*/, this.executor.execute(code, tools, additionalContext)];
            });
        });
    };
    /**
     * Generate system prompt addition for Code Mode
     */
    CodeModeService.prototype.generateSystemPrompt = function () {
        return "\n## Code Mode\n\nYou can execute code to call tools instead of using structured tool calls.\nThis is more efficient and allows for complex logic.\n\n".concat(this.registry.generateSDKDoc(), "\n\n### Usage\nWrite code that calls the tool functions directly. The code runs in a sandboxed environment.\n\nExample:\n```javascript\nconst content = await read_file(\"src/index.ts\");\nconsole.log(content);\nconst symbols = await get_symbols(\"src/index.ts\");\nconsole.log(\"Found\", symbols.length, \"symbols\");\n```\n\n### Response Format\nRespond with code blocks that will be executed:\n\n```code\n// Your code here\n```\n").trim();
    };
    /**
     * Parse LLM response for code blocks
     */
    CodeModeService.prototype.parseCodeBlocks = function (response) {
        var codeBlockRegex = /```(?:code|javascript|js|typescript|ts)?\s*\n([\s\S]*?)```/g;
        var blocks = [];
        var match;
        while ((match = codeBlockRegex.exec(response)) !== null) {
            blocks.push(match[1].trim());
        }
        return blocks;
    };
    /**
     * Execute all code blocks from an LLM response
     */
    CodeModeService.prototype.executeResponse = function (response_1) {
        return __awaiter(this, arguments, void 0, function (response, context) {
            var blocks, results, _i, blocks_1, code, result;
            if (context === void 0) { context = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        blocks = this.parseCodeBlocks(response);
                        results = [];
                        _i = 0, blocks_1 = blocks;
                        _a.label = 1;
                    case 1:
                        if (!(_i < blocks_1.length)) return [3 /*break*/, 4];
                        code = blocks_1[_i];
                        return [4 /*yield*/, this.executeCode(code, context)];
                    case 2:
                        result = _a.sent();
                        results.push(result);
                        // Stop on error
                        if (!result.success) {
                            return [3 /*break*/, 4];
                        }
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, results];
                }
            });
        });
    };
    /**
     * Calculate context reduction
     * Compares traditional tool JSON schemas vs Code Mode SDK doc
     */
    CodeModeService.prototype.calculateContextReduction = function () {
        var tools = this.registry.getAll();
        // Estimate traditional JSON schema size
        var traditionalSize = 0;
        for (var _i = 0, tools_2 = tools; _i < tools_2.length; _i++) {
            var tool = tools_2[_i];
            // Typical JSON schema has: name, description, parameters object
            // Each parameter has: name, type, description, required
            traditionalSize += JSON.stringify({
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: 'object',
                    properties: tool.parameters || {},
                    required: Object.entries(tool.parameters || {})
                        .filter(function (_a) {
                        var p = _a[1];
                        return p.required;
                    })
                        .map(function (_a) {
                        var name = _a[0];
                        return name;
                    }),
                },
            }).length;
        }
        // Code Mode SDK doc size
        var codeModeSize = this.registry.generateSDKDoc().length;
        var reduction = traditionalSize > 0
            ? Math.round((1 - codeModeSize / traditionalSize) * 100)
            : 0;
        return {
            traditional: traditionalSize,
            codeMode: codeModeSize,
            reduction: reduction,
        };
    };
    return CodeModeService;
}());
exports.CodeModeService = CodeModeService;
// Create default built-in tools
var createDefaultTools = function () { return [
    {
        name: 'echo',
        description: 'Echo a message back',
        fn: function (message) { return String(message); },
        parameters: {
            message: { type: 'string', description: 'Message to echo', required: true },
        },
    },
    {
        name: 'sleep',
        description: 'Wait for a specified number of milliseconds',
        fn: function (ms) { return new Promise(function (resolve) { return setTimeout(resolve, Number(ms)); }); },
        parameters: {
            ms: { type: 'number', description: 'Milliseconds to wait', required: true },
        },
    },
    {
        name: 'timestamp',
        description: 'Get current Unix timestamp',
        fn: function () { return Date.now(); },
    },
]; };
exports.createDefaultTools = createDefaultTools;
exports.default = CodeModeService;
