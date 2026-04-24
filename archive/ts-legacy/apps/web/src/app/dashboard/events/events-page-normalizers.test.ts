import { describe, expect, it } from 'vitest';

import { normalizeDashboardEvents, normalizeDashboardSystemStatus } from './events-page-normalizers';

describe('events page normalizers', () => {
  it('normalizes malformed events payload into safe rows', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    const rows = normalizeDashboardEvents([
      null,
      {
        type: ' file:change ',
        timestamp: '1700000000000',
        source: ' watcher ',
        data: { path: 'README.md' },
      },
      {
        type: '',
        timestamp: 'not-a-time',
        source: 55,
        data: circular,
      },
    ] as any);

    expect(rows).toEqual([
      {
        type: 'file:change',
        timestamp: 1700000000000,
        source: 'watcher',
        dataPreview: '{"path":"README.md"}',
      },
      {
        type: 'unknown:2',
        timestamp: null,
        source: '',
        dataPreview: '[unserializable data]',
      },
    ]);
  });

  it('normalizes malformed system status payload to safe defaults', () => {
    expect(normalizeDashboardSystemStatus(undefined as any)).toEqual({
      status: 'offline',
      uptime: 0,
      agents: [],
    });

    expect(
      normalizeDashboardSystemStatus({
        status: 'online',
        uptime: 'bad',
        agents: [' Alpha ', null, 7, ''],
      } as any),
    ).toEqual({
      status: 'online',
      uptime: 0,
      agents: ['Alpha'],
    });
  });

  it('returns empty event list for non-array payloads', () => {
    expect(normalizeDashboardEvents({ bad: true } as any)).toEqual([]);
  });
});