import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db.js', () => ({
  dbService: {
    getDb: vi.fn(),
  },
}));

const { dbService } = await import('../db.js');
const { autonomousMaintenance } = await import('../system-maintenance.js');

const mockGetDb = vi.mocked(dbService.getDb);

describe('AutonomousMaintenanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    autonomousMaintenance.stop();
  });

  afterEach(() => {
    autonomousMaintenance.stop();
  });

  it('warns concisely and continues when SQLite is unavailable', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockGetDb.mockImplementation(() => {
      throw new Error(
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/orchestrator/council/services/__tests__/system-maintenance.test.ts
        'SQLite runtime is unavailable for HyperCode DB-backed features (Could not locate the bindings file. Tried: better-sqlite3.node)',
=======
        'SQLite runtime is unavailable for borg DB-backed features (Could not locate the bindings file. Tried: better-sqlite3.node)',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/orchestrator/council/services/__tests__/system-maintenance.test.ts
      );
    });

    await autonomousMaintenance.runMaintenance();

    expect(warnSpy).toHaveBeenCalledWith(
      '[Maintenance] Skipping database optimization: SQLite runtime is unavailable for this run.',
    );
    expect(errorSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('[Maintenance] Running scheduled system maintenance...');
  });
});
