
import { test, expect } from '@playwright/test';

test.describe('Supervisor API Tests', () => {

  test('list_models requires apiKey and provider', async ({ request }) => {
    const response = await request.post('/api/supervisor', {
      data: {
        action: 'list_models',
        provider: 'openai'
        // Missing apiKey
      }
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Missing apiKey');
  });

  test('handoff returns error if no messages', async ({ request }) => {
    const response = await request.post('/api/supervisor', {
      data: {
        action: 'handoff',
        messages: [],
        provider: 'openai',
        apiKey: 'test-key'
      }
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('No messages');
  });

  test('review requires codeContext', async ({ request }) => {
    const response = await request.post('/api/supervisor', {
      data: {
        action: 'review',
        provider: 'openai',
        apiKey: 'test-key',
        // Missing codeContext
      }
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Missing codeContext');
  });

});
