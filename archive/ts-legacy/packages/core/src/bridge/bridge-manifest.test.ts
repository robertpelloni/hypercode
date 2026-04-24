import { describe, expect, it } from 'vitest';

import {
    applyBridgeClientHello,
    buildBridgeManifest,
    createDefaultBridgeClient,
} from './bridge-manifest.js';

describe('bridge manifest helpers', () => {
    it('creates default bridge clients and applies hello metadata', () => {
        const initial = createDefaultBridgeClient('client-1', 1000);
        const registered = applyBridgeClientHello(initial, {
            clientType: 'vscode-extension',
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/bridge/bridge-manifest.test.ts
            clientName: 'HyperCode VS Code Bridge',
=======
            clientName: 'borg VS Code Bridge',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/bridge/bridge-manifest.test.ts
            version: '0.99.1',
            platform: 'VS Code 1.99',
            capabilities: ['chat.inject', 'editor.selection.read', 'chat.inject'],
            hookPhases: ['chat.submit', 'editor.selection', 'chat.submit'],
        }, 2000);

        expect(registered).toMatchObject({
            clientId: 'client-1',
            clientType: 'vscode-extension',
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/bridge/bridge-manifest.test.ts
            clientName: 'HyperCode VS Code Bridge',
=======
            clientName: 'borg VS Code Bridge',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/bridge/bridge-manifest.test.ts
            version: '0.99.1',
            platform: 'VS Code 1.99',
            capabilities: ['chat.inject', 'editor.selection.read'],
            hookPhases: ['chat.submit', 'editor.selection'],
            connectedAt: 1000,
            lastSeenAt: 2000,
        });
    });

    it('builds a stable manifest with sorted connected clients', () => {
        const alpha = applyBridgeClientHello(createDefaultBridgeClient('a', 1000), {
            clientType: 'browser-extension',
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/bridge/bridge-manifest.test.ts
            clientName: 'HyperCode Browser Bridge',
        }, 1500);
        const beta = applyBridgeClientHello(createDefaultBridgeClient('b', 1000), {
            clientType: 'vscode-extension',
            clientName: 'HyperCode VS Code Bridge',
=======
            clientName: 'borg Browser Bridge',
        }, 1500);
        const beta = applyBridgeClientHello(createDefaultBridgeClient('b', 1000), {
            clientType: 'vscode-extension',
            clientName: 'borg VS Code Bridge',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/bridge/bridge-manifest.test.ts
        }, 1500);

        const manifest = buildBridgeManifest([beta, alpha]);

        expect(manifest.protocolVersion).toBe('2026-03-10');
        expect(manifest.supportedCapabilities).toContain('bridge.websocket');
        expect(manifest.supportedHookPhases).toContain('chat.submit');
        expect(manifest.connectedClients.map((client) => client.clientName)).toEqual([
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/bridge/bridge-manifest.test.ts
            'HyperCode Browser Bridge',
            'HyperCode VS Code Bridge',
=======
            'borg Browser Bridge',
            'borg VS Code Bridge',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/bridge/bridge-manifest.test.ts
        ]);
    });
});
