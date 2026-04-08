import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type HypercodeStartupProvenance = {
  requestedRuntime?: string;
  activeRuntime?: string;
  requestedPort?: number;
  activePort?: number;
  portDecision?: string;
  portReason?: string;
  launchMode?: string;
  dashboardMode?: string;
  installDecision?: string;
  installReason?: string;
  buildDecision?: string;
  buildReason?: string;
  updatedAt?: string;
};

type HyperCodeLockRecord = {
  port?: number;
  host?: string;
  createdAt?: string;
  startup?: HypercodeStartupProvenance | null;
};

function normalizeStartupProvenance(record: HyperCodeLockRecord | null): HypercodeStartupProvenance | null {
  if (!record || typeof record.port !== 'number' || record.port <= 0) {
    return null;
  }

  const startup = record.startup ?? {};
  const activePort = typeof startup.activePort === 'number' && startup.activePort > 0
    ? startup.activePort
    : record.port;
  const requestedPort = typeof startup.requestedPort === 'number' && startup.requestedPort > 0
    ? startup.requestedPort
    : activePort;

  return {
    ...startup,
    requestedPort,
    activePort,
    portDecision: startup.portDecision?.trim() || 'derived from lock record',
    portReason: startup.portReason?.trim() || 'Detailed startup port provenance was unavailable; using the current control-plane lock port.',
    updatedAt: startup.updatedAt?.trim() || (typeof record.createdAt === 'string' ? record.createdAt : undefined),
  };
}

function resolveBrowserHost(host: string): string {
  return host === '0.0.0.0' || host === '::' || host === '[::]'
    ? '127.0.0.1'
    : host;
}

export function resolveHyperCodeConfigDir(): string {
  const configuredDir = process.env.HYPERCODE_CONFIG_DIR?.trim() || process.env.HYPERCODE_CONFIG_DIR?.trim();
  if (configuredDir) {
    return configuredDir;
  }

  return path.join(os.homedir(), '.hypercode');
}

export function resolveHyperCodeLockPath(): string {
  return path.join(resolveHyperCodeConfigDir(), 'lock');
}

function readHyperCodeLockRecord(): HyperCodeLockRecord | null {
  const lockPath = resolveHyperCodeLockPath();
  if (!existsSync(lockPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(lockPath, 'utf8')) as HyperCodeLockRecord;
  } catch {
    return null;
  }
}

export function readLocalStartupProvenance(): HypercodeStartupProvenance | null {
  return normalizeStartupProvenance(readHyperCodeLockRecord());
}

export function resolveLockedHyperCodeBase(): string | null {
  const parsed = readHyperCodeLockRecord();
  if (!parsed || typeof parsed.port !== 'number' || parsed.port <= 0) {
    return null;
  }

  const host = typeof parsed.host === 'string' && parsed.host.trim().length > 0
    ? resolveBrowserHost(parsed.host.trim())
    : '127.0.0.1';

  return `http://${host}:${parsed.port}`;
}
