"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolRegistry = void 0;
var ToolRegistry = /** @class */ (function () {
    function ToolRegistry() {
        this.tools = new Map();
    }
    ToolRegistry.prototype.registerTool = function (tool, mcpServerUuid, serverName) {
        this.tools.set(tool.name, { tool: tool, mcpServerUuid: mcpServerUuid, serverName: serverName });
    };
    ToolRegistry.prototype.registerTools = function (tools, mcpServerUuid, serverName) {
        var _this = this;
        tools.forEach(function (tool) { return _this.registerTool(tool, mcpServerUuid, serverName); });
    };
    ToolRegistry.prototype.getAllTools = function () {
        return Array.from(this.tools.values());
    };
    ToolRegistry.prototype.getTool = function (name) {
        return this.tools.get(name);
    };
    ToolRegistry.prototype.getToolsByServer = function (serverName) {
        return Array.from(this.tools.values()).filter(function (t) { return t.serverName === serverName; });
    };
    ToolRegistry.prototype.deleteTool = function (name) {
        this.tools.delete(name);
    };
    ToolRegistry.prototype.clear = function () {
        this.tools.clear();
    };
    return ToolRegistry;
}());
exports.toolRegistry = new ToolRegistry();
