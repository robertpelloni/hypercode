import { describe, expect, it } from 'vitest';

import { buildServerProbeTargets, filterToolsForProbeTarget } from './server-probe-utils';

describe('server probe helpers', () => {
    it('prepends the HyperCode router before sorted downstream targets', () => {
        expect(buildServerProbeTargets([
            { name: 'zeta', toolCount: 2, status: 'ready' },
            { name: 'alpha', toolCount: 4, status: 'connected' },
        ])).toEqual([
            {
                id: 'router',
                kind: 'router',
                label: 'HyperCode router',
                description: 'Simulate a client hitting HyperCode’s aggregated MCP surface.',
            },
            {
                id: 'server:alpha',
                kind: 'server',
                label: 'alpha',
                description: 'Probe the downstream server directly without going through the HyperCode router.',
                serverName: 'alpha',
                toolCount: 4,
                status: 'connected',
            },
            {
                id: 'server:zeta',
                kind: 'server',
                label: 'zeta',
                description: 'Probe the downstream server directly without going through the HyperCode router.',
                serverName: 'zeta',
                toolCount: 2,
                status: 'ready',
            },
        ]);
    });

    it('filters tool choices to the selected downstream server and keeps router targets broad', () => {
        const tools = [
            { name: 'github__search', server: 'github' },
            { name: 'memory__remember', server: 'memory' },
        ];

        expect(filterToolsForProbeTarget(tools, {
            id: 'router',
            kind: 'router',
            label: 'HyperCode router',
            description: 'router',
        })).toEqual(tools);

        expect(filterToolsForProbeTarget(tools, {
            id: 'server:github',
            kind: 'server',
            label: 'github',
            description: 'downstream',
            serverName: 'github',
        })).toEqual([
            { name: 'github__search', server: 'github' },
        ]);
    });
});