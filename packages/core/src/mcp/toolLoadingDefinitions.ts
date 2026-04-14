import type { Tool } from '@modelcontextprotocol/sdk/types.js';

type ToolLoadingName = 'search_tools' | 'search_published_catalog' | 'install_published_server' | 'load_tool' | 'get_tool_schema' | 'get_tool_context' | 'unload_tool' | 'list_loaded_tools' | 'list_all_tools' | 'set_capacity' | 'get_eviction_history' | 'clear_eviction_history' | 'auto_call_tool';

interface ToolLoadingDefinitionOverrides {
    descriptions?: Partial<Record<ToolLoadingName, string>>;
}

const baseDefinitions: Record<ToolLoadingName, Tool> = {
    search_tools: {
        name: 'search_tools',
        description: 'Search HyperCode-managed downstream MCP tools and return compact ranked matches with why each result matched, whether it is already loaded, and whether full schema hydration is still needed.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Tool intent or keyword search query.' },
                limit: { type: 'number', description: 'Maximum number of results to return (default 10).' },
            },
            required: ['query'],
        },
    },
    search_published_catalog: {
        name: 'search_published_catalog',
        description: 'Search the global, definitive Published MCP Catalog for uninstalled tools (e.g., from github, npm, glama, smithery) by keyword. Use this when the active working set does not contain the tool you need.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search term for the tool you want to find.' },
                limit: { type: 'number', description: 'Maximum results to return. Default is 5.' }
            },
            required: ['query'],
        },
    },
    install_published_server: {
        name: 'install_published_server',
        description: 'Install and connect an MCP server dynamically from the Published Catalog using its UUID or Canonical ID. Once installed, its tools become immediately available in the active session.',
        inputSchema: {
            type: 'object',
            properties: {
                identifier: { type: 'string', description: 'The UUID or Canonical ID of the server to install (found via search_published_catalog).' },
            },
            required: ['identifier'],
        },
    },
    load_tool: {
        name: 'load_tool',
        description: 'Load a downstream MCP tool into the current HyperCode session working set so it becomes visible for use without hydrating every schema up front.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Full tool name, for example github__create_issue.' },
            },
            required: ['name'],
        },
    },
    auto_call_tool: {
        name: 'auto_call_tool',
        description: 'One-shot discovery and execution. Automatically searches for the best tool to accomplish an objective, maps the parameters using an LLM, and executes it immediately. Use this when you know what you want to do but don\'t have the exact tool schema loaded.',
        inputSchema: {
            type: 'object',
            properties: {
                objective: {
                    type: 'string',
                    description: 'The objective or task you want to accomplish using a tool.',
                },
                context: {
                    type: 'string',
                    description: 'Any necessary variables, file paths, or text snippets required to fill the tool arguments.',
                },
            },
            required: ['objective', 'context'],
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
        description: 'Remove a downstream tool from the current HyperCode session working set.',
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
        description: 'List downstream tools currently loaded into the HyperCode session working set.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    list_all_tools: {
        name: 'list_all_tools',
        description: 'List all tools HyperCode can currently advertise to the model, including always-visible meta tools, compatibility helpers, native built-ins, saved scripts, and HyperCode-managed downstream MCP tools.',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Optional keyword filter applied across tool names, descriptions, server names, and advertised names.',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of tools to return after filtering. Defaults to 100.',
                },
                category: {
                    type: 'string',
                    description: 'Optional category filter: meta, compatibility, native, saved-script, downstream, or all.',
                    enum: ['all', 'meta', 'compatibility', 'native', 'saved-script', 'downstream'],
                    default: 'all',
                },
            },
        },
    },
    set_capacity: {
        name: 'set_capacity',
        description: 'Reconfigure the session working-set capacity limits at runtime. Changes take effect on the next load or hydrate operation.',
        inputSchema: {
            type: 'object',
            properties: {
                maxLoadedTools: {
                    type: 'number',
                    description: 'Maximum number of tools that may be loaded simultaneously (4..64). Defaults to 16 when not set.',
                },
                maxHydratedSchemas: {
                    type: 'number',
                    description: 'Maximum number of full tool schemas that may be hydrated simultaneously (2..32). Defaults to 8 when not set.',
                },
            },
        },
    },
    get_eviction_history: {
        name: 'get_eviction_history',
        description: 'Return the bounded recent eviction history for the session working set, showing which tools were evicted and when.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    clear_eviction_history: {
        name: 'clear_eviction_history',
        description: 'Clear the bounded eviction-history buffer for the current session working set.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
};

const toolLoadingOrder: ToolLoadingName[] = [
    'search_tools',
    'search_published_catalog',
    'install_published_server',
    'load_tool',
    'auto_call_tool',
    'get_tool_schema',
    'get_tool_context',
    'unload_tool',
    'list_loaded_tools',
    'list_all_tools',
    'set_capacity',
    'get_eviction_history',
    'clear_eviction_history',
];

export function getToolLoadingDefinitions(overrides: ToolLoadingDefinitionOverrides = {}): Tool[] {
    return toolLoadingOrder.map((name) => ({
        ...baseDefinitions[name],
        description: overrides.descriptions?.[name] ?? baseDefinitions[name].description,
    }));
}
