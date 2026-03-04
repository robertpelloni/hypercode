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
exports.toolsSyncCache = exports.ToolsSyncCache = void 0;
var crypto_1 = require("crypto");
/**
 * Simple in-memory cache for tool synchronization
 * Tracks the hash of tools per MCP server to avoid unnecessary DB operations
 */
var ToolsSyncCache = /** @class */ (function () {
    function ToolsSyncCache() {
        this.cache = new Map();
    }
    /**
     * Generate a hash from tool names
     * Only tool names are used since they uniquely identify tools per server
     */
    ToolsSyncCache.prototype.hashTools = function (toolNames) {
        // Sort to ensure consistent hash regardless of order
        var sorted = __spreadArray([], toolNames, true).sort();
        var joined = sorted.join("|");
        return crypto_1.default.createHash("sha256").update(joined).digest("hex");
    };
    /**
     * Check if tools have changed since last sync
     * @returns true if tools changed or no cache exists, false if unchanged
     */
    ToolsSyncCache.prototype.hasChanged = function (mcpServerUuid, toolNames) {
        var currentHash = this.hashTools(toolNames);
        var cachedHash = this.cache.get(mcpServerUuid);
        return cachedHash !== currentHash;
    };
    /**
     * Update the cache with current tool state
     */
    ToolsSyncCache.prototype.update = function (mcpServerUuid, toolNames) {
        var hash = this.hashTools(toolNames);
        this.cache.set(mcpServerUuid, hash);
    };
    /**
     * Check if sync is needed and update cache if it is
     * @returns true if sync needed, false if cache hit
     */
    ToolsSyncCache.prototype.shouldSync = function (mcpServerUuid, toolNames) {
        var needsSync = this.hasChanged(mcpServerUuid, toolNames);
        if (needsSync) {
            this.update(mcpServerUuid, toolNames);
        }
        return needsSync;
    };
    /**
     * Clear cache for specific server or entire cache
     */
    ToolsSyncCache.prototype.clear = function (mcpServerUuid) {
        if (mcpServerUuid) {
            this.cache.delete(mcpServerUuid);
        }
        else {
            this.cache.clear();
        }
    };
    /**
     * Get cache statistics
     */
    ToolsSyncCache.prototype.getStats = function () {
        return {
            size: this.cache.size,
            servers: Array.from(this.cache.keys()),
        };
    };
    return ToolsSyncCache;
}());
exports.ToolsSyncCache = ToolsSyncCache;
// Singleton instance
exports.toolsSyncCache = new ToolsSyncCache();
