import fs from 'fs';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveMonorepoRoot, resolveSupervisorEntryPath } from '../src/orchestratorPaths.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('orchestrator path resolution', () => {
  it('finds the monorepo root by walking upward to turbo.json', () => {
    const existsSync = vi.spyOn(fs, 'existsSync').mockImplementation((target) => String(target).endsWith('repo\\turbo.json'));

    expect(resolveMonorepoRoot('C:\\repo\\packages\\cli')).toBe('C:\\repo');
    expect(existsSync).toHaveBeenCalled();
  });

  it('resolves the supervisor entry from the monorepo root instead of the current cwd package', () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((target) => {
      const normalized = String(target).replace(/\//g, '\\');
      return normalized === 'C:\\repo\\turbo.json'
        || normalized === 'C:\\repo\\packages\\hypercode-supervisor\\dist\\index.js';
    });

    expect(resolveSupervisorEntryPath('C:\\repo\\packages\\cli')).toBe('C:\\repo\\packages\\hypercode-supervisor\\dist\\index.js');
  });
});
