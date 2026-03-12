import { describe, expect, it } from 'vitest';

import { rankToolSearchCandidates } from '../../src/mcp/toolSearchRanking.ts';

describe('proxy-style tool search ranking', () => {
    it('matches namespaced tools by their original downstream tool name', () => {
        const results = rankToolSearchCandidates([
            {
                name: 'github__create_issue',
                originalName: 'create_issue',
                description: 'Create an issue in a GitHub repository',
                serverName: 'github',
                deferred: true,
            },
            {
                name: 'github__search_issues',
                originalName: 'search_issues',
                description: 'Search issues in a GitHub repository',
                serverName: 'github',
                loaded: true,
                hydrated: true,
                deferred: false,
            },
        ], 'create_issue', 5);

        expect(results[0]).toMatchObject({
            name: 'github__create_issue',
            originalName: 'create_issue',
            matchReason: 'exact original tool name match',
            requiresSchemaHydration: true,
        });
    });

    it('prefers already loaded tools when scores tie on shared keyword matches', () => {
        const results = rankToolSearchCandidates([
            {
                name: 'browser__click',
                originalName: 'click',
                description: 'Click an element in the browser',
                serverName: 'browser',
                loaded: false,
                hydrated: false,
                deferred: true,
            },
            {
                name: 'browser__click_text',
                originalName: 'click_text',
                description: 'Click visible text in the browser',
                serverName: 'browser',
                loaded: true,
                hydrated: true,
                deferred: false,
            },
        ], 'browser click', 5);

        expect(results[0]).toMatchObject({
            name: 'browser__click_text',
            loaded: true,
        });
        expect(results[1]).toMatchObject({
            name: 'browser__click',
            loaded: false,
        });
    });
});