import { DEFAULT_OPENROUTER_FREE_MODEL } from '@hypercode/ai';

import {
    type FallbackCandidateSnapshot,
    type ProviderAuthState,
    type ProviderAuthTruth,
    type ProviderDefinition,
    type ProviderModelDefinition,
    type ProviderTaskType,
} from './types.js';

export const DEFAULT_PROVIDER_CATALOG: ProviderDefinition[] = [
    {
        id: 'google',
        name: 'Google Gemini',
        authMethod: 'api_key',
        envKeys: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'],
        executable: true,
        defaultModel: 'gemini-2.0-flash',
        preferredTasks: ['coding', 'research'],
        models: [
            {
                id: 'gemini-2.0-flash',
                provider: 'google',
                name: 'Gemini 2.0 Flash',
                inputPrice: 0.0001,
                outputPrice: 0.0004,
                contextWindow: 1_000_000,
                tier: 'standard',
                recommendedFor: ['coding', 'worker', 'general'],
                capabilities: ['coding', 'vision', 'tools', 'long_context'],
                executable: true,
                qualityScore: 7,
            },
            {
                id: 'gemini-1.5-pro',
                provider: 'google',
                name: 'Gemini 1.5 Pro',
                inputPrice: 0.0035,
                outputPrice: 0.0105,
                contextWindow: 1_000_000,
                tier: 'premium',
                recommendedFor: ['planning', 'research', 'supervisor'],
                capabilities: ['reasoning', 'vision', 'long_context', 'tools'],
                executable: true,
                qualityScore: 8,
            },
        ],
    },
    {
        id: 'anthropic',
        name: 'Anthropic',
        authMethod: 'api_key',
        envKeys: ['ANTHROPIC_API_KEY'],
        executable: true,
        defaultModel: 'claude-sonnet-4-20250514',
        preferredTasks: ['planning', 'research'],
        models: [
            {
                id: 'claude-sonnet-4-20250514',
                provider: 'anthropic',
                name: 'Claude Sonnet 4',
                inputPrice: 0.003,
                outputPrice: 0.015,
                contextWindow: 200_000,
                tier: 'premium',
                recommendedFor: ['planning', 'research', 'supervisor'],
                capabilities: ['reasoning', 'coding', 'tools', 'long_context'],
                executable: true,
                qualityScore: 10,
            },
        ],
    },
    {
        id: 'openai',
        name: 'OpenAI',
        authMethod: 'api_key',
        envKeys: ['OPENAI_API_KEY'],
        executable: true,
        defaultModel: 'gpt-4o',
        preferredTasks: ['planning', 'coding'],
        models: [
            {
                id: 'gpt-4o',
                provider: 'openai',
                name: 'GPT-4o',
                inputPrice: 0.005,
                outputPrice: 0.015,
                contextWindow: 128_000,
                tier: 'premium',
                recommendedFor: ['planning', 'supervisor'],
                capabilities: ['reasoning', 'coding', 'vision', 'tools'],
                executable: true,
                qualityScore: 9,
            },
            {
                id: 'gpt-4o-mini',
                provider: 'openai',
                name: 'GPT-4o Mini',
                inputPrice: 0.00015,
                outputPrice: 0.0006,
                contextWindow: 128_000,
                tier: 'standard',
                recommendedFor: ['coding', 'general', 'worker'],
                capabilities: ['coding', 'tools'],
                executable: true,
                qualityScore: 6,
            },
        ],
    },
    {
        id: 'deepseek',
        name: 'DeepSeek',
        authMethod: 'api_key',
        envKeys: ['DEEPSEEK_API_KEY'],
        executable: true,
        defaultModel: 'deepseek-chat',
        preferredTasks: ['coding'],
        models: [
            {
                id: 'deepseek-chat',
                provider: 'deepseek',
                name: 'DeepSeek Chat',
                inputPrice: 0.00027,
                outputPrice: 0.0011,
                contextWindow: 64_000,
                tier: 'standard',
                recommendedFor: ['coding', 'general'],
                capabilities: ['coding', 'reasoning'],
                executable: true,
                qualityScore: 7,
            },
        ],
    },
    {
        id: 'openrouter',
        name: 'OpenRouter',
        authMethod: 'api_key',
        envKeys: ['OPENROUTER_API_KEY'],
        executable: true,
        defaultModel: DEFAULT_OPENROUTER_FREE_MODEL,
        preferredTasks: ['coding', 'research', 'general', 'worker'],
        models: [
            {
                id: DEFAULT_OPENROUTER_FREE_MODEL,
                provider: 'openrouter',
                name: 'OpenRouter Free (Mimo Flash)',
                inputPrice: 0,
                outputPrice: 0,
                contextWindow: null,
                tier: 'free',
                recommendedFor: ['coding', 'research', 'general', 'worker'],
                capabilities: ['reasoning', 'coding', 'tools'],
                executable: true,
                qualityScore: 6,
            },
            {
                id: 'openrouter/auto',
                provider: 'openrouter',
                name: 'OpenRouter Auto',
                inputPrice: null,
                outputPrice: null,
                contextWindow: null,
                tier: 'meta',
                capabilities: ['reasoning', 'coding', 'vision', 'tools'],
                executable: true,
                qualityScore: 5,
            },
        ],
    },
    {
        id: 'copilot',
        name: 'GitHub Copilot',
        authMethod: 'pat',
        patEnvKeys: ['COPILOT_PAT', 'GITHUB_TOKEN'],
        executable: false,
        defaultModel: 'copilot/gpt-4.1',
        models: [
            {
                id: 'copilot/gpt-4.1',
                provider: 'copilot',
                name: 'Copilot GPT-4.1',
                inputPrice: null,
                outputPrice: null,
                contextWindow: null,
                tier: 'managed',
                capabilities: ['coding', 'tools'],
                qualityScore: 7,
            },
        ],
    },
    {
        id: 'google-oauth',
        name: 'Google OAuth',
        authMethod: 'oauth',
        oauthEnvKeys: ['GOOGLE_OAUTH_ACCESS_TOKEN'],
        executable: false,
        defaultModel: 'google-oauth/gemini',
        models: [
            {
                id: 'google-oauth/gemini',
                provider: 'google-oauth',
                name: 'Google OAuth Gemini',
                inputPrice: null,
                outputPrice: null,
                contextWindow: null,
                tier: 'managed',
                capabilities: ['reasoning', 'vision'],
                qualityScore: 6,
            },
        ],
    },
    {
        id: 'lmstudio',
        name: 'LM Studio',
        authMethod: 'none',
        executable: true,
        defaultModel: 'local',
        preferredTasks: ['general'],
        models: [
            {
                id: 'local',
                provider: 'lmstudio',
                name: 'LM Studio Local',
                inputPrice: 0,
                outputPrice: 0,
                contextWindow: null,
                tier: 'local',
                recommendedFor: ['general'],
                capabilities: ['coding', 'reasoning'],
                executable: true,
                qualityScore: 4,
            },
        ],
    },
    {
        id: 'ollama',
        name: 'Ollama',
        authMethod: 'none',
        executable: true,
        defaultModel: 'gemma:2b',
        preferredTasks: ['general'],
        models: [
            {
                id: 'gemma:2b',
                provider: 'ollama',
                name: 'Gemma 2B',
                inputPrice: 0,
                outputPrice: 0,
                contextWindow: 8_192,
                tier: 'local',
                recommendedFor: ['general'],
                capabilities: ['coding'],
                executable: true,
                qualityScore: 3,
            },
        ],
    },
];

