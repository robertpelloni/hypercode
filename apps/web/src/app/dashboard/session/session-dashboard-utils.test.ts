import { describe, expect, it } from 'vitest';

import { buildAttachCommand, formatRelativeTimestamp } from './session-dashboard-utils';

describe('session dashboard utils', () => {
    it('formats relative timestamps across common ranges', () => {
        const now = 1_000_000;

        expect(formatRelativeTimestamp(now - 15_000, now)).toBe('just now');
        expect(formatRelativeTimestamp(now - 5 * 60_000, now)).toBe('5m ago');
        expect(formatRelativeTimestamp(now - 3 * 60 * 60_000, now)).toBe('3h ago');
        expect(formatRelativeTimestamp(now - 2 * 24 * 60 * 60_000, now)).toBe('2d ago');
    });

    it('builds a PowerShell-safe attach command preview', () => {
        expect(buildAttachCommand("C:\\Users\\hyper\\workspace\\bob's repo", 'claude', ['--model', 'gpt-5', "it's-live"])).toBe(
            "Set-Location -LiteralPath 'C:\\Users\\hyper\\workspace\\bob''s repo'; & 'claude' '--model' 'gpt-5' 'it''s-live'",
        );
    });
});