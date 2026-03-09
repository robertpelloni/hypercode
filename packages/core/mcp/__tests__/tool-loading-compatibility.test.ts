import { describe, expect, it, vi } from 'vitest';

import {
    executeGetToolSchemaCompatibility,
    executeListLoadedToolsCompatibility,
    executeLoadToolCompatibility,
    executeSearchToolsCompatibility,
    executeUnloadToolCompatibility,
} from '../../src/mcp/toolLoadingCompatibility.ts';

describe('toolLoadingCompatibility', () => {
    it('searches tools through the shared helper with the default limit', async () => {
        const searchTools = vi.fn().mockResolvedValue([{ name: 'github__create_issue' }]);

        const result = await executeSearchToolsCompatibility(
            { query: 'github' },
            searchTools,
        );

        expect(searchTools).toHaveBeenCalledWith('github', 10);
        expect(result).toEqual({
            isError: false,
            content: [{
                type: 'text',
                text: JSON.stringify([{ name: 'github__create_issue' }], null, 2),
            }],
        });
    });

    it('loads a tool and reports evictions when present', async () => {
        const loadTool = vi.fn().mockReturnValue(['alpha']);

        const result = await executeLoadToolCompatibility(
            { name: 'github__create_issue' },
            () => true,
            { loadTool },
        );

        expect(loadTool).toHaveBeenCalledWith('github__create_issue');
        expect(result).toEqual({
            isError: false,
            content: [{ type: 'text', text: "Tool 'github__create_issue' loaded. Evicted idle tools: alpha." }],
        });
    });

    it('returns an error when trying to load an unknown tool', async () => {
        const result = await executeLoadToolCompatibility(
            { name: 'missing__tool' },
            () => false,
            { loadTool: vi.fn() },
        );

        expect(result).toEqual({
            isError: true,
            content: [{ type: 'text', text: "Tool 'missing__tool' not found." }],
        });
    });

    it('hydrates a tool schema and runs a post-hydration hook', async () => {
        const hydrateTool = vi.fn().mockReturnValue(['older-tool']);
        const onHydrate = vi.fn();

        const result = await executeGetToolSchemaCompatibility(
            { name: 'github__create_issue' },
            () => ({
                name: 'github__create_issue',
                description: 'Create issue',
                inputSchema: { type: 'object', properties: { title: { type: 'string' } } },
            }),
            { hydrateTool },
            (tool, evictedHydratedTools) => ({
                name: tool.name,
                inputSchema: tool.inputSchema,
                evictedHydratedTools,
            }),
            undefined,
            onHydrate,
        );

        expect(hydrateTool).toHaveBeenCalledWith('github__create_issue');
        expect(onHydrate).toHaveBeenCalledWith('github__create_issue', expect.objectContaining({ name: 'github__create_issue' }));
        expect(result).toEqual({
            isError: false,
            content: [{
                type: 'text',
                text: JSON.stringify({
                    name: 'github__create_issue',
                    inputSchema: { type: 'object', properties: { title: { type: 'string' } } },
                    evictedHydratedTools: ['older-tool'],
                }, null, 2),
            }],
        });
    });

    it('returns the custom missing-schema message when the schema is unavailable', async () => {
        const result = await executeGetToolSchemaCompatibility(
            { name: 'missing__tool' },
            () => null,
            { hydrateTool: vi.fn() },
            () => ({ inputSchema: {} }),
            (toolName) => `Schema for '${toolName}' is unavailable.`,
        );

        expect(result).toEqual({
            isError: true,
            content: [{ type: 'text', text: "Schema for 'missing__tool' is unavailable." }],
        });
    });

    it('unloads tools through the shared helper', async () => {
        const unloadTool = vi.fn().mockReturnValue(true);

        const result = await executeUnloadToolCompatibility(
            { name: 'github__create_issue' },
            { unloadTool },
        );

        expect(unloadTool).toHaveBeenCalledWith('github__create_issue');
        expect(result).toEqual({
            isError: false,
            content: [{ type: 'text', text: "Tool 'github__create_issue' unloaded from the current session." }],
        });
    });

    it('lists loaded tools and limits through the shared helper', async () => {
        const result = await executeListLoadedToolsCompatibility({
            getLimits: () => ({ maxLoadedTools: 24, maxHydratedSchemas: 8 }),
            listLoadedTools: () => [{ name: 'github__create_issue', hydrated: false }],
        });

        expect(result).toEqual({
            isError: false,
            content: [{
                type: 'text',
                text: JSON.stringify({
                    limits: { maxLoadedTools: 24, maxHydratedSchemas: 8 },
                    tools: [{ name: 'github__create_issue', hydrated: false }],
                }, null, 2),
            }],
        });
    });
});
