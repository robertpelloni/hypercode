export type SyncTargetSummary = {
    client: string;
    path: string;
    candidates: string[];
    exists: boolean;
};

export type CliHarnessDetectionSummary = {
    installed?: boolean;
};

export type StartupStatusSummary = {
    status?: string;
    summary?: string;
    checks?: {
        extensionBridge?: {
            ready?: boolean;
            acceptingConnections?: boolean;
            clientCount?: number;
            hasConnectedClients?: boolean;
            clients?: BridgeClientSummary[];
            supportedCapabilities?: string[];
            supportedHookPhases?: string[];
        };
        executionEnvironment?: {
            ready?: boolean;
            preferredShellLabel?: string | null;
            verifiedShellCount?: number;
            shellCount?: number;
            verifiedToolCount?: number;
            toolCount?: number;
            supportsPosixShell?: boolean;
        };
    };
};

export type BridgeClientSummary = {
    clientId?: string;
    clientType?: string;
    clientName?: string;
    version?: string;
    platform?: string;
    capabilities?: string[];
    hookPhases?: string[];
    connectedAt?: number | null;
    lastSeenAt?: number | null;
};

export type BrowserStatusSummary = {
    available?: boolean;
    active?: boolean;
    pageCount?: number;
};

export type IntegrationOverview = {
    startupDegraded: boolean;
    startupSummary: string | null;
    extensionBridgeReady: boolean;
    extensionBridgeAcceptingConnections: boolean;
    hasConnectedBridgeClients: boolean;
    extensionClientCount: number;
    hookPhaseCount: number;
    browserRuntimeReady: boolean;
    browserPageCount: number;
    syncedClientCount: number;
    installedHarnessCount: number;
    totalHarnessCount: number;
    executionEnvironmentReady: boolean;
    executionPreferredShell: string | null;
    verifiedExecutionShellCount: number;
    verifiedExecutionToolCount: number;
    supportsPosixShell: boolean;
};

export type InstallSurfaceCard = {
    id: string;
    title: string;
    platforms: string;
    repoPath: string;
    buildHint: string;
    installHint: string;
    capabilities: string[];
    managementHref: string;
    managementLabel: string;
};

export type InstallSurfaceArtifactSummary = {
    id: string;
    status: 'ready' | 'partial' | 'missing';
    artifactPath: string | null;
    artifactKind: string | null;
    detail: string;
    declaredVersion: string | null;
    lastModifiedAt: string | null;
};

export type InstallSurfaceRow = InstallSurfaceCard & {
    artifactStatus: InstallSurfaceArtifactSummary;
    statusLabel: string;
    statusTone: 'success' | 'warning' | 'muted';
    nextStepLabel: string;
    nextStepDetail: string;
    operatorActionLabel: string;
    operatorActionValue: string;
    operatorActionDetail: string;
    operatorActionCopyLabel: string;
    artifactVersionLabel: string;
    artifactKindLabel: string;
    artifactUpdatedLabel: string;
    artifactTimestampLabel: string;
    artifactFreshnessLabel: string;
    artifactFreshnessTone: 'success' | 'warning' | 'muted';
};

export type ExternalClientRow = {
    id: string;
    label: string;
    windowsPath: string;
    notes: string;
    autoSyncSupported: boolean;
    detected: boolean;
    resolvedPath: string;
    statusLabel: string;
    statusTone: 'success' | 'warning' | 'muted';
};

export type ConnectedBridgeClientRow = {
    clientId: string;
    clientName: string;
    clientType: string;
    version?: string;
    platform?: string;
    capabilities: string[];
    hookPhases: string[];
    lastSeenLabel: string;
};

