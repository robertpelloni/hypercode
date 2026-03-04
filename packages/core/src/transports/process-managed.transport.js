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
exports.ProcessManagedStdioTransport = void 0;
var node_process_1 = require("node:process");
var node_stream_1 = require("node:stream");
var cross_spawn_1 = require("cross-spawn");
var stdio_js_1 = require("@modelcontextprotocol/sdk/shared/stdio.js");
var utils_service_js_1 = require("../services/utils.service.js");
/**
 * Client transport for stdio: this will connect to a server by spawning a process and communicating with it over stdin/stdout.
 *
 * This transport is only available in Node.js environments.
 */
var ProcessManagedStdioTransport = /** @class */ (function () {
    function ProcessManagedStdioTransport(server) {
        this._abortController = new AbortController();
        this._readBuffer = new stdio_js_1.ReadBuffer();
        this._stderrStream = null;
        this._isCleanup = false;
        this._serverParams = server;
        if (server.stderr === "pipe" || server.stderr === "overlapped") {
            this._stderrStream = new node_stream_1.PassThrough();
        }
    }
    /**
     * Starts the server process and prepares to communicate with it.
     */
    ProcessManagedStdioTransport.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (this._process) {
                    throw new Error("StdioClientTransport already started! If using Client class, note that connect() calls start() automatically.");
                }
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var _a, _b, _c, _d, _e;
                        _this._process = (0, cross_spawn_1.default)(_this._serverParams.command, (_a = _this._serverParams.args) !== null && _a !== void 0 ? _a : [], {
                            // merge default env with server env because mcp server needs some env vars
                            env: __assign(__assign({}, (0, utils_service_js_1.getDefaultEnvironment)()), _this._serverParams.env),
                            stdio: ["pipe", "pipe", (_b = _this._serverParams.stderr) !== null && _b !== void 0 ? _b : "inherit"],
                            shell: false,
                            signal: _this._abortController.signal,
                            windowsHide: node_process_1.default.platform === "win32" && isElectron(),
                            cwd: _this._serverParams.cwd,
                            detached: true,
                        });
                        // Unref the child process so it doesn't keep the parent alive
                        _this._process.unref();
                        _this._process.on("error", function (error) {
                            var _a, _b;
                            if (error.name === "AbortError") {
                                // Expected when close() is called.
                                (_a = _this.onclose) === null || _a === void 0 ? void 0 : _a.call(_this);
                                return;
                            }
                            reject(error);
                            (_b = _this.onerror) === null || _b === void 0 ? void 0 : _b.call(_this, error);
                        });
                        _this._process.on("spawn", function () {
                            resolve();
                        });
                        _this._process.on("close", function (code, signal) {
                            var _a, _b;
                            // Only emit crash event if this wasn't a clean shutdown
                            if (!_this._isCleanup && (code !== 0 || signal)) {
                                console.warn("Process crashed with code: ".concat(code, ", signal: ").concat(signal));
                                console.info("Calling onprocesscrash handler: ".concat(_this.onprocesscrash ? "handler exists" : "no handler"));
                                (_a = _this.onprocesscrash) === null || _a === void 0 ? void 0 : _a.call(_this, code, signal);
                            }
                            _this._process = undefined;
                            (_b = _this.onclose) === null || _b === void 0 ? void 0 : _b.call(_this);
                        });
                        (_c = _this._process.stdin) === null || _c === void 0 ? void 0 : _c.on("error", function (error) {
                            var _a;
                            (_a = _this.onerror) === null || _a === void 0 ? void 0 : _a.call(_this, error);
                        });
                        (_d = _this._process.stdout) === null || _d === void 0 ? void 0 : _d.on("data", function (chunk) {
                            _this._readBuffer.append(chunk);
                            _this.processReadBuffer();
                        });
                        (_e = _this._process.stdout) === null || _e === void 0 ? void 0 : _e.on("error", function (error) {
                            var _a;
                            (_a = _this.onerror) === null || _a === void 0 ? void 0 : _a.call(_this, error);
                        });
                        if (_this._stderrStream && _this._process.stderr) {
                            _this._process.stderr.pipe(_this._stderrStream);
                        }
                    })];
            });
        });
    };
    Object.defineProperty(ProcessManagedStdioTransport.prototype, "stderr", {
        /**
         * The stderr stream of the child process, if `StdioServerParameters.stderr` was set to "pipe" or "overlapped".
         *
         * If stderr piping was requested, a PassThrough stream is returned _immediately_, allowing callers to
         * attach listeners before the start method is invoked. This prevents loss of any early
         * error output emitted by the child process.
         */
        get: function () {
            var _a, _b;
            if (this._stderrStream) {
                return this._stderrStream;
            }
            return (_b = (_a = this._process) === null || _a === void 0 ? void 0 : _a.stderr) !== null && _b !== void 0 ? _b : null;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ProcessManagedStdioTransport.prototype, "pid", {
        /**
         * The child process pid spawned by this transport.
         *
         * This is only available after the transport has been started.
         */
        get: function () {
            var _a, _b;
            return (_b = (_a = this._process) === null || _a === void 0 ? void 0 : _a.pid) !== null && _b !== void 0 ? _b : null;
        },
        enumerable: false,
        configurable: true
    });
    ProcessManagedStdioTransport.prototype.processReadBuffer = function () {
        var _a, _b;
        while (true) {
            try {
                var message = this._readBuffer.readMessage();
                if (message === null) {
                    break;
                }
                (_a = this.onmessage) === null || _a === void 0 ? void 0 : _a.call(this, message);
            }
            catch (error) {
                (_b = this.onerror) === null || _b === void 0 ? void 0 : _b.call(this, error);
            }
        }
    };
    ProcessManagedStdioTransport.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                this._isCleanup = true;
                this._abortController.abort();
                // Kill the entire process group to ensure full cleanup
                if ((_a = this._process) === null || _a === void 0 ? void 0 : _a.pid) {
                    try {
                        node_process_1.default.kill(-this._process.pid, "SIGTERM");
                    }
                    catch (error) {
                        // Process might already be terminated, ignore errors
                        console.warn("Failed to kill process group:", error);
                    }
                }
                this._process = undefined;
                this._readBuffer.clear();
                return [2 /*return*/];
            });
        });
    };
    ProcessManagedStdioTransport.prototype.send = function (message) {
        var _this = this;
        return new Promise(function (resolve) {
            var _a;
            if (!((_a = _this._process) === null || _a === void 0 ? void 0 : _a.stdin)) {
                throw new Error("Not connected");
            }
            var json = (0, stdio_js_1.serializeMessage)(message);
            if (_this._process.stdin.write(json)) {
                resolve();
            }
            else {
                _this._process.stdin.once("drain", resolve);
            }
        });
    };
    return ProcessManagedStdioTransport;
}());
exports.ProcessManagedStdioTransport = ProcessManagedStdioTransport;
function isElectron() {
    return Boolean(node_process_1.default.versions.electron);
}
