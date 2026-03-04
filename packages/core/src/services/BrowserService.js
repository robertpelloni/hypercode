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
exports.BrowserService = void 0;
var puppeteer_1 = require("puppeteer");
var turndown_1 = require("turndown");
var BrowserService = /** @class */ (function () {
    function BrowserService() {
        this.browser = null;
        this.pages = new Map();
        this.turndownService = new turndown_1.default();
    }
    BrowserService.prototype.launch = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (this.browser)
                            return [2 /*return*/];
                        console.log("[BrowserService] Launching Puppeteer...");
                        _a = this;
                        return [4 /*yield*/, puppeteer_1.default.launch({
                                headless: true,
                                args: ['--no-sandbox', '--disable-setuid-sandbox']
                            })];
                    case 1:
                        _a.browser = _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    BrowserService.prototype.getStatus = function () {
        return {
            active: this.browser !== null,
            pageCount: this.pages.size,
            pageIds: Array.from(this.pages.keys()),
        };
    };
    BrowserService.prototype.navigate = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var page, id, title, html, bodyContent, content;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.browser) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.launch()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [4 /*yield*/, this.browser.newPage()];
                    case 3:
                        page = _a.sent();
                        // Block heavy resources
                        return [4 /*yield*/, page.setRequestInterception(true)];
                    case 4:
                        // Block heavy resources
                        _a.sent();
                        page.on('request', function (req) {
                            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                                req.abort();
                            }
                            else {
                                req.continue();
                            }
                        });
                        console.log("[BrowserService] Navigating to ".concat(url, "..."));
                        return [4 /*yield*/, page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })];
                    case 5:
                        _a.sent();
                        id = Math.random().toString(36).substring(7);
                        this.pages.set(id, page);
                        return [4 /*yield*/, page.title()];
                    case 6:
                        title = _a.sent();
                        return [4 /*yield*/, page.content()];
                    case 7:
                        html = _a.sent();
                        return [4 /*yield*/, page.evaluate(function () { return document.body.innerHTML; })];
                    case 8:
                        bodyContent = _a.sent();
                        content = this.turndownService.turndown(bodyContent).substring(0, 10000);
                        return [2 /*return*/, { id: id, title: title, content: content }];
                }
            });
        });
    };
    BrowserService.prototype.click = function (pageId, selector) {
        return __awaiter(this, void 0, void 0, function () {
            var page;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        page = this.pages.get(pageId);
                        if (!page)
                            throw new Error("Page ".concat(pageId, " not found"));
                        return [4 /*yield*/, page.click(selector)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    BrowserService.prototype.type = function (pageId, selector, text) {
        return __awaiter(this, void 0, void 0, function () {
            var page;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        page = this.pages.get(pageId);
                        if (!page)
                            throw new Error("Page ".concat(pageId, " not found"));
                        return [4 /*yield*/, page.type(selector, text)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    BrowserService.prototype.screenshot = function (pageId) {
        return __awaiter(this, void 0, void 0, function () {
            var page, buffer;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        page = this.pages.get(pageId);
                        if (!page)
                            throw new Error("Page ".concat(pageId, " not found"));
                        return [4 /*yield*/, page.screenshot({ encoding: 'base64' })];
                    case 1:
                        buffer = _a.sent();
                        return [2 /*return*/, buffer];
                }
            });
        });
    };
    BrowserService.prototype.extract = function (pageId) {
        return __awaiter(this, void 0, void 0, function () {
            var page, bodyContent;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        page = this.pages.get(pageId);
                        if (!page)
                            throw new Error("Page ".concat(pageId, " not found"));
                        return [4 /*yield*/, page.evaluate(function () { return document.body.innerHTML; })];
                    case 1:
                        bodyContent = _a.sent();
                        return [2 /*return*/, this.turndownService.turndown(bodyContent)];
                }
            });
        });
    };
    BrowserService.prototype.getContent = function (pageId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.extract(pageId)];
            });
        });
    };
    BrowserService.prototype.close = function (pageId) {
        return __awaiter(this, void 0, void 0, function () {
            var page;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        page = this.pages.get(pageId);
                        if (!page) return [3 /*break*/, 2];
                        return [4 /*yield*/, page.close()];
                    case 1:
                        _a.sent();
                        this.pages.delete(pageId);
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    BrowserService.prototype.closeAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.browser) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.browser.close()];
                    case 1:
                        _a.sent();
                        this.browser = null;
                        this.pages.clear();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    return BrowserService;
}());
exports.BrowserService = BrowserService;
