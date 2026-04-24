export interface SystemStartupStatusInput {
    status?: string;
    ready?: boolean;
    uptime?: number;
    summary?: string;
    runtime?: {
        nodeEnv?: string | null;
        platform?: string | null;
        version?: string | null;
    };
    checks?: {
        mcpAggregator?: {
            ready?: boolean;
            liveReady?: boolean;
            residentReady?: boolean;
            lazySessionMode?: boolean;
            connectedCount?: number;
            residentConnectedCount?: number;
            warmingServerCount?: number;
            failedWarmupServerCount?: number;
            persistedServerCount?: number;
            persistedToolCount?: number;
            configuredServerCount?: number;
            advertisedServerCount?: number;
            advertisedToolCount?: number;
            advertisedAlwaysOnServerCount?: number;
            advertisedAlwaysOnToolCount?: number;
            inventoryReady?: boolean;
            warmupInProgress?: boolean;
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
        memory?: {
            ready?: boolean;
            initialized?: boolean;
            sectionedMemory?: {
                ready?: boolean;
                enabled?: boolean;
                storeExists?: boolean;
                storePath?: string | null;
                totalEntries?: number;
                sectionCount?: number;
                defaultSectionCount?: number;
                presentDefaultSectionCount?: number;
                missingSections?: string[];
                lastUpdatedAt?: string | null;
            };
        };
        extensionBridge?: {
            ready?: boolean;
            port?: number | null;
            acceptingConnections?: boolean;
            clientCount?: number;
            hasConnectedClients?: boolean;
        };
        executionEnvironment?: {
            ready?: boolean;
            preferredShellLabel?: string | null;
            shellCount?: number;
            verifiedShellCount?: number;
            toolCount?: number;
            verifiedToolCount?: number;
        };
        importedSessions?: {
            totalSessions?: number;
            inlineTranscriptCount?: number;
            archivedTranscriptCount?: number;
            missingRetentionSummaryCount?: number;
        };
    };
}

export interface SystemStartupCheckRow {
    name: string;
    status: 'Operational' | 'Pending';
    latency: string;
    detail: string;
}

export interface SystemComponentHealthRow {
    name: string;
    status: 'Operational' | 'Pending' | 'Unavailable';
    latency: string;
    detail: string;
}

export interface SystemStatusCardSummary {
    status: string;
    detail: string;
}

function formatPortDetail(label: string, port: number | null): string {
    return port === null
        ? `${label} unavailable`
        : `${label} :${port}`;
}

export interface SystemBrowserStatusInput {
    available?: boolean;
    active?: boolean;
    pageCount?: number;
}

export interface SystemStartupNotice {
    title: string;
    detail: string;
    tone: 'warning' | 'info';
}

export interface SystemEnvironmentRow {
    label: 'NODE_ENV' | 'PLATFORM' | 'UPTIME' | 'VERSION';
    value: string;
    accent?: boolean;
}

export interface SystemInstallSurfaceArtifactInput {
    id: string;
    status: 'ready' | 'partial' | 'missing';
}

const BROWSER_EXTENSION_SURFACE_IDS = [
    'browser-extension-chromium',
    'browser-extension-firefox',
] as const;

function getBrowserExtensionArtifactSummary(artifacts?: SystemInstallSurfaceArtifactInput[] | null): {
    readyCount: number;
    totalCount: number;
    missingFirefoxBundle: boolean;
    missingChromiumBundle: boolean;
    hasPartialFirefoxBundle: boolean;
    isDetecting: boolean;
    allReady: boolean;
} {
    const normalizedArtifacts = (Array.isArray(artifacts) ? artifacts : [])
        .filter((artifact): artifact is SystemInstallSurfaceArtifactInput => Boolean(artifact) && typeof artifact === 'object' && typeof artifact.id === 'string');
    const relevantArtifacts = normalizedArtifacts.filter((artifact) => BROWSER_EXTENSION_SURFACE_IDS.includes(artifact.id as (typeof BROWSER_EXTENSION_SURFACE_IDS)[number]));
    const totalCount = BROWSER_EXTENSION_SURFACE_IDS.length;

    if (relevantArtifacts.length === 0) {
        return {
            readyCount: 0,
            totalCount,
            missingFirefoxBundle: false,
            missingChromiumBundle: false,
            hasPartialFirefoxBundle: false,
            isDetecting: true,
            allReady: false,
        };
    }

    const chromium = relevantArtifacts.find((artifact) => artifact.id === 'browser-extension-chromium');
    const firefox = relevantArtifacts.find((artifact) => artifact.id === 'browser-extension-firefox');
    const readyCount = relevantArtifacts.filter((artifact) => artifact.status === 'ready').length;

    return {
        readyCount,
        totalCount,
        missingFirefoxBundle: firefox?.status === 'missing',
        missingChromiumBundle: chromium?.status === 'missing',
        hasPartialFirefoxBundle: firefox?.status === 'partial',
        isDetecting: false,
        allReady: readyCount === totalCount,
    };
}

function getBrowserExtensionArtifactDetail(artifacts?: SystemInstallSurfaceArtifactInput[] | null): string {
    const summary = getBrowserExtensionArtifactSummary(artifacts);

    if (summary.isDetecting) {
        return 'Detecting Chromium and Firefox extension install artifacts from the workspace.';
    }

    if (summary.allReady) {
        return 'Chromium/Edge and Firefox extension bundles are ready to load.';
    }

    if (summary.hasPartialFirefoxBundle) {
        return 'Chromium/Edge bundle is ready, but Firefox still needs its browser-specific build output.';
    }

    if (summary.missingChromiumBundle && summary.missingFirefoxBundle) {
        return 'Neither browser extension bundle has been built yet.';
    }

    if (summary.missingChromiumBundle) {
        return 'Firefox bundle is ready, but Chromium/Edge still needs its unpacked build output.';
    }

    if (summary.missingFirefoxBundle) {
        return 'Chromium/Edge bundle is ready, but Firefox still needs its unpacked build output.';
    }

    return `${summary.readyCount}/${summary.totalCount} browser extension bundles are ready.`;
}

function isStartupTelemetryConnecting(startupStatus: SystemStartupStatusInput | undefined): boolean {
    return !startupStatus?.checks;
}

export function formatUptimeSeconds(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined || Number.isNaN(seconds) || seconds < 0) {
        return '—';
    }

    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const days = Math.floor(totalSeconds / 86400);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return parts.join(' ');
}

