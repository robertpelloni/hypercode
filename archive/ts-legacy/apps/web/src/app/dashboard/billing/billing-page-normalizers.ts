import type { BillingRoutingStrategy, BillingTaskRoutingRuleSummary } from './billing-portal-data';

type UnknownRecord = Record<string, unknown>;

const TASK_TYPES: Set<BillingTaskRoutingRuleSummary['taskType']> = new Set([
    'coding',
    'planning',
    'research',
    'general',
    'worker',
    'supervisor',
]);

const ROUTING_STRATEGIES: Set<BillingRoutingStrategy> = new Set([
    'best',
    'cheapest',
    'round-robin',
]);

function asRecord(value: unknown): UnknownRecord | null {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as UnknownRecord)
        : null;
}

function toNumber(value: unknown, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : fallback;
}

function toStringValue(value: unknown, fallback = ''): string {
    return typeof value === 'string' && value.trim().length > 0
        ? value.trim()
        : fallback;
}

function toBoolean(value: unknown, fallback = false): boolean {
    return typeof value === 'boolean'
        ? value
        : fallback;
}

function toTaskType(value: unknown, fallback: BillingTaskRoutingRuleSummary['taskType'] = 'general'): BillingTaskRoutingRuleSummary['taskType'] {
    return typeof value === 'string' && TASK_TYPES.has(value as BillingTaskRoutingRuleSummary['taskType'])
        ? (value as BillingTaskRoutingRuleSummary['taskType'])
        : fallback;
}

function toRoutingStrategy(value: unknown, fallback: BillingRoutingStrategy = 'best'): BillingRoutingStrategy {
    return typeof value === 'string' && ROUTING_STRATEGIES.has(value as BillingRoutingStrategy)
        ? (value as BillingRoutingStrategy)
        : fallback;
}

// ---------------------------------------------------------------------------
// Auth truth + quota confidence narrows
// ---------------------------------------------------------------------------

export type BillingAuthTruth = 'not_configured' | 'authenticated' | 'expired' | 'revoked';
export type BillingQuotaConfidence = 'real-time' | 'cached' | 'estimated' | 'unknown';

const AUTH_TRUTHS: Set<BillingAuthTruth> = new Set(['not_configured', 'authenticated', 'expired', 'revoked']);
const QUOTA_CONFIDENCES: Set<BillingQuotaConfidence> = new Set(['real-time', 'cached', 'estimated', 'unknown']);

function toAuthTruth(value: unknown, fallback: BillingAuthTruth = 'not_configured'): BillingAuthTruth {
    return typeof value === 'string' && AUTH_TRUTHS.has(value as BillingAuthTruth)
        ? (value as BillingAuthTruth)
        : fallback;
}

function toQuotaConfidence(value: unknown, fallback: BillingQuotaConfidence = 'estimated'): BillingQuotaConfidence {
    return typeof value === 'string' && QUOTA_CONFIDENCES.has(value as BillingQuotaConfidence)
        ? (value as BillingQuotaConfidence)
        : fallback;
}

// ---------------------------------------------------------------------------
// Usage summary
// ---------------------------------------------------------------------------

export interface BillingUsageBreakdownRow {
    provider: string;
    requests: number;
    cost: number;
}

export interface BillingUsageSummary {
    currentMonth: number;
    limit: number;
    breakdown: BillingUsageBreakdownRow[];
}

export function getBillingUsageSummary(status: unknown): BillingUsageSummary {
    const statusRecord = asRecord(status);
    const usage = asRecord(statusRecord?.usage);
    const breakdown = Array.isArray(usage?.breakdown)
        ? usage.breakdown
            .map((entry, index) => {
                const row = asRecord(entry);
                if (!row) {
                    return null;
                }

                return {
                    provider: toStringValue(row.provider, `provider-${index + 1}`),
                    requests: toNumber(row.requests, 0),
                    cost: toNumber(row.cost, 0),
                } satisfies BillingUsageBreakdownRow;
            })
            .filter((entry): entry is BillingUsageBreakdownRow => Boolean(entry))
        : [];

    return {
        currentMonth: toNumber(usage?.currentMonth, 0),
        limit: toNumber(usage?.limit, 0),
        breakdown,
    };
}

// ---------------------------------------------------------------------------
// Fallback chain
// ---------------------------------------------------------------------------

export interface BillingFallbackLink {
    priority: number;
    provider: string;
    model?: string;
    reason: string;
}

export function getFallbackTaskType(
    fallback: unknown,
    defaultTaskType: BillingTaskRoutingRuleSummary['taskType'],
): BillingTaskRoutingRuleSummary['taskType'] {
    return toTaskType(asRecord(fallback)?.selectedTaskType, defaultTaskType);
}

