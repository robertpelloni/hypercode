import { describe, expect, it } from 'vitest';

import { normalizeEvolutionExperiments, normalizeEvolutionMutations } from './evolution-page-normalizers';

describe('evolution page normalizers', () => {
  it('normalizes malformed mutation rows into safe renderable values', () => {
    const rows = normalizeEvolutionMutations([
      null,
      99,
      {
        id: ' mut-1 ',
        timestamp: ' 2026-03-14T00:00:00.000Z ',
        reasoning: 55,
        originalPrompt: 'before',
        mutatedPrompt: 'after',
      },
      {
        id: '',
        timestamp: 123,
      },
    ] as any);

    expect(rows).toEqual([
      {
        id: 'mut-1',
        timestamp: '2026-03-14T00:00:00.000Z',
        reasoning: '',
        originalPrompt: 'before',
        mutatedPrompt: 'after',
      },
      {
        id: 'mutation-3',
        timestamp: '',
        reasoning: '',
        originalPrompt: '',
        mutatedPrompt: '',
      },
    ]);
  });

  it('normalizes malformed experiment rows into safe renderable values', () => {
    const rows = normalizeEvolutionExperiments([
      {
        id: ' exp-1 ',
        status: 'COMPLETED',
        winner: 'B',
        task: 'compare prompts',
        judgeReasoning: 17,
      },
      {
        id: '',
        status: 'UNKNOWN',
        winner: 'Z',
        task: 1,
      },
      null,
    ] as any);

    expect(rows).toEqual([
      {
        id: 'exp-1',
        status: 'COMPLETED',
        winner: 'B',
        task: 'compare prompts',
        judgeReasoning: '',
      },
      {
        id: 'experiment-1',
        status: 'PENDING',
        winner: null,
        task: '',
        judgeReasoning: '',
      },
    ]);
  });

  it('returns empty arrays for non-array payloads', () => {
    expect(normalizeEvolutionMutations(undefined as any)).toEqual([]);
    expect(normalizeEvolutionExperiments({ bad: true } as any)).toEqual([]);
  });
});