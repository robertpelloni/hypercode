import { describe, expect, it } from 'vitest';

import { getCompatibilityToolDefinitions } from '../../src/mcp/compatibilityToolDefinitions.ts';
import { getToolLoadingDefinitions } from '../../src/mcp/toolLoadingDefinitions.ts';

describe('compatibilityToolDefinitions', () => {
    it('returns the shared compatibility tool definitions including toolset_list', () => {
        const tools = getCompatibilityToolDefinitions();
        const names = tools.map((tool) => tool.name);

        expect(names).toEqual([
            'run_code',
            'run_python',
            'run_agent',
            'save_memory',
            'search_memory',
            'save_script',
            'save_tool_set',
            'load_tool_set',
            'toolset_list',
            'import_mcp_config',
        ]);
    });

    it('allows description overrides without changing schemas', () => {
        const [runCode] = getCompatibilityToolDefinitions({
            descriptions: {
                run_code: 'custom run code description',
            },
        });

        expect(runCode.description).toBe('custom run code description');
        expect(runCode.inputSchema).toEqual({
            type: 'object',
            properties: {
                code: {
                    type: 'string',
                    description: 'The TypeScript/JavaScript code to execute. Top-level await is supported.',
                },
            },
            required: ['code'],
        });
    });

    it('returns the shared tool-loading definitions in the expected order', () => {
        const names = getToolLoadingDefinitions().map((tool) => tool.name);

        expect(names).toEqual([
            'search_tools',
            'load_tool',
            'get_tool_schema',
            'unload_tool',
            'list_loaded_tools',
        ]);
    });

    it('allows tool-loading description overrides without changing schemas', () => {
        const [searchTools] = getToolLoadingDefinitions({
            descriptions: {
                search_tools: 'custom search description',
            },
        });

        expect(searchTools.description).toBe('custom search description');
        expect(searchTools.inputSchema).toEqual({
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Tool intent or keyword search query.' },
                limit: { type: 'number', description: 'Maximum number of results to return (default 10).' },
            },
            required: ['query'],
        });
    });
});