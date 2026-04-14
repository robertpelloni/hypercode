import { QuotaService, type QuotaConfig } from '@hypercode/ai';

import { ProviderBalanceService } from './ProviderBalanceService.js';
import { ProviderRegistry } from './ProviderRegistry.js';
import { type ProviderAvailability, type ProviderQuotaSnapshot } from './types.js';

interface UsageRecord {
    provider: string;
    modelId: string;
    costUsd: number;
    inputTokens: number;
    outputTokens: number;
    timestamp: number;
}

const DEFAULT_RETRY_MS = 60_000;

export class NormalizedQuotaService extends QuotaService {
    private readonly registry: ProviderRegistry;
    private readonly balanceService: ProviderBalanceService;
    private readonly providerUsage: UsageRecord[] = [];
    private configState: QuotaConfig = {
        dailyBudgetUsd: 5,
        monthlyBudgetUsd: 100,
        providerLimits: {},
    };
    /**
     * Fraction of provider quota at which routing is pre-emptively paused to avoid
     * mid-call failures. When `trackUsage` detects that a provider's usage-to-limit
     * ratio crosses this threshold the provider is marked `cooldown` so `rankCandidates`
     * will skip it and promote the next fallback candidate before the quota is fully
     * exhausted (default 0.95 = 95%).
     */
    private preEmptiveThreshold: number = 0.95;
    private readonly snapshots = new Map<string, ProviderQuotaSnapshot>();

    constructor(registry: ProviderRegistry, balanceService: ProviderBalanceService = new ProviderBalanceService()) {
        super();
        this.registry = registry;
        this.balanceService = balanceService;
        this.refreshAuthStates();
    }

    public override setConfig(config: QuotaConfig & { preEmptiveSwitchThreshold?: number }) {
        this.configState = {
            ...this.configState,
            ...config,
            providerLimits: {
                ...(this.configState.providerLimits ?? {}),
                ...(config.providerLimits ?? {}),
            },
        };
        if (typeof config.preEmptiveSwitchThreshold === 'number') {
            // Clamp to a sane range (50%–100%) to avoid pathological configs.
            this.preEmptiveThreshold = Math.max(0.5, Math.min(1.0, config.preEmptiveSwitchThreshold));
        }
        this.refreshAuthStates();
    }

    public refreshAuthStates(env: NodeJS.ProcessEnv = process.env) {
        for (const authState of this.registry.getAuthStates(env)) {
            const existing = this.snapshots.get(authState.provider);
            // Preserve 'revoked' authTruth if it was set by a live API failure.
            const authTruth = existing?.authTruth === 'revoked' ? 'revoked' : authState.authTruth;
            const limit = this.configState.providerLimits?.[authState.provider] ?? existing?.limit ?? null;
            const used = existing?.used ?? 0;
            this.snapshots.set(authState.provider, {
                ...authState,
                authTruth,
                used,
                limit,
                remaining: typeof limit === 'number' ? Math.max(limit - used, 0) : null,
                resetDate: existing?.resetDate ?? null,
                rateLimitRpm: existing?.rateLimitRpm ?? null,
                tier: existing?.tier ?? this.registry.getProvider(authState.provider)?.models[0]?.tier ?? 'standard',
                availability: authState.authenticated ? (existing?.availability ?? 'available') : 'missing_auth',
                lastError: existing?.lastError,
                retryAfter: existing?.retryAfter ?? null,
                quotaConfidence: existing?.quotaConfidence ?? 'estimated',
                quotaRefreshedAt: existing?.quotaRefreshedAt ?? null,
            });
        }
    }

