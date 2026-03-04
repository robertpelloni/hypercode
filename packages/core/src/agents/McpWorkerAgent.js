"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.McpWorkerAgent = void 0;
var SpecializedAgent_js_1 = require("../mesh/SpecializedAgent.js");
var McpWorkerAgent = /** @class */ (function (_super) {
    __extends(McpWorkerAgent, _super);
    function McpWorkerAgent(llm, mcpServer) {
        // Expose capabilities bridging MCP tools and general reasoning
        var _this = _super.call(this, 'McpWorker', ['mcp_worker', 'general_intelligence']) || this;
        _this.maxSteps = 10;
        _this.llm = llm;
        _this.mcpServer = mcpServer;
        return _this;
    }
    McpWorkerAgent.prototype.handleTask = function (offer) {
        return __awaiter(this, void 0, void 0, function () {
            var requestedTools, nativeTools, availableTools, toolDescriptions, systemPrompt, history, currentPrompt, step, _loop_1, this_1, state_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[McpWorkerAgent] \uD83E\uDDE0 Analyzing task: \"".concat(offer.task, "\""));
                        requestedTools = offer.tools || [];
                        return [4 /*yield*/, this.mcpServer.getNativeTools()];
                    case 1:
                        nativeTools = _a.sent();
                        availableTools = nativeTools.filter(function (t) { return requestedTools.includes(t.name); });
                        toolDescriptions = availableTools.map(function (t) { return ({
                            name: t.name,
                            description: t.description,
                            parameters: t.inputSchema
                        }); });
                        systemPrompt = "You are a Swarm Worker Agent with access to external tools.\nYour task is: ".concat(offer.task, "\n\nYou have access to the following tools:\n").concat(JSON.stringify(toolDescriptions, null, 2), "\n\nMission Context (Global State shared across the swarm):\n").concat(JSON.stringify(offer.missionContext || {}, null, 2), "\n\nTo use a tool, you MUST reply with a JSON object in this exact format, and nothing else:\n{ \"tool\": \"tool_name\", \"args\": { ... } }\n\nWhen you have completely solved the task, you MUST reply with a JSON object in this format:\n{ \"result\": \"your final detailed answer\" }\n\nIf you discovered facts that other agents in this mission need to know, you can update the global context:\n{ \"result\": \"your final detailed answer\", \"_contextUpdate\": { \"key\": \"value\" } }\n\nThink step by step, but ALWAYS ensure your entire response is a single valid JSON object representing either a tool call or the final result.");
                        history = [];
                        currentPrompt = "Begin execution.";
                        step = 0;
                        _loop_1 = function () {
                            var model, completion, responseText, action_1, toolResult, resultText, toolErr_1, error_1;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        step++;
                                        console.log("[McpWorkerAgent] \uD83D\uDD04 Step ".concat(step, "/").concat(this_1.maxSteps));
                                        _b.label = 1;
                                    case 1:
                                        _b.trys.push([1, 11, , 12]);
                                        return [4 /*yield*/, this_1.llm.modelSelector.selectModel({ taskComplexity: 'high' })];
                                    case 2:
                                        model = _b.sent();
                                        return [4 /*yield*/, this_1.llm.generateText(model.provider, model.modelId, systemPrompt, currentPrompt, { history: history })];
                                    case 3:
                                        completion = _b.sent();
                                        responseText = completion.content.trim();
                                        // Strip markdown code blocks if present
                                        if (responseText.startsWith('\`\`\`json') && responseText.endsWith('\`\`\`')) {
                                            responseText = responseText.substring(7, responseText.length - 3).trim();
                                        }
                                        else if (responseText.startsWith('\`\`\`') && responseText.endsWith('\`\`\`')) {
                                            responseText = responseText.substring(3, responseText.length - 3).trim();
                                        }
                                        try {
                                            action_1 = JSON.parse(responseText);
                                        }
                                        catch (e) {
                                            console.warn("[McpWorkerAgent] \u26A0\uFE0F Invalid JSON from LLM: ".concat(responseText));
                                            history.push({ role: "assistant", content: responseText });
                                            currentPrompt = "Your response MUST be a valid JSON object. Please fix your formatting and try again. E.g. { \"tool\": \"name\", \"args\": {} }";
                                            return [2 /*return*/, "continue"];
                                        }
                                        if (!action_1.result) return [3 /*break*/, 4];
                                        console.log("[McpWorkerAgent] \u2705 Task Complete.");
                                        return [2 /*return*/, { value: action_1 }];
                                    case 4:
                                        if (!action_1.tool) return [3 /*break*/, 9];
                                        console.log("[McpWorkerAgent] \uD83D\uDEE0\uFE0F Calling tool ".concat(action_1.tool, "..."));
                                        history.push({ role: "assistant", content: JSON.stringify(action_1) });
                                        // Verify tool is in the allowed list
                                        if (!availableTools.find(function (t) { return t.name === action_1.tool; })) {
                                            currentPrompt = "Tool '".concat(action_1.tool, "' is not available or not permitted for this task. Available tools: ").concat(availableTools.map(function (t) { return t.name; }).join(', '));
                                            return [2 /*return*/, "continue"];
                                        }
                                        _b.label = 5;
                                    case 5:
                                        _b.trys.push([5, 7, , 8]);
                                        return [4 /*yield*/, this_1.mcpServer.executeTool(action_1.tool, action_1.args)];
                                    case 6:
                                        toolResult = _b.sent();
                                        resultText = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult);
                                        // Truncate massive tool returns
                                        if (resultText.length > 8000) {
                                            resultText = resultText.substring(0, 8000) + "\n... [TRUNCATED]";
                                        }
                                        currentPrompt = "Tool returned:\n".concat(resultText);
                                        return [3 /*break*/, 8];
                                    case 7:
                                        toolErr_1 = _b.sent();
                                        console.error("[McpWorkerAgent] \u274C Tool execution failed: ".concat(toolErr_1.message));
                                        currentPrompt = "Tool execution failed: ".concat(toolErr_1.message);
                                        return [3 /*break*/, 8];
                                    case 8: return [3 /*break*/, 10];
                                    case 9:
                                        history.push({ role: "assistant", content: JSON.stringify(action_1) });
                                        currentPrompt = "Unrecognized JSON format. You must specify either 'tool' or 'result'.";
                                        _b.label = 10;
                                    case 10: return [3 /*break*/, 12];
                                    case 11:
                                        error_1 = _b.sent();
                                        console.error("[McpWorkerAgent] \uD83D\uDCA5 Fatal Loop Error:", error_1);
                                        throw error_1;
                                    case 12: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _a.label = 2;
                    case 2:
                        if (!(step < this.maxSteps)) return [3 /*break*/, 4];
                        return [5 /*yield**/, _loop_1()];
                    case 3:
                        state_1 = _a.sent();
                        if (typeof state_1 === "object")
                            return [2 /*return*/, state_1.value];
                        return [3 /*break*/, 2];
                    case 4: throw new Error("McpWorkerAgent exhausted max steps (".concat(this.maxSteps, ") without returning a final {\"result\": \"...\"}."));
                }
            });
        });
    };
    return McpWorkerAgent;
}(SpecializedAgent_js_1.SpecializedAgent));
exports.McpWorkerAgent = McpWorkerAgent;
