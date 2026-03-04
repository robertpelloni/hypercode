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
exports.GitWorktreeManager = void 0;
var exec_js_1 = require("../utils/exec.js");
var path_1 = require("path");
var fs_1 = require("fs");
var GitWorktreeManager = /** @class */ (function () {
    function GitWorktreeManager(rootDir) {
        this.rootDir = rootDir;
    }
    GitWorktreeManager.prototype.listWorktrees = function () {
        return __awaiter(this, void 0, void 0, function () {
            var stdout, worktrees, current;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, exec_js_1.execAsync)("git worktree list --porcelain", { cwd: this.rootDir })];
                    case 1:
                        stdout = (_a.sent()).stdout;
                        worktrees = [];
                        current = {};
                        stdout.split('\n').forEach(function (line) {
                            if (line.startsWith('worktree ')) {
                                if (current.path)
                                    worktrees.push(current);
                                current = { path: line.substring(9).trim() };
                            }
                            else if (line.startsWith('HEAD ')) {
                                current.head = line.substring(5).trim();
                            }
                            else if (line.startsWith('branch ')) {
                                current.branch = line.substring(7).trim();
                            }
                        });
                        if (current.path)
                            worktrees.push(current);
                        return [2 /*return*/, worktrees];
                }
            });
        });
    };
    GitWorktreeManager.prototype.addWorktree = function (branch, relativePath) {
        return __awaiter(this, void 0, void 0, function () {
            var fullPath, command, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fullPath = path_1.default.resolve(this.rootDir, relativePath);
                        // Ensure parent dir exists
                        fs_1.default.mkdirSync(path_1.default.dirname(fullPath), { recursive: true });
                        command = "git worktree add ".concat(fullPath, " ").concat(branch);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, exec_js_1.execAsync)("git show-ref --verify refs/heads/".concat(branch), { cwd: this.rootDir })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        // Branch doesn't exist, create it
                        command = "git worktree add -b ".concat(branch, " ").concat(fullPath);
                        return [3 /*break*/, 4];
                    case 4:
                        console.log("[GitWorktree] Adding worktree: ".concat(command));
                        return [4 /*yield*/, (0, exec_js_1.execAsync)(command, { cwd: this.rootDir })];
                    case 5:
                        _a.sent();
                        return [2 /*return*/, fullPath];
                }
            });
        });
    };
    GitWorktreeManager.prototype.removeWorktree = function (pathOrBranch_1) {
        return __awaiter(this, arguments, void 0, function (pathOrBranch, force) {
            var command;
            if (force === void 0) { force = false; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        command = "git worktree remove ".concat(pathOrBranch);
                        if (force)
                            command += " --force";
                        console.log("[GitWorktree] Removing worktree: ".concat(command));
                        return [4 /*yield*/, (0, exec_js_1.execAsync)(command, { cwd: this.rootDir })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    GitWorktreeManager.prototype.createTaskEnvironment = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var branchName, relativePath;
            return __generator(this, function (_a) {
                branchName = "task/".concat(taskId);
                relativePath = ".borg/worktrees/".concat(taskId);
                console.log("[GitWorktree] Creating task environment: ".concat(taskId, " at ").concat(relativePath));
                return [2 /*return*/, this.addWorktree(branchName, relativePath)];
            });
        });
    };
    GitWorktreeManager.prototype.cleanupTaskEnvironment = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var relativePath, fullPath;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        relativePath = ".borg/worktrees/".concat(taskId);
                        fullPath = path_1.default.resolve(this.rootDir, relativePath);
                        console.log("[GitWorktree] Cleaning up task environment: ".concat(taskId));
                        return [4 /*yield*/, this.removeWorktree(fullPath, true)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return GitWorktreeManager;
}());
exports.GitWorktreeManager = GitWorktreeManager;
