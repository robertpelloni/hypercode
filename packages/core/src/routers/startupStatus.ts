import type { RegisteredBridgeClient } from '../bridge/bridge-manifest.js';

type StartupStatusInput = {
    mcpServer: unknown;
    aggregator?: {
        getInitializationStatus?: () => {
            inProgress: boolean;
            initialized: boolean;
            lastStartedAt?: number;
            lastCompletedAt?: number;
            lastSuccessAt?: number;
            lastError?: string;
            connectedClientCount: number;
            configuredServerCount: number;
        };
    } | null;
    agentMemory?: unknown;
    browserService?: unknown;
    browserStatus: {
        active?: boolean;
        pageCount?: number;
        pageIds?: string[];
    };
    sessionSupervisor?: {
        getRestoreStatus?: () => {
            lastRestoreAt?: number;
            restoredSessionCount: number;
            autoResumeCount: number;
        };
    } | null;
    sessionCount: number;
    mcpConfigService?: {
        getStatus?: () => {
            inProgress: boolean;
            lastStartedAt?: number;
            lastCompletedAt?: number;
            lastSuccessAt?: number;
            lastError?: string;
            lastServerCount: number;
            lastToolCount: number;
        };
    } | null;
    liveServerCount: number;
    persistedServerCount: number;
    persistedToolCount: number;
};

export async function buildStartupStatusSnapshot(input: StartupStatusInput) {
    const {
        mcpServer,
        aggregator,
        agentMemory,
        browserService,
        browserStatus,
        sessionSupervisor,
        sessionCount,
        mcpConfigService,
        liveServerCount,
        persistedServerCount,
        persistedToolCount,
    } = input;
    const mcpServerRuntime = mcpServer as {
        memoryManager?: unknown;
        isMemoryInitialized?: boolean;
        getBridgeStatus?: () => {
            ready?: boolean;
            clientCount?: number;
            clients?: RegisteredBridgeClient[];
            supportedCapabilities?: string[];
            supportedHookPhases?: string[];
        };
    };

    const aggregatorStatus = aggregator?.getInitializationStatus?.();
    const configSyncStatus = mcpConfigService?.getStatus?.();
    const restoreStatus = sessionSupervisor?.getRestoreStatus?.();
    const bridgeStatus = mcpServerRuntime.getBridgeStatus?.() ?? {
        ready: false,
        clientCount: 0,
        clients: [],
        supportedCapabilities: [],
        supportedHookPhases: [],
    };

    const bridgeClientCount = Number(bridgeStatus.clientCount ?? 0);
    const bridgeReady = Boolean(bridgeStatus.ready);
    const hasConnectedBridgeClients = bridgeClientCount > 0;
    const memoryInitialized = Boolean(mcpServerRuntime.isMemoryInitialized);
    const memoryReady = Boolean(mcpServerRuntime.memoryManager && agentMemory && memoryInitialized);
    const sessionReady = Boolean(sessionSupervisor);
    const browserReady = Boolean(browserService);
    const mcpReady = Boolean(aggregator);
    const configSyncReady = Boolean(configSyncStatus?.lastCompletedAt) && !configSyncStatus?.inProgress && !configSyncStatus?.lastError;
    const sessionRestoreReady = Boolean(restoreStatus?.lastRestoreAt);
    const configuredServerCount = Number(
        configSyncStatus?.lastServerCount
        ?? aggregatorStatus?.configuredServerCount
        ?? persistedServerCount,
    );
    const knownServerCount = Math.max(liveServerCount, persistedServerCount, configuredServerCount);
    const inventoryKnown = Boolean(configSyncStatus?.lastCompletedAt || aggregatorStatus?.initialized);
    const inventoryReady = inventoryKnown && (
        configuredServerCount === 0
        || persistedServerCount > 0
        || persistedToolCount > 0
        || liveServerCount > 0
    );
    const aggregatorReady = Boolean(aggregatorStatus?.initialized);

    return {
        status: 'running',
        ready: mcpReady
            && memoryReady
            && browserReady
            && sessionReady
            && bridgeReady
            && configSyncReady
            && sessionRestoreReady
            && inventoryReady
            && aggregatorReady,
        uptime: process.uptime(),
        checks: {
            mcpAggregator: {
                ready: mcpReady && aggregatorReady,
                serverCount: knownServerCount,
                connectedCount: liveServerCount,
                initialization: aggregatorStatus ?? null,
                persistedServerCount,
                persistedToolCount,
                configuredServerCount,
                inventoryReady,
            },
            configSync: {
                ready: configSyncReady,
                status: configSyncStatus ?? null,
            },
            memory: {
                ready: memoryReady,
                initialized: memoryInitialized,
                agentMemory: Boolean(agentMemory),
            },
            browser: {
                ready: browserReady,
                active: Boolean(browserStatus.active),
                pageCount: Number(browserStatus.pageCount ?? 0),
            },
            sessionSupervisor: {
                ready: sessionReady && sessionRestoreReady,
                sessionCount,
                restore: restoreStatus ?? null,
            },
            extensionBridge: {
                ready: bridgeReady,
                acceptingConnections: bridgeReady,
                clientCount: bridgeClientCount,
                hasConnectedClients: hasConnectedBridgeClients,
                clients: bridgeStatus.clients ?? [],
                supportedCapabilities: bridgeStatus.supportedCapabilities ?? [],
                supportedHookPhases: bridgeStatus.supportedHookPhases ?? [],
            },
        },
    };
}