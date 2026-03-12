export interface BillingProviderQuotaSummary {
    provider: string;
    name: string;
    configured: boolean;
    authenticated?: boolean;
    authMethod?: string;
    tier?: string;
    limit?: number | null;
    used?: number;
    remaining?: number | null;
    resetDate?: string | null;
    rateLimitRpm?: number | null;
    availability?: string;
    lastError?: string | null;
}

export interface BillingTaskRoutingRuleSummary {
    taskType: 'coding' | 'planning' | 'research' | 'general' | 'worker' | 'supervisor';
    strategy: 'cheapest' | 'best' | 'round-robin';
    fallbackPreview: Array<{
        provider: string;
        model?: string;
        reason?: string;
    }>;
}

export type BillingRoutingStrategy = BillingTaskRoutingRuleSummary['strategy'];

interface ProviderPortalAction {
    label: string;
    href: string;
}

interface ProviderPortalDefinition {
    id: string;
    label: string;
    notes: string;
    actions: ProviderPortalAction[];
}

export interface ProviderPortalCard extends ProviderPortalDefinition {
    statusLabel: string;
    statusTone: 'success' | 'warning' | 'muted';
    authLabel: string;
    availabilityLabel: string;
    errorLabel: string | null;
}

export const PROVIDER_PORTALS: ProviderPortalDefinition[] = [
    {
        id: 'openai',
        label: 'OpenAI',
        notes: 'Platform billing, usage, and API key controls for ChatGPT / Codex API workloads.',
        actions: [
            { label: 'API keys', href: 'https://platform.openai.com/api-keys' },
            { label: 'Usage', href: 'https://platform.openai.com/usage' },
            { label: 'Billing', href: 'https://platform.openai.com/settings/organization/billing/overview' },
            { label: 'Docs', href: 'https://platform.openai.com/docs/overview' },
        ],
    },
    {
        id: 'anthropic',
        label: 'Anthropic',
        notes: 'Claude API console, workspace usage, and plan management links.',
        actions: [
            { label: 'API keys', href: 'https://console.anthropic.com/settings/keys' },
            { label: 'Usage', href: 'https://console.anthropic.com/settings/usage' },
            { label: 'Plans', href: 'https://console.anthropic.com/settings/plans' },
            { label: 'Docs', href: 'https://docs.anthropic.com/' },
        ],
    },
    {
        id: 'gemini',
        label: 'Google Gemini / AI Studio',
        notes: 'Gemini API keys, Google AI Studio, and Google Cloud / Vertex entry points.',
        actions: [
            { label: 'AI Studio', href: 'https://aistudio.google.com/' },
            { label: 'API keys', href: 'https://aistudio.google.com/app/apikey' },
            { label: 'Vertex AI', href: 'https://console.cloud.google.com/vertex-ai' },
            { label: 'Docs', href: 'https://ai.google.dev/' },
        ],
    },
    {
        id: 'openrouter',
        label: 'OpenRouter',
        notes: 'Centralized multi-model routing, credits, and usage controls.',
        actions: [
            { label: 'API keys', href: 'https://openrouter.ai/keys' },
            { label: 'Usage', href: 'https://openrouter.ai/activity' },
            { label: 'Credits', href: 'https://openrouter.ai/settings/credits' },
            { label: 'Docs', href: 'https://openrouter.ai/docs/quickstart' },
        ],
    },
    {
        id: 'xai',
        label: 'xAI / Grok',
        notes: 'xAI developer console, Grok model usage, and API onboarding.',
        actions: [
            { label: 'Console', href: 'https://console.x.ai/' },
            { label: 'Docs', href: 'https://docs.x.ai/' },
            { label: 'API keys', href: 'https://console.x.ai/' },
        ],
    },
    {
        id: 'deepseek',
        label: 'DeepSeek',
        notes: 'DeepSeek platform entry point for API credentials and account usage.',
        actions: [
            { label: 'Platform', href: 'https://platform.deepseek.com/' },
            { label: 'API keys', href: 'https://platform.deepseek.com/api_keys' },
            { label: 'Docs', href: 'https://api-docs.deepseek.com/' },
        ],
    },
    {
        id: 'mistral',
        label: 'Mistral',
        notes: 'Mistral console and API documentation for hosted models.',
        actions: [
            { label: 'Console', href: 'https://console.mistral.ai/' },
            { label: 'API keys', href: 'https://console.mistral.ai/' },
            { label: 'Docs', href: 'https://docs.mistral.ai/' },
        ],
    },
    {
        id: 'groq',
        label: 'Groq',
        notes: 'GroqCloud keys, usage, and low-latency model docs.',
        actions: [
            { label: 'Console', href: 'https://console.groq.com/' },
            { label: 'API keys', href: 'https://console.groq.com/keys' },
            { label: 'Docs', href: 'https://console.groq.com/docs/overview' },
        ],
    },
    {
        id: 'azure-openai',
        label: 'Azure OpenAI',
        notes: 'Azure subscription, billing, and OpenAI deployment management.',
        actions: [
            { label: 'Azure portal', href: 'https://portal.azure.com/' },
            { label: 'Cost analysis', href: 'https://portal.azure.com/#view/Microsoft_Azure_CostManagement/Menu/~/overview' },
            { label: 'Docs', href: 'https://learn.microsoft.com/azure/ai-services/openai/' },
        ],
    },
    {
        id: 'github-copilot',
        label: 'GitHub Copilot',
        notes: 'Copilot subscription and GitHub personal access / billing surfaces.',
        actions: [
            { label: 'Copilot settings', href: 'https://github.com/settings/copilot' },
            { label: 'Billing', href: 'https://github.com/settings/billing' },
            { label: 'PATs', href: 'https://github.com/settings/tokens' },
            { label: 'Docs', href: 'https://docs.github.com/copilot' },
        ],
    },
];

