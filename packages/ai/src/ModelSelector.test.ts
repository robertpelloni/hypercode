import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelSelector } from './ModelSelector.js';

describe('ModelSelector', () => {
    beforeEach(() => {
        process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
        process.env.GOOGLE_API_KEY = 'test-google-key';
        process.env.OPENAI_API_KEY = 'test-openai-key';
        process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
        process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';
    });

    it('prefers the requested provider when it is available in the active chain', async () => {
        const selector = new ModelSelector();
        vi.spyOn(selector as any, 'getConfiguredChain').mockReturnValue(null);

        const result = await selector.selectModel({ provider: 'anthropic', taskType: 'worker' });

        expect(result.provider).toBe('anthropic');
        expect(result.modelId).toBe('claude-3-5-haiku-20241022');
        expect(result.reason).toBe('PROVIDER_PREFERENCE');
    });

    it('skips provider-specific failures and falls forward to the next candidate', async () => {
        const selector = new ModelSelector();
        vi.spyOn(selector as any, 'getConfiguredChain').mockReturnValue(null);

        selector.reportFailure('google', 'gemini-3.0-pro');

        const result = await selector.selectModel({ taskType: 'worker' });

        expect(result.provider).toBe('lmstudio');
        expect(result.modelId).toBe('openrouter/free');
    });

    it('forces a local fallback when the budget is exceeded', async () => {
        const selector = new ModelSelector();
        vi.spyOn(selector as any, 'getConfiguredChain').mockReturnValue(null);
        vi.spyOn(selector.getQuotaService(), 'isBudgetExceeded').mockReturnValue(true);

        const result = await selector.selectModel({ taskType: 'worker' });

        expect(result).toEqual({
            provider: 'lmstudio',
            modelId: 'C:/Users/hyper/.lmstudio/models/HauhauCS/Gemma-4-E2B-Uncensored-HauhauCS-Aggressive/Gemma-4-E2B-Uncensored-HauhauCS-Aggressive-Q2_K_P.gguf gemma-4-e2b-uncensored-hauhaucs-aggressive',
            reason: 'BUDGET_EXCEEDED_FORCED_LOCAL'
        });
    });

    it('permanently blocks a model when reportFailure is called with an auth error cause', async () => {
        const selector = new ModelSelector();
        vi.spyOn(selector as any, 'getConfiguredChain').mockReturnValue(null);

        const authError = { message: 'api key not configured' };
        selector.reportFailure('google', 'gemini-2.0-flash', authError);

        const depleted = selector.getDepletedModels();
        const entry = depleted.find((d) => d.provider === 'google');
        expect(entry).toBeDefined();
        expect(entry!.isPermanent).toBe(true);
        expect(entry!.retryAfter).toBe(Infinity);
    });

    it('uses a timed cooldown when reportFailure is called with a transient (429) cause', async () => {
        const selector = new ModelSelector();
        vi.spyOn(selector as any, 'getConfiguredChain').mockReturnValue(null);

        const rateLimitError = { status: 429 };
        selector.reportFailure('anthropic', 'claude-sonnet-4-20250514', rateLimitError);

        const depleted = selector.getDepletedModels();
        const entry = depleted.find((d) => d.provider === 'anthropic');
        expect(entry).toBeDefined();
        expect(entry!.isPermanent).toBe(false);
        expect(entry!.retryAfter).toBeGreaterThan(Date.now());
    });

    it('prefers OpenRouter free by default for worker tasks when available', async () => {
        const selector = new ModelSelector();
        vi.spyOn(selector as any, 'getConfiguredChain').mockReturnValue(null);

        const result = await selector.selectModel({ taskType: 'worker' });

        expect(result.provider).toBe('lmstudio');
        expect(result.modelId).toBe('openrouter/free');
    });

    it('getDepletedModels returns empty array when no failures have been reported', () => {
        const selector = new ModelSelector();
        expect(selector.getDepletedModels()).toEqual([]);
    });
});
