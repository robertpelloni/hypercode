import { describe, expect, it } from 'vitest';

import { normalizePlanCheckpoints, normalizePlanDiffs } from './plans-page-normalizers';

describe('plans page normalizers', () => {
  it('normalizes malformed diffs payload into safe render rows', () => {
    const rows = normalizePlanDiffs([
      null,
      {
        id: ' d1 ',
        filePath: ' apps/web/src/app/page.tsx ',
        status: 'approved',
        proposedContent: 7,
      },
      {
        id: '',
        filePath: '',
        status: 'unknown',
      },
    ] as any);

    expect(rows).toEqual([
      {
        id: 'd1',
        filePath: 'apps/web/src/app/page.tsx',
        status: 'approved',
        proposedContent: '',
      },
      {
        id: 'diff-2',
        filePath: '(unknown file)',
        status: 'pending',
        proposedContent: '',
      },
    ]);
  });

  it('normalizes malformed checkpoints payload into safe render rows', () => {
    const rows = normalizePlanCheckpoints([
      {
        id: ' cp-1 ',
        name: ' Before Upgrade ',
        timestamp: ' 2026-03-14T10:00:00.000Z ',
        description: 9,
      },
      {
        id: '',
        name: '',
        timestamp: 7,
      },
      'bad-row',
    ] as any);

    expect(rows).toEqual([
      {
        id: 'cp-1',
        name: 'Before Upgrade',
        timestamp: '2026-03-14T10:00:00.000Z',
        description: undefined,
      },
      {
        id: 'checkpoint-1',
        name: 'Checkpoint 2',
        timestamp: '',
        description: undefined,
      },
    ]);
  });

  it('returns empty arrays for non-array payloads', () => {
    expect(normalizePlanDiffs(undefined as any)).toEqual([]);
    expect(normalizePlanCheckpoints({ bad: true } as any)).toEqual([]);
  });
});