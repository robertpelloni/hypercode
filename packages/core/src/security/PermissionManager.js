"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionManager = void 0;
var PolicyEngine_js_1 = require("./PolicyEngine.js");
var PermissionManager = /** @class */ (function () {
    function PermissionManager(autonomyLevel) {
        if (autonomyLevel === void 0) { autonomyLevel = 'high'; }
        this.autonomyLevel = autonomyLevel;
        this.policyEngine = new PolicyEngine_js_1.PolicyEngine(process.cwd());
    }
    PermissionManager.prototype.setAutonomyLevel = function (level) {
        this.autonomyLevel = level;
    };
    PermissionManager.prototype.getAutonomyLevel = function () {
        return this.autonomyLevel;
    };
    /**
     * Determines if a tool call requires user approval.
     */
    PermissionManager.prototype.checkPermission = function (toolName, args) {
        // 1. Policy Check (Hard Guardrails)
        var policyResult = this.policyEngine.check(toolName, args);
        if (!policyResult.allowed) {
            console.warn("[PermissionManager] Access Denied by Policy: ".concat(policyResult.reason));
            return 'DENIED';
        }
        // High Autonomy: Trust completely (if Policy allows)
        if (this.autonomyLevel === 'high') {
            return 'APPROVED';
        }
        var risk = this.assessRisk(toolName, args);
        if (this.autonomyLevel === 'medium') {
            // Medium: Allow low/medium, consult on high
            if (risk === 'high')
                return 'NEEDS_CONSULTATION';
            return 'APPROVED';
        }
        // Low Autonomy: Block high, consult on medium, allow low
        if (risk === 'high')
            return 'DENIED';
        if (risk === 'medium')
            return 'NEEDS_CONSULTATION';
        return 'APPROVED';
    };
    PermissionManager.prototype.assessRisk = function (toolName, args) {
        // High Risk Tools (Modifying system, network, sensitive reads)
        if (toolName.includes('write_file') ||
            toolName.includes('execute_command') ||
            toolName.includes('install') ||
            toolName.includes('git_push')) {
            return 'high';
        }
        // Medium Risk (Read-only but potentially sensitive, or minor mods)
        if (toolName.includes('read_file') || toolName.includes('list_dir') || toolName.includes('read_page')) {
            return 'medium';
        }
        // Low Risk (Info, search, ping)
        if (toolName.includes('search') || toolName.includes('status') || toolName.includes('ping')) {
            return 'low';
        }
        // Default to high risk for unknown tools
        // But let's be nicer to harmless internal tools
        if (toolName.startsWith('vscode_'))
            return 'medium';
        return 'high';
    };
    return PermissionManager;
}());
exports.PermissionManager = PermissionManager;
