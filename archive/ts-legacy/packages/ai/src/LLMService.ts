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
    routing?: {
        attempts: number;
        finalProvider: string;
        finalModelId: string;
        failovers: Array<{
            fromProvider: string;
            fromModelId: string;
            reason: string;
            recoverable: boolean;
        }>;
    };
}

/** A single recorded LLM routing decision, stored in the ring buffer for telemetry. */
export interface RoutingEvent {
    timestamp: number;
    initialProvider: string;
    initialModelId: string;
    finalProvider: string;
    finalModelId: string;
    attempts: number;
    durationMs: number;
    hadFailover: boolean;
    failovers: Array<{
        fromProvider: string;
        fromModelId: string;
        reason: string;
        recoverable: boolean;
    }>;
}

/** Maximum number of routing events to retain in memory. */
const ROUTING_HISTORY_LIMIT = 50;

export interface GenerateTextOptions {
    timeout?: number;
    taskComplexity?: 'low' | 'medium' | 'high';
    taskType?: 'worker' | 'supervisor';
    routingTaskType?: 'coding' | 'planning' | 'research' | 'general' | 'worker' | 'supervisor';
    routingStrategy?: 'cheapest' | 'best' | 'round-robin';
    images?: { base64: string; mimeType: string }[];
    history?: { role: string; content: string }[];
}

<<<<<<< HEAD:archive/ts-legacy/packages/ai/src/LLMService.ts
import { DEFAULT_OPENROUTER_FREE_MODEL, ModelSelector, type ModelSelectionRequest, type SelectedModel } from "./ModelSelector.js";
=======
import { ModelSelector, type ModelSelectionRequest, type SelectedModel } from "./ModelSelector.js";
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/ai/src/LLMService.ts
import { ForgeService } from "./ForgeService.js";

type ExtendedModelSelectionRequest = ModelSelectionRequest & {
    routingTaskType?: GenerateTextOptions['routingTaskType'];
    routingStrategy?: GenerateTextOptions['routingStrategy'];
};

type RoutingAwareModelSelector = ModelSelector & {
    reportFailure(provider: string, modelId: string, cause?: unknown): void;
    selectModel(request: ExtendedModelSelectionRequest): Promise<SelectedModel>;
};

export class LLMService {
    private googleClient?: GoogleGenerativeAI;
    private openaiClient?: OpenAI;
    private anthropicClient?: Anthropic;
<<<<<<< HEAD:archive/ts-legacy/packages/ai/src/LLMService.ts
    private openrouterClient?: OpenAI;
=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/ai/src/LLMService.ts
    private forgeClient?: ForgeService;
    private totalUsage = { inputTokens: 0, outputTokens: 0, estimatedCostUSD: 0 };
    /** Ring buffer of the last ROUTING_HISTORY_LIMIT routing decisions (newest first). */
    private routingHistory: RoutingEvent[] = [];
    public modelSelector: RoutingAwareModelSelector;

    constructor(
        modelSelector?: RoutingAwareModelSelector,
        private hooks?: {
            onFallback?: (fromProvider: string, fromModelId: string, toProvider: string, toModelId: string, reason: string) => void;
            onQuotaExhausted?: (provider: string, modelId: string, reason: string) => void;
        }
    ) {
        this.modelSelector = modelSelector || new ModelSelector() as RoutingAwareModelSelector;
        if (process.env.GOOGLE_API_KEY) {
            this.googleClient = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        }
        if (process.env.OPENAI_API_KEY) {
            this.openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        }
        if (process.env.ANTHROPIC_API_KEY) {
            this.anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        }
<<<<<<< HEAD:archive/ts-legacy/packages/ai/src/LLMService.ts
        if (process.env.OPENROUTER_API_KEY) {
            this.openrouterClient = new OpenAI({
                apiKey: process.env.OPENROUTER_API_KEY,
                baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
            });
        }
=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/ai/src/LLMService.ts
        // Initialize Forge (defaults to localhost:8080)
        this.forgeClient = new ForgeService({
            baseUrl: process.env.FORGE_URL || "http://localhost:8080/v1",
            apiKey: process.env.FORGE_API_KEY
        });
    }

    public getCostStats() {
        return this.totalUsage;
    }

    /** Returns the routing history ring buffer (most-recent first). */
    public getRoutingHistory(): RoutingEvent[] {
        return [...this.routingHistory];
    }

