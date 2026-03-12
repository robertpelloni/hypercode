import { afterEach, describe, expect, it } from 'vitest';

import { ProviderRegistry } from '../../src/providers/ProviderRegistry.ts';
import { NormalizedQuotaService } from '../../src/providers/NormalizedQuotaService.ts';

const ENV_KEYS = ['OPENAI_API_KEY'] as const;
const ORIGINAL_ENV = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

function restoreEnv() {
    for (const key of ENV_KEYS) {
        const original = ORIGINAL_ENV[key];
        if (original === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = original;
        }
    }
}

afterEach(() => {
    restoreEnv();
});

describe('NormalizedQuotaService', () => {
    it('tracks usage and exposes normalized quota snapshots', () => {
        const registry = new ProviderRegistry();
        const quota = new NormalizedQuotaService(registry);
        quota.setConfig({
            dailyBudgetUsd: 10,
            monthlyBudgetUsd: 100,
            providerLimits: { openai: 1 },
        });

        quota.trackUsage('gpt-4o', 1000, 500);

        const snapshot = quota.getQuota('openai');

        expect(snapshot).toBeDefined();
        expect(snapshot?.used).toBeGreaterThan(0);
        expect(snapshot?.remaining).not.toBeNull();
        expect(snapshot?.remaining).toBeLessThan(1);
        expect(quota.getUsageByModel()).toContainEqual(
            expect.objectContaining({ provider: 'openai', requests: 1 }),
        );
    });

    it('marks providers as rate-limited and restores them to healthy state', () => {
        delete process.env.OPENAI_API_KEY;
        const quota = new NormalizedQuotaService(new ProviderRegistry());

        quota.markRateLimited('openai', Date.now() + 60_000, 500);
        expect(quota.getQuota('openai')?.availability).toBe('rate_limited');
        expect(quota.getQuota('openai')?.rateLimitRpm).toBe(500);

        quota.markProviderHealthy('openai');
        expect(quota.getQuota('openai')?.availability).toBe('missing_auth');
    });
});
