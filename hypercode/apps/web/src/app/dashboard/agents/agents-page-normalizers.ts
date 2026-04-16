export interface AgentsDashboardStatus {
    agents: string[];
    memoryInitialized: boolean;
    uptimeSeconds: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function normalizeAgentsDashboardStatus(payload: unknown): AgentsDashboardStatus {
    if (!isObject(payload)) {
        return {
            agents: [],
            memoryInitialized: false,
            uptimeSeconds: 0,
        };
    }

    const agents = Array.isArray(payload.agents)
        ? payload.agents.filter((agent): agent is string => typeof agent === 'string' && agent.trim().length > 0).map((agent) => agent.trim())
        : [];

    const uptimeSeconds = typeof payload.uptime === 'number' && Number.isFinite(payload.uptime)
        ? payload.uptime
        : 0;

    return {
        agents,
        memoryInitialized: payload.memoryInitialized === true,
        uptimeSeconds,
    };
}