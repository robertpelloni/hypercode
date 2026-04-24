/**
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
 * `hypercode start` - Start the HyperCode backend server
 *
 * Launches the HyperCode core server with Express/tRPC/WebSocket/MCP endpoints.
=======
 * `borg start` - Start the borg backend server
 *
 * Launches the borg core server with Express/tRPC/WebSocket/MCP endpoints.
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
 * The server provides the API backend for the WebUI dashboard, CLI commands,
 * and external MCP clients.
 *
 * @example
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
 *   hypercode start                    # Start on default port 3000
 *   hypercode start --port 8080        # Start on custom port
 *   hypercode start --no-mcp           # Start without MCP server
 *   hypercode start --config ./my.json # Use custom config file
=======
 *   borg start                    # Start on default port 3000
 *   borg start --port 8080        # Start on custom port
 *   borg start --no-mcp           # Start without MCP server
 *   borg start --config ./my.json # Use custom config file
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Command } from 'commander';
import { readCanonicalVersion } from '../version.js';

<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
export interface HyperCodeStartLockRecord {
=======
export interface BorgStartLockRecord {
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
  instanceId: string;
  pid: number;
  port: number;
  host: string;
  createdAt: string;
}

<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
export interface HyperCodeStartLockHandle {
=======
export interface BorgStartLockHandle {
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
  port: number;
  lockPath: string;
  clearedStaleLock: boolean;
  reusedStalePort: boolean;
  updatePort: (port: number) => void;
  release: () => Promise<void>;
  releaseSync: () => void;
}

<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
export interface HyperCodeStartLifecycleHandlers {
=======
export interface BorgStartLifecycleHandlers {
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
  cleanup: () => void;
  handleSigint: () => void;
  handleSigterm: () => void;
  handleUncaughtException: (error: unknown) => void;
  handleUnhandledRejection: (reason: unknown) => void;
}

interface CreateLockLifecycleHandlersDeps {
  exit?: (code: number) => void;
  logError?: (message?: unknown, ...optionalParams: unknown[]) => void;
}

interface AcquireSingleInstanceLockOptions {
  dataDir: string;
  requestedPort: number;
  explicitPort: boolean;
  host: string;
}

interface AcquireSingleInstanceLockDeps {
  now?: () => Date;
  getPid?: () => number;
  isProcessRunning?: (pid: number) => boolean;
  isPortFree?: (port: number) => Promise<boolean>;
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
  isExistingHypercode?: (host: string, port: number) => Promise<boolean>;
=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
}

type CoreRuntimeModule = {
  startOrchestrator?: (options?: {
    host?: string;
    trpcPort?: number;
    startSupervisor?: boolean;
    startMcp?: boolean;
    autoDrive?: boolean;
  }) => Promise<{
    host: string;
    trpcPort: number;
    bridgePort: number | null;
  }>;
};

type FetchLike = typeof globalThis.fetch;

const DASHBOARD_PORT_CANDIDATES = [3000, 3010, 3020, 3030, 3040] as const;
const CONTROL_PLANE_FALLBACK_OFFSETS = [1, 2, 3, 4, 5] as const;
const DEFAULT_DASHBOARD_READY_TIMEOUT_MS = 30_000;
const DEFAULT_DASHBOARD_POLL_INTERVAL_MS = 500;

export function resolveDataDir(dataDir: string, homeDirectory: string = homedir()): string {
  if (dataDir === '~') {
    return homeDirectory;
  }

  if (dataDir.startsWith('~/') || dataDir.startsWith('~\\') || dataDir.startsWith(`~${sep}`)) {
    return resolve(homeDirectory, dataDir.slice(2));
  }

  return isAbsolute(dataDir) ? dataDir : resolve(dataDir);
}

export function resolveRepoRoot(startDir: string): string | null {
  let current = resolve(startDir);
  const root = current.slice(0, current.indexOf(sep) + 1) || current;

  while (true) {
    if (existsSync(join(current, 'turbo.json'))) {
      return current;
    }

    if (current === root) {
      return null;
    }

    current = dirname(current);
  }
}

export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

export async function isPortFree(port: number): Promise<boolean> {
  return await new Promise((resolvePort) => {
    const server = net.createServer();

    server.once('error', () => {
      resolvePort(false);
    });

    server.once('listening', () => {
      server.close(() => resolvePort(true));
    });

    server.listen(port);
  });
}

<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
function readStartLock(lockPath: string): HyperCodeStartLockRecord | null {
  try {
    const parsed = JSON.parse(readFileSync(lockPath, 'utf8')) as Partial<HyperCodeStartLockRecord>;
=======
function readStartLock(lockPath: string): BorgStartLockRecord | null {
  try {
    const parsed = JSON.parse(readFileSync(lockPath, 'utf8')) as Partial<BorgStartLockRecord>;
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
    if (
      typeof parsed.instanceId !== 'string'
      || typeof parsed.pid !== 'number'
      || typeof parsed.port !== 'number'
      || typeof parsed.host !== 'string'
      || typeof parsed.createdAt !== 'string'
    ) {
      return null;
    }

<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
    return parsed as HyperCodeStartLockRecord;
=======
    return parsed as BorgStartLockRecord;
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
  } catch {
    return null;
  }
}

<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
function writeStartLock(lockPath: string, record: HyperCodeStartLockRecord): void {
=======
function writeStartLock(lockPath: string, record: BorgStartLockRecord): void {
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
  const fd = openSync(lockPath, 'wx');
  try {
    writeFileSync(fd, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  } finally {
    closeSync(fd);
  }
}

export async function acquireSingleInstanceLock(
  options: AcquireSingleInstanceLockOptions,
  deps: AcquireSingleInstanceLockDeps = {},
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
): Promise<HyperCodeStartLockHandle> {
=======
): Promise<BorgStartLockHandle> {
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
  const now = deps.now ?? (() => new Date());
  const getPid = deps.getPid ?? (() => process.pid);
  const checkProcessRunning = deps.isProcessRunning ?? isProcessRunning;
  const checkPortFree = deps.isPortFree ?? isPortFree;

  const resolvedDataDir = resolveDataDir(options.dataDir);
  const lockPath = join(resolvedDataDir, 'lock');
  mkdirSync(resolvedDataDir, { recursive: true });

  const pid = getPid();
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
  const instanceId = `hypercode-${pid}-${now().getTime()}`;
=======
  const instanceId = `borg-${pid}-${now().getTime()}`;
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
  let selectedPort = options.requestedPort;
  let clearedStaleLock = false;
  let reusedStalePort = false;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      writeStartLock(lockPath, {
        instanceId,
        pid,
        port: selectedPort,
        host: options.host,
        createdAt: now().toISOString(),
      });

      let currentPort = selectedPort;

      const writeCurrentRecord = () => {
        writeFileSync(lockPath, `${JSON.stringify({
          instanceId,
          pid,
          port: currentPort,
          host: options.host,
          createdAt: now().toISOString(),
        }, null, 2)}\n`, 'utf8');
      };

      const releaseSync = () => {
        const current = readStartLock(lockPath);
        if (current?.instanceId === instanceId) {
          rmSync(lockPath, { force: true });
        }
      };

      const updatePort = (port: number) => {
        const current = readStartLock(lockPath);
        if (current?.instanceId !== instanceId) {
          return;
        }

        currentPort = port;
        writeCurrentRecord();
      };

      const selectedPortIsFree = selectedPort > 0
        ? await checkPortFree(selectedPort)
        : true;

      if (!selectedPortIsFree) {
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
        const isExisting = deps.isExistingHypercode
          ? await deps.isExistingHypercode(options.host, selectedPort)
          : false;
        if (isExisting) {
          releaseSync();
          const err = new Error(
            `HyperCode is already running on port ${selectedPort}.`,
          ) as Error & { name: string; port: number; source: string };
          err.name = 'HypercodeAlreadyRunningError';
          err.port = selectedPort;
          err.source = 'port';
          throw err;
        }
        releaseSync();
        throw new Error(
          `Port ${selectedPort} is already in use by another process. `
          + `Stop that process or start HyperCode with --port <free-port>.`,
=======
        releaseSync();
        throw new Error(
          `Port ${selectedPort} is already in use by another process. `
          + `Stop that process or start borg with --port <free-port>.`,
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
        );
      }

      return {
        get port() {
          return currentPort;
        },
        lockPath,
        clearedStaleLock,
        reusedStalePort,
        updatePort,
        release: async () => {
          releaseSync();
        },
        releaseSync,
      };
    } catch (error) {
      const fsError = error as NodeJS.ErrnoException;
      if (fsError.code !== 'EEXIST') {
        throw error;
      }

      const existingLock = readStartLock(lockPath);
      if (existingLock && checkProcessRunning(existingLock.pid)) {
        const lockedPortIsFree = existingLock.port > 0
          ? await checkPortFree(existingLock.port)
          : false;

        if (!lockedPortIsFree) {
          throw new Error(
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
            `HyperCode is already running (PID ${existingLock.pid}) on port ${existingLock.port}. `
=======
            `borg is already running (PID ${existingLock.pid}) on port ${existingLock.port}. `
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
            + `Stop that process before starting another instance, or remove ${lockPath} if it is incorrect.`,
          );
        }
      }

      clearedStaleLock = true;
      if (!options.explicitPort && existingLock?.port && existingLock.port > 0) {
        const stalePortIsFree = await checkPortFree(existingLock.port);
        if (stalePortIsFree) {
          selectedPort = existingLock.port;
          reusedStalePort = true;
        }
      }

      rmSync(lockPath, { force: true });
    }
  }

<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
  throw new Error(`Unable to acquire HyperCode startup lock at ${lockPath}`);
=======
  throw new Error(`Unable to acquire borg startup lock at ${lockPath}`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
}

export async function startCoreRuntime(
  options: {
    host: string;
    port: number;
    mcp: boolean;
    supervisor?: boolean;
    autoDrive?: boolean;
  },
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
  loadCore: () => Promise<CoreRuntimeModule> = async () => await import('@hypercode/core/orchestrator'),
=======
  loadCore: () => Promise<CoreRuntimeModule> = async () => await import('@borg/core/orchestrator'),
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
) {
  const core = await loadCore();

  if (typeof core.startOrchestrator !== 'function') {
    throw new Error('Core orchestrator entrypoint is unavailable');
  }

  return await core.startOrchestrator({
    host: options.host,
    trpcPort: options.port,
    startMcp: options.mcp,
    startSupervisor: options.supervisor ?? false,
    autoDrive: options.autoDrive ?? false,
  });
}

export function resolveBrowserHost(host: string): string {
  return host === '0.0.0.0' || host === '::' || host === '[::]'
    ? '127.0.0.1'
    : host;
}

export function resolveDashboardUrl(host: string, port: number): string {
  return `http://${resolveBrowserHost(host)}:${port}/dashboard`;
}

export async function isHttpReady(
  url: string,
  fetchImpl: FetchLike = globalThis.fetch,
): Promise<boolean> {
  try {
    const response = await fetchImpl(url, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

export async function waitForHttpReady(
  options: {
    url: string;
    timeoutMs?: number;
    pollIntervalMs?: number;
    shouldAbort?: () => boolean;
  },
  deps: {
    fetchImpl?: FetchLike;
  } = {},
): Promise<boolean> {
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch;
  const deadline = Date.now() + (options.timeoutMs ?? DEFAULT_DASHBOARD_READY_TIMEOUT_MS);
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_DASHBOARD_POLL_INTERVAL_MS;

  do {
    if (await isHttpReady(options.url, fetchImpl)) {
      return true;
    }

    if (options.shouldAbort?.()) {
      return false;
    }

    if (Date.now() >= deadline) {
      return false;
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, pollIntervalMs));
  } while (true);
}

export async function pickDashboardPort(
  requestedPort: number,
  explicitPort: boolean,
  host: string,
  deps: {
    isPortFree?: (port: number) => Promise<boolean>;
    fetchImpl?: FetchLike;
    allowReuseExisting?: boolean;
  } = {},
): Promise<{ port: number; reusedExisting: boolean }> {
  const checkPortFree = deps.isPortFree ?? isPortFree;
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch;
  const allowReuseExisting = deps.allowReuseExisting ?? true;
  const requestedUrl = resolveDashboardUrl(host, requestedPort);

  if (allowReuseExisting && await isHttpReady(requestedUrl, fetchImpl)) {
    return { port: requestedPort, reusedExisting: true };
  }

  if (explicitPort) {
    return { port: requestedPort, reusedExisting: false };
  }

  if (await checkPortFree(requestedPort)) {
    return { port: requestedPort, reusedExisting: false };
  }

  for (const candidate of DASHBOARD_PORT_CANDIDATES) {
    if (candidate === requestedPort) {
      continue;
    }

    const candidateUrl = resolveDashboardUrl(host, candidate);
    if (allowReuseExisting && await isHttpReady(candidateUrl, fetchImpl)) {
      return { port: candidate, reusedExisting: true };
    }

    if (await checkPortFree(candidate)) {
      return { port: candidate, reusedExisting: false };
    }
  }

  return { port: requestedPort, reusedExisting: false };
}

export function isAddrInUseError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  if (code === 'EADDRINUSE') {
    return true;
  }

  const cause = (error as { cause?: unknown }).cause;
  return cause ? isAddrInUseError(cause) : false;
}

export function resolveControlPlaneFallbackPort(options: {
  requestedPort: number;
  selectedPort: number;
  explicitPort: boolean;
  reusedStalePort: boolean;
  startupError: unknown;
}): number | null {
  if (options.explicitPort) {
    return null;
  }

  if (!isAddrInUseError(options.startupError)) {
    return null;
  }

  if (!options.reusedStalePort && options.requestedPort === options.selectedPort) {
    return options.requestedPort + 1;
  }

  if (!options.reusedStalePort) {
    return null;
  }

  if (options.requestedPort === options.selectedPort) {
    return null;
  }

  return options.requestedPort;
}

export async function pickAvailableControlPlaneFallbackPort(
  preferredPort: number,
  deps: {
    isPortFree?: (port: number) => Promise<boolean>;
  } = {},
): Promise<number | null> {
  const checkPortFree = deps.isPortFree ?? isPortFree;

  if (await checkPortFree(preferredPort)) {
    return preferredPort;
  }

  for (const offset of CONTROL_PLANE_FALLBACK_OFFSETS) {
    const candidate = preferredPort + offset;
    if (await checkPortFree(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function syncLockHandlePort(
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
  lockHandle: HyperCodeStartLockHandle,
=======
  lockHandle: BorgStartLockHandle,
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
  runtimePort: number | null | undefined,
): void {
  if (!Number.isInteger(runtimePort) || runtimePort === null || runtimePort === undefined) {
    return;
  }

  if (lockHandle.port === runtimePort) {
    return;
  }

  lockHandle.updatePort(runtimePort);
}

function getDashboardSpawnSpec(webRoot: string, repoRoot: string, host: string, port: number) {
  const nextBinCandidates = [
    join(repoRoot, 'node_modules', 'next', 'dist', 'bin', 'next'),
    join(webRoot, 'node_modules', 'next', 'dist', 'bin', 'next'),
  ];
  const nextBin = nextBinCandidates.find((candidate) => existsSync(candidate)) ?? nextBinCandidates[0];

  return {
    command: process.execPath,
    args: [nextBin, 'start', '--port', String(port), '--hostname', host],
    cwd: webRoot,
  };
}

export function createLockLifecycleHandlers(
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
  lockHandle: HyperCodeStartLockHandle,
  deps: CreateLockLifecycleHandlersDeps = {},
): HyperCodeStartLifecycleHandlers {
=======
  lockHandle: BorgStartLockHandle,
  deps: CreateLockLifecycleHandlersDeps = {},
): BorgStartLifecycleHandlers {
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
  const exit = deps.exit ?? ((code: number) => process.exit(code));
  const logError = deps.logError ?? ((message?: unknown, ...optionalParams: unknown[]) => console.error(message, ...optionalParams));

  const cleanup = () => {
    lockHandle.releaseSync();
  };

  return {
    cleanup,
    handleSigint: () => {
      cleanup();
      exit(130);
    },
    handleSigterm: () => {
      cleanup();
      exit(143);
    },
    handleUncaughtException: (error: unknown) => {
      cleanup();
      logError(error instanceof Error ? error.stack ?? error.message : String(error));
      exit(1);
    },
    handleUnhandledRejection: (reason: unknown) => {
      cleanup();
      logError(reason instanceof Error ? reason.stack ?? reason.message : String(reason));
      exit(1);
    },
  };
}

<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
// === Missing exported functions required by start.test.ts ===

export function resolveRuntimePreference(
  cliFlag?: string,
  envValue?: string,
): 'auto' | 'go' | 'node' {
  const value = cliFlag ?? envValue;
  if (!value) return 'auto';
  if (value === 'go' || value === 'node' || value === 'auto') return value;
  throw new Error(`Unsupported runtime '${value}'`);
}

export function resolveGoConfigDir(dataDir: string, override?: string): string {
  if (override) return resolve(override);
  return resolve(dataDir + '-go');
}

export function runtimeSupportsIntegratedDashboard(runtime: string): boolean {
  return runtime === 'node' || runtime === 'go';
}

export interface GoRuntimeSpawnSpec {
  command: string;
  args: string[];
  usingPrebuiltBinary: boolean;
}

export function resolveGoRuntimeSpawnSpec(
  repoRoot: string,
  env: Record<string, string | undefined>,
  prebuiltExists: () => boolean,
): GoRuntimeSpawnSpec {
  const useSource = env.HYPERCODE_GO_USE_SOURCE === '1';
  if (!useSource && prebuiltExists()) {
    const ext = process.platform === 'win32' ? '.exe' : '';
    return {
      command: join(repoRoot, 'go', `hypercode${ext}`),
      args: [],
      usingPrebuiltBinary: true,
    };
  }
  return {
    command: 'go',
    args: ['run', './cmd/hypercode'],
    usingPrebuiltBinary: false,
  };
}

export function describeGoRuntimeLaunchMode(usingPrebuiltBinary: boolean): string {
  return usingPrebuiltBinary ? 'prebuilt Go binary' : 'source fallback via go run';
}

export interface StartupModeSummaryOptions {
  runtime: string;
  dashboardRequested: boolean;
  mcpRequested: boolean;
  supervisorRequested: boolean;
  autoDriveRequested: boolean;
}

export function describeStartupModeSummary(options: StartupModeSummaryOptions): string[] {
  const lines: string[] = [];
  if (options.runtime === 'go') {
    lines.push('Dashboard integration: compatibility-backed web runtime can start against the Go control plane.');
    if (!options.mcpRequested) lines.push('MCP flag compatibility: --no-mcp is not yet mapped for Go startup.');
    if (options.supervisorRequested) lines.push('Supervisor startup flag: Go exposes native supervisor APIs, but the startup flag is not yet mapped 1:1.');
    if (options.autoDriveRequested) lines.push('Auto-Drive startup: not yet implemented for Go runtime startup.');
  } else {
    lines.push('Dashboard integration: supported by the Node compatibility runtime.');
    lines.push(`MCP bridge: ${options.mcpRequested ? 'enabled' : 'disabled'} for this run.`);
    lines.push(`Supervisor startup: ${options.supervisorRequested ? 'enabled' : 'disabled'} for this run.`);
    lines.push(`Auto-Drive startup: ${options.autoDriveRequested ? 'enabled' : 'disabled'} for this run.`);
  }
  return lines;
}

export async function isHypercodeServer(
  host: string,
  port: number,
  fetchImpl: (url: string) => Promise<{ ok: boolean; headers: { get: (name: string) => string | null }; json?: () => Promise<any>; text?: () => Promise<string> }>,
): Promise<boolean> {
  try {
    const url = `http://${host}:${port}/health`;
    const res = await fetchImpl(url);
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('application/json') && res.json) {
      const data = await res.json();
      return data.service === 'hypercode-go' || data.ok === true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function waitForHypercodeServer(
  options: { host: string; port: number; timeoutMs: number; pollIntervalMs: number; shouldAbort?: () => boolean },
  deps: { fetchImpl: typeof fetch },
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < options.timeoutMs) {
    if (options.shouldAbort?.()) return false;
    try {
      const url = `http://${options.host}:${options.port}/health`;
      const res = await deps.fetchImpl(url);
      if (res.ok) {
        const ct = res.headers.get?.('content-type') ?? '';
        if (ct.includes('application/json')) {
          const data = await (res as any).json();
          if (data.service === 'hypercode-go' || data.ok === true) return true;
        }
      }
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, options.pollIntervalMs));
  }
  return false;
}

export interface DashboardReuseResult {
  dashboardMode: string;
  dashboardUrl: string;
  dashboardPort: number;
  reusedExisting: boolean;
  shouldOpenDashboard: boolean;
}

export async function resolveAlreadyRunningDashboardReuse(
  options: {
    dashboardRequested: boolean;
    requestedDashboardPort: number;
    explicitDashboardPort: boolean;
    host: string;
    shouldOpenDashboard: boolean;
  },
  deps: { pickDashboardPortFn: typeof pickDashboardPort },
): Promise<DashboardReuseResult> {
  if (!options.dashboardRequested) {
    return {
      dashboardMode: 'dashboard not requested',
      dashboardUrl: resolveDashboardUrl(options.host, options.requestedDashboardPort),
      dashboardPort: options.requestedDashboardPort,
      reusedExisting: false,
      shouldOpenDashboard: false,
    };
  }
  const pick = await deps.pickDashboardPortFn(
    options.requestedDashboardPort,
    options.explicitDashboardPort,
    options.host,
  );
  if (pick.reusedExisting) {
    return {
      dashboardMode: 'reused existing dashboard runtime',
      dashboardUrl: resolveDashboardUrl(options.host, pick.port),
      dashboardPort: pick.port,
      reusedExisting: true,
      shouldOpenDashboard: options.shouldOpenDashboard,
    };
  }
  return {
    dashboardMode: 'requested dashboard runtime not detected',
    dashboardUrl: resolveDashboardUrl(options.host, options.requestedDashboardPort),
    dashboardPort: options.requestedDashboardPort,
    reusedExisting: false,
    shouldOpenDashboard: false,
  };
}

export interface DashboardAttachResult extends DashboardReuseResult {
  detail?: string;
}

export async function attachDashboardToRunningControlPlane(
  options: {
    requestedDashboardPort: number;
    explicitDashboardPort: boolean;
    host: string;
    shouldOpenDashboard: boolean;
    controlPlaneBaseUrl: string;
    webRoot: string;
    repoRoot: string;
    dashboardPort: number;
    dashboardUrl: string;
  },
  deps: {
    pickDashboardPortFn?: typeof pickDashboardPort;
    spawnImpl?: typeof spawn;
    waitForHttpReadyFn?: typeof waitForHttpReady;
  } = {},
): Promise<DashboardAttachResult> {
  const spawnFn = deps.spawnImpl ?? spawn;
  const waitForReady = deps.waitForHttpReadyFn ?? waitForHttpReady;
  let launchError: string | null = null;
  let exited = false;

  const child = spawnFn('npx', ['next', 'dev', '-p', String(options.dashboardPort)], {
    cwd: options.webRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      HYPERCODE_TRPC_UPSTREAM: `${options.controlPlaneBaseUrl}/trpc`,
      NEXT_PUBLIC_HYPERCODE_ORCHESTRATOR_URL: options.controlPlaneBaseUrl,
      NEXT_PUBLIC_AUTOPILOT_URL: options.controlPlaneBaseUrl,
    },
    windowsHide: true,
  });

  child.once('exit', () => { exited = true; });
  child.once('error', (err: Error) => { launchError = err.message; exited = true; });
  child.unref?.();

  const ready = await waitForReady({
    url: options.dashboardUrl,
    shouldAbort: () => exited,
  });

  if (launchError) {
    return {
      dashboardMode: 'dashboard launch attempted but failed',
      dashboardUrl: options.dashboardUrl,
      dashboardPort: options.dashboardPort,
      reusedExisting: false,
      shouldOpenDashboard: false,
      detail: launchError,
    };
  }

  if (!ready || exited) {
    return {
      dashboardMode: 'dashboard launch attempted but failed',
      dashboardUrl: options.dashboardUrl,
      dashboardPort: options.dashboardPort,
      reusedExisting: false,
      shouldOpenDashboard: false,
    };
  }

  return {
    dashboardMode: 'started dashboard runtime attached to existing control plane',
    dashboardUrl: options.dashboardUrl,
    dashboardPort: options.dashboardPort,
    reusedExisting: false,
    shouldOpenDashboard: options.shouldOpenDashboard,
  };
}

export interface StartupProvenance {
  activeRuntime?: string;
  launchMode?: string;
  portDecision?: string;
  [key: string]: unknown;
}

export function readMatchingStartupProvenanceFromLock(
  dataDir: string,
  port: number,
): StartupProvenance | null {
  const resolvedDataDir = resolveDataDir(dataDir);
  const lockPath = join(resolvedDataDir, 'lock');
  const lock = readStartLock(lockPath);
  if (!lock || lock.port !== port) return null;
  return {
    activeRuntime: (lock as any).startup?.activeRuntime ?? 'unknown',
    launchMode: (lock as any).startup?.launchMode ?? 'unknown',
    portDecision: 'derived from lock record',
    ...(lock as any).startup,
  };
}

export function registerStartCommand(program: Command): void {
  program
    .command('start')
    .description('Start the HyperCode backend server (Express/tRPC/WebSocket/MCP)')
=======
export function registerStartCommand(program: Command): void {
  program
    .command('start')
    .description('Start the borg backend server (Express/tRPC/WebSocket/MCP)')
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
    .option('-p, --port <number>', 'tRPC control-plane port', '4000')
    .option('--dashboard-port <number>', 'Dashboard web runtime port', '3000')
    .option('-H, --host <address>', 'Server host address', '0.0.0.0')
    .option('--no-mcp', 'Disable the MCP server endpoint')
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
    .option('--supervisor', 'Enable HyperCode supervisor startup')
=======
    .option('--supervisor', 'Enable borg supervisor startup')
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
    .option('--auto-drive', 'Enable Director auto-drive after startup')
    .option('--no-dashboard', 'Disable serving the WebUI dashboard')
    .option('--no-open-dashboard', 'Start the dashboard runtime without opening the browser')
    .option('-c, --config <path>', 'Path to config file')
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
    .option('-d, --data-dir <path>', 'Data directory for HyperCode state (compat path: ~/.hypercode)', '~/.hypercode')
    .option('--daemon', 'Run as background daemon')
    .addHelpText('after', `
Examples:
  $ hypercode start                     Start with defaults (tRPC on port 4000)
  $ hypercode start -p 8080             Start on port 8080
  $ hypercode start --no-mcp            Start without MCP server
  $ hypercode start --auto-drive        Start the Director after boot completes
  $ hypercode start --daemon            Run as background service
  $ hypercode start --host 127.0.0.1    Bind to localhost only
=======
    .option('-d, --data-dir <path>', 'Data directory for borg state (compat path: ~/.borg)', '~/.borg')
    .option('--daemon', 'Run as background daemon')
    .addHelpText('after', `
Examples:
  $ borg start                     Start with defaults (tRPC on port 4000)
  $ borg start -p 8080             Start on port 8080
  $ borg start --no-mcp            Start without MCP server
  $ borg start --auto-drive        Start the Director after boot completes
  $ borg start --daemon            Run as background service
  $ borg start --host 127.0.0.1    Bind to localhost only
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
    `)
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      const requestedPort = parseInt(opts.port, 10);
      const requestedDashboardPort = parseInt(opts.dashboardPort, 10);
      const host = opts.host;
      const explicitPort = process.argv.includes('--port') || process.argv.includes('-p');
      const explicitDashboardPort = process.argv.some((arg) => arg === '--dashboard-port' || arg.startsWith('--dashboard-port='));
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
      let lockHandle: HyperCodeStartLockHandle | null = null;
      let dashboardChild: ChildProcess | null = null;

      const cliDir = dirname(fileURLToPath(import.meta.url));
      const hypercodeVersion = readCanonicalVersion(cliDir);
      const repoRoot = resolveRepoRoot(cliDir) ?? resolve(cliDir, '..', '..', '..', '..', '..');
      const webRoot = join(repoRoot, 'apps', 'web');
      console.log(chalk.bold.cyan(`\n  ⬡ HyperCode v${hypercodeVersion}`));
=======
      let lockHandle: BorgStartLockHandle | null = null;
      let dashboardChild: ChildProcess | null = null;

      const cliDir = dirname(fileURLToPath(import.meta.url));
      const borgVersion = readCanonicalVersion(cliDir);
      const repoRoot = resolveRepoRoot(cliDir) ?? resolve(cliDir, '..', '..', '..', '..', '..');
      const webRoot = join(repoRoot, 'apps', 'web');
      console.log(chalk.bold.cyan(`\n  ⬡ borg v${borgVersion}`));
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
      console.log(chalk.dim('  The Neural Operating System\n'));

      try {
        lockHandle = await acquireSingleInstanceLock({
          dataDir: opts.dataDir,
          requestedPort,
          explicitPort,
          host,
        });

        const port = lockHandle.port;
        const lifecycle = createLockLifecycleHandlers(lockHandle);
        const cleanupDashboardChild = () => {
          if (dashboardChild && !dashboardChild.killed) {
            dashboardChild.kill();
          }
          dashboardChild = null;
        };

        console.log(chalk.yellow('  Starting server...'));
        console.log(chalk.dim(`  Host: ${host}:${port}`));
        console.log(chalk.dim(`  MCP:  ${opts.mcp ? 'enabled' : 'disabled'}`));
        console.log(chalk.dim(`  Supervisor: ${opts.supervisor ? 'enabled' : 'disabled'}`));
        console.log(chalk.dim(`  Auto-Drive: ${opts.autoDrive ? 'enabled' : 'disabled'}`));
        console.log(chalk.dim(`  Dashboard: ${opts.dashboard ? 'enabled' : 'disabled'}`));
        console.log(chalk.dim(`  Lock: ${lockHandle.lockPath}`));
        if (lockHandle.clearedStaleLock) {
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
          console.log(chalk.yellow(`  ↺ Cleared stale HyperCode lock${lockHandle.reusedStalePort ? ` and reused port ${port}` : ''}`));
=======
          console.log(chalk.yellow(`  ↺ Cleared stale borg lock${lockHandle.reusedStalePort ? ` and reused port ${port}` : ''}`));
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
        }
        console.log('');

        let runtime;
        let activePort = port;

        try {
          runtime = await startCoreRuntime({
            host,
            port: activePort,
            mcp: Boolean(opts.mcp),
            supervisor: Boolean(opts.supervisor),
            autoDrive: Boolean(opts.autoDrive),
          });
          activePort = runtime.trpcPort;
          syncLockHandlePort(lockHandle, runtime.trpcPort);
        } catch (startupError) {
          const fallbackPort = resolveControlPlaneFallbackPort({
            requestedPort,
            selectedPort: activePort,
            explicitPort,
            reusedStalePort: lockHandle.reusedStalePort,
            startupError,
          });

          if (fallbackPort === null) {
            throw startupError;
          }

          const resolvedFallbackPort = await pickAvailableControlPlaneFallbackPort(fallbackPort);
          if (resolvedFallbackPort === null) {
            throw startupError;
          }

          if (lockHandle.port !== resolvedFallbackPort) {
            console.log(chalk.yellow(`  ↺ Port ${activePort} was unavailable at bind time; retrying control-plane startup on port ${resolvedFallbackPort}.`));
          }
          activePort = resolvedFallbackPort;

          runtime = await startCoreRuntime({
            host,
            port: activePort,
            mcp: Boolean(opts.mcp),
            supervisor: Boolean(opts.supervisor),
            autoDrive: Boolean(opts.autoDrive),
          });
          activePort = runtime.trpcPort;
          syncLockHandlePort(lockHandle, runtime.trpcPort);
        }

        console.log(chalk.dim('  Core loaded: orchestrator started'));
        console.log(chalk.green(`  ✓ tRPC control plane running at http://${runtime.host}:${runtime.trpcPort}/trpc`));
        if (opts.mcp) {
          console.log(chalk.green(`  ✓ MCP bridge target ws://127.0.0.1:${runtime.bridgePort ?? 3001} (+ HTTP health on /health when available)`));
        }
        if (opts.supervisor) {
          console.log(chalk.green('  ✓ Supervisor startup enabled for this run'));
        }
        if (opts.dashboard) {
          const browserHost = resolveBrowserHost(runtime.host);
          const orchestratorBaseUrl = `http://${browserHost}:${runtime.trpcPort}`;
          const dashboardSelection = await pickDashboardPort(
            requestedDashboardPort,
            explicitDashboardPort,
            host,
            {
              allowReuseExisting: activePort === requestedPort,
            },
          );
          const dashboardUrl = resolveDashboardUrl(host, dashboardSelection.port);
          const shouldOpenDashboard = opts.openDashboard !== false && !opts.daemon;

          if (dashboardSelection.reusedExisting) {
            console.log(chalk.green(`  ✓ Reusing dashboard runtime at ${dashboardUrl}`));
          } else {
            const { command, args, cwd } = getDashboardSpawnSpec(
              webRoot,
              repoRoot,
              host,
              dashboardSelection.port,
            );
            let dashboardExited = false;
            let dashboardLaunchErrorMessage: string | null = null;

            dashboardChild = spawn(command, args, {
              cwd,
              stdio: 'inherit',
              env: {
                ...process.env,
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/start.ts
                HYPERCODE_TRPC_UPSTREAM: `${orchestratorBaseUrl}/trpc`,
                NEXT_PUBLIC_HYPERCODE_ORCHESTRATOR_URL: orchestratorBaseUrl,
=======
                BORG_TRPC_UPSTREAM: `${orchestratorBaseUrl}/trpc`,
                NEXT_PUBLIC_BORG_ORCHESTRATOR_URL: orchestratorBaseUrl,
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/start.ts
                NEXT_PUBLIC_AUTOPILOT_URL: orchestratorBaseUrl,
              },
              windowsHide: true,
            });
            dashboardChild.once('exit', () => {
              dashboardExited = true;
              dashboardChild = null;
            });
            dashboardChild.once('error', (error) => {
              dashboardLaunchErrorMessage = error instanceof Error ? error.message : String(error);
              dashboardExited = true;
              dashboardChild = null;
            });

            if (!explicitDashboardPort && dashboardSelection.port !== requestedDashboardPort) {
              console.log(chalk.yellow(`  ↺ Dashboard port ${requestedDashboardPort} busy, falling back to ${dashboardSelection.port}`));
              if (activePort !== requestedPort) {
                console.log(chalk.yellow(`  ↺ Started a fresh dashboard runtime so it can target the live control plane at ${orchestratorBaseUrl}`));
              }
            }

            const dashboardReady = await waitForHttpReady({
              url: dashboardUrl,
              shouldAbort: () => dashboardExited,
            });

            if (dashboardReady) {
              console.log(chalk.green(`  ✓ Dashboard runtime ready at ${dashboardUrl}`));
            } else if (dashboardLaunchErrorMessage) {
              console.log(chalk.yellow(`  ⚠ Dashboard runtime failed to launch: ${dashboardLaunchErrorMessage}`));
            } else if (dashboardExited) {
              console.log(chalk.yellow(`  ⚠ Dashboard runtime exited before ${dashboardUrl} became ready.`));
            } else {
              console.log(chalk.yellow(`  ⚠ Dashboard runtime is still starting. Visit ${dashboardUrl} in a moment.`));
            }
          }

          if (shouldOpenDashboard) {
            try {
              const open = (await import('open')).default;
              await open(dashboardUrl);
              console.log(chalk.green(`  ✓ Opened dashboard at ${dashboardUrl}`));
            } catch {
              console.log(chalk.yellow(`  ⚠ Could not open the browser automatically. Visit ${dashboardUrl} manually.`));
            }
          } else {
            console.log(chalk.dim(`  Dashboard URL: ${dashboardUrl}`));
          }
        }
        console.log(chalk.dim('\n  Press Ctrl+C to stop\n'));

        process.once('exit', () => {
          cleanupDashboardChild();
          lifecycle.cleanup();
        });
        process.once('SIGINT', () => {
          cleanupDashboardChild();
          lifecycle.handleSigint();
        });
        process.once('SIGTERM', () => {
          cleanupDashboardChild();
          lifecycle.handleSigterm();
        });
        process.once('uncaughtException', (error) => {
          cleanupDashboardChild();
          lifecycle.handleUncaughtException(error);
        });
        process.once('unhandledRejection', (reason) => {
          cleanupDashboardChild();
          lifecycle.handleUnhandledRejection(reason);
        });
      } catch (err: unknown) {
        if (dashboardChild && !dashboardChild.killed) {
          dashboardChild.kill();
        }
        lockHandle?.releaseSync();
        const msg = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`  ✗ Failed to start: ${msg}`));
        process.exit(1);
      }
    });
}
