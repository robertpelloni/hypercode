export type ProviderAuthMethod = 'api_key' | 'oauth' | 'pat' | 'none';
export type ProviderRoutingStrategy = 'cheapest' | 'best' | 'round-robin';
export type ProviderTaskType = 'coding' | 'planning' | 'research' | 'general' | 'worker' | 'supervisor';
export type ProviderAvailability = 'available' | 'rate_limited' | 'quota_exhausted' | 'cooldown' | 'missing_auth';
export type ProviderCapability = 'coding' | 'reasoning' | 'vision' | 'tools' | 'long_context';

export interface ProviderModelDefinition {
    id: string;
    provider: string;
    name: string;
    inputPrice: number | null;
    outputPrice: number | null;
    contextWindow: number | null;
    tier: string;
    recommendedFor?: ProviderTaskType[];
    capabilities: ProviderCapability[];
    executable?: boolean;
    qualityScore?: number;
}

export interface ProviderDefinition {
    id: string;
    name: string;
    authMethod: ProviderAuthMethod;
    envKeys?: string[];
    oauthEnvKeys?: string[];
    patEnvKeys?: string[];
    executable?: boolean;
    defaultModel: string;
    models: ProviderModelDefinition[];
    preferredTasks?: ProviderTaskType[];
}

export interface ProviderAuthState {
    provider: string;
    name: string;
    authMethod: ProviderAuthMethod;
    configured: boolean;
    authenticated: boolean;
    detail: string;
}

export interface ProviderQuotaSnapshot extends ProviderAuthState {
    used: number;
    limit: number | null;
    remaining: number | null;
    resetDate: string | null;
    rateLimitRpm: number | null;
    tier: string;
    availability: ProviderAvailability;
    lastError?: string;
    retryAfter?: string | null;
}

export interface RoutingSelectionRequest {
    provider?: string;
    taskComplexity?: 'low' | 'medium' | 'high';
    taskType?: 'worker' | 'supervisor';
    routingTaskType?: ProviderTaskType;
    routingStrategy?: ProviderRoutingStrategy;
    exclude?: string[];
}

export interface FallbackCandidateSnapshot {
    id: string;
    provider: string;
    model: string;
    name: string;
    inputPrice: number | null;
    outputPrice: number | null;
    contextWindow: number | null;
    tier: string;
    recommended: boolean;
    reason?: string;
}
