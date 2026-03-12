import { describe, expect, it } from 'vitest';

import { pickAutoLoadCandidate, rankToolSearchCandidates } from './toolSearchRanking.js';

describe('toolSearchRanking auto-load decisions', () => {
    it('picks a high-confidence exact match for auto-load', () => {
        const rankedResults = rankToolSearchCandidates([
            {
                name: 'browser__open_tab',
                description: 'Open a browser tab',
            },
            {
                name: 'browser__close_tab',
                description: 'Close a browser tab',
            },
        ], 'browser__open_tab', 10);

        expect(pickAutoLoadCandidate(rankedResults, 'browser__open_tab')).toEqual({
            toolName: 'browser__open_tab',
            reason: 'auto-loaded after exact tool name match',
        });
    });

    it('does not auto-load when the top result is too ambiguous', () => {
        const rankedResults = rankToolSearchCandidates([
            {
                name: 'browser__open_tab',
                description: 'Open a browser tab',
            },
            {
                name: 'browser__open_window',
                description: 'Open a browser window',
            },
        ], 'open', 10);

        expect(pickAutoLoadCandidate(rankedResults, 'open')).toBeNull();
    });
});
