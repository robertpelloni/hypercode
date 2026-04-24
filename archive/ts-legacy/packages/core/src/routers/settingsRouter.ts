import { z } from 'zod';
import { t, publicProcedure, getMcpServer, getConfigManager } from '../lib/trpc-core.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return typeof error === 'string' ? error : 'Unknown error';
}

const providerEnvBindings = [
    { id: 'openai', envVar: 'OPENAI_API_KEY' },
    { id: 'anthropic', envVar: 'ANTHROPIC_API_KEY' },
    { id: 'gemini', envVar: 'GEMINI_API_KEY' },
    { id: 'google', envVar: 'GEMINI_API_KEY' },
    { id: 'xai', envVar: 'XAI_API_KEY' },
    { id: 'deepseek', envVar: 'DEEPSEEK_API_KEY' },
    { id: 'mistral', envVar: 'MISTRAL_API_KEY' },
    { id: 'openrouter', envVar: 'OPENROUTER_API_KEY' },
    { id: 'copilot', envVar: 'COPILOT_API_KEY' },
    { id: 'cohere', envVar: 'COHERE_API_KEY' },
    { id: 'groq', envVar: 'GROQ_API_KEY' },
    { id: 'together', envVar: 'TOGETHER_API_KEY' },
    { id: 'fireworks', envVar: 'FIREWORKS_API_KEY' },
    { id: 'google-oauth', envVar: 'GOOGLE_OAUTH_ACCESS_TOKEN' },
] as const;

function resolveProviderEnvVar(providerId: string): string {
    const target = providerEnvBindings.find((provider) => provider.id === providerId);
    if (!target) {
        throw new Error(`Unknown provider ID: ${providerId}`);
    }
    return target.envVar;
}

function upsertEnvValue(content: string, envKey: string, envValue: string): string {
    const regex = new RegExp(`^${envKey}=.*\\n?`, 'm');
    if (regex.test(content)) {
        return content.replace(regex, `${envKey}="${envValue}"\n`);
    }

    const leadingNewline = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
    return `${content}${leadingNewline}${envKey}="${envValue}"\n`;
}

function removeEnvValue(content: string, envKey: string): { content: string; removed: boolean } {
    const lines = content.split(/\r?\n/);
    let removed = false;
    const kept = lines.filter((line) => {
        if (line.startsWith(`${envKey}=`)) {
            removed = true;
            return false;
        }
        return true;
    });

    let nextContent = kept.join('\n');
    if (nextContent.length > 0 && !nextContent.endsWith('\n')) {
        nextContent += '\n';
    }

    return { content: nextContent, removed };
}

