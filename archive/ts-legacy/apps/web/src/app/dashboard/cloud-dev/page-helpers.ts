export interface HistoryCoverage {
    loaded: number;
    total: number;
    hasMore: boolean;
    remaining: number;
    label: string;
}

export interface CloudDevHistoryEntry {
    id: string;
    message?: string;
    content?: string;
    level?: string;
    role?: string;
    timestamp?: string;
}

export function getHistoryCoverage(options: {
    loadedCount: number;
    totalCount: number;
    label: string;
}): HistoryCoverage {
    const loaded = Math.max(0, options.loadedCount);
    const total = Math.max(0, options.totalCount);
    const hasMore = total > loaded;
    const remaining = hasMore ? total - loaded : 0;

    return {
        loaded,
        total,
        hasMore,
        remaining,
        label: `Showing ${loaded} of ${total} ${options.label}`,
    };
}

export function getLoadAllLimit(totalCount: number, maxLimit: number): number {
    return Math.max(1, Math.min(Math.max(0, totalCount), maxLimit));
}

function entryMatchesQuery(entry: CloudDevHistoryEntry, normalizedQuery: string): boolean {
    if (!normalizedQuery) return true;

    return [entry.message, entry.content, entry.level, entry.role, entry.timestamp]
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
}

export function filterHistoryEntries<T extends CloudDevHistoryEntry>(entries: T[], query: string): T[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return entries;

    return entries.filter((entry) => entryMatchesQuery(entry, normalizedQuery));
}
