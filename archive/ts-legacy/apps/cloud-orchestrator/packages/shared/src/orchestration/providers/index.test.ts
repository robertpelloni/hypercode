
import { getProvider, generateText } from './index';
import { ProviderInterface } from '../types';

// Mock providers
const mockOpenAI: ProviderInterface = {
  id: 'openai',
  complete: jest.fn(),
  listModels: jest.fn(),
};

const mockAnthropic: ProviderInterface = {
  id: 'anthropic',
  complete: jest.fn(),
  listModels: jest.fn(),
};

// We need to re-mock the modules completely for the test file to pick up the changes
// Since Jest mocks are hoisted, we define the mocks using the variables declared above 
// but we need to ensure they are accessible.
// However, variables inside `describe` or top-level `const` might not be accessible inside `jest.mock` factory.
// The safe pattern is to define the mock implementation inside the factory or use `jest.fn()` directly.

jest.mock('./openai', () => ({
  openaiProvider: {
    id: 'openai',
    complete: jest.fn(),
    listModels: jest.fn(),
  }
}));

jest.mock('./anthropic', () => ({
  anthropicProvider: {
    id: 'anthropic',
    complete: jest.fn(),
    listModels: jest.fn(),
  }
}));

jest.mock('./gemini', () => ({
  geminiProvider: { id: 'gemini', complete: jest.fn(), listModels: jest.fn() }
}));

// Import the mocked objects to assert on them
import { openaiProvider } from './openai';

describe('Provider Registry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProvider', () => {
    it('should return the correct provider', () => {
      expect(getProvider('openai')).toBeDefined();
      expect(getProvider('openai')?.id).toBe('openai');
      expect(getProvider('anthropic')).toBeDefined();
    });

    it('should return undefined for unknown provider', () => {
      expect(getProvider('unknown')).toBeUndefined();
    });
  });

  describe('generateText', () => {
    it('should generate text using the specified provider', async () => {
      (openaiProvider.complete as jest.Mock).mockResolvedValue({ content: 'Hello' });

      const result = await generateText({
        provider: 'openai',
        apiKey: 'key',
        model: 'model',
        messages: [{ role: 'user', content: 'Hi' }]
      });

      expect(result).toBe('Hello');
      expect(openaiProvider.complete).toHaveBeenCalledWith({
        apiKey: 'key',
        model: 'model',
        messages: [{ role: 'user', content: 'Hi' }]
      });
    });

    it('should throw error for unknown provider', async () => {
      await expect(generateText({
        provider: 'unknown',
        apiKey: 'key',
        model: 'model',
        messages: []
      })).rejects.toThrow('Unknown provider: unknown');
    });
  });
});
