import { describe, expect, it } from 'vitest';

import { filterSymbols, normalizeSymbols } from './symbols-page-normalizers';

describe('symbols page normalizers', () => {
  it('normalizes malformed symbol payload rows with safe defaults', () => {
    const symbols = normalizeSymbols([
      {
        id: '  sym-1  ',
        name: '  doThing  ',
        file: '  src/a.ts  ',
        type: 'function',
        priority: 9,
        lineStart: 42,
        notes: '  important  ',
      },
      {
        id: '',
        name: null,
        file: 17,
        type: 'mystery',
        priority: -1,
        lineStart: 0,
      },
      null,
    ] as any);

    expect(symbols).toEqual([
      {
        id: 'sym-1',
        name: 'doThing',
        file: 'src/a.ts',
        type: 'function',
        priority: 3,
        lineStart: 42,
        notes: 'important',
      },
      {
        id: 'unknown:2',
        name: 'UnnamedSymbol',
        file: 'unknown-file',
        type: 'unknown',
        priority: 1,
        lineStart: undefined,
        notes: undefined,
      },
      {
        id: 'unknown:3',
        name: 'UnnamedSymbol',
        file: 'unknown-file',
        type: 'unknown',
        priority: 1,
        lineStart: undefined,
        notes: undefined,
      },
    ]);
  });

  it('filters symbols by name or file, case-insensitive', () => {
    const symbols = normalizeSymbols([
      { id: 'a', name: 'AlphaFn', file: 'src/alpha.ts', type: 'function' },
      { id: 'b', name: 'BetaClass', file: 'src/beta.ts', type: 'class' },
    ] as any);

    expect(filterSymbols(symbols, 'alpha').map((s) => s.id)).toEqual(['a']);
    expect(filterSymbols(symbols, 'BETA.ts').map((s) => s.id)).toEqual(['b']);
    expect(filterSymbols(symbols, '   ').map((s) => s.id)).toEqual(['a', 'b']);
  });
});