export function buildSystemEnvironmentRows(startupStatus: SystemStartupStatusInput | undefined): SystemEnvironmentRow[] {
    const nodeEnv = typeof startupStatus?.runtime?.nodeEnv === 'string'
        ? startupStatus.runtime.nodeEnv.trim()
        : '';
    const platform = typeof startupStatus?.runtime?.platform === 'string'
        ? startupStatus.runtime.platform.trim()
        : '';
    const version = typeof startupStatus?.runtime?.version === 'string'
        ? startupStatus.runtime.version.trim()
        : '';

    return [
        {
            label: 'NODE_ENV',
            value: nodeEnv || 'unset',
        },
        {
            label: 'PLATFORM',
            value: platform || 'unknown',
        },
        {
            label: 'UPTIME',
            value: formatUptimeSeconds(startupStatus?.uptime),
        },
        {
            label: 'VERSION',
            value: version ? `v${version.replace(/^v/i, '')}` : 'unknown',
            accent: true,
        },
    ];
}

export function buildSystemStartupNotice(startupStatus: SystemStartupStatusInput | undefined): SystemStartupNotice | null {
    if (isStartupTelemetryConnecting(startupStatus)) {
        return {
            title: 'Connecting to live telemetry',
            detail: 'Waiting for the first live startup snapshot from core so this page can replace neutral placeholders with the authoritative readiness contract.',
            tone: 'info',
        };
    }

    const summary = typeof startupStatus?.summary === 'string'
        ? startupStatus.summary.trim()
        : '';

    if (startupStatus?.status === 'degraded') {
        return {
            title: 'Compat fallback active',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/system/system-status-helpers.ts
            detail: summary || 'Live startup telemetry is unavailable, so HyperCode is showing config-backed compatibility state instead of the full core startup contract.',
=======
            detail: summary || 'Live startup telemetry is unavailable, so borg is showing config-backed compatibility state instead of the full core startup contract.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/system/system-status-helpers.ts
            tone: 'warning',
        };
    }

    if (summary && !startupStatus?.ready) {
        return {
            title: 'Startup still warming',
            detail: summary,
            tone: 'info',
        };
    }

    return null;
}

