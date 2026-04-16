import { describe, expect, it } from 'vitest';

import { normalizeApiKeyList } from './api-keys-page-normalizers';

describe('api keys page normalizers', () => {
  it('normalizes malformed payload rows into safe renderable API key items', () => {
    const rows = normalizeApiKeyList([
      null,
      'oops',
      {
        uuid: ' key-1 ',
        name: ' Build Agent ',
        key_prefix: ' sk-live ',
        created_at: '2026-01-01T00:00:00.000Z',
        is_active: true,
        key: 42,
      },
      {
        name: 99,
        key_prefix: 123,
        created_at: null,
        is_active: 'yes',
      },
    ] as any);

    expect(rows).toEqual([
      {
        uuid: 'key-1',
        name: 'Build Agent',
        key_prefix: 'sk-live',
        created_at: '2026-01-01T00:00:00.000Z',
        is_active: true,
        key: undefined,
      },
      {
        uuid: 'api-key-3',
        name: 'Unnamed key',
        key_prefix: 'sk-...',
        created_at: '1970-01-01T00:00:00.000Z',
        is_active: false,
        key: undefined,
      },
    ]);
  });

  it('returns an empty list when payload is not an array', () => {
    expect(normalizeApiKeyList({ bad: true } as any)).toEqual([]);
    expect(normalizeApiKeyList(undefined as any)).toEqual([]);
  });
});
