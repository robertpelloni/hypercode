import type { Tool } from '@modelcontextprotocol/sdk/types.js';

type ToolLoadingName = 'search_tools' | 'load_tool' | 'get_tool_schema' | 'get_tool_context' | 'unload_tool' | 'list_loaded_tools';

interface ToolLoadingDefinitionOverrides {
    descriptions?: Partial<Record<ToolLoadingName, string>>;
}

const baseDefinitions: Record<ToolLoadingName, Tool> = {
    search_tools: {
        name: 'search_tools',
        description: 'Search Borg-managed downstream MCP tools and return compact ranked matches with why each result matched, whether it is already loaded, and whether full schema hydration is still needed.',
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
        description: 'Load a downstream MCP tool into the current Borg session working set so it becomes visible for use without hydrating every schema up front.',
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
        description: 'Hydrate the full schema for a loaded downstream tool when deferred search/load metadata is not enough to execute it safely.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Full tool name to hydrate.' },
            },
            required: ['name'],
        },
    },
    get_tool_context: {
        name: 'get_tool_context',
        description: 'Retrieve compact, JIT memory context that may be relevant before calling a downstream tool, based on recent observations, summaries, and touched files.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Full downstream tool name, for example github__create_issue.' },
                arguments: { type: 'object', description: 'Optional downstream tool arguments used to match recent file and task context.' },
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

const toolLoadingOrder: ToolLoadingName[] = [
    'search_tools',
    'load_tool',
    'get_tool_schema',
    'get_tool_context',
    'unload_tool',
    'list_loaded_tools',
];

export function getToolLoadingDefinitions(overrides: ToolLoadingDefinitionOverrides = {}): Tool[] {
    return toolLoadingOrder.map((name) => ({
        ...baseDefinitions[name],
        description: overrides.descriptions?.[name] ?? baseDefinitions[name].description,
    }));
}