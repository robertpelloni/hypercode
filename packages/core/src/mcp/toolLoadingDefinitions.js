const baseDefinitions = {
    search_tools: {
        name: 'search_tools',
        description: 'Search Borg-managed downstream MCP tools without exposing every schema at once.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Tool intent or keyword search query.' },
                limit: { type: 'number', description: 'Maximum number of results to return (default 10).' },
            },
            required: ['query'],
        },
    },
    load_tool: {
        name: 'load_tool',
        description: 'Load a downstream MCP tool into the current Borg session working set.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Full tool name, for example github__create_issue.' },
            },
            required: ['name'],
        },
    },
    get_tool_schema: {
        name: 'get_tool_schema',
        description: 'Hydrate the full schema for a loaded downstream tool in the current Borg session.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Full tool name to hydrate.' },
            },
            required: ['name'],
        },
    },
    unload_tool: {
        name: 'unload_tool',
        description: 'Remove a downstream tool from the current Borg session working set.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Full tool name to unload.' },
            },
            required: ['name'],
        },
    },
    list_loaded_tools: {
        name: 'list_loaded_tools',
        description: 'List downstream tools currently loaded into the Borg session working set.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
};

const toolLoadingOrder = [
    'search_tools',
    'load_tool',
    'get_tool_schema',
    'unload_tool',
    'list_loaded_tools',
];

export function getToolLoadingDefinitions(overrides = {}) {
    return toolLoadingOrder.map((name) => ({
        ...baseDefinitions[name],
        description: overrides.descriptions?.[name] ?? baseDefinitions[name].description,
    }));
}