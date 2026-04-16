export type ProviderAuthMethod = 'api_key' | 'oauth' | 'pat' | 'none';
export type ProviderRoutingStrategy = 'cheapest' | 'best' | 'round-robin';
export type ProviderTaskType = 'coding' | 'planning' | 'research' | 'general' | 'worker' | 'supervisor';
export type ProviderAvailability = 'available' | 'rate_limited' | 'quota_exhausted' | 'cooldown' | 'missing_auth';
export type ProviderCapability = 'coding' | 'reasoning' | 'vision' | 'tools' | 'long_context';
export type ProviderBalanceProvider = 'github' | 'claude' | 'codex' | 'antigravity' | 'kiro' | 'kimi-coding';
export type ProviderQuotaUnit = 'percent' | 'requests' | 'tokens' | 'credits' | 'unknown';

/**
 * Nuanced credential / auth verification state for a provider.
 *
 * - `not_configured`: no credential found in environment or storage.
 * - `authenticated`: credential is present, which is the best we can confirm
 *   without a live API call (this is also set after a successful connection test).
 * - `expired`: an OAuth token is present but its `expiresAt` date has passed
 *   (can only be detected when expiry metadata is available).
 * - `revoked`: a previously-working credential was rejected by the provider
 *   during a live request (HTTP 401/403).
 */
export type ProviderAuthTruth = 'not_configured' | 'authenticated' | 'expired' | 'revoked';

/**
 * Confidence level for quota / usage data shown on the billing dashboard.
 *
 * - `real-time`: retrieved during the current request via a provider balance API call.
 * - `cached`: retrieved in a recent balance API call and not yet invalidated.
 * - `estimated`: computed locally from usage tracking only; no provider API was consulted.
 * - `unknown`: no data available (missing auth, fetch error, etc.).
 */
export type QuotaDataConfidence = 'real-time' | 'cached' | 'estimated' | 'unknown';

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
    /**
     * Nuanced credential verification state. Derived from environment / OAuth metadata
     * at auth-state refresh time; can be updated to `'revoked'` after a live 401/403.
     */
    authTruth: ProviderAuthTruth;
}

export interface ProviderQuotaWindowSnapshot {
    key: string;
    label: string;
    used: number;
    limit: number | null;
    remaining: number | null;
    resetDate: string | null;
    unit: ProviderQuotaUnit;
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
    windows?: ProviderQuotaWindowSnapshot[];
    source?: 'runtime' | 'balance';
    connectionId?: string | null;
    /**
     * Freshness of the quota/usage values on this snapshot:
     * - `real-time`: just fetched from a provider balance API.
     * - `cached`: fetched in a recent call; may be a few minutes stale.
     * - `estimated`: computed from local usage tracking only (no provider API consulted).
     * - `unknown`: no meaningful data available (missing auth, fetch error, etc.).
     */
    quotaConfidence?: QuotaDataConfidence;
    /** ISO-8601 timestamp when quota data was last fetched from the provider API, or null. */
    quotaRefreshedAt?: string | null;
}

export interface ProviderBalanceConnection {
    id: string;
    provider: ProviderBalanceProvider;
    authMethod: Extract<ProviderAuthMethod, 'oauth' | 'pat'>;
    accessToken: string;
    refreshToken?: string | null;
    expiresAt?: string | null;
    accountLabel?: string | null;
    metadata?: Record<string, unknown>;
}

export interface ProviderBalanceConnectionSource {
    getConnection(provider: ProviderBalanceProvider): Promise<ProviderBalanceConnection | null>;
}

export interface ProviderBalanceTokenRefresher {
    refreshConnection(connection: ProviderBalanceConnection): Promise<ProviderBalanceConnection>;
}

export interface ProviderQuotaProvider {
    provider: ProviderBalanceProvider;
    billingProvider: string;
    name: string;
    fetchQuotaSnapshot(connection: ProviderBalanceConnection): Promise<ProviderQuotaSnapshot>;
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
