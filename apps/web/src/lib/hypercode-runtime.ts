import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

type BorgLockRecord = {
  port?: number;
  host?: string;
};

function resolveBrowserHost(host: string): string {
  return host === '0.0.0.0' || host === '::' || host === '[::]'
    ? '127.0.0.1'
    : host;
}

export function resolveBorgConfigDir(): string {
  const configuredDir = process.env.BORG_CONFIG_DIR?.trim();
  if (configuredDir) {
    return configuredDir;
  }

  return path.join(os.homedir(), '.hypercode');
}

export function resolveBorgLockPath(): string {
  return path.join(resolveBorgConfigDir(), 'lock');
}

export function resolveLockedBorgBase(): string | null {
  const lockPath = resolveBorgLockPath();
  if (!existsSync(lockPath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(lockPath, 'utf8')) as BorgLockRecord;
    if (!parsed || typeof parsed.port !== 'number' || parsed.port <= 0) {
      return null;
    }

    const host = typeof parsed.host === 'string' && parsed.host.trim().length > 0
      ? resolveBrowserHost(parsed.host.trim())
      : '127.0.0.1';

    return `http://${host}:${parsed.port}`;
  } catch {
    return null;
  }
}
