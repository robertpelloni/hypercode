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
exports.DarwinService = void 0;
/**
 * Reason: Darwin experiments consume outputs from multiple LLM calls that may vary in shape.
 * What: Collapses known response forms (`text`, `content`, raw string) into a stable string.
 * Why: Keeps mutation/judging logic deterministic while removing broad untyped cast usage.
 */
function extractLlmText(response) {
    if (typeof response === 'string') {
        return response;
    }
    if (response && typeof response === 'object') {
        var maybeResponse = response;
        if (typeof maybeResponse.text === 'string') {
            return maybeResponse.text;
        }
        if (typeof maybeResponse.content === 'string') {
            return maybeResponse.content;
        }
    }
    return String(response);
}
var DarwinService = /** @class */ (function () {
    function DarwinService(llm, server) {
        this.mutations = [];
        this.experiments = [];
        this.llm = llm;
        this.server = server;
    }
    DarwinService.prototype.proposeMutation = function (originalPrompt, goal) {
        return __awaiter(this, void 0, void 0, function () {
            var prompt, response, result, mutation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        prompt = "\n        You are The Evolutionary Engine.\n        Your goal is to mutate the following system prompt to better achieve: \"".concat(goal, "\".\n        Make it more concise, more strict, or more creative as needed.\n        \n        Original Prompt:\n        \"").concat(originalPrompt, "\"\n        \n        Return JSON:\n        {\n            \"mutatedPrompt\": \"The new prompt text\",\n            \"reasoning\": \"Why this might be better\"\n        }\n        ");
                        return [4 /*yield*/, this.llm.generateText("openai", "gpt-4o", "You are an expert prompt engineer. JSON only.", prompt, {})];
                    case 1:
                        response = _a.sent();
                        try {
                            result = JSON.parse(extractLlmText(response));
                        }
                        catch (e) {
                            throw new Error("Failed to parse mutation suggestion.");
                        }
                        mutation = {
                            id: Math.random().toString(36).substring(7),
                            originalPrompt: originalPrompt,
                            mutatedPrompt: result.mutatedPrompt,
                            reasoning: result.reasoning,
                            timestamp: Date.now()
                        };
                        this.mutations.push(mutation);
                        return [2 /*return*/, mutation];
                }
            });
        });
    };
    DarwinService.prototype.startExperiment = function (mutationId, task) {
        return __awaiter(this, void 0, void 0, function () {
            var mutation, experiment;
            return __generator(this, function (_a) {
                mutation = this.mutations.find(function (m) { return m.id === mutationId; });
                if (!mutation)
                    throw new Error("Mutation not found");
                experiment = {
                    id: Math.random().toString(36).substring(7),
                    mutationId: mutationId,
                    task: task,
                    status: 'PENDING'
                };
                this.experiments.push(experiment);
                // Asynchronously run the experiment
                this.runExperimentLogic(experiment, mutation).catch(console.error);
                return [2 /*return*/, experiment];
            });
        });
    };
    DarwinService.prototype.runExperimentLogic = function (experiment, mutation) {
        return __awaiter(this, void 0, void 0, function () {
            var resultA, resultB, judgePrompt, judgeRes, verdict;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        experiment.status = 'RUNNING';
                        // 1. Run Agent A (Control)
                        console.log("[Darwin] Running Control (A) for Exp ".concat(experiment.id, "..."));
                        return [4 /*yield*/, this.runAgentExecution(mutation.originalPrompt, experiment.task)];
                    case 1:
                        resultA = _a.sent();
                        experiment.resultA = resultA;
                        // 2. Run Agent B (Variant)
                        console.log("[Darwin] Running Variant (B) for Exp ".concat(experiment.id, "..."));
                        return [4 /*yield*/, this.runAgentExecution(mutation.mutatedPrompt, experiment.task)];
                    case 2:
                        resultB = _a.sent();
                        experiment.resultB = resultB;
                        // 3. Judge
                        console.log("[Darwin] Judging Exp ".concat(experiment.id, "..."));
                        judgePrompt = "\n        Compare two AI outputs for the task: \"".concat(experiment.task, "\".\n        \n        Output A (Control):\n        ").concat(resultA, "\n        \n        Output B (Variant):\n        ").concat(resultB, "\n        \n        Which is better? Return JSON:\n        {\n            \"winner\": \"A\" or \"B\" or \"TIE\",\n            \"reasoning\": \"Explanation\"\n        }\n        ");
                        return [4 /*yield*/, this.llm.generateText("openai", "gpt-4o", "", judgePrompt, {})];
                    case 3:
                        judgeRes = _a.sent();
                        try {
                            verdict = JSON.parse(extractLlmText(judgeRes));
                            experiment.winner = verdict.winner;
                            experiment.judgeReasoning = verdict.reasoning;
                        }
                        catch (e) {
                            experiment.winner = 'TIE';
                            experiment.judgeReasoning = "Failed to parse judge verdict.";
                        }
                        experiment.status = 'COMPLETED';
                        console.log("[Darwin] Experiment ".concat(experiment.id, " Complete. Winner: ").concat(experiment.winner));
                        return [2 /*return*/];
                }
            });
        });
    };
    DarwinService.prototype.runAgentExecution = function (sysPrompt, task) {
        return __awaiter(this, void 0, void 0, function () {
            var res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.llm.generateText("openai", "gpt-4o", sysPrompt, task, {})];
                    case 1:
                        res = _a.sent();
                        return [2 /*return*/, extractLlmText(res)];
                }
            });
        });
    };
    DarwinService.prototype.getStatus = function () {
        return {
            mutations: this.mutations,
            experiments: this.experiments
        };
    };
    return DarwinService;
}());
exports.DarwinService = DarwinService;
