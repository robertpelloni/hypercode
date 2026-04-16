export type SupervisorAutonomyLevel = 'low' | 'medium' | 'high';

export interface NormalizedSupervisorTask {
    id: string;
    assignedTo: string;
    status: string;
    description: string;
}

const asNonEmptyString = (value: unknown, fallback: string): string => {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
};

export const normalizeSupervisorPlan = (payload: unknown): NormalizedSupervisorTask[] => {
    if (!Array.isArray(payload)) return [];

    return payload.map((rawTask, index) => {
        const task = rawTask && typeof rawTask === 'object' ? (rawTask as Record<string, unknown>) : {};
        return {
            id: asNonEmptyString(task.id, `unknown:${index + 1}`),
            assignedTo: asNonEmptyString(task.assignedTo, 'unassigned'),
            status: asNonEmptyString(task.status, 'unknown'),
            description: asNonEmptyString(task.description, 'No description provided.'),
        };
    });
};

export const normalizeSupervisorAutonomyLevel = (payload: unknown): SupervisorAutonomyLevel => {
    const level = typeof payload === 'string'
        ? payload
        : payload && typeof payload === 'object' && 'level' in payload
            ? (payload as { level?: unknown }).level
            : undefined;

    return level === 'low' || level === 'medium' || level === 'high' ? level : 'low';
};
