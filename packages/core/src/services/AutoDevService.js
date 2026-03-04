"use strict";
/**
 * AutoDevService - "Fix until Pass" loops for tests and linters
 * Automatically retries fixing code until tests/lints pass or max attempts reached
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
exports.AutoDevService = void 0;
var child_process_1 = require("child_process");
var util_1 = require("util");
var execAsync = (0, util_1.promisify)(child_process_1.exec);
var AutoDevService = /** @class */ (function () {
    function AutoDevService(rootDir, director) {
        this.activeLoops = new Map();
        this.loopCounter = 0;
        this.rootDir = rootDir;
        this.director = director;
    }
    /**
     * Start a "Fix until Pass" loop
     */
    AutoDevService.prototype.startLoop = function (config) {
        return __awaiter(this, void 0, void 0, function () {
            var id, loop;
            var _this = this;
            return __generator(this, function (_a) {
                id = "loop-".concat(++this.loopCounter);
                loop = {
                    id: id,
                    config: config,
                    status: 'running',
                    currentAttempt: 0,
                    startTime: Date.now(),
                    lastOutput: ''
                };
                this.activeLoops.set(id, loop);
                console.log("[AutoDev] \uD83D\uDD04 Starting ".concat(config.type, " loop (max ").concat(config.maxAttempts, " attempts)"));
                // Run the loop asynchronously
                this.runLoop(id).catch(function (e) {
                    console.error("[AutoDev] Loop ".concat(id, " error:"), e);
                    var l = _this.activeLoops.get(id);
                    if (l)
                        l.status = 'failed';
                });
                return [2 /*return*/, id];
            });
        });
    };
    /**
     * Cancel an active loop
     */
    AutoDevService.prototype.cancelLoop = function (id) {
        var loop = this.activeLoops.get(id);
        if (loop && loop.status === 'running') {
            loop.status = 'cancelled';
            console.log("[AutoDev] \uD83D\uDED1 Cancelled loop ".concat(id));
            return true;
        }
        return false;
    };
    /**
     * Get status of all loops
     */
    AutoDevService.prototype.getLoops = function () {
        return Array.from(this.activeLoops.values());
    };
    /**
     * Get a specific loop
     */
    AutoDevService.prototype.getLoop = function (id) {
        return this.activeLoops.get(id);
    };
    AutoDevService.prototype.runLoop = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var loop, config, command, _loop_1, this_1, state_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        loop = this.activeLoops.get(id);
                        if (!loop)
                            return [2 /*return*/];
                        config = loop.config;
                        command = this.getCommand(config);
                        _loop_1 = function () {
                            var _b, stdout, stderr, error_1, errorRecord, stdout, stderr, message, delay_1, goal, e_1;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        loop.currentAttempt++;
                                        console.log("[AutoDev] Attempt ".concat(loop.currentAttempt, "/").concat(config.maxAttempts));
                                        _c.label = 1;
                                    case 1:
                                        _c.trys.push([1, 3, , 11]);
                                        return [4 /*yield*/, execAsync(command, {
                                                cwd: this_1.rootDir,
                                                timeout: 120000 // 2 minute timeout per attempt
                                            })];
                                    case 2:
                                        _b = _c.sent(), stdout = _b.stdout, stderr = _b.stderr;
                                        loop.lastOutput = stdout || stderr;
                                        // Success!
                                        loop.status = 'success';
                                        console.log("[AutoDev] \u2705 ".concat(config.type, " passed on attempt ").concat(loop.currentAttempt));
                                        return [2 /*return*/, { value: void 0 }];
                                    case 3:
                                        error_1 = _c.sent();
                                        errorRecord = error_1 && typeof error_1 === 'object'
                                            ? error_1
                                            : null;
                                        stdout = typeof (errorRecord === null || errorRecord === void 0 ? void 0 : errorRecord.stdout) === 'string' ? errorRecord.stdout : '';
                                        stderr = typeof (errorRecord === null || errorRecord === void 0 ? void 0 : errorRecord.stderr) === 'string' ? errorRecord.stderr : '';
                                        message = error_1 instanceof Error ? error_1.message : String(error_1);
                                        loop.lastOutput = stdout || stderr || message;
                                        if (loop.status !== 'running') {
                                            return [2 /*return*/, { value: void 0 }];
                                        }
                                        console.log("[AutoDev] \u274C Attempt ".concat(loop.currentAttempt, " failed"));
                                        // Don't retry on last attempt
                                        if (loop.currentAttempt >= config.maxAttempts) {
                                            loop.status = 'failed';
                                            console.log("[AutoDev] \uD83D\uDC80 Max attempts reached. Loop failed.");
                                            return [2 /*return*/, { value: void 0 }];
                                        }
                                        delay_1 = Math.min(1000 * Math.pow(2, loop.currentAttempt - 1), 30000);
                                        if (!(this_1.director && loop.status === 'running')) return [3 /*break*/, 8];
                                        console.log("[AutoDev] \uD83D\uDD27 Requesting Director fix...");
                                        goal = "Fix the following ".concat(config.type, " error in ").concat(config.target || 'the project', ". \nOutput:\n").concat(loop.lastOutput.substring(0, 2000), "\n\nPlease analyze the file, fix the code, and ensure it passes.");
                                        _c.label = 4;
                                    case 4:
                                        _c.trys.push([4, 6, , 7]);
                                        // Give the director a few steps to fix it
                                        return [4 /*yield*/, this_1.director.executeTask(goal, 5)];
                                    case 5:
                                        // Give the director a few steps to fix it
                                        _c.sent();
                                        return [3 /*break*/, 7];
                                    case 6:
                                        e_1 = _c.sent();
                                        console.error("[AutoDev] Director fix failed:", e_1);
                                        return [3 /*break*/, 7];
                                    case 7: return [3 /*break*/, 10];
                                    case 8: return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, delay_1); })];
                                    case 9:
                                        _c.sent();
                                        _c.label = 10;
                                    case 10: return [3 /*break*/, 11];
                                    case 11: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _a.label = 1;
                    case 1:
                        if (!(loop.currentAttempt < config.maxAttempts && loop.status === 'running')) return [3 /*break*/, 3];
                        return [5 /*yield**/, _loop_1()];
                    case 2:
                        state_1 = _a.sent();
                        if (typeof state_1 === "object")
                            return [2 /*return*/, state_1.value];
                        return [3 /*break*/, 1];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    AutoDevService.prototype.getCommand = function (config) {
        if (config.command)
            return config.command;
        switch (config.type) {
            case 'test':
                return config.target
                    ? "npx vitest run ".concat(config.target)
                    : 'npm test';
            case 'lint':
                return config.target
                    ? "npx eslint --fix ".concat(config.target)
                    : 'npm run lint -- --fix';
            case 'build':
                return 'npm run build';
            default:
                return 'npm test';
        }
    };
    /**
     * Clear completed loops
     */
    AutoDevService.prototype.clearCompleted = function () {
        var count = 0;
        for (var _i = 0, _a = this.activeLoops; _i < _a.length; _i++) {
            var _b = _a[_i], id = _b[0], loop = _b[1];
            if (loop.status !== 'running') {
                this.activeLoops.delete(id);
                count++;
            }
        }
        return count;
    };
    return AutoDevService;
}());
exports.AutoDevService = AutoDevService;
