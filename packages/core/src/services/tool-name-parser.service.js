"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseToolName = parseToolName;
exports.createToolName = createToolName;
/**
 * Parse a MetaMCP tool name into server prefix and tool name components
 *
 * @param toolName - Full tool name (e.g., "Server__tool" or "Parent__Child__tool")
 * @returns Parsed components or null if invalid format
 */
function parseToolName(toolName) {
    var firstDoubleUnderscoreIndex = toolName.indexOf("__");
    if (firstDoubleUnderscoreIndex === -1) {
        return null;
    }
    // The first __ is always the separator between the top-level server prefix and the forwarded tool name
    // Everything before the first __ is the server prefix (which may contain nested servers)
    // Everything after the first __ is the forwarded tool name (which may itself include additional prefixes)
    var serverName = toolName.substring(0, firstDoubleUnderscoreIndex);
    var originalToolName = toolName.substring(firstDoubleUnderscoreIndex + 2);
    return {
        serverName: serverName,
        originalToolName: originalToolName,
    };
}
/**
 * Create a tool name from server prefix and tool name
 *
 * @param serverName - Server prefix (can be nested like "Parent__Child")
 * @param toolName - Tool name
 * @returns Full tool name
 */
function createToolName(serverName, toolName) {
    return "".concat(serverName, "__").concat(toolName);
}