export const INSTALL_SURFACES: InstallSurfaceCard[] = [
    {
        id: 'browser-extension-chromium',
        title: 'Browser Extension (Chrome / Edge)',
        platforms: 'Chrome, Edge, Chromium browsers',
        repoPath: 'apps/hypercode-extension',
        buildHint: 'pnpm -C apps/hypercode-extension build',
        installHint: 'Load unpacked from apps/hypercode-extension/dist-chromium after build.',
        capabilities: [
            'Browser chat bridge + page context capture',
            'Knowledge and RAG ingestion from active pages',
            'Proxy fetch, screenshots, CDP telemetry, browser controls',
        ],
        managementHref: '/dashboard/browser',
        managementLabel: 'Open browser dashboard',
    },
    {
        id: 'browser-extension-firefox',
        title: 'Browser Extension (Firefox)',
        platforms: 'Firefox',
        repoPath: 'apps/hypercode-extension',
        buildHint: 'pnpm -C apps/hypercode-extension build:firefox',
        installHint: 'Load temporary add-on from about:debugging using apps/hypercode-extension/dist-firefox after build.',
        capabilities: [
            'Knowledge capture and page-to-RAG ingestion',
            'Extension bridge telemetry into HyperCode Core',
            'Browser history, screenshots, and active-tab tooling',
        ],
        managementHref: '/dashboard/browser',
        managementLabel: 'Open browser dashboard',
    },
    {
        id: 'vscode-extension',
        title: 'HyperCode Plugin for VS Code',
        platforms: 'VS Code / compatible forks',
        repoPath: 'packages/vscode',
        buildHint: 'pnpm -C packages/vscode build && pnpm -C packages/vscode package',
        installHint: 'Install the generated .vsix or run the extension in VS Code extension host mode.',
        capabilities: [
            'Mini dashboard inside the editor activity bar',
            'Memory search, knowledge ingestion, and tool invocation commands',
            'Terminal/editor context harvesting with Core websocket bridge',
        ],
        managementHref: '/dashboard/mcp/settings',
        managementLabel: 'Open MCP client sync',
    },
    {
        id: 'mcp-client-sync',
        title: 'MCP Client Config Sync',
        platforms: 'Claude Desktop, Cursor, VS Code',
        repoPath: 'packages/core client sync service',
        buildHint: 'No separate build required once HyperCode Core is running.',
        installHint: 'Preview and write HyperCode-managed MCP configs directly from the dashboard.',
        capabilities: [
            'Auto-detect supported client config targets',
            'Preview merged config JSON before writing',
            'Push HyperCode MCP endpoints without clobbering unrelated settings',
        ],
        managementHref: '/dashboard/mcp/settings',
        managementLabel: 'Open MCP client sync',
    },
];

export function getInstallSurfaceRows(artifactStatuses?: InstallSurfaceArtifactSummary[] | null, now = Date.now()): InstallSurfaceRow[] {
    const statusMap = new Map((artifactStatuses ?? []).map((status) => [status.id, status]));

    return INSTALL_SURFACES.map((surface) => {
        const artifactStatus = statusMap.get(surface.id) ?? {
            id: surface.id,
            status: 'missing' as const,
            artifactPath: null,
            artifactKind: null,
            detail: 'No install artifact has been detected yet.',
            declaredVersion: null,
            lastModifiedAt: null,
        };

        const nextStep = getInstallSurfaceNextStep(surface.id, artifactStatus.status);
        const freshness = getArtifactFreshness(artifactStatus.lastModifiedAt, now);
        const operatorAction = getInstallSurfaceOperatorAction(surface, artifactStatus.status, artifactStatus.artifactPath);

        return {
            ...surface,
            artifactStatus,
            statusLabel: artifactStatus.status === 'ready'
                ? 'artifact ready'
                : artifactStatus.status === 'partial'
                    ? 'source ready'
                    : 'build needed',
            statusTone: artifactStatus.status === 'ready'
                ? 'success'
                : artifactStatus.status === 'partial'
                    ? 'warning'
                    : 'muted',
            nextStepLabel: nextStep.label,
            nextStepDetail: nextStep.detail,
                operatorActionLabel: operatorAction.label,
                operatorActionValue: operatorAction.value,
                operatorActionDetail: operatorAction.detail,
                operatorActionCopyLabel: getOperatorActionCopyLabel(operatorAction.label),
            artifactVersionLabel: artifactStatus.declaredVersion ? `v${artifactStatus.declaredVersion}` : 'Not versioned',
            artifactKindLabel: artifactStatus.artifactKind ?? 'Unknown artifact kind',
            artifactUpdatedLabel: freshness.updatedLabel,
            artifactTimestampLabel: getArtifactTimestampLabel(artifactStatus.lastModifiedAt),
            artifactFreshnessLabel: freshness.label,
            artifactFreshnessTone: freshness.tone,
        };
    });
}

