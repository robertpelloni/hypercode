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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxService = void 0;
var vm_1 = require("vm");
var child_process_1 = require("child_process");
var SandboxService = /** @class */ (function () {
    function SandboxService() {
        console.log("[SandboxService] Initialized (Mode: Process Isolation)");
    }
    /**
     * Reason: VM execution may return sync values or thenables from async wrappers.
     * What: Detects promise-like results via runtime narrowing on a `then` function.
     * Why: Allows async handling without unsafe structural casts.
     */
    SandboxService.prototype.isPromiseLike = function (value) {
        if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
            return false;
        }
        var thenCandidate = Reflect.get(value, 'then');
        return typeof thenCandidate === 'function';
    };
    /**
     * Execute code in a sandboxed environment.
     * @param language 'node' | 'python'
     * @param code The code to execute
     * @param timeoutMs Max execution time (default 5000ms)
     */
    SandboxService.prototype.execute = function (language_1, code_1) {
        return __awaiter(this, arguments, void 0, function (language, code, timeoutMs, context) {
            if (timeoutMs === void 0) { timeoutMs = 5000; }
            if (context === void 0) { context = {}; }
            return __generator(this, function (_a) {
                if (language === 'node') {
                    return [2 /*return*/, this.executeNode(code, timeoutMs, context)];
                }
                else if (language === 'python') {
                    return [2 /*return*/, this.executePython(code, timeoutMs)];
                }
                else {
                    return [2 /*return*/, { output: '', error: "Unsupported language: ".concat(language) }];
                }
                return [2 /*return*/];
            });
        });
    };
    SandboxService.prototype.executeNode = function (code_1, timeoutMs_1) {
        return __awaiter(this, arguments, void 0, function (code, timeoutMs, contextOverrides) {
            var outputBuffer, sandbox, context, script, result, resolved, e_1;
            if (contextOverrides === void 0) { contextOverrides = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        outputBuffer = "";
                        sandbox = __assign(__assign({ console: {
                                log: function () {
                                    var args = [];
                                    for (var _i = 0; _i < arguments.length; _i++) {
                                        args[_i] = arguments[_i];
                                    }
                                    outputBuffer += args.map(function (a) { return String(a); }).join(' ') + "\n";
                                },
                                error: function () {
                                    var args = [];
                                    for (var _i = 0; _i < arguments.length; _i++) {
                                        args[_i] = arguments[_i];
                                    }
                                    outputBuffer += "[ERR] " + args.map(function (a) { return String(a); }).join(' ') + "\n";
                                },
                                warn: function () {
                                    var args = [];
                                    for (var _i = 0; _i < arguments.length; _i++) {
                                        args[_i] = arguments[_i];
                                    }
                                    outputBuffer += "[WARN] " + args.map(function (a) { return String(a); }).join(' ') + "\n";
                                },
                            }, setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: setInterval, clearInterval: clearInterval, Buffer: Buffer }, contextOverrides), { module: {}, exports: {}, require: function (name) {
                                // Whitelist simple packages if needed? For now, strict no-require for safety.
                                throw new Error("require('".concat(name, "') is blocked in sandbox."));
                            } });
                        context = vm_1.default.createContext(sandbox);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        script = new vm_1.default.Script(code);
                        result = script.runInContext(context, {
                            timeout: timeoutMs,
                            displayErrors: true
                        });
                        if (!this.isPromiseLike(result)) return [3 /*break*/, 3];
                        return [4 /*yield*/, Promise.race([
                                result,
                                new Promise(function (_, reject) { return setTimeout(function () { return reject(new Error("Execution timed out (Async)")); }, timeoutMs); })
                            ])];
                    case 2:
                        resolved = _a.sent();
                        return [2 /*return*/, { output: outputBuffer.trim(), result: resolved }];
                    case 3: return [2 /*return*/, { output: outputBuffer.trim(), result: result }];
                    case 4:
                        e_1 = _a.sent();
                        return [2 /*return*/, {
                                output: outputBuffer.trim(),
                                error: e_1.message || "Unknown Sandbox Error"
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    SandboxService.prototype.executePython = function (code, timeoutMs) {
        return new Promise(function (resolve) {
            var child = (0, child_process_1.spawn)('python', ['-c', code], {
                timeout: timeoutMs
            });
            var stdout = "";
            var stderr = "";
            var killed = false;
            var timer = setTimeout(function () {
                killed = true;
                child.kill();
                resolve({ output: stdout, error: "Execution timed out" });
            }, timeoutMs);
            child.stdout.on('data', function (data) {
                stdout += data.toString();
            });
            child.stderr.on('data', function (data) {
                stderr += data.toString();
            });
            child.on('error', function (err) {
                clearTimeout(timer);
                if (!killed)
                    resolve({ output: stdout, error: err.message });
            });
            child.on('close', function (code) {
                clearTimeout(timer);
                if (!killed) {
                    if (code !== 0) {
                        resolve({ output: stdout, error: stderr || "Process exited with code ".concat(code) });
                    }
                    else {
                        resolve({ output: stdout.trim() });
                    }
                }
            });
        });
    };
    return SandboxService;
}());
exports.SandboxService = SandboxService;
