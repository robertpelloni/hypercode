import { existsSync, readFileSync } from 'node:fs';
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/control-plane.ts
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
=======
import { join } from 'node:path';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/control-plane.ts

import { resolveDataDir } from './commands/start.js';

const DEFAULT_TRPC_HOST = '127.0.0.1';
const DEFAULT_TRPC_PORT = 4000;

<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/control-plane.ts
interface HyperCodeStartLockRecord {
=======
interface BorgStartLockRecord {
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/control-plane.ts
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

<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/control-plane.ts
function readStartLockRecord(dataDir: string): HyperCodeStartLockRecord | null {
=======
function readStartLockRecord(dataDir: string): BorgStartLockRecord | null {
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/control-plane.ts
  const lockPath = join(resolveDataDir(dataDir), 'lock');
  if (!existsSync(lockPath)) {
    return null;
  }

  try {
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/control-plane.ts
    const parsed = JSON.parse(readFileSync(lockPath, 'utf8')) as Partial<HyperCodeStartLockRecord>;
=======
    const parsed = JSON.parse(readFileSync(lockPath, 'utf8')) as Partial<BorgStartLockRecord>;
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/control-plane.ts
    if (
      typeof parsed.instanceId !== 'string'
      || typeof parsed.pid !== 'number'
      || typeof parsed.port !== 'number'
      || typeof parsed.host !== 'string'
      || typeof parsed.createdAt !== 'string'
    ) {
      return null;
    }

<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/control-plane.ts
    return parsed as HyperCodeStartLockRecord;
  } catch {
    return null;
  }
}

// === readLocalStartupProvenance ===

export interface LocalStartupProvenance {
  requestedPort: number;
  activePort: number;
  portDecision: string;
  portReason: string;
  updatedAt?: string;
}

export function readLocalStartupProvenance(dataDir: string): LocalStartupProvenance | null {
  const resolvedDir = dataDir.startsWith('~')
    ? resolve(dataDir.replace('~', homedir()))
    : resolve(dataDir);
  const lockPath = join(resolvedDir, 'lock');
  try {
    const raw = readFileSync(lockPath, 'utf8');
    const lock = JSON.parse(raw) as { port?: number; createdAt?: string; [key: string]: unknown };
    const port = lock.port ?? DEFAULT_TRPC_PORT;
    return {
      requestedPort: port,
      activePort: port,
      portDecision: 'derived from lock record',
      portReason: 'Detailed startup port provenance was unavailable; using the current control-plane lock port.',
      updatedAt: lock.createdAt,
    };
=======
    return parsed as BorgStartLockRecord;
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/control-plane.ts
  } catch {
    return null;
  }
}

export function resolveControlPlaneLocation(options: {
  upstream?: string | null;
  dataDir?: string;
} = {}): ControlPlaneLocation {
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/control-plane.ts
  const upstream = options.upstream ?? process.env.HYPERCODE_TRPC_UPSTREAM ?? null;
=======
  const upstream = options.upstream ?? process.env.BORG_TRPC_UPSTREAM ?? null;
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/control-plane.ts
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

<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/control-plane.ts
  const lock = readStartLockRecord(options.dataDir ?? '~/.hypercode');
=======
  const lock = readStartLockRecord(options.dataDir ?? '~/.borg');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/control-plane.ts
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
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/control-plane.ts
    throw new Error(`Unable to reach HyperCode control plane at ${location.baseUrl}: ${message}`);
=======
    throw new Error(`Unable to reach borg control plane at ${location.baseUrl}: ${message}`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/control-plane.ts
  }

  let body: TrpcEnvelope<TData>;
  try {
    body = await response.json() as TrpcEnvelope<TData>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/control-plane.ts
    throw new Error(`HyperCode control plane at ${location.baseUrl} returned invalid JSON: ${message}`);
=======
    throw new Error(`borg control plane at ${location.baseUrl} returned invalid JSON: ${message}`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/control-plane.ts
  }

  if (!response.ok || body.error) {
    const message = body.error?.message ?? `HTTP ${response.status}`;
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/control-plane.ts
    throw new Error(`HyperCode control plane query failed for ${procedurePath}: ${message}`);
  }

  if (!body.result || !('data' in body.result)) {
    throw new Error(`HyperCode control plane query returned no result for ${procedurePath}`);
=======
    throw new Error(`borg control plane query failed for ${procedurePath}: ${message}`);
  }

  if (!body.result || !('data' in body.result)) {
    throw new Error(`borg control plane query returned no result for ${procedurePath}`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/control-plane.ts
  }

  return body.result.data as TData;
}
