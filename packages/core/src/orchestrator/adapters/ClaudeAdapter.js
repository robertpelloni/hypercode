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
exports.ClaudeAdapter = void 0;
var AgentAdapter_js_1 = require("../AgentAdapter.js");
var ClaudeAdapter = /** @class */ (function (_super) {
    __extends(ClaudeAdapter, _super);
    function ClaudeAdapter() {
        var config = {
            name: 'Claude Code',
            command: 'claude', // Assumes 'claude' is in PATH. Alternatively: 'npx', args: ['@anthropic-ai/claude-code']
            args: ['--non-interactive'], // Attempt to force non-interactive mode if available, or just run
            // Note: Claude Code is highly interactive. Automation might be tricky without a PTY.
            // For now, we assume simple stdio piping works for basic prompts.
        };
        return _super.call(this, config) || this;
    }
    return ClaudeAdapter;
}(AgentAdapter_js_1.AgentAdapter));
exports.ClaudeAdapter = ClaudeAdapter;