export const ROUTING_STRATEGY_OPTIONS: Array<{ value: BillingRoutingStrategy; label: string }> = [
    { value: 'best', label: 'Best quality' },
    { value: 'cheapest', label: 'Lowest cost' },
    { value: 'round-robin', label: 'Round robin' },
];

export function getProviderPortalCards(quotas: BillingProviderQuotaSummary[] | undefined): ProviderPortalCard[] {
    const quotaMap = new Map((quotas ?? []).map((quota) => [quota.provider, quota]));

    return PROVIDER_PORTALS.map((portal) => {
        const quota = quotaMap.get(portal.id);
        const authenticated = !!quota?.authenticated;
        const configured = !!quota?.configured;
        const authMethod = quota?.authMethod && quota.authMethod !== 'none'
            ? quota.authMethod.replace(/_/g, ' ')
            : 'manual setup';
        const availability = quota?.availability?.replace(/_/g, ' ') ?? 'reference only';

        return {
            ...portal,
            statusLabel: authenticated ? 'Connected' : configured ? 'Configured' : 'Not connected',
            statusTone: authenticated ? 'success' : configured ? 'warning' : 'muted',
            authLabel: authenticated || configured ? authMethod : 'No auth detected',
            availabilityLabel: availability,
            errorLabel: quota?.lastError ?? null,
        };
    });
}

export function getPortalBadgeClasses(tone: ProviderPortalCard['statusTone']): string {
    switch (tone) {
        case 'success':
            return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        case 'warning':
            return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
        default:
            return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
}

export function formatTaskRoutingLabel(taskType: BillingTaskRoutingRuleSummary['taskType']): string {
    switch (taskType) {
        case 'coding':
            return 'Coding';
        case 'planning':
            return 'Planning';
        case 'research':
            return 'Research';
        case 'worker':
            return 'Worker tasks';
        case 'supervisor':
            return 'Supervisor tasks';
        default:
            return 'General';
    }
}

export function formatRoutingStrategyLabel(strategy: BillingRoutingStrategy): string {
    return ROUTING_STRATEGY_OPTIONS.find((option) => option.value === strategy)?.label ?? strategy;
}

export function getRoutingStrategyBadgeClasses(strategy: BillingTaskRoutingRuleSummary['strategy']): string {
    switch (strategy) {
        case 'best':
            return 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20';
        case 'cheapest':
            return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
        default:
            return 'bg-blue-500/10 text-blue-300 border-blue-500/20';
    }
}