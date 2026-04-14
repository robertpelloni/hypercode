import { describe, expect, it } from 'vitest';

import { NativeSessionMetaTools } from '../../src/mcp/NativeSessionMetaTools.ts';

describe('NativeSessionMetaTools', () => {
    it('searches tools and only exposes loaded tools in the visible working set', async () => {
        const manager = new NativeSessionMetaTools();
        manager.refreshCatalog([
            {
                name: 'github__create_issue',
                description: 'Create a GitHub issue',
                inputSchema: { type: 'object', properties: { title: { type: 'string' } } },
            },
            {
                name: 'memory__store_fact',
                description: 'Store a memory fact',
                inputSchema: { type: 'object', properties: { fact: { type: 'string' } } },
            },
        ]);

        const search = await manager.handleToolCall('search_tools', { query: 'github' });
        expect(search?.isError).toBeFalsy();
        const parsedSearch = JSON.parse(search?.content[0].text ?? '[]');
        expect(parsedSearch[0]).toMatchObject({
            name: 'github__create_issue',
            loaded: true,
            hydrated: false,
            requiresSchemaHydration: true,
        });
        expect(parsedSearch[0].matchReason).toContain('tool name prefix match');

        expect(manager.getVisibleLoadedTools()).toHaveLength(1);

        await manager.handleToolCall('load_tool', { name: 'github__create_issue' });

        const visible = manager.getVisibleLoadedTools();
        expect(visible).toHaveLength(1);
        expect(visible[0].name).toBe('github__create_issue');
        expect(visible[0].description).toContain('[Deferred]');
    });

    it('hydrates and unloads tools in the HyperCode session working set', async () => {
        const manager = new NativeSessionMetaTools();
        manager.refreshCatalog([
            {
                name: 'github__create_issue',
                description: 'Create a GitHub issue',
                inputSchema: { type: 'object', properties: { title: { type: 'string' } } },
            },
        ]);

        await manager.handleToolCall('load_tool', { name: 'github__create_issue' });
        const schema = await manager.handleToolCall('get_tool_schema', { name: 'github__create_issue' });

        expect(schema?.isError).toBeFalsy();
        expect(schema?.content[0].text).toContain('title');
        expect(manager.getVisibleLoadedTools()[0].description).toBe('Create a GitHub issue');

        const unload = await manager.handleToolCall('unload_tool', { name: 'github__create_issue' });
        expect(unload?.isError).toBeFalsy();
        expect(manager.getVisibleLoadedTools()).toEqual([]);
    });
});