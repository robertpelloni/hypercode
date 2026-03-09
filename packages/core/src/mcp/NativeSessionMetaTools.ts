import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';

import { SessionToolWorkingSet } from './SessionToolWorkingSet.js';
import { getToolLoadingDefinitions } from './toolLoadingDefinitions.js';
import {
    executeGetToolSchemaCompatibility,
    executeListLoadedToolsCompatibility,
    executeLoadToolCompatibility,
    executeSearchToolsCompatibility,
    executeUnloadToolCompatibility,
} from './toolLoadingCompatibility.js';

interface SearchToolResult {
    name: string;
    description: string;
    loaded: boolean;
    hydrated: boolean;
}

function createTextResult(text: string, isError = false): CallToolResult {
    return {
        content: [{ type: 'text', text }],
        isError,
    };
}

export class NativeSessionMetaTools {
    private readonly workingSet: SessionToolWorkingSet;
    private readonly catalog = new Map<string, Tool>();

    constructor(workingSet: SessionToolWorkingSet = new SessionToolWorkingSet()) {
        this.workingSet = workingSet;
    }

    public refreshCatalog(tools: Tool[]): void {
        this.catalog.clear();
        tools.forEach((tool) => {
            this.catalog.set(tool.name, tool);
        });
    }

    public listToolDefinitions(): Tool[] {
        return getToolLoadingDefinitions();
    }

    public getVisibleLoadedTools(): Tool[] {
        return this.workingSet.listLoadedTools()
            .map((entry) => {
                const tool = this.catalog.get(entry.name);
                if (!tool) {
                    return null;
                }

                if (entry.hydrated) {
                    return tool;
                }

                return this.toMinimalTool(tool);
            })
            .filter((tool): tool is Tool => tool !== null);
    }

    public getLoadedToolNames(): string[] {
        return this.workingSet.getLoadedToolNames();
    }

    public hasTool(name: string): boolean {
        return this.catalog.has(name);
    }

    public loadToolIntoSession(name: string): { loaded: boolean; evicted: string[] } {
        if (!this.catalog.has(name)) {
            return { loaded: false, evicted: [] };
        }

        return {
            loaded: true,
            evicted: this.workingSet.loadTool(name),
        };
    }

    public async handleToolCall(name: string, args: Record<string, unknown>): Promise<CallToolResult | null> {
        if (name === 'search_tools') {
            return await executeSearchToolsCompatibility(args, (query, limit) => this.searchTools(query, limit));
        }

        if (name === 'load_tool') {
            return await executeLoadToolCompatibility(args, (toolName) => this.catalog.has(toolName), this.workingSet);
        }

        if (name === 'get_tool_schema') {
            return await executeGetToolSchemaCompatibility(
                args,
                (toolName) => this.catalog.get(toolName) ?? null,
                this.workingSet,
                (tool, evictedHydratedTools) => ({
                    name: tool.name,
                    description: tool.description ?? '',
                    inputSchema: tool.inputSchema ?? { type: 'object', properties: {} },
                    evictedHydratedTools,
                }),
            );
        }

        if (name === 'unload_tool') {
            return await executeUnloadToolCompatibility(args, this.workingSet);
        }

        if (name === 'list_loaded_tools') {
            return await executeListLoadedToolsCompatibility(this.workingSet);
        }

        return null;
    }

    private searchTools(query: string, limit: number): SearchToolResult[] {
        const normalizedQuery = query.trim().toLowerCase();
        const matches = Array.from(this.catalog.values())
            .filter((tool) => {
                if (!normalizedQuery) {
                    return true;
                }

                const haystack = `${tool.name} ${tool.description ?? ''}`.toLowerCase();
                return haystack.includes(normalizedQuery);
            })
            .slice(0, Math.max(1, limit));

        return matches.map((tool) => ({
            name: tool.name,
            description: tool.description ?? '',
            loaded: this.workingSet.isLoaded(tool.name),
            hydrated: this.workingSet.isHydrated(tool.name),
        }));
    }

    private toMinimalTool(tool: Tool): Tool {
        return {
            name: tool.name,
            description: `[Deferred] ${tool.description ?? 'No description'}`,
            inputSchema: {
                type: 'object',
                properties: {},
            },
        };
    }
}