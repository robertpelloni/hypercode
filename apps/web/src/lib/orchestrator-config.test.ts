import { describe, expect, it } from 'vitest';

import { resolveConfiguredOrchestratorBase } from './orchestrator-config';

describe('resolveConfiguredOrchestratorBase', () => {
  it('prefers NEXT_PUBLIC_HYPERCODE_ORCHESTRATOR_URL', () => {
    expect(
      resolveConfiguredOrchestratorBase({
        NEXT_PUBLIC_HYPERCODE_ORCHESTRATOR_URL: 'http://127.0.0.1:4100/',
        NEXT_PUBLIC_AUTOPILOT_URL: 'http://127.0.0.1:3847',
      }),
    ).toBe('http://127.0.0.1:4100');
  });

  it('falls back to NEXT_PUBLIC_AUTOPILOT_URL', () => {
    expect(
      resolveConfiguredOrchestratorBase({
        NEXT_PUBLIC_AUTOPILOT_URL: 'http://127.0.0.1:3847/',
      }),
    ).toBe('http://127.0.0.1:3847');
  });

  it('returns null when no orchestrator endpoint is configured', () => {
    expect(resolveConfiguredOrchestratorBase({})).toBeNull();
  });
});

