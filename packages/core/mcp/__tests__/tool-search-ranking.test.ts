import { describe, expect, it } from 'vitest';

import { rankToolSearchCandidates } from '../../src/mcp/toolSearchRanking.ts';

describe('rankToolSearchCandidates', () => {
    it('prefers exact tool name matches and preserves useful state flags', () => {
        const results = rankToolSearchCandidates([
            {
                name: 'github__create_issue',
                description: 'Create a GitHub issue in a repository',
                serverName: 'github',
                loaded: false,
                hydrated: false,
                deferred: true,
            },
            {
                name: 'github__search_issues',
                description: 'Search GitHub issues with filters',
                serverName: 'github',
                loaded: true,
                hydrated: true,
                deferred: false,
            },
        ], 'github__create_issue', 5);

        expect(results[0]).toMatchObject({
            name: 'github__create_issue',
            matchReason: 'exact tool name match',
            deferred: true,
            requiresSchemaHydration: true,
        });
    });

    it('falls back to description and keyword matches when names do not match directly', () => {
        const results = rankToolSearchCandidates([
            {
                name: 'memory__store_fact',
                description: 'Store an important memory fact for later recall',
                serverName: 'memory',
            },
            {
                name: 'browser__click',
                description: 'Click an element in the browser',
                serverName: 'browser',
            },
        ], 'important recall', 5);

        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
            name: 'memory__store_fact',
            matchReason: 'matched 2 query keywords',
        });
    });
});