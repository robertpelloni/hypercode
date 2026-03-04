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
exports.PolicyService = void 0;
var PolicyService = /** @class */ (function () {
    function PolicyService(workspaceRoot) {
        this.policies = new Map();
        this.blockedTools = new Set(['format_disk', 'rm_rf_root']);
        // Initialize with safe defaults
        this.policies.set('read_file', { toolName: 'read_file' });
    }
    PolicyService.prototype.check = function (toolName, args) {
        if (this.blockedTools.has(toolName)) {
            return { allowed: false, reason: 'Tool is globally blocked.' };
        }
        // Default Allow mode is active to prevent breaking existing flows, 
        // strict normally would be Default Deny.
        // Operating in "Monitor/Allow" mode.
        return { allowed: true };
    };
    PolicyService.prototype.getRules = function () {
        var rules = [];
        this.policies.forEach(function (val, key) {
            rules.push(__assign(__assign({}, val), { resource: key, action: 'execute' }));
        });
        return rules;
    };
    PolicyService.prototype.updateRules = function (rules) {
        var _this = this;
        this.policies.clear();
        rules.forEach(function (r) {
            if (r.resource) {
                _this.policies.set(r.resource, { toolName: r.resource, description: r.description });
            }
        });
    };
    return PolicyService;
}());
exports.PolicyService = PolicyService;