function getArtifactTimestampLabel(lastModifiedAt: string | null): string {
    if (!lastModifiedAt) {
        return 'Exact timestamp unavailable';
    }

    const timestamp = Date.parse(lastModifiedAt);
    if (Number.isNaN(timestamp)) {
        return 'Timestamp could not be parsed';
    }

    return `Detected ${new Date(timestamp).toISOString().replace('.000Z', 'Z')}`;
}

function getOperatorActionCopyLabel(operatorActionLabel: string): string {
    const normalized = operatorActionLabel.toLowerCase();

    if (normalized.includes('command')) {
        return 'Copy command';
    }

    if (normalized.includes('directory') || normalized.includes('manifest') || normalized.includes('path')) {
        return 'Copy path';
    }

    if (normalized.includes('dashboard') || normalized.includes('route')) {
        return 'Copy route';
    }

    return 'Copy action';
}

function getInstallSurfaceOperatorAction(
    surface: InstallSurfaceCard,
    status: InstallSurfaceArtifactSummary['status'],
    artifactPath: string | null,
): {
    label: string;
    value: string;
    detail: string;
} {
    switch (surface.id) {
        case 'browser-extension-chromium':
            if (status === 'ready' && artifactPath) {
                return {
                    label: 'Load unpacked directory',
                    value: artifactPath,
                    detail: 'Open Chrome or Edge extensions, enable developer mode, then choose this folder with “Load unpacked”.',
                };
            }

            return {
                label: 'Build command',
                value: surface.buildHint,
                detail: 'Run this first to produce the Chromium bundle HyperCode expects you to load into Chrome or Edge.',
            };
        case 'browser-extension-firefox':
            if (status === 'ready' && artifactPath) {
                return {
                    label: 'Manifest to load',
                    value: `${artifactPath}/manifest.json`,
                    detail: 'Open about:debugging, choose “Load Temporary Add-on…”, and select this manifest file.',
                };
            }

            return {
                label: 'Build command',
                value: surface.buildHint,
                detail: status === 'partial'
                    ? 'Firefox source assets exist, but this build step is still needed before Firefox can load the add-on.'
                    : 'Run this first to produce the Firefox bundle HyperCode expects you to load as a temporary add-on.',
            };
        case 'vscode-extension':
            if (status === 'ready' && artifactPath) {
                return {
                    label: 'Install command',
                    value: `code --install-extension ${artifactPath}`,
                    detail: 'Use this command from a shell, or install the same VSIX from VS Code’s “Install from VSIX…” flow.',
                };
            }

            return {
                label: status === 'partial' ? 'Package command' : 'Build and package',
                value: status === 'partial' ? 'pnpm -C packages/vscode package' : surface.buildHint,
                detail: status === 'partial'
                    ? 'The extension is already compiled; package it into a VSIX so it can be installed directly.'
                    : 'Build first, then package the extension so operators have an installable VSIX artifact.',
            };
        case 'mcp-client-sync':
            return {
                label: status === 'ready' ? 'Dashboard action' : 'Bring core online',
                value: status === 'ready' ? '/dashboard/mcp/settings' : 'pnpm run dev',
                detail: status === 'ready'
                    ? 'Open the MCP settings page to preview and write HyperCode-managed client configuration files.'
                    : 'Start HyperCode Core so the config sync page can generate and write managed MCP client configs.',
            };
    }
}

