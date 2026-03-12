import { describe, expect, it } from 'vitest';

import { StdioClient } from '../src/mcp/StdioClient.ts';
import { hasReusableMetadataCache } from '../src/mcp/serverMetadataCache.ts';

describe('MCP discovery failure handling', () => {
  it('throws when strict tool discovery fails', async () => {
    const client = new StdioClient('demo', {
      command: 'npx',
      args: ['demo-server'],
      env: {},
      enabled: true,
    });

    (client as any).client = {
      listTools: async () => {
        throw new Error('tools/list failed');
      },
    };

    await expect(client.listTools({ throwOnError: true })).rejects.toThrow('tools/list failed');
    await expect(client.listTools()).resolves.toEqual([]);
  });

  it('does not auto-reuse an empty ready cache', () => {
    const reusable = hasReusableMetadataCache(
      {
        status: 'ready',
        metadataVersion: 2,
        metadataSource: 'binary',
        discoveredAt: '2026-03-11T00:00:00.000Z',
        lastSuccessfulBinaryLoadAt: '2026-03-11T00:00:00.000Z',
        configFingerprint: 'will-be-ignored-by-mismatch-check',
        toolCount: 0,
        tools: [],
      },
      {
        name: 'demo',
        type: 'STDIO',
        command: 'npx',
        args: ['demo-server'],
        env: {},
        url: null,
        headers: {},
        bearerToken: null,
      },
    );

    expect(reusable).toBe(false);
  });
});
