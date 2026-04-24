import type { CompletionParams, CompletionResult, ProviderInterface } from '../types';

export const openaiProvider: ProviderInterface = {
  id: 'openai',
  async complete(params: CompletionParams): Promise<CompletionResult> {
    const { messages, apiKey, model, systemPrompt } = params;
    const modelToUse = model || 'gpt-4o';

    const msgs = messages.map(m => {
        let role = m.role;
        if (role !== 'user' && role !== 'system' && role !== 'assistant') {
            role = 'assistant';
        }

        const msg: any = { role, content: m.content };
        
        if (m.name) {
            const sanitized = m.name.replace(/[^a-zA-Z0-9_-]/g, '_');
            if (sanitized) msg.name = sanitized;
        }
        
        return msg;
    });

    if (systemPrompt) {
        msgs.unshift({ role: 'system', content: systemPrompt });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: msgs,
        max_completion_tokens: params.maxTokens || 300,
        response_format: params.jsonMode ? { type: "json_object" } : undefined
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return { 
      content: data.choices[0]?.message?.content || '',
      usage: data.usage ? {
        prompt_tokens: data.usage.prompt_tokens,
        completion_tokens: data.usage.completion_tokens,
        total_tokens: data.usage.total_tokens
      } : undefined
    };
  },

  async listModels(apiKey: string): Promise<string[]> {
     const resp = await fetch('https://api.openai.com/v1/models', {
         headers: { 'Authorization': `Bearer ${apiKey}` }
     });
     if (!resp.ok) throw new Error('Failed to fetch OpenAI models');
     const data = await resp.json();
     return data.data.map((m: { id: string }) => m.id).sort();
  }
};
