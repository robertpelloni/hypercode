import { describe, test, expect } from 'vitest';
import { JulesApiClient } from '../../src/services/JulesApiClient.js';

describe('JulesApiClient', () => {
  test('listSessions maps sessions', async () => {
    const client = new JulesApiClient({
      apiKey: 'k',
      baseUrl: 'https://example.com/v1alpha',
      fetchImpl: async (url) => {
        expect(String(url)).toContain('/sessions');
        return new Response(
          JSON.stringify({
            sessions: [
              { name: 'sessions/123', id: '123', title: 't', state: 'IN_PROGRESS', createTime: 'c', updateTime: 'u', url: 'x' },
            ],
          }),
          { status: 200 }
        );
      },
    });

    const res = await client.listSessions({ pageSize: 5 });
    expect(res.sessions[0]?.id).toBe('123');
    expect(res.sessions[0]?.title).toBe('t');
  });

  test('approvePlan hits approvePlan endpoint', async () => {
    let called = false;
    const client = new JulesApiClient({
      apiKey: 'k',
      baseUrl: 'https://example.com/v1alpha',
      fetchImpl: async (url, init) => {
        called = true;
        expect(String(url)).toContain('/sessions/abc:approvePlan');
        expect(init?.method).toBe('POST');
        return new Response('', { status: 200 });
      },
    });

    await client.approvePlan('abc');
    expect(called).toBe(true);
  });
});
