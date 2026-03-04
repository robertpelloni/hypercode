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
exports.ContextCommand = void 0;
var path = require("path");
var ContextCommand = /** @class */ (function () {
    function ContextCommand(contextManager) {
        this.contextManager = contextManager;
        this.name = "context";
        this.description = "Manage pinned context files. Usage: /context <add|remove|list|clear> [file]";
    }
    ContextCommand.prototype.execute = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var subcommand, target, msg, msg, files, list, msg;
            return __generator(this, function (_a) {
                if (args.length === 0) {
                    return [2 /*return*/, { handled: true, output: "Usage: /context <add|remove|list|clear> [file]" }];
                }
                subcommand = args[0];
                target = args.slice(1).join(" ");
                try {
                    if (subcommand === 'add') {
                        if (!target)
                            return [2 /*return*/, { handled: true, output: "❌ Please specify a file path." }];
                        msg = this.contextManager.add(target);
                        return [2 /*return*/, { handled: true, output: "\u2705 ".concat(msg) }];
                    }
                    else if (subcommand === 'remove') {
                        if (!target)
                            return [2 /*return*/, { handled: true, output: "❌ Please specify a file path or name." }];
                        msg = this.contextManager.remove(target);
                        return [2 /*return*/, { handled: true, output: "\u2705 ".concat(msg) }];
                    }
                    else if (subcommand === 'list') {
                        files = this.contextManager.list();
                        if (files.length === 0)
                            return [2 /*return*/, { handled: true, output: "📭 No pinned files." }];
                        list = files.map(function (f) { return "- ".concat(path.relative(process.cwd(), f)); }).join('\n');
                        return [2 /*return*/, { handled: true, output: "\uD83D\uDCCC **Pinned Files**\n".concat(list) }];
                    }
                    else if (subcommand === 'clear') {
                        msg = this.contextManager.clear();
                        return [2 /*return*/, { handled: true, output: "\u2705 ".concat(msg) }];
                    }
                    else {
                        return [2 /*return*/, { handled: true, output: "Unknown subcommand. Use add, remove, list, or clear." }];
                    }
                }
                catch (error) {
                    return [2 /*return*/, { handled: true, output: "\u274C Error: ".concat(error.message) }];
                }
                return [2 /*return*/];
            });
        });
    };
    return ContextCommand;
}());
exports.ContextCommand = ContextCommand;
