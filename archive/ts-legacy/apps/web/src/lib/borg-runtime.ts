import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

<<<<<<<< HEAD:archive/ts-legacy/apps/web/src/lib/hypercode-runtime.ts
type HyperCodeLockRecord = {
========
type BorgLockRecord = {
>>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:archive/ts-legacy/apps/web/src/lib/borg-runtime.ts
  port?: number;
  host?: string;
};

function resolveBrowserHost(host: string): string {
  return host === '0.0.0.0' || host === '::' || host === '[::]'
    ? '127.0.0.1'
    : host;
}

<<<<<<<< HEAD:archive/ts-legacy/apps/web/src/lib/hypercode-runtime.ts
export function resolveHyperCodeConfigDir(): string {
  const configuredDir = process.env.HYPERCODE_CONFIG_DIR?.trim() || process.env.HYPERCODE_CONFIG_DIR?.trim();
========
export function resolveBorgConfigDir(): string {
  const configuredDir = process.env.BORG_CONFIG_DIR?.trim();
>>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:archive/ts-legacy/apps/web/src/lib/borg-runtime.ts
  if (configuredDir) {
    return configuredDir;
  }

<<<<<<<< HEAD:archive/ts-legacy/apps/web/src/lib/hypercode-runtime.ts
  return path.join(os.homedir(), '.hypercode');
}

export function resolveHyperCodeLockPath(): string {
  return path.join(resolveHyperCodeConfigDir(), 'lock');
}

export function resolveLockedHyperCodeBase(): string | null {
  const lockPath = resolveHyperCodeLockPath();
========
  return path.join(os.homedir(), '.borg');
}

export function resolveBorgLockPath(): string {
  return path.join(resolveBorgConfigDir(), 'lock');
}

export function resolveLockedBorgBase(): string | null {
  const lockPath = resolveBorgLockPath();
>>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:archive/ts-legacy/apps/web/src/lib/borg-runtime.ts
  if (!existsSync(lockPath)) {
    return null;
  }

  try {
<<<<<<<< HEAD:archive/ts-legacy/apps/web/src/lib/hypercode-runtime.ts
    const parsed = JSON.parse(readFileSync(lockPath, 'utf8')) as HyperCodeLockRecord;
========
    const parsed = JSON.parse(readFileSync(lockPath, 'utf8')) as BorgLockRecord;
>>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:archive/ts-legacy/apps/web/src/lib/borg-runtime.ts
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
