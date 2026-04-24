
import OpenAI from "openai";

export interface ForgeConfig {
    baseUrl: string;
    apiKey?: string; // Forge master key (if enabled)
}

export interface Model {
    id: string;
    provider: string;
    name: string;
}

export class ForgeService {
    private client: OpenAI;
    private baseUrl: string;

    constructor(config: ForgeConfig = { baseUrl: "http://localhost:8080/v1" }) {
        this.baseUrl = config.baseUrl;
        this.client = new OpenAI({
            baseURL: this.baseUrl,
            apiKey: config.apiKey || "forge-key", // Fallback or strict key
            dangerouslyAllowBrowser: true // Since we might use this in specific contexts, but mainly server-side
        });
    }

    /**
     * Set a new Base URL for the Forge instance
     */
    public setUrl(url: string) {
        this.baseUrl = url;
        this.client = new OpenAI({
            baseURL: this.baseUrl,
            apiKey: this.client.apiKey,
        });
    }

    /**
     * List all available models from connected providers (OpenAI, Anthropic, etc.)
     */
    public async listModels(): Promise<Model[]> {
        try {
            const list = await this.client.models.list();
            // Forge normalizes model list to OpenAI format
            return list.data.map(m => ({
                id: m.id,
                // Heuristic to extract provider if Forge includes it in ID (e.g. "anthropic/claude-3")
                // Otherwise user assumes ID structure.
                provider: m.id.split('/')[0] || 'unknown',
                name: m.id
            }));
        } catch (error) {
            console.error("Failed to list models from Forge:", error);
            throw error;
        }
    }

    /**
     * Proxy a chat completion request through Forge
     */
    public async chatCompletion(params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming): Promise<OpenAI.Chat.Completions.ChatCompletion> {
        return this.client.chat.completions.create(params) as Promise<OpenAI.Chat.Completions.ChatCompletion>;
    }
}
