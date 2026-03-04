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
exports.connectMetaMcpClient = exports.createMetaMcpClient = exports.transformDockerUrl = void 0;
var index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
var sse_js_1 = require("@modelcontextprotocol/sdk/client/sse.js");
var process_managed_transport_js_1 = require("../transports/process-managed.transport.js");
var log_store_service_js_1 = require("./log-store.service.js");
var server_error_tracker_service_js_1 = require("./server-error-tracker.service.js");
var utils_service_js_1 = require("./utils.service.js");
var sleep = function (time) {
    return new Promise(function (resolve) { return setTimeout(function () { return resolve(); }, time); });
};
var toStringEnv = function (env) {
    if (!env) {
        return undefined;
    }
    var mapped = Object.entries(env).reduce(function (acc, _a) {
        var key = _a[0], value = _a[1];
        if (value === undefined || value === null) {
            return acc;
        }
        acc[key] = typeof value === "string" ? value : String(value);
        return acc;
    }, {});
    return Object.keys(mapped).length > 0 ? mapped : undefined;
};
/**
 * Transforms localhost URLs to use host.docker.internal when running inside Docker
 */
var transformDockerUrl = function (url) {
    if (process.env.TRANSFORM_LOCALHOST_TO_DOCKER_INTERNAL === "true") {
        var transformed = url.replace(/localhost|127\.0\.0\.1/g, "host.docker.internal");
        return transformed;
    }
    return url;
};
exports.transformDockerUrl = transformDockerUrl;
var createMetaMcpClient = function (serverParams) {
    var _a;
    var transport;
    // Create the appropriate transport based on server type
    // Default to "STDIO" if type is undefined
    if (!serverParams.type || serverParams.type === "STDIO") {
        // Resolve environment variable placeholders
        var resolvedEnv = serverParams.env
            ? (0, utils_service_js_1.resolveEnvVariables)(serverParams.env)
            : undefined;
        var stdioParams = {
            command: serverParams.command || "",
            args: serverParams.args || undefined,
            env: toStringEnv(resolvedEnv),
            stderr: "pipe",
        };
        transport = new process_managed_transport_js_1.ProcessManagedStdioTransport(stdioParams);
        // Handle stderr stream when set to "pipe"
        if (transport.stderr) {
            var stderrStream = transport.stderr;
            stderrStream === null || stderrStream === void 0 ? void 0 : stderrStream.on("data", function (chunk) {
                log_store_service_js_1.metamcpLogStore.addLog(serverParams.name, "error", chunk.toString().trim());
            });
            stderrStream === null || stderrStream === void 0 ? void 0 : stderrStream.on("error", function (error) {
                log_store_service_js_1.metamcpLogStore.addLog(serverParams.name, "error", "stderr error", error);
            });
        }
    }
    else if (serverParams.type === "SSE" && serverParams.url) {
        // Transform the URL if TRANSFORM_LOCALHOST_TO_DOCKER_INTERNAL is set to "true"
        var transformedUrl = (0, exports.transformDockerUrl)(serverParams.url);
        // Build headers: start with custom headers, then add auth header
        var headers_1 = __assign({}, (serverParams.headers || {}));
        // Check for authentication - prioritize OAuth tokens, fallback to bearerToken
        var authToken = ((_a = serverParams.oauth_tokens) === null || _a === void 0 ? void 0 : _a.access_token) || serverParams.bearerToken;
        if (authToken) {
            headers_1["Authorization"] = "Bearer ".concat(authToken);
        }
        var hasHeaders = Object.keys(headers_1).length > 0;
        if (!hasHeaders) {
            transport = new sse_js_1.SSEClientTransport(new URL(transformedUrl));
        }
        else {
            transport = new sse_js_1.SSEClientTransport(new URL(transformedUrl), {
                eventSourceInit: {
                    fetch: function (url, init) {
                        var mergedHeaders = __assign(__assign({}, ((init === null || init === void 0 ? void 0 : init.headers)
                            ? Object.fromEntries(new Headers(init.headers).entries())
                            : {})), headers_1);
                        return fetch(url, __assign(__assign({}, init), { headers: mergedHeaders }));
                    },
                },
                requestInit: {
                    headers: headers_1
                }
            });
        }
    }
    else {
        log_store_service_js_1.metamcpLogStore.addLog(serverParams.name, "error", "Unsupported server type: ".concat(serverParams.type));
        return { client: undefined, transport: undefined };
    }
    var client = new index_js_1.Client({
        name: "metamcp-client",
        version: "2.0.0",
    }, {
        capabilities: {
        // Intentionally empty: this client does not require optional MCP client capabilities.
        },
    });
    return { client: client, transport: transport };
};
exports.createMetaMcpClient = createMetaMcpClient;
var connectMetaMcpClient = function (serverParams, onProcessCrash) { return __awaiter(void 0, void 0, void 0, function () {
    var waitFor, maxAttempts, count, retry, _loop_1, state_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                waitFor = 5000;
                return [4 /*yield*/, server_error_tracker_service_js_1.serverErrorTracker.getServerMaxAttempts(serverParams.uuid)];
            case 1:
                maxAttempts = _a.sent();
                count = 0;
                retry = true;
                console.log("Connecting to server ".concat(serverParams.name, " (").concat(serverParams.uuid, ") with max attempts: ").concat(maxAttempts));
                _loop_1 = function () {
                    var isInErrorState, _b, client_1, transport_1, error_1;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                _c.trys.push([0, 3, , 6]);
                                return [4 /*yield*/, server_error_tracker_service_js_1.serverErrorTracker.isServerInErrorState(serverParams.uuid)];
                            case 1:
                                isInErrorState = _c.sent();
                                if (isInErrorState) {
                                    console.warn("Server ".concat(serverParams.name, " (").concat(serverParams.uuid, ") is already in ERROR state, skipping connection attempt"));
                                    return [2 /*return*/, { value: undefined }];
                                }
                                _b = (0, exports.createMetaMcpClient)(serverParams), client_1 = _b.client, transport_1 = _b.transport;
                                if (!client_1 || !transport_1) {
                                    return [2 /*return*/, { value: undefined }];
                                }
                                // Set up process crash detection for STDIO transports BEFORE connecting
                                if (transport_1 instanceof process_managed_transport_js_1.ProcessManagedStdioTransport) {
                                    console.log("Setting up crash handler for server ".concat(serverParams.name, " (").concat(serverParams.uuid, ")"));
                                    transport_1.onprocesscrash = function (exitCode, signal) {
                                        console.warn("Process crashed for server ".concat(serverParams.name, " (").concat(serverParams.uuid, "): code=").concat(exitCode, ", signal=").concat(signal));
                                        // Notify the pool about the crash
                                        if (onProcessCrash) {
                                            console.log("Calling onProcessCrash callback for server ".concat(serverParams.name, " (").concat(serverParams.uuid, ")"));
                                            onProcessCrash(exitCode, signal);
                                        }
                                        else {
                                            console.warn("No onProcessCrash callback provided for server ".concat(serverParams.name, " (").concat(serverParams.uuid, ")"));
                                        }
                                    };
                                }
                                return [4 /*yield*/, client_1.connect(transport_1)];
                            case 2:
                                _c.sent();
                                return [2 /*return*/, { value: {
                                            client: client_1,
                                            cleanup: function () { return __awaiter(void 0, void 0, void 0, function () {
                                                return __generator(this, function (_a) {
                                                    switch (_a.label) {
                                                        case 0: return [4 /*yield*/, transport_1.close()];
                                                        case 1:
                                                            _a.sent();
                                                            return [4 /*yield*/, client_1.close()];
                                                        case 2:
                                                            _a.sent();
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            }); },
                                            onProcessCrash: function (exitCode, signal) {
                                                console.warn("Process crash detected for server ".concat(serverParams.name, " (").concat(serverParams.uuid, "): code=").concat(exitCode, ", signal=").concat(signal));
                                                // Notify the pool about the crash
                                                if (onProcessCrash) {
                                                    onProcessCrash(exitCode, signal);
                                                }
                                            },
                                        } }];
                            case 3:
                                error_1 = _c.sent();
                                log_store_service_js_1.metamcpLogStore.addLog("client", "error", "Error connecting to MetaMCP client (attempt ".concat(count + 1, "/").concat(maxAttempts, ")"), error_1);
                                count++;
                                retry = count < maxAttempts;
                                if (!retry) return [3 /*break*/, 5];
                                return [4 /*yield*/, sleep(waitFor)];
                            case 4:
                                _c.sent();
                                _c.label = 5;
                            case 5: return [3 /*break*/, 6];
                            case 6: return [2 /*return*/];
                        }
                    });
                };
                _a.label = 2;
            case 2:
                if (!retry) return [3 /*break*/, 4];
                return [5 /*yield**/, _loop_1()];
            case 3:
                state_1 = _a.sent();
                if (typeof state_1 === "object")
                    return [2 /*return*/, state_1.value];
                return [3 /*break*/, 2];
            case 4: return [2 /*return*/, undefined];
        }
    });
}); };
exports.connectMetaMcpClient = connectMetaMcpClient;
