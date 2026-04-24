import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

<<<<<<<< HEAD:archive/ts-legacy/packages/core/src/lib/hypercode-orchestrator.ts
type HyperCodeLockRecord = {
========
type BorgLockRecord = {
>>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:archive/ts-legacy/packages/core/src/lib/borg-orchestrator.ts
    port?: number;
    host?: string;
};

type OrchestratorEnv = Record<string, string | undefined>;

function normalizeBaseURL(value?: string): string | null {
    const trimmed = value?.trim();
    if (!trimmed) {
        return null;
    }

    const withoutTrailingSlash = trimmed.replace(/\/$/, '');
    return withoutTrailingSlash.endsWith('/trpc')
        ? withoutTrailingSlash.slice(0, -5)
        : withoutTrailingSlash;
}

function resolveBrowserHost(host: string): string {
    return host === '0.0.0.0' || host === '::' || host === '[::]'
        ? '127.0.0.1'
        : host;
}

<<<<<<<< HEAD:archive/ts-legacy/packages/core/src/lib/hypercode-orchestrator.ts
export function resolveHyperCodeConfigDir(env: OrchestratorEnv = process.env): string {
    const configuredDir = env.HYPERCODE_CONFIG_DIR?.trim();
========
export function resolveBorgConfigDir(env: OrchestratorEnv = process.env): string {
    const configuredDir = env.BORG_CONFIG_DIR?.trim();
>>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:archive/ts-legacy/packages/core/src/lib/borg-orchestrator.ts
    if (configuredDir) {
        return configuredDir;
    }

<<<<<<<< HEAD:archive/ts-legacy/packages/core/src/lib/hypercode-orchestrator.ts
    return path.join(os.homedir(), '.hypercode');
}

export function resolveHyperCodeLockPath(env: OrchestratorEnv = process.env): string {
    return path.join(resolveHyperCodeConfigDir(env), 'lock');
}

export function resolveLockedHyperCodeBase(env: OrchestratorEnv = process.env): string | null {
    const lockPath = resolveHyperCodeLockPath(env);
========
    return path.join(os.homedir(), '.borg');
}

export function resolveBorgLockPath(env: OrchestratorEnv = process.env): string {
    return path.join(resolveBorgConfigDir(env), 'lock');
}

export function resolveLockedBorgBase(env: OrchestratorEnv = process.env): string | null {
    const lockPath = resolveBorgLockPath(env);
>>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:archive/ts-legacy/packages/core/src/lib/borg-orchestrator.ts
    if (!existsSync(lockPath)) {
        return null;
    }

    try {
<<<<<<<< HEAD:archive/ts-legacy/packages/core/src/lib/hypercode-orchestrator.ts
        const parsed = JSON.parse(readFileSync(lockPath, 'utf8')) as HyperCodeLockRecord;
========
        const parsed = JSON.parse(readFileSync(lockPath, 'utf8')) as BorgLockRecord;
>>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:archive/ts-legacy/packages/core/src/lib/borg-orchestrator.ts
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

export function resolveOrchestratorBase(env: OrchestratorEnv = process.env): string | null {
<<<<<<<< HEAD:archive/ts-legacy/packages/core/src/lib/hypercode-orchestrator.ts
    return normalizeBaseURL(env.HYPERCODE_ORCHESTRATOR_URL)
        ?? normalizeBaseURL(env.HYPERCODE_TRPC_UPSTREAM)
        ?? resolveLockedHyperCodeBase(env)
        ?? normalizeBaseURL(env.NEXT_PUBLIC_HYPERCODE_ORCHESTRATOR_URL)
========
    return normalizeBaseURL(env.BORG_ORCHESTRATOR_URL)
        ?? normalizeBaseURL(env.BORG_TRPC_UPSTREAM)
        ?? resolveLockedBorgBase(env)
        ?? normalizeBaseURL(env.NEXT_PUBLIC_BORG_ORCHESTRATOR_URL)
>>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:archive/ts-legacy/packages/core/src/lib/borg-orchestrator.ts
        ?? normalizeBaseURL(env.NEXT_PUBLIC_AUTOPILOT_URL);
}
