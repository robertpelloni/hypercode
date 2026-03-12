import { describe, expect, it } from 'vitest';

import { buildStartupStatusSnapshot } from './startupStatus.js';

describe('buildStartupStatusSnapshot', () => {
    it('treats an empty but fully initialized router inventory as ready', async () => {
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
        });

        expect(snapshot.ready).toBe(true);
        expect(snapshot.checks.mcpAggregator.inventoryReady).toBe(true);
        expect(snapshot.checks.extensionBridge.ready).toBe(true);
        expect(snapshot.checks.extensionBridge.hasConnectedClients).toBe(false);
    });

    it('keeps startup pending when the bridge listener is offline', async () => {
        const snapshot = await buildStartupStatusSnapshot({
            mcpServer: {
                memoryManager: {},
                isMemoryInitialized: true,
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
        });

        expect(snapshot.ready).toBe(false);
        expect(snapshot.checks.extensionBridge.ready).toBe(false);
        expect(snapshot.checks.extensionBridge.acceptingConnections).toBe(false);
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
                            clientName: 'Borg VS Code Bridge',
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
        });

        expect(snapshot.ready).toBe(true);
        expect(snapshot.checks.mcpAggregator.serverCount).toBe(7);
        expect(snapshot.checks.mcpAggregator.connectedCount).toBe(0);
        expect(snapshot.checks.mcpAggregator.persistedServerCount).toBe(7);
    });
});