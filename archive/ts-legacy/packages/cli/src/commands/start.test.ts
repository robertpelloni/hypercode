import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import net from 'node:net';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    acquireSingleInstanceLock,
    createLockLifecycleHandlers,
    isAddrInUseError,
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.test.ts
    isHypercodeServer,
    attachDashboardToRunningControlPlane,
    pickAvailableControlPlaneFallbackPort,
    pickDashboardPort,
    readMatchingStartupProvenanceFromLock,
    resolveAlreadyRunningDashboardReuse,
    resolveControlPlaneFallbackPort,
    resolveDashboardUrl,
    resolveDataDir,
    describeGoRuntimeLaunchMode,
    describeStartupModeSummary,
    resolveGoConfigDir,
    resolveGoRuntimeSpawnSpec,
    resolveRuntimePreference,
    runtimeSupportsIntegratedDashboard,
    syncLockHandlePort,
    startCoreRuntime,
    waitForHypercodeServer,
=======
    pickAvailableControlPlaneFallbackPort,
    pickDashboardPort,
    resolveControlPlaneFallbackPort,
    resolveDashboardUrl,
    resolveDataDir,
    syncLockHandlePort,
    startCoreRuntime,
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.test.ts
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
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.test.ts
    const dir = mkdtempSync(join(tmpdir(), 'hypercode-start-lock-'));
=======
    const dir = mkdtempSync(join(tmpdir(), 'borg-start-lock-'));
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.test.ts
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
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.test.ts
            instanceId: 'hypercode-stale',
=======
            instanceId: 'borg-stale',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.test.ts
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
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.test.ts
            instanceId: 'hypercode-stale',
=======
            instanceId: 'borg-stale',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.test.ts
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
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.test.ts
            instanceId: 'hypercode-live',
=======
            instanceId: 'borg-live',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.test.ts
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
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.test.ts
        })).rejects.toThrow('HyperCode is already running');
=======
        })).rejects.toThrow('borg is already running');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.test.ts
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
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.test.ts
            isExistingHypercode: async () => false,
        })).rejects.toThrow('Port 4000 is already in use by another process');
    });

    it('treats an occupied port serving HyperCode as an already-running instance', async () => {
        const dataDir = createTempDir();

        await expect(acquireSingleInstanceLock({
            dataDir,
            requestedPort: 4000,
            explicitPort: false,
            host: '127.0.0.1',
        }, {
            isPortFree: async () => false,
            isExistingHypercode: async () => true,
        })).rejects.toMatchObject({
            name: 'HypercodeAlreadyRunningError',
            port: 4000,
            source: 'port',
        });
    });

    it('falls forward to the next free control-plane port when the default port is occupied by another process', async () => {
        const dataDir = createTempDir();

        const handle = await acquireSingleInstanceLock({
            dataDir,
            requestedPort: 4000,
            explicitPort: false,
            host: '127.0.0.1',
        }, {
            isPortFree: async (port) => port === 4001,
            isExistingHypercode: async () => false,
        });

        expect(handle.port).toBe(4001);
        handle.releaseSync();
    });

=======
        })).rejects.toThrow('Port 4000 is already in use by another process');
    });

>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.test.ts
    it('updates the lock record port when the active control-plane port changes', async () => {
        const dataDir = createTempDir();
        const handle = await acquireSingleInstanceLock({
            dataDir,
            requestedPort: 4000,
            explicitPort: false,
            host: '127.0.0.1',
        }, {
            isPortFree: async () => true,
        });

        handle.updatePort(4002);

        const lockRaw = JSON.parse(readFileSync(handle.lockPath, 'utf8')) as { port: number };
        expect(lockRaw.port).toBe(4002);
        expect(handle.port).toBe(4002);

        handle.releaseSync();
    });

    it('syncs the lock record to the runtime-reported port after startup', async () => {
        const dataDir = createTempDir();
        const handle = await acquireSingleInstanceLock({
            dataDir,
            requestedPort: 4000,
            explicitPort: false,
            host: '127.0.0.1',
        }, {
            isPortFree: async () => true,
        });

        syncLockHandlePort(handle, 4012);

        const lockRaw = JSON.parse(readFileSync(handle.lockPath, 'utf8')) as { port: number };
        expect(lockRaw.port).toBe(4012);
        expect(handle.port).toBe(4012);

        handle.releaseSync();
    });

    it('ignores null or unchanged runtime ports when syncing the lock record', async () => {
        const dataDir = createTempDir();
        const handle = await acquireSingleInstanceLock({
            dataDir,
            requestedPort: 4000,
            explicitPort: false,
            host: '127.0.0.1',
        }, {
            isPortFree: async () => true,
        });

        syncLockHandlePort(handle, null);
        syncLockHandlePort(handle, 4000);

        const lockRaw = JSON.parse(readFileSync(handle.lockPath, 'utf8')) as { port: number };
        expect(lockRaw.port).toBe(4000);
        expect(handle.port).toBe(4000);

        handle.releaseSync();
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
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.test.ts
        const resolved = resolveDataDir('~/.hypercode', 'C:/tmp/home');
        expect(resolved.replaceAll('\\', '/')).toBe('C:/tmp/home/.hypercode');
    });
});

