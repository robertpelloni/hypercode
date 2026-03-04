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
exports.HealerService = void 0;
var path_1 = require("path");
var fs_1 = require("fs");
var events_1 = require("events");
/**
 * Reason: LLM providers in this codebase can return either `{ text }`, `{ content }`, or a raw string.
 * What: Normalizes heterogeneous provider responses into a single string extraction path.
 * Why: Avoids repeated unsafe casts and keeps JSON parsing behavior consistent across healer flows.
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
var HealerService = /** @class */ (function (_super) {
    __extends(HealerService, _super);
    function HealerService(llm, server) {
        var _this = _super.call(this) || this;
        _this.history = [];
        _this.llm = llm;
        _this.server = server;
        return _this;
    }
    HealerService.prototype.getHistory = function () {
        return this.history;
    };
    HealerService.prototype.autoHeal = function (errorLog) {
        return __awaiter(this, void 0, void 0, function () {
            var diagnosis, filePath, currentContent, prompt, response, newContent;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[HealerService] 🚑 Auto-healing initialized...");
                        return [4 /*yield*/, this.analyzeError(errorLog)];
                    case 1:
                        diagnosis = _a.sent();
                        console.log("[HealerService] 🔍 Diagnosis:", diagnosis);
                        if (!diagnosis.file || !diagnosis.suggestedFix) {
                            console.log("[HealerService] 🤷 Could not identify file or fix.");
                            return [2 /*return*/, { success: false }];
                        }
                        filePath = path_1.default.isAbsolute(diagnosis.file)
                            ? diagnosis.file
                            : path_1.default.join(process.cwd(), diagnosis.file);
                        if (!fs_1.default.existsSync(filePath)) {
                            console.log("[HealerService] \u274C File not found: ".concat(filePath));
                            return [2 /*return*/, { success: false }];
                        }
                        return [4 /*yield*/, fs_1.default.readFileSync(filePath, 'utf-8')];
                    case 2:
                        currentContent = _a.sent();
                        prompt = "\n        You are an Expert Linter and Fixer.\n        Original File Content:\n        ```typescript\n        ".concat(currentContent, "\n        ```\n\n        Diagnosis: ").concat(diagnosis.description, "\n        Suggested Fix: ").concat(diagnosis.suggestedFix, "\n\n        Output the COMPLETE, CORRECTED file content. Do not include markdown fences.\n        ");
                        return [4 /*yield*/, this.llm.generateText('anthropic', 'claude-3-5-sonnet-latest', 'You are a code fixer.', prompt)];
                    case 3:
                        response = _a.sent();
                        newContent = response.content.replace(/```typescript|```/g, '').trim();
                        // 4. Write
                        return [4 /*yield*/, fs_1.default.writeFileSync(filePath, newContent)];
                    case 4:
                        // 4. Write
                        _a.sent();
                        console.log("[HealerService] \uD83D\uDC89 Fix applied to ".concat(filePath));
                        return [2 /*return*/, { success: true, file: filePath, fix: diagnosis.suggestedFix }];
                }
            });
        });
    };
    HealerService.prototype.analyzeError = function (error, context) {
        return __awaiter(this, void 0, void 0, function () {
            var errorStr, prompt, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        errorStr = typeof error === 'string' ? error : error.message + '\n' + error.stack;
                        prompt = "\n        You are The Healer, an expert debugging agent.\n        Analyze the following error and context.\n        Provide a diagnosis and a suggested fix.\n        \n        Error:\n        ".concat(errorStr, "\n        \n        Context:\n        ").concat(context || 'No additional context.', "\n        \n        Return JSON format:\n        {\n            \"errorType\": \"SyntaxError|RuntimeError|LogicError|...\",\n            \"description\": \"Short explanation\",\n            \"file\": \"path/to/culprit.ts (if known)\",\n            \"line\": 123 (if known),\n            \"suggestedFix\": \"Code snippet or description of fix\",\n            \"confidence\": 0.0 to 1.0\n        }\n        ");
                        return [4 /*yield*/, this.llm.generateText("openai", "gpt-4o", "You are a JSON-only debugging tool.", prompt, {})];
                    case 1:
                        response = _a.sent();
                        try {
                            return [2 /*return*/, JSON.parse(extractLlmText(response))];
                        }
                        catch (e) {
                            console.error("Failed to parse Healer diagnosis", response);
                            return [2 /*return*/, {
                                    errorType: "Unknown",
                                    description: "Failed to parse LLM diagnosis",
                                    suggestedFix: "Manual review required",
                                    confidence: 0
                                }];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    HealerService.prototype.generateFix = function (diagnosis) {
        return __awaiter(this, void 0, void 0, function () {
            var fs, content, e_1, prompt, response, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!diagnosis.file) {
                            throw new Error("Cannot generate fix without file path.");
                        }
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('fs/promises'); })];
                    case 1:
                        fs = _a.sent();
                        content = '';
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, fs.readFile(diagnosis.file, 'utf-8')];
                    case 3:
                        content = _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_1 = _a.sent();
                        throw new Error("Failed to read file: ".concat(diagnosis.file));
                    case 5:
                        prompt = "\n        You are The Healer.\n        Generate a fix for the following file based on the diagnosis.\n        \n        Diagnosis: ".concat(diagnosis.description, "\n        Suggested Fix: ").concat(diagnosis.suggestedFix, "\n        \n        File Content:\n        ").concat(content, "\n        \n        Return JSON format:\n        {\n            \"explanation\": \"Why this fix works\",\n            \"newContent\": \"The entire new file content\"\n        }\n        ");
                        return [4 /*yield*/, this.llm.generateText("openai", "gpt-4o", "You are a code repair agent. Return only JSON with 'explanation' and 'newContent'.", prompt, {})];
                    case 6:
                        response = _a.sent();
                        try {
                            result = JSON.parse(extractLlmText(response));
                            return [2 /*return*/, {
                                    id: Math.random().toString(36).substring(7),
                                    diagnosis: diagnosis,
                                    filesToModify: [{ path: diagnosis.file, content: result.newContent }],
                                    explanation: result.explanation
                                }];
                        }
                        catch (e) {
                            console.error("Failed to parse fix plan", response);
                            throw new Error("Failed to generate valid fix plan.");
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    HealerService.prototype.applyFix = function (plan) {
        return __awaiter(this, void 0, void 0, function () {
            var fs, _i, _a, file, e_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('fs/promises'); })];
                    case 1:
                        fs = _b.sent();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 7, , 8]);
                        _i = 0, _a = plan.filesToModify;
                        _b.label = 3;
                    case 3:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        file = _a[_i];
                        return [4 /*yield*/, fs.writeFile(file.path, file.content, 'utf-8')];
                    case 4:
                        _b.sent();
                        _b.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6: return [2 /*return*/, true];
                    case 7:
                        e_2 = _b.sent();
                        console.error("Failed to apply fix", e_2);
                        return [2 /*return*/, false];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    HealerService.prototype.heal = function (error, context) {
        return __awaiter(this, void 0, void 0, function () {
            var diagnosis, plan, success, historyItem, e_3, historyItem;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("🚑 Healer Activated...");
                        return [4 /*yield*/, this.analyzeError(error, context)];
                    case 1:
                        diagnosis = _a.sent();
                        console.log("📋 Diagnosis:", diagnosis);
                        if (diagnosis.confidence < 0.8) {
                            console.warn("⚠️ Confidence too low for auto-heal.");
                            return [2 /*return*/, false];
                        }
                        if (!diagnosis.file) {
                            console.warn("⚠️ No file identified to fix.");
                            return [2 /*return*/, false];
                        }
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 5, , 6]);
                        return [4 /*yield*/, this.generateFix(diagnosis)];
                    case 3:
                        plan = _a.sent();
                        console.log("🛠️ Fix Generated:", plan.explanation);
                        return [4 /*yield*/, this.applyFix(plan)];
                    case 4:
                        success = _a.sent();
                        historyItem = {
                            timestamp: Date.now(),
                            error: typeof error === 'string' ? error : error.message,
                            fix: plan,
                            success: success
                        };
                        this.history.push(historyItem);
                        this.emit('heal', historyItem);
                        return [2 /*return*/, success];
                    case 5:
                        e_3 = _a.sent();
                        console.error("❌ Healer Failed:", e_3);
                        historyItem = {
                            timestamp: Date.now(),
                            error: typeof error === 'string' ? error : error.message,
                            fix: { id: 'failed', diagnosis: diagnosis, filesToModify: [], explanation: 'Fix generation failed' },
                            success: false
                        };
                        this.history.push(historyItem);
                        this.emit('heal', historyItem);
                        return [2 /*return*/, false];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return HealerService;
}(events_1.EventEmitter));
exports.HealerService = HealerService;
