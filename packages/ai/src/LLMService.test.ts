import { describe, expect, it, vi } from 'vitest';
import { LLMService } from './LLMService.js';

describe('LLMService', () => {
    it('falls back to the next selector candidate on recoverable provider errors while preserving routing intent', async () => {
        const quota = {
            trackUsage: vi.fn(),
            getSessionTotal: vi.fn().mockReturnValue(0.25)
        };

        const rateLimitError = new Error('429 Rate limit exceeded');

        const selector = {
            getQuotaService: () => quota,
            reportFailure: vi.fn(),
            selectModel: vi.fn().mockResolvedValue({
                provider: 'google',
                modelId: 'gemini-2.0-flash',
                reason: 'PRIMARY_CHOICE'
            })
        };

        const llm = new LLMService(selector as any);
        (llm as any).openaiClient = {
            chat: {
                completions: {
                    create: vi.fn().mockRejectedValue(rateLimitError)
                }
            }
        };

        const generateContent = vi.fn().mockResolvedValue({
            response: {
                text: () => 'fallback success'
            }
        });

        (llm as any).googleClient = {
            getGenerativeModel: vi.fn().mockReturnValue({
                generateContent
            })
        };

        const response = await llm.generateText('openai', 'gpt-4o', 'system prompt', 'user prompt', {
            taskComplexity: 'medium',
            taskType: 'supervisor',
            routingTaskType: 'planning',
            routingStrategy: 'best'
        });

        expect(response.content).toBe('fallback success');
        expect(selector.reportFailure).toHaveBeenCalledWith('openai', 'gpt-4o', rateLimitError);
        expect(selector.selectModel).toHaveBeenCalledWith({
            taskComplexity: 'medium',
            taskType: 'supervisor',
            routingTaskType: 'planning',
            routingStrategy: 'best',
            provider: undefined,
            exclude: ['openai:gpt-4o']
        });
        expect(quota.trackUsage).toHaveBeenCalledWith('gemini-2.0-flash', expect.any(Number), expect.any(Number));
    });

    it('does not retry fatal unsupported-provider errors', async () => {
        const quota = {
            trackUsage: vi.fn(),
            getSessionTotal: vi.fn().mockReturnValue(0)
        };

        const selector = {
            getQuotaService: () => quota,
            reportFailure: vi.fn(),
            selectModel: vi.fn()
        };

        const llm = new LLMService(selector as any);

        await expect(
            llm.generateText('unsupported', 'unknown-model', 'system prompt', 'user prompt')
        ).rejects.toThrow('Unsupported provider: unsupported');

        expect(selector.reportFailure).not.toHaveBeenCalled();
        expect(selector.selectModel).not.toHaveBeenCalled();
    });
});