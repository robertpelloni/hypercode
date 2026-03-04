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
exports.DeepResearchService = void 0;
/**
 * DeepResearchService
 *
 * The core research engine powering ResearcherAgent and the /research tRPC route.
 *
 * Pipeline:
 * 1. **Query Generation** — LLM generates 3 targeted search queries from the topic
 * 2. **Web Search** — WebSearchTool (DuckDuckGo via duck-duck-scrape) executes queries
 * 3. **Source Collection** — Top results are gathered with titles and URLs
 * 4. **LLM Synthesis** — A high-complexity model synthesizes findings into a structured report
 * 5. **Memory Storage** — Report is saved to MemoryManager for future context retrieval
 * 6. **Recursive Expansion** — Related topics are explored recursively (depth/breadth controlled)
 *
 * Dependencies:
 * - `LLMService` — for query generation and synthesis (uses ModelSelector for model choice)
 * - `MemoryManager` — for persisting research reports as retrievable context
 * - `WebSearchTool` — dynamically imported from `../tools/WebSearchTool.js`
 * - `MCPServer` (via DeepResearchServer) — for `ingest()` tool execution and WebSocket broadcasting
 *
 * Note: `SearchService` (local ripgrep) is accepted in constructor but intentionally unused.
 * Web search is handled by `WebSearchTool` which provides external internet access.
 */
