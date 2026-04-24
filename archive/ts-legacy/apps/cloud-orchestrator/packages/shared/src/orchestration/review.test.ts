
import { runCodeReview } from './review';
import { getProvider } from './providers';

// Mock dependencies
jest.mock('./providers', () => ({
  getProvider: jest.fn(),
}));

describe('Code Review Orchestration', () => {
  const mockProvider = {
    complete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getProvider as jest.Mock).mockReturnValue(mockProvider);
  });

  describe('runCodeReview', () => {
    const defaultRequest = {
      codeContext: 'const x = 1;',
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'key',
    };

    it('should run a simple review', async () => {
      mockProvider.complete.mockResolvedValue({ content: 'Review comments' });

      const result = await runCodeReview(defaultRequest);

      expect(result).toBe('Review comments');
      expect(mockProvider.complete).toHaveBeenCalledTimes(1);
    });

    it('should run a comprehensive review', async () => {
      mockProvider.complete.mockResolvedValue({ content: 'Section review' });

      const result = await runCodeReview({ ...defaultRequest, reviewType: 'comprehensive' });

      // 3 personas
      expect(mockProvider.complete).toHaveBeenCalledTimes(3);
      expect(result).toContain('# Comprehensive Code Review');
      expect(result).toContain('Security Expert');
      expect(result).toContain('Performance Engineer');
      expect(result).toContain('Clean Code Advocate');
    });

    it('should throw error if provider not found', async () => {
      (getProvider as jest.Mock).mockReturnValue(undefined);

      await expect(runCodeReview(defaultRequest))
        .rejects.toThrow('Provider openai not found');
    });

    it('should run a structured JSON review', async () => {
        const jsonResponse = {
            summary: "Good code",
            score: 90,
            issues: []
        };
        mockProvider.complete.mockResolvedValue({ content: JSON.stringify(jsonResponse) });

        const result = await runCodeReview({ ...defaultRequest, outputFormat: 'json' });

        expect(result).toEqual(expect.objectContaining({
            summary: "Good code",
            score: 90,
            issues: []
        }));
        expect(mockProvider.complete).toHaveBeenCalledWith(expect.objectContaining({
            jsonMode: true
        }));
    });

    it('should handle invalid JSON in structured review gracefully', async () => {
        mockProvider.complete.mockResolvedValue({ content: 'Invalid JSON' });

        const result = await runCodeReview({ ...defaultRequest, outputFormat: 'json' });
        
        // Assert using type casting since we know the shape of the fallback object
        expect(result).toEqual(expect.objectContaining({
            score: 0,
            issues: [],
            summary: "Failed to generate structured review."
        }));
    });

    it('should support custom personas in comprehensive review', async () => {
        mockProvider.complete.mockResolvedValue({ content: 'Custom review' });
        
        const customPersonas = [
            { role: 'Database Expert', prompt: 'Check SQL' },
            { role: 'UI Expert', prompt: 'Check CSS' }
        ];

        const result = await runCodeReview({ 
            ...defaultRequest, 
            reviewType: 'comprehensive',
            customPersonas
        });

        expect(mockProvider.complete).toHaveBeenCalledTimes(2);
        expect(result).toContain('Database Expert');
        expect(result).toContain('UI Expert');
    });
  });
});
