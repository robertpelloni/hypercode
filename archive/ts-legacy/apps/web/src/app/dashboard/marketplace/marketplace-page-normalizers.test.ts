import { describe, expect, it } from 'vitest';

import { normalizeMarketplaceEntries } from './marketplace-page-normalizers';

describe('marketplace page normalizers', () => {
  it('normalizes malformed marketplace rows into safe renderable values', () => {
    const rows = normalizeMarketplaceEntries([
      null,
      123,
      {
        id: ' entry-1 ',
        name: ' Agent One ',
        type: 'agent',
        source: ' community ',
        installed: true,
        description: 99,
        tags: [' alpha ', null, 4],
        verified: true,
      },
      {
        id: '',
        name: '',
        type: 'unknown',
        source: '',
        installed: 'yes',
        tags: 'bad-shape',
      },
    ] as any);

    expect(rows).toEqual([
      {
        id: 'entry-1',
        name: 'Agent One',
        type: 'agent',
        source: 'community',
        installed: true,
        description: '',
        tags: ['alpha'],
        verified: true,
      },
      {
        id: 'marketplace-3',
        name: 'Unnamed entry',
        type: 'tool',
        source: 'unknown',
        installed: false,
        description: '',
        tags: [],
        verified: false,
      },
    ]);
  });

  it('returns empty list when marketplace payload is not an array', () => {
    expect(normalizeMarketplaceEntries({ bad: true } as any)).toEqual([]);
    expect(normalizeMarketplaceEntries(undefined as any)).toEqual([]);
  });
});
