export function getAllowedToolsMetadataGuardResult(toolName, meta) {
    const allowedTools = meta?.allowedTools;

    if (Array.isArray(allowedTools) && !allowedTools.includes(toolName)) {
        return {
            content: [{
                type: 'text',
                text: `Access denied: Tool '${toolName}' is not in the allowed tools list for this agent.`,
            }],
            isError: true,
        };
    }

    return null;
}