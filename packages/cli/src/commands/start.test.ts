import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import net from 'node:net';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    acquireSingleInstanceLock,
    createLockLifecycleHandlers,
    isAddrInUseError,
    pickDashboardPort,
    resolveControlPlaneFallbackPort,
    resolveDashboardUrl,
    resolveDataDir,
    startCoreRuntime,
} from './start.js';

const tempDirs: string[] = [];

afterEach(() => {
    while (tempDirs.length > 0) {
        const dir = tempDirs.pop();
        if (dir) {
            rmSync(dir, { recursive: true, force: true });
        }
    }
});

function createTempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), 'borg-start-lock-'));
    tempDirs.push(dir);
    return dir;
}

async function getFreePort(): Promise<number> {
    return await new Promise((resolvePort, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, () => {
            const address = server.address();
            if (!address || typeof address === 'string') {
                server.close(() => reject(new Error('Unable to resolve free port')));
                return;
            }

            const { port } = address;
            server.close((closeError) => {
                if (closeError) {
                    reject(closeError);
                    return;
                }
                resolvePort(port);
            });
        });
    });
}

describe('startCoreRuntime', () => {
    it('boots the orchestrator with auto-drive disabled by default', async () => {
        const startOrchestrator = vi.fn().mockResolvedValue({
            host: '0.0.0.0',
            trpcPort: 4000,
            bridgePort: 3001,
        });

        const result = await startCoreRuntime(
            {
                host: '0.0.0.0',
                port: 4000,
                mcp: true,
            },
            async () => ({
                startOrchestrator,
            }),
        );

        expect(startOrchestrator).toHaveBeenCalledWith({
            host: '0.0.0.0',
            trpcPort: 4000,
            startMcp: true,
            startSupervisor: false,
            autoDrive: false,
        });
        expect(result).toEqual({
            host: '0.0.0.0',
            trpcPort: 4000,
            bridgePort: 3001,
        });
    });

    it('can opt into supervisor startup and auto-drive explicitly', async () => {
        const startOrchestrator = vi.fn().mockResolvedValue({
            host: '127.0.0.1',
            trpcPort: 3100,
            bridgePort: 3001,
        });

        await startCoreRuntime(
            {
                host: '127.0.0.1',
                port: 3100,
                mcp: true,
                supervisor: true,
                autoDrive: true,
            },
            async () => ({
                startOrchestrator,
            }),
        );

        expect(startOrchestrator).toHaveBeenCalledWith({
            host: '127.0.0.1',
            trpcPort: 3100,
            startMcp: true,
            startSupervisor: true,
            autoDrive: true,
        });
    });

    it('fails clearly when the core module does not expose the orchestrator entrypoint', async () => {
        await expect(startCoreRuntime(
            {
                host: '127.0.0.1',
                port: 4000,
                mcp: false,
            },
            async () => ({}),
        )).rejects.toThrow('Core orchestrator entrypoint is unavailable');
    });
});

describe('acquireSingleInstanceLock', () => {
    it('reuses the stale lock port when the caller did not explicitly request a port and the old port is free', async () => {
        const dataDir = createTempDir();
        const stalePort = await getFreePort();
        writeFileSync(join(dataDir, 'lock'), JSON.stringify({
            instanceId: 'borg-stale',
            pid: 999999,
            port: stalePort,
            host: '127.0.0.1',
            createdAt: '2026-03-11T00:00:00.000Z',
        }), 'utf8');

        const handle = await acquireSingleInstanceLock({
            dataDir,
            requestedPort: 4000,
            explicitPort: false,
            host: '127.0.0.1',
        });

        expect(handle.port).toBe(stalePort);
        expect(handle.clearedStaleLock).toBe(true);
        expect(handle.reusedStalePort).toBe(true);

        handle.releaseSync();
    });

    it('does not override an explicit port even when a stale lock exists', async () => {
        const dataDir = createTempDir();
        const stalePort = await getFreePort();
        writeFileSync(join(dataDir, 'lock'), JSON.stringify({
            instanceId: 'borg-stale',
            pid: 999999,
            port: stalePort,
            host: '127.0.0.1',
            createdAt: '2026-03-11T00:00:00.000Z',
        }), 'utf8');

        const handle = await acquireSingleInstanceLock({
            dataDir,
            requestedPort: 4555,
            explicitPort: true,
            host: '127.0.0.1',
        });

        expect(handle.port).toBe(4555);
        expect(handle.clearedStaleLock).toBe(true);
        expect(handle.reusedStalePort).toBe(false);

        handle.releaseSync();
    });

    it('blocks startup when the lock belongs to a still-running process', async () => {
        const dataDir = createTempDir();
        writeFileSync(join(dataDir, 'lock'), JSON.stringify({
            instanceId: 'borg-live',
            pid: process.pid,
            port: 4000,
            host: '127.0.0.1',
            createdAt: '2026-03-11T00:00:00.000Z',
        }), 'utf8');

        await expect(acquireSingleInstanceLock({
            dataDir,
            requestedPort: 4000,
            explicitPort: false,
            host: '127.0.0.1',
        }, {
            isProcessRunning: () => true,
            isPortFree: async () => false,
        })).rejects.toThrow('Borg is already running');
    });

    it('fails clearly when the requested port is already occupied by another process', async () => {
        const dataDir = createTempDir();

        await expect(acquireSingleInstanceLock({
            dataDir,
            requestedPort: 4000,
            explicitPort: false,
            host: '127.0.0.1',
        }, {
            isPortFree: async () => false,
        })).rejects.toThrow('Port 4000 is already in use by another process');
    });

    it('releases the lock when startup crashes with an uncaught exception', async () => {
        const dataDir = createTempDir();
        const handle = await acquireSingleInstanceLock({
            dataDir,
            requestedPort: 4100,
            explicitPort: true,
            host: '127.0.0.1',
        });

        const exit = vi.fn();
        const logError = vi.fn();
        const lifecycle = createLockLifecycleHandlers(handle, { exit, logError });

        lifecycle.handleUncaughtException(new Error('bridge bind failed'));

        await expect(acquireSingleInstanceLock({
            dataDir,
            requestedPort: 4100,
            explicitPort: true,
            host: '127.0.0.1',
        })).resolves.toMatchObject({
            port: 4100,
        });

        expect(exit).toHaveBeenCalledWith(1);
        expect(logError).toHaveBeenCalled();
    });
});

