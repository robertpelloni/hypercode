import { afterEach, describe, expect, it } from 'vitest';

import { CoreModelSelector } from '../../src/providers/CoreModelSelector.ts';
import { ProviderRegistry } from '../../src/providers/ProviderRegistry.ts';
import type { ProviderDefinition } from '../../src/providers/types.ts';

const ENV_KEYS = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GOOGLE_API_KEY',
    'GEMINI_API_KEY',
    'COPILOT_PAT',
    'GOOGLE_OAUTH_ACCESS_TOKEN',
    'API_KEY',
    'PAT_TOKEN',
    'OAUTH_ACCESS_TOKEN',
] as const;

const ORIGINAL_ENV = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

function restoreEnv() {
    for (const key of ENV_KEYS) {
        const original = ORIGINAL_ENV[key];
        if (original === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = original;
        }
    }
}

afterEach(() => {
    restoreEnv();
});

describe('provider auth normalization', () => {
    it('supports api-key, oauth, pat, and none auth modes', () => {
        const catalog: ProviderDefinition[] = [
            {
                id: 'api-provider',
                name: 'API Provider',
                authMethod: 'api_key',
                envKeys: ['API_KEY'],
                executable: true,
                defaultModel: 'api-model',
                models: [{ id: 'api-model', provider: 'api-provider', name: 'API Model', inputPrice: 0.001, outputPrice: 0.002, contextWindow: 8000, tier: 'standard', capabilities: ['coding'] }],
            },
            {
                id: 'oauth-provider',
                name: 'OAuth Provider',
                authMethod: 'oauth',
                oauthEnvKeys: ['OAUTH_ACCESS_TOKEN'],
                executable: false,
                defaultModel: 'oauth-model',
                models: [{ id: 'oauth-model', provider: 'oauth-provider', name: 'OAuth Model', inputPrice: null, outputPrice: null, contextWindow: null, tier: 'managed', capabilities: ['reasoning'] }],
            },
            {
                id: 'pat-provider',
                name: 'PAT Provider',
                authMethod: 'pat',
                patEnvKeys: ['PAT_TOKEN'],
                executable: false,
                defaultModel: 'pat-model',
                models: [{ id: 'pat-model', provider: 'pat-provider', name: 'PAT Model', inputPrice: null, outputPrice: null, contextWindow: null, tier: 'managed', capabilities: ['coding'] }],
            },
            {
                id: 'local-provider',
                name: 'Local Provider',
                authMethod: 'none',
                executable: true,
                defaultModel: 'local-model',
                models: [{ id: 'local-model', provider: 'local-provider', name: 'Local Model', inputPrice: 0, outputPrice: 0, contextWindow: 4096, tier: 'local', capabilities: ['coding'] }],
            },
        ];

        process.env.API_KEY = 'api-token';
        process.env.OAUTH_ACCESS_TOKEN = 'oauth-token';
        process.env.PAT_TOKEN = 'pat-token';

        const registry = new ProviderRegistry(catalog);

        expect(registry.resolveAuthState('api-provider')).toMatchObject({ authMethod: 'api_key', authenticated: true });
        expect(registry.resolveAuthState('oauth-provider')).toMatchObject({ authMethod: 'oauth', authenticated: true });
        expect(registry.resolveAuthState('pat-provider')).toMatchObject({ authMethod: 'pat', authenticated: true });
        expect(registry.resolveAuthState('local-provider')).toMatchObject({ authMethod: 'none', authenticated: true });
    });

    it('configures and authenticates at least three providers through the normalized layer', async () => {
        process.env.OPENAI_API_KEY = 'openai';
        process.env.ANTHROPIC_API_KEY = 'anthropic';
        process.env.GOOGLE_API_KEY = 'google';

        const selector = new CoreModelSelector();
        const authenticatedProviders = (await selector.getProviderSnapshots()).filter((provider) => provider.authenticated);

        expect(authenticatedProviders.map((provider) => provider.provider)).toEqual(
            expect.arrayContaining(['openai', 'anthropic', 'google']),
        );
    });
});
