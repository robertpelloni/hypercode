import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWorkspaceManager = {
  createWorkspace: vi.fn(),
  getAllWorkspaces: vi.fn(),
  getWorkspaceStats: vi.fn(),
};

vi.mock('../services/workspace-manager.js', () => ({
  workspaceManager: mockWorkspaceManager,
}));

describe('workspace routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns 503 when workspace storage is unavailable', async () => {
    mockWorkspaceManager.getAllWorkspaces.mockRejectedValue(
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/orchestrator/council/routes/workspace.test.ts
      new Error('SQLite runtime is unavailable for HyperCode DB-backed features (Could not locate the bindings file. Tried: better-sqlite3.node)'),
=======
      new Error('SQLite runtime is unavailable for borg DB-backed features (Could not locate the bindings file. Tried: better-sqlite3.node)'),
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/orchestrator/council/routes/workspace.test.ts
    );

    const { default: app } = await import('./workspace.js');
    const response = await app.request('http://localhost/');
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: 'Workspace manager is unavailable: SQLite runtime is unavailable for this run.',
    });
  });

  it('returns 503 for workspace stats when storage is unavailable', async () => {
    mockWorkspaceManager.getWorkspaceStats.mockRejectedValue(
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/orchestrator/council/routes/workspace.test.ts
      new Error('SQLite runtime is unavailable for HyperCode DB-backed features (Could not locate the bindings file. Tried: better-sqlite3.node)'),
=======
      new Error('SQLite runtime is unavailable for borg DB-backed features (Could not locate the bindings file. Tried: better-sqlite3.node)'),
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/orchestrator/council/routes/workspace.test.ts
    );

    const { default: app } = await import('./workspace.js');
    const response = await app.request('http://localhost/workspace-1/stats');
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: 'Workspace manager is unavailable: SQLite runtime is unavailable for this run.',
    });
  });
});
