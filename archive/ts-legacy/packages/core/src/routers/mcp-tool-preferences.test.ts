import { describe, expect, it } from 'vitest';

import {
    applyToolPreferencePatch,
    buildToolPreferenceSettings,
    mergeToolPreferences,
    normalizeToolPreferences,
    readToolPreferencesFromSettings,
} from './mcp-tool-preferences.js';

function makePreferences(overrides: Partial<ReturnType<typeof normalizeToolPreferences>> = {}) {
    return {
        importantTools: [],
        alwaysLoadedTools: [],
        autoLoadMinConfidence: 0.85,
        maxLoadedTools: 16,
        maxHydratedSchemas: 8,
        idleEvictionThresholdMs: 5 * 60 * 1000,
        ...overrides,
    };
}

type DisplayTool = {
    name: string;
    description: string;
    server: string;
    rank?: number;
    alwaysOn?: boolean;
    matchReason?: string;
    score?: number;
};

describe('mcp tool preferences helpers', () => {
    it('normalizes duplicate and empty preference entries', () => {
        expect(normalizeToolPreferences({
            importantTools: [' github__issues ', '', 'github__issues', 'browser__open'],
            alwaysLoadedTools: [' browser__open ', 'browser__open', ''],
            autoLoadMinConfidence: 2,
        })).toMatchObject({
            importantTools: ['github__issues', 'browser__open'],
            alwaysLoadedTools: ['browser__open'],
            autoLoadMinConfidence: 0.99,
        });
    });

    it('reads both pinned and always-loaded tools from settings', () => {
        expect(readToolPreferencesFromSettings({
            importantTools: ['github__issues'],
            alwaysLoadedTools: ['browser__open'],
            autoLoadMinConfidence: 0.9,
            maxLoadedTools: 16,
            maxHydratedSchemas: 8,
            idleEvictionThresholdMs: 5 * 60 * 1000,
        })).toMatchObject({
            importantTools: ['github__issues'],
            alwaysLoadedTools: ['browser__open'],
            autoLoadMinConfidence: 0.9,
        });
    });

    it('merges always-loaded tools ahead of normal search results', () => {
        const merged = mergeToolPreferences<DisplayTool>([
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
        ], makePreferences({
            importantTools: ['github__issues'],
            alwaysLoadedTools: ['browser__open'],
        }), [
            {
                name: 'github__issues',
                description: 'Search GitHub issues',
                server: 'github',
            },
            {
                name: 'browser__open',
                description: 'Open a browser page',
                server: 'browser',
                alwaysOn: true,
            },
        ]);

        expect(merged.map((tool) => ({
            name: tool.name,
            important: tool.important,
            alwaysLoaded: tool.alwaysLoaded,
            alwaysOn: tool.alwaysOn,
        }))).toEqual([
            {
                name: 'browser__open',
                important: false,
                alwaysLoaded: true,
                alwaysOn: true,
            },
            {
                name: 'github__issues',
                important: true,
                alwaysLoaded: false,
                alwaysOn: false,
            },
        ]);
    });

    it('always advertises always-on catalog tools even when they are not in the initial result set', () => {
        const merged = mergeToolPreferences<DisplayTool>([], makePreferences(), [
            {
                name: 'memory__recall',
                description: 'Recall a saved memory',
                server: 'memory',
                alwaysOn: true,
            },
        ]);

        expect(merged[0]).toMatchObject({
            name: 'memory__recall',
            alwaysOn: true,
            alwaysShow: true,
        });
        expect(merged[0]?.matchReason).toContain('always-on');
    });

    it('persists both important and always-loaded settings', () => {
        expect(buildToolPreferenceSettings({
            unrelated: true,
            toolSelection: {
                previous: 'keep-me',
            },
        }, makePreferences({
            importantTools: ['github__issues'],
            alwaysLoadedTools: ['browser__open'],
            autoLoadMinConfidence: 0.9,
        }))).toMatchObject({
            unrelated: true,
            toolSelection: {
                previous: 'keep-me',
                importantTools: ['github__issues'],
                alwaysLoadedTools: ['browser__open'],
                autoLoadMinConfidence: 0.9,
            },
        });
    });

    it('applies partial patches without resetting omitted values', () => {
        const current = makePreferences({
            importantTools: ['github__issues'],
            alwaysLoadedTools: ['browser__open'],
            autoLoadMinConfidence: 0.91,
            maxLoadedTools: 20,
            maxHydratedSchemas: 10,
            idleEvictionThresholdMs: 12 * 60 * 1000,
        });

        const patched = applyToolPreferencePatch(current, {
            importantTools: ['memory__recall'],
        });

        expect(patched).toMatchObject({
            importantTools: ['memory__recall'],
            alwaysLoadedTools: ['browser__open'],
            autoLoadMinConfidence: 0.91,
            maxLoadedTools: 20,
            maxHydratedSchemas: 10,
            idleEvictionThresholdMs: 12 * 60 * 1000,
        });
    });

    it('normalizes partial patch values while preserving untouched fields', () => {
        const current = makePreferences({
            importantTools: ['github__issues'],
            alwaysLoadedTools: ['browser__open'],
            autoLoadMinConfidence: 0.88,
            maxLoadedTools: 18,
            maxHydratedSchemas: 9,
            idleEvictionThresholdMs: 9 * 60 * 1000,
        });

        const patched = applyToolPreferencePatch(current, {
            autoLoadMinConfidence: 5,
            maxLoadedTools: 100,
            maxHydratedSchemas: 1,
            idleEvictionThresholdMs: 1,
        });

        expect(patched).toMatchObject({
            importantTools: ['github__issues'],
            alwaysLoadedTools: ['browser__open'],
            autoLoadMinConfidence: 0.99,
            maxLoadedTools: 64,
            maxHydratedSchemas: 2,
            idleEvictionThresholdMs: 10_000,
        });
    });
});
