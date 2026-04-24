import { describe, expect, it } from 'vitest';

import {
    getBridgeClientEmptyStateMessage,
    getBridgeClientStatDetail,
    getConnectedBridgeClientRows,
    getExternalClientRows,
    getIntegrationOverview,
    getInstallSurfaceRows,
} from './integration-catalog';

describe('integration catalog helpers', () => {
    it('summarizes bridge, client sync, and harness installation state', () => {
        expect(
            getIntegrationOverview(
                {
                    checks: {
                        extensionBridge: {
                            ready: true,
                            clientCount: 3,
                            supportedHookPhases: ['chat.submit', 'editor.selection'],
                        },
                        executionEnvironment: {
                            ready: true,
                            preferredShellLabel: 'PowerShell 7',
                            verifiedShellCount: 2,
                            verifiedToolCount: 5,
                            supportsPosixShell: true,
                        },
                    },
                },
                {
                    available: true,
                    pageCount: 2,
                },
                [
                    { client: 'claude-desktop', path: 'A', candidates: [], exists: true },
                    { client: 'cursor', path: 'B', candidates: [], exists: false },
                ],
                [{ installed: true }, { installed: false }, { installed: true }],
            ),
        ).toEqual({
            startupDegraded: false,
            startupSummary: null,
            extensionBridgeReady: true,
            extensionBridgeAcceptingConnections: true,
            hasConnectedBridgeClients: true,
            extensionClientCount: 3,
            hookPhaseCount: 2,
            browserRuntimeReady: true,
            browserPageCount: 2,
            syncedClientCount: 1,
            installedHarnessCount: 2,
            totalHarnessCount: 3,
            executionEnvironmentReady: true,
            executionPreferredShell: 'PowerShell 7',
            verifiedExecutionShellCount: 2,
            verifiedExecutionToolCount: 5,
            supportsPosixShell: true,
        });
    });

    it('treats a ready listener with zero clients as online but idle', () => {
        const overview = getIntegrationOverview(
            {
                checks: {
                    extensionBridge: {
                        ready: true,
                        acceptingConnections: true,
                        clientCount: 0,
                        hasConnectedClients: false,
                        supportedHookPhases: ['chat.submit'],
                    },
                    executionEnvironment: {
                        ready: true,
                        preferredShellLabel: 'PowerShell 7',
                        verifiedShellCount: 1,
                        verifiedToolCount: 3,
                        supportsPosixShell: false,
                    },
                },
            },
            {
                available: false,
                pageCount: 0,
            },
            [],
            [],
        );

        expect(overview).toEqual({
            startupDegraded: false,
            startupSummary: null,
            extensionBridgeReady: true,
            extensionBridgeAcceptingConnections: true,
            hasConnectedBridgeClients: false,
            extensionClientCount: 0,
            hookPhaseCount: 1,
            browserRuntimeReady: false,
            browserPageCount: 0,
            syncedClientCount: 0,
            installedHarnessCount: 0,
            totalHarnessCount: 0,
            executionEnvironmentReady: true,
            executionPreferredShell: 'PowerShell 7',
            verifiedExecutionShellCount: 1,
            verifiedExecutionToolCount: 3,
            supportsPosixShell: false,
        });

        expect(getBridgeClientStatDetail(overview)).toBe('Listener ready · waiting for browser / IDE clients');
        expect(getBridgeClientEmptyStateMessage(overview)).toBe('Bridge listener is ready, but no IDE or browser bridges have connected yet.');
    });

    it('uses offline bridge messaging when the listener is still booting', () => {
        const overview = getIntegrationOverview(
            {
                checks: {
                    extensionBridge: {
                        ready: false,
                        acceptingConnections: false,
                        clientCount: 0,
                        hasConnectedClients: false,
                        supportedHookPhases: [],
                    },
                    executionEnvironment: {
                        ready: false,
                        preferredShellLabel: null,
                        verifiedShellCount: 0,
                        verifiedToolCount: 0,
                        supportsPosixShell: false,
                    },
                },
            },
            {
                available: false,
                pageCount: 0,
            },
            [],
            [],
        );

        expect(getBridgeClientStatDetail(overview)).toBe('Bridge has not finished coming online');
        expect(getBridgeClientEmptyStateMessage(overview)).toBe('No IDE or browser bridges have registered hook-capability metadata yet, and the listener is still coming online.');
    });

    it('surfaces compat fallback messaging when startup telemetry is degraded', () => {
        const overview = getIntegrationOverview(
            {
                status: 'degraded',
                summary: 'Using local MCP config fallback for 64 configured server(s); live startup telemetry is unavailable.',
                checks: {
                    extensionBridge: {
                        ready: false,
                        acceptingConnections: false,
                        clientCount: 0,
                        hasConnectedClients: false,
                        supportedHookPhases: [],
                    },
                    executionEnvironment: {
                        ready: false,
                        preferredShellLabel: null,
                        verifiedShellCount: 0,
                        verifiedToolCount: 0,
                        supportsPosixShell: false,
                    },
                },
            },
            {
                available: false,
                pageCount: 0,
            },
            [],
            [],
        );

        expect(overview).toMatchObject({
            startupDegraded: true,
            startupSummary: 'Using local MCP config fallback for 64 configured server(s); live startup telemetry is unavailable.',
        });
        expect(getBridgeClientStatDetail(overview)).toBe('Using local MCP config fallback for 64 configured server(s); live startup telemetry is unavailable.');
        expect(getBridgeClientEmptyStateMessage(overview)).toBe('Using local MCP config fallback for 64 configured server(s); live startup telemetry is unavailable.');
    });

    it('merges detected sync targets into known client rows', () => {
        const rows = getExternalClientRows([
            {
                client: 'vscode',
                path: 'C:\\Users\\hyper\\AppData\\Roaming\\Code\\User\\globalStorage\\mcp-servers.json',
                candidates: [],
                exists: true,
            },
        ]);

        const vscode = rows.find((row) => row.id === 'vscode');
        const windsurf = rows.find((row) => row.id === 'windsurf');

        expect(vscode).toMatchObject({
            detected: true,
            statusLabel: 'Detected',
            statusTone: 'success',
        });
        expect(windsurf).toMatchObject({
            detected: false,
            autoSyncSupported: false,
            statusLabel: 'Reference path',
            statusTone: 'muted',
        });
    });

    it('formats connected bridge clients with capabilities and hook phases', () => {
        const rows = getConnectedBridgeClientRows({
            checks: {
                extensionBridge: {
                    clients: [
                        {
                            clientId: 'client-1',
                            clientType: 'vscode-extension',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
                            clientName: 'HyperCode VS Code Bridge',
=======
                            clientName: 'borg VS Code Bridge',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
                            platform: 'VS Code 1.99',
                            capabilities: ['chat.inject', 'editor.selection.read'],
                            hookPhases: ['chat.submit', 'editor.selection'],
                            connectedAt: Date.now() - 5_000,
                            lastSeenAt: Date.now() - 2_000,
                        },
                    ],
                },
            },
        });

        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
            clientName: 'HyperCode VS Code Bridge',
=======
            clientName: 'borg VS Code Bridge',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
            clientType: 'vscode-extension',
            capabilities: ['chat.inject', 'editor.selection.read'],
            hookPhases: ['chat.submit', 'editor.selection'],
        });
        expect(rows[0].lastSeenLabel).toMatch(/just now|\ds ago/);
    });

    it('merges live install artifacts into the install surface catalog', () => {
        const now = Date.parse('2026-03-11T12:00:00.000Z');
        const rows = getInstallSurfaceRows([
            {
                id: 'browser-extension-chromium',
                status: 'ready',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
                artifactPath: 'apps/hypercode-extension/dist-chromium',
=======
                artifactPath: 'apps/borg-extension/dist-chromium',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
                artifactKind: 'Chromium unpacked bundle',
                detail: 'Unpacked Chromium-compatible browser extension output is available.',
                declaredVersion: '0.7.3',
                lastModifiedAt: '2026-03-11T10:00:00.000Z',
            },
            {
                id: 'vscode-extension',
                status: 'partial',
                artifactPath: 'packages/vscode/dist/extension.js',
                artifactKind: 'Compiled extension output',
                detail: 'VS Code extension is compiled, but no `.vsix` package was detected yet.',
                declaredVersion: '0.2.0',
                lastModifiedAt: '2026-03-03T12:00:00.000Z',
            },
        ], now);

        expect(rows.find((row) => row.id === 'browser-extension-chromium')).toMatchObject({
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
            repoPath: 'apps/hypercode-extension',
            buildHint: 'pnpm -C apps/hypercode-extension build',
=======
            repoPath: 'apps/borg-extension',
            buildHint: 'pnpm -C apps/borg-extension build',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
            statusLabel: 'artifact ready',
            statusTone: 'success',
            nextStepLabel: 'Load in Chrome / Edge',
            operatorActionLabel: 'Load unpacked directory',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
            operatorActionValue: 'apps/hypercode-extension/dist-chromium',
=======
            operatorActionValue: 'apps/borg-extension/dist-chromium',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
            operatorActionCopyLabel: 'Copy path',
            artifactVersionLabel: 'v0.7.3',
            artifactKindLabel: 'Chromium unpacked bundle',
            artifactFreshnessLabel: 'fresh',
            artifactUpdatedLabel: 'Updated 2h ago',
            artifactTimestampLabel: 'Detected 2026-03-11T10:00:00Z',
            artifactStatus: {
                status: 'ready',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
                artifactPath: 'apps/hypercode-extension/dist-chromium',
=======
                artifactPath: 'apps/borg-extension/dist-chromium',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
                artifactKind: 'Chromium unpacked bundle',
                declaredVersion: '0.7.3',
                lastModifiedAt: '2026-03-11T10:00:00.000Z',
            },
        });

        expect(rows.find((row) => row.id === 'vscode-extension')).toMatchObject({
            statusLabel: 'source ready',
            statusTone: 'warning',
            nextStepLabel: 'Package extension',
            operatorActionLabel: 'Package command',
            operatorActionValue: 'pnpm -C packages/vscode package',
            operatorActionCopyLabel: 'Copy command',
            artifactVersionLabel: 'v0.2.0',
            artifactKindLabel: 'Compiled extension output',
            artifactFreshnessLabel: 'aging',
            artifactUpdatedLabel: 'Updated 8d ago',
            artifactTimestampLabel: 'Detected 2026-03-03T12:00:00Z',
            artifactStatus: {
                status: 'partial',
                artifactPath: 'packages/vscode/dist/extension.js',
                artifactKind: 'Compiled extension output',
                declaredVersion: '0.2.0',
                lastModifiedAt: '2026-03-03T12:00:00.000Z',
            },
        });

        expect(rows.find((row) => row.id === 'browser-extension-firefox')).toMatchObject({
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
            repoPath: 'apps/hypercode-extension',
            buildHint: 'pnpm -C apps/hypercode-extension build:firefox',
            statusLabel: 'build needed',
            nextStepLabel: 'Build Firefox bundle',
            operatorActionLabel: 'Build command',
            operatorActionValue: 'pnpm -C apps/hypercode-extension build:firefox',
=======
            repoPath: 'apps/borg-extension',
            buildHint: 'pnpm -C apps/borg-extension build:firefox',
            statusLabel: 'build needed',
            nextStepLabel: 'Build Firefox bundle',
            operatorActionLabel: 'Build command',
            operatorActionValue: 'pnpm -C apps/borg-extension build:firefox',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
            operatorActionCopyLabel: 'Copy command',
            artifactVersionLabel: 'Not versioned',
            artifactKindLabel: 'Unknown artifact kind',
            artifactFreshnessLabel: 'unknown age',
            artifactTimestampLabel: 'Exact timestamp unavailable',
        });

        expect(rows.find((row) => row.id === 'mcp-client-sync')).toMatchObject({
            statusLabel: 'build needed',
            statusTone: 'muted',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
            nextStepLabel: 'Start HyperCode Core',
=======
            nextStepLabel: 'Start borg Core',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
            operatorActionLabel: 'Bring core online',
            operatorActionValue: 'pnpm run dev',
            operatorActionCopyLabel: 'Copy action',
            artifactVersionLabel: 'Not versioned',
            artifactKindLabel: 'Unknown artifact kind',
            artifactFreshnessLabel: 'unknown age',
            artifactTimestampLabel: 'Exact timestamp unavailable',
            artifactStatus: {
                status: 'missing',
                artifactPath: null,
                artifactKind: null,
                declaredVersion: null,
                lastModifiedAt: null,
            },
        });
    });

    it('marks old artifacts as stale even when they still exist', () => {
        const rows = getInstallSurfaceRows([
            {
                id: 'browser-extension-firefox',
                status: 'ready',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
                artifactPath: 'apps/hypercode-extension/dist-firefox',
=======
                artifactPath: 'apps/borg-extension/dist-firefox',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
                artifactKind: 'Firefox unpacked bundle',
                detail: 'Firefox-specific browser extension output is available.',
                declaredVersion: '0.7.3',
                lastModifiedAt: '2026-02-01T12:00:00.000Z',
            },
        ], Date.parse('2026-03-11T12:00:00.000Z'));

        expect(rows.find((row) => row.id === 'browser-extension-firefox')).toMatchObject({
            artifactVersionLabel: 'v0.7.3',
            artifactKindLabel: 'Firefox unpacked bundle',
            artifactFreshnessLabel: 'stale',
            artifactUpdatedLabel: 'Updated 38d ago',
            artifactTimestampLabel: 'Detected 2026-02-01T12:00:00Z',
            artifactFreshnessTone: 'muted',
        });
    });

    it('builds direct install actions for ready artifacts', () => {
        const rows = getInstallSurfaceRows([
            {
                id: 'browser-extension-firefox',
                status: 'ready',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
                artifactPath: 'apps/hypercode-extension/dist-firefox',
=======
                artifactPath: 'apps/borg-extension/dist-firefox',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
                artifactKind: 'Firefox unpacked bundle',
                detail: 'Firefox-specific browser extension output is available.',
                declaredVersion: '0.7.3',
                lastModifiedAt: '2026-03-11T10:00:00.000Z',
            },
            {
                id: 'vscode-extension',
                status: 'ready',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
                artifactPath: 'packages/vscode/hypercode-vscode-extension-0.2.0.vsix',
=======
                artifactPath: 'packages/vscode/borg-vscode-extension-0.2.0.vsix',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
                artifactKind: 'VSIX package',
                detail: 'Packaged VS Code extension artifact is ready to install.',
                declaredVersion: '0.2.0',
                lastModifiedAt: '2026-03-11T09:00:00.000Z',
            },
            {
                id: 'mcp-client-sync',
                status: 'ready',
                artifactPath: 'mcp.jsonc',
                artifactKind: 'JSONC config source',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
                detail: 'HyperCode-managed MCP config source is present for dashboard sync and preview flows.',
=======
                detail: 'borg-managed MCP config source is present for dashboard sync and preview flows.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
                declaredVersion: null,
                lastModifiedAt: '2026-03-11T08:00:00.000Z',
            },
        ], Date.parse('2026-03-11T12:00:00.000Z'));

        expect(rows.find((row) => row.id === 'browser-extension-firefox')).toMatchObject({
            operatorActionLabel: 'Manifest to load',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
            operatorActionValue: 'apps/hypercode-extension/dist-firefox/manifest.json',
=======
            operatorActionValue: 'apps/borg-extension/dist-firefox/manifest.json',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
            operatorActionCopyLabel: 'Copy path',
        });

        expect(rows.find((row) => row.id === 'vscode-extension')).toMatchObject({
            operatorActionLabel: 'Install command',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
            operatorActionValue: 'code --install-extension packages/vscode/hypercode-vscode-extension-0.2.0.vsix',
=======
            operatorActionValue: 'code --install-extension packages/vscode/borg-vscode-extension-0.2.0.vsix',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/integrations/integration-catalog.test.ts
            operatorActionCopyLabel: 'Copy command',
        });

        expect(rows.find((row) => row.id === 'mcp-client-sync')).toMatchObject({
            operatorActionLabel: 'Dashboard action',
            operatorActionValue: '/dashboard/mcp/settings',
            operatorActionCopyLabel: 'Copy route',
        });
    });
});