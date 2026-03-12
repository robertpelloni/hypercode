import { describe, expect, it } from 'vitest';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

import { NativeSessionMetaTools } from './NativeSessionMetaTools.js';
import { SessionToolWorkingSet } from './SessionToolWorkingSet.js';

function parseTextJson<T>(result: unknown): T {
    const text = (result as { content?: Array<{ type?: string; text?: string }> })
        ?.content?.find((item) => item.type === 'text')?.text ?? 'null';
    return JSON.parse(text) as T;
}

describe('NativeSessionMetaTools search auto-load', () => {
    it('auto-loads a high-confidence top search result into the working set', async () => {
        const workingSet = new SessionToolWorkingSet();
        const metaTools = new NativeSessionMetaTools(workingSet);
        const tools: Tool[] = [
            {
                name: 'browser__open_tab',
                description: 'Open a browser tab',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'browser__close_tab',
                description: 'Close a browser tab',
                inputSchema: { type: 'object', properties: {} },
            },
        ];

        metaTools.refreshCatalog(tools);

        const result = await metaTools.handleToolCall('search_tools', { query: 'browser__open_tab' });
        const payload = parseTextJson<Array<{ name: string; loaded: boolean; autoLoaded?: boolean; matchReason: string }>>(result);

        expect(payload[0]).toMatchObject({
            name: 'browser__open_tab',
            loaded: true,
            autoLoaded: true,
        });
        expect(payload[0]?.matchReason).toContain('auto-loaded after exact tool name match');
        expect(workingSet.isLoaded('browser__open_tab')).toBe(true);
    });

    it('does not auto-load ambiguous search results', async () => {
        const workingSet = new SessionToolWorkingSet();
        const metaTools = new NativeSessionMetaTools(workingSet);

        metaTools.refreshCatalog([
            {
                name: 'browser__open_tab',
                description: 'Open a browser tab',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'browser__open_window',
                description: 'Open a browser window',
                inputSchema: { type: 'object', properties: {} },
            },
        ]);

        const result = await metaTools.handleToolCall('search_tools', { query: 'open' });
        const payload = parseTextJson<Array<{ name: string; loaded: boolean; autoLoaded?: boolean }>>(result);

        expect(payload.some((tool) => tool.autoLoaded)).toBe(false);
        expect(workingSet.getLoadedToolNames()).toEqual([]);
    });

    it('returns JIT tool context through the native meta-tool bridge', async () => {
        const metaTools = new NativeSessionMetaTools(new SessionToolWorkingSet(), {
            toolContextResolver: ({ toolName }) => ({
                toolName,
                query: `${toolName} src/app/page.tsx`,
                matchedPaths: ['src/app/page.tsx'],
                observationCount: 1,
                summaryCount: 1,
                prompt: `JIT tool context for ${toolName}:\n- Prior note`,
            }),
        });

        const result = await metaTools.handleToolCall('get_tool_context', {
            name: 'read_file',
            arguments: { filePath: 'src/app/page.tsx' },
        });
        const payload = parseTextJson<{
            toolName: string;
            observationCount: number;
            summaryCount: number;
            prompt: string;
        }>(result);

        expect(payload).toMatchObject({
            toolName: 'read_file',
            observationCount: 1,
            summaryCount: 1,
        });
        expect(payload.prompt).toContain('Prior note');
    });

    it('refreshes loaded-tool LRU order when a loaded tool is used again', () => {
        const workingSet = new SessionToolWorkingSet({
            maxLoadedTools: 3,
            maxHydratedSchemas: 2,
        });
        const metaTools = new NativeSessionMetaTools(workingSet);

        metaTools.refreshCatalog([
            { name: 'browser__alpha', description: 'Alpha tool', inputSchema: { type: 'object', properties: {} } },
            { name: 'browser__beta', description: 'Beta tool', inputSchema: { type: 'object', properties: {} } },
            { name: 'browser__gamma', description: 'Gamma tool', inputSchema: { type: 'object', properties: {} } },
            { name: 'browser__delta', description: 'Delta tool', inputSchema: { type: 'object', properties: {} } },
        ]);

        metaTools.loadToolIntoSession('browser__alpha');
        metaTools.loadToolIntoSession('browser__beta');
        metaTools.loadToolIntoSession('browser__gamma');

        expect(metaTools.touchLoadedTool('browser__alpha')).toBe(true);

        const { evicted } = metaTools.loadToolIntoSession('browser__delta');

        expect(evicted).toEqual(['browser__beta']);
        expect(workingSet.getLoadedToolNames()).toEqual(['browser__gamma', 'browser__alpha', 'browser__delta']);
    });

    it('keeps always-loaded tools visible and protected from full unloads', async () => {
        const workingSet = new SessionToolWorkingSet({
            maxLoadedTools: 2,
            maxHydratedSchemas: 1,
        });
        const metaTools = new NativeSessionMetaTools(workingSet);

        metaTools.refreshCatalog([
            { name: 'browser__pinned', description: 'Pinned browser tool', inputSchema: { type: 'object', properties: {} } },
            { name: 'browser__alpha', description: 'Alpha tool', inputSchema: { type: 'object', properties: {} } },
            { name: 'browser__beta', description: 'Beta tool', inputSchema: { type: 'object', properties: {} } },
        ]);

        metaTools.setAlwaysLoadedTools(['browser__pinned']);
        metaTools.loadToolIntoSession('browser__alpha');
        metaTools.loadToolIntoSession('browser__beta');

        expect(metaTools.getLoadedToolNames()).toEqual(['browser__pinned', 'browser__alpha', 'browser__beta']);

        const unloadResult = await metaTools.handleToolCall('unload_tool', { name: 'browser__pinned' });
        const unloadText = (unloadResult?.content?.find((item) => item.type === 'text')?.text) ?? '';

        expect(unloadText).toContain("was not loaded");
        expect(metaTools.getLoadedToolNames()).toEqual(['browser__pinned', 'browser__alpha', 'browser__beta']);

        const visibleNames = metaTools.getVisibleLoadedTools().map((tool) => tool.name);
        expect(visibleNames).toContain('browser__pinned');
    });
});
