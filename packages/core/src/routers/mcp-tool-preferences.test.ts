import { describe, expect, it } from 'vitest';

import {
    buildToolPreferenceSettings,
    mergeToolPreferences,
    normalizeToolPreferences,
    readToolPreferencesFromSettings,
} from './mcp-tool-preferences.js';

describe('mcp tool preferences helpers', () => {
    it('normalizes duplicate and empty preference entries', () => {
        expect(normalizeToolPreferences({
            importantTools: [' github__issues ', '', 'github__issues', 'browser__open'],
            alwaysLoadedTools: [' browser__open ', 'browser__open', ''],
        })).toEqual({
            importantTools: ['github__issues', 'browser__open'],
            alwaysLoadedTools: ['browser__open'],
        });
    });

    it('reads both pinned and always-loaded tools from settings', () => {
        expect(readToolPreferencesFromSettings({
            importantTools: ['github__issues'],
            alwaysLoadedTools: ['browser__open'],
        })).toEqual({
            importantTools: ['github__issues'],
            alwaysLoadedTools: ['browser__open'],
        });
    });

    it('merges always-loaded tools ahead of normal search results', () => {
        const merged = mergeToolPreferences([
            {
                name: 'github__issues',
                description: 'Search GitHub issues',
                server: 'github',
                rank: 2,
            },
            {
                name: 'browser__open',
                description: 'Open a browser page',
                server: 'browser',
                rank: 1,
            },
        ], {
            importantTools: ['github__issues'],
            alwaysLoadedTools: ['browser__open'],
        }, [
            {
                name: 'github__issues',
                description: 'Search GitHub issues',
                server: 'github',
            },
            {
                name: 'browser__open',
                description: 'Open a browser page',
                server: 'browser',
            },
        ]);

        expect(merged.map((tool) => ({
            name: tool.name,
            important: tool.important,
            alwaysLoaded: tool.alwaysLoaded,
        }))).toEqual([
            {
                name: 'browser__open',
                important: false,
                alwaysLoaded: true,
            },
            {
                name: 'github__issues',
                important: true,
                alwaysLoaded: false,
            },
        ]);
    });

    it('persists both important and always-loaded settings', () => {
        expect(buildToolPreferenceSettings({
            unrelated: true,
            toolSelection: {
                previous: 'keep-me',
            },
        }, {
            importantTools: ['github__issues'],
            alwaysLoadedTools: ['browser__open'],
        })).toEqual({
            unrelated: true,
            toolSelection: {
                previous: 'keep-me',
                importantTools: ['github__issues'],
                alwaysLoadedTools: ['browser__open'],
            },
        });
    });
});
