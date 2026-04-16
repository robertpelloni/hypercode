import { describe, expect, it } from 'vitest';

import { getDiscoveryPreflightFailure } from '../src/mcp/discoveryPreflight.ts';
import { hasReusableMetadataCache } from '../src/mcp/serverMetadataCache.ts';

describe('MCP discovery failure handling', () => {
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

  it('blocks discovery when placeholder configuration is still present', () => {
    const failure = getDiscoveryPreflightFailure({
      name: 'mem0',
      type: 'STDIO',
      command: 'npx',
      args: ['-y', '@mem0/mcp-server@latest'],
      env: {
        MEM0_API_KEY: 'YOUR_MEM0_KEY_HERE',
        LLM_API_KEY: 'YOUR_OPENAI_KEY_HERE',
      },
    }, {
      commandExists: () => true,
    });

    expect(failure).toContain('placeholder or sample configuration values');
    expect(failure).toContain('env.MEM0_API_KEY');
  });

  it('blocks discovery when the stdio command is unavailable on PATH', () => {
    const failure = getDiscoveryPreflightFailure({
      name: 'mcp-yfinance-server',
      type: 'STDIO',
      command: 'mcp-yfinance-server',
      args: [],
      env: {},
    }, {
      commandExists: () => false,
    });

    expect(failure).toContain('not available on PATH');
    expect(failure).toContain('mcp-yfinance-server');
  });
});
