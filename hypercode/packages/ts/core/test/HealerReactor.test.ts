import { describe, expect, it } from 'vitest';

import { shouldIgnoreExpectedStartupError } from '../src/reactors/HealerReactor.ts';

describe('HealerReactor expected startup errors', () => {
    it('ignores missing module crashes from transient npx installs', () => {
        expect(shouldIgnoreExpectedStartupError("Error: Cannot find module 'safer-buffer'"))
            .toBe(true);
    });

    it('ignores missing executable crashes from optional local tools', () => {
        expect(shouldIgnoreExpectedStartupError("'mcp-yfinance-server' is not recognized as an internal or external command"))
            .toBe(true);
    });

    it('ignores local service connection failures that the healer cannot repair', () => {
        expect(shouldIgnoreExpectedStartupError('ValueError: Could not connect to a Chroma server. Are you sure it is running?'))
            .toBe(true);
    });
});