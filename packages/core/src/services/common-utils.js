"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_INHERITED_ENV_VARS = void 0;
exports.getDefaultEnvironment = getDefaultEnvironment;
exports.resolveEnvVariables = resolveEnvVariables;
exports.sanitizeName = sanitizeName;
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
            // SSL/Certificate variables
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
            continue;
        }
        env[key] = value;
    }
    return env;
}
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
            }
            else {
                resolved[key] = value;
                console.warn("Environment variable not found: ".concat(varName, ", keeping original value: ").concat(value));
            }
        }
        else {
            resolved[key] = value;
        }
    }
    return resolved;
}
/**
 * Sanitize a string to be safe for use in identifiers/paths.
 * Allows alphanumeric, underscore, and hyphen.
 */
function sanitizeName(name) {
    return name.replace(/[^a-zA-Z0-9_-]/g, "");
}
