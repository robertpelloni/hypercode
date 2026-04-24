import { describe, expect, it } from 'vitest';

import { normalizePolicies } from './policies-page-normalizers';

describe('policies page normalizers', () => {
  it('normalizes malformed policy rows into safe renderable values', () => {
    const rows = normalizePolicies([
      null,
      123,
      {
        uuid: ' policy-1 ',
        name: ' Admin Access ',
        description: 42,
        rules: {
          allow: ['*', null, ' filesystem:read_* '],
          deny: ['shell:*', 99],
        },
      },
      {
        name: '',
        rules: 'bad-shape',
      },
    ] as any);

    expect(rows).toEqual([
      {
        uuid: 'policy-1',
        name: 'Admin Access',
        description: '',
        rules: {
          allow: ['*', 'filesystem:read_*'],
          deny: ['shell:*'],
        },
      },
      {
        uuid: 'policy-3',
        name: 'Unnamed policy',
        description: '',
        rules: {
          allow: [],
          deny: [],
        },
      },
    ]);
  });

  it('returns empty array when payload is not an array', () => {
    expect(normalizePolicies({ bad: true } as any)).toEqual([]);
    expect(normalizePolicies(undefined as any)).toEqual([]);
  });
});
