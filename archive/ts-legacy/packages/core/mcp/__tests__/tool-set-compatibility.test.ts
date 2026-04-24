import { describe, expect, it, vi } from 'vitest';

import {
    executeCompatibleListToolSets,
    executeCompatibleLoadToolSet,
    executeCompatibleSaveToolSet,
    listToolSetsCompatibility,
    loadToolSetCompatibility,
    saveToolSetCompatibility,
} from '../../src/mcp/toolSetCompatibility.ts';

describe('toolSetCompatibility', () => {
    it('returns an error when saving a tool set with no loaded tools', async () => {
        const saveToolSet = vi.fn();

        const result = await saveToolSetCompatibility(
            'web_dev',
            'Web tools',
            {
                getLoadedToolNames: () => [],
            },
            saveToolSet,
        );

        expect(saveToolSet).not.toHaveBeenCalled();
        expect(result).toEqual({
            isError: true,
            content: [{ type: 'text', text: 'No tools currently loaded to save.' }],
        });
    });

    it('loads a saved tool set while reporting missing tools', async () => {
        const loadToolIntoSession = vi.fn(() => ({ loaded: true, evicted: [] }));

        const result = await loadToolSetCompatibility(
            'web_dev',
            [{
                name: 'web_dev',
                description: 'Web tools',
                tools: ['github__create_issue', 'missing__tool'],
                uuid: 'set-1',
            }],
            {
                hasTool: (name) => name !== 'missing__tool',
                loadToolIntoSession,
            },
        );

        expect(loadToolIntoSession).toHaveBeenCalledTimes(1);
        expect(loadToolIntoSession).toHaveBeenCalledWith('github__create_issue');
        expect(result).toEqual({
            isError: false,
            content: [{
                type: 'text',
                text: "Loaded 1 tools from set 'web_dev'. Warning: 1 tools could not be found (might be offline): missing__tool",
            }],
        });
    });

    it('lists saved tool sets with tool counts', () => {
        expect(listToolSetsCompatibility([
            {
                name: 'web_dev',
                description: 'Web tools',
                tools: ['github__create_issue', 'filesystem__read_file'],
                uuid: 'set-1',
            },
        ])).toEqual({
            isError: false,
            content: [{
                type: 'text',
                text: JSON.stringify([
                    {
                        name: 'web_dev',
                        description: 'Web tools',
                        tools: ['github__create_issue', 'filesystem__read_file'],
                        toolCount: 2,
                    },
                ], null, 2),
            }],
        });
    });

    it('executes save_tool_set from args and converts thrown errors into tool results', async () => {
        const result = await executeCompatibleSaveToolSet(
            { name: 'web_dev', description: 'Web tools' },
            { getLoadedToolNames: () => ['github__create_issue'] },
            { saveToolSet: vi.fn().mockRejectedValue(new Error('disk full')) },
        );

        expect(result).toEqual({
            isError: true,
            content: [{ type: 'text', text: 'Failed to save tool set: disk full' }],
        });
    });

    it('executes load_tool_set from args via the shared store interface', async () => {
        const loadToolIntoSession = vi.fn(() => ({ loaded: true, evicted: [] }));

        const result = await executeCompatibleLoadToolSet(
            { name: 'web_dev' },
            {
                hasTool: (name) => name === 'github__create_issue',
                loadToolIntoSession,
            },
            {
                loadToolSets: vi.fn().mockResolvedValue([
                    {
                        name: 'web_dev',
                        description: 'Web tools',
                        tools: ['github__create_issue'],
                        uuid: 'set-1',
                    },
                ]),
            },
        );

        expect(loadToolIntoSession).toHaveBeenCalledWith('github__create_issue');
        expect(result).toEqual({
            isError: false,
            content: [{ type: 'text', text: "Loaded 1 tools from set 'web_dev'." }],
        });
    });

    it('executes toolset_list and converts store failures into tool results', async () => {
        const result = await executeCompatibleListToolSets({
            loadToolSets: vi.fn().mockRejectedValue(new Error('db offline')),
        });

        expect(result).toEqual({
            isError: true,
            content: [{ type: 'text', text: 'Failed to list tool sets: db offline' }],
        });
    });
});