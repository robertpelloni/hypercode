import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { queryTrpc, resolveControlPlaneLocation } from './control-plane.js';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'hypercode-control-plane-'));
  tempDirs.push(dir);
  return dir;
}

describe('resolveControlPlaneLocation', () => {
  it('prefers the explicit upstream and normalizes missing /trpc suffixes', () => {
    expect(resolveControlPlaneLocation({
      upstream: 'http://localhost:3100',
    })).toEqual({
      source: 'env',
      baseUrl: 'http://localhost:3100/trpc',
      host: 'localhost',
      port: 3100,
    });
  });

  it('uses the lock file when available and rewrites wildcard hosts for local access', () => {
    const dataDir = createTempDir();
    writeFileSync(join(dataDir, 'lock'), JSON.stringify({
      instanceId: 'hypercode-test',
      pid: 1234,
      port: 4555,
      host: '0.0.0.0',
      createdAt: '2026-03-30T00:00:00.000Z',
    }), 'utf8');

    expect(resolveControlPlaneLocation({ dataDir })).toEqual({
      source: 'lock',
      baseUrl: 'http://127.0.0.1:4555/trpc',
      host: '127.0.0.1',
      port: 4555,
    });
  });

  it('falls back to the default control-plane address when no upstream is configured', () => {
    expect(resolveControlPlaneLocation({
      dataDir: createTempDir(),
    })).toEqual({
      source: 'default',
      baseUrl: 'http://127.0.0.1:4000/trpc',
      host: '127.0.0.1',
      port: 4000,
    });
  });
});

describe('queryTrpc', () => {
  it('returns result data from a successful tRPC query', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        result: {
          data: {
            nodeId: 'mesh-a',
            peersCount: 2,
          },
        },
      }),
    });

    await expect(queryTrpc<{ nodeId: string; peersCount: number }>('mesh.getStatus', undefined, {
      upstream: 'http://localhost:4000/trpc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toEqual({
      nodeId: 'mesh-a',
      peersCount: 2,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe('http://localhost:4000/trpc/mesh.getStatus');
  });

  it('serializes query input into the URL', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        result: {
          data: {
            capabilities: ['git'],
          },
        },
      }),
    });

    await queryTrpc<{ capabilities: string[] }>('mesh.queryCapabilities', {
      nodeId: 'peer-a',
      timeoutMs: 1500,
    }, {
      upstream: 'http://localhost:4000',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const [url] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe(
      'http://localhost:4000/trpc/mesh.queryCapabilities?input=%7B%22nodeId%22%3A%22peer-a%22%2C%22timeoutMs%22%3A1500%7D',
    );
  });

  it('surfaces transport failures with the resolved control-plane address', async () => {
    await expect(queryTrpc('mesh.getStatus', undefined, {
      upstream: 'http://localhost:4000',
      fetchImpl: vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED')) as unknown as typeof fetch,
    })).rejects.toThrow('Unable to reach HyperCode control plane at http://localhost:4000/trpc');
  });

  it('surfaces tRPC error payloads clearly', async () => {
    await expect(queryTrpc('mesh.getStatus', undefined, {
      upstream: 'http://localhost:4000',
      fetchImpl: vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: {
            message: 'mesh unavailable',
          },
        }),
      }) as unknown as typeof fetch,
    })).rejects.toThrow('HyperCode control plane query failed for mesh.getStatus: mesh unavailable');
  });
});
