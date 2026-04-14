export type ServerProbeTarget = {
    id: string;
    kind: 'router' | 'server';
    label: string;
    description: string;
    serverName?: string;
    toolCount?: number;
    status?: string;
};

type ProbeServerSummary = {
    name: string;
    status?: string;
    toolCount?: number;
};

type ProbeToolSummary = {
    name: string;
    server: string;
};

export function buildServerProbeTargets(servers: ProbeServerSummary[]): ServerProbeTarget[] {
    const sortedServers = [...servers].sort((left, right) => left.name.localeCompare(right.name));

    return [
        {
            id: 'router',
            kind: 'router',
            label: 'HyperCode router',
            description: 'Simulate a client hitting HyperCode’s aggregated MCP surface.',
        },
        ...sortedServers.map((server) => ({
            id: `server:${server.name}`,
            kind: 'server' as const,
            label: server.name,
            description: 'Probe the downstream server directly without going through the HyperCode router.',
            serverName: server.name,
            toolCount: server.toolCount ?? 0,
            status: server.status ?? 'unknown',
        })),
    ];
}

export function filterToolsForProbeTarget(tools: ProbeToolSummary[], target: ServerProbeTarget | null): ProbeToolSummary[] {
    if (!target || target.kind === 'router') {
        return tools;
    }

    return tools.filter((tool) => tool.server === target.serverName);
}