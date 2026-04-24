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

    it('routes OpenRouter requests through the OpenAI-compatible client', async () => {
        const quota = {
            trackUsage: vi.fn(),
            getSessionTotal: vi.fn().mockReturnValue(0.01)
        };

        const selector = {
            getQuotaService: () => quota,
            reportFailure: vi.fn(),
            selectModel: vi.fn()
        };

        const llm = new LLMService(selector as any);
        (llm as any).openrouterClient = {
            chat: {
                completions: {
                    create: vi.fn().mockResolvedValue({
                        choices: [{ message: { content: 'openrouter success' } }],
                        usage: { prompt_tokens: 12, completion_tokens: 8 }
                    })
                }
            }
        };

        const response = await llm.generateText('openrouter', 'xiaomi/mimo-v2-flash:free', 'sys', 'user');
        expect(response.content).toBe('openrouter success');
        expect(quota.trackUsage).toHaveBeenCalledWith('xiaomi/mimo-v2-flash:free', 12, 8);
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

    it('falls back when initial provider is unavailable due to missing API key', async () => {
        const quota = {
            trackUsage: vi.fn(),
            getSessionTotal: vi.fn().mockReturnValue(0.1)
        };

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

        // Simulate missing OpenAI API key — clear the client if it was set from env
        (llm as any).openaiClient = undefined;

        const generateContent = vi.fn().mockResolvedValue({
            response: {
                text: () => 'google fallback success'
            }
        });

        (llm as any).googleClient = {
            getGenerativeModel: vi.fn().mockReturnValue({
                generateContent
            })
        };

        const response = await llm.generateText('openai', 'gpt-4o', 'system prompt', 'user prompt', {
            routingTaskType: 'coding',
            routingStrategy: 'cheapest',
        });

        expect(response.content).toBe('google fallback success');
        expect(selector.reportFailure).toHaveBeenCalledTimes(1);
        expect(selector.reportFailure).toHaveBeenCalledWith('openai', 'gpt-4o', expect.any(Error));
        expect(selector.selectModel).toHaveBeenCalledWith(expect.objectContaining({
            routingTaskType: 'coding',
            routingStrategy: 'cheapest',
            exclude: ['openai:gpt-4o'],
        }));
        expect(response.routing).toMatchObject({
            attempts: 2,
            finalProvider: 'google',
            finalModelId: 'gemini-2.0-flash',
        });
        expect(response.routing?.failovers.length).toBe(1);
    });

    it('records a RoutingEvent in getRoutingHistory() after each generateText call', async () => {
        const quota = {
            trackUsage: vi.fn(),
            getSessionTotal: vi.fn().mockReturnValue(0.05)
        };

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
        (llm as any).openaiClient = undefined;

        const generateContent = vi.fn().mockResolvedValue({
            response: { text: () => 'telemetry test response' }
        });
        (llm as any).googleClient = {
            getGenerativeModel: vi.fn().mockReturnValue({ generateContent })
        };

        expect(llm.getRoutingHistory()).toHaveLength(0);

        await llm.generateText('openai', 'gpt-4o', 'sys', 'user', { routingTaskType: 'coding' });

        const history = llm.getRoutingHistory();
        expect(history).toHaveLength(1);

        const event = history[0];
        expect(event.initialProvider).toBe('openai');
        expect(event.initialModelId).toBe('gpt-4o');
        expect(event.finalProvider).toBe('google');
        expect(event.finalModelId).toBe('gemini-2.0-flash');
        expect(event.hadFailover).toBe(true);
        expect(event.failovers).toHaveLength(1);
        expect(event.attempts).toBe(2);
        expect(event.durationMs).toBeGreaterThanOrEqual(0);
        expect(typeof event.timestamp).toBe('number');
    });
});