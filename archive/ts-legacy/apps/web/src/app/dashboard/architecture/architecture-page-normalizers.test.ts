import { describe, expect, it } from 'vitest';

import { normalizeArchitectureSubmodules, normalizeDependencyGraph } from './architecture-page-normalizers';

describe('architecture page normalizers', () => {
  it('normalizes malformed submodule payload rows into safe renderable values', () => {
    const rows = normalizeArchitectureSubmodules([
      null,
      'bad-row',
      {
        name: '  MetaMCP  ',
        path: ' external/MetaMCP ',
        url: ' https://github.com/robertpelloni/MetaMCP.git ',
      },
      {
        path: '',
        name: 77,
        url: 42,
      },
    ] as any);

    expect(rows).toEqual([
      {
        name: 'MetaMCP',
        path: 'external/MetaMCP',
        url: 'https://github.com/robertpelloni/MetaMCP.git',
      },
      {
        name: 'submodule-3',
        path: 'submodule-3',
        url: '',
      },
    ]);
  });

  it('normalizes malformed dependency graph payload into safe defaults', () => {
    expect(normalizeDependencyGraph(undefined as any)).toEqual({ dependencies: {} });

    expect(
      normalizeDependencyGraph({
        dependencies: {
          ' apps/web ': [' packages/core ', null, 88, ''],
          '': ['ignored'],
          'packages/core': 'invalid-shape',
        },
      } as any),
    ).toEqual({
      dependencies: {
        'apps/web': ['packages/core'],
        'packages/core': [],
      },
    });
  });
});