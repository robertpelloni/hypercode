export type SecurityLevelFilter = 'ALL' | 'INFO' | 'WARN' | 'ERROR';

export interface SecurityAuditLogEntry {
    timestamp: number;
    action: string;
    params: unknown;
    level: 'INFO' | 'WARN' | 'ERROR';
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asFiniteTimestamp(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? value
        : Date.now();
}

function asTrimmedString(value: unknown, fallback: string): string {
    if (typeof value !== 'string') {
        return fallback;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeLogLevel(value: unknown): SecurityAuditLogEntry['level'] {
    const normalized = asTrimmedString(value, 'INFO').toUpperCase();
    if (normalized === 'WARN' || normalized === 'ERROR') {
        return normalized;
    }

    return 'INFO';
}

function safeParamsText(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }

    try {
        return JSON.stringify(value ?? {});
    } catch {
        return '[unserializable params]';
    }
}

export function normalizeSecurityAuditLogs(payload: unknown): SecurityAuditLogEntry[] {
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload.map((entry, index) => {
        const log = asRecord(entry);
        return {
            timestamp: asFiniteTimestamp(log.timestamp),
            action: asTrimmedString(log.action, `unknown.action.${index + 1}`),
            params: log.params ?? null,
            level: normalizeLogLevel(log.level),
        };
    });
}

export function filterSecurityAuditLogs(
    logs: SecurityAuditLogEntry[],
    levelFilter: SecurityLevelFilter,
    searchTerm: string,
): SecurityAuditLogEntry[] {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return logs.filter((log) => {
        const levelMatch = levelFilter === 'ALL' || log.level === levelFilter;
        if (!levelMatch) {
            return false;
        }

        if (!normalizedSearch) {
            return true;
        }

        const action = log.action.toLowerCase();
        const paramsText = safeParamsText(log.params).toLowerCase();
        return action.includes(normalizedSearch) || paramsText.includes(normalizedSearch);
    });
}

export type SecurityAutonomyLevel = 'low' | 'medium' | 'high';

export function normalizeSecurityAutonomyLevel(payload: unknown): SecurityAutonomyLevel {
    if (payload === 'medium' || payload === 'high') {
        return payload;
    }

    return 'low';
}