describe('resolveDataDir', () => {
    it('expands the home-directory shorthand', () => {
        const resolved = resolveDataDir('~/.borg', 'C:/tmp/home');
        expect(resolved.replaceAll('\\', '/')).toBe('C:/tmp/home/.borg');
    });
});

describe('dashboard startup helpers', () => {
    it('rewrites wildcard hosts to a browser-safe dashboard URL', () => {
        expect(resolveDashboardUrl('0.0.0.0', 3000)).toBe('http://127.0.0.1:3000/dashboard');
        expect(resolveDashboardUrl('127.0.0.1', 3010)).toBe('http://127.0.0.1:3010/dashboard');
    });

    it('reuses an already-running dashboard on the requested port', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: true });

        await expect(pickDashboardPort(
            3000,
            false,
            '127.0.0.1',
            {
                fetchImpl: fetchImpl as any,
                isPortFree: async () => false,
            },
        )).resolves.toEqual({
            port: 3000,
            reusedExisting: true,
        });
    });

    it('falls back to the next free dashboard port when the default port is busy', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: false });

        await expect(pickDashboardPort(
            3000,
            false,
            '127.0.0.1',
            {
                fetchImpl: fetchImpl as any,
                isPortFree: async (port) => port === 3010,
            },
        )).resolves.toEqual({
            port: 3010,
            reusedExisting: false,
        });
    });
});

describe('control-plane fallback helpers', () => {
    it('detects EADDRINUSE recursively through error causes', () => {
        const nested = {
            cause: {
                code: 'EADDRINUSE',
            },
        };

        expect(isAddrInUseError({ code: 'EADDRINUSE' })).toBe(true);
        expect(isAddrInUseError(nested)).toBe(true);
        expect(isAddrInUseError(new Error('other'))).toBe(false);
    });

    it('falls back to the requested port after stale-port reuse bind conflicts', () => {
        const fallback = resolveControlPlaneFallbackPort({
            requestedPort: 4000,
            selectedPort: 3100,
            explicitPort: false,
            reusedStalePort: true,
            startupError: { code: 'EADDRINUSE' },
        });

        expect(fallback).toBe(4000);
    });

    it('does not fall back when startup was explicit or not stale-reuse related', () => {
        expect(resolveControlPlaneFallbackPort({
            requestedPort: 4000,
            selectedPort: 3100,
            explicitPort: true,
            reusedStalePort: true,
            startupError: { code: 'EADDRINUSE' },
        })).toBeNull();

        expect(resolveControlPlaneFallbackPort({
            requestedPort: 4000,
            selectedPort: 3100,
            explicitPort: false,
            reusedStalePort: false,
            startupError: { code: 'EADDRINUSE' },
        })).toBeNull();

        expect(resolveControlPlaneFallbackPort({
            requestedPort: 4000,
            selectedPort: 3100,
            explicitPort: false,
            reusedStalePort: true,
            startupError: new Error('boom'),
        })).toBeNull();
    });
});
