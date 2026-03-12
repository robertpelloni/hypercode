import { describe, expect, it } from 'vitest';

import { MemoryManager } from './MemoryManager.js';
import { RedundantMemoryManager } from './RedundantMemoryManager.js';

describe('MemoryManager pipeline summaries', () => {
    it('reports claude-mem as active in the default redundant pipeline', () => {
        const manager = new MemoryManager('C:/borg-workspace');

        expect(manager.getPipelineSummary()).toEqual({
            configuredMode: 'redundant',
            providerNames: ['json', 'claude-mem'],
            providerCount: 2,
            claudeMemEnabled: true,
        });
    });

    it('reports claude-mem as inactive in json-only mode', () => {
        const manager = new MemoryManager('C:/borg-workspace', 'json');

        expect(manager.getPipelineSummary()).toEqual({
            configuredMode: 'json',
            providerNames: ['json'],
            providerCount: 1,
            claudeMemEnabled: false,
        });
    });
});

describe('RedundantMemoryManager provider registration', () => {
    it('lists the built-in provider names in fan-out order', () => {
        const manager = new RedundantMemoryManager('C:/borg-workspace');

        expect(manager.getProviderNames()).toEqual(['json', 'claude-mem']);
    });
});