export interface DashboardEventRow {
    type: string;
    timestamp: number | null;
    source: string;
    dataPreview: string | null;
}

export interface DashboardSystemStatus {
    status: 'online' | 'offline';
    uptime: number;
    agents: string[];
}

export interface NormalizedDashboardEventsResult {
    data: DashboardEventRow[];
    invalid: boolean;
}

export interface NormalizedDashboardSystemStatusResult {
    data: DashboardSystemStatus;
    invalid: boolean;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function safePreview(value: unknown): string | null {
    if (typeof value === 'string') {
        return value;
    }

    if (value === undefined || value === null) {
        return null;
    }

    try {
        return JSON.stringify(value);
    } catch {
        return '[unserializable data]';
    }
}

function normalizeTimestamp(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
        const asNumber = Number(value);
        if (Number.isFinite(asNumber)) {
            return asNumber;
        }

        const asDate = Date.parse(value);
        return Number.isFinite(asDate) ? asDate : null;
    }

    return null;
}

export function normalizeDashboardEvents(payload: unknown): NormalizedDashboardEventsResult {
    if (!Array.isArray(payload)) {
        return { data: [], invalid: payload != null };
    }

    let invalid = false;
    const data = payload.reduce<DashboardEventRow[]>((acc, item, index) => {
        if (!isObject(item)) {
            invalid = true;
            return acc;
        }

        const rawType = typeof item.type === 'string' ? item.type.trim() : '';
        if (rawType.length === 0) {
            invalid = true;
        }
        const rawSource = typeof item.source === 'string' ? item.source.trim() : '';

        acc.push({
            type: rawType.length > 0 ? rawType : `unknown:${index}`,
            timestamp: normalizeTimestamp(item.timestamp),
            source: rawSource,
            dataPreview: safePreview(item.data),
        });

        return acc;
    }, []);

    return { data, invalid };
}

export function normalizeDashboardSystemStatus(payload: unknown): NormalizedDashboardSystemStatusResult {
    if (!isObject(payload)) {
        return {
            data: {
                status: 'offline',
                uptime: 0,
                agents: [],
            },
            invalid: payload != null,
        };
    }

    const status = payload.status === 'online' ? 'online' : 'offline';
    const uptime = typeof payload.uptime === 'number' && Number.isFinite(payload.uptime) ? payload.uptime : 0;
    const agents = Array.isArray(payload.agents)
        ? payload.agents.filter((agent): agent is string => typeof agent === 'string' && agent.trim().length > 0).map((agent) => agent.trim())
        : [];
    const invalid = (payload.status !== 'online' && payload.status !== 'offline')
        || !(typeof payload.uptime === 'number' && Number.isFinite(payload.uptime))
        || !Array.isArray(payload.agents);

    return {
        data: {
            status,
            uptime,
            agents,
        },
        invalid,
    };
}