export function normalizeFallbackChain(fallback: unknown): BillingFallbackLink[] {
    const fallbackRecord = asRecord(fallback);
    const chain = Array.isArray(fallbackRecord?.chain) ? fallbackRecord.chain : [];

    return chain.reduce<BillingFallbackLink[]>((acc, entry, index) => {
        const row = asRecord(entry);
        if (!row) {
            return acc;
        }

        acc.push({
            priority: Math.max(1, Math.floor(toNumber(row.priority, index + 1))),
            provider: toStringValue(row.provider, `provider-${index + 1}`),
            model: toStringValue(row.model) || undefined,
            reason: toStringValue(row.reason, 'ranked fallback'),
        });

        return acc;
    }, []);
}

function humanizeCode(value: string, fallback: string): string {
    const normalized = value.trim();
    if (!normalized) {
        return fallback;
    }

    return normalized
        .replace(/[_-]+/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatFallbackReasonLabel(reason: string | null | undefined): string {
    const normalized = toStringValue(reason);
    switch (normalized.toUpperCase()) {
        case 'PROVIDER_PREFERENCE':
            return 'Preferred provider available';
        case 'BEST':
            return 'Highest-quality ranked candidate';
        case 'CHEAPEST':
            return 'Lowest-cost ranked candidate';
        case 'ROUND_ROBIN':
            return 'Round-robin rotation';
        case 'EMERGENCY_FALLBACK':
            return 'Emergency fallback after all providers were unavailable';
        case 'BUDGET_EXCEEDED_FORCED_LOCAL':
            return 'Budget guard forced a local provider';
        case 'TASK_TYPE_CODING':
            return 'Matched coding task routing';
        case 'TASK_TYPE_PLANNING':
            return 'Matched planning task routing';
        case 'TASK_TYPE_RESEARCH':
            return 'Matched research task routing';
        case 'TASK_TYPE_GENERAL':
            return 'Matched general-purpose routing';
        case 'TASK_TYPE_WORKER':
            return 'Matched worker-task routing';
        case 'TASK_TYPE_SUPERVISOR':
            return 'Matched supervisor-task routing';
        default:
            return humanizeCode(normalized, 'Ranked fallback');
    }
}

export function formatFallbackCauseLabel(
    causeCode: 'fallback_provider' | 'budget_forced_local' | 'emergency_fallback' | 'preference_honored' | string,
): string {
    switch (causeCode) {
        case 'fallback_provider':
            return 'Fallback';
        case 'budget_forced_local':
            return 'Budget guard';
        case 'emergency_fallback':
            return 'Emergency';
        case 'preference_honored':
            return 'Preferred';
        default:
            return humanizeCode(causeCode, 'Fallback');
    }
}

export function formatProviderAvailabilityLabel(availability: string | null | undefined): string {
    const normalized = toStringValue(availability, 'unknown').toLowerCase();
    switch (normalized) {
        case 'available':
            return 'Available';
        case 'healthy':
            return 'Healthy';
        case 'rate_limited':
            return 'Rate limited';
        case 'quota_exhausted':
            return 'Quota exhausted';
        case 'cooldown':
            return 'Cooling down';
        case 'missing_auth':
        case 'missing_config':
            return 'Missing auth';
        case 'degraded':
            return 'Degraded';
        case 'unknown':
            return 'Unknown';
        default:
            return humanizeCode(normalized, 'Unknown');
    }
}

// ---------------------------------------------------------------------------
// Task routing
// ---------------------------------------------------------------------------

export function getDefaultRoutingStrategy(taskRouting: unknown): BillingRoutingStrategy {
    return toRoutingStrategy(asRecord(taskRouting)?.defaultStrategy, 'best');
}

export function normalizeTaskRoutingRules(taskRouting: unknown): BillingTaskRoutingRuleSummary[] {
    const routingRecord = asRecord(taskRouting);
    const rules = Array.isArray(routingRecord?.rules) ? routingRecord.rules : [];

    return rules.reduce<BillingTaskRoutingRuleSummary[]>((acc, entry) => {
        const row = asRecord(entry);
        if (!row) {
            return acc;
        }

        const fallbackPreview = Array.isArray(row.fallbackPreview)
            ? row.fallbackPreview.reduce<Array<{ provider: string; model?: string; reason?: string }>>(
                (previewAcc, candidate, index) => {
                    const candidateRecord = asRecord(candidate);
                    if (!candidateRecord) {
                        return previewAcc;
                    }

                    previewAcc.push({
                        provider: toStringValue(candidateRecord.provider, `provider-${index + 1}`),
                        model: toStringValue(candidateRecord.model) || undefined,
                        reason: toStringValue(candidateRecord.reason) || undefined,
                    });

                    return previewAcc;
                }, [],
            )
            : [];

        acc.push({
            taskType: toTaskType(row.taskType, 'general'),
            strategy: toRoutingStrategy(row.strategy, 'best'),
            fallbackPreview,
        });

        return acc;
    }, []);
}

// ---------------------------------------------------------------------------
// Quota table rows
// ---------------------------------------------------------------------------

export interface BillingQuotaTableRow {
    provider: string;
    name: string;
    configured: boolean;
    authenticated: boolean;
    authMethod: string;
    /** Nuanced credential state. */
    authTruth: BillingAuthTruth;
    tier: string;
    limit: number | null;
    used: number;
    rateLimitRpm: number | null;
    availability: string;
    lastError: string | null;
    /** Freshness level of the quota values. */
    quotaConfidence: BillingQuotaConfidence;
    /** ISO-8601 timestamp of last real-time provider fetch, or null. */
    quotaRefreshedAt: string | null;
    resetDate: string | null;
    windows: Array<{
        key: string;
        label: string;
        used: number;
        limit: number | null;
        remaining: number | null;
        resetDate: string | null;
        unit: string;
    }>;
}

export function normalizeBillingQuotaRows(quotas: unknown): BillingQuotaTableRow[] {
    if (!Array.isArray(quotas)) {
        return [];
    }

    return quotas
        .map((entry, index) => {
            const row = asRecord(entry);
            if (!row) {
                return null;
            }

            const providerKey = toStringValue(row.provider, `provider-${index + 1}`);
            const isAuthenticated = toBoolean(row.authenticated, false);
            const authTruthFallback: BillingAuthTruth = isAuthenticated ? 'authenticated' : 'not_configured';

            const windows = Array.isArray(row.windows)
                ? row.windows.map((w) => {
                    const win = asRecord(w);
                    return {
                        key: toStringValue(win?.key, 'window'),
                        label: toStringValue(win?.label, 'Quota Window'),
                        used: toNumber(win?.used, 0),
                        limit: win?.limit === null ? null : toNumber(win?.limit, 0),
                        remaining: win?.remaining === null ? null : toNumber(win?.remaining, 0),
                        resetDate: toStringValue(win?.resetDate) || null,
                        unit: toStringValue(win?.unit, 'requests'),
                    };
                })
                : [];

            return {
                provider: providerKey,
                name: toStringValue(row.name, providerKey),
                configured: toBoolean(row.configured, false),
                authenticated: isAuthenticated,
                authMethod: toStringValue(row.authMethod, 'none'),
                authTruth: toAuthTruth(row.authTruth, authTruthFallback),
                tier: toStringValue(row.tier, 'standard'),
                limit: row.limit === null ? null : toNumber(row.limit, 0),
                used: toNumber(row.used, 0),
                rateLimitRpm: row.rateLimitRpm === null ? null : toNumber(row.rateLimitRpm, 0),
                availability: toStringValue(row.availability, 'unknown'),
                lastError: toStringValue(row.lastError) || null,
                quotaConfidence: toQuotaConfidence(row.quotaConfidence),
                quotaRefreshedAt: toStringValue(row.quotaRefreshedAt) || null,
                resetDate: toStringValue(row.resetDate) || null,
                windows,
            } satisfies BillingQuotaTableRow;
        })
        .filter((entry): entry is BillingQuotaTableRow => Boolean(entry));
}

// ---------------------------------------------------------------------------
// Pricing models
// ---------------------------------------------------------------------------

export interface BillingPricingModelRow {
    id: string;
    contextWindow: number | null;
    inputPrice: number | null;
    inputPricePer1k: number;
    outputPricePer1k: number;
    recommended: boolean;
}

export function normalizeBillingPricingModels(pricing: unknown): BillingPricingModelRow[] {
    const pricingRecord = asRecord(pricing);
    const models = Array.isArray(pricingRecord?.models) ? pricingRecord.models : [];

    return models
        .map((entry, index) => {
            const row = asRecord(entry);
            if (!row) {
                return null;
            }

            return {
                id: toStringValue(row.id, `model-${index + 1}`),
                contextWindow: row.contextWindow === null ? null : toNumber(row.contextWindow, 0),
                inputPrice: row.inputPrice === null ? null : toNumber(row.inputPrice, 0),
                inputPricePer1k: toNumber(row.inputPricePer1k, 0),
                outputPricePer1k: toNumber(row.outputPricePer1k, 0),
                recommended: toBoolean(row.recommended, false),
            } satisfies BillingPricingModelRow;
        })
        .filter((entry): entry is BillingPricingModelRow => Boolean(entry));
}
