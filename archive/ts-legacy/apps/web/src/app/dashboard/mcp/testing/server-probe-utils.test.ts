import { describe, expect, it } from 'vitest';

import { buildServerProbeTargets, filterToolsForProbeTarget } from './server-probe-utils';

describe('server probe helpers', () => {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/testing/server-probe-utils.test.ts
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/testing/server-probe-utils.test.ts
    it('prepends the HyperCode router before sorted downstream targets', () => {
=======
    it('prepends the borg router before sorted downstream targets', () => {
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/testing/server-probe-utils.test.ts
=======
    it('prepends the Borg router before sorted downstream targets', () => {
>>>>>>> origin/rewrite/main-sanitized:apps/web/src/app/dashboard/mcp/testing/server-probe-utils.test.ts
        expect(buildServerProbeTargets([
            { name: 'zeta', toolCount: 2, status: 'ready' },
            { name: 'alpha', toolCount: 4, status: 'connected' },
        ])).toEqual([
            {
                id: 'router',
                kind: 'router',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/testing/server-probe-utils.test.ts
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/testing/server-probe-utils.test.ts
                label: 'HyperCode router',
                description: 'Simulate a client hitting HyperCode’s aggregated MCP surface.',
=======
                label: 'borg router',
                description: 'Simulate a client hitting borg’s aggregated MCP surface.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/testing/server-probe-utils.test.ts
=======
                label: 'Borg router',
                description: 'Simulate a client hitting Borg’s aggregated MCP surface.',
>>>>>>> origin/rewrite/main-sanitized:apps/web/src/app/dashboard/mcp/testing/server-probe-utils.test.ts
            },
            {
                id: 'server:alpha',
                kind: 'server',
                label: 'alpha',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/testing/server-probe-utils.test.ts
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/testing/server-probe-utils.test.ts
                description: 'Probe the downstream server directly without going through the HyperCode router.',
=======
                description: 'Probe the downstream server directly without going through the borg router.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/testing/server-probe-utils.test.ts
=======
                description: 'Probe the downstream server directly without going through the Borg router.',
>>>>>>> origin/rewrite/main-sanitized:apps/web/src/app/dashboard/mcp/testing/server-probe-utils.test.ts
                serverName: 'alpha',
                toolCount: 4,
                status: 'connected',
            },
            {
                id: 'server:zeta',
                kind: 'server',
                label: 'zeta',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/testing/server-probe-utils.test.ts
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/testing/server-probe-utils.test.ts
                description: 'Probe the downstream server directly without going through the HyperCode router.',
=======
                description: 'Probe the downstream server directly without going through the borg router.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/testing/server-probe-utils.test.ts
=======
                description: 'Probe the downstream server directly without going through the Borg router.',
>>>>>>> origin/rewrite/main-sanitized:apps/web/src/app/dashboard/mcp/testing/server-probe-utils.test.ts
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
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/testing/server-probe-utils.test.ts
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/testing/server-probe-utils.test.ts
            label: 'HyperCode router',
=======
            label: 'borg router',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/testing/server-probe-utils.test.ts
=======
            label: 'Borg router',
>>>>>>> origin/rewrite/main-sanitized:apps/web/src/app/dashboard/mcp/testing/server-probe-utils.test.ts
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