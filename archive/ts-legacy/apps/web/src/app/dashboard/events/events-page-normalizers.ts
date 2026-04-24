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

<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/events/events-page-normalizers.ts
export interface NormalizedDashboardEventsResult {
    data: DashboardEventRow[];
    invalid: boolean;
}

export interface NormalizedDashboardSystemStatusResult {
    data: DashboardSystemStatus;
    invalid: boolean;
}

=======
>>>>>>> origin/rewrite/main-sanitized:apps/web/src/app/dashboard/events/events-page-normalizers.ts
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

<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/events/events-page-normalizers.ts
export function normalizeDashboardEvents(payload: unknown): NormalizedDashboardEventsResult {
    if (!Array.isArray(payload)) {
        return { data: [], invalid: payload != null };
    }

    let invalid = false;
    const data = payload.reduce<DashboardEventRow[]>((acc, item, index) => {
        if (!isObject(item)) {
            invalid = true;
=======
export function normalizeDashboardEvents(payload: unknown): DashboardEventRow[] {
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload.reduce<DashboardEventRow[]>((acc, item, index) => {
        if (!isObject(item)) {
>>>>>>> origin/rewrite/main-sanitized:apps/web/src/app/dashboard/events/events-page-normalizers.ts
            return acc;
        }

        const rawType = typeof item.type === 'string' ? item.type.trim() : '';
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/events/events-page-normalizers.ts
        if (rawType.length === 0) {
            invalid = true;
        }
=======
>>>>>>> origin/rewrite/main-sanitized:apps/web/src/app/dashboard/events/events-page-normalizers.ts
        const rawSource = typeof item.source === 'string' ? item.source.trim() : '';

        acc.push({
            type: rawType.length > 0 ? rawType : `unknown:${index}`,
            timestamp: normalizeTimestamp(item.timestamp),
            source: rawSource,
            dataPreview: safePreview(item.data),
        });

        return acc;
    }, []);
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/events/events-page-normalizers.ts

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
=======
}

export function normalizeDashboardSystemStatus(payload: unknown): DashboardSystemStatus {
    if (!isObject(payload)) {
        return {
            status: 'offline',
            uptime: 0,
            agents: [],
>>>>>>> origin/rewrite/main-sanitized:apps/web/src/app/dashboard/events/events-page-normalizers.ts
        };
    }

    const status = payload.status === 'online' ? 'online' : 'offline';
    const uptime = typeof payload.uptime === 'number' && Number.isFinite(payload.uptime) ? payload.uptime : 0;
    const agents = Array.isArray(payload.agents)
        ? payload.agents.filter((agent): agent is string => typeof agent === 'string' && agent.trim().length > 0).map((agent) => agent.trim())
        : [];
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/events/events-page-normalizers.ts
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
=======

    return {
        status,
        uptime,
        agents,
    };
}
>>>>>>> origin/rewrite/main-sanitized:apps/web/src/app/dashboard/events/events-page-normalizers.ts
