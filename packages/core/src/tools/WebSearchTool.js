"use strict";
/**
 * WebSearchTool
 *
 * Provides public web search capabilities via DuckDuckGo (duck-duck-scrape).
 * Used by DeepResearchService for external information gathering.
 *
 * Features:
 * - Exponential backoff retry on DDG rate-limiting ("anomaly detected")
 * - Configurable result limit (default: 5)
 * - Returns structured results with title, url, and snippet
 *
 * Rate-Limit Handling:
 * DDG aggressively rate-limits rapid requests. This tool implements retry
 * with exponential backoff (2s → 4s → 8s) to handle burst scenarios
 * like DeepResearchService's recursive topic exploration.
 */
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
exports.WebSearchTool = void 0;
var duck_duck_scrape_1 = require("duck-duck-scrape");
/** Maximum number of retry attempts on rate-limit errors */
var MAX_RETRIES = 3;
/** Base delay in ms for exponential backoff (doubles each retry) */
var BASE_DELAY_MS = 2000;
/**
 * Helper to extract error messages from unknown error types.
 * Avoids unsafe `any` casts while still providing useful error strings.
 */
function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
/**
 * Checks if an error is a DuckDuckGo rate-limit error.
 * DDG returns "DDG detected an anomaly" when too many requests are made.
 */
function isRateLimitError(error) {
    var msg = getErrorMessage(error);
    return msg.includes('anomaly') || msg.includes('too quickly');
}
/**
 * Sleep utility for backoff delays.
 */
function sleep(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
exports.WebSearchTool = {
    name: "search_web",
    description: "Search the public web using DuckDuckGo. Returns top results with titles, links, and snippets.",
    inputSchema: {
        type: "object",
        properties: {
            query: { type: "string", description: "The search query" },
            limit: { type: "number", description: "Max results (default: 5)" }
        },
        required: ["query"]
    },
    /**
     * Executes a web search with automatic retry on rate-limiting.
     *
     * @param args.query - The search query string
     * @param args.limit - Maximum number of results to return (default: 5)
     * @returns MCP-formatted content array with JSON search results
     */
    handler: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        var limit, attempt, results, top_1, error_1, delay;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    limit = args.limit || 5;
                    attempt = 0;
                    _a.label = 1;
                case 1:
                    if (!(attempt <= MAX_RETRIES)) return [3 /*break*/, 8];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 7]);
                    console.log("[WebSearch] Searching for: ".concat(args.query).concat(attempt > 0 ? " (retry ".concat(attempt, "/").concat(MAX_RETRIES, ")") : ''));
                    return [4 /*yield*/, (0, duck_duck_scrape_1.search)(args.query, {
                            safeSearch: duck_duck_scrape_1.SafeSearchType.MODERATE,
                            time: duck_duck_scrape_1.SearchTimeType.ALL,
                        })];
                case 3:
                    results = _a.sent();
                    top_1 = results.results.slice(0, limit).map(function (r) { return ({
                        title: r.title,
                        url: r.url,
                        snippet: r.description
                    }); });
                    return [2 /*return*/, {
                            content: [{
                                    type: "text",
                                    text: JSON.stringify(top_1, null, 2)
                                }]
                        }];
                case 4:
                    error_1 = _a.sent();
                    if (!(isRateLimitError(error_1) && attempt < MAX_RETRIES)) return [3 /*break*/, 6];
                    delay = BASE_DELAY_MS * Math.pow(2, attempt);
                    console.warn("[WebSearch] Rate-limited. Backing off ".concat(delay, "ms before retry ").concat(attempt + 1, "/").concat(MAX_RETRIES, "..."));
                    return [4 /*yield*/, sleep(delay)];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 6:
                    // Non-retryable error or exhausted retries
                    console.error("[WebSearch] Error:", error_1);
                    return [2 /*return*/, {
                            content: [{
                                    type: "text",
                                    text: "Error performing search: ".concat(getErrorMessage(error_1))
                                }]
                        }];
                case 7:
                    attempt++;
                    return [3 /*break*/, 1];
                case 8: 
                // Should never reach here, but TypeScript needs it
                return [2 /*return*/, {
                        content: [{
                                type: "text",
                                text: "Error: search exhausted all retries"
                            }]
                    }];
            }
        });
    }); }
};