    /**
     * Probes local LLM endpoints to check for availability.
     */
    public async probeLocalProviders(): Promise<{ ollama: boolean; lmstudio: boolean }> {
        const results = { ollama: false, lmstudio: false };

        try {
            // Probe Ollama (default port 11434)
            const ollamaRes = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(500) });
            results.ollama = ollamaRes.ok;
        } catch (e) {
            results.ollama = false;
        }

        try {
            // Probe LM Studio (default port 1234)
            const lmsRes = await fetch("http://localhost:1234/v1/models", { signal: AbortSignal.timeout(500) });
            results.lmstudio = lmsRes.ok;
        } catch (e) {
            results.lmstudio = false;
        }

        return results;
    }

    private getErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }

        if (typeof error === 'string') {
            return error;
        }

        if (error && typeof error === 'object') {
            const maybeMessage = (error as { message?: unknown }).message;
            if (typeof maybeMessage === 'string') {
                return maybeMessage;
            }
        }

        return '';
    }

    private isRecoverableError(error: unknown): boolean {
        const rawMessage = this.getErrorMessage(error);
        const message = rawMessage.toLowerCase();
        const structured = error as {
            status?: number;
            code?: string | number;
            cause?: { code?: string | number; status?: number; message?: string };
            error?: { code?: string | number; status?: number; message?: string };
        };

        const status = structured?.status ?? structured?.cause?.status ?? structured?.error?.status;
        const code = `${structured?.code ?? structured?.cause?.code ?? structured?.error?.code ?? ''}`.toLowerCase();

        if (status === 429 || status === 502 || status === 503 || status === 504) {
            return true;
        }

        if (code === 'econnrefused' || code === 'econnreset' || code === 'etimedout' || code === 'enotfound') {
            return true;
        }

        return (
            message.includes('429') ||
            message.includes('quota') ||
            message.includes('insufficient_quota') ||
            message.includes('rate limit') ||
            message.includes('resource_exhausted') ||
            message.includes('overloaded') ||
            message.includes('temporarily unavailable') ||
            message.includes('timeout') ||
            message.includes('timed out') ||
            message.includes('fetch failed')
        );
    }

    private isProviderUnavailableError(error: unknown): boolean {
        const message = this.getErrorMessage(error).toLowerCase();
        const structured = error as {
            status?: number;
            code?: string | number;
            cause?: { code?: string | number; status?: number; message?: string };
            error?: { code?: string | number; status?: number; message?: string };
        };

        const status = structured?.status ?? structured?.cause?.status ?? structured?.error?.status;
        const code = `${structured?.code ?? structured?.cause?.code ?? structured?.error?.code ?? ''}`.toLowerCase();

        if (status === 401 || status === 403 || status === 404) {
            return true;
        }

        if (code === 'invalid_api_key' || code === 'authentication_error' || code === 'model_not_found' || code === 'permission_denied') {
            return true;
        }

        return (
            message.includes('api key not configured') ||
            message.includes('authentication') ||
            message.includes('unauthorized') ||
            message.includes('forbidden') ||
            message.includes('invalid api key') ||
            message.includes('permission denied') ||
            message.includes('model not found') ||
            message.includes('unsupported model')
        );
    }

    private trackUsage(provider: string, model: string, usage?: { inputTokens: number, outputTokens: number }) {
        if (!usage) return;
        this.totalUsage.inputTokens += usage.inputTokens;
        this.totalUsage.outputTokens += usage.outputTokens;

        this.modelSelector.getQuotaService().trackUsage(model, usage.inputTokens, usage.outputTokens);
        this.totalUsage.estimatedCostUSD = this.modelSelector.getQuotaService().getSessionTotal();
    }

    async generateText(initialProvider: string, initialModelId: string, systemPrompt: string, userPrompt: string, options?: GenerateTextOptions): Promise<LLMResponse> {
        let provider = initialProvider;
        let modelId = initialModelId;

        const maxAttempts = this.modelSelector ? 5 : 1;
        let lastError: any;
        const excludedCandidates = new Set<string>();
        const failovers: Array<{
            fromProvider: string;
            fromModelId: string;
            reason: string;
            recoverable: boolean;
        }> = [];
        const startedAt = Date.now();

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`[LLMService] Generating with ${provider}/${modelId} (Attempt ${attempt}/${maxAttempts})...`);

            try {
                let response: LLMResponse;

                if (provider === 'forge') {
                    if (!this.forgeClient) throw new Error("Forge Service not initialized.");

                    const messages: any[] = [
                        { role: "system", content: systemPrompt },
                        // Inject conversation history before the current user message
                        ...(options?.history || []).map(h => ({ role: h.role, content: h.content })),
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

                    // Build contents array with conversation history for multi-turn
                    const contents: any[] = [
                        ...(options?.history || []).map(h => ({
                            role: h.role === 'assistant' ? 'model' : h.role,
                            parts: [{ text: h.content }]
                        })),
                        { role: 'user', parts: parts }
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

                    // Build messages array with conversation history for multi-turn
                    const historyMessages: any[] = (options?.history || []).map(h => ({
                        role: h.role === 'model' ? 'assistant' : h.role,
                        content: h.content
                    }));
                    const msg = await this.anthropicClient.messages.create({
                        model: modelId,
                        max_tokens: 4096,
                        system: systemPrompt,
                        messages: [...historyMessages, { role: "user", content: content }]
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
                            ...(options?.history || []).map(h => ({ role: h.role as any, content: h.content })),
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
                            ...(options?.history || []).map(h => ({ role: h.role as any, content: h.content })),
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

<<<<<<< HEAD:archive/ts-legacy/packages/ai/src/LLMService.ts
                else if (provider === 'openrouter') {
                    if (!this.openrouterClient) throw new Error("OpenRouter API Key not configured.");
                    const completion = await this.openrouterClient.chat.completions.create({
                        messages: [
                            { role: "system", content: systemPrompt },
                            ...(options?.history || []).map(h => ({ role: h.role as any, content: h.content })),
                            { role: "user", content: userPrompt }
                        ],
                        model: modelId || DEFAULT_OPENROUTER_FREE_MODEL,
                    }, {
                        headers: {
                            ...(process.env.OPENROUTER_HTTP_REFERER ? { 'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER } : {}),
                            ...(process.env.OPENROUTER_X_TITLE ? { 'X-Title': process.env.OPENROUTER_X_TITLE } : {}),
                        }
                    } as any);

                    response = {
                        content: completion.choices[0].message.content || "",
                        usage: {
                            inputTokens: completion.usage?.prompt_tokens || 0,
                            outputTokens: completion.usage?.completion_tokens || 0
                        }
                    };
                }

=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/ai/src/LLMService.ts
                else if (provider === 'ollama') {
                    // Ollama Local Inference
                    const res = await fetch('http://localhost:11434/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: modelId || 'gemma',
                            messages: [
                                { role: 'system', content: systemPrompt },
                                ...(options?.history || []).map(h => ({ role: h.role, content: h.content })),
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
                            ...(options?.history || []).map(h => ({ role: h.role as any, content: h.content })),
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

                response.routing = {
                    attempts: attempt,
                    finalProvider: provider,
                    finalModelId: modelId,
                    failovers,
                };

                // Record in telemetry ring buffer (most-recent first, capped at ROUTING_HISTORY_LIMIT)
                const event: RoutingEvent = {
                    timestamp: Date.now(),
                    initialProvider,
                    initialModelId,
                    finalProvider: provider,
                    finalModelId: modelId,
                    attempts: attempt,
                    durationMs: Date.now() - startedAt,
                    hadFailover: failovers.length > 0,
                    failovers: [...failovers],
                };
                this.routingHistory.unshift(event);
                if (this.routingHistory.length > ROUTING_HISTORY_LIMIT) {
                    this.routingHistory.length = ROUTING_HISTORY_LIMIT;
                }

                return response;

            } catch (error: any) {
                lastError = error;
                const isRecoverable = this.isRecoverableError(error);
                const isProviderUnavailable = this.isProviderUnavailableError(error);
                const shouldFallback = Boolean(this.modelSelector) && attempt < maxAttempts && (isRecoverable || isProviderUnavailable);

                if (shouldFallback) {
                    console.warn(`[LLMService] ⚠️ Provider ${provider} failed (${error.message}). Switching models...`);

                    // 1. Report Failure
                    this.modelSelector.reportFailure(provider, modelId, error);
                    excludedCandidates.add(`${provider}:${modelId}`);

                    const failureMessage = this.getErrorMessage(error);
                    failovers.push({
                        fromProvider: provider,
                        fromModelId: modelId,
                        reason: failureMessage || 'provider failure',
                        recoverable: isRecoverable,
                    });

                    // Broadcast Quota exhaustion Hook if the pathogen stems from a HTTP 402/429 wallet block.
                    if (failureMessage.includes('insufficient_quota') || failureMessage.includes('402') || failureMessage.includes('429') || failureMessage.includes('balance')) {
                        this.hooks?.onQuotaExhausted?.(provider, modelId, failureMessage);
                    }

                    // 2. Select Next Model
                    // Use options.taskComplexity if available, else 'medium'
                    const next = await this.modelSelector.selectModel({
                        taskComplexity: options?.taskComplexity || 'medium',
                        taskType: options?.taskType,
                        routingTaskType: options?.routingTaskType,
                        routingStrategy: options?.routingStrategy,
                        provider: undefined, // Clear preference, force automatic selection
                        exclude: Array.from(excludedCandidates)
                    });

                    if (next.provider === provider && next.modelId === modelId) {
                        throw error;
                    }

                    console.log(`[LLMService] 🔄 Switched to: ${next.provider}/${next.modelId}`);
                    // Broadcast standard fallback logic hook
                    this.hooks?.onFallback?.(provider, modelId, next.provider, next.modelId, failureMessage);

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
