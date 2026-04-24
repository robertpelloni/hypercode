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
<<<<<<< HEAD:archive/ts-legacy/packages/core/test/orchestrator.test.ts
        || normalized === 'C:\\repo\\packages\\hypercode-supervisor\\dist\\index.js';
    });

    expect(resolveSupervisorEntryPath('C:\\repo\\packages\\cli')).toBe('C:\\repo\\packages\\hypercode-supervisor\\dist\\index.js');
=======
        || normalized === 'C:\\repo\\packages\\borg-supervisor\\dist\\index.js';
    });

    expect(resolveSupervisorEntryPath('C:\\repo\\packages\\cli')).toBe('C:\\repo\\packages\\borg-supervisor\\dist\\index.js');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/test/orchestrator.test.ts
  });
});
