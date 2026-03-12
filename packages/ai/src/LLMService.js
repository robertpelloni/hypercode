import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import { ModelSelector } from "./ModelSelector.js";
import { ForgeService } from "./ForgeService.js";
dotenv.config();
export class LLMService {
    googleClient;
    openaiClient;
    anthropicClient;
    forgeClient;
    totalUsage = { inputTokens: 0, outputTokens: 0, estimatedCostUSD: 0 };
    modelSelector;
    constructor(modelSelector) {
        this.modelSelector = modelSelector || new ModelSelector();
        if (process.env.GOOGLE_API_KEY) {
            this.googleClient = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        }
        if (process.env.OPENAI_API_KEY) {
            this.openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        }
        if (process.env.ANTHROPIC_API_KEY) {
            this.anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        }
        this.forgeClient = new ForgeService({
            baseUrl: process.env.FORGE_URL || "http://localhost:8080/v1",
            apiKey: process.env.FORGE_API_KEY
        });
    }
    getCostStats() {
        return this.totalUsage;
    }
    getErrorMessage(error) {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        if (error && typeof error === 'object') {
            const maybeMessage = error.message;
            if (typeof maybeMessage === 'string') {
                return maybeMessage;
            }
        }
        return '';
    }
    isRecoverableError(error) {
        const rawMessage = this.getErrorMessage(error);
        const message = rawMessage.toLowerCase();
        const status = error?.status ?? error?.cause?.status ?? error?.error?.status;
        const code = `${error?.code ?? error?.cause?.code ?? error?.error?.code ?? ''}`.toLowerCase();
        if (status === 429 || status === 502 || status === 503 || status === 504) {
            return true;
        }
        if (code === 'econnrefused' || code === 'econnreset' || code === 'etimedout' || code === 'enotfound') {
            return true;
        }
        return (message.includes('429') ||
            message.includes('quota') ||
            message.includes('insufficient_quota') ||
            message.includes('rate limit') ||
            message.includes('resource_exhausted') ||
            message.includes('overloaded') ||
            message.includes('temporarily unavailable') ||
            message.includes('timeout') ||
            message.includes('timed out') ||
            message.includes('fetch failed'));
    }
    trackUsage(provider, model, usage) {
        if (!usage)
            return;
        this.totalUsage.inputTokens += usage.inputTokens;
        this.totalUsage.outputTokens += usage.outputTokens;
        this.modelSelector.getQuotaService().trackUsage(model, usage.inputTokens, usage.outputTokens);
        this.totalUsage.estimatedCostUSD = this.modelSelector.getQuotaService().getSessionTotal();
    }
    async generateText(initialProvider, initialModelId, systemPrompt, userPrompt, options) {
        let provider = initialProvider;
        let modelId = initialModelId;
        const maxAttempts = this.modelSelector ? 5 : 1;
        let lastError;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`[LLMService] Generating with ${provider}/${modelId} (Attempt ${attempt}/${maxAttempts})...`);
            try {
                let response;
                if (provider === 'forge') {
                    if (!this.forgeClient)
                        throw new Error('Forge Service not initialized.');
                    const messages = [
                        { role: 'system', content: systemPrompt },
                        ...(options?.history || []).map((h) => ({ role: h.role, content: h.content })),
                        { role: 'user', content: userPrompt }
                    ];
                    if (options?.images && options.images.length > 0) {
                        const userContent = [{ type: 'text', text: userPrompt }];
                        options.images.forEach((img) => {
                            userContent.push({
                                type: 'image_url',
                                image_url: {
                                    url: `data:${img.mimeType};base64,${img.base64}`
                                }
                            });
                        });
                        messages[1].content = userContent;
                    }
                    const completion = await this.forgeClient.chatCompletion({
                        messages,
                        model: modelId,
                    });
                    response = {
                        content: completion.choices[0].message.content || '',
                        usage: {
                            inputTokens: completion.usage?.prompt_tokens || 0,
                            outputTokens: completion.usage?.completion_tokens || 0
                        }
                    };
                }
                else if (provider === 'google') {
                    if (!this.googleClient)
                        throw new Error('Google API Key not configured.');
                    const model = this.googleClient.getGenerativeModel({ model: modelId });
                    const parts = [{ text: userPrompt }];
                    if (options?.images) {
                        options.images.forEach((img) => {
                            parts.push({
                                inlineData: {
                                    mimeType: img.mimeType,
                                    data: img.base64
                                }
                            });
                        });
                    }
                    const contents = [
                        ...(options?.history || []).map((h) => ({
                            role: h.role === 'assistant' ? 'model' : h.role,
                            parts: [{ text: h.content }]
                        })),
                        { role: 'user', parts }
                    ];
                    const result = await model.generateContent({
                        contents,
                        systemInstruction: systemPrompt
                    });
                    const text = result.response.text();
                    response = {
                        content: text,
                        usage: {
                            inputTokens: (systemPrompt.length + userPrompt.length) / 4,
                            outputTokens: text.length / 4
                        }
                    };
                }
                else if (provider === 'anthropic') {
                    if (!this.anthropicClient)
                        throw new Error('Anthropic API Key not configured.');
                    const content = [{ type: 'text', text: userPrompt }];
                    if (options?.images) {
                        options.images.forEach((img) => {
                            content.push({
                                type: 'image',
                                source: {
                                    type: 'base64',
                                    media_type: img.mimeType,
                                    data: img.base64
                                }
                            });
                        });
                    }
                    const historyMessages = (options?.history || []).map((h) => ({
                        role: h.role === 'model' ? 'assistant' : h.role,
                        content: h.content
                    }));
                    const msg = await this.anthropicClient.messages.create({
                        model: modelId,
                        max_tokens: 4096,
                        system: systemPrompt,
                        messages: [...historyMessages, { role: 'user', content }]
                    });
                    response = {
                        content: msg.content[0].text,
                        usage: {
                            inputTokens: msg.usage.input_tokens,
                            outputTokens: msg.usage.output_tokens
                        }
                    };
                }
                else if (provider === 'openai') {
                    if (!this.openaiClient)
                        throw new Error('OpenAI API Key not configured.');
                    const completion = await this.openaiClient.chat.completions.create({
                        messages: [
                            { role: 'system', content: systemPrompt },
                            ...(options?.history || []).map((h) => ({ role: h.role, content: h.content })),
                            { role: 'user', content: userPrompt }
                        ],
                        model: modelId,
                    });
                    response = {
                        content: completion.choices[0].message.content || '',
                        usage: {
                            inputTokens: completion.usage?.prompt_tokens || 0,
                            outputTokens: completion.usage?.completion_tokens || 0
                        }
                    };
                }
                else if (provider === 'deepseek') {
                    const dsClient = new OpenAI({
                        apiKey: process.env.DEEPSEEK_API_KEY,
                        baseURL: 'https://api.deepseek.com'
                    });
                    const completion = await dsClient.chat.completions.create({
                        messages: [
                            { role: 'system', content: systemPrompt },
                            ...(options?.history || []).map((h) => ({ role: h.role, content: h.content })),
                            { role: 'user', content: userPrompt }
                        ],
                        model: modelId,
                    });
                    response = {
                        content: completion.choices[0].message.content || '',
                        usage: {
                            inputTokens: completion.usage?.prompt_tokens || 0,
                            outputTokens: completion.usage?.completion_tokens || 0
                        }
                    };
                }
                else if (provider === 'ollama') {
                    const res = await fetch('http://localhost:11434/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: modelId || 'gemma',
                            messages: [
                                { role: 'system', content: systemPrompt },
                                ...(options?.history || []).map((h) => ({ role: h.role, content: h.content })),
                                { role: 'user', content: userPrompt }
                            ],
                            stream: false,
                            options: {
                                num_ctx: 8192
                            }
                        })
                    });
                    if (!res.ok) {
                        throw new Error(`Ollama Error: ${res.statusText}`);
                    }
                    const data = await res.json();
                    response = {
                        content: data.message?.content || '',
                        usage: {
                            inputTokens: data.prompt_eval_count || 0,
                            outputTokens: data.eval_count || 0
                        }
                    };
                }
                else if (provider === 'lmstudio') {
                    const lmClient = new OpenAI({
                        apiKey: 'lm-studio',
                        baseURL: 'http://localhost:1234/v1',
                        timeout: options?.timeout || 60000
                    });
                    const completion = await lmClient.chat.completions.create({
                        messages: [
                            { role: 'system', content: systemPrompt },
                            ...(options?.history || []).map((h) => ({ role: h.role, content: h.content })),
                            { role: 'user', content: userPrompt }
                        ],
                        model: modelId || 'local-model',
                    });
                    response = {
                        content: completion.choices[0].message.content || '',
                        usage: {
                            inputTokens: completion.usage?.prompt_tokens || 0,
                            outputTokens: completion.usage?.completion_tokens || 0
                        }
                    };
                }
                else {
                    throw new Error(`Unsupported provider: ${provider}`);
                }
                this.trackUsage(provider, modelId, response.usage);
                return response;
            }
            catch (error) {
                lastError = error;
                const isRecoverable = this.isRecoverableError(error);
                if (this.modelSelector && isRecoverable && attempt < maxAttempts) {
                    console.warn(`[LLMService] ⚠️ Provider ${provider} failed (${error.message}). Switching models...`);
                    this.modelSelector.reportFailure(provider, modelId, error);
                    const next = await this.modelSelector.selectModel({
                        taskComplexity: options?.taskComplexity || 'medium',
                        taskType: options?.taskType,
                        routingTaskType: options?.routingTaskType,
                        routingStrategy: options?.routingStrategy,
                        provider: undefined,
                        exclude: [`${provider}:${modelId}`]
                    });
                    if (next.provider === provider && next.modelId === modelId) {
                        throw error;
                    }
                    console.log(`[LLMService] 🔄 Switched to: ${next.provider}/${next.modelId}`);
                    provider = next.provider;
                    modelId = next.modelId;
                }
                else {
                    console.error(`[LLMService] ❌ Fatal Error from ${provider}:`, error.message);
                    throw error;
                }
            }
        }
        throw lastError;
    }
}
