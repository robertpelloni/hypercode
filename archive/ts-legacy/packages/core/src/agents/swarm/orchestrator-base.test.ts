import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { resolveSwarmOrchestratorBase } from './orchestrator-base.js';

const originalEnv = {
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/agents/swarm/orchestrator-base.test.ts
    HYPERCODE_CONFIG_DIR: process.env.HYPERCODE_CONFIG_DIR,
    HYPERCODE_ORCHESTRATOR_URL: process.env.HYPERCODE_ORCHESTRATOR_URL,
    HYPERCODE_TRPC_UPSTREAM: process.env.HYPERCODE_TRPC_UPSTREAM,
    NEXT_PUBLIC_HYPERCODE_ORCHESTRATOR_URL: process.env.NEXT_PUBLIC_HYPERCODE_ORCHESTRATOR_URL,
=======
    BORG_CONFIG_DIR: process.env.BORG_CONFIG_DIR,
    BORG_ORCHESTRATOR_URL: process.env.BORG_ORCHESTRATOR_URL,
    BORG_TRPC_UPSTREAM: process.env.BORG_TRPC_UPSTREAM,
    NEXT_PUBLIC_BORG_ORCHESTRATOR_URL: process.env.NEXT_PUBLIC_BORG_ORCHESTRATOR_URL,
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/agents/swarm/orchestrator-base.test.ts
    NEXT_PUBLIC_AUTOPILOT_URL: process.env.NEXT_PUBLIC_AUTOPILOT_URL,
};

afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
});

describe('resolveSwarmOrchestratorBase', () => {
    it('preserves an explicit swarm base override', () => {
        expect(resolveSwarmOrchestratorBase('http://127.0.0.1:5001/')).toBe('http://127.0.0.1:5001');
    });

<<<<<<< HEAD:archive/ts-legacy/packages/core/src/agents/swarm/orchestrator-base.test.ts
    it('reuses the live hypercode lock when no explicit override is supplied', () => {
        const configDir = mkdtempSync(path.join(os.tmpdir(), 'swarm-lock-'));
        process.env.HYPERCODE_CONFIG_DIR = configDir;
=======
    it('reuses the live borg lock when no explicit override is supplied', () => {
        const configDir = mkdtempSync(path.join(os.tmpdir(), 'swarm-lock-'));
        process.env.BORG_CONFIG_DIR = configDir;
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/agents/swarm/orchestrator-base.test.ts
        writeFileSync(path.join(configDir, 'lock'), JSON.stringify({ host: '0.0.0.0', port: 4321 }));

        expect(resolveSwarmOrchestratorBase()).toBe('http://127.0.0.1:4321');
    });

    it('returns null when no orchestrator base is configured', () => {
        const configDir = mkdtempSync(path.join(os.tmpdir(), 'swarm-lock-empty-'));
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/agents/swarm/orchestrator-base.test.ts
        process.env.HYPERCODE_CONFIG_DIR = configDir;
        delete process.env.HYPERCODE_ORCHESTRATOR_URL;
        delete process.env.HYPERCODE_TRPC_UPSTREAM;
        delete process.env.NEXT_PUBLIC_HYPERCODE_ORCHESTRATOR_URL;
=======
        process.env.BORG_CONFIG_DIR = configDir;
        delete process.env.BORG_ORCHESTRATOR_URL;
        delete process.env.BORG_TRPC_UPSTREAM;
        delete process.env.NEXT_PUBLIC_BORG_ORCHESTRATOR_URL;
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/agents/swarm/orchestrator-base.test.ts
        delete process.env.NEXT_PUBLIC_AUTOPILOT_URL;

        expect(resolveSwarmOrchestratorBase()).toBeNull();
    });
});
