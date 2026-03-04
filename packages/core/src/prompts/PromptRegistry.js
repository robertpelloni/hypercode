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
exports.PromptRegistry = void 0;
var promises_1 = require("fs/promises");
var path_1 = require("path");
var PromptRegistry = /** @class */ (function () {
    function PromptRegistry(storageDir) {
        this.cache = new Map();
        this.storageDir = storageDir || path_1.default.join(process.cwd(), '.borg', 'prompts');
    }
    PromptRegistry.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, promises_1.default.mkdir(this.storageDir, { recursive: true })];
                    case 1:
                        _b.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        _a = _b.sent();
                        return [3 /*break*/, 3];
                    case 3: return [4 /*yield*/, this.loadAll()];
                    case 4:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PromptRegistry.prototype.loadAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            var files, _i, files_1, file, content, prompt_1, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, promises_1.default.readdir(this.storageDir)];
                    case 1:
                        files = _a.sent();
                        _i = 0, files_1 = files;
                        _a.label = 2;
                    case 2:
                        if (!(_i < files_1.length)) return [3 /*break*/, 5];
                        file = files_1[_i];
                        if (!file.endsWith('.json')) return [3 /*break*/, 4];
                        return [4 /*yield*/, promises_1.default.readFile(path_1.default.join(this.storageDir, file), 'utf-8')];
                    case 3:
                        content = _a.sent();
                        try {
                            prompt_1 = JSON.parse(content);
                            this.cache.set(prompt_1.id, prompt_1);
                        }
                        catch (e) {
                            console.error("[PromptRegistry] Failed to parse ".concat(file), e);
                        }
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        e_1 = _a.sent();
                        console.error("[PromptRegistry] Failed to load prompts", e_1);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    PromptRegistry.prototype.get = function (id) {
        return this.cache.get(id);
    };
    PromptRegistry.prototype.save = function (prompt) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        prompt.updatedAt = new Date().toISOString();
                        this.cache.set(prompt.id, prompt);
                        return [4 /*yield*/, promises_1.default.writeFile(path_1.default.join(this.storageDir, "".concat(prompt.id, ".json")), JSON.stringify(prompt, null, 2))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PromptRegistry.prototype.render = function (id, variables) {
        var prompt = this.get(id);
        if (!prompt)
            throw new Error("Prompt ".concat(id, " not found"));
        var text = prompt.template;
        for (var _i = 0, _a = Object.entries(variables); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            text = text.replace(new RegExp("{{".concat(key, "}}"), 'g'), value);
        }
        return text;
    };
    return PromptRegistry;
}());
exports.PromptRegistry = PromptRegistry;
