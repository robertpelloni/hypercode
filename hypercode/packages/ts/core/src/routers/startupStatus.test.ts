import { describe, expect, it } from 'vitest';

import { buildStartupStatusSnapshot } from './startupStatus.js';

describe('buildStartupStatusSnapshot', () => {
    it('treats an empty but fully initialized router inventory as ready', async () => {
        const snapshot = await buildStartupStatusSnapshot({
            mcpServer: {
                memoryManager: {},
                isMemoryInitialized: true,
                getBridgeStatus: () => ({
                    port: 3011,
                    ready: true,
                    clientCount: 0,
                    clients: [],
                    supportedCapabilities: [],
                    supportedHookPhases: [],
                    websocketUrl: 'ws://127.0.0.1:3011',
                    healthUrl: 'http://127.0.0.1:3011/health',
                    streamUrl: 'http://127.0.0.1:3011/api/mesh/stream',
                }),
            },
            aggregator: {
                getInitializationStatus: () => ({
                    inProgress: false,
                    initialized: true,
                    connectedClientCount: 0,
                    configuredServerCount: 0,
                }),
            },
            agentMemory: {},
            browserService: {},
            browserStatus: { active: false, pageCount: 0, pageIds: [] },
            sessionSupervisor: {
                getRestoreStatus: () => ({
                    lastRestoreAt: 1_700_000_000_000,
                    restoredSessionCount: 0,
                    autoResumeCount: 0,
                }),
            },
            sessionCount: 0,
            mcpConfigService: {
                getStatus: () => ({
                    inProgress: false,
                    lastCompletedAt: 1_700_000_000_000,
                    lastSuccessAt: 1_700_000_000_000,
                    lastServerCount: 0,
                    lastToolCount: 0,
                }),
            },
            liveServerCount: 0,
            persistedServerCount: 0,
            persistedToolCount: 0,
            persistedAlwaysOnServerCount: 0,
            persistedAlwaysOnToolCount: 0,
            executionEnvironment: {
                ready: true,
                preferredShellId: 'pwsh',
                preferredShellLabel: 'PowerShell 7',
                shellCount: 2,
                verifiedShellCount: 2,
                toolCount: 4,
                verifiedToolCount: 4,
                harnessCount: 1,
                verifiedHarnessCount: 1,
                supportsPowerShell: true,
                supportsPosixShell: false,
                notes: ['Prefer PowerShell 7.'],
            },
        });

        expect(snapshot.ready).toBe(true);
        expect(snapshot.checks.mcpAggregator.inventoryReady).toBe(true);
        expect(snapshot.checks.mcpAggregator.liveReady).toBe(true);
        expect(snapshot.checks.mcpAggregator.residentReady).toBe(true);
        expect(snapshot.checks.mcpAggregator.advertisedToolCount).toBe(0);
        expect(snapshot.checks.mcpAggregator.inventorySource).toBe('database');
        expect(snapshot.checks.extensionBridge.ready).toBe(true);
        expect(snapshot.checks.extensionBridge.port).toBe(3011);
        expect(snapshot.checks.extensionBridge.hasConnectedClients).toBe(false);
        expect(snapshot.runtime).toEqual(expect.objectContaining({
            nodeEnv: process.env.NODE_ENV ?? null,
            platform: process.platform,
            version: expect.any(String),
        }));
        expect(snapshot.checks.memory.sectionedMemory).toEqual(expect.objectContaining({
            ready: true,
            enabled: false,
        }));
        expect(snapshot.checks.importedSessions).toEqual({
            totalSessions: 0,
            inlineTranscriptCount: 0,
            archivedTranscriptCount: 0,
            missingRetentionSummaryCount: 0,
        });
        expect(snapshot.startupMode).toBeNull();
    });

    it('preserves startup provenance when provided', async () => {
        const snapshot = await buildStartupStatusSnapshot({
            mcpServer: {
                memoryManager: {},
                isMemoryInitialized: true,
                getBridgeStatus: () => ({
                    port: 3011,
                    ready: true,
                    clientCount: 0,
                    clients: [],
                    supportedCapabilities: [],
                    supportedHookPhases: [],
                    websocketUrl: 'ws://127.0.0.1:3011',
                    healthUrl: 'http://127.0.0.1:3011/health',
                    streamUrl: 'http://127.0.0.1:3011/api/mesh/stream',
                }),
            },
            aggregator: {
                getInitializationStatus: () => ({
                    inProgress: false,
                    initialized: true,
                    connectedClientCount: 0,
                    configuredServerCount: 0,
                }),
            },
            agentMemory: {},
            browserService: {},
            browserStatus: { active: false, pageCount: 0, pageIds: [] },
            sessionSupervisor: {
                getRestoreStatus: () => ({
                    lastRestoreAt: 1_700_000_000_000,
                    restoredSessionCount: 0,
                    autoResumeCount: 0,
                }),
            },
            sessionCount: 0,
            mcpConfigService: {
                getStatus: () => ({
                    inProgress: false,
                    lastCompletedAt: 1_700_000_000_000,
                    lastSuccessAt: 1_700_000_000_000,
                    lastServerCount: 0,
                    lastToolCount: 0,
                }),
            },
            liveServerCount: 0,
            persistedServerCount: 0,
            persistedToolCount: 0,
            persistedAlwaysOnServerCount: 0,
            persistedAlwaysOnToolCount: 0,
            executionEnvironment: {
                ready: true,
                preferredShellId: 'pwsh',
                preferredShellLabel: 'PowerShell 7',
                shellCount: 1,
                verifiedShellCount: 1,
                toolCount: 3,
                verifiedToolCount: 3,
                harnessCount: 1,
                verifiedHarnessCount: 1,
                supportsPowerShell: true,
                supportsPosixShell: false,
                notes: ['Prefer PowerShell 7.'],
            },
            startupMode: {
                requestedRuntime: 'auto',
                activeRuntime: 'go',
                requestedPort: 4000,
                activePort: 4012,
                portDecision: 'fallback port selected before launch',
                portReason: 'Port 4000 was already occupied before startup, so HyperCode selected 4012.',
                launchMode: 'prebuilt Go binary',
                dashboardMode: 'compatibility-only; skipped for Go runtime',
                installDecision: 'skipped',
                buildDecision: 'skipped',
            },
        });

        expect(snapshot.startupMode).toEqual({
            requestedRuntime: 'auto',
            activeRuntime: 'go',
            requestedPort: 4000,
            activePort: 4012,
            portDecision: 'fallback port selected before launch',
            portReason: 'Port 4000 was already occupied before startup, so HyperCode selected 4012.',
            launchMode: 'prebuilt Go binary',
            dashboardMode: 'compatibility-only; skipped for Go runtime',
            installDecision: 'skipped',
            buildDecision: 'skipped',
        });
    });

    it('keeps startup pending when the bridge listener is offline', async () => {
        const snapshot = await buildStartupStatusSnapshot({
            mcpServer: {
                memoryManager: {},
                isMemoryInitialized: true,
                getBridgeStatus: () => ({
                    port: 3011,
                    ready: false,
                    clientCount: 2,
                    clients: [
                        {
                            clientId: 'stale-client',
                            clientName: 'Stale bridge client',
                            connectedAt: '2026-03-25T00:00:00.000Z',
                            lastSeenAt: '2026-03-25T00:00:30.000Z',
                        },
                    ],
                    supportedCapabilities: ['tool.execute'],
                    supportedHookPhases: ['before'],
                    websocketUrl: 'ws://127.0.0.1:3011',
                    healthUrl: 'http://127.0.0.1:3011/health',
                    streamUrl: 'http://127.0.0.1:3011/api/mesh/stream',
                }),
            },
            aggregator: {
                getInitializationStatus: () => ({
                    inProgress: false,
                    initialized: true,
                    connectedClientCount: 1,
                    configuredServerCount: 1,
                }),
            },
            agentMemory: {},
            browserService: {},
            browserStatus: { active: false, pageCount: 0, pageIds: [] },
            sessionSupervisor: {
                getRestoreStatus: () => ({
                    lastRestoreAt: 1_700_000_000_000,
                    restoredSessionCount: 1,
                    autoResumeCount: 0,
                }),
            },
            sessionCount: 1,
            mcpConfigService: {
                getStatus: () => ({
                    inProgress: false,
                    lastCompletedAt: 1_700_000_000_000,
                    lastSuccessAt: 1_700_000_000_000,
                    lastServerCount: 1,
                    lastToolCount: 4,
                }),
            },
            liveServerCount: 1,
            persistedServerCount: 1,
            persistedToolCount: 4,
            persistedAlwaysOnServerCount: 0,
            persistedAlwaysOnToolCount: 0,
            executionEnvironment: {
                ready: true,
                preferredShellId: 'pwsh',
                preferredShellLabel: 'PowerShell 7',
                shellCount: 1,
                verifiedShellCount: 1,
                toolCount: 3,
                verifiedToolCount: 3,
                harnessCount: 1,
                verifiedHarnessCount: 1,
                supportsPowerShell: true,
                supportsPosixShell: false,
                notes: ['Prefer PowerShell 7.'],
            },
        });

        expect(snapshot.ready).toBe(false);
        expect(snapshot.checks.extensionBridge.ready).toBe(false);
        expect(snapshot.checks.extensionBridge.acceptingConnections).toBe(false);
        expect(snapshot.summary).toContain('Extension bridge listener is offline.');
        expect(snapshot.blockingReasons).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ code: 'extension_bridge_not_ready' }),
            ]),
        );
        expect(snapshot.checks.extensionBridge.port).toBeNull();
        expect(snapshot.checks.extensionBridge.clientCount).toBe(0);
        expect(snapshot.checks.extensionBridge.clients).toEqual([]);
        expect(snapshot.checks.extensionBridge.websocketUrl).toBeNull();
        expect(snapshot.checks.extensionBridge.healthUrl).toBeNull();
        expect(snapshot.checks.extensionBridge.streamUrl).toBeNull();
    });

    it('reports a clear startup summary with blocking reason codes when checks are pending', async () => {
        const snapshot = await buildStartupStatusSnapshot({
            mcpServer: {
                memoryManager: {},
                isMemoryInitialized: false,
                getBridgeStatus: () => ({
                    ready: false,
                    clientCount: 0,
                    clients: [],
                    supportedCapabilities: [],
                    supportedHookPhases: [],
                }),
            },
            aggregator: {
                getInitializationStatus: () => ({
                    inProgress: true,
                    initialized: false,
                    connectedClientCount: 0,
                    configuredServerCount: 2,
                }),
            },
            agentMemory: {},
            browserService: null,
            browserStatus: { active: false, pageCount: 0, pageIds: [] },
            sessionSupervisor: {
                getRestoreStatus: () => ({
                    restoredSessionCount: 0,
                    autoResumeCount: 0,
                }),
            },
            sessionCount: 0,
            mcpConfigService: {
                getStatus: () => ({
                    inProgress: true,
                    lastServerCount: 2,
                    lastToolCount: 0,
                }),
            },
            liveServerCount: 0,
            persistedServerCount: 2,
            persistedToolCount: 0,
            persistedAlwaysOnServerCount: 1,
            persistedAlwaysOnToolCount: 0,
            executionEnvironment: {
                ready: false,
                preferredShellId: null,
                preferredShellLabel: null,
                shellCount: 1,
                verifiedShellCount: 0,
                toolCount: 0,
                verifiedToolCount: 0,
                harnessCount: 0,
                verifiedHarnessCount: 0,
                supportsPowerShell: false,
                supportsPosixShell: false,
                notes: ['No verified shell.'],
            },
        });

        expect(snapshot.ready).toBe(false);
        expect(snapshot.summary).toContain('Startup pending:');
        expect(snapshot.blockingReasons).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ code: 'mcp_aggregator_not_initialized' }),
                expect.objectContaining({ code: 'mcp_config_sync_pending' }),
                expect.objectContaining({ code: 'memory_not_ready' }),
                expect.objectContaining({ code: 'extension_bridge_not_ready' }),
                expect.objectContaining({ code: 'execution_environment_not_ready' }),
            ]),
        );
    });

    it('preserves rich bridge client metadata in the startup snapshot', async () => {
        const connectedAt = 1_700_000_000_000;
        const lastSeenAt = connectedAt + 5_000;
        const snapshot = await buildStartupStatusSnapshot({
            mcpServer: {
                memoryManager: {},
                isMemoryInitialized: true,
                getBridgeStatus: () => ({
                    ready: true,
                    clientCount: 1,
                    clients: [
                        {
                            clientId: 'client-1',
                            clientName: 'HyperCode VS Code Bridge',
                            clientType: 'vscode-extension',
                            version: '1.2.3',
                            platform: 'VS Code 1.99',
                            capabilities: ['chat.inject'],
                            hookPhases: ['chat.submit'],
                            connectedAt,
                            lastSeenAt,
                        },
                    ],
                    supportedCapabilities: ['chat.inject'],
                    supportedHookPhases: ['chat.submit'],
                }),
            },
            aggregator: {
                getInitializationStatus: () => ({
                    inProgress: false,
                    initialized: true,
                    connectedClientCount: 1,
                    configuredServerCount: 1,
                }),
            },
            agentMemory: {},
            browserService: {},
            browserStatus: { active: false, pageCount: 0, pageIds: [] },
            sessionSupervisor: {
                getRestoreStatus: () => ({
                    lastRestoreAt: connectedAt,
                    restoredSessionCount: 1,
                    autoResumeCount: 0,
                }),
            },
            sessionCount: 1,
            mcpConfigService: {
                getStatus: () => ({
                    inProgress: false,
                    lastCompletedAt: connectedAt,
                    lastSuccessAt: connectedAt,
                    lastServerCount: 1,
                    lastToolCount: 1,
                }),
            },
            liveServerCount: 1,
            persistedServerCount: 1,
            persistedToolCount: 1,
            persistedAlwaysOnServerCount: 0,
            persistedAlwaysOnToolCount: 0,
            executionEnvironment: {
                ready: true,
                preferredShellId: 'pwsh',
                preferredShellLabel: 'PowerShell 7',
                shellCount: 1,
                verifiedShellCount: 1,
                toolCount: 1,
                verifiedToolCount: 1,
                harnessCount: 0,
                verifiedHarnessCount: 0,
                supportsPowerShell: true,
                supportsPosixShell: false,
                notes: ['Prefer PowerShell 7.'],
            },
        });

        expect(snapshot.checks.extensionBridge.clients).toEqual([
            expect.objectContaining({
                clientId: 'client-1',
                version: '1.2.3',
                platform: 'VS Code 1.99',
                connectedAt,
                lastSeenAt,
            }),
        ]);
    });

    it('keeps startup pending until memory is actually initialized', async () => {
        const snapshot = await buildStartupStatusSnapshot({
            mcpServer: {
                memoryManager: {},
                isMemoryInitialized: false,
                getBridgeStatus: () => ({
                    ready: true,
                    clientCount: 0,
                    clients: [],
                    supportedCapabilities: [],
                    supportedHookPhases: [],
                }),
            },
            aggregator: {
                getInitializationStatus: () => ({
                    inProgress: false,
                    initialized: true,
                    connectedClientCount: 0,
                    configuredServerCount: 0,
                }),
            },
            agentMemory: {},
            browserService: {},
            browserStatus: { active: false, pageCount: 0, pageIds: [] },
            sessionSupervisor: {
                getRestoreStatus: () => ({
                    lastRestoreAt: 1_700_000_000_000,
                    restoredSessionCount: 0,
                    autoResumeCount: 0,
                }),
            },
            sessionCount: 0,
            mcpConfigService: {
                getStatus: () => ({
                    inProgress: false,
                    lastCompletedAt: 1_700_000_000_000,
                    lastSuccessAt: 1_700_000_000_000,
                    lastServerCount: 0,
                    lastToolCount: 0,
                }),
            },
            liveServerCount: 0,
            persistedServerCount: 0,
            persistedToolCount: 0,
            persistedAlwaysOnServerCount: 0,
            persistedAlwaysOnToolCount: 0,
            executionEnvironment: {
                ready: false,
                preferredShellId: null,
                preferredShellLabel: null,
                shellCount: 1,
                verifiedShellCount: 0,
                toolCount: 0,
                verifiedToolCount: 0,
                harnessCount: 0,
                verifiedHarnessCount: 0,
                supportsPowerShell: false,
                supportsPosixShell: false,
                notes: ['No verified shell.'],
            },
        });

        expect(snapshot.ready).toBe(false);
        expect(snapshot.checks.memory.ready).toBe(false);
        expect(snapshot.checks.memory.initialized).toBe(false);
    });

    it('reports known router inventory even when no live clients are connected yet', async () => {
        const snapshot = await buildStartupStatusSnapshot({
            mcpServer: {
                memoryManager: {},
                isMemoryInitialized: true,
                getBridgeStatus: () => ({
                    ready: true,
                    clientCount: 0,
                    clients: [],
                    supportedCapabilities: [],
                    supportedHookPhases: [],
                }),
            },
            aggregator: {
                getInitializationStatus: () => ({
                    inProgress: false,
                    initialized: true,
                    connectedClientCount: 0,
                    configuredServerCount: 7,
                }),
            },
            agentMemory: {},
            browserService: {},
            browserStatus: { active: false, pageCount: 0, pageIds: [] },
            sessionSupervisor: {
                getRestoreStatus: () => ({
                    lastRestoreAt: 1_700_000_000_000,
                    restoredSessionCount: 0,
                    autoResumeCount: 0,
                }),
            },
            sessionCount: 0,
            mcpConfigService: {
                getStatus: () => ({
                    inProgress: false,
                    lastCompletedAt: 1_700_000_000_000,
                    lastSuccessAt: 1_700_000_000_000,
                    lastServerCount: 7,
                    lastToolCount: 26,
                }),
            },
            liveServerCount: 0,
            persistedServerCount: 7,
            persistedToolCount: 26,
            persistedAlwaysOnServerCount: 2,
            persistedAlwaysOnToolCount: 5,
            executionEnvironment: {
                ready: true,
                preferredShellId: 'pwsh',
                preferredShellLabel: 'PowerShell 7',
                shellCount: 2,
                verifiedShellCount: 2,
                toolCount: 5,
                verifiedToolCount: 5,
                harnessCount: 2,
                verifiedHarnessCount: 2,
                supportsPowerShell: true,
                supportsPosixShell: true,
                notes: ['Prefer PowerShell 7.', 'Cygwin Bash is available for POSIX pipelines.'],
            },
        });

        expect(snapshot.ready).toBe(false);
        expect(snapshot.checks.mcpAggregator.serverCount).toBe(7);
        expect(snapshot.checks.mcpAggregator.connectedCount).toBe(0);
        expect(snapshot.checks.mcpAggregator.residentConnectedCount).toBe(0);
        expect(snapshot.checks.mcpAggregator.residentReady).toBe(false);
        expect(snapshot.checks.mcpAggregator.warmingServerCount).toBe(0);
        expect(snapshot.checks.mcpAggregator.failedWarmupServerCount).toBe(0);
        expect(snapshot.checks.mcpAggregator.persistedServerCount).toBe(7);
        expect(snapshot.checks.mcpAggregator.advertisedServerCount).toBe(7);
        expect(snapshot.checks.mcpAggregator.advertisedToolCount).toBe(26);
        expect(snapshot.checks.mcpAggregator.advertisedAlwaysOnToolCount).toBe(5);
        expect(snapshot.checks.mcpAggregator.inventorySource).toBe('database');
        expect(snapshot.checks.mcpAggregator.warmupInProgress).toBe(true);
        expect(snapshot.checks.executionEnvironment).toEqual(expect.objectContaining({
            ready: true,
            preferredShellId: 'pwsh',
            verifiedToolCount: 5,
            supportsPosixShell: true,
        }));
    });

    it('includes imported session maintenance stats in the startup snapshot', async () => {
        const snapshot = await buildStartupStatusSnapshot({
            mcpServer: {
                memoryManager: {},
                isMemoryInitialized: true,
                getBridgeStatus: () => ({
                    ready: true,
                    clientCount: 0,
                    clients: [],
                    supportedCapabilities: [],
                    supportedHookPhases: [],
                }),
            },
            aggregator: {
                getInitializationStatus: () => ({
                    inProgress: false,
                    initialized: true,
                    connectedClientCount: 0,
                    configuredServerCount: 0,
                }),
            },
            agentMemory: {},
            browserService: {},
            browserStatus: { active: false, pageCount: 0, pageIds: [] },
            sessionSupervisor: {
                getRestoreStatus: () => ({
                    lastRestoreAt: 1_700_000_000_000,
                    restoredSessionCount: 0,
                    autoResumeCount: 0,
                }),
            },
            sessionCount: 0,
            mcpConfigService: {
                getStatus: () => ({
                    inProgress: false,
                    lastCompletedAt: 1_700_000_000_000,
                    lastSuccessAt: 1_700_000_000_000,
                    lastServerCount: 0,
                    lastToolCount: 0,
                }),
            },
            liveServerCount: 0,
            persistedServerCount: 0,
            persistedToolCount: 0,
            persistedAlwaysOnServerCount: 0,
            persistedAlwaysOnToolCount: 0,
            executionEnvironment: {
                ready: true,
                preferredShellId: 'pwsh',
                preferredShellLabel: 'PowerShell 7',
                shellCount: 1,
                verifiedShellCount: 1,
                toolCount: 1,
                verifiedToolCount: 1,
                harnessCount: 0,
                verifiedHarnessCount: 0,
                supportsPowerShell: true,
                supportsPosixShell: false,
                notes: ['Prefer PowerShell 7.'],
            },
            importedSessions: {
                totalSessions: 14,
                inlineTranscriptCount: 2,
                archivedTranscriptCount: 12,
                missingRetentionSummaryCount: 3,
            },
        });

        expect(snapshot.checks.importedSessions).toEqual({
            totalSessions: 14,
            inlineTranscriptCount: 2,
            archivedTranscriptCount: 12,
            missingRetentionSummaryCount: 3,
        });
    });

    it('advertises always-on cached tools before the live runtime has connected every server', async () => {
        const snapshot = await buildStartupStatusSnapshot({
            mcpServer: {
                memoryManager: {},
                isMemoryInitialized: true,
                getBridgeStatus: () => ({
                    ready: true,
                    clientCount: 0,
                    clients: [],
                    supportedCapabilities: [],
                    supportedHookPhases: [],
                }),
            },
            aggregator: {
                getInitializationStatus: () => ({
                    inProgress: true,
                    initialized: true,
                    connectedClientCount: 1,
                    configuredServerCount: 3,
                }),
            },
            agentMemory: {},
            browserService: {},
            browserStatus: { active: false, pageCount: 0, pageIds: [] },
            sessionSupervisor: {
                getRestoreStatus: () => ({
                    lastRestoreAt: 1_700_000_000_000,
                    restoredSessionCount: 1,
                    autoResumeCount: 1,
                }),
            },
            sessionCount: 1,
            mcpConfigService: {
                getStatus: () => ({
                    inProgress: false,
                    lastCompletedAt: 1_700_000_000_000,
                    lastSuccessAt: 1_700_000_000_000,
                    lastServerCount: 3,
                    lastToolCount: 12,
                }),
            },
            liveServerCount: 1,
            persistedServerCount: 3,
            persistedToolCount: 12,
            persistedAlwaysOnServerCount: 1,
            persistedAlwaysOnToolCount: 4,
            executionEnvironment: {
                ready: true,
                preferredShellId: 'pwsh',
                preferredShellLabel: 'PowerShell 7',
                shellCount: 2,
                verifiedShellCount: 2,
                toolCount: 4,
                verifiedToolCount: 4,
                harnessCount: 1,
                verifiedHarnessCount: 1,
                supportsPowerShell: true,
                supportsPosixShell: false,
                notes: ['Prefer PowerShell 7.'],
            },
        });

        expect(snapshot.ready).toBe(false);
        expect(snapshot.checks.mcpAggregator.inventoryReady).toBe(true);
        expect(snapshot.checks.mcpAggregator.liveReady).toBe(true);
        expect(snapshot.checks.mcpAggregator.residentReady).toBe(false);
        expect(snapshot.checks.mcpAggregator.connectedCount).toBe(1);
        expect(snapshot.checks.mcpAggregator.residentConnectedCount).toBe(0);
        expect(snapshot.checks.mcpAggregator.warmingServerCount).toBe(0);
        expect(snapshot.checks.mcpAggregator.failedWarmupServerCount).toBe(0);
        expect(snapshot.checks.mcpAggregator.advertisedToolCount).toBe(12);
        expect(snapshot.checks.mcpAggregator.advertisedAlwaysOnServerCount).toBe(1);
        expect(snapshot.checks.mcpAggregator.advertisedAlwaysOnToolCount).toBe(4);
        expect(snapshot.checks.mcpAggregator.inventorySource).toBe('database');
        expect(snapshot.checks.mcpAggregator.warmupInProgress).toBe(true);
    });

    it('marks startup ready once all always-on servers are connected even if on-demand peers are still cold', async () => {
        const snapshot = await buildStartupStatusSnapshot({
            mcpServer: {
                memoryManager: {},
                isMemoryInitialized: true,
                getBridgeStatus: () => ({
                    ready: true,
                    clientCount: 0,
                    clients: [],
                    supportedCapabilities: [],
                    supportedHookPhases: [],
                }),
            },
            aggregator: {
                getInitializationStatus: () => ({
                    inProgress: true,
                    initialized: true,
                    connectedClientCount: 1,
                    configuredServerCount: 3,
                }),
            },
            agentMemory: {},
            browserService: {},
            browserStatus: { active: false, pageCount: 0, pageIds: [] },
            sessionSupervisor: {
                getRestoreStatus: () => ({
                    lastRestoreAt: 1_700_000_000_000,
                    restoredSessionCount: 1,
                    autoResumeCount: 1,
                }),
            },
            sessionCount: 1,
            mcpConfigService: {
                getStatus: () => ({
                    inProgress: false,
                    lastCompletedAt: 1_700_000_000_000,
                    lastSuccessAt: 1_700_000_000_000,
                    lastServerCount: 3,
                    lastToolCount: 12,
                }),
            },
            liveServerCount: 1,
            residentLiveServerCount: 1,
            persistedServerCount: 3,
            persistedToolCount: 12,
            persistedAlwaysOnServerCount: 1,
            persistedAlwaysOnToolCount: 4,
            executionEnvironment: {
                ready: true,
                preferredShellId: 'pwsh',
                preferredShellLabel: 'PowerShell 7',
                shellCount: 2,
                verifiedShellCount: 2,
                toolCount: 4,
                verifiedToolCount: 4,
                harnessCount: 1,
                verifiedHarnessCount: 1,
                supportsPowerShell: true,
                supportsPosixShell: false,
                notes: ['Prefer PowerShell 7.'],
            },
        });

        expect(snapshot.ready).toBe(true);
        expect(snapshot.checks.mcpAggregator.liveReady).toBe(true);
        expect(snapshot.checks.mcpAggregator.residentReady).toBe(true);
        expect(snapshot.checks.mcpAggregator.connectedCount).toBe(1);
        expect(snapshot.checks.mcpAggregator.residentConnectedCount).toBe(1);
    });

    it('surfaces last-known-good config metadata when that is the only available inventory source', async () => {
        const snapshot = await buildStartupStatusSnapshot({
            mcpServer: {
                memoryManager: {},
                isMemoryInitialized: true,
                getBridgeStatus: () => ({
                    ready: true,
                    clientCount: 0,
                    clients: [],
                    supportedCapabilities: [],
                    supportedHookPhases: [],
                }),
            },
            aggregator: {
                getInitializationStatus: () => ({
                    inProgress: true,
                    initialized: true,
                    connectedClientCount: 0,
                    configuredServerCount: 2,
                }),
            },
            agentMemory: {},
            browserService: {},
            browserStatus: { active: false, pageCount: 0, pageIds: [] },
            sessionSupervisor: {
                getRestoreStatus: () => ({
                    lastRestoreAt: 1_700_000_000_000,
                    restoredSessionCount: 0,
                    autoResumeCount: 0,
                }),
            },
            sessionCount: 0,
            mcpConfigService: {
                getStatus: () => ({
                    inProgress: false,
                    lastCompletedAt: 1_700_000_000_000,
                    lastSuccessAt: 1_700_000_000_000,
                    lastServerCount: 2,
                    lastToolCount: 8,
                }),
            },
            liveServerCount: 0,
            warmingServerCount: 2,
            failedWarmupServerCount: 1,
            persistedServerCount: 2,
            persistedToolCount: 8,
            persistedAlwaysOnServerCount: 1,
            persistedAlwaysOnToolCount: 3,
            inventorySource: 'config',
            inventorySnapshotUpdatedAt: '2026-03-12T17:00:00.000Z',
            executionEnvironment: {
                ready: true,
                preferredShellId: 'pwsh',
                preferredShellLabel: 'PowerShell 7',
                shellCount: 1,
                verifiedShellCount: 1,
                toolCount: 2,
                verifiedToolCount: 2,
                harnessCount: 1,
                verifiedHarnessCount: 1,
                supportsPowerShell: true,
                supportsPosixShell: false,
                notes: ['Prefer PowerShell 7.'],
            },
        });

        expect(snapshot.checks.mcpAggregator.inventorySource).toBe('config');
        expect(snapshot.checks.mcpAggregator.inventorySnapshotUpdatedAt).toBe('2026-03-12T17:00:00.000Z');
        expect(snapshot.checks.mcpAggregator.inventoryReady).toBe(true);
        expect(snapshot.checks.mcpAggregator.warmupInProgress).toBe(true);
        expect(snapshot.checks.mcpAggregator.warmingServerCount).toBe(2);
        expect(snapshot.checks.mcpAggregator.failedWarmupServerCount).toBe(1);
    });

    it('keeps startup pending when sectioned memory is enabled but its store has not been initialized yet', async () => {
        const snapshot = await buildStartupStatusSnapshot({
            mcpServer: {
                memoryManager: {},
                isMemoryInitialized: true,
                getBridgeStatus: () => ({
                    ready: true,
                    clientCount: 0,
                    clients: [],
                    supportedCapabilities: [],
                    supportedHookPhases: [],
                }),
            },
            aggregator: {
                getInitializationStatus: () => ({
                    inProgress: false,
                    initialized: true,
                    connectedClientCount: 0,
                    configuredServerCount: 0,
                }),
            },
            agentMemory: {},
            browserService: {},
            browserStatus: { active: false, pageCount: 0, pageIds: [] },
            sessionSupervisor: {
                getRestoreStatus: () => ({
                    lastRestoreAt: 1_700_000_000_000,
                    restoredSessionCount: 0,
                    autoResumeCount: 0,
                }),
            },
            sessionCount: 0,
            mcpConfigService: {
                getStatus: () => ({
                    inProgress: false,
                    lastCompletedAt: 1_700_000_000_000,
                    lastSuccessAt: 1_700_000_000_000,
                    lastServerCount: 0,
                    lastToolCount: 0,
                }),
            },
            liveServerCount: 0,
            persistedServerCount: 0,
            persistedToolCount: 0,
            persistedAlwaysOnServerCount: 0,
            persistedAlwaysOnToolCount: 0,
            executionEnvironment: {
                ready: true,
                preferredShellId: 'pwsh',
                preferredShellLabel: 'PowerShell 7',
                shellCount: 1,
                verifiedShellCount: 1,
                toolCount: 1,
                verifiedToolCount: 1,
                harnessCount: 0,
                verifiedHarnessCount: 0,
                supportsPowerShell: true,
                supportsPosixShell: false,
                notes: ['Prefer PowerShell 7.'],
            },
            sectionedMemory: {
                enabled: true,
                storePath: '.hypercode/sectioned_memory.json',
                storeExists: false,
                totalEntries: 0,
                sectionCount: 0,
                defaultSectionCount: 7,
                presentDefaultSectionCount: 0,
                missingSections: ['project_overview'],
                lastUpdatedAt: null,
            },
        });

        expect(snapshot.ready).toBe(false);
        expect(snapshot.checks.memory.sectionedMemory).toEqual(expect.objectContaining({
            enabled: true,
            storeExists: false,
            ready: false,
        }));
    });

    it('treats resident always-on warmup as optional when lazy MCP sessions are enabled', async () => {
        const snapshot = await buildStartupStatusSnapshot({
            mcpServer: {
                memoryManager: {},
                isMemoryInitialized: true,
                getBridgeStatus: () => ({
                    ready: true,
                    clientCount: 0,
                    clients: [],
                    supportedCapabilities: [],
                    supportedHookPhases: [],
                }),
            },
            aggregator: {
                getInitializationStatus: () => ({
                    inProgress: false,
                    initialized: true,
                    connectedClientCount: 0,
                    configuredServerCount: 4,
                }),
            },
            agentMemory: {},
            browserService: {},
            browserStatus: { active: false, pageCount: 0, pageIds: [] },
            sessionSupervisor: {
                getRestoreStatus: () => ({
                    lastRestoreAt: 1_700_000_000_000,
                    restoredSessionCount: 0,
                    autoResumeCount: 0,
                }),
            },
            sessionCount: 0,
            mcpConfigService: {
                getStatus: () => ({
                    inProgress: false,
                    lastCompletedAt: 1_700_000_000_000,
                    lastSuccessAt: 1_700_000_000_000,
                    lastServerCount: 4,
                    lastToolCount: 16,
                }),
            },
            liveServerCount: 0,
            residentLiveServerCount: 0,
            warmingServerCount: 0,
            failedWarmupServerCount: 0,
            lazySessionMode: true,
            persistedServerCount: 4,
            persistedToolCount: 16,
            persistedAlwaysOnServerCount: 2,
            persistedAlwaysOnToolCount: 6,
            executionEnvironment: {
                ready: true,
                preferredShellId: 'pwsh',
                preferredShellLabel: 'PowerShell 7',
                shellCount: 1,
                verifiedShellCount: 1,
                toolCount: 2,
                verifiedToolCount: 2,
                harnessCount: 1,
                verifiedHarnessCount: 1,
                supportsPowerShell: true,
                supportsPosixShell: false,
                notes: ['Prefer PowerShell 7.'],
            },
        });

        expect(snapshot.ready).toBe(true);
        expect(snapshot.checks.mcpAggregator.liveReady).toBe(true);
        expect(snapshot.checks.mcpAggregator.residentReady).toBe(true);
        expect(snapshot.blockingReasons).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({ code: 'mcp_resident_runtime_not_ready' }),
            ]),
        );
    });

        it('zero-server fresh install boots cleanly when aggregator is initialized even if config sync has never run', async () => {
            const snapshot = await buildStartupStatusSnapshot({
                mcpServer: {
                    memoryManager: {},
                    isMemoryInitialized: true,
                    getBridgeStatus: () => ({
                        ready: true,
                        clientCount: 0,
                        clients: [],
                        supportedCapabilities: [],
                        supportedHookPhases: [],
                    }),
                },
                aggregator: {
                    getInitializationStatus: () => ({
                        inProgress: false,
                        initialized: true,
                        connectedClientCount: 0,
                        configuredServerCount: 0,
                    }),
                },
                agentMemory: {},
                browserService: {},
                browserStatus: { active: false, pageCount: 0, pageIds: [] },
                sessionSupervisor: {
                    getRestoreStatus: () => ({
                        lastRestoreAt: Date.now(),
                        restoredSessionCount: 0,
                        autoResumeCount: 0,
                    }),
                },
                sessionCount: 0,
                // Fresh install: config sync has NEVER completed (lastCompletedAt is null)
                mcpConfigService: {
                    getStatus: () => ({
                        inProgress: false,
                        lastCompletedAt: undefined,
                        lastSuccessAt: undefined,
                        lastServerCount: 0,
                        lastToolCount: 0,
                    }),
                },
                liveServerCount: 0,
                persistedServerCount: 0,
                persistedToolCount: 0,
                persistedAlwaysOnServerCount: 0,
                persistedAlwaysOnToolCount: 0,
                executionEnvironment: {
                    ready: true,
                    preferredShellId: 'pwsh',
                    preferredShellLabel: 'PowerShell 7',
                    shellCount: 1,
                    verifiedShellCount: 1,
                    toolCount: 2,
                    verifiedToolCount: 2,
                    harnessCount: 1,
                    verifiedHarnessCount: 1,
                    supportsPowerShell: true,
                    supportsPosixShell: false,
                    notes: [],
                },
            });

            expect(snapshot.ready).toBe(true);
            expect(snapshot.checks.configSync.ready).toBe(true);
            expect(snapshot.blockingReasons).not.toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ code: 'mcp_config_sync_pending' }),
                ]),
            );
            expect(snapshot.checks.mcpAggregator.inventoryReady).toBe(true);
            expect(snapshot.checks.mcpAggregator.residentReady).toBe(true);
        });

        it('zero-server pre-init: shows mcp_aggregator_not_initialized but not mcp_config_sync_pending while aggregator bootstraps', async () => {
            const snapshot = await buildStartupStatusSnapshot({
                mcpServer: {
                    memoryManager: {},
                    isMemoryInitialized: true,
                    getBridgeStatus: () => ({
                        ready: true,
                        clientCount: 0,
                        clients: [],
                        supportedCapabilities: [],
                        supportedHookPhases: [],
                    }),
                },
                // Aggregator is still bootstrapping (initialized: false)
                aggregator: {
                    getInitializationStatus: () => ({
                        inProgress: true,
                        initialized: false,
                        connectedClientCount: 0,
                        configuredServerCount: 0,
                    }),
                },
                agentMemory: {},
                browserService: {},
                browserStatus: { active: false, pageCount: 0, pageIds: [] },
                sessionSupervisor: {
                    getRestoreStatus: () => ({
                        lastRestoreAt: Date.now(),
                        restoredSessionCount: 0,
                        autoResumeCount: 0,
                    }),
                },
                sessionCount: 0,
                mcpConfigService: {
                    getStatus: () => ({
                        inProgress: false,
                        lastCompletedAt: undefined,
                        lastSuccessAt: undefined,
                        lastServerCount: 0,
                        lastToolCount: 0,
                    }),
                },
                liveServerCount: 0,
                persistedServerCount: 0,
                persistedToolCount: 0,
                persistedAlwaysOnServerCount: 0,
                persistedAlwaysOnToolCount: 0,
                executionEnvironment: {
                    ready: true,
                    preferredShellId: 'pwsh',
                    preferredShellLabel: 'PowerShell 7',
                    shellCount: 1,
                    verifiedShellCount: 1,
                    toolCount: 2,
                    verifiedToolCount: 2,
                    harnessCount: 1,
                    verifiedHarnessCount: 1,
                    supportsPowerShell: true,
                    supportsPosixShell: false,
                    notes: [],
                },
            });

            // Pre-init state: should be pending (transient, resolves in <100ms on actual hardware)
            expect(snapshot.ready).toBe(false);
            expect(snapshot.blockingReasons).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ code: 'mcp_aggregator_not_initialized' }),
                ]),
            );
            // But config sync must NOT be a blocker — nothing to sync on zero-server install
            expect(snapshot.blockingReasons).not.toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ code: 'mcp_config_sync_pending' }),
                ]),
            );
        });

        it('zero-server initialized boot does not get stuck pending on stale config-sync flags', async () => {
            const snapshot = await buildStartupStatusSnapshot({
                mcpServer: {
                    memoryManager: {},
                    isMemoryInitialized: true,
                    getBridgeStatus: () => ({
                        ready: true,
                        clientCount: 0,
                        clients: [],
                        supportedCapabilities: [],
                        supportedHookPhases: [],
                    }),
                },
                aggregator: {
                    getInitializationStatus: () => ({
                        inProgress: false,
                        initialized: true,
                        connectedClientCount: 0,
                        configuredServerCount: 0,
                    }),
                },
                agentMemory: {},
                browserService: {},
                browserStatus: { active: false, pageCount: 0, pageIds: [] },
                sessionSupervisor: {
                    getRestoreStatus: () => ({
                        lastRestoreAt: Date.now(),
                        restoredSessionCount: 0,
                        autoResumeCount: 0,
                    }),
                },
                sessionCount: 0,
                // Simulate stale status from a prior interrupted run.
                mcpConfigService: {
                    getStatus: () => ({
                        inProgress: true,
                        lastCompletedAt: undefined,
                        lastSuccessAt: undefined,
                        lastError: 'stale startup state',
                        lastServerCount: 0,
                        lastToolCount: 0,
                    }),
                },
                liveServerCount: 0,
                persistedServerCount: 0,
                persistedToolCount: 0,
                persistedAlwaysOnServerCount: 0,
                persistedAlwaysOnToolCount: 0,
                executionEnvironment: {
                    ready: true,
                    preferredShellId: 'pwsh',
                    preferredShellLabel: 'PowerShell 7',
                    shellCount: 1,
                    verifiedShellCount: 1,
                    toolCount: 2,
                    verifiedToolCount: 2,
                    harnessCount: 1,
                    verifiedHarnessCount: 1,
                    supportsPowerShell: true,
                    supportsPosixShell: false,
                    notes: [],
                },
            });

            expect(snapshot.ready).toBe(true);
            expect(snapshot.checks.configSync.ready).toBe(true);
            expect(snapshot.blockingReasons).not.toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ code: 'mcp_config_sync_pending' }),
                ]),
            );
        });
    it('reports degraded persistence when startup falls back to config inventory because DB-backed inventory is unavailable', async () => {
        const snapshot = await buildStartupStatusSnapshot({
            mcpServer: {
                memoryManager: {},
                isMemoryInitialized: true,
                getBridgeStatus: () => ({
                    ready: true,
                    clientCount: 0,
                    clients: [],
                    supportedCapabilities: [],
                    supportedHookPhases: [],
                }),
            },
            aggregator: {
                getInitializationStatus: () => ({
                    inProgress: false,
                    initialized: true,
                    connectedClientCount: 0,
                    configuredServerCount: 2,
                }),
            },
            agentMemory: {},
            browserService: {},
            browserStatus: { active: false, pageCount: 0, pageIds: [] },
            sessionSupervisor: {
                getRestoreStatus: () => ({
                    lastRestoreAt: 1_700_000_000_000,
                    restoredSessionCount: 0,
                    autoResumeCount: 0,
                }),
            },
            sessionCount: 0,
            mcpConfigService: {
                getStatus: () => ({
                    inProgress: false,
                    lastCompletedAt: 1_700_000_000_000,
                    lastSuccessAt: 1_700_000_000_000,
                    lastServerCount: 2,
                    lastToolCount: 8,
                }),
            },
            liveServerCount: 0,
            persistedServerCount: 2,
            persistedToolCount: 8,
            persistedAlwaysOnServerCount: 1,
            persistedAlwaysOnToolCount: 3,
            inventorySource: 'config',
            inventoryPersistence: {
                databaseAvailable: false,
                fallbackUsed: true,
                error: 'Persisted MCP inventory is unavailable: SQLite runtime is unavailable for this run.',
            },
            executionEnvironment: {
                ready: true,
                preferredShellId: 'pwsh',
                preferredShellLabel: 'PowerShell 7',
                shellCount: 1,
                verifiedShellCount: 1,
                toolCount: 2,
                verifiedToolCount: 2,
                harnessCount: 1,
                verifiedHarnessCount: 1,
                supportsPowerShell: true,
                supportsPosixShell: false,
                notes: [],
            },
        });

        expect(snapshot.ready).toBe(false);
        expect(snapshot.summary).toContain('Degraded services: Persisted MCP inventory is unavailable: SQLite runtime is unavailable for this run.');
        expect(snapshot.checks.mcpAggregator.inventoryPersistence).toEqual({
            databaseAvailable: false,
            fallbackUsed: true,
            error: 'Persisted MCP inventory is unavailable: SQLite runtime is unavailable for this run.',
        });
    });

    it('uses persistence degradation detail for the inventory blocker when no fallback inventory is available', async () => {
        const snapshot = await buildStartupStatusSnapshot({
            mcpServer: {
                memoryManager: {},
                isMemoryInitialized: true,
                getBridgeStatus: () => ({
                    ready: true,
                    clientCount: 0,
                    clients: [],
                    supportedCapabilities: [],
                    supportedHookPhases: [],
                }),
            },
            aggregator: {
                getInitializationStatus: () => ({
                    inProgress: false,
                    initialized: true,
                    connectedClientCount: 0,
                    configuredServerCount: 1,
                }),
            },
            agentMemory: {},
            browserService: {},
            browserStatus: { active: false, pageCount: 0, pageIds: [] },
            sessionSupervisor: {
                getRestoreStatus: () => ({
                    lastRestoreAt: 1_700_000_000_000,
                    restoredSessionCount: 0,
                    autoResumeCount: 0,
                }),
            },
            sessionCount: 0,
            mcpConfigService: {
                getStatus: () => ({
                    inProgress: false,
                    lastCompletedAt: 1_700_000_000_000,
                    lastSuccessAt: 1_700_000_000_000,
                    lastServerCount: 1,
                    lastToolCount: 0,
                }),
            },
            liveServerCount: 0,
            persistedServerCount: 0,
            persistedToolCount: 0,
            persistedAlwaysOnServerCount: 0,
            persistedAlwaysOnToolCount: 0,
            inventorySource: 'empty',
            inventoryPersistence: {
                databaseAvailable: false,
                fallbackUsed: true,
                error: 'Persisted MCP inventory is unavailable: SQLite runtime is unavailable for this run.',
            },
            executionEnvironment: {
                ready: true,
                preferredShellId: 'pwsh',
                preferredShellLabel: 'PowerShell 7',
                shellCount: 1,
                verifiedShellCount: 1,
                toolCount: 2,
                verifiedToolCount: 2,
                harnessCount: 1,
                verifiedHarnessCount: 1,
                supportsPowerShell: true,
                supportsPosixShell: false,
                notes: [],
            },
        });

        expect(snapshot.blockingReasons).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    code: 'mcp_inventory_not_ready',
                    detail: 'Persisted MCP inventory is unavailable: SQLite runtime is unavailable for this run.',
                }),
            ]),
        );
        expect(snapshot.checks.mcpAggregator.inventoryPersistence.databaseAvailable).toBe(false);
    });
});
