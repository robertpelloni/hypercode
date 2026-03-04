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
exports.DirectorCommand = exports.VersionCommand = exports.HelpCommand = void 0;
/**
 * Reason: Director runtime instances may expose an internal `getStatus()` method not present on the strict type.
 * What: Runtime-safe extractor that reads status payload through reflection and narrows known fields.
 * Why: Keeps `/director status` behavior while removing broad direct casts.
 */
function extractDirectorStatus(director) {
    var getStatus = Reflect.get(director, 'getStatus');
    if (typeof getStatus !== 'function') {
        return {};
    }
    var status = Reflect.apply(getStatus, director, []);
    if (!status || typeof status !== 'object') {
        return {};
    }
    return status;
}
var HelpCommand = /** @class */ (function () {
    function HelpCommand(registry) {
        this.registry = registry;
        this.name = "help";
        this.description = "List available slash commands.";
    }
    HelpCommand.prototype.execute = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var commands, output, _i, commands_1, cmd;
            return __generator(this, function (_a) {
                commands = this.registry.getCommands();
                output = "🛠️ **Available Commands**\n\n";
                for (_i = 0, commands_1 = commands; _i < commands_1.length; _i++) {
                    cmd = commands_1[_i];
                    output += "- **/".concat(cmd.name, "**: ").concat(cmd.description, "\n");
                }
                return [2 /*return*/, { handled: true, output: output }];
            });
        });
    };
    return HelpCommand;
}());
exports.HelpCommand = HelpCommand;
var VersionCommand = /** @class */ (function () {
    function VersionCommand() {
        this.name = "version";
        this.description = "Show system version.";
    }
    VersionCommand.prototype.execute = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var fs, path, version, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('fs/promises'); })];
                    case 1:
                        fs = _a.sent();
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('path'); })];
                    case 2:
                        path = _a.sent();
                        return [4 /*yield*/, fs.readFile(path.join(process.cwd(), 'VERSION'), 'utf-8')];
                    case 3:
                        version = _a.sent();
                        return [2 /*return*/, { handled: true, output: "v".concat(version.trim()) }];
                    case 4:
                        e_1 = _a.sent();
                        return [2 /*return*/, { handled: true, output: "Unknown Version" }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return VersionCommand;
}());
exports.VersionCommand = VersionCommand;
var DirectorCommand = /** @class */ (function () {
    function DirectorCommand(directorGetter) {
        this.directorGetter = directorGetter;
        this.name = "director";
        this.description = "Control the autonomous director. Usage: /director <start|stop|status>";
    }
    DirectorCommand.prototype.execute = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var director, subcommand, status_1;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        director = this.directorGetter();
                        if (!director)
                            return [2 /*return*/, { handled: true, output: "❌ Director instance not found." }];
                        subcommand = args[0];
                        if (!(subcommand === 'start')) return [3 /*break*/, 2];
                        return [4 /*yield*/, director.startAutoDrive()];
                    case 1:
                        _e.sent();
                        return [2 /*return*/, { handled: true, output: "✅ Director Auto-Drive Started." }];
                    case 2:
                        if (subcommand === 'stop') {
                            director.stopAutoDrive();
                            return [2 /*return*/, { handled: true, output: "🛑 Director Auto-Drive Stopped." }];
                        }
                        else if (subcommand === 'status') {
                            status_1 = extractDirectorStatus(director);
                            return [2 /*return*/, {
                                    handled: true,
                                    output: "\uD83D\uDCCA **Director Status**\nActive: ".concat((_a = status_1.active) !== null && _a !== void 0 ? _a : false, "\nState: ").concat((_b = status_1.status) !== null && _b !== void 0 ? _b : 'unknown', "\nGoal: ").concat(status_1.goal || 'None', "\nApprove Mode: ").concat((_d = (_c = status_1.config) === null || _c === void 0 ? void 0 : _c.acceptDetectionMode) !== null && _d !== void 0 ? _d : 'unknown')
                                }];
                        }
                        _e.label = 3;
                    case 3: return [2 /*return*/, { handled: true, output: "Usage: /director <start|stop|status>" }];
                }
            });
        });
    };
    return DirectorCommand;
}());
exports.DirectorCommand = DirectorCommand;
