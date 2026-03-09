export async function saveToolSetCompatibility(name, description, session, saveToolSet) {
    const tools = session.getLoadedToolNames();
    if (tools.length === 0) {
        return {
            isError: true,
            content: [{ type: 'text', text: 'No tools currently loaded to save.' }],
        };
    }

    const toolSet = {
        name,
        description,
        tools,
    };

    await saveToolSet(toolSet);
    return {
        isError: false,
        content: [{ type: 'text', text: `Tool Set '${toolSet.name}' saved with ${tools.length} tools.` }],
    };
}

export async function loadToolSetCompatibility(toolSetName, toolSets, session) {
    const toolSet = toolSets.find((candidate) => candidate.name === toolSetName);

    if (!toolSet) {
        return {
            isError: true,
            content: [{ type: 'text', text: `Tool Set '${toolSetName}' not found.` }],
        };
    }

    let loadedCount = 0;
    const missing = [];

    for (const toolName of toolSet.tools) {
        if (!session.hasTool(toolName)) {
            missing.push(toolName);
            continue;
        }

        const loadResult = session.loadToolIntoSession(toolName);
        if (loadResult.loaded) {
            loadedCount += 1;
        }
    }

    let message = `Loaded ${loadedCount} tools from set '${toolSet.name}'.`;
    if (missing.length > 0) {
        message += ` Warning: ${missing.length} tools could not be found (might be offline): ${missing.join(', ')}`;
    }

    return {
        isError: false,
        content: [{ type: 'text', text: message }],
    };
}

export function listToolSetsCompatibility(toolSets) {
    return {
        isError: false,
        content: [{
            type: 'text',
            text: JSON.stringify(toolSets.map((toolSet) => ({
                name: toolSet.name,
                description: toolSet.description ?? '',
                tools: toolSet.tools,
                toolCount: toolSet.tools.length,
            })), null, 2),
        }],
    };
}

export async function executeCompatibleSaveToolSet(args, session, toolSetStore) {
    try {
        return await saveToolSetCompatibility(
            typeof args.name === 'string' ? args.name : '',
            typeof args.description === 'string' ? args.description : null,
            session,
            toolSetStore.saveToolSet,
        );
    } catch (error) {
        return {
            isError: true,
            content: [{ type: 'text', text: `Failed to save tool set: ${error instanceof Error ? error.message : String(error)}` }],
        };
    }
}

export async function executeCompatibleLoadToolSet(args, session, toolSetStore) {
    try {
        return await loadToolSetCompatibility(
            typeof args.name === 'string' ? args.name : '',
            await toolSetStore.loadToolSets(),
            session,
        );
    } catch (error) {
        return {
            isError: true,
            content: [{ type: 'text', text: `Failed to load tool set: ${error instanceof Error ? error.message : String(error)}` }],
        };
    }
}

export async function executeCompatibleListToolSets(toolSetStore) {
    try {
        return listToolSetsCompatibility(await toolSetStore.loadToolSets());
    } catch (error) {
        return {
            isError: true,
            content: [{ type: 'text', text: `Failed to list tool sets: ${error instanceof Error ? error.message : String(error)}` }],
        };
    }
}