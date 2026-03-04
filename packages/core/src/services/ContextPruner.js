"use strict";
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
exports.ContextPruner = void 0;
var ContextPruner = /** @class */ (function () {
    function ContextPruner(options) {
        if (options === void 0) { options = {}; }
        this.options = {
            maxTokens: options.maxTokens || 100000,
            keepLast: options.keepLast || 10,
            keepFirst: options.keepFirst || 1,
            estimatedTokensPerChar: options.estimatedTokensPerChar || 0.25
        };
    }
    /**
     * Estimates token count for a list of messages.
     */
    ContextPruner.prototype.estimateTokens = function (messages) {
        var text = '';
        for (var _i = 0, messages_1 = messages; _i < messages_1.length; _i++) {
            var m = messages_1[_i];
            if (typeof m.content === 'string') {
                text += m.content;
            }
            else if (Array.isArray(m.content)) {
                // Handle Multi-modal content (Text + Image)
                for (var _a = 0, _b = m.content; _a < _b.length; _a++) {
                    var block = _b[_a];
                    if (block.type === 'text')
                        text += block.text;
                }
            }
        }
        return Math.ceil(text.length * (this.options.estimatedTokensPerChar || 0.25));
    };
    /**
     * Prunes messages to fit within maxTokens.
     * Returns the pruned list of messages.
     */
    ContextPruner.prototype.prune = function (messages) {
        var totalTokens = this.estimateTokens(messages);
        if (totalTokens <= this.options.maxTokens) {
            return messages;
        }
        console.log("[ContextPruner] Pruning context: ".concat(totalTokens, " > ").concat(this.options.maxTokens));
        // Strategy:
        // 1. Keep First N (System Instructions)
        // 2. Keep Last M (Recent Dialogue)
        // 3. Drop from the "Middle-Start" until fit.
        var _a = this.options, keepFirst = _a.keepFirst, keepLast = _a.keepLast;
        if (messages.length <= keepFirst + keepLast) {
            console.warn("[ContextPruner] Context exceeded maxTokens but message count is too low to prune safely.");
            return messages;
        }
        var safeFirst = messages.slice(0, keepFirst);
        var safeLast = messages.slice(-keepLast);
        // Candidates for pruning are in the middle
        var middle = messages.slice(keepFirst, -keepLast);
        // Remove from the beginning of the middle block (oldest "active" memories)
        // until we fit or run out of middle messages
        var currentTokens = totalTokens;
        while (middle.length > 0 && currentTokens > this.options.maxTokens) {
            var removed = middle.shift(); // Remove oldest
            if (!removed) {
                break;
            }
            var removedTokens = this.estimateTokens([removed]);
            currentTokens -= removedTokens;
        }
        var originalMiddleLength = messages.slice(keepFirst, -keepLast).length;
        var droppedCount = originalMiddleLength - middle.length;
        if (droppedCount > 0) {
            var summaryMsg = {
                role: 'system',
                content: "[System: Context Pruned. ".concat(droppedCount, " messages were removed to fit token limits.]")
            };
            return __spreadArray(__spreadArray(__spreadArray(__spreadArray([], safeFirst, true), [summaryMsg], false), middle, true), safeLast, true);
        }
        return __spreadArray(__spreadArray(__spreadArray([], safeFirst, true), middle, true), safeLast, true);
    };
    return ContextPruner;
}());
exports.ContextPruner = ContextPruner;
