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
exports.CoderAgent = void 0;
var SpecializedAgent_js_1 = require("../mesh/SpecializedAgent.js");
var promises_1 = require("fs/promises");
var path_1 = require("path");
/**
 * CoderAgent
 * A specialized agent responsible for writing and modifying code.
 *
 * Capabilities:
 * - Integrates with `LLMService` to generate code based on tasks.
 * - Parses structured JSON output from the LLM to determine filenames and content.
 * - Writes directly to the filesystem (Phase 62 Ignition Level Capability).
 */
var CoderAgent = /** @class */ (function (_super) {
    __extends(CoderAgent, _super);
    function CoderAgent(llm) {
        var _this = _super.call(this, 'Coder', ['coding', 'refactoring', 'debugging']) || this;
        _this.llm = llm;
        return _this;
    }
    /**
     * Handles a coding task.
     * 1. Constructs a prompt for the LLM.
     * 2. Calls LLM via ModelSelector (High Complexity).
     * 3. Parses the response for a file write plan.
     * 4. Executes the file write operation.
     * 5. Returns a structured result with file changes and reasoning.
     */
    CoderAgent.prototype.handleTask = function (offer) {
        return __awaiter(this, void 0, void 0, function () {
            var prompt, model, completion, response, plan, match, workspaceRoot, targetPath, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[CoderAgent] \uD83E\uDDE0 Analyzing task: \"".concat(offer.task, "\""));
                        prompt = "You are a Coder Agent in the Borg Collective.\nTask: ".concat(offer.task, "\n\nReturn JSON with:\n{\n  \"filename\": \"string\",\n  \"content\": \"string\",\n  \"reasoning\": \"string\"\n}\nOutput ONLY valid JSON.");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, this.llm.modelSelector.selectModel({ taskComplexity: 'high' })];
                    case 2:
                        model = _a.sent();
                        return [4 /*yield*/, this.llm.generateText(model.provider, model.modelId, 'You are an expert software engineer.', prompt)];
                    case 3:
                        completion = _a.sent();
                        response = completion.content;
                        plan = void 0;
                        try {
                            plan = JSON.parse(response);
                        }
                        catch (e) {
                            match = response.match(/```json\n([\s\S]*?)\n```/);
                            if (match) {
                                plan = JSON.parse(match[1]);
                            }
                            else {
                                throw new Error("Failed to parse LLM JSON response");
                            }
                        }
                        console.log("[CoderAgent] \uD83D\uDCA1 Generated Plan: Write ".concat(plan.filename));
                        workspaceRoot = process.cwd();
                        targetPath = path_1.default.resolve(workspaceRoot, plan.filename);
                        return [4 /*yield*/, promises_1.default.writeFile(targetPath, plan.content, 'utf-8')];
                    case 4:
                        _a.sent();
                        console.log("[CoderAgent] \uD83D\uDCBE Wrote to ".concat(targetPath));
                        return [2 /*return*/, {
                                status: 'completed',
                                filesChanged: [plan.filename],
                                reasoning: plan.reasoning
                            }];
                    case 5:
                        error_1 = _a.sent();
                        console.error("[CoderAgent] \uD83D\uDCA5 Error:", error_1);
                        throw error_1;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return CoderAgent;
}(SpecializedAgent_js_1.SpecializedAgent));
exports.CoderAgent = CoderAgent;
