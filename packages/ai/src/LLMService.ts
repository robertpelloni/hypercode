import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config();

export interface LLMResponse {
    content: string;
    usage?: {
        inputTokens: number;
        outputTokens: number;
    };
}

import { ModelSelector } from "./ModelSelector.js";
import { ForgeService } from "./ForgeService.js";

export class LLMService {
    private googleClient?: GoogleGenerativeAI;
    private openaiClient?: OpenAI;
    private anthropicClient?: Anthropic;
    private forgeClient?: ForgeService;
    private totalUsage = { inputTokens: 0, outputTokens: 0, estimatedCostUSD: 0 };
    public modelSelector: ModelSelector;

    constructor(modelSelector?: ModelSelector) {
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
        // Initialize Forge (defaults to localhost:8080)
        this.forgeClient = new ForgeService({
            baseUrl: process.env.FORGE_URL || "http://localhost:8080/v1",
            apiKey: process.env.FORGE_API_KEY
        });
    }

    public getCostStats() {
        return this.totalUsage;
    }

    private trackUsage(provider: string, model: string, usage?: { inputTokens: number, outputTokens: number }) {
        if (!usage) return;
        this.totalUsage.inputTokens += usage.inputTokens;
        this.totalUsage.outputTokens += usage.outputTokens;

        this.modelSelector.getQuotaService().trackUsage(model, usage.inputTokens, usage.outputTokens);
        this.totalUsage.estimatedCostUSD = this.modelSelector.getQuotaService().getSessionTotal();
    }

    async generateText(initialProvider: string, initialModelId: string, systemPrompt: string, userPrompt: string, options?: { timeout?: number, taskComplexity?: 'low' | 'medium' | 'high', images?: { base64: string, mimeType: string }[] }): Promise<LLMResponse> {
        let provider = initialProvider;
        let modelId = initialModelId;

        const maxAttempts = this.modelSelector ? 5 : 1;
        let lastError: any;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`[LLMService] Generating with ${provider}/${modelId} (Attempt ${attempt}/${maxAttempts})...`);

            try {
                let response: LLMResponse;

                if (provider === 'forge') {
                    if (!this.forgeClient) throw new Error("Forge Service not initialized.");

                    const messages: any[] = [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ];

                    // Handle images for Forge/OpenAI compatible API
                    if (options?.images && options.images.length > 0) {
                        const userContent: any[] = [{ type: "text", text: userPrompt }];
                        options.images.forEach(img => {
                            userContent.push({
                                type: "image_url",
                                image_url: {
                                    url: `data:${img.mimeType};base64,${img.base64}`
                                }
                            });
                        });
                        messages[1].content = userContent;
                    }

                    const completion = await this.forgeClient.chatCompletion({
                        messages: messages,
                        model: modelId,
                    });

                    response = {
                        content: completion.choices[0].message.content || "",
                        usage: {
                            inputTokens: completion.usage?.prompt_tokens || 0,
                            outputTokens: completion.usage?.completion_tokens || 0
                        }
                    };
                }

                else if (provider === 'google') {
                    if (!this.googleClient) throw new Error("Google API Key not configured.");
                    const model = this.googleClient.getGenerativeModel({ model: modelId });

                    const parts: any[] = [{ text: userPrompt }];
                    if (options?.images) {
                        options.images.forEach(img => {
                            parts.push({
                                inlineData: {
                                    mimeType: img.mimeType,
                                    data: img.base64
                                }
                            });
                        });
                    }

                    const result = await model.generateContent({
                        contents: [{ role: 'user', parts: parts }],
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
                    if (!this.anthropicClient) throw new Error("Anthropic API Key not configured.");

                    const content: any[] = [{ type: "text", text: userPrompt }];
                    if (options?.images) {
                        options.images.forEach(img => {
                            content.push({
                                type: "image",
                                source: {
                                    type: "base64",
                                    media_type: img.mimeType as any,
                                    data: img.base64
                                }
                            });
                        });
                    }

                    const msg = await this.anthropicClient.messages.create({
                        model: modelId,
                        max_tokens: 4096, // Increased from 1024
                        system: systemPrompt,
                        messages: [{ role: "user", content: content }]
                    });
                    response = {
                        content: (msg.content[0] as any).text,
                        usage: {
                            inputTokens: msg.usage.input_tokens,
                            outputTokens: msg.usage.output_tokens
                        }
                    };
                }

                else if (provider === 'openai') {
                    if (!this.openaiClient) throw new Error("OpenAI API Key not configured.");
                    const completion = await this.openaiClient.chat.completions.create({
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt }
                        ],
                        model: modelId,
                    });
                    response = {
                        content: completion.choices[0].message.content || "",
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
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt }
                        ],
                        model: modelId,
                    });

                    response = {
                        content: completion.choices[0].message.content || "",
                        usage: {
                            inputTokens: completion.usage?.prompt_tokens || 0,
                            outputTokens: completion.usage?.completion_tokens || 0
                        }
                    };
                }

                else if (provider === 'ollama') {
                    // Ollama Local Inference
                    const res = await fetch('http://localhost:11434/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: modelId || 'gemma',
                            messages: [
                                { role: 'system', content: systemPrompt },
                                { role: 'user', content: userPrompt }
                            ],
                            stream: false,
                            options: {
                                num_ctx: 8192 // Ensure context
                            }
                        })
                    });

                    if (!res.ok) {
                        throw new Error(`Ollama Error: ${res.statusText}`);
                    }

                    const data: any = await res.json();
                    response = {
                        content: data.message?.content || "",
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
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt }
                        ],
                        model: modelId || 'local-model',
                    });

                    response = {
                        content: completion.choices[0].message.content || "",
                        usage: {
                            inputTokens: completion.usage?.prompt_tokens || 0,
                            outputTokens: completion.usage?.completion_tokens || 0
                        }
                    };
                } else {
                    throw new Error(`Unsupported provider: ${provider}`);
                }

                // Track Usage
                this.trackUsage(provider, modelId, response.usage);

                return response;

            } catch (error: any) {
                lastError = error;
                const isRecoverable =
                    error.message.includes('429') ||
                    error.message.includes('Quota') ||
                    error.message.includes('Overloaded') ||
                    error.message.includes('Rate limit') ||
                    error.cause?.code === 'ECONNREFUSED' ||
                    error.message.includes('fetch failed');

                if (this.modelSelector && isRecoverable && attempt < maxAttempts) {
                    console.warn(`[LLMService] ⚠️ Provider ${provider} failed (${error.message}). Switching models...`);

                    // 1. Report Failure
                    this.modelSelector.reportFailure(modelId);

                    // 2. Select Next Model
                    // Use options.taskComplexity if available, else 'medium'
                    const next = await this.modelSelector.selectModel({
                        taskComplexity: options?.taskComplexity || 'medium',
                        provider: undefined // Clear preference, force automatic selection
                    });

                    console.log(`[LLMService] 🔄 Switched to: ${next.provider}/${next.modelId}`);
                    provider = next.provider;
                    modelId = next.modelId;

                    // Continue to next attempt iteration
                } else {
                    console.error(`[LLMService] ❌ Fatal Error from ${provider}:`, error.message);
                    throw error;
                }
            }
        }

        throw lastError;
    }
}
