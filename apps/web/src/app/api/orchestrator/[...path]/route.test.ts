import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

describe('orchestrator proxy route', () => {
  const originalFetch = global.fetch;
  const originalConfigDir = process.env.BORG_CONFIG_DIR;
  let tempConfigDir = '';

  beforeEach(async () => {
    tempConfigDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-orchestrator-route-'));
    process.env.BORG_CONFIG_DIR = tempConfigDir;
    await fs.writeFile(
      path.join(tempConfigDir, 'lock'),
      JSON.stringify({ host: '0.0.0.0', port: 4000 }),
      'utf8',
    );
  });

  afterEach(async () => {
    global.fetch = originalFetch;

    if (originalConfigDir === undefined) {
      delete process.env.BORG_CONFIG_DIR;
    } else {
      process.env.BORG_CONFIG_DIR = originalConfigDir;
    }

    if (tempConfigDir) {
      await fs.rm(tempConfigDir, { recursive: true, force: true });
      tempConfigDir = '';
    }
  });

  it('buffers standard JSON responses before returning them', async () => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true, tools: ['hypercode'] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch;

    const response = await GET(
      new Request('http://localhost:3000/api/orchestrator/api/cli/tools'),
      { params: Promise.resolve({ path: ['api', 'cli', 'tools'] }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, tools: ['hypercode'] });
    expect(global.fetch).toHaveBeenCalledWith(
      new URL('http://127.0.0.1:4000/api/cli/tools'),
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });

  it('returns a controlled 502 when the upstream body cannot be fully read', async () => {
    const bodyFailure = new TypeError('terminated');
    const upstreamResponse = {
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      body: null,
      arrayBuffer: vi.fn(async () => {
        throw bodyFailure;
      }),
    } as unknown as Response;

    global.fetch = vi.fn(async () => upstreamResponse) as typeof fetch;

    const response = await GET(
      new Request('http://localhost:3000/api/orchestrator/api/cli/tools'),
      { params: Promise.resolve({ path: ['api', 'cli', 'tools'] }) },
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: 'ORCHESTRATOR_UPSTREAM_UNAVAILABLE',
      message: 'terminated',
      upstream: 'http://127.0.0.1:4000/api/cli/tools',
    });
  });
});
