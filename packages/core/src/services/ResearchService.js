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
exports.ResearchService = void 0;
var duck_duck_scrape_1 = require("duck-duck-scrape");
function getFirstTextContent(value) {
    var _a;
    if (!value || typeof value !== 'object') {
        return '';
    }
    var envelope = value;
    var first = (_a = envelope.content) === null || _a === void 0 ? void 0 : _a[0];
    return typeof (first === null || first === void 0 ? void 0 : first.text) === 'string' ? first.text : '';
}
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return typeof error === 'string' ? error : String(error);
}
/**
 * Deep Research Service
 * Autonomously research a topic by searching, reading, and memorizing.
 */
var ResearchService = /** @class */ (function () {
    function ResearchService(server, memory) {
        this.visitedUrls = new Set();
        this.server = server;
        this.memory = memory;
    }
    /**
     * Conduct deep research on a topic
     * @param topic - The research query
     * @param depth - How many pages to read (default 3)
     */
    ResearchService.prototype.research = function (topic_1) {
        return __awaiter(this, arguments, void 0, function (topic, depth) {
            var report, searchResults, targets, _i, targets_1, target, result, contentText, ctxId, err_1, errorMessage, finalReport;
            if (depth === void 0) { depth = 3; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[Research] Starting deep dive on: \"".concat(topic, "\""));
                        report = [];
                        this.visitedUrls.clear();
                        return [4 /*yield*/, (0, duck_duck_scrape_1.search)(topic, {
                                safeSearch: duck_duck_scrape_1.SafeSearchType.MODERATE
                            })];
                    case 1:
                        searchResults = _a.sent();
                        targets = searchResults.results.slice(0, depth);
                        report.push("# Research Report: ".concat(topic));
                        report.push("Found ".concat(targets.length, " primary sources."));
                        _i = 0, targets_1 = targets;
                        _a.label = 2;
                    case 2:
                        if (!(_i < targets_1.length)) return [3 /*break*/, 9];
                        target = targets_1[_i];
                        if (this.visitedUrls.has(target.url))
                            return [3 /*break*/, 8];
                        this.visitedUrls.add(target.url);
                        this.broadcast('RESEARCH_UPDATE', {
                            status: 'reading',
                            target: target.title,
                            url: target.url,
                            progress: (this.visitedUrls.size / targets.length) * 100
                        });
                        console.log("[Research] Reading: ".concat(target.title));
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 7, , 8]);
                        // Navigate first
                        return [4 /*yield*/, this.server.executeTool("navigate", { url: target.url })];
                    case 4:
                        // Navigate first
                        _a.sent();
                        return [4 /*yield*/, this.server.executeTool("read_page", { url: target.url })];
                    case 5:
                        result = _a.sent();
                        contentText = getFirstTextContent(result);
                        if (contentText.startsWith("Error")) {
                            report.push("- [FAILED] ".concat(target.title, ": ").concat(contentText));
                            this.broadcast('RESEARCH_UPDATE', { status: 'error', target: target.title, error: contentText });
                            return [3 /*break*/, 8];
                        }
                        return [4 /*yield*/, this.memory.saveContext("RESEARCH TOPIC: ".concat(topic, "\nSOURCE: ").concat(target.url, "\n\n").concat(contentText), {
                                title: target.title,
                                source: target.url,
                                type: 'research'
                            })];
                    case 6:
                        ctxId = _a.sent();
                        report.push("- [MEMORIZED] ".concat(target.title, " (ID: ").concat(ctxId, ")"));
                        this.broadcast('RESEARCH_UPDATE', { status: 'memorized', target: target.title, id: ctxId });
                        return [3 /*break*/, 8];
                    case 7:
                        err_1 = _a.sent();
                        errorMessage = getErrorMessage(err_1);
                        console.error("[Research] Failed to process ".concat(target.url, ":"), err_1);
                        report.push("- [ERROR] ".concat(target.title, ": ").concat(errorMessage));
                        this.broadcast('RESEARCH_UPDATE', { status: 'error', target: target.title, error: errorMessage });
                        return [3 /*break*/, 8];
                    case 8:
                        _i++;
                        return [3 /*break*/, 2];
                    case 9:
                        finalReport = report.join('\n');
                        this.broadcast('RESEARCH_COMPLETE', { report: finalReport });
                        return [2 /*return*/, finalReport];
                }
            });
        });
    };
    /**
     * Directly ingest a specific URL
     */
    ResearchService.prototype.ingest = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var result, contentText, ctxId, e_1, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[Research] Ingesting: ".concat(url));
                        this.broadcast('RESEARCH_UPDATE', {
                            status: 'reading',
                            target: url,
                            url: url
                        });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, this.server.executeTool("navigate", { url: url })];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.server.executeTool("read_page", { url: url })];
                    case 3:
                        result = _a.sent();
                        contentText = getFirstTextContent(result);
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
                        ctxId = _a.sent();
                        this.broadcast('RESEARCH_UPDATE', { status: 'memorized', target: url, id: ctxId });
                        return [2 /*return*/, "MEMORIZED: ".concat(url, " (ID: ").concat(ctxId, ")")];
                    case 5:
                        e_1 = _a.sent();
                        errorMessage = getErrorMessage(e_1);
                        this.broadcast('RESEARCH_UPDATE', { status: 'error', target: url, error: errorMessage });
                        return [2 /*return*/, "ERROR: ".concat(errorMessage)];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    ResearchService.prototype.broadcast = function (type, payload) {
        if (this.server.wssInstance && this.server.wssInstance.clients) {
            this.server.wssInstance.clients.forEach(function (client) {
                if (client.readyState === 1) {
                    client.send(JSON.stringify({ type: type, payload: payload }));
                }
            });
        }
    };
    return ResearchService;
}());
exports.ResearchService = ResearchService;
