"use strict";
/**
 * SymbolPinService - Track and manage pinned code symbols for context prioritization
 */
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
exports.SymbolPinService = void 0;
var SymbolPinService = /** @class */ (function () {
    function SymbolPinService() {
        this.pinnedSymbols = new Map();
    }
    /**
     * Pin a symbol to prioritize it in context
     */
    SymbolPinService.prototype.pin = function (symbol) {
        var _a;
        var id = "".concat(symbol.file, "#").concat(symbol.name);
        var existing = this.pinnedSymbols.get(id);
        var pinned = __assign(__assign({}, symbol), { id: id, addedAt: Date.now(), priority: (_a = existing === null || existing === void 0 ? void 0 : existing.priority) !== null && _a !== void 0 ? _a : this.pinnedSymbols.size + 1 });
        this.pinnedSymbols.set(id, pinned);
        console.log("[SymbolPin] \uD83D\uDCCC Pinned: ".concat(symbol.name, " (").concat(symbol.type, ")"));
        return pinned;
    };
    /**
     * Unpin a symbol
     */
    SymbolPinService.prototype.unpin = function (id) {
        var existed = this.pinnedSymbols.has(id);
        this.pinnedSymbols.delete(id);
        if (existed) {
            console.log("[SymbolPin] \uD83D\uDDD1\uFE0F Unpinned: ".concat(id));
        }
        return existed;
    };
    /**
     * Update priority of a pinned symbol
     */
    SymbolPinService.prototype.updatePriority = function (id, priority) {
        var symbol = this.pinnedSymbols.get(id);
        if (symbol) {
            symbol.priority = priority;
            return true;
        }
        return false;
    };
    /**
     * Add notes to a pinned symbol
     */
    SymbolPinService.prototype.addNotes = function (id, notes) {
        var symbol = this.pinnedSymbols.get(id);
        if (symbol) {
            symbol.notes = notes;
            return true;
        }
        return false;
    };
    /**
     * Get all pinned symbols, sorted by priority (highest first)
     */
    SymbolPinService.prototype.list = function () {
        return Array.from(this.pinnedSymbols.values())
            .sort(function (a, b) { return b.priority - a.priority; });
    };
    /**
     * Get pinned symbols for a specific file
     */
    SymbolPinService.prototype.forFile = function (filePath) {
        return this.list().filter(function (s) { return s.file === filePath; });
    };
    /**
     * Clear all pinned symbols
     */
    SymbolPinService.prototype.clear = function () {
        var count = this.pinnedSymbols.size;
        this.pinnedSymbols.clear();
        console.log("[SymbolPin] Cleared ".concat(count, " pinned symbols"));
        return count;
    };
    /**
     * Get context prompt with prioritized symbols
     */
    SymbolPinService.prototype.getContextPrompt = function () {
        var symbols = this.list();
        if (symbols.length === 0)
            return '';
        var context = '📍 **PINNED SYMBOLS (High Priority)**\n\n';
        for (var _i = 0, symbols_1 = symbols; _i < symbols_1.length; _i++) {
            var sym = symbols_1[_i];
            context += "### ".concat(sym.type, ": `").concat(sym.name, "`\n");
            context += "- File: `".concat(sym.file, "`\n");
            if (sym.lineStart) {
                context += "- Lines: ".concat(sym.lineStart).concat(sym.lineEnd ? "-".concat(sym.lineEnd) : '', "\n");
            }
            if (sym.notes) {
                context += "- Notes: ".concat(sym.notes, "\n");
            }
            context += '\n';
        }
        return context;
    };
    return SymbolPinService;
}());
exports.SymbolPinService = SymbolPinService;
