import { describe, expect, it } from 'vitest';

import { normalizeCouncilSessions } from './council-page-normalizers';

describe('council page normalizers', () => {
  it('normalizes malformed session payloads into safe deep rows', () => {
    const rows = normalizeCouncilSessions([
      null,
      {
        id: ' session-1 ',
        topic: ' Should we ship now? ',
        status: 'concluded',
        round: 2,
        opinions: [
          { agentId: ' architect ', content: 'ship', timestamp: 10, round: 1 },
          { agentId: '', content: 7, timestamp: 'bad', round: null },
          null,
        ],
        votes: [
          { agentId: ' critic ', choice: 'no', reason: 'risk', timestamp: 12 },
          { agentId: '', choice: null, reason: 1, timestamp: 'bad' },
        ],
        createdAt: 111,
      },
      {
        id: '',
        topic: '',
        status: 'unknown',
        round: 'bad',
        opinions: 'bad-shape',
        votes: undefined,
        createdAt: null,
      },
    ] as any);

    expect(rows).toEqual([
      {
        id: 'session-1',
        topic: 'Should we ship now?',
        status: 'concluded',
        round: 2,
        opinions: [
          { agentId: 'architect', content: 'ship', timestamp: 10, round: 1 },
          { agentId: 'agent-1', content: '', timestamp: 0, round: 0 },
        ],
        votes: [
          { agentId: 'critic', choice: 'no', reason: 'risk', timestamp: 12 },
          { agentId: 'voter-1', choice: '', reason: '', timestamp: 0 },
        ],
        createdAt: 111,
      },
      {
        id: 'session-2',
        topic: 'Untitled debate',
        status: 'active',
        round: 0,
        opinions: [],
        votes: [],
        createdAt: 0,
      },
    ]);
  });

  it('returns empty list for non-array payloads', () => {
    expect(normalizeCouncilSessions(undefined as any)).toEqual([]);
    expect(normalizeCouncilSessions({ bad: true } as any)).toEqual([]);
  });
});