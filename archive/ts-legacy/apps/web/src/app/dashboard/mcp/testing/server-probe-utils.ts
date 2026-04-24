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
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/testing/server-probe-utils.ts
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/testing/server-probe-utils.ts
            label: 'HyperCode router',
            description: 'Simulate a client hitting HyperCode’s aggregated MCP surface.',
=======
            label: 'borg router',
            description: 'Simulate a client hitting borg’s aggregated MCP surface.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/testing/server-probe-utils.ts
=======
            label: 'Borg router',
            description: 'Simulate a client hitting Borg’s aggregated MCP surface.',
>>>>>>> origin/rewrite/main-sanitized:apps/web/src/app/dashboard/mcp/testing/server-probe-utils.ts
        },
        ...sortedServers.map((server) => ({
            id: `server:${server.name}`,
            kind: 'server' as const,
            label: server.name,
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/testing/server-probe-utils.ts
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/testing/server-probe-utils.ts
            description: 'Probe the downstream server directly without going through the HyperCode router.',
=======
            description: 'Probe the downstream server directly without going through the borg router.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/testing/server-probe-utils.ts
=======
            description: 'Probe the downstream server directly without going through the Borg router.',
>>>>>>> origin/rewrite/main-sanitized:apps/web/src/app/dashboard/mcp/testing/server-probe-utils.ts
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