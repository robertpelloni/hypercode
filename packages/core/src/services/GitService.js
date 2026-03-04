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
exports.GitService = void 0;
var child_process_1 = require("child_process");
var util_1 = require("util");
var execAsync = (0, util_1.promisify)(child_process_1.exec);
function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
var GitService = /** @class */ (function () {
    function GitService(cwd) {
        this.cwd = cwd;
    }
    GitService.prototype.run = function (command) {
        return __awaiter(this, void 0, void 0, function () {
            var stdout;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, execAsync("git ".concat(command), { cwd: this.cwd })];
                    case 1:
                        stdout = (_a.sent()).stdout;
                        return [2 /*return*/, stdout.trim()];
                }
            });
        });
    };
    GitService.prototype.getLog = function () {
        return __awaiter(this, arguments, void 0, function (limit) {
            var out, e_1;
            if (limit === void 0) { limit = 20; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.run("log -n ".concat(limit, " --pretty=format:\"%H|%an|%aI|%s\""))];
                    case 1:
                        out = _a.sent();
                        return [2 /*return*/, out.split('\n').filter(Boolean).map(function (line) {
                                var _a = line.split('|'), hash = _a[0], author = _a[1], date = _a[2], message = _a[3];
                                return { hash: hash, author: author, date: date, message: message };
                            })];
                    case 2:
                        e_1 = _a.sent();
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    GitService.prototype.getStatus = function () {
        return __awaiter(this, void 0, void 0, function () {
            var branch, statusOut, modified_1, staged_1, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.run('rev-parse --abbrev-ref HEAD')];
                    case 1:
                        branch = _a.sent();
                        return [4 /*yield*/, this.run('status --porcelain')];
                    case 2:
                        statusOut = _a.sent();
                        modified_1 = [];
                        staged_1 = [];
                        statusOut.split('\n').filter(Boolean).forEach(function (line) {
                            var code = line.substring(0, 2);
                            var file = line.substring(3);
                            if (code.includes('M') || code.includes('?'))
                                modified_1.push(file);
                            if (code.includes('A') || code.includes('M') && code[0] !== ' ')
                                staged_1.push(file);
                        });
                        return [2 /*return*/, {
                                branch: branch,
                                clean: statusOut.length === 0,
                                modified: modified_1,
                                staged: staged_1
                            }];
                    case 3:
                        e_2 = _a.sent();
                        return [2 /*return*/, { branch: 'unknown', clean: false, modified: [], staged: [] }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    GitService.prototype.revert = function (hash) {
        return __awaiter(this, void 0, void 0, function () {
            var r, e_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.run("revert --no-edit ".concat(hash))];
                    case 1:
                        r = _a.sent();
                        return [2 /*return*/, r];
                    case 2:
                        e_3 = _a.sent();
                        throw new Error("Failed to revert: ".concat(getErrorMessage(e_3)));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    GitService.prototype.resetTo = function (hash_1) {
        return __awaiter(this, arguments, void 0, function (hash, mode) {
            var r, e_4;
            if (mode === void 0) { mode = 'soft'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.run("reset --".concat(mode, " ").concat(hash))];
                    case 1:
                        r = _a.sent();
                        return [2 /*return*/, r];
                    case 2:
                        e_4 = _a.sent();
                        throw new Error("Failed to reset: ".concat(getErrorMessage(e_4)));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return GitService;
}());
exports.GitService = GitService;
