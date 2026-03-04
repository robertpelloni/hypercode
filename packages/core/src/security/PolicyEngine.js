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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEngine = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
var DEFAULT_POLICY = {
    mode: 'permissive',
    filesystem: {
        deny: ['**/.env', '**/id_rsa', '**/.ssh/**']
    },
    tools: {
        deny: []
    }
};
var PolicyEngine = /** @class */ (function () {
    function PolicyEngine(cwd) {
        this.policyPath = path_1.default.join(cwd, '.borg', 'policy.json');
        this.policy = this.loadPolicy();
    }
    PolicyEngine.prototype.loadPolicy = function () {
        try {
            if (fs_1.default.existsSync(this.policyPath)) {
                var raw = fs_1.default.readFileSync(this.policyPath, 'utf-8');
                return __assign(__assign({}, DEFAULT_POLICY), JSON.parse(raw));
            }
        }
        catch (e) {
            console.error("Failed to load policy.json", e);
        }
        return DEFAULT_POLICY;
    };
    /**
     * Check if a tool execution is allowed by policy.
     */
    PolicyEngine.prototype.check = function (toolName, args) {
        // 1. Tool Blacklist
        if (this.policy.tools.deny.includes(toolName)) {
            return { allowed: false, reason: "Tool '".concat(toolName, "' is blacklisted by policy.") };
        }
        // 2. Filesystem Check (for fs tools)
        if (['write_to_file', 'read_file', 'list_dir', 'replace_file_content'].includes(toolName)) {
            var targetPath = this.extractTargetPath(args);
            if (targetPath) {
                // Simple glob check (implementation simplified for demo)
                // In prod, use micromatch or minimatch
                for (var _i = 0, _a = this.policy.filesystem.deny; _i < _a.length; _i++) {
                    var pattern = _a[_i];
                    if (targetPath.includes(pattern.replace('**', ''))) {
                        return { allowed: false, reason: "Path '".concat(targetPath, "' matches deny rule '").concat(pattern, "'") };
                    }
                }
            }
        }
        return { allowed: true };
    };
    /**
     * Reason: policy checks consume heterogeneous tool payloads from many integrations.
     * What: extracts the canonical target path from known argument key variants.
     * Why: preserves current behavior while avoiding unsafe property access on unknown inputs.
     */
    PolicyEngine.prototype.extractTargetPath = function (args) {
        var _a, _b, _c;
        if (!args || typeof args !== 'object') {
            return undefined;
        }
        var record = args;
        var candidate = (_c = (_b = (_a = record.TargetFile) !== null && _a !== void 0 ? _a : record.AbsolutePath) !== null && _b !== void 0 ? _b : record.DirectoryPath) !== null && _c !== void 0 ? _c : record.path;
        return typeof candidate === 'string' ? candidate : undefined;
    };
    return PolicyEngine;
}());
exports.PolicyEngine = PolicyEngine;
