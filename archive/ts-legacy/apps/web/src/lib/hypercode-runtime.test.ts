import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { readLocalStartupProvenance, resolveLockedHypercodeBase } from './hypercode-runtime';

const tempDirs: string[] = [];
const originalConfigDir = process.env.HYPERCODE_CONFIG_DIR;

afterEach(() => {
  process.env.HYPERCODE_CONFIG_DIR = originalConfigDir;
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

function createTempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'hypercode-web-runtime-'));
  tempDirs.push(dir);
  return dir;
}

describe('hypercode runtime lock helpers', () => {
  it('derives startup port provenance from legacy lock files', () => {
    const configDir = createTempDir();
    process.env.HYPERCODE_CONFIG_DIR = configDir;
    writeFileSync(path.join(configDir, 'lock'), JSON.stringify({
      instanceId: 'hypercode-legacy',
      pid: 1234,
      port: 4555,
      host: '0.0.0.0',
      createdAt: '2026-04-06T09:00:00.000Z',
    }), 'utf8');

    expect(readLocalStartupProvenance()).toEqual({
      requestedPort: 4555,
      activePort: 4555,
      portDecision: 'derived from lock record',
      portReason: 'Detailed startup port provenance was unavailable; using the current control-plane lock port.',
      updatedAt: '2026-04-06T09:00:00.000Z',
    });
    expect(resolveLockedHypercodeBase()).toBe('http://127.0.0.1:4555');
  });
});
