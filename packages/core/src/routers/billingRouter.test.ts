import { describe, expect, it, vi } from 'vitest';

import { buildFallbackChainResponse } from './billingRouter.js';

describe('buildFallbackChainResponse', () => {
    it('forwards the selected task type to the selector and preserves ranked entries', () => {
        const getFallbackChain = vi.fn().mockReturnValue([
            {
                provider: 'anthropic',
                model: 'claude-sonnet-4-20250514',
                reason: 'TASK_TYPE_PLANNING',
            },
            {
                provider: 'openai',
                model: 'gpt-4o',
                reason: 'BEST',
            },
        ]);

        const response = buildFallbackChainResponse({ getFallbackChain }, 'planning');

        expect(getFallbackChain).toHaveBeenCalledWith({ routingTaskType: 'planning' });
        expect(response).toEqual({
            selectedTaskType: 'planning',
            chain: [
                {
                    priority: 1,
                    provider: 'anthropic',
                    model: 'claude-sonnet-4-20250514',
                    reason: 'TASK_TYPE_PLANNING',
                },
                {
                    priority: 2,
                    provider: 'openai',
                    model: 'gpt-4o',
                    reason: 'BEST',
                },
            ],
        });
    });

    it('falls back to the default chain when no task type is supplied', () => {
        const getFallbackChain = vi.fn().mockReturnValue([]);

        const response = buildFallbackChainResponse({ getFallbackChain });

        expect(getFallbackChain).toHaveBeenCalledWith(undefined);
        expect(response).toEqual({
            selectedTaskType: null,
            chain: [],
        });
    });
});