    public override trackUsage(modelId: string, inputTokens: number, outputTokens: number) {
        const model = this.registry.getModel(modelId);
        const provider = model?.provider ?? 'unknown';
        const inputPrice = model?.inputPrice ?? 0;
        const outputPrice = model?.outputPrice ?? 0;
        const costUsd = (inputTokens / 1000 * inputPrice) + (outputTokens / 1000 * outputPrice);

        this.providerUsage.push({
            provider,
            modelId,
            costUsd,
            inputTokens,
            outputTokens,
            timestamp: Date.now(),
        });

        const snapshot = this.snapshots.get(provider);
        if (!snapshot) return;

        const nextUsed = snapshot.used + costUsd;
        const limit = snapshot.limit;
        const usageRatio = typeof limit === 'number' && limit > 0 ? nextUsed / limit : 0;

        // Determine next availability state, preserving existing non-available states.
        let nextAvailability = snapshot.availability;
        let nextRetryAfter: string | null = snapshot.retryAfter ?? null;
        let nextResetDate: string | null = snapshot.resetDate ?? null;
        let nextLastError: string | undefined = snapshot.lastError;

        if (typeof limit === 'number') {
            if (nextUsed >= limit && snapshot.availability !== 'quota_exhausted') {
                // Hard exhaustion: pause until reset.
                const retryDate = snapshot.resetDate
                    ? new Date(snapshot.resetDate)
                    : new Date(Date.now() + DEFAULT_RETRY_MS);
                nextAvailability = 'quota_exhausted';
                nextRetryAfter = retryDate.toISOString();
                nextResetDate = retryDate.toISOString();
                nextLastError = 'Provider quota exhausted — routing paused until reset.';
            } else if (
                usageRatio >= this.preEmptiveThreshold &&
                usageRatio < 1 &&
                snapshot.availability === 'available'
            ) {
                // Pre-emptive pause: usage is within threshold band (e.g. 95–99%).
                // Use the known reset date when available so we recover at the right time;
                // otherwise fall back to a short re-check window.
                const retryDate = snapshot.resetDate
                    ? new Date(snapshot.resetDate)
                    : new Date(Date.now() + 5 * 60_000);
                nextAvailability = 'cooldown';
                nextRetryAfter = retryDate.toISOString();
                nextLastError = `Provider at ${Math.round(usageRatio * 100)}% quota — routing paused pre-emptively to avoid mid-call failure.`;
            }
        }

        this.snapshots.set(provider, {
            ...snapshot,
            used: nextUsed,
            remaining: typeof limit === 'number' ? Math.max(limit - nextUsed, 0) : null,
            availability: nextAvailability,
            retryAfter: nextRetryAfter,
            resetDate: nextResetDate,
            lastError: nextLastError,
        });
    }

    public override getSessionTotal(): number {
        return this.providerUsage.reduce((total, entry) => total + entry.costUsd, 0);
    }

    public override getDailyTotal(): number {
        const today = new Date().setHours(0, 0, 0, 0);
        return this.providerUsage
            .filter((entry) => entry.timestamp >= today)
            .reduce((total, entry) => total + entry.costUsd, 0);
    }

    public override getUsageByModel() {
        const byProvider = new Map<string, { cost: number; requests: number }>();
        for (const entry of this.providerUsage) {
            const current = byProvider.get(entry.provider) ?? { cost: 0, requests: 0 };
            current.cost += entry.costUsd;
            current.requests += 1;
            byProvider.set(entry.provider, current);
        }

        return Array.from(byProvider.entries()).map(([provider, stats]) => ({
            provider,
            cost: stats.cost,
            requests: stats.requests,
        }));
    }

    public override isBudgetExceeded(): boolean {
        return this.getDailyTotal() >= this.configState.dailyBudgetUsd;
    }

    public override getReport() {
        return {
            session: this.getSessionTotal(),
            daily: this.getDailyTotal(),
            config: this.configState,
            isExceeded: this.isBudgetExceeded(),
        };
    }

    public async refreshProviderBalances() {
        const fetchedAt = new Date().toISOString();
        const liveSnapshots = await this.balanceService.fetchSnapshots();
        for (const snapshot of liveSnapshots) {
            const existing = this.snapshots.get(snapshot.provider);
            // Snapshots from the balance service are real-time; unconnected stubs
            // (missing auth) retain 'unknown' confidence since there's no data.
            const isConnected = snapshot.configured && snapshot.authenticated;
            this.snapshots.set(snapshot.provider, {
                ...existing,
                ...snapshot,
                windows: snapshot.windows ?? existing?.windows,
                source: snapshot.source ?? existing?.source ?? 'balance',
                connectionId: snapshot.connectionId ?? existing?.connectionId ?? null,
                quotaConfidence: isConnected
                    ? (snapshot.quotaConfidence ?? 'real-time')
                    : 'unknown',
                quotaRefreshedAt: isConnected ? fetchedAt : null,
            });
        }
    }

    public getQuota(provider: string): ProviderQuotaSnapshot | undefined {
        this.refreshProviderAvailability(provider);
        return this.snapshots.get(provider);
    }

