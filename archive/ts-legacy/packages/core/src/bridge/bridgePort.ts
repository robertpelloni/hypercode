<<<<<<< HEAD:archive/ts-legacy/packages/core/src/bridge/bridgePort.ts
const DEFAULT_HYPERCODE_BRIDGE_PORT = 3001;
=======
const DEFAULT_BORG_BRIDGE_PORT = 3001;
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/bridge/bridgePort.ts

function normalizePort(value: string | undefined): number | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (!/^\d+$/u.test(trimmed)) {
        return null;
    }

    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
        return null;
    }

    return parsed;
}

export function getDefaultBridgePort(): number {
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/bridge/bridgePort.ts
    return DEFAULT_HYPERCODE_BRIDGE_PORT;
}

export function resolveBridgePort(env: NodeJS.ProcessEnv = process.env): number {
    return normalizePort(env.HYPERCODE_BRIDGE_PORT)
        ?? normalizePort(env.HYPERCODE_CORE_BRIDGE_PORT)
        ?? DEFAULT_HYPERCODE_BRIDGE_PORT;
=======
    return DEFAULT_BORG_BRIDGE_PORT;
}

export function resolveBridgePort(env: NodeJS.ProcessEnv = process.env): number {
    return normalizePort(env.BORG_BRIDGE_PORT)
        ?? normalizePort(env.BORG_CORE_BRIDGE_PORT)
        ?? DEFAULT_BORG_BRIDGE_PORT;
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/bridge/bridgePort.ts
}

export function getBridgeHttpBase(port: number = resolveBridgePort()): string {
    return `http://127.0.0.1:${port}`;
}

export function getBridgeHealthUrl(port: number = resolveBridgePort()): string {
    return `${getBridgeHttpBase(port)}/health`;
}

export function getBridgeToolExecuteUrl(port: number = resolveBridgePort()): string {
    return `${getBridgeHttpBase(port)}/tool/execute`;
}

export function getBridgeStreamUrl(port: number = resolveBridgePort()): string {
    return `${getBridgeHttpBase(port)}/api/mesh/stream`;
}

export function getBridgeWebSocketUrl(port: number = resolveBridgePort()): string {
    return `ws://127.0.0.1:${port}`;
}
