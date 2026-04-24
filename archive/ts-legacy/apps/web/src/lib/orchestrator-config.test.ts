import { describe, expect, it } from 'vitest';

import { resolveConfiguredOrchestratorBase } from './orchestrator-config';

describe('resolveConfiguredOrchestratorBase', () => {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/lib/orchestrator-config.test.ts
  it('prefers NEXT_PUBLIC_HYPERCODE_ORCHESTRATOR_URL', () => {
    expect(
      resolveConfiguredOrchestratorBase({
        NEXT_PUBLIC_HYPERCODE_ORCHESTRATOR_URL: 'http://127.0.0.1:4100/',
=======
  it('prefers NEXT_PUBLIC_BORG_ORCHESTRATOR_URL', () => {
    expect(
      resolveConfiguredOrchestratorBase({
        NEXT_PUBLIC_BORG_ORCHESTRATOR_URL: 'http://127.0.0.1:4100/',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/lib/orchestrator-config.test.ts
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

