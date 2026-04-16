import { describe, expect, it } from 'vitest';

import { normalizeAgentsDashboardStatus } from './agents-page-normalizers';

describe('agents page normalizers', () => {
  it('normalizes malformed status payload into safe dashboard state', () => {
    expect(
      normalizeAgentsDashboardStatus({
        agents: [' architect ', null, 7, ''],
        memoryInitialized: 'yes',
        uptime: 'bad',
      } as any),
    ).toEqual({
      agents: ['architect'],
      memoryInitialized: false,
      uptimeSeconds: 0,
    });
  });

  it('preserves valid status values', () => {
    expect(
      normalizeAgentsDashboardStatus({
        agents: ['critic', 'product'],
        memoryInitialized: true,
        uptime: 360,
      } as any),
    ).toEqual({
      agents: ['critic', 'product'],
      memoryInitialized: true,
      uptimeSeconds: 360,
    });
  });

  it('returns defaults for non-object payloads', () => {
    expect(normalizeAgentsDashboardStatus(undefined as any)).toEqual({
      agents: [],
      memoryInitialized: false,
      uptimeSeconds: 0,
    });
  });
});