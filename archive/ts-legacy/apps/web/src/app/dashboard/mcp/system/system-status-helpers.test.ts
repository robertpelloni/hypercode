import { describe, expect, it } from 'vitest';

import type { DashboardStartupStatus } from '../../dashboard-home-view';
import { buildSystemComponentHealthRows, buildSystemEnvironmentRows, buildSystemStartupChecks, buildSystemStartupNotice, buildSystemStatusCards, formatUptimeSeconds } from './system-status-helpers';

type StartupCheckOverrides = {
    [Key in keyof DashboardStartupStatus['checks']]?: Partial<DashboardStartupStatus['checks'][Key]>;
};

function createStartupStatus(overrides?: StartupCheckOverrides): DashboardStartupStatus {
    return {
        status: 'running',
        ready: true,
        uptime: 42,
        runtime: {
            nodeEnv: 'test',
            platform: 'win32',
            version: '2.7.110',
        },
        checks: {
            mcpAggregator: {
                ready: true,
                liveReady: true,
                residentReady: true,
                serverCount: 0,
                connectedCount: 0,
                residentConnectedCount: 0,
                warmingServerCount: 0,
                failedWarmupServerCount: 0,
                initialization: {
                    inProgress: false,
                    initialized: true,
                    connectedClientCount: 0,
                    configuredServerCount: 0,
                },
                persistedServerCount: 0,
                persistedToolCount: 0,
                configuredServerCount: 0,
                advertisedServerCount: 0,
                advertisedToolCount: 0,
                advertisedAlwaysOnToolCount: 0,
                inventoryReady: true,
                ...overrides?.mcpAggregator,
            },
            configSync: {
                ready: true,
                status: {
                    inProgress: false,
                    lastCompletedAt: 1_700_000_000_000,
                    lastServerCount: 0,
                    lastToolCount: 0,
                },
                ...overrides?.configSync,
            },
            memory: {
                ready: true,
                initialized: true,
                agentMemory: true,
                ...overrides?.memory,
            },
            browser: {
                ready: true,
                active: false,
                pageCount: 0,
                ...overrides?.browser,
            },
            sessionSupervisor: {
                ready: true,
                sessionCount: 0,
                restore: {
                    restoredSessionCount: 0,
                    autoResumeCount: 0,
                },
                ...overrides?.sessionSupervisor,
            },
            extensionBridge: {
                ready: true,
                port: 3001,
                acceptingConnections: true,
                clientCount: 0,
                hasConnectedClients: false,
                ...overrides?.extensionBridge,
            },
            executionEnvironment: {
                ready: true,
                preferredShellLabel: 'PowerShell 7',
                shellCount: 2,
                verifiedShellCount: 2,
                toolCount: 5,
                verifiedToolCount: 5,
                harnessCount: 0,
                verifiedHarnessCount: 0,
                supportsPowerShell: true,
                supportsPosixShell: false,
                ...overrides?.executionEnvironment,
            },
            importedSessions: {
                totalSessions: 0,
                inlineTranscriptCount: 0,
                archivedTranscriptCount: 0,
                missingRetentionSummaryCount: 0,
                ...overrides?.importedSessions,
            },
        },
    };
}

const readyBrowserArtifacts = [
    { id: 'browser-extension-chromium', status: 'ready' as const },
    { id: 'browser-extension-firefox', status: 'ready' as const },
];

