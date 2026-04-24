interface RecordLike {
    [key: string]: unknown;
}

export interface AuditLogRow {
    id: string;
    timestamp: string;
    action: string;
    actor: string | null;
    resource: string;
    details: unknown;
}

function asRecord(value: unknown): RecordLike | null {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as RecordLike)
        : null;
}

function toStringValue(value: unknown, fallback = ''): string {
    return typeof value === 'string' && value.trim().length > 0
        ? value.trim()
        : fallback;
}

export function normalizeAuditLogs(logs: unknown): AuditLogRow[] {
    if (!Array.isArray(logs)) {
        return [];
    }

    return logs.reduce<AuditLogRow[]>((acc, entry, index) => {
        const row = asRecord(entry);
        if (!row) {
            return acc;
        }

        const action = toStringValue(row.action, 'unknown.action');
        const resource = toStringValue(row.resource, 'unknown.resource');
        const timestamp = toStringValue(row.timestamp, new Date(0).toISOString());
        const id = toStringValue(row.id, `${action}-${index + 1}`);
        const actorValue = toStringValue(row.actor);

        acc.push({
            id,
            timestamp,
            action,
            actor: actorValue || null,
            resource,
            details: row.details ?? null,
        });

        return acc;
    }, []);
}
