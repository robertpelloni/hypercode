import { describe, expect, it } from 'vitest';

import { buildDashboardServerRecords, buildServerToolActionLinks, getBulkMetadataTargetUuids, getManagedServerDiscoverySummary, hasStaleReadyMetadata, isLocalCompatMetadataSource } from './mcp-dashboard-utils';

describe('getManagedServerDiscoverySummary', () => {
    it('counts ready, unresolved, and never-loaded managed servers', () => {
        expect(getManagedServerDiscoverySummary([
            {
                uuid: 'alpha',
                name: 'alpha',
                _meta: {
                    status: 'ready',
                    metadataSource: 'local-binary',
                    toolCount: 0,
                    lastSuccessfulBinaryLoadAt: '2026-03-10T00:00:00.000Z',
                },
            },
            {
                uuid: 'beta',
                name: 'beta',
                _meta: {
                    status: 'failed',
                    metadataSource: 'remote-cache',
                },
            },
            {
                uuid: 'gamma',
                name: 'gamma',
                _meta: null,
            },
        ])).toEqual({
            totalCount: 3,
            readyCount: 1,
            unresolvedCount: 2,
            staleReadyCount: 1,
            repairableCount: 3,
            neverLoadedCount: 2,
            localCompatCount: 1,
        });
    });
});

describe('hasStaleReadyMetadata', () => {
    it('flags ready metadata with zero cached tools as stale', () => {
        expect(hasStaleReadyMetadata({
            name: 'alpha',
            _meta: {
                status: 'ready',
                toolCount: 0,
            },
        })).toBe(true);

        expect(hasStaleReadyMetadata({
            name: 'beta',
            _meta: {
                status: 'ready',
                toolCount: 4,
            },
        })).toBe(false);
    });
});

describe('isLocalCompatMetadataSource', () => {
    it('detects local compat-managed metadata sources', () => {
        expect(isLocalCompatMetadataSource('local-config-fallback')).toBe(true);
        expect(isLocalCompatMetadataSource('local-binary')).toBe(true);
        expect(isLocalCompatMetadataSource('remote-cache')).toBe(false);
        expect(isLocalCompatMetadataSource(undefined)).toBe(false);
    });
});

describe('getBulkMetadataTargetUuids', () => {
    const servers = [
        {
            uuid: 'alpha',
            name: 'alpha',
            _meta: {
                status: 'ready',
                toolCount: 0,
            },
        },
        {
            uuid: 'beta',
            name: 'beta',
            _meta: {
                status: 'pending',
            },
        },
        {
            uuid: 'gamma',
            name: 'gamma',
            _meta: {
                status: 'failed',
            },
        },
        {
            name: 'delta',
            _meta: {
                status: 'failed',
            },
        },
    ];

    it('returns only unresolved servers for unresolved mode', () => {
        expect(getBulkMetadataTargetUuids(servers, 'unresolved')).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('returns every managed server uuid for all mode', () => {
        expect(getBulkMetadataTargetUuids(servers, 'all')).toEqual(['alpha', 'beta', 'gamma']);
    });
});

describe('buildServerToolActionLinks', () => {
    it('builds encoded inspector and logs links for a server-scoped operator workflow', () => {
        expect(buildServerToolActionLinks('github tools')).toEqual({
            inspectToolsHref: '/dashboard/mcp/inspector?server=github%20tools',
            editToolsHref: '/dashboard/mcp/inspector?server=github%20tools&mode=edit-tools',
            logsHref: '/dashboard/mcp/logs?server=github%20tools',
        });
    });
});

describe('buildDashboardServerRecords', () => {
    it('preserves managed uuids while matching runtime records with normalized names', () => {
        expect(buildDashboardServerRecords([
            {
                name: ' Github ',
                status: 'connected',
                toolCount: 12,
                config: {
                    command: 'npx',
                    args: ['-y', 'github-mcp'],
                    env: ['TOKEN'],
                },
            },
        ], [
            {
                uuid: 'server-1',
                name: 'github',
                command: 'node',
                args: ['dist/index.js'],
                env: {},
                _meta: {
                    status: 'ready',
                    metadataSource: 'binary',
                    toolCount: 12,
                    lastSuccessfulBinaryLoadAt: '2026-03-11T00:00:00.000Z',
                },
            },
        ])).toEqual([
            {
                uuid: 'server-1',
                name: 'github',
                status: 'connected',
                toolCount: 12,
                runtimeState: 'connected',
                warmupState: 'idle',
                runtimeConnected: true,
                advertisedToolCount: undefined,
                advertisedSource: undefined,
                lastConnectedAt: null,
                lastError: null,
                metadataStatus: 'ready',
                metadataSource: 'binary',
                metadataToolCount: 12,
                lastSuccessfulBinaryLoadAt: '2026-03-11T00:00:00.000Z',
                always_on: undefined,
                source_published_server_uuid: null,
                config: {
                    command: 'npx',
                    args: ['-y', 'github-mcp'],
                    env: ['TOKEN'],
                },
            },
        ]);
    });

    it('appends runtime-only servers after managed entries', () => {
        expect(buildDashboardServerRecords([
            {
                name: 'runtime-only',
                status: 'cached',
                toolCount: 3,
                config: {
                    command: 'uvx',
                    args: ['runtime-only'],
                    env: [],
                },
            },
        ], [])).toEqual([
            {
                name: 'runtime-only',
                status: 'cached',
                toolCount: 3,
                runtimeState: 'cached',
                warmupState: 'idle',
                runtimeConnected: false,
                advertisedToolCount: undefined,
                advertisedSource: undefined,
                lastConnectedAt: null,
                lastError: null,
                config: {
                    command: 'uvx',
                    args: ['runtime-only'],
                    env: [],
                },
            },
        ]);
    });
});