function getArtifactFreshness(lastModifiedAt: string | null, now: number): {
    label: string;
    tone: 'success' | 'warning' | 'muted';
    updatedLabel: string;
} {
    if (!lastModifiedAt) {
        return {
            label: 'unknown age',
            tone: 'muted',
            updatedLabel: 'No detected artifact timestamp',
        };
    }

    const timestamp = Date.parse(lastModifiedAt);
    if (Number.isNaN(timestamp)) {
        return {
            label: 'unknown age',
            tone: 'muted',
            updatedLabel: 'Timestamp could not be parsed',
        };
    }

    const ageMs = Math.max(0, now - timestamp);
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const updatedLabel = `Updated ${formatRelativeTime(timestamp, now)}`;

    if (ageDays <= 2) {
        return {
            label: 'fresh',
            tone: 'success',
            updatedLabel,
        };
    }

    if (ageDays <= 14) {
        return {
            label: 'aging',
            tone: 'warning',
            updatedLabel,
        };
    }

    return {
        label: 'stale',
        tone: 'muted',
        updatedLabel,
    };
}

function getInstallSurfaceNextStep(surfaceId: InstallSurfaceCard['id'], status: InstallSurfaceArtifactSummary['status']): {
    label: string;
    detail: string;
} {
    switch (surfaceId) {
        case 'browser-extension-chromium':
            if (status === 'ready') {
                return {
                    label: 'Load in Chrome / Edge',
                    detail: 'Open the browser extensions page, enable developer mode, and load the detected unpacked Chromium bundle.',
                };
            }

            return {
                label: 'Build Chromium bundle',
                detail: 'Generate the Chromium-ready browser extension output, then load the unpacked bundle into Chrome or Edge.',
            };
        case 'browser-extension-firefox':
            if (status === 'ready') {
                return {
                    label: 'Load in Firefox',
                    detail: 'Open about:debugging and load the detected Firefox extension directory as a temporary add-on.',
                };
            }

            if (status === 'partial') {
                return {
                    label: 'Finish Firefox build',
                    detail: 'Firefox source assets exist, but you still need a Firefox-ready build output before loading it as a temporary add-on.',
                };
            }

            return {
                label: 'Build Firefox bundle',
                detail: 'Generate the Firefox-specific extension output, then load it from about:debugging as a temporary add-on.',
            };
        case 'vscode-extension':
            if (status === 'ready') {
                return {
                    label: 'Install VSIX',
                    detail: 'Use VS Code’s “Install from VSIX…” flow or `code --install-extension` with the detected package artifact.',
                };
            }

            if (status === 'partial') {
                return {
                    label: 'Package extension',
                    detail: 'The extension is compiled already; package it into a `.vsix` so operators can install it without an extension-host dev session.',
                };
            }

            return {
                label: 'Build and package extension',
                detail: 'Compile the VS Code extension first, then generate a `.vsix` package for installation.',
            };
        case 'mcp-client-sync':
            if (status === 'ready') {
                return {
                    label: 'Open sync dashboard',
                    detail: 'Preview and write HyperCode-managed MCP configs into supported clients from the dashboard.',
                };
            }

            return {
                label: 'Start HyperCode Core',
                detail: 'Bring HyperCode Core online so it can generate and expose the managed MCP config source for client sync.',
            };
    }
}

export function getBridgeClientStatDetail(overview: IntegrationOverview): string {
    if (overview.startupDegraded) {
        return overview.startupSummary ?? 'Compat fallback is active, so live bridge telemetry is currently unavailable.';
    }

    if (!overview.extensionBridgeAcceptingConnections) {
        return 'Bridge has not finished coming online';
    }

    if (!overview.hasConnectedBridgeClients) {
        return 'Listener ready · waiting for browser / IDE clients';
    }

    return `${overview.hookPhaseCount} hook phases advertised by core`;
}

