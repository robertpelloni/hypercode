type SupportedClient = 'claude-desktop' | 'cursor' | 'vscode';

export interface ConfigItemRow {
    key: string;
    value: string;
    description?: string;
}

export interface SyncTargetRow {
    client: SupportedClient;
    path: string;
    candidates: string[];
    exists: boolean;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function normalizeClient(value: unknown, index: number): SupportedClient {
    if (value === 'claude-desktop' || value === 'cursor' || value === 'vscode') {
        return value;
    }

    return index % 3 === 1 ? 'cursor' : index % 3 === 2 ? 'vscode' : 'claude-desktop';
}

export function normalizeConfigItems(payload: unknown): ConfigItemRow[] {
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload.reduce<ConfigItemRow[]>((acc, item, index) => {
        if (!isObject(item)) {
            return acc;
        }

        const rawKey = typeof item.key === 'string' ? item.key.trim() : '';
        const rawValue = typeof item.value === 'string' ? item.value : '';
        const rawDescription = typeof item.description === 'string' ? item.description.trim() : undefined;

        acc.push({
            key: rawKey.length > 0 ? rawKey : `config-${index}`,
            value: rawValue,
            description: rawDescription,
        });

        return acc;
    }, []);
}

export function normalizeSyncTargets(payload: unknown): SyncTargetRow[] {
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload.reduce<SyncTargetRow[]>((acc, item, index) => {
        if (!isObject(item)) {
            return acc;
        }

        const rawPath = typeof item.path === 'string' ? item.path.trim() : '';
        const rawCandidates = Array.isArray(item.candidates)
            ? item.candidates.filter((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0).map((candidate) => candidate.trim())
            : [];

        acc.push({
            client: normalizeClient(item.client, index),
            path: rawPath.length > 0 ? rawPath : '(unknown path)',
            candidates: rawCandidates,
            exists: item.exists === true,
        });

        return acc;
    }, []);
}