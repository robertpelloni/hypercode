import { describe, expect, it } from 'vitest';

import { normalizeDirectorAutonomyLevel, normalizeDirectorPlan } from './director-page-normalizers';

describe('director page normalizers', () => {
  it('normalizes malformed config/task status payloads into safe plan view', () => {
    const plan = normalizeDirectorPlan(
      { defaultTopic: '  Scale swarm safely  ' } as any,
      { status: 'busy', taskId: 99, progress: 'bad' } as any,
    );

    expect(plan).toEqual({
      goal: 'Scale swarm safely',
      status: 'IN_PROGRESS',
      steps: [],
    });
  });

  it('creates running step when task id is valid and progress is numeric', () => {
    const plan = normalizeDirectorPlan(
      undefined as any,
      { status: 'processing', taskId: 'run-123', progress: 42 } as any,
    );

    expect(plan).toEqual({
      goal: 'Defining Mission...',
      status: 'IN_PROGRESS',
      steps: [
        {
          id: 1,
          action: 'run-123',
          status: 'RUNNING',
          result: 'Progress: 42%',
        },
      ],
    });
  });

  it('normalizes autonomy level to known enum values', () => {
    expect(normalizeDirectorAutonomyLevel('high')).toBe('high');
    expect(normalizeDirectorAutonomyLevel('medium')).toBe('medium');
    expect(normalizeDirectorAutonomyLevel('low')).toBe('low');
    expect(normalizeDirectorAutonomyLevel('experimental')).toBe('unknown');
    expect(normalizeDirectorAutonomyLevel(undefined)).toBe('unknown');
  });
});