export function getBridgeClientEmptyStateMessage(overview: IntegrationOverview): string {
    if (overview.startupDegraded) {
        return overview.startupSummary
            ?? 'Startup is running in local compat fallback, so live IDE/browser bridge client telemetry is unavailable right now.';
    }

    if (overview.extensionBridgeAcceptingConnections) {
        return 'Bridge listener is ready, but no IDE or browser bridges have connected yet.';
    }

    return 'No IDE or browser bridges have registered hook-capability metadata yet, and the listener is still coming online.';
}

const EXTERNAL_CLIENTS: Array<{
    id: string;
    label: string;
    windowsPath: string;
    notes: string;
    autoSyncSupported: boolean;
    syncClient?: string;
}> = [
    {
        id: 'claude-desktop',
        label: 'Claude Desktop',
        windowsPath: '%APPDATA%\\Claude\\claude_desktop_config.json',
        notes: 'Primary desktop MCP client target.',
        autoSyncSupported: true,
        syncClient: 'claude-desktop',
    },
    {
        id: 'cursor',
        label: 'Cursor',
        windowsPath: '%APPDATA%\\Cursor\\User\\globalStorage\\mcp-servers.json',
        notes: 'Native dashboard sync target.',
        autoSyncSupported: true,
        syncClient: 'cursor',
    },
    {
        id: 'vscode',
        label: 'VS Code',
        windowsPath: '%APPDATA%\\Code\\User\\globalStorage\\mcp-servers.json',
        notes: 'Native dashboard sync target plus HyperCode VS Code extension package.',
        autoSyncSupported: true,
        syncClient: 'vscode',
    },
    {
        id: 'windsurf',
        label: 'Windsurf',
        windowsPath: '%APPDATA%\\Windsurf\\User\\globalStorage\\mcp-servers.json',
        notes: 'Reference path documented; dashboard sync not yet native.',
        autoSyncSupported: false,
    },
    {
        id: 'claude-code',
        label: 'Claude Code',
        windowsPath: '%APPDATA%\\Claude\\claude.json',
        notes: 'Reference CLI config path documented for future connector work.',
        autoSyncSupported: false,
    },
    {
        id: 'gemini-cli',
        label: 'Gemini CLI',
        windowsPath: '%USERPROFILE%\\.gemini\\config.json',
        notes: 'Reference CLI config path documented for future connector work.',
        autoSyncSupported: false,
    },
];

export function getIntegrationOverview(
    startupStatus?: StartupStatusSummary | null,
    browserStatus?: BrowserStatusSummary | null,
    syncTargets?: SyncTargetSummary[] | null,
    cliHarnesses?: CliHarnessDetectionSummary[] | null,
): IntegrationOverview {
    const startupDegraded = startupStatus?.status === 'degraded';
    const startupSummary = startupStatus?.summary?.trim() ?? null;
    const extensionClientCount = Number(startupStatus?.checks?.extensionBridge?.clientCount ?? 0);
    const extensionBridgeReady = Boolean(startupStatus?.checks?.extensionBridge?.ready);
    const extensionBridgeAcceptingConnections = Boolean(
        startupStatus?.checks?.extensionBridge?.acceptingConnections
        ?? startupStatus?.checks?.extensionBridge?.ready,
    );
    const hasConnectedBridgeClients = Boolean(
        startupStatus?.checks?.extensionBridge?.hasConnectedClients
        ?? extensionClientCount > 0,
    );
    const hookPhaseCount = startupStatus?.checks?.extensionBridge?.supportedHookPhases?.length ?? 0;
    const browserRuntimeReady = Boolean(browserStatus?.available);
    const browserPageCount = Number(browserStatus?.pageCount ?? 0);
    const syncedClientCount = (syncTargets ?? []).filter((target) => target.exists).length;
    const totalHarnessCount = cliHarnesses?.length ?? 0;
    const installedHarnessCount = (cliHarnesses ?? []).filter((harness) => Boolean(harness.installed)).length;
    const executionEnvironmentReady = Boolean(startupStatus?.checks?.executionEnvironment?.ready);
    const executionPreferredShell = startupStatus?.checks?.executionEnvironment?.preferredShellLabel ?? null;
    const verifiedExecutionShellCount = Number(startupStatus?.checks?.executionEnvironment?.verifiedShellCount ?? 0);
    const verifiedExecutionToolCount = Number(startupStatus?.checks?.executionEnvironment?.verifiedToolCount ?? 0);
    const supportsPosixShell = Boolean(startupStatus?.checks?.executionEnvironment?.supportsPosixShell);

    return {
        startupDegraded,
        startupSummary,
        extensionBridgeReady,
        extensionBridgeAcceptingConnections,
        hasConnectedBridgeClients,
        extensionClientCount,
        hookPhaseCount,
        browserRuntimeReady,
        browserPageCount,
        syncedClientCount,
        installedHarnessCount,
        totalHarnessCount,
        executionEnvironmentReady,
        executionPreferredShell,
        verifiedExecutionShellCount,
        verifiedExecutionToolCount,
        supportsPosixShell,
    };
}

