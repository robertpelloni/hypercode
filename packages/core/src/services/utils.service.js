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
exports.DEFAULT_INHERITED_ENV_VARS = void 0;
exports.getDefaultEnvironment = getDefaultEnvironment;
exports.sanitizeName = sanitizeName;
exports.convertDbServerToParams = convertDbServerToParams;
exports.resolveEnvVariables = resolveEnvVariables;
var index_js_1 = require("../db/repositories/index.js");
/**
 * Environment variables to inherit by default, if an environment is not explicitly given.
 */
exports.DEFAULT_INHERITED_ENV_VARS = process.platform === "win32"
    ? [
        "APPDATA",
        "HOMEDRIVE",
        "HOMEPATH",
        "LOCALAPPDATA",
        "PATH",
        "PROCESSOR_ARCHITECTURE",
        "SYSTEMDRIVE",
        "SYSTEMROOT",
        "TEMP",
        "USERNAME",
        "USERPROFILE",
        "PROGRAMFILES",
    ]
    : /* list inspired by the default env inheritance of sudo */
        [
            "HOME",
            "LOGNAME",
            "PATH",
            "SHELL",
            "TERM",
            "USER",
            // SSL/Certificate variables for corporate proxies and custom CA certificates
            "NODE_EXTRA_CA_CERTS",
            "NODE_TLS_REJECT_UNAUTHORIZED",
            "SSL_CERT_FILE",
            "CERT_FILE",
            "REQUESTS_CA_BUNDLE",
            "REQUESTS_CERT_FILE",
            "CURL_CA_BUNDLE",
            "PIP_CERT",
            "UV_CERT",
            "PYTHONHTTPSVERIFY",
            // Proxy variables
            "HTTP_PROXY",
            "HTTPS_PROXY",
            "NO_PROXY",
            "http_proxy",
            "https_proxy",
            "no_proxy",
        ];
/**
 * Returns a default environment object including only environment variables deemed safe to inherit.
 */
function getDefaultEnvironment() {
    var env = {};
    for (var _i = 0, DEFAULT_INHERITED_ENV_VARS_1 = exports.DEFAULT_INHERITED_ENV_VARS; _i < DEFAULT_INHERITED_ENV_VARS_1.length; _i++) {
        var key = DEFAULT_INHERITED_ENV_VARS_1[_i];
        var value = process.env[key];
        if (value === undefined) {
            continue;
        }
        if (value.startsWith("()")) {
            // Skip functions, which are a security risk.
            continue;
        }
        env[key] = value;
    }
    return env;
}
function sanitizeName(name) {
    return name.replace(/[^a-zA-Z0-9_-]/g, "");
}
/**
 * Converts a database MCP server record to ServerParameters format
 * @param server Database MCP server record
 * @returns ServerParameters object or null if conversion fails
 */
function convertDbServerToParams(server) {
    return __awaiter(this, void 0, void 0, function () {
        var oauthSession, oauthTokens, params, error_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, index_js_1.oauthSessionsRepository.findByMcpServerUuid(server.uuid)];
                case 1:
                    oauthSession = _b.sent();
                    oauthTokens = null;
                    if (oauthSession && oauthSession.tokens) {
                        oauthTokens = {
                            access_token: oauthSession.tokens.access_token,
                            token_type: oauthSession.tokens.token_type,
                            expires_in: oauthSession.tokens.expires_in,
                            scope: oauthSession.tokens.scope,
                            refresh_token: oauthSession.tokens.refresh_token,
                        };
                    }
                    params = {
                        uuid: server.uuid,
                        name: server.name,
                        description: server.description || "",
                        type: server.type || "STDIO",
                        command: server.command,
                        args: server.args || [],
                        env: server.env || {},
                        url: server.url,
                        created_at: ((_a = server.created_at) === null || _a === void 0 ? void 0 : _a.toISOString()) || new Date().toISOString(),
                        status: "active", // Default status for non-namespace servers
                        stderr: "inherit",
                        oauth_tokens: oauthTokens,
                        bearerToken: server.bearerToken,
                        headers: server.headers || {},
                    };
                    // Process based on server type
                    if (params.type === "STDIO") {
                        if ("args" in params && !params.args) {
                            params.args = undefined;
                        }
                        params.env = __assign(__assign({}, getDefaultEnvironment()), (params.env || {}));
                    }
                    else if (params.type === "SSE" || params.type === "STREAMABLE_HTTP") {
                        // For SSE or STREAMABLE_HTTP servers, ensure url is present
                        if (!params.url) {
                            console.warn("".concat(params.type, " server ").concat(params.uuid, " is missing url field, skipping"));
                            return [2 /*return*/, null];
                        }
                    }
                    return [2 /*return*/, params];
                case 2:
                    error_1 = _b.sent();
                    console.error("Error converting server ".concat(server.uuid, " to parameters:"), error_1);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Resolves environment variable placeholders in an environment object.
 * Replaces values like "${VAR_NAME}" with the actual environment variable value.
 * @param envObject Environment object that may contain placeholder values
 * @returns Environment object with resolved values
 */
function resolveEnvVariables(envObject) {
    var resolved = {};
    for (var _i = 0, _a = Object.entries(envObject); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        if (typeof value === "string" &&
            value.startsWith("${") &&
            value.endsWith("}")) {
            var varName = value.slice(2, -1);
            if (process.env[varName]) {
                resolved[key] = process.env[varName];
                // console.info(
                //   `Resolved environment variable: ${key}=${value} -> ${varName}=[REDACTED]`,
                // );
            }
            else {
                resolved[key] = value; // Keep original value if env var not found
                console.warn("Environment variable not found: ".concat(varName, ", keeping original value: ").concat(value));
            }
        }
        else {
            resolved[key] = value;
        }
    }
    return resolved;
}
