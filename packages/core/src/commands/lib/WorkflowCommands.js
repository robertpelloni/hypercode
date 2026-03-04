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
exports.FixCommand = exports.StashCommand = exports.DiffCommand = exports.UndoCommand = void 0;
var child_process_1 = require("child_process");
var util_1 = require("util");
var execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * /undo - Undo last commit or changes
 */
var UndoCommand = /** @class */ (function () {
    function UndoCommand() {
        this.name = "undo";
        this.description = "Undo operations. Usage: /undo <commit|changes|staged> [file]";
    }
    UndoCommand.prototype.execute = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var subcommand, target, output, _a, undoOut, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        subcommand = args[0] || 'help';
                        target = args.slice(1).join(' ');
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 16, , 17]);
                        output = '';
                        _a = subcommand;
                        switch (_a) {
                            case 'commit': return [3 /*break*/, 2];
                            case 'changes': return [3 /*break*/, 4];
                            case 'staged': return [3 /*break*/, 9];
                        }
                        return [3 /*break*/, 14];
                    case 2: return [4 /*yield*/, execAsync('git reset --soft HEAD~1', { cwd: process.cwd() })];
                    case 3:
                        undoOut = (_b.sent()).stdout;
                        output = "\u21A9\uFE0F **Undo Last Commit**\nCommit undone (changes preserved in staging)\n".concat(undoOut);
                        return [3 /*break*/, 15];
                    case 4:
                        if (!target) return [3 /*break*/, 6];
                        return [4 /*yield*/, execAsync("git checkout -- \"".concat(target, "\""), { cwd: process.cwd() })];
                    case 5:
                        _b.sent();
                        output = "\u21A9\uFE0F **Undo Changes**: ".concat(target, "\nUnstaged changes discarded.");
                        return [3 /*break*/, 8];
                    case 6: return [4 /*yield*/, execAsync('git checkout -- .', { cwd: process.cwd() })];
                    case 7:
                        _b.sent();
                        output = "\u21A9\uFE0F **Undo All Changes**\nAll unstaged changes discarded.";
                        _b.label = 8;
                    case 8: return [3 /*break*/, 15];
                    case 9:
                        if (!target) return [3 /*break*/, 11];
                        return [4 /*yield*/, execAsync("git reset HEAD \"".concat(target, "\""), { cwd: process.cwd() })];
                    case 10:
                        _b.sent();
                        output = "\u21A9\uFE0F **Unstaged**: ".concat(target);
                        return [3 /*break*/, 13];
                    case 11: return [4 /*yield*/, execAsync('git reset HEAD', { cwd: process.cwd() })];
                    case 12:
                        _b.sent();
                        output = "\u21A9\uFE0F **Unstaged All Files**";
                        _b.label = 13;
                    case 13: return [3 /*break*/, 15];
                    case 14:
                        output = "**Usage**: /undo <commit|changes|staged> [file]\n- **commit**: Undo last commit (soft reset)\n- **changes [file]**: Discard unstaged changes\n- **staged [file]**: Unstage files";
                        _b.label = 15;
                    case 15: return [2 /*return*/, { handled: true, output: output }];
                    case 16:
                        error_1 = _b.sent();
                        return [2 /*return*/, {
                                handled: true,
                                output: "\u274C Undo Error:\n```\n".concat(error_1.message, "\n```")
                            }];
                    case 17: return [2 /*return*/];
                }
            });
        });
    };
    return UndoCommand;
}());
exports.UndoCommand = UndoCommand;
/**
 * /diff - Show diff with formatting
 */
