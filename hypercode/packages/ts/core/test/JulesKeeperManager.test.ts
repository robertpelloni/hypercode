import { describe, test, expect } from 'vitest';
import { JulesKeeperManager, type JulesClient } from '../src/managers/JulesKeeperManager.js';

describe('JulesKeeperManager', () => {
  test('approves awaiting sessions', async () => {
    const approved: string[] = [];

    const client: JulesClient = {
      async listSessions() {
        return [
          { id: '1', state: 'AWAITING_PLAN_APPROVAL', lastActivityAt: new Date().toISOString() },
          { id: '2', state: 'IN_PROGRESS', lastActivityAt: new Date().toISOString() },
        ];
      },
      async approvePlan(sessionId: string) {
        approved.push(sessionId);
      },
      async interruptSession() {},
      async continueSession() {},
      async sendMessage() {},
    };

    const keeper = new JulesKeeperManager(client);
    keeper.setConfig({ enabled: true, approvePlans: true, nudgeEnabled: false });

    const res = await keeper.runOnce(Date.now());
    expect('skipped' in res).toBeFalsy();
    if (!('skipped' in res)) {
      expect(res.approved).toBe(1);
    }
    expect(approved).toEqual(['1']);
  });

  test('nudges idle sessions', async () => {
    const messages: Array<{ id: string; msg: string }> = [];
    const old = new Date(Date.now() - 2 * 60 * 60_000).toISOString();

    const client: JulesClient = {
      async listSessions() {
        return [{ id: 's', state: 'IN_PROGRESS', lastActivityAt: old }];
      },
      async approvePlan() {},
      async interruptSession() {},
      async continueSession() {},
      async sendMessage(sessionId: string, message: string) {
        messages.push({ id: sessionId, msg: message });
      },
    };

    const keeper = new JulesKeeperManager(client);
    keeper.setConfig({
      enabled: true,
      approvePlans: false,
      nudgeEnabled: true,
      nudgeInProgressAfterMs: 1,
      nudgeOtherAfterMs: 1,
    });

    const res = await keeper.runOnce(Date.now());
    expect('skipped' in res).toBeFalsy();
    expect(messages.length).toBe(1);
    expect(messages[0]?.id).toBe('s');
  });

  test('prevents overlapping runOnce', async () => {
    let resolveList: null | (() => void) = null;

    const client: JulesClient = {
      listSessions: () =>
        new Promise((resolve) => {
          resolveList = () => resolve([]);
        }),
      async approvePlan() {},
      async interruptSession() {},
      async continueSession() {},
      async sendMessage() {},
    };

    const keeper = new JulesKeeperManager(client);
    keeper.setConfig({ enabled: true });

    const p1 = keeper.runOnce(Date.now());
    const p2 = keeper.runOnce(Date.now());

    const r2 = await p2;
    expect('skipped' in r2).toBeTruthy();

    (resolveList as null | (() => void))?.();
    const r1 = await p1;
    expect('skipped' in r1).toBeFalsy();
  });
});
