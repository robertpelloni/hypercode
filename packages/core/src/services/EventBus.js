"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
var events_1 = require("events");
var EventBus = /** @class */ (function (_super) {
    __extends(EventBus, _super);
    function EventBus() {
        var _this = _super.call(this) || this;
        _this.wildcardListeners = [];
        _this.history = [];
        _this.MAX_HISTORY = 1000;
        _this.setMaxListeners(50);
        return _this;
    }
    EventBus.prototype.subscribe = function (pattern, listener) {
        if (pattern.includes('*')) {
            // Convert "file:*" to /^file:.*$/
            var regex = new RegExp("^".concat(pattern.replace(/\*/g, '.*'), "$"));
            this.wildcardListeners.push({ pattern: regex, listener: listener });
        }
        else {
            // Standard exact match — EventEmitter expects string|symbol
            _super.prototype.on.call(this, pattern, listener);
        }
    };
    EventBus.prototype.emitEvent = function (type, source, payload) {
        var event = {
            type: type,
            timestamp: Date.now(),
            source: source,
            payload: payload
        };
        // 0. Store in history
        this.history.push(event);
        if (this.history.length > this.MAX_HISTORY) {
            this.history.shift();
        }
        // 1. Emit exact match
        this.emit('system_event', event);
        this.emit(type, event);
        // 2. Check wildcards
        for (var _i = 0, _a = this.wildcardListeners; _i < _a.length; _i++) {
            var _b = _a[_i], pattern = _b.pattern, listener = _b.listener;
            if (pattern.test(type)) {
                try {
                    listener(event);
                }
                catch (e) {
                    console.error("[EventBus] Error in wildcard listener for ".concat(type, ":"), e);
                }
            }
        }
    };
    EventBus.prototype.onEvent = function (type, listener) {
        this.subscribe(type, listener);
    };
    EventBus.prototype.getHistory = function (limit) {
        if (limit === void 0) { limit = 100; }
        return this.history.slice(-limit);
    };
    return EventBus;
}(events_1.EventEmitter));
exports.EventBus = EventBus;
