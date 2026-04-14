import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { resolveDataDir } from './commands/start.js';

const DEFAULT_TRPC_HOST = '127.0.0.1';
const DEFAULT_TRPC_PORT = 4000;

interface BorgStartLockRecord {
  instanceId: string;
  pid: number;
  port: number;
  host: string;
  createdAt: string;
}

export interface ControlPlaneLocation {
  source: 'env' | 'lock' | 'default';
  baseUrl: string;
  host: string;
  port: number;
}

interface TrpcEnvelope<TData> {
  result?: {
    data?: TData;
  };
  error?: {
    message?: string;
    data?: {
      code?: string;
    };
  };
}

function normalizeBrowserHost(host: string): string {
  if (host === '0.0.0.0' || host === '::' || host === '[::]') {
    return DEFAULT_TRPC_HOST;
  }

  return host;
}

function normalizeTrpcBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/trpc') ? trimmed : `${trimmed}/trpc`;
}

function readStartLockRecord(dataDir: string): BorgStartLockRecord | null {
  const lockPath = join(resolveDataDir(dataDir), 'lock');
  if (!existsSync(lockPath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(lockPath, 'utf8')) as Partial<BorgStartLockRecord>;
    if (
      typeof parsed.instanceId !== 'string'
      || typeof parsed.pid !== 'number'
      || typeof parsed.port !== 'number'
      || typeof parsed.host !== 'string'
      || typeof parsed.createdAt !== 'string'
    ) {
      return null;
    }

    return parsed as BorgStartLockRecord;
  } catch {
    return null;
  }
}

export function resolveControlPlaneLocation(options: {
  upstream?: string | null;
  dataDir?: string;
} = {}): ControlPlaneLocation {
  const upstream = options.upstream ?? process.env.BORG_TRPC_UPSTREAM ?? null;
  if (upstream && upstream.trim().length > 0) {
    const normalized = normalizeTrpcBaseUrl(upstream);
    const url = new URL(normalized);
    return {
      source: 'env',
      baseUrl: normalized,
      host: url.hostname,
      port: url.port ? Number.parseInt(url.port, 10) : url.protocol === 'https:' ? 443 : 80,
    };
  }

  const lock = readStartLockRecord(options.dataDir ?? '~/.hypercode');
  if (lock) {
    const host = normalizeBrowserHost(lock.host);
    return {
      source: 'lock',
      baseUrl: `http://${host}:${lock.port}/trpc`,
      host,
      port: lock.port,
    };
  }

  return {
    source: 'default',
    baseUrl: `http://${DEFAULT_TRPC_HOST}:${DEFAULT_TRPC_PORT}/trpc`,
    host: DEFAULT_TRPC_HOST,
    port: DEFAULT_TRPC_PORT,
  };
}

export async function queryTrpc<TData>(
  procedurePath: string,
  input?: unknown,
  options: {
    fetchImpl?: typeof fetch;
    upstream?: string | null;
    dataDir?: string;
  } = {},
): Promise<TData> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const location = resolveControlPlaneLocation({
    upstream: options.upstream,
    dataDir: options.dataDir,
  });
  const url = new URL(`${location.baseUrl}/${procedurePath}`);
  if (typeof input !== 'undefined') {
    url.searchParams.set('input', JSON.stringify(input));
  }

  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: {
        Accept: 'application/json',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to reach HyperCode control plane at ${location.baseUrl}: ${message}`);
  }

  let body: TrpcEnvelope<TData>;
  try {
    body = await response.json() as TrpcEnvelope<TData>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`HyperCode control plane at ${location.baseUrl} returned invalid JSON: ${message}`);
  }

  if (!response.ok || body.error) {
    const message = body.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`HyperCode control plane query failed for ${procedurePath}: ${message}`);
  }

  if (!body.result || !('data' in body.result)) {
    throw new Error(`HyperCode control plane query returned no result for ${procedurePath}`);
  }

  return body.result.data as TData;
}