function getRouterInventoryDetail(startupStatus: SystemStartupStatusInput): string {
    const aggregator = startupStatus.checks?.mcpAggregator;
    const persistedServerCount = aggregator?.advertisedServerCount ?? aggregator?.persistedServerCount ?? 0;
    const persistedToolCount = aggregator?.advertisedToolCount ?? aggregator?.persistedToolCount ?? 0;
    const alwaysOnToolCount = aggregator?.advertisedAlwaysOnToolCount ?? 0;

    if (aggregator?.ready && aggregator.inventoryReady && persistedServerCount === 0 && persistedToolCount === 0) {
        return 'No configured servers yet · empty cached inventory is ready';
    }

    if (aggregator?.inventoryReady) {
        const alwaysOnSuffix = alwaysOnToolCount > 0
            ? ` · ${alwaysOnToolCount} always-on advertised immediately`
            : '';
        return `${persistedServerCount} cached servers · ${persistedToolCount} advertised tools${alwaysOnSuffix}`;
    }

    return 'Waiting for the first cached MCP inventory snapshot';
}

function getResidentMcpDetail(startupStatus: SystemStartupStatusInput): string {
    const aggregator = startupStatus.checks?.mcpAggregator;
    const lazySessionMode = aggregator?.lazySessionMode === true;
    const configuredServerCount = Math.max(
        aggregator?.configuredServerCount ?? 0,
        aggregator?.advertisedServerCount ?? aggregator?.persistedServerCount ?? 0,
    );
    const residentServerCount = aggregator?.advertisedAlwaysOnServerCount ?? 0;
    const residentConnectedCount = aggregator?.residentConnectedCount ?? 0;
    const warmingCount = aggregator?.warmingServerCount ?? 0;
    const failedWarmupCount = aggregator?.failedWarmupServerCount ?? 0;
    const residentReady = aggregator?.residentReady ?? ((aggregator?.liveReady ?? aggregator?.ready) && residentConnectedCount >= residentServerCount);

    if (lazySessionMode) {
        if (configuredServerCount === 0) {
            return 'No downstream servers configured · on-demand MCP launches are ready when needed';
        }

        return `${configuredServerCount} configured server${configuredServerCount === 1 ? '' : 's'} are in deferred lazy mode · downstream binaries launch on first tool call`;
    }

    if (residentServerCount === 0) {
        if (configuredServerCount === 0) {
            return 'No downstream servers configured · on-demand MCP launches are ready when needed';
        }

        return `${configuredServerCount} on-demand server${configuredServerCount === 1 ? '' : 's'} can launch when needed · no resident MCP runtime is required`;
    }

    if (residentReady) {
        return `${residentConnectedCount}/${residentServerCount || residentConnectedCount} resident server connections ready · on-demand tools can still cold-start as needed`;
    }

    if (aggregator?.inventoryReady) {
        const suffixes = [
            warmingCount > 0 ? `${warmingCount} warming` : null,
            failedWarmupCount > 0 ? `${failedWarmupCount} failed` : null,
        ].filter(Boolean);
        const postureSuffix = suffixes.length > 0 ? ` · ${suffixes.join(' · ')}` : '';
        return `Cached inventory is already advertised · resident always-on servers are still warming · on-demand tools remain launchable${postureSuffix}`;
    }

    return 'Waiting for resident MCP runtime initialization';
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

function getExecutionEnvironmentDetail(startupStatus: SystemStartupStatusInput): string {
    const execution = startupStatus.checks?.executionEnvironment;

    if (execution?.preferredShellLabel) {
        return `${execution.preferredShellLabel} preferred · ${execution.verifiedToolCount ?? 0}/${execution.toolCount ?? 0} verified tools`;
    }

    return `${execution?.verifiedShellCount ?? 0}/${execution?.shellCount ?? 0} verified shells`;
}

function getImportedSessionsDetail(startupStatus: SystemStartupStatusInput): string {
    const imported = startupStatus.checks?.importedSessions;
    const totalSessions = Number(imported?.totalSessions ?? 0);
    const archivedTranscriptCount = Number(imported?.archivedTranscriptCount ?? 0);
    const inlineTranscriptCount = Number(imported?.inlineTranscriptCount ?? 0);
    const missingRetentionSummaryCount = Number(imported?.missingRetentionSummaryCount ?? 0);

    if (totalSessions === 0) {
        return 'No imported sessions have been persisted yet';
    }

    const parts = [
        `${archivedTranscriptCount}/${totalSessions} archived`,
        `${inlineTranscriptCount} inline`,
    ];
    if (missingRetentionSummaryCount > 0) {
        parts.push(`${missingRetentionSummaryCount} missing retention summaries`);
    } else {
        parts.push('retention summaries complete');
    }

    return parts.join(' · ');
}

function getImportedSessionsStatus(startupStatus: SystemStartupStatusInput): 'Operational' | 'Pending' {
    const imported = startupStatus.checks?.importedSessions;
    const totalSessions = Number(imported?.totalSessions ?? 0);
    const inlineTranscriptCount = Number(imported?.inlineTranscriptCount ?? 0);
    const missingRetentionSummaryCount = Number(imported?.missingRetentionSummaryCount ?? 0);

    if (totalSessions === 0) {
        return 'Operational';
    }

    return inlineTranscriptCount === 0 && missingRetentionSummaryCount === 0
        ? 'Operational'
        : 'Pending';
}

function getMemoryContextDetail(startupStatus: SystemStartupStatusInput): string {
    const memory = startupStatus.checks?.memory;
    const sectionedMemory = memory?.sectionedMemory;

    if (memory?.ready) {
        if (sectionedMemory?.enabled) {
            return 'Memory manager initialized and sectioned memory default sections are ready';
        }

        return 'Memory manager initialized and context services are available';
    }

    if (!memory?.initialized) {
        return 'Memory initialization is still in progress';
    }

    if (sectionedMemory?.enabled) {
        if (!sectionedMemory.storeExists) {
            return 'Memory manager is initialized, but the sectioned memory store has not been created yet';
        }

        const presentSectionCount = Number(sectionedMemory.presentDefaultSectionCount ?? 0);
        const defaultSectionCount = Number(sectionedMemory.defaultSectionCount ?? 0);
        if (defaultSectionCount > 0 && presentSectionCount < defaultSectionCount) {
            return `Memory manager is initialized, but sectioned memory is still seeding default sections (${presentSectionCount}/${defaultSectionCount} present)`;
        }

        return 'Memory manager is initialized, but sectioned memory readiness is still pending';
    }

    return 'Memory manager is present, but agent context wiring is still finishing';
}

function getResidentRuntimeStatus(startupStatus: SystemStartupStatusInput): 'Operational' | 'Pending' {
    const aggregator = startupStatus.checks?.mcpAggregator;
    const lazySessionMode = aggregator?.lazySessionMode === true;
    const residentCount = aggregator?.advertisedAlwaysOnServerCount ?? 0;
    const residentConnectedCount = aggregator?.residentConnectedCount ?? 0;
    const liveReady = aggregator?.liveReady ?? aggregator?.ready;

    if (lazySessionMode) {
        return liveReady ? 'Operational' : 'Pending';
    }

    if (residentCount === 0) {
        return liveReady ? 'Operational' : 'Pending';
    }

    return (aggregator?.residentReady ?? (liveReady && residentConnectedCount >= residentCount))
        ? 'Operational'
        : 'Pending';
}

export function buildSystemStatusCards(
    startupStatus: SystemStartupStatusInput | undefined,
    mcpInitialized: boolean,
    installSurfaceArtifacts?: SystemInstallSurfaceArtifactInput[] | null,
    dashboardPort?: number | null,
): {
    mcpServer: SystemStatusCardSummary;
    cachedInventory: SystemStatusCardSummary;
    extensionBridge: SystemStatusCardSummary;
    extensionArtifacts: SystemStatusCardSummary;
    network: SystemStatusCardSummary;
    startupReadiness: SystemStatusCardSummary;
} {
    const startupChecks = startupStatus ? buildSystemStartupChecks(startupStatus, installSurfaceArtifacts) : [];
    const startupTelemetryConnecting = isStartupTelemetryConnecting(startupStatus);
    const startupSummary = typeof startupStatus?.summary === 'string'
        ? startupStatus.summary.trim()
        : '';
    const extensionArtifactSummary = getBrowserExtensionArtifactSummary(installSurfaceArtifacts);
    const bridge = startupStatus?.checks?.extensionBridge;
    const cachedServerCount = startupStatus?.checks?.mcpAggregator?.advertisedServerCount
        ?? startupStatus?.checks?.mcpAggregator?.persistedServerCount
        ?? 0;
    const cachedToolCount = startupStatus?.checks?.mcpAggregator?.advertisedToolCount
        ?? startupStatus?.checks?.mcpAggregator?.persistedToolCount
        ?? 0;
    const bridgeOperational = bridge?.acceptingConnections ?? bridge?.ready;
    const bridgeClientCount = bridge?.clientCount ?? 0;
    const bridgePort = Number.isInteger(bridge?.port) ? Number(bridge?.port) : null;
    const hasDashboardPort = Number.isInteger(dashboardPort);
    const hasBridgePort = bridgePort !== null;
    const networkStatus = startupTelemetryConnecting && !hasDashboardPort && !hasBridgePort
        ? 'Connecting'
        : hasDashboardPort && hasBridgePort
        ? 'Active'
        : hasDashboardPort || hasBridgePort
        ? 'Partial'
        : 'Pending';
    const networkDetail = startupTelemetryConnecting && !hasDashboardPort && !hasBridgePort
        ? 'Waiting for runtime port telemetry from the dashboard and extension bridge.'
        : [
            formatPortDetail('Dashboard', hasDashboardPort ? Number(dashboardPort) : null),
            bridgeOperational
                ? formatPortDetail('Extension bridge', bridgePort)
                : 'Extension bridge listener offline',
        ].join(' · ');

    return {
        mcpServer: {
            status: startupTelemetryConnecting ? 'Connecting' : (mcpInitialized ? 'Healthy' : 'Initializing'),
            detail: startupTelemetryConnecting
                ? 'Waiting for the first live startup snapshot from core.'
                : startupStatus?.checks?.mcpAggregator?.inventoryReady
                ? 'Cached inventory advertised to clients'
                : 'Waiting for cached inventory',
        },
        cachedInventory: {
            status: startupTelemetryConnecting ? 'Connecting' : (startupStatus?.checks?.mcpAggregator?.inventoryReady ? 'Ready' : 'Pending'),
            detail: startupTelemetryConnecting
                ? 'Waiting for the first live startup snapshot from core.'
                : `${cachedServerCount} cached server${cachedServerCount === 1 ? '' : 's'} · ${cachedToolCount} tools`,
        },
        extensionBridge: {
            status: startupTelemetryConnecting ? 'Connecting' : (bridgeOperational ? 'Listening' : 'Starting'),
            detail: startupTelemetryConnecting
                ? 'Waiting for the first live startup snapshot from core.'
                : bridgeOperational
                ? `${bridgeClientCount} connected bridge client${bridgeClientCount === 1 ? '' : 's'}`
                : 'Browser/editor listener still warming',
        },
        extensionArtifacts: {
            status: extensionArtifactSummary.isDetecting
                ? 'Connecting'
                : extensionArtifactSummary.allReady
                    ? 'Ready'
                    : extensionArtifactSummary.readyCount > 0
                        ? 'Partial'
                        : 'Pending',
            detail: getBrowserExtensionArtifactDetail(installSurfaceArtifacts),
        },
        network: {
            status: networkStatus,
            detail: networkDetail,
        },
        startupReadiness: {
            status: startupTelemetryConnecting
                ? 'Connecting'
                : startupStatus?.status === 'degraded'
                ? 'Degraded'
                : startupStatus?.checks
                    ? (startupChecks.every((check) => check.status === 'Operational') ? 'Ready' : 'Warming')
                    : 'Loading',
            detail: startupTelemetryConnecting
                ? 'Connecting to live startup telemetry from core.'
                : startupStatus?.status === 'degraded'
                ? (startupSummary || 'Live startup telemetry is unavailable.')
                : startupStatus?.checks
                    ? `${startupChecks.filter((check) => check.status === 'Operational').length}/${startupChecks.length} checks ready`
                    : 'Loading startup state',
        },
    };
}

export function buildSystemComponentHealthRows(
    startupStatus: SystemStartupStatusInput | undefined,
    browserStatus: SystemBrowserStatusInput | undefined,
    installSurfaceArtifacts?: SystemInstallSurfaceArtifactInput[] | null,
): SystemComponentHealthRow[] {
    const startupTelemetryConnecting = isStartupTelemetryConnecting(startupStatus);
    const extensionArtifactSummary = getBrowserExtensionArtifactSummary(installSurfaceArtifacts);
    const bridge = startupStatus?.checks?.extensionBridge;
    const execution = startupStatus?.checks?.executionEnvironment;
    const inventoryReady = startupStatus?.checks?.mcpAggregator?.inventoryReady ?? false;
    const advertisedServerCount = startupStatus?.checks?.mcpAggregator?.advertisedServerCount
        ?? startupStatus?.checks?.mcpAggregator?.persistedServerCount
        ?? 0;
    const persistedServerCount = startupStatus?.checks?.mcpAggregator?.persistedServerCount ?? advertisedServerCount;

    return [
        {
            name: 'Core API',
            status: startupTelemetryConnecting ? 'Pending' : (startupStatus?.status === 'running' ? 'Operational' : 'Pending'),
            latency: startupTelemetryConnecting ? 'connecting' : (startupStatus?.ready ? 'ready' : 'warming'),
            detail: startupTelemetryConnecting
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/system/system-status-helpers.ts
                ? 'Connecting to live startup telemetry from HyperCode Core.'
                : startupStatus?.ready
                ? 'Authoritative startup contract is online and reporting readiness.'
                : 'Waiting for HyperCode Core startup checks to finish reporting.',
=======
                ? 'Connecting to live startup telemetry from borg Core.'
                : startupStatus?.ready
                ? 'Authoritative startup contract is online and reporting readiness.'
                : 'Waiting for borg Core startup checks to finish reporting.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/system/system-status-helpers.ts
        },
        {
            name: 'Cached MCP inventory',
            status: startupTelemetryConnecting ? 'Pending' : (inventoryReady ? 'Operational' : 'Pending'),
            latency: startupTelemetryConnecting ? 'connecting' : `${advertisedServerCount}/${persistedServerCount} cached`,
            detail: startupTelemetryConnecting
                ? 'Waiting for the first live startup snapshot from core.'
                : inventoryReady
                ? 'Last-known-good MCP servers/tools are already advertised for clients.'
                : 'Waiting for the first cached MCP inventory snapshot.',
        },
        {
            name: 'Resident MCP runtime',
            status: getResidentRuntimeStatus(startupStatus ?? {}),
            latency: `${startupStatus?.checks?.mcpAggregator?.residentConnectedCount ?? 0}/${startupStatus?.checks?.mcpAggregator?.advertisedAlwaysOnServerCount ?? 0} resident`,
            detail: getResidentMcpDetail(startupStatus ?? {}),
        },
        {
            name: 'Browser runtime',
            status: browserStatus?.available ? 'Operational' : 'Unavailable',
            latency: browserStatus?.available ? `${browserStatus?.pageCount ?? 0} pages` : '-',
            detail: browserStatus?.available
                ? 'Browser automation/runtime endpoints are online.'
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/system/system-status-helpers.ts
                : 'Browser runtime is not currently reachable from HyperCode.',
=======
                : 'Browser runtime is not currently reachable from borg.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/system/system-status-helpers.ts
        },
        {
            name: 'Extension bridge',
            status: (bridge?.acceptingConnections ?? bridge?.ready) ? 'Operational' : 'Pending',
            latency: `${bridge?.clientCount ?? 0} clients`,
            detail: getExtensionBridgeDetail(startupStatus ?? {}),
        },
        {
            name: 'Extension install artifacts',
            status: extensionArtifactSummary.isDetecting
                ? 'Pending'
                : extensionArtifactSummary.allReady
                    ? 'Operational'
                    : 'Pending',
            latency: extensionArtifactSummary.isDetecting
                ? 'detecting'
                : `${extensionArtifactSummary.readyCount}/${extensionArtifactSummary.totalCount} ready`,
            detail: getBrowserExtensionArtifactDetail(installSurfaceArtifacts),
        },
        {
            name: 'Execution environment',
            status: execution?.ready ? 'Operational' : 'Pending',
            latency: `${execution?.verifiedToolCount ?? 0}/${execution?.toolCount ?? 0} tools`,
            detail: execution?.ready
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/system/system-status-helpers.ts
                ? `${execution?.preferredShellLabel ?? 'Preferred shell'} is available for HyperCode task execution.`
=======
                ? `${execution?.preferredShellLabel ?? 'Preferred shell'} is available for borg task execution.`
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/system/system-status-helpers.ts
                : 'Waiting for shell and tool verification to complete.',
        },
    ];
}

export function buildSystemStartupChecks(
    startupStatus: SystemStartupStatusInput,
    installSurfaceArtifacts?: SystemInstallSurfaceArtifactInput[] | null,
): SystemStartupCheckRow[] {
    if (isStartupTelemetryConnecting(startupStatus)) {
        return [
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
        ];
    }

    const aggregator = startupStatus.checks?.mcpAggregator;
    const restore = startupStatus.checks?.sessionSupervisor?.restore;
    const memory = startupStatus.checks?.memory;
    const extensionBridge = startupStatus.checks?.extensionBridge;
    const extensionBridgeOperational = extensionBridge?.acceptingConnections ?? extensionBridge?.ready;
    const persistedToolCount = aggregator?.advertisedToolCount ?? aggregator?.persistedToolCount ?? 0;
    const sessionCount = startupStatus.checks?.sessionSupervisor?.sessionCount ?? 0;
    const bridgeClientCount = extensionBridge?.clientCount ?? 0;
    const execution = startupStatus.checks?.executionEnvironment;
    const importedSessions = startupStatus.checks?.importedSessions;
    const residentConnectedCount = aggregator?.residentConnectedCount ?? 0;
    const warmingCount = aggregator?.warmingServerCount ?? 0;
    const failedWarmupCount = aggregator?.failedWarmupServerCount ?? 0;
    const residentCount = aggregator?.advertisedAlwaysOnServerCount ?? 0;
    const lazySessionMode = aggregator?.lazySessionMode === true;
    const extensionArtifactSummary = getBrowserExtensionArtifactSummary(installSurfaceArtifacts);

    return [
        {
            name: 'Cached Inventory',
            status: aggregator?.inventoryReady ? 'Operational' : 'Pending',
            latency: `${persistedToolCount} tools`,
            detail: getRouterInventoryDetail(startupStatus),
        },
        {
            name: 'Resident MCP Runtime',
            status: getResidentRuntimeStatus(startupStatus),
            latency: lazySessionMode
                ? `deferred lazy mode · ${aggregator?.configuredServerCount ?? aggregator?.advertisedServerCount ?? aggregator?.persistedServerCount ?? 0} configured`
                : `${residentConnectedCount}/${residentCount || residentConnectedCount} servers${warmingCount > 0 ? ` · ${warmingCount} warming` : ''}${failedWarmupCount > 0 ? ` · ${failedWarmupCount} failed` : ''}`,
            detail: getResidentMcpDetail(startupStatus),
        },
        {
            name: 'Memory / Context',
            status: memory?.ready ? 'Operational' : 'Pending',
            latency: memory?.initialized ? 'initialized' : '-',
            detail: getMemoryContextDetail(startupStatus),
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
        {
            name: 'Execution Environment',
            status: execution?.ready ? 'Operational' : 'Pending',
            latency: `${execution?.verifiedToolCount ?? 0} tools`,
            detail: getExecutionEnvironmentDetail(startupStatus),
        },
        {
            name: 'Imported Sessions',
            status: getImportedSessionsStatus(startupStatus),
            latency: `${Number(importedSessions?.archivedTranscriptCount ?? 0)}/${Number(importedSessions?.totalSessions ?? 0)} archived`,
            detail: getImportedSessionsDetail(startupStatus),
        },
        {
            name: 'Extension Install Artifacts',
            status: extensionArtifactSummary.allReady ? 'Operational' : 'Pending',
            latency: extensionArtifactSummary.isDetecting ? 'detecting' : `${extensionArtifactSummary.readyCount}/${extensionArtifactSummary.totalCount} ready`,
            detail: getBrowserExtensionArtifactDetail(installSurfaceArtifacts),
        },
    ];
}