var DiffCommand = /** @class */ (function () {
    function DiffCommand() {
        this.name = "diff";
        this.description = "Show diff. Usage: /diff [staged|file] [path]";
    }
    DiffCommand.prototype.execute = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var command, label, stdout, maxLen, truncated, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        command = 'git diff';
                        label = 'Working Directory';
                        if (args[0] === 'staged') {
                            command = 'git diff --cached';
                            label = 'Staged Changes';
                        }
                        else if (args[0]) {
                            command = "git diff -- \"".concat(args.join(' '), "\"");
                            label = args.join(' ');
                        }
                        return [4 /*yield*/, execAsync(command, { cwd: process.cwd() })];
                    case 1:
                        stdout = (_a.sent()).stdout;
                        if (!stdout.trim()) {
                            return [2 /*return*/, { handled: true, output: "\uD83D\uDCCB **Diff: ".concat(label, "**\nNo changes detected.") }];
                        }
                        maxLen = 3000;
                        truncated = stdout.length > maxLen
                            ? stdout.substring(0, maxLen) + '\n... (truncated)'
                            : stdout;
                        return [2 /*return*/, {
                                handled: true,
                                output: "\uD83D\uDCCB **Diff: ".concat(label, "**\n```diff\n").concat(truncated, "\n```")
                            }];
                    case 2:
                        error_2 = _a.sent();
                        return [2 /*return*/, {
                                handled: true,
                                output: "\u274C Diff Error:\n```\n".concat(error_2.message, "\n```")
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return DiffCommand;
}());
exports.DiffCommand = DiffCommand;
/**
 * /stash - Quick stash operations
 */
var StashCommand = /** @class */ (function () {
    function StashCommand() {
        this.name = "stash";
        this.description = "Stash operations. Usage: /stash [push|pop|list|show]";
    }
    StashCommand.prototype.execute = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var subcommand, message, output, _a, pushCmd, pushOut, popOut, listOut, showOut, truncated, error_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        subcommand = args[0] || 'push';
                        message = args.slice(1).join(' ');
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 12, , 13]);
                        output = '';
                        _a = subcommand;
                        switch (_a) {
                            case 'push': return [3 /*break*/, 2];
                            case 'pop': return [3 /*break*/, 4];
                            case 'list': return [3 /*break*/, 6];
                            case 'show': return [3 /*break*/, 8];
                        }
                        return [3 /*break*/, 10];
                    case 2:
                        pushCmd = message ? "git stash push -m \"".concat(message, "\"") : 'git stash push';
                        return [4 /*yield*/, execAsync(pushCmd, { cwd: process.cwd() })];
                    case 3:
                        pushOut = (_b.sent()).stdout;
                        output = "\uD83D\uDCE6 **Stash Push**\n".concat(pushOut || 'Changes stashed.');
                        return [3 /*break*/, 11];
                    case 4: return [4 /*yield*/, execAsync('git stash pop', { cwd: process.cwd() })];
                    case 5:
                        popOut = (_b.sent()).stdout;
                        output = "\uD83D\uDCE4 **Stash Pop**\n".concat(popOut || 'Stash applied and dropped.');
                        return [3 /*break*/, 11];
                    case 6: return [4 /*yield*/, execAsync('git stash list', { cwd: process.cwd() })];
                    case 7:
                        listOut = (_b.sent()).stdout;
                        output = "\uD83D\uDCCB **Stash List**\n```\n".concat(listOut || '(empty)', "\n```");
                        return [3 /*break*/, 11];
                    case 8: return [4 /*yield*/, execAsync('git stash show -p', { cwd: process.cwd() })];
                    case 9:
                        showOut = (_b.sent()).stdout;
                        truncated = showOut.length > 2000
                            ? showOut.substring(0, 2000) + '\n... (truncated)'
                            : showOut;
                        output = "\uD83D\uDCCB **Stash Show**\n```diff\n".concat(truncated || '(empty)', "\n```");
                        return [3 /*break*/, 11];
                    case 10:
                        output = "**Usage**: /stash <push|pop|list|show> [message]";
                        _b.label = 11;
                    case 11: return [2 /*return*/, { handled: true, output: output }];
                    case 12:
                        error_3 = _b.sent();
                        return [2 /*return*/, {
                                handled: true,
                                output: "\u274C Stash Error:\n```\n".concat(error_3.message, "\n```")
                            }];
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    return StashCommand;
}());
exports.StashCommand = StashCommand;
var FixCommand = /** @class */ (function () {
    function FixCommand(autoDevGetter) {
        this.autoDevGetter = autoDevGetter;
        this.name = "fix";
        this.description = "Start Auto-Dev Loop. Usage: /fix <test|lint|build|status|cancel> [target]";
    }
    FixCommand.prototype.execute = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var autoDev, subcommand, target, id, loops, output, _i, loops_1, loop, id, success;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        autoDev = this.autoDevGetter();
                        if (!autoDev)
                            return [2 /*return*/, { handled: true, output: "❌ AutoDevService not initialized." }];
                        subcommand = args[0];
                        target = args.slice(1).join(' ');
                        if (!['test', 'lint', 'build'].includes(subcommand)) return [3 /*break*/, 2];
                        return [4 /*yield*/, autoDev.startLoop({
                                type: subcommand,
                                maxAttempts: 5,
                                target: target || undefined
                            })];
                    case 1:
                        id = _a.sent();
                        return [2 /*return*/, { handled: true, output: "\uD83D\uDD04 **Auto-Dev Loop Started**\nID: `".concat(id, "`\nType: ").concat(subcommand, "\nTarget: ").concat(target || 'All', "\n\nRunning in background... Check status with `/fix status`.") }];
                    case 2:
                        if (subcommand === 'status') {
                            loops = autoDev.getLoops();
                            if (loops.length === 0)
                                return [2 /*return*/, { handled: true, output: "✅ No active auto-dev loops." }];
                            output = "🔄 **Active Loops**\n\n";
                            for (_i = 0, loops_1 = loops; _i < loops_1.length; _i++) {
                                loop = loops_1[_i];
                                output += "- **".concat(loop.id, "**: ").concat(loop.config.type, " ").concat(loop.config.target ? "(".concat(loop.config.target, ")") : '', "\n");
                                output += "  - Status: ".concat(loop.status.toUpperCase(), "\n");
                                output += "  - Attempt: ".concat(loop.currentAttempt, "/").concat(loop.config.maxAttempts, "\n");
                            }
                            return [2 /*return*/, { handled: true, output: output }];
                        }
                        if (subcommand === 'cancel') {
                            id = args[1];
                            if (!id)
                                return [2 /*return*/, { handled: true, output: "❌ Usage: /fix cancel <loop-id>" }];
                            success = autoDev.cancelLoop(id);
                            return [2 /*return*/, {
                                    handled: true,
                                    output: success ? "\uD83D\uDED1 Loop `".concat(id, "` cancelled.") : "\u274C Loop `".concat(id, "` not found or not running.")
                                }];
                        }
                        return [2 /*return*/, { handled: true, output: "❌ Usage: /fix <test|lint|build|status|cancel> [target]" }];
                }
            });
        });
    };
    return FixCommand;
}());
exports.FixCommand = FixCommand;
