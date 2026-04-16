import { describe, test, expect } from 'vitest';
import { JulesKeeperManager, type JulesClient } from '../../src/managers/JulesKeeperManager.js';
import { createJulesKeeperRoutes } from '../../src/routes/julesKeeperRoutesHono.js';

type KeeperStoreArg = Parameters<typeof createJulesKeeperRoutes>[1];

class MemoryStore {
  last: Record<string, unknown> | null = null;
  load() {
    return {};
  }
  save(config: Record<string, unknown>) {
    this.last = config;
  }
}

describe('jules keeper routes', () => {
  test('status and run-once endpoints', async () => {
    const client: JulesClient = {
      async listSessions() {
        return [];
      },
      async approvePlan() {},
      async interruptSession() {},
      async continueSession() {},
      async sendMessage() {},
    };

    const keeper = new JulesKeeperManager(client);
    keeper.setConfig({ enabled: true, nudgeEnabled: false, approvePlans: false });

    const store = new MemoryStore();
  const app = createJulesKeeperRoutes(keeper, store as unknown as KeeperStoreArg);

    const statusRes = await app.request('http://localhost/status');
    expect(statusRes.status).toBe(200);

    const runRes = await app.request('http://localhost/run-once', { method: 'POST' });
    expect(runRes.status).toBe(200);

    const cfgRes = await app.request('http://localhost/config', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });
    expect(cfgRes.status).toBe(200);
    expect(store.last?.enabled).toBe(true);
  });
});
