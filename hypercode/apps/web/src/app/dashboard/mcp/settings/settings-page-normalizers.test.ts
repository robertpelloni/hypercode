import { describe, expect, it } from 'vitest';

import { normalizeConfigItems, normalizeSyncTargets } from './settings-page-normalizers';

describe('settings page normalizers', () => {
  it('normalizes malformed config rows into safe renderable values', () => {
    const rows = normalizeConfigItems([
      null,
      123,
      {
        key: ' FEATURE_FLAG ',
        value: 'enabled',
        description: 42,
      },
      {
        key: '',
        value: 99,
      },
    ] as any);

    expect(rows).toEqual([
      {
        key: 'FEATURE_FLAG',
        value: 'enabled',
        description: undefined,
      },
      {
        key: 'config-3',
        value: '',
        description: undefined,
      },
    ]);
  });

  it('normalizes malformed sync target rows and handles non-array payloads', () => {
    const targets = normalizeSyncTargets([
      null,
      {
        client: 'cursor',
        path: ' C:/cursor/config.json ',
        candidates: [' a ', 99, null],
        exists: true,
      },
      {
        client: 'unknown-client',
        path: 12,
        candidates: 'bad-shape',
        exists: 'yes',
      },
    ] as any);

    expect(targets).toEqual([
      {
        client: 'cursor',
        path: 'C:/cursor/config.json',
        candidates: ['a'],
        exists: true,
      },
      {
        client: 'vscode',
        path: '(unknown path)',
        candidates: [],
        exists: false,
      },
    ]);

    expect(normalizeSyncTargets({ bad: true } as any)).toEqual([]);
    expect(normalizeConfigItems(undefined as any)).toEqual([]);
  });
});
