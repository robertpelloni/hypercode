import { describe, expect, it } from 'vitest';

import { getInstalledServerNames, normalizeRegistryItems } from './registry-page-normalizers';

describe('registry page normalizers', () => {
  it('normalizes malformed registry payloads into safe renderable rows', () => {
    const rows = normalizeRegistryItems([
      null,
      42,
      {
        id: ' fs ',
        name: ' filesystem ',
        description: 123,
        tags: [' official ', 123, null],
        command: ' npx ',
        args: ['-y', 1],
        env: { BRAVE_API_KEY: 'key', BAD: 123 },
      },
    ] as any);

    expect(rows).toEqual([
      {
        id: 'fs',
        name: 'filesystem',
        description: 'No description provided.',
        command: 'npx',
        args: ['-y'],
        env: { BRAVE_API_KEY: 'key' },
        tags: ['official'],
      },
    ]);
  });

  it('returns an empty list when registry payload is not an array', () => {
    expect(normalizeRegistryItems({ bad: true } as any)).toEqual([]);
    expect(normalizeRegistryItems(undefined as any)).toEqual([]);
  });

  it('extracts installed names only from array/object rows', () => {
    const names = getInstalledServerNames([
      { name: 'filesystem' },
      { name: ' memory ' },
      { bad: true },
      null,
      'oops',
    ] as any);

    expect(Array.from(names).sort()).toEqual(['filesystem', 'memory']);
    expect(Array.from(getInstalledServerNames({ bad: true } as any))).toEqual([]);
  });
});
