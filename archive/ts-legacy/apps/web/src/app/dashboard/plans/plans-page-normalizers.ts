export type PlanDiffStatus = 'pending' | 'approved' | 'rejected';

export interface PlanDiffRow {
    id: string;
    filePath: string;
    status: PlanDiffStatus;
    proposedContent: string;
}

export interface PlanCheckpointRow {
    id: string;
    name: string;
    timestamp: string;
    description?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function normalizeDiffStatus(value: unknown): PlanDiffStatus {
    if (value === 'approved' || value === 'rejected' || value === 'pending') {
        return value;
    }

    return 'pending';
}

export function normalizePlanDiffs(payload: unknown): PlanDiffRow[] {
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload.reduce<PlanDiffRow[]>((acc, item, index) => {
        if (!isObject(item)) {
            return acc;
        }

        const rawId = typeof item.id === 'string' ? item.id.trim() : '';
        const rawFilePath = typeof item.filePath === 'string' ? item.filePath.trim() : '';

        acc.push({
            id: rawId.length > 0 ? rawId : `diff-${index}`,
            filePath: rawFilePath.length > 0 ? rawFilePath : '(unknown file)',
            status: normalizeDiffStatus(item.status),
            proposedContent: typeof item.proposedContent === 'string' ? item.proposedContent : '',
        });

        return acc;
    }, []);
}

export function normalizePlanCheckpoints(payload: unknown): PlanCheckpointRow[] {
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload.reduce<PlanCheckpointRow[]>((acc, item, index) => {
        if (!isObject(item)) {
            return acc;
        }

        const rawId = typeof item.id === 'string' ? item.id.trim() : '';
        const rawName = typeof item.name === 'string' ? item.name.trim() : '';
        const rawTimestamp = typeof item.timestamp === 'string' ? item.timestamp.trim() : '';
        const rawDescription = typeof item.description === 'string' ? item.description.trim() : undefined;

        acc.push({
            id: rawId.length > 0 ? rawId : `checkpoint-${index}`,
            name: rawName.length > 0 ? rawName : `Checkpoint ${index + 1}`,
            timestamp: rawTimestamp,
            description: rawDescription,
        });

        return acc;
    }, []);
}