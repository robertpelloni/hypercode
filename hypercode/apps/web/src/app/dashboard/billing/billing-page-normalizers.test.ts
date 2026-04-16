import { describe, expect, it } from 'vitest';

import {
  getBillingUsageSummary,
  getDefaultRoutingStrategy,
  getFallbackTaskType,
  formatFallbackCauseLabel,
  formatFallbackReasonLabel,
  formatProviderAvailabilityLabel,
  normalizeBillingPricingModels,
  normalizeBillingQuotaRows,
  normalizeFallbackChain,
  normalizeTaskRoutingRules,
  type BillingAuthTruth,
  type BillingQuotaConfidence,
} from './billing-page-normalizers';

describe('billing page normalizers', () => {
  it('falls back to safe numeric usage defaults when payload is malformed', () => {
    expect(getBillingUsageSummary({ usage: { currentMonth: 'bad', limit: null, breakdown: { bad: true } } })).toEqual({
      currentMonth: 0,
      limit: 0,
      breakdown: [],
    });
  });

  it('normalizes fallback chain rows and task type safely', () => {
    const fallback = {
      selectedTaskType: 'supervisor',
      chain: [
        null,
        { provider: 'openai', priority: 'oops', reason: '' },
        { provider: 'anthropic', priority: 2, model: 'claude', reason: 'quota_headroom' },
      ],
    };

    expect(getFallbackTaskType(fallback, 'general')).toBe('supervisor');
    expect(getFallbackTaskType({ selectedTaskType: 'bad' }, 'general')).toBe('general');

    expect(normalizeFallbackChain(fallback)).toEqual([
      {
        priority: 2,
        provider: 'openai',
        reason: 'ranked fallback',
      },
      {
        priority: 2,
        provider: 'anthropic',
        model: 'claude',
        reason: 'quota_headroom',
      },
    ]);
  });

  it('formats fallback reason, cause, and availability labels for operators', () => {
    expect(formatFallbackReasonLabel('TASK_TYPE_CODING')).toBe('Matched coding task routing');
    expect(formatFallbackReasonLabel('BUDGET_EXCEEDED_FORCED_LOCAL')).toBe('Budget guard forced a local provider');
    expect(formatFallbackReasonLabel('quota_headroom')).toBe('Quota Headroom');
    expect(formatFallbackReasonLabel('')).toBe('Ranked fallback');

    expect(formatFallbackCauseLabel('fallback_provider')).toBe('Fallback');
    expect(formatFallbackCauseLabel('budget_forced_local')).toBe('Budget guard');
    expect(formatFallbackCauseLabel('custom_reason')).toBe('Custom Reason');

    expect(formatProviderAvailabilityLabel('quota_exhausted')).toBe('Quota exhausted');
    expect(formatProviderAvailabilityLabel('missing_auth')).toBe('Missing auth');
    expect(formatProviderAvailabilityLabel('rate_limited')).toBe('Rate limited');
    expect(formatProviderAvailabilityLabel('unknown_state')).toBe('Unknown State');
  });

  it('normalizes routing strategy and rules from unknown payload shapes', () => {
    expect(getDefaultRoutingStrategy({ defaultStrategy: 'cheapest' })).toBe('cheapest');
    expect(getDefaultRoutingStrategy({ defaultStrategy: 'invalid' })).toBe('best');

    expect(normalizeTaskRoutingRules({
      rules: [
        {
          taskType: 'coding',
          strategy: 'round-robin',
          fallbackPreview: [{ provider: 'openai', reason: 'quality' }, { provider: 1 }],
        },
        {
          taskType: 'invalid',
          strategy: 'invalid',
          fallbackPreview: 'bad',
        },
      ],
    })).toEqual([
      {
        taskType: 'coding',
        strategy: 'round-robin',
        fallbackPreview: [
          { provider: 'openai', reason: 'quality' },
          { provider: 'provider-2' },
        ],
      },
      {
        taskType: 'general',
        strategy: 'best',
        fallbackPreview: [],
      },
    ]);
  });

  it('normalizes provider quota and pricing rows used by billing tables', () => {
    expect(normalizeBillingQuotaRows([
      null,
      {
        provider: 'openai',
        name: '',
        configured: true,
        authenticated: false,
        authMethod: null,
        tier: 123,
        limit: 'bad',
        used: 'bad',
        rateLimitRpm: null,
        availability: null,
        lastError: 42,
      },
    ])).toEqual([
      {
        provider: 'openai',
        name: 'openai',
        configured: true,
        authenticated: false,
        authMethod: 'none',
        authTruth: 'not_configured' as BillingAuthTruth,
        tier: 'standard',
        limit: 0,
        used: 0,
        rateLimitRpm: null,
        availability: 'unknown',
        lastError: null,
        quotaConfidence: 'estimated' as BillingQuotaConfidence,
        quotaRefreshedAt: null,
        resetDate: null,
        windows: [],
      },
    ]);

    expect(normalizeBillingPricingModels({
      models: [
        null,
        {
          id: 'gpt-4.1',
          contextWindow: 'bad',
          inputPrice: null,
          inputPricePer1k: 'bad',
          outputPricePer1k: 1.23,
          recommended: 'bad',
        },
      ],
    })).toEqual([
      {
        id: 'gpt-4.1',
        contextWindow: 0,
        inputPrice: null,
        inputPricePer1k: 0,
        outputPricePer1k: 1.23,
        recommended: false,
      },
    ]);
  });

  it('normalizes authTruth from payload with fallback to credential presence', () => {
    const [authenticatedRow] = normalizeBillingQuotaRows([
      { provider: 'openai', authenticated: true, configured: true, authTruth: 'authenticated' },
    ]);
    const [revokedRow] = normalizeBillingQuotaRows([
      { provider: 'anthropic', authenticated: false, configured: true, authTruth: 'revoked' },
    ]);
    const [expiredRow] = normalizeBillingQuotaRows([
      { provider: 'gemini', authenticated: false, configured: true, authTruth: 'expired' },
    ]);
    const [unknownTruthRow] = normalizeBillingQuotaRows([
      { provider: 'deepseek', authenticated: true, configured: true, authTruth: 'not_a_valid_truth' },
    ]);

    expect(authenticatedRow?.authTruth).toBe<BillingAuthTruth>('authenticated');
    expect(revokedRow?.authTruth).toBe<BillingAuthTruth>('revoked');
    expect(expiredRow?.authTruth).toBe<BillingAuthTruth>('expired');
    // Falls back to 'authenticated' because authenticated=true
    expect(unknownTruthRow?.authTruth).toBe<BillingAuthTruth>('authenticated');
  });

  it('normalizes quotaConfidence and quotaRefreshedAt from payload', () => {
    const [liveRow] = normalizeBillingQuotaRows([
      { provider: 'openai', authenticated: true, configured: true, quotaConfidence: 'real-time', quotaRefreshedAt: '2025-01-01T00:00:00.000Z' },
    ]);
    const [cachedRow] = normalizeBillingQuotaRows([
      { provider: 'anthropic', authenticated: true, configured: true, quotaConfidence: 'cached', quotaRefreshedAt: '' },
    ]);
    const [invalidConfRow] = normalizeBillingQuotaRows([
      { provider: 'gemini', authenticated: false, configured: false, quotaConfidence: 'not_valid' },
    ]);

    expect(liveRow?.quotaConfidence).toBe<BillingQuotaConfidence>('real-time');
    expect(liveRow?.quotaRefreshedAt).toBe('2025-01-01T00:00:00.000Z');
    expect(cachedRow?.quotaConfidence).toBe<BillingQuotaConfidence>('cached');
    expect(cachedRow?.quotaRefreshedAt).toBeNull();
    // Falls back to 'estimated' for unknown confidence values
    expect(invalidConfRow?.quotaConfidence).toBe<BillingQuotaConfidence>('estimated');
  });
});
