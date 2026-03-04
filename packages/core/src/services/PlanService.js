"use strict";
/**
 * Plan Service - Structured Development Workflow with Diff Sandbox
 *
 * Implements Plan/Build modes for structured development workflow:
 * - PLAN mode: Exploration and planning, no file changes
 * - BUILD mode: Execution, apply changes via diff sandbox
 *
 * Features:
 * - Cumulative diff review
 * - File-by-file approval
 * - Rollback support
 * - Branch experimentation
 *
 * Inspired by Plandex's diff sandbox architecture.
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanService = exports.DiffSandbox = void 0;
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
/**
 * Diff Sandbox - Manages cumulative diffs before applying
 */
var DiffSandbox = /** @class */ (function () {
    function DiffSandbox(rootPath, sandboxDir) {
        this.rootPath = rootPath;
        this.sandboxDir = sandboxDir;
        this.diffs = new Map();
        this.checkpoints = [];
        this.ensureSandboxDir();
    }
    DiffSandbox.prototype.ensureSandboxDir = function () {
        if (!fs.existsSync(this.sandboxDir)) {
            fs.mkdirSync(this.sandboxDir, { recursive: true });
        }
    };
    /**
     * Generate a unique diff ID
     */
    DiffSandbox.prototype.generateDiffId = function () {
        return crypto.randomBytes(8).toString('hex');
    };
    /**
     * Add a proposed file change to the sandbox
     */
    DiffSandbox.prototype.addDiff = function (filePath, proposedContent, description) {
        var absolutePath = path.resolve(this.rootPath, filePath);
        var originalContent = fs.existsSync(absolutePath)
            ? fs.readFileSync(absolutePath, 'utf-8')
            : null;
        var diff = {
            id: this.generateDiffId(),
            filePath: filePath,
            originalContent: originalContent,
            proposedContent: proposedContent,
            status: 'pending',
            createdAt: new Date(),
            description: description,
        };
        this.diffs.set(diff.id, diff);
        // Save to sandbox for persistence
        this.saveDiffToSandbox(diff);
        return diff;
    };
    /**
     * Update an existing diff
     */
    DiffSandbox.prototype.updateDiff = function (diffId, proposedContent) {
        var diff = this.diffs.get(diffId);
        if (!diff || diff.status !== 'pending') {
            return null;
        }
        diff.proposedContent = proposedContent;
        this.saveDiffToSandbox(diff);
        return diff;
    };
    /**
     * Save diff to sandbox directory
     */
    DiffSandbox.prototype.saveDiffToSandbox = function (diff) {
        var diffPath = path.join(this.sandboxDir, "".concat(diff.id, ".json"));
        fs.writeFileSync(diffPath, JSON.stringify(diff, null, 2));
    };
    /**
     * Get all pending diffs
     */
    DiffSandbox.prototype.getPendingDiffs = function () {
        return Array.from(this.diffs.values()).filter(function (d) { return d.status === 'pending'; });
    };
    /**
     * Get diff by ID
     */
    DiffSandbox.prototype.getDiff = function (diffId) {
        return this.diffs.get(diffId) || null;
    };
    /**
     * Get diff for a specific file
     */
    DiffSandbox.prototype.getDiffForFile = function (filePath) {
        for (var _i = 0, _a = this.diffs.values(); _i < _a.length; _i++) {
            var diff = _a[_i];
            if (diff.filePath === filePath && diff.status === 'pending') {
                return diff;
            }
        }
        return null;
    };
    /**
     * Approve a diff
     */
    DiffSandbox.prototype.approveDiff = function (diffId) {
        var diff = this.diffs.get(diffId);
        if (!diff || diff.status !== 'pending') {
            return false;
        }
        diff.status = 'approved';
        this.saveDiffToSandbox(diff);
        return true;
    };
    /**
     * Reject a diff
     */
    DiffSandbox.prototype.rejectDiff = function (diffId) {
        var diff = this.diffs.get(diffId);
        if (!diff || diff.status !== 'pending') {
            return false;
        }
        diff.status = 'rejected';
        this.saveDiffToSandbox(diff);
        return true;
    };
    /**
     * Apply an approved diff to the file system
     */
    DiffSandbox.prototype.applyDiff = function (diffId) {
        var diff = this.diffs.get(diffId);
        if (!diff || diff.status !== 'approved') {
            return false;
        }
        var absolutePath = path.resolve(this.rootPath, diff.filePath);
        // Ensure directory exists
        var dir = path.dirname(absolutePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // Write the file
        fs.writeFileSync(absolutePath, diff.proposedContent, 'utf-8');
        diff.status = 'applied';
        this.saveDiffToSandbox(diff);
        return true;
    };
    /**
     * Apply all approved diffs
     */
    DiffSandbox.prototype.applyAllApproved = function () {
        var applied = [];
        var failed = [];
        for (var _i = 0, _a = this.diffs.values(); _i < _a.length; _i++) {
            var diff = _a[_i];
            if (diff.status === 'approved') {
                if (this.applyDiff(diff.id)) {
                    applied.push(diff.filePath);
                }
                else {
                    failed.push(diff.filePath);
                }
            }
        }
        return { applied: applied, failed: failed };
    };
    /**
     * Create a checkpoint of current diffs
     */
    DiffSandbox.prototype.createCheckpoint = function (name, description) {
        var checkpoint = {
            id: crypto.randomBytes(8).toString('hex'),
            name: name,
            timestamp: new Date(),
            diffIds: Array.from(this.diffs.keys()),
            description: description,
        };
        this.checkpoints.push(checkpoint);
        this.saveCheckpoint(checkpoint);
        return checkpoint;
    };
    /**
     * Save checkpoint to sandbox
     */
    DiffSandbox.prototype.saveCheckpoint = function (checkpoint) {
        var checkpointsPath = path.join(this.sandboxDir, 'checkpoints.json');
        var checkpoints = fs.existsSync(checkpointsPath)
            ? JSON.parse(fs.readFileSync(checkpointsPath, 'utf-8'))
            : [];
        checkpoints.push(checkpoint);
        fs.writeFileSync(checkpointsPath, JSON.stringify(checkpoints, null, 2));
    };
    /**
     * Rollback to a checkpoint
     */
    DiffSandbox.prototype.rollbackToCheckpoint = function (checkpointId) {
        var checkpointIndex = this.checkpoints.findIndex(function (c) { return c.id === checkpointId; });
        if (checkpointIndex === -1) {
            return false;
        }
        var checkpoint = this.checkpoints[checkpointIndex];
        // Remove diffs created after this checkpoint
        var validDiffIds = new Set(checkpoint.diffIds);
        for (var _i = 0, _a = this.diffs; _i < _a.length; _i++) {
            var _b = _a[_i], diffId = _b[0], diff = _b[1];
            if (!validDiffIds.has(diffId)) {
                // Revert applied changes
                if (diff.status === 'applied' && diff.originalContent !== null) {
                    var absolutePath = path.resolve(this.rootPath, diff.filePath);
                    fs.writeFileSync(absolutePath, diff.originalContent, 'utf-8');
                }
                else if (diff.status === 'applied' && diff.originalContent === null) {
                    // Delete new file
                    var absolutePath = path.resolve(this.rootPath, diff.filePath);
                    if (fs.existsSync(absolutePath)) {
                        fs.unlinkSync(absolutePath);
                    }
                }
                this.diffs.delete(diffId);
            }
        }
        // Remove later checkpoints
        this.checkpoints = this.checkpoints.slice(0, checkpointIndex + 1);
        return true;
    };
    /**
     * Get all checkpoints
     */
    DiffSandbox.prototype.getCheckpoints = function () {
        return __spreadArray([], this.checkpoints, true);
    };
    /**
     * Generate unified diff format for a file diff
     */
    DiffSandbox.prototype.generateUnifiedDiff = function (diff) {
        var _a, _b;
        var originalLines = (diff.originalContent || '').split('\n');
        var proposedLines = diff.proposedContent.split('\n');
        var output = [
            "--- a/".concat(diff.filePath),
            "+++ b/".concat(diff.filePath),
        ];
        // Simple line-by-line diff
        var maxLines = Math.max(originalLines.length, proposedLines.length);
        var hunkStart = -1;
        var hunk = [];
        var flushHunk = function () {
            if (hunk.length > 0 && hunkStart >= 0) {
                output.push("@@ -".concat(hunkStart + 1, ",").concat(originalLines.length, " +").concat(hunkStart + 1, ",").concat(proposedLines.length, " @@"));
                output.push.apply(output, hunk);
                hunk = [];
            }
        };
        for (var i = 0; i < maxLines; i++) {
            var orig = (_a = originalLines[i]) !== null && _a !== void 0 ? _a : '';
            var prop = (_b = proposedLines[i]) !== null && _b !== void 0 ? _b : '';
            if (orig !== prop) {
                if (hunkStart === -1) {
                    hunkStart = Math.max(0, i - 3);
                    // Add context lines
                    for (var j = hunkStart; j < i; j++) {
                        hunk.push(" ".concat(originalLines[j] || ''));
                    }
                }
                if (originalLines[i] !== undefined) {
                    hunk.push("-".concat(orig));
                }
                if (proposedLines[i] !== undefined) {
                    hunk.push("+".concat(prop));
                }
            }
            else if (hunk.length > 0) {
                hunk.push(" ".concat(orig));
                if (hunk.filter(function (l) { return !l.startsWith(' '); }).length === 0) {
                    flushHunk();
                    hunkStart = -1;
                }
            }
        }
        flushHunk();
        return output.join('\n');
    };
    /**
     * Get summary of all diffs
     */
    DiffSandbox.prototype.getSummary = function () {
        var pending = this.getPendingDiffs();
        var approved = Array.from(this.diffs.values()).filter(function (d) { return d.status === 'approved'; });
        var applied = Array.from(this.diffs.values()).filter(function (d) { return d.status === 'applied'; });
        var rejected = Array.from(this.diffs.values()).filter(function (d) { return d.status === 'rejected'; });
        return [
            "Diff Sandbox Summary:",
            "  Pending: ".concat(pending.length),
            "  Approved: ".concat(approved.length),
            "  Applied: ".concat(applied.length),
            "  Rejected: ".concat(rejected.length),
            "  Checkpoints: ".concat(this.checkpoints.length),
        ].join('\n');
    };
    /**
     * Clear all diffs
     */
    DiffSandbox.prototype.clear = function () {
        this.diffs.clear();
        this.checkpoints = [];
        // Clear sandbox directory
        if (fs.existsSync(this.sandboxDir)) {
            var files = fs.readdirSync(this.sandboxDir);
            for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
                var file = files_1[_i];
                fs.unlinkSync(path.join(this.sandboxDir, file));
            }
        }
    };
    return DiffSandbox;
}());
exports.DiffSandbox = DiffSandbox;
/**
 * Plan Service - Manages Plan/Build mode workflow
 */
