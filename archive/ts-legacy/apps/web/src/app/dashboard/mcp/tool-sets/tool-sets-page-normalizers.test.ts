import { describe, expect, it } from 'vitest';

import { normalizeSelectableTools, normalizeToolSets } from './tool-sets-page-normalizers';

describe('tool sets page normalizers', () => {
  it('normalizes malformed tool-set payloads into safe renderable rows', () => {
    const rows = normalizeToolSets([
      null,
      123,
      {
        uuid: ' ts-1 ',
        name: ' Core Tools ',
        description: 42,
        tools: ['shell.run', 99, null, '  memory.search  '],
      },
      {
        name: '',
        tools: 'bad-shape',
      },
    ] as any);

    expect(rows).toEqual([
      {
        uuid: 'ts-1',
        name: 'Core Tools',
        description: '',
        tools: ['shell.run', 'memory.search'],
      },
      {
        uuid: 'tool-set-3',
        name: 'Unnamed tool set',
        description: '',
        tools: [],
      },
    ]);
  });

  it('normalizes selectable tools and returns [] for non-array payloads', () => {
    const tools = normalizeSelectableTools([
      null,
      {
        uuid: ' tool-1 ',
        name: ' Search Tool ',
      },
      {
        uuid: '',
        name: 9,
      },
    ] as any);

    expect(tools).toEqual([
      {
        uuid: 'tool-1',
        name: 'Search Tool',
      },
      {
        uuid: 'tool-2',
        name: 'Unknown tool',
      },
    ]);

    expect(normalizeSelectableTools({ bad: true } as any)).toEqual([]);
    expect(normalizeToolSets(undefined as any)).toEqual([]);
  });
});