describe('runtime selection helpers', () => {
    it('defaults to auto and accepts explicit runtime modes', () => {
        expect(resolveRuntimePreference(undefined, undefined)).toBe('auto');
        expect(resolveRuntimePreference('go')).toBe('go');
        expect(resolveRuntimePreference('node')).toBe('node');
        expect(resolveRuntimePreference(undefined, 'go')).toBe('go');
    });

    it('fails clearly for unsupported runtime values', () => {
        expect(() => resolveRuntimePreference('python')).toThrow("Unsupported runtime 'python'");
    });

    it('derives a sibling .hypercode-go directory from the main data dir by default', () => {
        expect(resolveGoConfigDir('C:/tmp/home/.hypercode', undefined).replaceAll('\\', '/')).toBe('C:/tmp/home/.hypercode-go');
        expect(resolveGoConfigDir('C:/tmp/custom-state', undefined).replaceAll('\\', '/')).toBe('C:/tmp/custom-state-go');
    });

    it('honors an explicit HYPERCODE_GO_CONFIG_DIR override', () => {
        expect(resolveGoConfigDir('C:/tmp/home/.hypercode', 'C:/tmp/go-state').replaceAll('\\', '/')).toBe('C:/tmp/go-state');
    });

    it('treats both Node and Go runtimes as dashboard-startup capable', () => {
        expect(runtimeSupportsIntegratedDashboard('node')).toBe(true);
        expect(runtimeSupportsIntegratedDashboard('go')).toBe(true);
    });

    it('prefers the built Go binary when available', () => {
        const repoRoot = process.platform === 'win32'
            ? 'C:/repo/hypercode'
            : '/repo/hypercode';
        const spec = resolveGoRuntimeSpawnSpec(repoRoot, {}, () => true);

        if (process.platform === 'win32') {
            expect(spec.command.replaceAll('\\', '/')).toBe('C:/repo/hypercode/go/hypercode.exe');
        } else {
            expect(spec.command).toBe('/repo/hypercode/go/hypercode');
        }
        expect(spec.args).toEqual([]);
        expect(spec.usingPrebuiltBinary).toBe(true);
    });

    it('can force source-based Go launch when requested', () => {
        const repoRoot = process.platform === 'win32'
            ? 'C:/repo/hypercode'
            : '/repo/hypercode';
        const spec = resolveGoRuntimeSpawnSpec(repoRoot, { HYPERCODE_GO_USE_SOURCE: '1' }, () => true);

        expect(spec.command).toBe('go');
        expect(spec.args).toEqual(['run', './cmd/hypercode']);
        expect(spec.usingPrebuiltBinary).toBe(false);
    });

    it('describes Go runtime launch provenance truthfully', () => {
        expect(describeGoRuntimeLaunchMode(true)).toBe('prebuilt Go binary');
        expect(describeGoRuntimeLaunchMode(false)).toBe('source fallback via go run');
    });

    it('summarizes Go runtime startup surfaces truthfully', () => {
        expect(describeStartupModeSummary({
            runtime: 'go',
            dashboardRequested: true,
            mcpRequested: false,
            supervisorRequested: true,
            autoDriveRequested: true,
        })).toEqual([
            'Dashboard integration: compatibility-backed web runtime can start against the Go control plane.',
            'MCP flag compatibility: --no-mcp is not yet mapped for Go startup.',
            'Supervisor startup flag: Go exposes native supervisor APIs, but the startup flag is not yet mapped 1:1.',
            'Auto-Drive startup: not yet implemented for Go runtime startup.',
        ]);
    });

    it('summarizes Node compatibility runtime startup surfaces truthfully', () => {
        expect(describeStartupModeSummary({
            runtime: 'node',
            dashboardRequested: true,
            mcpRequested: true,
            supervisorRequested: false,
            autoDriveRequested: false,
        })).toEqual([
            'Dashboard integration: supported by the Node compatibility runtime.',
            'MCP bridge: enabled for this run.',
            'Supervisor startup: disabled for this run.',
            'Auto-Drive startup: disabled for this run.',
        ]);
=======
        const resolved = resolveDataDir('~/.borg', 'C:/tmp/home');
        expect(resolved.replaceAll('\\', '/')).toBe('C:/tmp/home/.borg');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.test.ts
    });
});