export function getExternalClientRows(syncTargets?: SyncTargetSummary[] | null): ExternalClientRow[] {
    const targetMap = new Map((syncTargets ?? []).map((target) => [target.client, target]));

    return EXTERNAL_CLIENTS.map((client) => {
        const target = client.syncClient ? targetMap.get(client.syncClient) : undefined;
        const detected = Boolean(target?.exists);

        return {
            id: client.id,
            label: client.label,
            windowsPath: client.windowsPath,
            notes: client.notes,
            autoSyncSupported: client.autoSyncSupported,
            detected,
            resolvedPath: target?.path ?? client.windowsPath,
            statusLabel: detected
                ? 'Detected'
                : client.autoSyncSupported
                    ? 'Ready to sync'
                    : 'Reference path',
            statusTone: detected
                ? 'success'
                : client.autoSyncSupported
                    ? 'warning'
                    : 'muted',
        };
    });
}

export function getStatusBadgeClasses(tone: 'success' | 'warning' | 'muted'): string {
    if (tone === 'success') {
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    }

    if (tone === 'warning') {
        return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    }

    return 'border-zinc-700 bg-zinc-900 text-zinc-300';
}

function formatRelativeTime(timestamp: number, now = Date.now()): string {
    const deltaMs = Math.max(0, now - timestamp);
    const deltaSeconds = Math.floor(deltaMs / 1000);

    if (deltaSeconds < 5) {
        return 'just now';
    }

    if (deltaSeconds < 60) {
        return `${deltaSeconds}s ago`;
    }

    const deltaMinutes = Math.floor(deltaSeconds / 60);
    if (deltaMinutes < 60) {
        return `${deltaMinutes}m ago`;
    }

    const deltaHours = Math.floor(deltaMinutes / 60);
    if (deltaHours < 24) {
        return `${deltaHours}h ago`;
    }

    return `${Math.floor(deltaHours / 24)}d ago`;
}

export function getConnectedBridgeClientRows(startupStatus?: StartupStatusSummary | null): ConnectedBridgeClientRow[] {
    const clients = startupStatus?.checks?.extensionBridge?.clients ?? [];

    return [...clients]
        .sort((left, right) => (left.clientName ?? left.clientId ?? '').localeCompare(right.clientName ?? right.clientId ?? ''))
        .map((client) => ({
            clientId: client.clientId ?? 'unknown-client',
            clientName: client.clientName ?? client.clientId ?? 'Unknown bridge client',
            clientType: client.clientType ?? 'unknown',
            version: client.version,
            platform: client.platform,
            capabilities: client.capabilities ?? [],
            hookPhases: client.hookPhases ?? [],
            lastSeenLabel: typeof client.lastSeenAt === 'number' ? formatRelativeTime(client.lastSeenAt) : 'unknown',
        }));
}