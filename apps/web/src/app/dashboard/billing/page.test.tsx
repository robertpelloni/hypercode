import { describe, expect, it } from 'vitest';

import {
  formatRoutingStrategyLabel,
  formatTaskRoutingLabel,
  getProviderPortalCards,
  getRoutingStrategyBadgeClasses,
  PROVIDER_PORTALS,
  type BillingProviderQuotaSummary,
} from './billing-portal-data';

describe('billing dashboard provider portals', () => {
  it('builds provider portal cards with live auth state when quotas exist', () => {
    const quotas: BillingProviderQuotaSummary[] = [
      {
        provider: 'openai',
        name: 'OpenAI',
        configured: true,
        authenticated: true,
        authMethod: 'api_key',
        availability: 'healthy',
      },
      {
        provider: 'anthropic',
        name: 'Anthropic',
        configured: true,
        authenticated: false,
        authMethod: 'api_key',
        availability: 'cooldown',
        lastError: 'quota exhausted',
      },
    ];

    const cards = getProviderPortalCards(quotas);
    const openai = cards.find((card) => card.id === 'openai');
    const anthropic = cards.find((card) => card.id === 'anthropic');

    expect(openai).toMatchObject({
      statusLabel: 'Connected',
      statusTone: 'success',
      authLabel: 'api key',
      availabilityLabel: 'healthy',
    });

    expect(anthropic).toMatchObject({
      statusLabel: 'Configured',
      statusTone: 'warning',
      authLabel: 'api key',
      availabilityLabel: 'cooldown',
      errorLabel: 'quota exhausted',
    });
  });

  it('keeps reference links available even when Borg has no local auth state', () => {
    const cards = getProviderPortalCards(undefined);
    const providerIds = new Set(cards.map((card) => card.id));

    expect(cards).toHaveLength(PROVIDER_PORTALS.length);
    expect(providerIds.has('github-copilot')).toBe(true);
    expect(cards.find((card) => card.id === 'azure-openai')).toMatchObject({
      statusLabel: 'Not connected',
      statusTone: 'muted',
      authLabel: 'No auth detected',
      availabilityLabel: 'reference only',
    });
  });

  it('formats task routing labels and strategy tones for dashboard display', () => {
    expect(formatTaskRoutingLabel('supervisor')).toBe('Supervisor tasks');
    expect(formatTaskRoutingLabel('general')).toBe('General');
    expect(formatRoutingStrategyLabel('round-robin')).toBe('Round robin');
    expect(getRoutingStrategyBadgeClasses('best')).toContain('fuchsia');
    expect(getRoutingStrategyBadgeClasses('round-robin')).toContain('blue');
  });
});