"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextManager = void 0;
var fs = require("fs");
var path = require("path");
var ContextManager = /** @class */ (function () {
    function ContextManager() {
        this.pinnedFiles = new Set();
        this.maxTokenLimit = 8000; // Rough text character limit
    }
    ContextManager.prototype.add = function (filePath) {
        var absolutePath = path.resolve(process.cwd(), filePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error("File not found: ".concat(filePath));
        }
        if (fs.statSync(absolutePath).isDirectory()) {
            throw new Error("Cannot pin directory: ".concat(filePath));
        }
        this.pinnedFiles.add(absolutePath);
        return "\uD83D\uDCCC Pinned: ".concat(path.basename(absolutePath));
    };
    ContextManager.prototype.remove = function (filePath) {
        var absolutePath = path.resolve(process.cwd(), filePath);
        // Try exact match first
        if (this.pinnedFiles.has(absolutePath)) {
            this.pinnedFiles.delete(absolutePath);
            return "\uD83D\uDDD1\uFE0F Unpinned: ".concat(path.basename(absolutePath));
        }
        // Try fuzzy match on basename
        for (var _i = 0, _a = this.pinnedFiles; _i < _a.length; _i++) {
            var file = _a[_i];
            if (path.basename(file) === filePath) {
                this.pinnedFiles.delete(file);
                return "\uD83D\uDDD1\uFE0F Unpinned: ".concat(path.basename(file));
            }
        }
        return "File not found in pinned context: ".concat(filePath);
    };
    ContextManager.prototype.list = function () {
        return Array.from(this.pinnedFiles);
    };
    ContextManager.prototype.clear = function () {
        var count = this.pinnedFiles.size;
        this.pinnedFiles.clear();
        return "Cleared ".concat(count, " pinned files.");
    };
    ContextManager.prototype.getContextPrompt = function () {
        if (this.pinnedFiles.size === 0)
            return "";
        var context = "📌 **PINNED CONTEXT (High Priority)**\n\n";
        for (var _i = 0, _a = this.pinnedFiles; _i < _a.length; _i++) {
            var file = _a[_i];
            try {
                var content = fs.readFileSync(file, 'utf-8');
                // Basic truncation to prevent exploding context
                var truncated = content.length > 20000 ? content.substring(0, 20000) + "\n... (truncated)" : content;
                context += "file: ".concat(path.basename(file), "\n```\n").concat(truncated, "\n```\n\n");
            }
            catch (e) {
                context += "file: ".concat(path.basename(file), " (Error reading: ").concat(e.message, ")\n\n");
            }
        }
        return context;
    };
    return ContextManager;
}());
exports.ContextManager = ContextManager;