    public getAllQuotas(): ProviderQuotaSnapshot[] {
        for (const provider of this.snapshots.keys()) {
            this.refreshProviderAvailability(provider);
        }
        return Array.from(this.snapshots.values());
    }

    public markRateLimited(provider: string, retryAfter: number | Date = Date.now() + DEFAULT_RETRY_MS, rateLimitRpm?: number, message = 'Provider returned a rate-limit response.') {
        this.updateAvailability(provider, 'rate_limited', retryAfter, message, rateLimitRpm);
    }

    public markQuotaExceeded(provider: string, resetDate: number | Date = Date.now() + DEFAULT_RETRY_MS, message = 'Provider quota exhausted.') {
        this.updateAvailability(provider, 'quota_exhausted', resetDate, message);
    }

    /**
     * Returns providers that are within the pre-emptive threshold band but not yet
     * fully exhausted.  Useful for dashboard warnings that inform operators their
     * quota is running low on a given provider.
     */
    public getNearQuotaWarnings(): Array<{ provider: string; usedPercent: number }> {
        const warnings: Array<{ provider: string; usedPercent: number }> = [];
        for (const snapshot of this.snapshots.values()) {
            if (typeof snapshot.limit !== 'number' || snapshot.limit <= 0) continue;
            const usedPercent = snapshot.used / snapshot.limit;
            if (usedPercent >= this.preEmptiveThreshold && usedPercent < 1) {
                warnings.push({
                    provider: snapshot.provider,
                    usedPercent: Math.round(usedPercent * 100),
                });
            }
        }
        return warnings;
    }

    public markProviderHealthy(provider: string) {
        const snapshot = this.snapshots.get(provider);
        if (!snapshot) {
            return;
        }

        const wasRevoked = snapshot.authTruth === 'revoked';
        this.snapshots.set(provider, {
            ...snapshot,
            // When recovering from a live revocation, restore the authentication
            // and availability flags. For other health-clears (rate limits, cooldowns)
            // preserve the existing `authenticated` flag and derive availability from it.
            authenticated: wasRevoked ? true : snapshot.authenticated,
            availability: (wasRevoked || snapshot.authenticated) ? 'available' : 'missing_auth',
            authTruth: wasRevoked ? 'authenticated' : snapshot.authTruth,
            retryAfter: null,
            lastError: undefined,
        });
    }

    /**
     * Marks a provider's credential as revoked due to a live HTTP 401/403 response.
     * The provider is removed from the routing pool (`missing_auth`) until
     * `markProviderHealthy` is called (e.g., after a successful key rotation test).
     */
    public markAuthRevoked(provider: string, message = 'Provider credential rejected (401/403). Key may be revoked or expired.') {
        const snapshot = this.snapshots.get(provider);
        if (!snapshot) {
            return;
        }

        this.snapshots.set(provider, {
            ...snapshot,
            authTruth: 'revoked',
            authenticated: false,
            configured: snapshot.configured,
            availability: 'missing_auth',
            lastError: message,
            retryAfter: null,
        });
    }

    public isProviderReady(provider: string): boolean {
        this.refreshProviderAvailability(provider);
        const snapshot = this.snapshots.get(provider);
        return snapshot?.authenticated === true && snapshot.availability === 'available';
    }

    private updateAvailability(
        provider: string,
        availability: Extract<ProviderAvailability, 'rate_limited' | 'quota_exhausted' | 'cooldown'>,
        retryAfter: number | Date,
        message: string,
        rateLimitRpm?: number,
    ) {
        const snapshot = this.snapshots.get(provider);
        if (!snapshot) {
            return;
        }

        const retryDate = typeof retryAfter === 'number' ? new Date(retryAfter) : retryAfter;
        this.snapshots.set(provider, {
            ...snapshot,
            availability,
            retryAfter: retryDate.toISOString(),
            resetDate: availability === 'quota_exhausted' ? retryDate.toISOString() : snapshot.resetDate,
            rateLimitRpm: rateLimitRpm ?? snapshot.rateLimitRpm,
            lastError: message,
        });
    }

    private refreshProviderAvailability(provider: string) {
        const snapshot = this.snapshots.get(provider);
        if (!snapshot?.retryAfter) {
            return;
        }

        if (Date.now() >= new Date(snapshot.retryAfter).getTime()) {
            this.markProviderHealthy(provider);
        }
    }
}
