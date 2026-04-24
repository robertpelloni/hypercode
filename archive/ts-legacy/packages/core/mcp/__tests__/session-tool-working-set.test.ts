import { describe, expect, it } from 'vitest';

import {
    DEFAULT_MAX_HYDRATED_SCHEMAS,
    DEFAULT_MAX_LOADED_TOOLS,
    SessionToolWorkingSet,
} from '../../src/mcp/SessionToolWorkingSet.ts';

describe('mcp SessionToolWorkingSet defaults', () => {
    it('keeps the default loaded working set intentionally small', () => {
        const workingSet = new SessionToolWorkingSet();

        expect(DEFAULT_MAX_LOADED_TOOLS).toBe(16);
        expect(DEFAULT_MAX_HYDRATED_SCHEMAS).toBe(8);
        expect(workingSet.getLimits()).toEqual({
            maxLoadedTools: 16,
            maxHydratedSchemas: 8,
            idleEvictionThresholdMs: 300000,
        });
    });
});