var DeepResearchService = /** @class */ (function () {
    function DeepResearchService(server, llm, _search, memory) {
        this.server = server;
        this.llm = llm;
        // Note: SearchService is local ripgrep — not used for web research.
        // Web search is handled by dynamically importing WebSearchTool.
        this.memory = memory;
    }
    DeepResearchService.prototype.recursiveResearch = function (topic_1) {
        return __awaiter(this, arguments, void 0, function (topic, depth, maxBreadth) {
            var result, subTopics, nextDepth, branches, _i, branches_1, subTopic, subResult, e_1;
            if (depth === void 0) { depth = 2; }
            if (maxBreadth === void 0) { maxBreadth = 3; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[DeepResearch] \uD83D\uDD04 Recursive Research: ".concat(topic, " (Depth Remaining: ").concat(depth, ")"));
                        return [4 /*yield*/, this.researchTopic(topic, 2)];
                    case 1:
                        result = _a.sent();
                        if (depth <= 0) {
                            return [2 /*return*/, result];
                        }
                        subTopics = [];
                        nextDepth = depth - 1;
                        branches = result.relatedTopics.slice(0, maxBreadth);
                        _i = 0, branches_1 = branches;
                        _a.label = 2;
                    case 2:
                        if (!(_i < branches_1.length)) return [3 /*break*/, 7];
                        subTopic = branches_1[_i];
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, this.recursiveResearch(subTopic, nextDepth, maxBreadth)];
                    case 4:
                        subResult = _a.sent();
                        subTopics.push(subResult);
                        return [3 /*break*/, 6];
                    case 5:
                        e_1 = _a.sent();
                        console.error("[DeepResearch] Failed to research sub-topic: ".concat(subTopic), e_1);
                        return [3 /*break*/, 6];
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7: return [2 /*return*/, __assign(__assign({}, result), { subTopics: subTopics })];
                }
            });
        });
    };
    DeepResearchService.prototype.researchTopic = function (topic_1) {
        return __awaiter(this, arguments, void 0, function (topic, depth) {
            var queries, allUrls, sources, WebSearchTool, _i, _a, q, result, text, parsed, e_2, e_3, scrapedData, count, _b, sources_1, source, synthesis;
            if (depth === void 0) { depth = 2; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.log("[DeepResearch] Starting research on: ".concat(topic, " (Depth: ").concat(depth, ")"));
                        return [4 /*yield*/, this.generateQueries(topic)];
                    case 1:
                        queries = _c.sent();
                        console.log("[DeepResearch] Generated queries: ".concat(queries.join(', ')));
                        allUrls = new Set();
                        sources = [];
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 10, , 11]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('../tools/WebSearchTool.js'); })];
                    case 3:
                        WebSearchTool = (_c.sent()).WebSearchTool;
                        _i = 0, _a = queries.slice(0, 3);
                        _c.label = 4;
                    case 4:
                        if (!(_i < _a.length)) return [3 /*break*/, 9];
                        q = _a[_i];
                        _c.label = 5;
                    case 5:
                        _c.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, WebSearchTool.handler({ query: q })];
                    case 6:
                        result = _c.sent();
                        text = result.content[0].text;
                        parsed = [];
                        try {
                            parsed = JSON.parse(text);
                        }
                        catch (_d) {
                            parsed = [];
                        }
                        if (Array.isArray(parsed)) {
                            parsed.slice(0, 3).forEach(function (r) {
                                var entry = r;
                                if (entry.url) {
                                    allUrls.add(entry.url);
                                    sources.push({ title: entry.title || '', url: entry.url });
                                }
                            });
                        }
                        return [3 /*break*/, 8];
                    case 7:
                        e_2 = _c.sent();
                        console.error("Search failed for", q, e_2);
                        return [3 /*break*/, 8];
                    case 8:
                        _i++;
                        return [3 /*break*/, 4];
                    case 9: return [3 /*break*/, 11];
                    case 10:
                        e_3 = _c.sent();
                        console.error("Failed to load WebSearchTool", e_3);
                        return [3 /*break*/, 11];
                    case 11:
                        console.log("[DeepResearch] found ".concat(allUrls.size, " unique sources."));
                        scrapedData = [];
                        count = 0;
                        for (_b = 0, sources_1 = sources; _b < sources_1.length; _b++) {
                            source = sources_1[_b];
                            if (count >= 3)
                                break;
                            // Capture snippet if available (we assume title/url is good enough for now/summary)
                            scrapedData.push("Source: ".concat(source.title, " (").concat(source.url, ")\n(Content: [Pending scrape, utilizing snippet context])"));
                            count++;
                        }
                        if (scrapedData.length === 0) {
                            scrapedData.push("No sources found. Synthesizing from internal knowledge.");
                        }
                        return [4 /*yield*/, this.synthesize(topic, scrapedData.join('\n\n'))];
                    case 12:
                        synthesis = _c.sent();
                        // 5. Memorize
                        return [4 /*yield*/, this.memory.saveContext("Research Report: ".concat(topic, "\n\n").concat(synthesis.summary), {
                                source: 'DeepResearchService',
                                title: "Research: ".concat(topic),
                                type: 'research_report',
                                tags: __spreadArray(['research', topic], synthesis.relatedTopics, true)
                            })];
                    case 13:
                        // 5. Memorize
                        _c.sent();
                        return [2 /*return*/, synthesis];
                }
            });
        });
    };
    DeepResearchService.prototype.generateQueries = function (topic) {
        return __awaiter(this, void 0, void 0, function () {
            var prompt, model, response, e_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        prompt = "Generate 3 specific web search queries to deeply research the topic: \"".concat(topic, "\". Return only the queries, one per line.");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, this.llm.modelSelector.selectModel({ taskComplexity: 'low' })];
                    case 2:
                        model = _a.sent();
                        return [4 /*yield*/, this.llm.generateText(model.provider, model.modelId, "You are a research assistant.", prompt)];
                    case 3:
                        response = _a.sent();
                        return [2 /*return*/, response.content.split('\n').filter(function (l) { return l.trim().length > 0; })];
                    case 4:
                        e_4 = _a.sent();
                        return [2 /*return*/, [topic, "".concat(topic, " analysis"), "".concat(topic, " latest news")]];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    DeepResearchService.prototype.synthesize = function (topic, rawData) {
        return __awaiter(this, void 0, void 0, function () {
            var prompt, model, response, cleanJson, result, e_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        prompt = "\n            You are a Research Scholar.\n            Topic: ".concat(topic, "\n            \n            Raw Data:\n            ").concat(rawData.substring(0, 10000), "\n            \n            Task:\n            1. Summarize the key findings.\n            2. List the sources used.\n            3. Suggest 3 related topics for further research.\n            \n            Format as JSON:\n            {\n                \"topic\": \"").concat(topic, "\",\n                \"summary\": \"...\",\n                \"sources\": [ { \"title\": \"...\", \"url\": \"...\", \"keyPoints\": [] } ],\n                \"relatedTopics\": []\n            }\n        ");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, this.llm.modelSelector.selectModel({ taskComplexity: 'high' })];
                    case 2:
                        model = _a.sent();
                        return [4 /*yield*/, this.llm.generateText(model.provider, model.modelId, "You are a helpful research assistant. Output valid JSON only.", prompt)];
                    case 3:
                        response = _a.sent();
                        cleanJson = response.content.replace(/```json\n?|\n?```/g, '').trim();
                        result = JSON.parse(cleanJson);
                        // Ensure relatedTopics is present
                        if (!result.relatedTopics)
                            result.relatedTopics = [];
                        return [2 /*return*/, result];
                    case 4:
                        e_5 = _a.sent();
                        return [2 /*return*/, {
                                topic: topic,
                                summary: "Failed to synthesize JSON.",
                                sources: [],
                                relatedTopics: []
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // --- Ingestion & Broadcasting (Migrated from ResearchService) ---
    /**
     * Directly ingest a specific URL into memory
     */
    DeepResearchService.prototype.ingest = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var result, contentText, ctxId, e_6, message;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.log("[DeepResearch] Ingesting: ".concat(url));
                        this.broadcast('RESEARCH_UPDATE', {
                            status: 'reading',
                            target: url,
                            url: url
                        });
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, this.server.executeTool("navigate", { url: url })];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, this.server.executeTool("read_page", { url: url })];
                    case 3:
                        result = _c.sent();
                        contentText = ((_b = (_a = result.content) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.text) || "";
                        if (contentText.startsWith("Error")) {
                            this.broadcast('RESEARCH_UPDATE', { status: 'error', target: url, error: contentText });
                            return [2 /*return*/, "FAILED: ".concat(contentText)];
                        }
                        return [4 /*yield*/, this.memory.saveContext("INGESTED SOURCE: ".concat(url, "\n\n").concat(contentText), {
                                title: url,
                                source: url,
                                type: 'research'
                            })];
                    case 4:
                        ctxId = _c.sent();
                        this.broadcast('RESEARCH_UPDATE', { status: 'memorized', target: url, id: ctxId });
                        return [2 /*return*/, "MEMORIZED: ".concat(url, " (ID: ").concat(ctxId, ")")];
                    case 5:
                        e_6 = _c.sent();
                        message = e_6 instanceof Error ? e_6.message : String(e_6);
                        this.broadcast('RESEARCH_UPDATE', { status: 'error', target: url, error: message });
                        return [2 /*return*/, "ERROR: ".concat(message)];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    DeepResearchService.prototype.broadcast = function (type, payload) {
        if (this.server.wssInstance && this.server.wssInstance.clients) {
            this.server.wssInstance.clients.forEach(function (client) {
                if (client.readyState === 1) {
                    client.send(JSON.stringify({ type: type, payload: payload }));
                }
            });
        }
    };
    return DeepResearchService;
}());
exports.DeepResearchService = DeepResearchService;