export class ProviderRegistry {
    private readonly catalog: ProviderDefinition[];
    private readonly modelIndex: Map<string, ProviderModelDefinition>;

    constructor(catalog: ProviderDefinition[] = DEFAULT_PROVIDER_CATALOG) {
        this.catalog = catalog;
        this.modelIndex = new Map(
            catalog.flatMap((provider) => provider.models.map((model) => [model.id, model] as const)),
        );
    }

    public getCatalog(): ProviderDefinition[] {
        return this.catalog;
    }

    public getProvider(providerId: string): ProviderDefinition | undefined {
        return this.catalog.find((provider) => provider.id === providerId);
    }

    public getModel(modelId: string): ProviderModelDefinition | undefined {
        return this.modelIndex.get(modelId);
    }

    public resolveAuthState(providerId: string, env: NodeJS.ProcessEnv = process.env): ProviderAuthState {
        const provider = this.getProvider(providerId);
        if (!provider) {
            throw new Error(`Unknown provider: ${providerId}`);
        }

        const configured = this.hasAuthCredential(provider, env);
        const authenticated = provider.authMethod === 'none' ? true : configured;
        const authTruth = this.computeAuthTruth(provider, env);

        return {
            provider: provider.id,
            name: provider.name,
            authMethod: provider.authMethod,
            configured,
            authenticated,
            detail: this.getAuthDetail(provider, configured),
            authTruth,
        };
    }

