
import { geminiProvider } from './gemini';

global.fetch = jest.fn() as unknown as typeof fetch;

describe('Gemini Provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('complete', () => {
    it('should call Gemini API correctly', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Hello from Gemini' }]
          }
        }]
      };
      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await geminiProvider.complete({
        messages: [{ role: 'user', content: 'Hi' }],
        apiKey: 'key',
        model: 'gemini-1.5-flash',
        systemPrompt: 'SysPrompt',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('gemini-1.5-flash:generateContent'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"systemInstruction":{"parts":[{"text":"SysPrompt"}]}')
        })
      );
      expect(result.content).toBe('Hello from Gemini');
    });

    it('should map system role in messages to user role', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Response' }]
          }
        }]
      };
      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await geminiProvider.complete({
        messages: [
          { role: 'user', content: 'User msg' },
          { role: 'system', content: 'Intermediate system msg' },
          { role: 'assistant', content: 'Assistant msg' }
        ],
        apiKey: 'key',
        model: 'gemini-1.5-flash',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringMatching(/"role":"user","parts":\[{"text":"Intermediate system msg"}\]/)
        })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringMatching(/"role":"model","parts":\[{"text":"Assistant msg"}\]/)
        })
      );
    });

    it('should throw error on API failure', async () => {
      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({ error: { message: 'Invalid API Key' } }),
      });

      await expect(geminiProvider.complete({
        messages: [],
        apiKey: 'key',
        model: 'gemini',
      })).rejects.toThrow('Gemini API error: Invalid API Key');
    });
  });

  describe('listModels', () => {
    it('should list models from API', async () => {
      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: 'models/gemini-1.5-flash', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-pro-vision', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/embedding-001', supportedGenerationMethods: ['embedContent'] }
          ]
        })
      });

      const models = await geminiProvider.listModels('key');
      expect(models).toContain('gemini-1.5-flash');
      expect(models).not.toContain('embedding-001');
    });

    it('should fallback to defaults on error', async () => {
      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: false
      });
      const models = await geminiProvider.listModels('key');
      expect(models).toContain('gemini-1.5-flash');
    });
  });
});
