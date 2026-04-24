import type { CompletionParams, CompletionResult, ProviderInterface } from '../types';

interface GeminiModel {
  name: string;
  supportedGenerationMethods?: string[];
}

export const geminiProvider: ProviderInterface = {
  id: 'gemini',
  async complete(params: CompletionParams): Promise<CompletionResult> {
    const { messages, apiKey, model, systemPrompt } = params;
    let modelToUse = model || 'gemini-1.5-flash';
    
    if (modelToUse.startsWith('models/')) {
        modelToUse = modelToUse.replace('models/', '');
    }
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`;

    let response;
    let retries = 3;
    let backoff = 2000;

    while (retries >= 0) {
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: systemPrompt ? {
              parts: [{ text: systemPrompt }]
            } : undefined,
            contents: messages.map(m => {
                const role = m.role === 'assistant' ? 'model' : 'user';
                return {
                    role,
                    parts: [{ text: m.content }]
                };
            }),
            generationConfig: { 
                maxOutputTokens: params.maxTokens || 300,
                responseMimeType: params.jsonMode ? "application/json" : undefined 
            }
          }),
        });

        if (response.status === 429) {
          if (retries === 0) break;
          console.warn(`Gemini API 429 (Rate Limit). Retrying in ${backoff}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
          retries--;
          backoff *= 2;
          continue;
        }

        break;
      } catch (err) {
        if (retries === 0) throw err;
        console.warn(`Gemini API Network Error. Retrying in ${backoff}ms...`, err);
        await new Promise(resolve => setTimeout(resolve, backoff));
        retries--;
        backoff *= 2;
      }
    }

    if (!response || !response.ok) {
      const error = await response?.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${error?.error?.message || response?.statusText || 'Unknown error'}`);
    }

    const data = await response.json();
      return { 
        content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        usage: data.usageMetadata ? {
            prompt_tokens: data.usageMetadata.promptTokenCount,
            completion_tokens: data.usageMetadata.candidatesTokenCount,
            total_tokens: data.usageMetadata.totalTokenCount
        } : undefined
      };
  },

  async listModels(apiKey: string): Promise<string[]> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!response.ok) {
        console.warn('Failed to fetch models from Google, falling back to defaults');
        return ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
      }
      const data = await response.json();
      return data.models
        .filter((m: GeminiModel) => m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: GeminiModel) => m.name.replace('models/', ''));
    } catch (error) {
      console.error('Error listing Gemini models:', error);
      return ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
    }
  }
};
