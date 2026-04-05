import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

export interface HypercodeStartupProvenance {
    requestedRuntime?: string;
    activeRuntime?: string;
    launchMode?: string;
    dashboardMode?: string;
    installDecision?: string;
    installReason?: string;
    buildDecision?: string;
    buildReason?: string;
    updatedAt?: string;
}

interface HypercodeStartLockRecord {
    instanceId: string;
    pid: number;
    port: number;
    host: string;
    createdAt: string;
    startup?: HypercodeStartupProvenance;
}

function resolveDataDir(dataDir: string, homeDirectory: string = homedir()): string {
    if (dataDir === '~') {
        return homeDirectory;
    }

    if (dataDir.startsWith('~/') || dataDir.startsWith('~\\') || dataDir.startsWith(`~${path.sep}`)) {
        return path.resolve(homeDirectory, dataDir.slice(2));
    }

    return path.isAbsolute(dataDir) ? dataDir : path.resolve(dataDir);
}

function readStartLockRecord(dataDir: string): HypercodeStartLockRecord | null {
    const lockPath = path.join(resolveDataDir(dataDir), 'lock');
    if (!existsSync(lockPath)) {
        return null;
    }

    try {
        const parsed = JSON.parse(readFileSync(lockPath, 'utf8')) as Partial<HypercodeStartLockRecord>;
        if (
            typeof parsed.instanceId !== 'string'
            || typeof parsed.pid !== 'number'
            || typeof parsed.port !== 'number'
            || typeof parsed.host !== 'string'
            || typeof parsed.createdAt !== 'string'
        ) {
            return null;
        }

        return parsed as HypercodeStartLockRecord;
    } catch {
        return null;
    }
}

export function readLocalStartupProvenance(dataDir: string = process.env.HYPERCODE_DATA_DIR ?? '~/.hypercode'): HypercodeStartupProvenance | null {
    return readStartLockRecord(dataDir)?.startup ?? null;
}