export const settingsRouter = t.router({
    /** Get the full configuration object */
    get: publicProcedure.query(() => {
        return getConfigManager()?.loadConfig() || {};
    }),

    /** Update configuration with a partial config object */
    update: publicProcedure.input(z.object({
        config: z.record(z.unknown())
    })).mutation(({ input }) => {
        const configManager = getConfigManager();
        if (configManager) {
            configManager.saveConfig(input.config);
            return { success: true };
        }
        throw new Error("ConfigManager not ready");
    }),

    /** Get detected LLM providers and their API key status (masked) */
    getProviders: publicProcedure.query(() => {
        const providers = [
            { id: 'openai', name: 'OpenAI', envVar: 'OPENAI_API_KEY' },
            { id: 'anthropic', name: 'Anthropic', envVar: 'ANTHROPIC_API_KEY' },
            { id: 'gemini', name: 'Google Gemini', envVar: 'GEMINI_API_KEY' },
            { id: 'xai', name: 'xAI (Grok)', envVar: 'XAI_API_KEY' },
            { id: 'deepseek', name: 'DeepSeek', envVar: 'DEEPSEEK_API_KEY' },
            { id: 'mistral', name: 'Mistral', envVar: 'MISTRAL_API_KEY' },
            { id: 'openrouter', name: 'OpenRouter', envVar: 'OPENROUTER_API_KEY' },
            { id: 'copilot', name: 'GitHub Copilot', envVar: 'COPILOT_API_KEY' },
            { id: 'cohere', name: 'Cohere', envVar: 'COHERE_API_KEY' },
            { id: 'groq', name: 'Groq', envVar: 'GROQ_API_KEY' },
            { id: 'together', name: 'Together AI', envVar: 'TOGETHER_API_KEY' },
            { id: 'fireworks', name: 'Fireworks AI', envVar: 'FIREWORKS_API_KEY' },
        ];

        return providers.map(p => ({
            ...p,
            configured: !!process.env[p.envVar],
            keyPreview: process.env[p.envVar]
                ? `${process.env[p.envVar]!.slice(0, 4)}...${process.env[p.envVar]!.slice(-4)}`
                : null,
        }));
    }),

    /** Test a provider connection — attempts a minimal API call */
    testConnection: publicProcedure.input(z.object({
        provider: z.string(),
    })).mutation(async ({ input }) => {
        const mcp = getMcpServer();
        try {
            const llm = mcp.llmService;
            // Attempt a minimal completion to verify connectivity
            const result = await llm.generate(
                `You are a test. Reply with "ok".`,
                { model: input.provider, maxTokens: 5 }
            );
            return {
                success: true,
                provider: input.provider,
                response: result?.text?.slice(0, 50) ?? 'ok',
                latencyMs: result?.latencyMs ?? 0,
            };
        } catch (err: unknown) {
            return {
                success: false,
                provider: input.provider,
                error: getErrorMessage(err),
            };
        }
    }),

    /** Get environment info for debugging */
    getEnvironment: publicProcedure.query(() => {
        return {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            cwd: process.cwd(),
            env: {
                NODE_ENV: process.env.NODE_ENV ?? 'development',
                PORT: process.env.PORT ?? '3000',
            },
        };
    }),

    /** Get list of configured MCP servers */
    getMcpServers: publicProcedure.query(() => {
        const configManager = getConfigManager();
        if (configManager) {
            const config = configManager.loadConfig();
            return config?.mcpServers ?? [];
        }
        return [];
    }),

    /** Set an API key or environment variable */
    updateProviderKey: publicProcedure.input(z.object({
        provider: z.string(),
        key: z.string(),
    })).mutation(async ({ input }) => {
        const envKey = resolveProviderEnvVar(input.provider);
        const envValue = input.key.trim(); // Trim spaces

        // Update in memory immediately
        process.env[envKey] = envValue;

        // Persist to .env file at workspace root
        const rootDir = process.cwd();
        const envPath = path.join(rootDir, '.env');

        try {
            let envContent = '';
            if (fs.existsSync(envPath)) {
                envContent = fs.readFileSync(envPath, 'utf8');
            }
            envContent = upsertEnvValue(envContent, envKey, envValue);

            fs.writeFileSync(envPath, envContent, 'utf8');
            console.log(`[settingsRouter] Persisted ${envKey} to .env`);

            // Check if we also need to update packages/core/.env for development
            const coreEnvPath = path.join(rootDir, 'packages', 'core', '.env');
            if (fs.existsSync(coreEnvPath)) {
                let coreEnvContent = fs.readFileSync(coreEnvPath, 'utf8');
                coreEnvContent = upsertEnvValue(coreEnvContent, envKey, envValue);
                fs.writeFileSync(coreEnvPath, coreEnvContent, 'utf8');
                console.log(`[settingsRouter] Persisted ${envKey} to packages/core/.env`);
            }

            return { success: true, updatedKey: envKey };
        } catch (e: unknown) {
            console.error('[settingsRouter] Failed to persist environment variable', e);
            throw new Error(`Failed to persist key: ${getErrorMessage(e)}`);
        }
    }),

    removeProviderKey: publicProcedure.input(z.object({
        provider: z.string(),
    })).mutation(async ({ input }) => {
        const envKey = resolveProviderEnvVar(input.provider);
        delete process.env[envKey];

        const rootDir = process.cwd();
        const envPath = path.join(rootDir, '.env');
        let removedAny = false;

        try {
            if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, 'utf8');
                const updated = removeEnvValue(envContent, envKey);
                removedAny = removedAny || updated.removed;
                fs.writeFileSync(envPath, updated.content, 'utf8');
                console.log(`[settingsRouter] Removed ${envKey} from .env`);
            }

            const coreEnvPath = path.join(rootDir, 'packages', 'core', '.env');
            if (fs.existsSync(coreEnvPath)) {
                const coreEnvContent = fs.readFileSync(coreEnvPath, 'utf8');
                const updated = removeEnvValue(coreEnvContent, envKey);
                removedAny = removedAny || updated.removed;
                fs.writeFileSync(coreEnvPath, updated.content, 'utf8');
                console.log(`[settingsRouter] Removed ${envKey} from packages/core/.env`);
            }

            return { success: true, removedKey: envKey, removedAny };
        } catch (e: unknown) {
            console.error('[settingsRouter] Failed to remove environment variable', e);
            throw new Error(`Failed to remove key: ${getErrorMessage(e)}`);
        }
    }),
});