describe('dashboard startup helpers', () => {
    it('rewrites wildcard hosts to a browser-safe dashboard URL', () => {
        expect(resolveDashboardUrl('0.0.0.0', 3000)).toBe('http://127.0.0.1:3000/dashboard');
        expect(resolveDashboardUrl('127.0.0.1', 3010)).toBe('http://127.0.0.1:3010/dashboard');
    });

<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.test.ts
    it('waits for a HyperCode server health endpoint to become ready', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce({ ok: false, headers: { get: () => 'application/json' } })
            .mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: async () => ({ service: 'hypercode-go', ok: true }),
            });

        await expect(waitForHypercodeServer({
            host: '127.0.0.1',
            port: 4000,
            timeoutMs: 50,
            pollIntervalMs: 1,
        }, {
            fetchImpl: fetchImpl as any,
        })).resolves.toBe(true);
    });

    it('returns false when HyperCode readiness polling aborts before the service becomes ready', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: false, headers: { get: () => 'application/json' } });

        await expect(waitForHypercodeServer({
            host: '127.0.0.1',
            port: 4000,
            timeoutMs: 5,
            pollIntervalMs: 1,
            shouldAbort: () => true,
        }, {
            fetchImpl: fetchImpl as any,
        })).resolves.toBe(false);
    });

    it('detects a HyperCode server from JSON health endpoints', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({
            ok: true,
            headers: { get: () => 'application/json' },
            json: async () => ({ service: 'hypercode-go', ok: true }),
        });

        await expect(isHypercodeServer('127.0.0.1', 4000, fetchImpl as any)).resolves.toBe(true);
        expect(fetchImpl).toHaveBeenCalled();
    });

    it('returns false when health endpoints do not look like HyperCode', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({
            ok: true,
            headers: { get: () => 'application/json' },
            json: async () => ({ service: 'other-service', ok: false }),
            text: async () => 'other-service',
        });

        await expect(isHypercodeServer('127.0.0.1', 4000, fetchImpl as any)).resolves.toBe(false);
    });

=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.test.ts
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

    it('does not reuse an existing dashboard when the core had to fall back ports', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: true });

        await expect(pickDashboardPort(
            3000,
            false,
            '127.0.0.1',
            {
                allowReuseExisting: false,
                fetchImpl: fetchImpl as any,
                isPortFree: async (port) => port === 3010,
            },
        )).resolves.toEqual({
            port: 3010,
            reusedExisting: false,
        });
    });
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.test.ts

    it('reuses an already-running dashboard when reusing an existing control plane', async () => {
        await expect(resolveAlreadyRunningDashboardReuse({
            dashboardRequested: true,
            requestedDashboardPort: 3000,
            explicitDashboardPort: false,
            host: '127.0.0.1',
            shouldOpenDashboard: true,
        }, {
            pickDashboardPortFn: vi.fn().mockResolvedValue({ port: 3010, reusedExisting: true }) as any,
        })).resolves.toEqual({
            dashboardMode: 'reused existing dashboard runtime',
            dashboardUrl: 'http://127.0.0.1:3010/dashboard',
            dashboardPort: 3010,
            reusedExisting: true,
            shouldOpenDashboard: true,
        });
    });

    it('reports when no existing dashboard runtime is detected while reusing an existing control plane', async () => {
        await expect(resolveAlreadyRunningDashboardReuse({
            dashboardRequested: true,
            requestedDashboardPort: 3000,
            explicitDashboardPort: true,
            host: '127.0.0.1',
            shouldOpenDashboard: true,
        }, {
            pickDashboardPortFn: vi.fn().mockResolvedValue({ port: 3000, reusedExisting: false }) as any,
        })).resolves.toEqual({
            dashboardMode: 'requested dashboard runtime not detected',
            dashboardUrl: 'http://127.0.0.1:3000/dashboard',
            dashboardPort: 3000,
            reusedExisting: false,
            shouldOpenDashboard: false,
        });
    });

    it('starts a dashboard runtime attached to an existing control plane when none is already running', async () => {
        const onceHandlers: Record<string, (...args: unknown[]) => void> = {};
        const unref = vi.fn();
        const spawnImpl = vi.fn().mockReturnValue({
            once: (event: string, handler: (...args: unknown[]) => void) => {
                onceHandlers[event] = handler;
                return undefined;
            },
            unref,
        });
        const pickDashboardPortFn = vi.fn();

        await expect(attachDashboardToRunningControlPlane({
            requestedDashboardPort: 3000,
            explicitDashboardPort: false,
            host: '127.0.0.1',
            shouldOpenDashboard: true,
            controlPlaneBaseUrl: 'http://127.0.0.1:4000',
            webRoot: 'C:/repo/apps/web',
            repoRoot: 'C:/repo',
            dashboardPort: 3010,
            dashboardUrl: 'http://127.0.0.1:3010/dashboard',
        }, {
            pickDashboardPortFn: pickDashboardPortFn as any,
            spawnImpl: spawnImpl as any,
            waitForHttpReadyFn: vi.fn().mockResolvedValue(true) as any,
        })).resolves.toEqual({
            dashboardMode: 'started dashboard runtime attached to existing control plane',
            dashboardUrl: 'http://127.0.0.1:3010/dashboard',
            dashboardPort: 3010,
            reusedExisting: false,
            shouldOpenDashboard: true,
        });

        expect(pickDashboardPortFn).not.toHaveBeenCalled();
        expect(spawnImpl).toHaveBeenCalled();
        expect(unref).toHaveBeenCalled();
        expect(Object.keys(onceHandlers)).toEqual(expect.arrayContaining(['exit', 'error']));
    });

    it('returns detailed dashboard attach failure information', async () => {
        const spawnImpl = vi.fn().mockReturnValue({
            once: (event: string, handler: (...args: unknown[]) => void) => {
                if (event === 'error') {
                    handler(new Error('next missing'));
                }
                return undefined;
            },
            unref: vi.fn(),
        });

        await expect(attachDashboardToRunningControlPlane({
            requestedDashboardPort: 3000,
            explicitDashboardPort: true,
            host: '127.0.0.1',
            shouldOpenDashboard: true,
            controlPlaneBaseUrl: 'http://127.0.0.1:4000',
            webRoot: 'C:/repo/apps/web',
            repoRoot: 'C:/repo',
            dashboardPort: 3000,
            dashboardUrl: 'http://127.0.0.1:3000/dashboard',
        }, {
            spawnImpl: spawnImpl as any,
            waitForHttpReadyFn: vi.fn().mockResolvedValue(false) as any,
        })).resolves.toEqual({
            dashboardMode: 'dashboard launch attempted but failed',
            dashboardUrl: 'http://127.0.0.1:3000/dashboard',
            dashboardPort: 3000,
            reusedExisting: false,
            shouldOpenDashboard: false,
            detail: 'next missing',
        });
    });
