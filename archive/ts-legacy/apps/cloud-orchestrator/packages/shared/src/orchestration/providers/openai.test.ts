
import { openaiProvider } from './openai';

// Mock global fetch
global.fetch = jest.fn() as unknown as typeof fetch;

describe('OpenAI Provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('complete', () => {
    it('should call OpenAI API correctly', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Hello' } }],
      };
      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await openaiProvider.complete({
        messages: [{ role: 'user', content: 'Hi' }],
        apiKey: 'key',
        model: 'gpt-4o',
        systemPrompt: 'SysPrompt',
      });

      expect(global.fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Authorization': 'Bearer key' }),
        body: expect.stringContaining('"messages":[{"role":"system","content":"SysPrompt"},{"role":"user","content":"Hi"}]')
      }));
      expect(result.content).toBe('Hello');
    });

    it('should throw error on API failure', async () => {
      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Bad Key' } }),
      });

      await expect(openaiProvider.complete({
        messages: [],
        apiKey: 'key',
        model: 'gpt-4o',
      })).rejects.toThrow('OpenAI API error: Bad Key');
    });
  });

  describe('listModels', () => {
    it('should list models', async () => {
      const mockData = {
        data: [{ id: 'gpt-4' }, { id: 'gpt-3.5' }],
      };
      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const models = await openaiProvider.listModels('key');

      expect(models).toEqual(['gpt-3.5', 'gpt-4']); // sorted
      expect(global.fetch).toHaveBeenCalledWith('https://api.openai.com/v1/models', expect.objectContaining({
        headers: { 'Authorization': 'Bearer key' }
      }));
    });
  });
});
