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

describe('provider routing strategies', () => {
    it('orders cheapest candidates deterministically for coding work', () => {
        process.env.OPENAI_API_KEY = 'openai';
        process.env.ANTHROPIC_API_KEY = 'anthropic';
        process.env.GOOGLE_API_KEY = 'google';

        const selector = new CoreModelSelector();
        const chain = selector.getFallbackChain({ routingTaskType: 'coding', routingStrategy: 'cheapest' });

        expect(chain[0]).toMatchObject({ provider: 'google', model: 'gemini-2.0-flash' });
        expect(chain[1]).toMatchObject({ provider: 'openai', model: 'gpt-4o-mini' });
    });

    it('orders best-quality candidates deterministically for planning work', () => {
        process.env.OPENAI_API_KEY = 'openai';
        process.env.ANTHROPIC_API_KEY = 'anthropic';
        process.env.GOOGLE_API_KEY = 'google';

        const selector = new CoreModelSelector();
        const chain = selector.getFallbackChain({ routingTaskType: 'planning', routingStrategy: 'best' });

        expect(chain[0]).toMatchObject({ provider: 'anthropic', model: 'claude-sonnet-4-20250514' });
        expect(chain[1].provider).toBe('openai');
    });

    it('uses task-type-aware defaults and rotates round-robin selections', async () => {
        process.env.OPENAI_API_KEY = 'openai';
        process.env.ANTHROPIC_API_KEY = 'anthropic';
        process.env.GOOGLE_API_KEY = 'google';

        const selector = new CoreModelSelector();

        const coding = await selector.selectModel({ routingTaskType: 'coding' });
        const planning = await selector.selectModel({ routingTaskType: 'planning' });
        const firstRoundRobin = await selector.selectModel({ routingTaskType: 'general', routingStrategy: 'round-robin' });
        const secondRoundRobin = await selector.selectModel({ routingTaskType: 'general', routingStrategy: 'round-robin' });

        expect(coding.provider).toBe('google');
        expect(planning.provider).toBe('anthropic');
        expect(secondRoundRobin.provider).not.toBe(firstRoundRobin.provider);
    });
});
