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
exports.SuggestionService = void 0;
var uuid_1 = require("uuid");
var ai_1 = require("@borg/ai");
var fs_1 = require("fs");
var path_1 = require("path");
/**
 * Reason: LLM provider responses can be either plain strings or object payloads.
 * What: Normalizes supported response variants into a single text string.
 * Why: Keeps suggestion parsing stable while removing broad response casts.
 */
function extractLlmText(response) {
    if (typeof response === 'string') {
        return response;
    }
    if (response && typeof response === 'object') {
        var typedResponse = response;
        if (typeof typedResponse.text === 'string') {
            return typedResponse.text;
        }
    }
    return '';
}
var SuggestionService = /** @class */ (function () {
    function SuggestionService(llmService, director) {
        this.suggestions = [];
        this.processingPaths = new Set(); // Prevent duplicate processing
        this.llmService = llmService || new ai_1.LLMService();
        this.director = director;
        this.persistencePath = path_1.default.join(process.cwd(), 'packages/core/data/suggestions.json');
        this.loadSuggestions();
    }
    SuggestionService.prototype.loadSuggestions = function () {
        try {
            if (fs_1.default.existsSync(this.persistencePath)) {
                var data = fs_1.default.readFileSync(this.persistencePath, 'utf-8');
                this.suggestions = JSON.parse(data);
                console.log("[SuggestionService] Loaded ".concat(this.suggestions.length, " suggestions."));
            }
        }
        catch (e) {
            console.error("[SuggestionService] Failed to load suggestions:", e);
        }
    };
    SuggestionService.prototype.saveSuggestions = function () {
        try {
            var dir = path_1.default.dirname(this.persistencePath);
            if (!fs_1.default.existsSync(dir))
                fs_1.default.mkdirSync(dir, { recursive: true });
            // Prune old resolved items to keep file small (keep last 50)
            var active = this.suggestions.filter(function (s) { return s.status === 'PENDING'; });
            var history_1 = this.suggestions.filter(function (s) { return s.status !== 'PENDING'; }).slice(-50);
            fs_1.default.writeFileSync(this.persistencePath, JSON.stringify(__spreadArray(__spreadArray([], active, true), history_1, true), null, 2));
        }
        catch (e) {
            console.error("[SuggestionService] Failed to save suggestions:", e);
        }
    };
    /**
     * Creates a new suggestion and adds it to the queue.
     */
    SuggestionService.prototype.addSuggestion = function (title, description, source, payload) {
        var suggestion = {
            id: (0, uuid_1.v4)(),
            title: title,
            description: description,
            type: 'ACTION',
            source: source,
            payload: payload,
            timestamp: Date.now(),
            status: 'PENDING'
        };
        this.suggestions.push(suggestion);
        this.saveSuggestions();
        console.log("[SuggestionService] New Suggestion: ".concat(title, " (").concat(source, ")"));
        // Conversational Nudge
        if (this.director) {
            // Fire and forget
            this.director.broadcast("\uD83D\uDCA1 **Suggestion**: I found a potential improvement: **\"".concat(title, "\"**.\n").concat(description, "\n*(Check Dashboard to Approve)*"));
        }
        return suggestion;
    };
    SuggestionService.prototype.getPendingSuggestions = function () {
        return this.suggestions.filter(function (s) { return s.status === 'PENDING'; }).sort(function (a, b) { return b.timestamp - a.timestamp; });
    };
    SuggestionService.prototype.clearAll = function () {
        this.suggestions = [];
        this.saveSuggestions();
    };
    SuggestionService.prototype.resolveSuggestion = function (id, status) {
        var index = this.suggestions.findIndex(function (s) { return s.id === id; });
        if (index !== -1) {
            this.suggestions[index].status = status;
            this.saveSuggestions(); // Save state change
            console.log("[SuggestionService] Suggestion ".concat(id, " ").concat(status));
            return this.suggestions[index];
        }
        return undefined;
    };
    /**
     * Analyzes context using LLM to generate intelligent suggestions.
     */
    SuggestionService.prototype.processContext = function (context) {
        return __awaiter(this, void 0, void 0, function () {
            var snippet, prompt_1, response, textContent, jsonStart, jsonEnd, result, e_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!context.path || this.processingPaths.has(context.path))
                            return [2 /*return*/];
                        // Cooldown/Debounce check
                        this.processingPaths.add(context.path);
                        setTimeout(function () { return _this.processingPaths.delete(context.path); }, 30000); // 30s cooldown per file
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        snippet = context.content ? context.content.slice(0, 2000) : "(Path: ".concat(context.path, ")");
                        prompt_1 = "\n            You are an AI Pair Programmer. The user is editing: ".concat(context.path, "\n            \n            Code Snippet (First 2kb):\n            ").concat(snippet, "\n            \n            Analyze this context. If you see a clear, actionable improvement (e.g., adding tests, fixing a security issue, refactoring complex code, or running a specific command), propose it.\n            \n            Return JSON ONLY:\n            {\n                \"found\": boolean,\n                \"title\": \"Short Title\",\n                \"description\": \"Why checking this is important\",\n                \"tool\": \"tool_name\",\n                \"args\": { ... }\n            }\n            \n            If nothing important triggers, return { \"found\": false }.\n            Do not suggest generic things like 'Add comments'. Only actionable, high-value tasks.\n            ");
                        return [4 /*yield*/, this.llmService.generateText('openai', 'gpt-4o', 'You are an expert pair programmer analyzing code context.', prompt_1)];
                    case 2:
                        response = _a.sent();
                        textContent = extractLlmText(response);
                        jsonStart = textContent.indexOf('{');
                        jsonEnd = textContent.lastIndexOf('}');
                        if (jsonStart !== -1 && jsonEnd !== -1) {
                            result = JSON.parse(textContent.slice(jsonStart, jsonEnd + 1));
                            if (result.found) {
                                this.addSuggestion(result.title, result.description, "AI Copilot", { tool: result.tool, args: result.args });
                            }
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        console.error("[SuggestionService] Analysis failed:", e_1);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return SuggestionService;
}());
exports.SuggestionService = SuggestionService;
