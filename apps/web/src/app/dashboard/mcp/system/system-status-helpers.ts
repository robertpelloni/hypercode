export interface SystemStartupStatusInput {
    checks?: {
        mcpAggregator?: {
            ready?: boolean;
            persistedServerCount?: number;
            persistedToolCount?: number;
            inventoryReady?: boolean;
        };
        configSync?: {
            ready?: boolean;
            status?: {
                inProgress?: boolean;
                lastServerCount?: number;
                lastToolCount?: number;
            } | null;
        };
        sessionSupervisor?: {
            ready?: boolean;
            sessionCount?: number;
            restore?: {
                restoredSessionCount?: number;
                autoResumeCount?: number;
            } | null;
        };
        extensionBridge?: {
            ready?: boolean;
            acceptingConnections?: boolean;
            clientCount?: number;
            hasConnectedClients?: boolean;
        };
    };
}

export interface SystemStartupCheckRow {
    name: string;
    status: 'Operational' | 'Pending';
    latency: string;
    detail: string;
}

function getRouterInventoryDetail(startupStatus: SystemStartupStatusInput): string {
    const aggregator = startupStatus.checks?.mcpAggregator;
    const persistedServerCount = aggregator?.persistedServerCount ?? 0;
    const persistedToolCount = aggregator?.persistedToolCount ?? 0;

    if (aggregator?.ready && aggregator.inventoryReady && persistedServerCount === 0 && persistedToolCount === 0) {
        return 'No configured servers yet · empty inventory is ready';
    }

    return `${persistedServerCount} persisted servers`;
}

function getExtensionBridgeDetail(startupStatus: SystemStartupStatusInput): string {
    const extensionBridge = startupStatus.checks?.extensionBridge;
    const clientCount = extensionBridge?.clientCount ?? 0;
    const acceptingConnections = extensionBridge?.acceptingConnections ?? extensionBridge?.ready;
    const hasConnectedClients = extensionBridge?.hasConnectedClients ?? clientCount > 0;

    if (acceptingConnections) {
        if (hasConnectedClients) {
            return 'Browser/editor client bridge is accepting connections';
        }

        return 'Browser/editor client bridge is ready, but no IDE or browser adapters have connected yet.';
    }

    return 'Browser/editor client bridge is still coming online';
}

export function buildSystemStartupChecks(startupStatus: SystemStartupStatusInput): SystemStartupCheckRow[] {
    const configSync = startupStatus.checks?.configSync?.status;
    const aggregator = startupStatus.checks?.mcpAggregator;
    const restore = startupStatus.checks?.sessionSupervisor?.restore;
    const extensionBridge = startupStatus.checks?.extensionBridge;
    const extensionBridgeOperational = extensionBridge?.acceptingConnections ?? extensionBridge?.ready;
    const persistedToolCount = aggregator?.persistedToolCount ?? 0;
    const sessionCount = startupStatus.checks?.sessionSupervisor?.sessionCount ?? 0;
    const bridgeClientCount = extensionBridge?.clientCount ?? 0;

    return [
        {
            name: 'Config Sync',
            status: startupStatus.checks?.configSync?.ready ? 'Operational' : 'Pending',
            latency: configSync?.inProgress ? 'syncing' : '-',
            detail: configSync
                ? `${configSync.lastServerCount ?? 0} servers · ${configSync.lastToolCount ?? 0} tools`
                : 'Awaiting first sync',
        },
        {
            name: 'Router Inventory',
            status: aggregator?.ready && aggregator.inventoryReady ? 'Operational' : 'Pending',
            latency: `${persistedToolCount} tools`,
            detail: getRouterInventoryDetail(startupStatus),
        },
        {
            name: 'Session Restore',
            status: startupStatus.checks?.sessionSupervisor?.ready ? 'Operational' : 'Pending',
            latency: `${sessionCount} sessions`,
            detail: restore
                ? `${restore.restoredSessionCount ?? 0} restored · ${restore.autoResumeCount ?? 0} auto-resumed`
                : 'Restore not finished',
        },
        {
            name: 'Client Bridge',
            status: extensionBridgeOperational ? 'Operational' : 'Pending',
            latency: `${bridgeClientCount} clients`,
            detail: getExtensionBridgeDetail(startupStatus),
        },
    ];
}