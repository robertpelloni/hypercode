function createTextResult(text, isError = false) {
    return {
        content: [{ type: 'text', text }],
        isError,
    };
}

export async function executeSearchToolsCompatibility(args, searchTools) {
    const query = typeof args.query === 'string' ? args.query : '';
    const limit = typeof args.limit === 'number' ? args.limit : 10;
    const results = await searchTools(query, limit);
    return createTextResult(JSON.stringify(results, null, 2));
}

export async function executeLoadToolCompatibility(args, hasTool, workingSet) {
    const toolName = typeof args.name === 'string' ? args.name : '';
    if (!hasTool(toolName)) {
        return createTextResult(`Tool '${toolName}' not found.`, true);
    }

    const evicted = workingSet.loadTool(toolName);
    const message = evicted.length > 0
        ? `Tool '${toolName}' loaded. Evicted idle tools: ${evicted.join(', ')}.`
        : `Tool '${toolName}' loaded.`;
    return createTextResult(message);
}

export async function executeGetToolSchemaCompatibility(args, getTool, workingSet, serializeSchema, missingToolMessage, onHydrate) {
    const toolName = typeof args.name === 'string' ? args.name : '';
    const tool = getTool(toolName);
    if (!tool) {
        return createTextResult(
            missingToolMessage ? missingToolMessage(toolName) : `Tool '${toolName}' not found.`,
            true,
        );
    }

    const evictedHydratedTools = workingSet.hydrateTool(toolName);
    onHydrate?.(toolName, tool);
    return createTextResult(JSON.stringify(serializeSchema(tool, evictedHydratedTools), null, 2));
}

export async function executeUnloadToolCompatibility(args, workingSet) {
    const toolName = typeof args.name === 'string' ? args.name : '';
    const removed = workingSet.unloadTool(toolName);
    return createTextResult(
        removed
            ? `Tool '${toolName}' unloaded from the current session.`
            : `Tool '${toolName}' was not loaded in the current session.`,
        !removed,
    );
}

export async function executeListLoadedToolsCompatibility(workingSet) {
    return createTextResult(JSON.stringify({
        limits: workingSet.getLimits(),
        tools: workingSet.listLoadedTools(),
    }, null, 2));
}