describe('system status startup helpers', () => {
    it('treats an empty but initialized router inventory as operational', () => {
        const checks = buildSystemStartupChecks(createStartupStatus());

        expect(checks[1]).toEqual({
            name: 'Resident MCP Runtime',
            status: 'Operational',
            latency: '0/0 servers',
            detail: 'No downstream servers configured · on-demand MCP launches are ready when needed',
        });
    });

    it('keeps router inventory pending until the router itself is ready', () => {
        const checks = buildSystemStartupChecks(createStartupStatus({
            mcpAggregator: {
                ready: false,
                liveReady: false,
                residentReady: false,
                inventoryReady: true,
                persistedServerCount: 2,
                persistedToolCount: 18,
                advertisedServerCount: 2,
                advertisedToolCount: 18,
                advertisedAlwaysOnServerCount: 1,
                warmingServerCount: 2,
                failedWarmupServerCount: 1,
            },
        }));

        expect(checks[0]).toEqual({
            name: 'Cached Inventory',
            status: 'Operational',
            latency: '18 tools',
            detail: '2 cached servers · 18 advertised tools',
        });

        expect(checks[1]).toEqual({
            name: 'Resident MCP Runtime',
            status: 'Pending',
            latency: '0/1 servers · 2 warming · 1 failed',
            detail: 'Cached inventory is already advertised · resident always-on servers are still warming · on-demand tools remain launchable · 2 warming · 1 failed',
        });
    });

    it('shows resident runtime posture when cached tools are already usable', () => {
        const checks = buildSystemStartupChecks(createStartupStatus({
            mcpAggregator: {
                ready: true,
                liveReady: true,
                residentReady: true,
                connectedCount: 1,
                residentConnectedCount: 1,
                configuredServerCount: 3,
                advertisedServerCount: 3,
                advertisedAlwaysOnServerCount: 1,
                warmingServerCount: 2,
                failedWarmupServerCount: 1,
            },
        }));

        expect(checks[1]).toEqual({
            name: 'Resident MCP Runtime',
            status: 'Operational',
            latency: '1/1 servers · 2 warming · 1 failed',
            detail: '1/1 resident server connections ready · on-demand tools can still cold-start as needed',
        });
    });

    it('shows the bridge listener as operational while idle before clients attach', () => {
        const checks = buildSystemStartupChecks(createStartupStatus({
            extensionBridge: {
                ready: true,
                acceptingConnections: true,
                clientCount: 0,
                hasConnectedClients: false,
            },
        }));

        expect(checks[3]).toEqual({
            name: 'Session Restore',
            status: 'Operational',
            latency: '0 sessions',
            detail: '0 restored · 0 auto-resumed',
        });

        expect(checks[4]).toEqual({
            name: 'Client Bridge',
            status: 'Operational',
            latency: '0 clients',
            detail: 'Browser/editor client bridge is ready, but no IDE or browser adapters have connected yet.',
        });
    });

    it('shows the bridge listener as pending while the listener is still booting', () => {
        const checks = buildSystemStartupChecks(createStartupStatus({
            extensionBridge: {
                ready: false,
                acceptingConnections: false,
                clientCount: 0,
                hasConnectedClients: false,
            },
        }));

        expect(checks[3]).toEqual({
            name: 'Session Restore',
            status: 'Operational',
            latency: '0 sessions',
            detail: '0 restored · 0 auto-resumed',
        });

        expect(checks[4]).toEqual({
            name: 'Client Bridge',
            status: 'Pending',
            latency: '0 clients',
            detail: 'Browser/editor client bridge is still coming online',
        });
    });

    it('shows the execution environment posture with preferred shell context', () => {
        const checks = buildSystemStartupChecks(createStartupStatus({
            executionEnvironment: {
                ready: true,
                preferredShellLabel: 'PowerShell 7',
                toolCount: 6,
                verifiedToolCount: 5,
            },
        }));

        expect(checks[5]).toEqual({
            name: 'Execution Environment',
            status: 'Operational',
            latency: '5 tools',
            detail: 'PowerShell 7 preferred · 5/6 verified tools',
        });

        expect(checks[6]).toEqual({
            name: 'Imported Sessions',
            status: 'Operational',
            latency: '0/0 archived',
            detail: 'No imported sessions have been persisted yet',
        });

        expect(checks[7]).toEqual({
            name: 'Extension Install Artifacts',
            status: 'Pending',
            latency: 'detecting',
            detail: 'Detecting Chromium and Firefox extension install artifacts from the workspace.',
        });
    });

    it('shows browser extension install artifacts as operational when both bundles are ready', () => {
        const checks = buildSystemStartupChecks(createStartupStatus(), readyBrowserArtifacts);

        expect(checks[6]).toEqual({
            name: 'Imported Sessions',
            status: 'Operational',
            latency: '0/0 archived',
            detail: 'No imported sessions have been persisted yet',
        });

        expect(checks[7]).toEqual({
            name: 'Extension Install Artifacts',
            status: 'Operational',
            latency: '2/2 ready',
            detail: 'Chromium/Edge and Firefox extension bundles are ready to load.',
        });

        expect(buildSystemStatusCards(createStartupStatus(), true, readyBrowserArtifacts)).toMatchObject({
            extensionArtifacts: {
                status: 'Ready',
                detail: 'Chromium/Edge and Firefox extension bundles are ready to load.',
            },
            network: {
                status: 'Partial',
                detail: 'Dashboard unavailable · Extension bridge :3001',
            },
            startupReadiness: {
                status: 'Ready',
                detail: '8/8 checks ready',
            },
        });

        expect(buildSystemComponentHealthRows(createStartupStatus(), { available: true, pageCount: 0 }, readyBrowserArtifacts)).toContainEqual({
            name: 'Extension install artifacts',
            status: 'Operational',
            latency: '2/2 ready',
            detail: 'Chromium/Edge and Firefox extension bundles are ready to load.',
        });
    });

    it('treats malformed install-surface payloads as detecting instead of crashing', () => {
        const malformed = { invalid: true } as unknown as Array<{ id: string; status: 'ready' | 'partial' | 'missing' }>;

        expect(buildSystemStartupChecks(createStartupStatus(), malformed)).toContainEqual({
            name: 'Extension Install Artifacts',
            status: 'Pending',
            latency: 'detecting',
            detail: 'Detecting Chromium and Firefox extension install artifacts from the workspace.',
        });

        expect(buildSystemStatusCards(createStartupStatus(), true, malformed)).toMatchObject({
            extensionArtifacts: {
                status: 'Connecting',
                detail: 'Detecting Chromium and Firefox extension install artifacts from the workspace.',
            },
        });

        expect(buildSystemComponentHealthRows(createStartupStatus(), { available: true, pageCount: 0 }, malformed)).toContainEqual({
            name: 'Extension install artifacts',
            status: 'Pending',
            latency: 'detecting',
            detail: 'Detecting Chromium and Firefox extension install artifacts from the workspace.',
        });
    });

    it('shows sectioned-memory seeding posture inside the shared memory/context phase', () => {
        const checks = buildSystemStartupChecks(createStartupStatus({
            memory: {
                ready: false,
                initialized: true,
                agentMemory: true,
                sectionedMemory: {
                    ready: false,
                    enabled: true,
                    storeExists: true,
                    defaultSectionCount: 7,
                    presentDefaultSectionCount: 2,
                    missingSections: ['project_overview'],
                },
            },
        }));

        expect(checks[2]).toEqual({
            name: 'Memory / Context',
            status: 'Pending',
            latency: 'initialized',
            detail: 'Memory manager is initialized, but sectioned memory is still seeding default sections (2/7 present)',
        });
    });

    it('treats on-demand-only runtime as operational in shared system summaries', () => {
        const startupStatus = createStartupStatus({
            mcpAggregator: {
                ready: true,
                liveReady: true,
                residentReady: false,
                configuredServerCount: 3,
                advertisedServerCount: 3,
                advertisedToolCount: 18,
                advertisedAlwaysOnServerCount: 0,
                residentConnectedCount: 0,
            },
        });

        expect(buildSystemStatusCards(startupStatus, true, readyBrowserArtifacts)).toMatchObject({
            startupReadiness: {
                status: 'Ready',
                detail: '8/8 checks ready',
            },
            cachedInventory: {
                status: 'Ready',
                detail: '3 cached servers · 18 tools',
            },
        });

        expect(buildSystemComponentHealthRows(startupStatus, { available: true, pageCount: 2 })).toContainEqual({
            name: 'Resident MCP runtime',
            status: 'Operational',
            latency: '0/0 resident',
            detail: '3 on-demand servers can launch when needed · no resident MCP runtime is required',
        });
    });

    it('renders deferred resident runtime posture when lazy mode is enabled', () => {
        const startupStatus = createStartupStatus({
            mcpAggregator: {
                ready: true,
                liveReady: true,
                residentReady: true,
                lazySessionMode: true,
                configuredServerCount: 4,
                advertisedServerCount: 4,
                advertisedAlwaysOnServerCount: 2,
                residentConnectedCount: 0,
            },
        });

        expect(buildSystemStartupChecks(startupStatus)).toContainEqual({
            name: 'Imported Sessions',
            status: 'Operational',
            latency: '0/0 archived',
            detail: 'No imported sessions have been persisted yet',
        });

        expect(buildSystemStartupChecks(startupStatus)).toContainEqual({
            name: 'Resident MCP Runtime',
            status: 'Operational',
            latency: 'deferred lazy mode · 4 configured',
            detail: '4 configured servers are in deferred lazy mode · downstream binaries launch on first tool call',
        });
    });

    it('marks imported sessions pending until transcripts are archived and retention summaries are backfilled', () => {
        const checks = buildSystemStartupChecks(createStartupStatus({
            importedSessions: {
                totalSessions: 5,
                archivedTranscriptCount: 3,
                inlineTranscriptCount: 2,
                missingRetentionSummaryCount: 1,
            },
        }));

        expect(checks).toContainEqual({
            name: 'Imported Sessions',
            status: 'Pending',
            latency: '3/5 archived',
            detail: '3/5 archived · 2 inline · 1 missing retention summaries',
        });
    });

    it('marks imported sessions operational once archive compaction and retention summaries are complete', () => {
        const checks = buildSystemStartupChecks(createStartupStatus({
            importedSessions: {
                totalSessions: 4,
                archivedTranscriptCount: 4,
                inlineTranscriptCount: 0,
                missingRetentionSummaryCount: 0,
            },
        }));

        expect(checks).toContainEqual({
            name: 'Imported Sessions',
            status: 'Operational',
            latency: '4/4 archived',
            detail: '4/4 archived · 0 inline · retention summaries complete',
        });
    });

    it('formats uptime from core seconds and shows runtime metadata from startup status', () => {
        expect(formatUptimeSeconds(3_661)).toBe('1h 1m');

        expect(buildSystemEnvironmentRows(createStartupStatus())).toEqual([
            { label: 'NODE_ENV', value: 'test' },
            { label: 'PLATFORM', value: 'win32' },
            { label: 'UPTIME', value: '0m' },
            { label: 'VERSION', value: 'v2.7.110', accent: true },
        ]);
    });

    it('falls back to honest placeholders when runtime metadata is unavailable', () => {
        const startupStatus = createStartupStatus();
        delete startupStatus.runtime;

        expect(buildSystemEnvironmentRows(startupStatus)).toEqual([
            { label: 'NODE_ENV', value: 'unset' },
            { label: 'PLATFORM', value: 'unknown' },
            { label: 'UPTIME', value: '0m' },
            { label: 'VERSION', value: 'unknown', accent: true },
        ]);
    });

    it('handles malformed non-string runtime and summary telemetry without crashing', () => {
        const startupStatus = createStartupStatus();
        startupStatus.status = 'degraded';
        startupStatus.ready = false;
        (startupStatus as any).runtime = {
            nodeEnv: 123,
            platform: false,
            version: { build: 'bad' },
        };
        (startupStatus as any).summary = 42;

        expect(buildSystemEnvironmentRows(startupStatus)).toEqual([
            { label: 'NODE_ENV', value: 'unset' },
            { label: 'PLATFORM', value: 'unknown' },
            { label: 'UPTIME', value: '0m' },
            { label: 'VERSION', value: 'unknown', accent: true },
        ]);

        expect(buildSystemStartupNotice(startupStatus)).toEqual({
            title: 'Compat fallback active',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/system/system-status-helpers.test.ts
            detail: 'Live startup telemetry is unavailable, so HyperCode is showing config-backed compatibility state instead of the full core startup contract.',
=======
            detail: 'Live startup telemetry is unavailable, so borg is showing config-backed compatibility state instead of the full core startup contract.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/system/system-status-helpers.test.ts
            tone: 'warning',
        });

        expect(buildSystemStatusCards(startupStatus, true)).toMatchObject({
            startupReadiness: {
                status: 'Degraded',
                detail: 'Live startup telemetry is unavailable.',
            },
        });
    });

    it('surfaces compat fallback startup notices and degraded readiness labels', () => {
        const startupStatus = createStartupStatus();
        startupStatus.status = 'degraded';
        startupStatus.ready = false;
        startupStatus.summary = 'Using local MCP config fallback for 64 configured server(s); live startup telemetry is unavailable.';

        expect(buildSystemStatusCards(startupStatus, true)).toMatchObject({
            startupReadiness: {
                status: 'Degraded',
                detail: 'Using local MCP config fallback for 64 configured server(s); live startup telemetry is unavailable.',
            },
        });

        expect(buildSystemStartupNotice(startupStatus)).toEqual({
            title: 'Compat fallback active',
            detail: 'Using local MCP config fallback for 64 configured server(s); live startup telemetry is unavailable.',
            tone: 'warning',
        });
    });

    it('reports actual dashboard and bridge ports in the network card', () => {
        const startupStatus = createStartupStatus({
            extensionBridge: {
                ready: true,
                acceptingConnections: true,
                port: 3011,
            },
        });

        expect(buildSystemStatusCards(startupStatus, true, readyBrowserArtifacts, 3010)).toMatchObject({
            network: {
                status: 'Active',
                detail: 'Dashboard :3010 · Extension bridge :3011',
            },
        });
    });

    it('marks the network card partial when the dashboard is up but the bridge is offline', () => {
        const startupStatus = createStartupStatus({
            extensionBridge: {
                ready: false,
                acceptingConnections: false,
                port: null,
            },
        });

        expect(buildSystemStatusCards(startupStatus, true, readyBrowserArtifacts, 3010)).toMatchObject({
            network: {
                status: 'Partial',
                detail: 'Dashboard :3010 · Extension bridge listener offline',
            },
        });
    });

    it('surfaces a neutral connecting notice before the first startup snapshot arrives', () => {
        expect(buildSystemStartupNotice(undefined)).toEqual({
            title: 'Connecting to live telemetry',
            detail: 'Waiting for the first live startup snapshot from core so this page can replace neutral placeholders with the authoritative readiness contract.',
            tone: 'info',
        });

        expect(buildSystemStatusCards(undefined, false)).toMatchObject({
            mcpServer: {
                status: 'Connecting',
                detail: 'Waiting for the first live startup snapshot from core.',
            },
            cachedInventory: {
                status: 'Connecting',
                detail: 'Waiting for the first live startup snapshot from core.',
            },
            extensionBridge: {
                status: 'Connecting',
                detail: 'Waiting for the first live startup snapshot from core.',
            },
            extensionArtifacts: {
                status: 'Connecting',
                detail: 'Detecting Chromium and Firefox extension install artifacts from the workspace.',
            },
            network: {
                status: 'Connecting',
                detail: 'Waiting for runtime port telemetry from the dashboard and extension bridge.',
            },
            startupReadiness: {
                status: 'Connecting',
                detail: 'Connecting to live startup telemetry from core.',
            },
        });

        expect(buildSystemStartupChecks({})).toEqual([
            {
                name: 'Cached Inventory',
                status: 'Pending',
                latency: 'connecting',
                detail: 'Waiting for the first live startup snapshot from core.',
            },
            {
                name: 'Resident MCP Runtime',
                status: 'Pending',
                latency: 'connecting',
                detail: 'Waiting for the first live startup snapshot from core.',
            },
            {
                name: 'Memory / Context',
                status: 'Pending',
                latency: 'connecting',
                detail: 'Waiting for the first live startup snapshot from core.',
            },
            {
                name: 'Session Restore',
                status: 'Pending',
                latency: 'connecting',
                detail: 'Waiting for the first live startup snapshot from core.',
            },
            {
                name: 'Client Bridge',
                status: 'Pending',
                latency: 'connecting',
                detail: 'Waiting for the first live startup snapshot from core.',
            },
            {
                name: 'Execution Environment',
                status: 'Pending',
                latency: 'connecting',
                detail: 'Waiting for the first live startup snapshot from core.',
            },
            {
                name: 'Imported Sessions',
                status: 'Pending',
                latency: 'connecting',
                detail: 'Waiting for imported-session archive telemetry from core.',
            },
            {
                name: 'Extension Install Artifacts',
                status: 'Pending',
                latency: 'detecting',
                detail: 'Detecting Chromium and Firefox extension install artifacts from the workspace.',
            },
        ]);

        expect(buildSystemComponentHealthRows(undefined, undefined)).toContainEqual({
            name: 'Core API',
            status: 'Pending',
            latency: 'connecting',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/system/system-status-helpers.test.ts
            detail: 'Connecting to live startup telemetry from HyperCode Core.',
=======
            detail: 'Connecting to live startup telemetry from borg Core.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/system/system-status-helpers.test.ts
        });
    });
});