var PlanService = /** @class */ (function () {
    function PlanService(options) {
        var _a, _b;
        this.mode = 'PLAN';
        this.options = {
            rootPath: options.rootPath,
            sandboxDir: options.sandboxDir || path.join(options.rootPath, '.borg', 'sandbox'),
            autoCheckpoint: (_a = options.autoCheckpoint) !== null && _a !== void 0 ? _a : true,
            maxCheckpoints: (_b = options.maxCheckpoints) !== null && _b !== void 0 ? _b : 20,
        };
        this.sandbox = new DiffSandbox(this.options.rootPath, this.options.sandboxDir);
    }
    /**
     * Get current mode
     */
    PlanService.prototype.getMode = function () {
        return this.mode;
    };
    /**
     * Switch to PLAN mode
     */
    PlanService.prototype.enterPlanMode = function () {
        if (this.mode !== 'PLAN' && this.options.autoCheckpoint) {
            this.sandbox.createCheckpoint('mode-switch-to-plan', 'Auto-checkpoint before switching to PLAN mode');
        }
        this.mode = 'PLAN';
    };
    /**
     * Switch to BUILD mode
     */
    PlanService.prototype.enterBuildMode = function () {
        if (this.mode !== 'BUILD' && this.options.autoCheckpoint) {
            this.sandbox.createCheckpoint('mode-switch-to-build', 'Auto-checkpoint before switching to BUILD mode');
        }
        this.mode = 'BUILD';
    };
    /**
     * Propose a file change (any mode, but only applied in BUILD mode)
     */
    PlanService.prototype.proposeChange = function (filePath, content, description) {
        return this.sandbox.addDiff(filePath, content, description);
    };
    /**
     * Read a file (considers pending diffs in sandbox)
     */
    PlanService.prototype.readFile = function (filePath) {
        // Check if there's a pending diff for this file
        var diff = this.sandbox.getDiffForFile(filePath);
        if (diff) {
            return diff.proposedContent;
        }
        // Read from filesystem
        var absolutePath = path.resolve(this.options.rootPath, filePath);
        if (fs.existsSync(absolutePath)) {
            return fs.readFileSync(absolutePath, 'utf-8');
        }
        return null;
    };
    /**
     * Get pending diffs
     */
    PlanService.prototype.getPendingChanges = function () {
        return this.sandbox.getPendingDiffs();
    };
    /**
     * Review a specific diff
     */
    PlanService.prototype.reviewDiff = function (diffId) {
        var diff = this.sandbox.getDiff(diffId);
        if (!diff)
            return null;
        return {
            diff: diff,
            unifiedDiff: this.sandbox.generateUnifiedDiff(diff),
        };
    };
    /**
     * Approve a diff
     */
    PlanService.prototype.approveDiff = function (diffId) {
        return this.sandbox.approveDiff(diffId);
    };
    /**
     * Reject a diff
     */
    PlanService.prototype.rejectDiff = function (diffId) {
        return this.sandbox.rejectDiff(diffId);
    };
    /**
     * Apply all approved diffs (only in BUILD mode)
     */
    PlanService.prototype.applyApprovedChanges = function () {
        if (this.mode !== 'BUILD') {
            return null; // Can only apply in BUILD mode
        }
        if (this.options.autoCheckpoint) {
            this.sandbox.createCheckpoint('pre-apply', 'Auto-checkpoint before applying changes');
        }
        return this.sandbox.applyAllApproved();
    };
    /**
     * Create a manual checkpoint
     */
    PlanService.prototype.createCheckpoint = function (name, description) {
        return this.sandbox.createCheckpoint(name, description);
    };
    /**
     * Rollback to a checkpoint
     */
    PlanService.prototype.rollback = function (checkpointId) {
        return this.sandbox.rollbackToCheckpoint(checkpointId);
    };
    /**
     * Get all checkpoints
     */
    PlanService.prototype.getCheckpoints = function () {
        return this.sandbox.getCheckpoints();
    };
    /**
     * Get status summary
     */
    PlanService.prototype.getStatus = function () {
        return [
            "Mode: ".concat(this.mode),
            this.sandbox.getSummary(),
        ].join('\n');
    };
    /**
     * Clear all pending changes
     */
    PlanService.prototype.clearPendingChanges = function () {
        this.sandbox.clear();
    };
    /**
     * Get the diff sandbox (for advanced operations)
     */
    PlanService.prototype.getSandbox = function () {
        return this.sandbox;
    };
    return PlanService;
}());
exports.PlanService = PlanService;
exports.default = PlanService;
