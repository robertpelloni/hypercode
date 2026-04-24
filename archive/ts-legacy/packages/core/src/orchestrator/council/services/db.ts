import { db, schema, sqliteInstance } from '../../../db/index.js';

class DatabaseService {
  constructor() {}

  getDb(): import('better-sqlite3').Database {
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/orchestrator/council/services/db.ts
    // In HyperCode, we use Drizzle 'db' for ORM and 'sqliteInstance' for raw sqlite.
=======
    // In borg, we use Drizzle 'db' for ORM and 'sqliteInstance' for raw sqlite.
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/orchestrator/council/services/db.ts
    return sqliteInstance;
  }

  getDrizzle() {
    return db;
  }

  getSchema() {
    return schema;
  }

  close() {
    // Managed by central DB index
  }
}

export const dbService = new DatabaseService();
