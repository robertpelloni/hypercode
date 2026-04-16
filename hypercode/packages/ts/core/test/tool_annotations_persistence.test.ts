import { describe, test, expect } from 'vitest';
import path from 'path';
import os from 'os';
import { mkdtempSync, rmSync } from 'fs';
import { DatabaseManager } from '../src/db/DatabaseManager.js';
import { ToolAnnotationManager } from '../src/managers/ToolAnnotationManager.js';

type ToolAnnotationDatabaseArg = Parameters<ToolAnnotationManager['setDatabase']>[0];

describe('ToolAnnotationManager persistence', () => {
  test('writes and reads from DB when available', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'hypercode-ann-db-'));

    let db: DatabaseManager;
    try {
      db = DatabaseManager.getInstance(dir);
    } catch {
      rmSync(dir, { recursive: true, force: true });
      return;
    }

    const mgr = new ToolAnnotationManager();
    // Reason: this test uses the real DB manager while staying decoupled from strict manager internals.
    // What: narrow DB instance at the call boundary via method parameter typing.
    // Why: removes broad casts and keeps persistence behavior unchanged.
    mgr.setDatabase(db as unknown as ToolAnnotationDatabaseArg);

    mgr.setAnnotation('srv', 'tool', { namespaceId: 'ns', displayName: 'x' });

    const mgr2 = new ToolAnnotationManager();
    mgr2.setDatabase(db as unknown as ToolAnnotationDatabaseArg);

    const read = mgr2.getAnnotation('srv', 'tool', 'ns');
    expect(read?.displayName).toBe('x');

    rmSync(dir, { recursive: true, force: true });
  });
});
