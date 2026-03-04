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
exports.metamcpLogStore = void 0;
var MetaMcpLogStore = /** @class */ (function () {
    function MetaMcpLogStore() {
        this.logs = [];
        this.maxLogs = 1000; // Keep only the last 1000 logs
        this.listeners = new Set();
    }
    MetaMcpLogStore.prototype.addLog = function (serverName, level, message, error) {
        var logEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            serverName: serverName,
            level: level,
            message: message,
            error: error
                ? error instanceof Error
                    ? error.message
                    : String(error)
                : undefined,
        };
        // Add to logs array
        this.logs.push(logEntry);
        // Keep only the last maxLogs entries
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        // Also log to console for debugging
        var fullMessage = "[MetaMCP][".concat(serverName, "] ").concat(message);
        switch (level) {
            case "error":
                console.error(fullMessage, error || "");
                break;
            case "warn":
                console.warn(fullMessage, error || "");
                break;
            case "info":
                console.info(fullMessage, error || "");
                break;
        }
        // Notify listeners
        this.listeners.forEach(function (listener) {
            try {
                listener(logEntry);
            }
            catch (err) {
                console.error("Error notifying log listener:", err);
            }
        });
    };
    MetaMcpLogStore.prototype.getLogs = function (limit) {
        var logsToReturn = limit ? this.logs.slice(-limit) : this.logs;
        return __spreadArray([], logsToReturn, true).reverse(); // Return newest first
    };
    MetaMcpLogStore.prototype.clearLogs = function () {
        this.logs = [];
    };
    MetaMcpLogStore.prototype.addListener = function (listener) {
        var _this = this;
        this.listeners.add(listener);
        return function () { return _this.listeners.delete(listener); };
    };
    MetaMcpLogStore.prototype.getLogCount = function () {
        return this.logs.length;
    };
    return MetaMcpLogStore;
}());
// Singleton instance
exports.metamcpLogStore = new MetaMcpLogStore();
