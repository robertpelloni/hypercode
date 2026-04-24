export type ExperimentStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type ExperimentWinner = 'A' | 'B' | 'TIE' | null;

export interface EvolutionMutationRow {
    id: string;
    timestamp: string;
    reasoning: string;
    originalPrompt: string;
    mutatedPrompt: string;
}

export interface EvolutionExperimentRow {
    id: string;
    status: ExperimentStatus;
    winner: ExperimentWinner;
    task: string;
    judgeReasoning: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function normalizeExperimentStatus(value: unknown): ExperimentStatus {
    return value === 'PENDING' || value === 'RUNNING' || value === 'COMPLETED' || value === 'FAILED'
        ? value
        : 'PENDING';
}

function normalizeWinner(value: unknown): ExperimentWinner {
    return value === 'A' || value === 'B' || value === 'TIE' ? value : null;
}

export function normalizeEvolutionMutations(payload: unknown): EvolutionMutationRow[] {
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload.reduce<EvolutionMutationRow[]>((acc, item, index) => {
        if (!isObject(item)) {
            return acc;
        }

        const rawId = typeof item.id === 'string' ? item.id.trim() : '';
        const rawTimestamp = typeof item.timestamp === 'string' ? item.timestamp.trim() : '';

        acc.push({
            id: rawId.length > 0 ? rawId : `mutation-${index}`,
            timestamp: rawTimestamp,
            reasoning: typeof item.reasoning === 'string' ? item.reasoning : '',
            originalPrompt: typeof item.originalPrompt === 'string' ? item.originalPrompt : '',
            mutatedPrompt: typeof item.mutatedPrompt === 'string' ? item.mutatedPrompt : '',
        });

        return acc;
    }, []);
}

export function normalizeEvolutionExperiments(payload: unknown): EvolutionExperimentRow[] {
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload.reduce<EvolutionExperimentRow[]>((acc, item, index) => {
        if (!isObject(item)) {
            return acc;
        }

        const rawId = typeof item.id === 'string' ? item.id.trim() : '';

        acc.push({
            id: rawId.length > 0 ? rawId : `experiment-${index}`,
            status: normalizeExperimentStatus(item.status),
            winner: normalizeWinner(item.winner),
            task: typeof item.task === 'string' ? item.task : '',
            judgeReasoning: typeof item.judgeReasoning === 'string' ? item.judgeReasoning : '',
        });

        return acc;
    }, []);
}