=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.test.ts
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

    it('falls back to requested+1 when default requested port collides at bind time', () => {
        const fallback = resolveControlPlaneFallbackPort({
            requestedPort: 4000,
            selectedPort: 4000,
            explicitPort: false,
            reusedStalePort: false,
            startupError: { code: 'EADDRINUSE' },
        });

        expect(fallback).toBe(4001);
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

    it('picks the preferred fallback port when free, otherwise chooses next available', async () => {
        await expect(pickAvailableControlPlaneFallbackPort(4001, {
            isPortFree: async (port) => port === 4001,
        })).resolves.toBe(4001);

        await expect(pickAvailableControlPlaneFallbackPort(4001, {
            isPortFree: async (port) => port === 4003,
        })).resolves.toBe(4003);
    });

<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.test.ts
    it('can fall forward beyond the old narrow control-plane scan window', async () => {
        await expect(pickAvailableControlPlaneFallbackPort(4001, {
            isPortFree: async (port) => port === 4012,
        })).resolves.toBe(4012);
    });

=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.test.ts
    it('returns null when no fallback port is available in the scan window', async () => {
        await expect(pickAvailableControlPlaneFallbackPort(4001, {
            isPortFree: async () => false,
        })).resolves.toBeNull();
    });
});
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.test.ts

describe('readMatchingStartupProvenanceFromLock', () => {
    it('returns null if the lock file does not exist', () => {
        const dataDir = createTempDir();
        expect(readMatchingStartupProvenanceFromLock(dataDir, 4000)).toBeNull();
    });

    it('returns null if the lock file exists but the port does not match', () => {
        const dataDir = createTempDir();
        writeFileSync(join(dataDir, 'lock'), JSON.stringify({
            instanceId: 'hypercode-stale',
            pid: 1234,
            port: 4000,
            host: '127.0.0.1',
            createdAt: '2026-04-06T00:00:00.000Z',
            startup: {
                activeRuntime: 'go',
            }
        }), 'utf8');

        expect(readMatchingStartupProvenanceFromLock(dataDir, 4001)).toBeNull();
    });

    it('returns normalized startup provenance if the lock file matches the port', () => {
        const dataDir = createTempDir();
        writeFileSync(join(dataDir, 'lock'), JSON.stringify({
            instanceId: 'hypercode-live',
            pid: 1234,
            port: 4000,
            host: '127.0.0.1',
            createdAt: '2026-04-06T00:00:00.000Z',
            startup: {
                activeRuntime: 'go',
                launchMode: 'prebuilt Go binary',
            }
        }), 'utf8');

        const prov = readMatchingStartupProvenanceFromLock(dataDir, 4000);
        expect(prov).not.toBeNull();
        expect(prov?.activeRuntime).toBe('go');
        expect(prov?.launchMode).toBe('prebuilt Go binary');
        expect(prov?.portDecision).toBe('derived from lock record');
    });
});
=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.test.ts
