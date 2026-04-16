import { describe, expect, it } from 'vitest';

import { normalizeSupervisorAutonomyLevel, normalizeSupervisorPlan } from './supervisor-page-normalizers';

describe('supervisor page normalizers', () => {
  it('normalizes malformed plan payload into safe task rows', () => {
    const plan = normalizeSupervisorPlan([
      {
        id: '  task-a  ',
        assignedTo: '  director  ',
        status: '  queued  ',
        description: '  validate model routing  ',
      },
      {
        id: '',
        assignedTo: null,
        status: 123,
        description: undefined,
      },
      null,
    ] as any);

    expect(plan).toEqual([
      {
        id: 'task-a',
        assignedTo: 'director',
        status: 'queued',
        description: 'validate model routing',
      },
      {
        id: 'unknown:2',
        assignedTo: 'unassigned',
        status: 'unknown',
        description: 'No description provided.',
      },
      {
        id: 'unknown:3',
        assignedTo: 'unassigned',
        status: 'unknown',
        description: 'No description provided.',
      },
    ]);
  });

  it('returns empty plan when payload is not an array', () => {
    expect(normalizeSupervisorPlan(undefined)).toEqual([]);
    expect(normalizeSupervisorPlan({})).toEqual([]);
  });

  it('normalizes autonomy level from string/object payloads and defaults safely', () => {
    expect(normalizeSupervisorAutonomyLevel('low')).toBe('low');
    expect(normalizeSupervisorAutonomyLevel('medium')).toBe('medium');
    expect(normalizeSupervisorAutonomyLevel('high')).toBe('high');
    expect(normalizeSupervisorAutonomyLevel({ level: 'high' })).toBe('high');
    expect(normalizeSupervisorAutonomyLevel({ level: 'invalid' })).toBe('low');
    expect(normalizeSupervisorAutonomyLevel(undefined)).toBe('low');
  });
});
