
import { anthropicProvider } from './anthropic';

// Mock global fetch
global.fetch = jest.fn() as unknown as typeof fetch;

describe('Anthropic Provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('complete', () => {
    it('should call Anthropic API correctly', async () => {
      const mockResponse = {
        content: [{ text: 'Hello' }],
      };
      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await anthropicProvider.complete({
        messages: [{ role: 'user', content: 'Hi' }],
        apiKey: 'key',
        model: 'claude-3-5',
        systemPrompt: 'SysPrompt',
      });

      expect(global.fetch).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-api-key': 'key', 'anthropic-version': '2023-06-01' }),
        body: expect.stringContaining('"system":"SysPrompt"')
      }));
      expect(result.content).toBe('Hello');
    });

    it('should map system role in messages to user role', async () => {
      const mockResponse = { content: [{ text: 'Hello' }] };
      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await anthropicProvider.complete({
        messages: [
          { role: 'user', content: 'User msg' },
          { role: 'system', content: 'Intermediate system msg' },
          { role: 'assistant', content: 'Assistant msg' }
        ],
        apiKey: 'key',
        model: 'claude-3-5',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringMatching(/"role":"user","content":"Intermediate system msg"/)
        })
      );
    });

    it('should throw error on API failure', async () => {
      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Bad Key' } }),
      });

      await expect(anthropicProvider.complete({
        messages: [],
        apiKey: 'key',
        model: 'claude',
      })).rejects.toThrow('Anthropic API error: Bad Key');
    });
  });

  describe('listModels', () => {
    it('should list hardcoded models', async () => {
      const models = await anthropicProvider.listModels('key');
      expect(models).toContain('claude-3-5-sonnet-20240620');
      expect(models.length).toBeGreaterThan(0);
    });
  });
});