    public getAuthStates(env: NodeJS.ProcessEnv = process.env): ProviderAuthState[] {
        return this.catalog.map((provider) => this.resolveAuthState(provider.id, env));
    }

    public getConfiguredProviders(env: NodeJS.ProcessEnv = process.env): ProviderAuthState[] {
        return this.getAuthStates(env).filter((state) => state.authenticated);
    }

    public listExecutableModels(env: NodeJS.ProcessEnv = process.env): ProviderModelDefinition[] {
        return this.catalog.flatMap((provider) => {
            const auth = this.resolveAuthState(provider.id, env);
            if ((provider.executable ?? false) && auth.authenticated) {
                return provider.models.filter((model) => model.executable !== false);
            }
            return [];
        });
    }

    public buildSnapshots(taskType: ProviderTaskType, env: NodeJS.ProcessEnv = process.env): FallbackCandidateSnapshot[] {
        return this.listExecutableModels(env).map((model) => ({
            id: model.id,
            provider: model.provider,
            model: model.id,
            name: model.name,
            inputPrice: model.inputPrice,
            outputPrice: model.outputPrice,
            contextWindow: model.contextWindow,
            tier: model.tier,
            recommended: this.isRecommendedForTask(model, taskType),
            reason: this.isRecommendedForTask(model, taskType) ? `${taskType}-optimized` : 'fallback',
        }));
    }

    public isRecommendedForTask(model: ProviderModelDefinition, taskType: ProviderTaskType): boolean {
        return model.recommendedFor?.includes(taskType) ?? false;
    }

    private hasAuthCredential(provider: ProviderDefinition, env: NodeJS.ProcessEnv): boolean {
        if (provider.authMethod === 'none') {
            return true;
        }

        const keys = [
            ...(provider.envKeys ?? []),
            ...(provider.oauthEnvKeys ?? []),
            ...(provider.patEnvKeys ?? []),
        ];

        return keys.some((key) => {
            const value = env[key];
            return typeof value === 'string' && value.trim().length > 0;
        });
    }

    private getAuthDetail(provider: ProviderDefinition, configured: boolean): string {
        if (provider.authMethod === 'none') {
            return 'Local provider does not require authentication.';
        }

        if (configured) {
            return `${provider.authMethod} credential detected.`;
        }

        const expectedKey = provider.envKeys?.[0] ?? provider.oauthEnvKeys?.[0] ?? provider.patEnvKeys?.[0] ?? 'credential';
        return `Missing ${expectedKey}.`;
    }

    /**
     * Computes the nuanced `ProviderAuthTruth` from environment credentials.
     *
     * - `none` providers are always `'authenticated'` (local, no key needed).
     * - For OAuth providers we additionally check `*_TOKEN_EXPIRES_AT` env vars to
     *   detect a configured-but-expired token without making a live API call.
     * - `'revoked'` cannot be determined from env alone; it is set externally via
     *   `NormalizedQuotaService.markAuthRevoked()` when a live 401/403 is observed.
     */
    private computeAuthTruth(provider: ProviderDefinition, env: NodeJS.ProcessEnv): ProviderAuthTruth {
        if (provider.authMethod === 'none') {
            return 'authenticated';
        }

        const hasCredential = this.hasAuthCredential(provider, env);
        if (!hasCredential) {
            return 'not_configured';
        }

        // For OAuth providers, detect expired tokens via *_TOKEN_EXPIRES_AT env vars.
        if (provider.authMethod === 'oauth') {
            const expiryKeys = (provider.oauthEnvKeys ?? []).map((key) => `${key}_EXPIRES_AT`);
            for (const expiryKey of expiryKeys) {
                const expiryValue = env[expiryKey];
                if (typeof expiryValue === 'string' && expiryValue.trim().length > 0) {
                    const expiryMs = Date.parse(expiryValue);
                    if (!Number.isNaN(expiryMs) && expiryMs < Date.now()) {
                        return 'expired';
                    }
                }
            }
        }

        return 'authenticated';
    }
}
