import { afterEach, describe, expect, it } from 'vitest';

import { CoreModelSelector } from '../../src/providers/CoreModelSelector.ts';

const ENV_KEYS = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY'] as const;
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

describe('provider fallback chain', () => {
    it('falls forward after quota and rate-limit failures without reselecting cooled-down providers', async () => {
        process.env.OPENAI_API_KEY = 'openai';
        process.env.ANTHROPIC_API_KEY = 'anthropic';
        process.env.GOOGLE_API_KEY = 'google';

        const selector = new CoreModelSelector();

        const first = await selector.selectModel({ routingTaskType: 'coding', routingStrategy: 'cheapest' });
        selector.reportFailure(first.provider, first.modelId, new Error('quota exceeded'));

        const second = await selector.selectModel({ routingTaskType: 'coding', routingStrategy: 'cheapest' });
        selector.reportFailure(second.provider, second.modelId, { status: 429, message: 'rate limit reached' });

        const third = await selector.selectModel({ routingTaskType: 'coding', routingStrategy: 'cheapest' });

        expect(first.provider).toBe('google');
        expect(second.provider).toBe('openai');
        expect(third.provider).toBe('deepseek');
        expect(third.provider).not.toBe(first.provider);
        expect(third.provider).not.toBe(second.provider);
        expect((await selector.getProviderSnapshots()).find((provider) => provider.provider === 'google')?.availability).toBe('quota_exhausted');
        expect((await selector.getProviderSnapshots()).find((provider) => provider.provider === 'openai')?.availability).toBe('rate_limited');
    });
});
