/**
 * `hypercode start` - Start the HyperCode backend server
 *
 * Launches the HyperCode core server with Express/tRPC/WebSocket/MCP endpoints.
 * The server provides the API backend for the WebUI dashboard, CLI commands,
 * and external MCP clients.
 *
 * @example
 *   hypercode start                    # Start on default port 3000
 *   hypercode start --port 8080        # Start on custom port
 *   hypercode start --no-mcp           # Start without MCP server
 *   hypercode start --config ./my.json # Use custom config file
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve, sep, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Command } from 'commander';
import { readCanonicalVersion } from '../version.js';

export interface HypercodeStartupProvenance {
  requestedRuntime?: string;
  activeRuntime?: string;
  requestedPort?: number;
  activePort?: number;
  portDecision?: string;
  portReason?: string;
  launchMode?: string;
  dashboardMode?: string;
  installDecision?: string;
  installReason?: string;
  buildDecision?: string;
  buildReason?: string;
  updatedAt?: string;
}

export interface HypercodeStartLockRecord {
  instanceId: string;
  pid: number;
  port: number;
  host: string;
  createdAt: string;
  startup?: HypercodeStartupProvenance;
}

export interface HypercodeStartLockHandle {
  port: number;
  lockPath: string;
  clearedStaleLock: boolean;
  reusedStalePort: boolean;
  updatePort: (port: number) => void;
  updateStartupMetadata: (metadata: HypercodeStartupProvenance) => void;
  release: () => Promise<void>;
  releaseSync: () => void;
}

export interface HypercodeStartLifecycleHandlers {
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
  isExistingHypercode?: (host: string, port: number) => Promise<boolean>;
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

export type HypercodeRuntimeMode = 'auto' | 'node' | 'go';

class HypercodeAlreadyRunningError extends Error {
  constructor(
    readonly host: string,
    readonly port: number,
    readonly source: 'lock' | 'port',
    readonly pid?: number,
  ) {
    super(
      pid
        ? `HyperCode is already running (PID ${pid}) on port ${port}.`
        : `HyperCode is already running on port ${port}.`,
    );
    this.name = 'HypercodeAlreadyRunningError';
  }
}

const DASHBOARD_PORT_CANDIDATES = [3000, 3010, 3020, 3030, 3040] as const;
const CONTROL_PLANE_FALLBACK_SCAN_LIMIT = 100;
const DEFAULT_DASHBOARD_READY_TIMEOUT_MS = 30_000;
const DEFAULT_DASHBOARD_POLL_INTERVAL_MS = 500;
const DEFAULT_GO_READY_TIMEOUT_MS = 45_000;

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

function readStartLock(lockPath: string): HypercodeStartLockRecord | null {
  try {
    const parsed = JSON.parse(readFileSync(lockPath, 'utf8')) as Partial<HypercodeStartLockRecord>;
    if (
      typeof parsed.instanceId !== 'string'
      || typeof parsed.pid !== 'number'
      || typeof parsed.port !== 'number'
      || typeof parsed.host !== 'string'
      || typeof parsed.createdAt !== 'string'
    ) {
      return null;
    }

    return parsed as HypercodeStartLockRecord;
  } catch {
    return null;
  }
}

function writeStartLock(lockPath: string, record: HypercodeStartLockRecord): void {
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
): Promise<HypercodeStartLockHandle> {
  const now = deps.now ?? (() => new Date());
  const getPid = deps.getPid ?? (() => process.pid);
  const checkProcessRunning = deps.isProcessRunning ?? isProcessRunning;
  const checkPortFree = deps.isPortFree ?? isPortFree;
  const checkExistingHypercode = deps.isExistingHypercode ?? isHypercodeServer;

  const resolvedDataDir = resolveDataDir(options.dataDir);
  const lockPath = join(resolvedDataDir, 'lock');
  mkdirSync(resolvedDataDir, { recursive: true });

  const pid = getPid();
  const instanceId = `hypercode-${pid}-${now().getTime()}`;
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
      let currentStartup: HypercodeStartupProvenance | undefined;

      const writeCurrentRecord = () => {
        writeFileSync(lockPath, `${JSON.stringify({
          instanceId,
          pid,
          port: currentPort,
          host: options.host,
          createdAt: now().toISOString(),
          ...(currentStartup ? { startup: currentStartup } : {}),
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

      const updateStartupMetadata = (metadata: HypercodeStartupProvenance) => {
        const current = readStartLock(lockPath);
        if (current?.instanceId !== instanceId) {
          return;
        }

        currentStartup = {
          ...currentStartup,
          ...metadata,
        };
        writeCurrentRecord();
      };

      const selectedPortIsFree = selectedPort > 0
        ? await checkPortFree(selectedPort)
        : true;

      if (!selectedPortIsFree) {
        releaseSync();
        if (await checkExistingHypercode(options.host, selectedPort)) {
          throw new HypercodeAlreadyRunningError(options.host, selectedPort, 'port');
        }

        if (!options.explicitPort) {
          const fallbackPort = await pickAvailableControlPlaneFallbackPort(selectedPort + 1, {
            isPortFree: checkPortFree,
          });
          if (fallbackPort !== null) {
            selectedPort = fallbackPort;
            continue;
          }
        }

        throw new Error(
          `Port ${selectedPort} is already in use by another process. `
          + `Stop that process or start HyperCode with --port <free-port>.`,
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
        updateStartupMetadata,
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
          throw new HypercodeAlreadyRunningError(options.host, existingLock.port, 'lock', existingLock.pid);
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

  throw new Error(`Unable to acquire HyperCode startup lock at ${lockPath}`);
}

export async function startCoreRuntime(
  options: {
    host: string;
    port: number;
    mcp: boolean;
    supervisor?: boolean;
    autoDrive?: boolean;
  },
  loadCore: () => Promise<CoreRuntimeModule> = async () => await import('@hypercode/core/orchestrator'),
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

export function resolveRuntimePreference(
  runtime: string | undefined,
  envRuntime: string | undefined = process.env.HYPERCODE_RUNTIME,
): HypercodeRuntimeMode {
  const candidate = (runtime ?? envRuntime ?? 'auto').trim().toLowerCase();
  if (candidate === 'auto' || candidate === 'node' || candidate === 'go') {
    return candidate;
  }

  throw new Error(`Unsupported runtime '${runtime ?? envRuntime}'. Use one of: auto, node, go.`);
}

export function resolveGoConfigDir(
  mainDataDir: string,
  configuredGoConfigDir: string | undefined = process.env.HYPERCODE_GO_CONFIG_DIR,
): string {
  if (configuredGoConfigDir?.trim()) {
    return resolveDataDir(configuredGoConfigDir.trim());
  }

  const resolvedMainDataDir = resolveDataDir(mainDataDir);
  if (basename(resolvedMainDataDir) === '.hypercode') {
    return join(dirname(resolvedMainDataDir), '.hypercode-go');
  }

  return `${resolvedMainDataDir}-go`;
}

export function resolveGoRuntimeSpawnSpec(
  repoRoot: string,
  env: NodeJS.ProcessEnv = process.env,
  pathExists: (path: string) => boolean = existsSync,
): {
  command: string;
  args: string[];
  cwd: string;
  usingPrebuiltBinary: boolean;
} {
  const goRoot = join(repoRoot, 'go');
  const builtBinary = process.platform === 'win32'
    ? join(goRoot, 'hypercode.exe')
    : join(goRoot, 'hypercode');
  const forceSourceLaunch = env.HYPERCODE_GO_USE_SOURCE === '1';

  if (!forceSourceLaunch && pathExists(builtBinary)) {
    return {
      command: builtBinary,
      args: [],
      cwd: goRoot,
      usingPrebuiltBinary: true,
    };
  }

  return {
    command: 'go',
    args: ['run', './cmd/hypercode'],
    cwd: goRoot,
    usingPrebuiltBinary: false,
  };
}

export function describeGoRuntimeLaunchMode(usingPrebuiltBinary: boolean): string {
  return usingPrebuiltBinary
    ? 'prebuilt Go binary'
    : 'source fallback via go run';
}

export function describeStartupModeSummary(options: {
  runtime: Exclude<HypercodeRuntimeMode, 'auto'>;
  dashboardRequested: boolean;
  mcpRequested: boolean;
  supervisorRequested: boolean;
  autoDriveRequested: boolean;
}): string[] {
  if (options.runtime === 'go') {
    return [
      options.dashboardRequested
        ? 'Dashboard integration: compatibility-backed web runtime can start against the Go control plane.'
        : 'Dashboard integration: disabled by request.',
      options.mcpRequested
        ? 'MCP surfaces: Go-native/default API path active.'
        : 'MCP flag compatibility: --no-mcp is not yet mapped for Go startup.',
      options.supervisorRequested
        ? 'Supervisor startup flag: Go exposes native supervisor APIs, but the startup flag is not yet mapped 1:1.'
        : 'Supervisor APIs: native Go endpoints available.',
      options.autoDriveRequested
        ? 'Auto-Drive startup: not yet implemented for Go runtime startup.'
        : 'Auto-Drive startup: inactive.',
    ];
  }

  return [
    options.dashboardRequested
      ? 'Dashboard integration: supported by the Node compatibility runtime.'
      : 'Dashboard integration: disabled by request.',
    options.mcpRequested
      ? 'MCP bridge: enabled for this run.'
      : 'MCP bridge: disabled by --no-mcp.',
    options.supervisorRequested
      ? 'Supervisor startup: enabled for this run.'
      : 'Supervisor startup: disabled for this run.',
    options.autoDriveRequested
      ? 'Auto-Drive startup: enabled for this run.'
      : 'Auto-Drive startup: disabled for this run.',
  ];
}

export function runtimeSupportsIntegratedDashboard(runtime: Exclude<HypercodeRuntimeMode, 'auto'>): boolean {
  return runtime === 'node' || runtime === 'go';
}

export function resolveBrowserHost(host: string): string {
  return host === '0.0.0.0' || host === '::' || host === '[::]'
    ? '127.0.0.1'
    : host;
}

export function resolveDashboardUrl(host: string, port: number): string {
  return `http://${resolveBrowserHost(host)}:${port}/dashboard`;
}

export async function resolveAlreadyRunningDashboardReuse(options: {
  dashboardRequested: boolean;
  requestedDashboardPort: number;
  explicitDashboardPort: boolean;
  host: string;
  shouldOpenDashboard: boolean;
}, deps: {
  pickDashboardPortFn?: typeof pickDashboardPort;
} = {}): Promise<{
  dashboardMode: string;
  dashboardUrl: string | null;
  reusedExisting: boolean;
  shouldOpenDashboard: boolean;
}> {
  if (!options.dashboardRequested) {
    return {
      dashboardMode: 'disabled by request',
      dashboardUrl: null,
      reusedExisting: false,
      shouldOpenDashboard: false,
    };
  }

  const pickDashboardPortFn = deps.pickDashboardPortFn ?? pickDashboardPort;
  const dashboardSelection = await pickDashboardPortFn(
    options.requestedDashboardPort,
    options.explicitDashboardPort,
    options.host,
    { allowReuseExisting: true },
  );
  const dashboardUrl = resolveDashboardUrl(options.host, dashboardSelection.port);

  if (dashboardSelection.reusedExisting) {
    return {
      dashboardMode: 'reused existing dashboard runtime',
      dashboardUrl,
      reusedExisting: true,
      shouldOpenDashboard: options.shouldOpenDashboard,
    };
  }

  return {
    dashboardMode: options.explicitDashboardPort
      ? 'requested dashboard runtime not detected'
      : 'no existing dashboard runtime detected',
    dashboardUrl,
    reusedExisting: false,
    shouldOpenDashboard: false,
  };
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

export async function isHypercodeServer(
  host: string,
  port: number,
  fetchImpl: FetchLike = globalThis.fetch,
): Promise<boolean> {
  const browserHost = resolveBrowserHost(host);
  const urls = [
    `http://${browserHost}:${port}/health`,
    `http://${browserHost}:${port}/api/health/server`,
  ];

  for (const url of urls) {
    try {
      const response = await fetchImpl(url, { method: 'GET' });
      if (!response.ok) {
        continue;
      }
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const payload = await response.json() as { service?: string; ok?: boolean };
        if (payload?.service === 'hypercode-go' || payload?.ok === true) {
          return true;
        }
      } else {
        const text = await response.text();
        if (text.toLowerCase().includes('hypercode')) {
          return true;
        }
      }
    } catch {
      // Try the next health URL.
    }
  }

  return false;
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

export async function waitForHypercodeServer(
  options: {
    host: string;
    port: number;
    timeoutMs?: number;
    pollIntervalMs?: number;
    shouldAbort?: () => boolean;
  },
  deps: {
    fetchImpl?: FetchLike;
  } = {},
): Promise<boolean> {
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch;
  const deadline = Date.now() + (options.timeoutMs ?? DEFAULT_GO_READY_TIMEOUT_MS);
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_DASHBOARD_POLL_INTERVAL_MS;

  do {
    if (await isHypercodeServer(options.host, options.port, fetchImpl)) {
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

  for (let candidate = preferredPort; candidate < preferredPort + CONTROL_PLANE_FALLBACK_SCAN_LIMIT; candidate += 1) {
    if (await checkPortFree(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function syncLockHandlePort(
  lockHandle: HypercodeStartLockHandle,
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

export async function startGoRuntime(
  options: {
    host: string;
    port: number;
    repoRoot: string;
    dataDir: string;
    requestedRuntime?: string;
    requestedPort?: number;
    portDecision?: string;
    portReason?: string;
    installDecision?: string;
    installReason?: string;
    buildDecision?: string;
    buildReason?: string;
  },
  deps: {
    spawnImpl?: typeof spawn;
    fetchImpl?: FetchLike;
  } = {},
): Promise<{
  host: string;
  trpcPort: number;
  bridgePort: null;
  child: ChildProcess;
  configDir: string;
  launchMode: 'prebuilt-binary' | 'source-fallback';
}> {
  const spawnImpl = deps.spawnImpl ?? spawn;
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch;
  const goRoot = join(options.repoRoot, 'go');
  if (!existsSync(join(goRoot, 'go.mod'))) {
    throw new Error(`Go runtime workspace is unavailable at ${goRoot}.`);
  }

  const goConfigDir = resolveGoConfigDir(options.dataDir);
  const launchSpec = resolveGoRuntimeSpawnSpec(options.repoRoot);
  let childExited = false;
  let launchError: string | null = null;
  const child = spawnImpl(
    launchSpec.command,
    [
      ...launchSpec.args,
      'serve',
      '--host', options.host,
      '--port', String(options.port),
      '--config-dir', goConfigDir,
    ],
    {
      cwd: launchSpec.cwd,
      stdio: 'inherit',
      env: {
        ...process.env,
        HYPERCODE_MAIN_CONFIG_DIR: resolveDataDir(options.dataDir),
        HYPERCODE_STARTUP_REQUESTED_RUNTIME: options.requestedRuntime ?? process.env.HYPERCODE_STARTUP_REQUESTED_RUNTIME ?? process.env.HYPERCODE_RUNTIME ?? '',
        HYPERCODE_STARTUP_ACTIVE_RUNTIME: 'go',
        HYPERCODE_STARTUP_REQUESTED_PORT: String(options.requestedPort ?? options.port),
        HYPERCODE_STARTUP_ACTIVE_PORT: String(options.port),
        HYPERCODE_STARTUP_PORT_DECISION: options.portDecision ?? process.env.HYPERCODE_STARTUP_PORT_DECISION ?? '',
        HYPERCODE_STARTUP_PORT_REASON: options.portReason ?? process.env.HYPERCODE_STARTUP_PORT_REASON ?? '',
        HYPERCODE_STARTUP_LAUNCH_MODE: describeGoRuntimeLaunchMode(launchSpec.usingPrebuiltBinary),
        HYPERCODE_STARTUP_INSTALL_DECISION: options.installDecision ?? process.env.HYPERCODE_STARTUP_INSTALL_DECISION ?? '',
        HYPERCODE_STARTUP_INSTALL_REASON: options.installReason ?? process.env.HYPERCODE_STARTUP_INSTALL_REASON ?? '',
        HYPERCODE_STARTUP_BUILD_DECISION: options.buildDecision ?? process.env.HYPERCODE_STARTUP_BUILD_DECISION ?? '',
        HYPERCODE_STARTUP_BUILD_REASON: options.buildReason ?? process.env.HYPERCODE_STARTUP_BUILD_REASON ?? '',
      },
      windowsHide: true,
    },
  );

  child.once('exit', () => {
    childExited = true;
  });
  child.once('error', (error) => {
    launchError = error instanceof Error ? error.message : String(error);
    childExited = true;
  });

  const ready = await waitForHypercodeServer(
    {
      host: options.host,
      port: options.port,
      shouldAbort: () => childExited,
    },
    { fetchImpl },
  );

  if (!ready) {
    if (!child.killed && !childExited) {
      child.kill();
    }

    if (launchError) {
      throw new Error(`Go control plane failed to launch: ${launchError}`);
    }

    if (childExited) {
      throw new Error(`Go control plane exited before it became ready on port ${options.port}.`);
    }

    throw new Error(`Go control plane did not become ready on port ${options.port}.`);
  }

  return {
    host: options.host,
    trpcPort: options.port,
    bridgePort: null,
    child,
    configDir: goConfigDir,
    launchMode: launchSpec.usingPrebuiltBinary ? 'prebuilt-binary' : 'source-fallback',
  };
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
  lockHandle: HypercodeStartLockHandle,
  deps: CreateLockLifecycleHandlersDeps = {},
): HypercodeStartLifecycleHandlers {
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

export function registerStartCommand(program: Command): void {
  program
    .command('start')
    .description('Start the HyperCode backend server (Express/tRPC/WebSocket/MCP)')
    .option('-p, --port <number>', 'tRPC control-plane port', '4000')
    .option('--dashboard-port <number>', 'Dashboard web runtime port', '3000')
    .option('-H, --host <address>', 'Server host address', '0.0.0.0')
    .option('--no-mcp', 'Disable the MCP server endpoint')
    .option('--supervisor', 'Enable HyperCode supervisor startup')
    .option('--auto-drive', 'Enable Director auto-drive after startup')
    .option('--runtime <mode>', 'Runtime mode: auto, go, or node (default: auto, prefers Go)', 'auto')
    .option('--no-dashboard', 'Disable serving the WebUI dashboard')
    .option('--no-open-dashboard', 'Start the dashboard runtime without opening the browser')
    .option('-c, --config <path>', 'Path to config file')
    .option('-d, --data-dir <path>', 'Data directory for HyperCode state (compat path: ~/.hypercode)', '~/.hypercode')
    .option('--daemon', 'Run as background daemon')
    .addHelpText('after', `
Examples:
  $ hypercode start                     Start with auto runtime selection (prefers Go)
  $ hypercode start --runtime go        Start the Go control plane explicitly
  $ hypercode start --runtime node      Start the legacy Node/tRPC control plane explicitly
  $ hypercode start -p 8080             Start on port 8080
  $ hypercode start --no-mcp            Start without MCP server (Node runtime only)
  $ hypercode start --auto-drive        Start the Director after boot completes (Node runtime only)
  $ hypercode start --daemon            Run as background service
  $ hypercode start --host 127.0.0.1    Bind to localhost only
    `)
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      const requestedPort = parseInt(opts.port, 10);
      const requestedDashboardPort = parseInt(opts.dashboardPort, 10);
      const host = opts.host;
      const explicitPort = process.argv.includes('--port') || process.argv.includes('-p');
      const explicitDashboardPort = process.argv.some((arg) => arg === '--dashboard-port' || arg.startsWith('--dashboard-port='));
      let lockHandle: HypercodeStartLockHandle | null = null;
      let dashboardChild: ChildProcess | null = null;
      let controlPlaneChild: ChildProcess | null = null;

      const cliDir = dirname(fileURLToPath(import.meta.url));
      const hypercodeVersion = readCanonicalVersion(cliDir);
      const repoRoot = resolveRepoRoot(cliDir) ?? resolve(cliDir, '..', '..', '..', '..', '..');
      const webRoot = join(repoRoot, 'apps', 'web');
      const requestedRuntime = resolveRuntimePreference(opts.runtime);
      console.log(chalk.bold.cyan(`\n  ⬡ HyperCode v${hypercodeVersion}`));
      console.log(chalk.dim('  The Neural Operating System\n'));

      try {
        lockHandle = await acquireSingleInstanceLock({
          dataDir: opts.dataDir,
          requestedPort,
          explicitPort,
          host,
        });

        const acquiredLockHandle = lockHandle;
        const port = acquiredLockHandle.port;
        const lifecycle = createLockLifecycleHandlers(acquiredLockHandle);
        const cleanupDashboardChild = () => {
          if (dashboardChild && !dashboardChild.killed) {
            dashboardChild.kill();
          }
          dashboardChild = null;
        };
        const cleanupControlPlaneChild = () => {
          if (controlPlaneChild && !controlPlaneChild.killed) {
            controlPlaneChild.kill();
          }
          controlPlaneChild = null;
        };

        console.log(chalk.yellow('  Starting server...'));
        console.log(chalk.dim(`  Host: ${host}:${port}`));
        console.log(chalk.dim(`  MCP:  ${opts.mcp ? 'enabled' : 'disabled'}`));
        console.log(chalk.dim(`  Supervisor: ${opts.supervisor ? 'enabled' : 'disabled'}`));
        console.log(chalk.dim(`  Auto-Drive: ${opts.autoDrive ? 'enabled' : 'disabled'}`));
        console.log(chalk.dim(`  Runtime preference: ${requestedRuntime}`));
        console.log(chalk.dim(`  Dashboard request: ${opts.dashboard ? 'requested' : 'disabled'}`));
        console.log(chalk.dim(`  Lock: ${acquiredLockHandle.lockPath}`));

        let startupPortDecision = explicitPort
          ? 'explicit port selection'
          : 'requested port selected';
        let startupPortReason = explicitPort
          ? `Explicit --port selection was honored for port ${port}.`
          : `Requested startup port ${port} was available.`;

        if (acquiredLockHandle.clearedStaleLock) {
          console.log(chalk.yellow(`  ↺ Cleared stale HyperCode lock${acquiredLockHandle.reusedStalePort ? ` and reused port ${port}` : ''}`));
          if (acquiredLockHandle.reusedStalePort) {
            startupPortDecision = 'reused stale lock port';
            startupPortReason = `Recovered previously recorded free port ${port} from a stale HyperCode lock.`;
          }
        }
        if (!explicitPort && requestedPort !== port) {
          console.log(chalk.yellow(`  ↺ Port ${requestedPort} was already occupied before startup; using ${port} instead.`));
          startupPortDecision = 'fallback port selected before launch';
          startupPortReason = `Port ${requestedPort} was already occupied before startup, so HyperCode selected ${port}.`;
        }
        console.log('');

        let runtime;
        let runtimeKind: Exclude<HypercodeRuntimeMode, 'auto'> = 'node';
        let nodeRuntimeMode: 'explicit-node' | 'go-fallback' = 'explicit-node';
        let goRuntimeMode: 'prebuilt-binary' | 'source-fallback' | null = null;
        let activePort = port;

        const startNodeRuntimeWithFallback = async () => {
          try {
            const startedRuntime = await startCoreRuntime({
              host,
              port: activePort,
              mcp: Boolean(opts.mcp),
              supervisor: Boolean(opts.supervisor),
              autoDrive: Boolean(opts.autoDrive),
            });
            activePort = startedRuntime.trpcPort;
            syncLockHandlePort(acquiredLockHandle, startedRuntime.trpcPort);
            return startedRuntime;
          } catch (startupError) {
            const fallbackPort = resolveControlPlaneFallbackPort({
              requestedPort,
              selectedPort: activePort,
              explicitPort,
              reusedStalePort: acquiredLockHandle.reusedStalePort,
              startupError,
            });

            if (fallbackPort === null) {
              throw startupError;
            }

            const resolvedFallbackPort = await pickAvailableControlPlaneFallbackPort(fallbackPort);
            if (resolvedFallbackPort === null) {
              throw startupError;
            }

            if (acquiredLockHandle.port !== resolvedFallbackPort) {
              console.log(chalk.yellow(`  ↺ Port ${activePort} was unavailable at bind time; retrying control-plane startup on port ${resolvedFallbackPort}.`));
            }
            startupPortDecision = 'fallback port selected at bind time';
            startupPortReason = `Port ${activePort} became unavailable at bind time, so HyperCode retried on port ${resolvedFallbackPort}.`;
            activePort = resolvedFallbackPort;

            const startedRuntime = await startCoreRuntime({
              host,
              port: activePort,
              mcp: Boolean(opts.mcp),
              supervisor: Boolean(opts.supervisor),
              autoDrive: Boolean(opts.autoDrive),
            });
            activePort = startedRuntime.trpcPort;
            syncLockHandlePort(acquiredLockHandle, startedRuntime.trpcPort);
            return startedRuntime;
          }
        };

        if (requestedRuntime !== 'node') {
          try {
            runtime = await startGoRuntime({
              host,
              port: activePort,
              repoRoot,
              dataDir: opts.dataDir,
              requestedRuntime,
              requestedPort,
              portDecision: startupPortDecision,
              portReason: startupPortReason,
              installDecision: process.env.HYPERCODE_STARTUP_INSTALL_DECISION,
              installReason: process.env.HYPERCODE_STARTUP_INSTALL_REASON,
              buildDecision: process.env.HYPERCODE_STARTUP_BUILD_DECISION,
              buildReason: process.env.HYPERCODE_STARTUP_BUILD_REASON,
            });
            runtimeKind = 'go';
            goRuntimeMode = runtime.launchMode;
            controlPlaneChild = runtime.child;
            activePort = runtime.trpcPort;
            syncLockHandlePort(acquiredLockHandle, runtime.trpcPort);
          } catch (error) {
            if (requestedRuntime === 'go') {
              throw error;
            }

            const message = error instanceof Error ? error.message : String(error);
            console.log(chalk.yellow(`  ⚠ Go runtime startup failed, falling back to Node compatibility runtime: ${message}`));
            runtime = await startNodeRuntimeWithFallback();
            runtimeKind = 'node';
            nodeRuntimeMode = 'go-fallback';
          }
        } else {
          runtime = await startNodeRuntimeWithFallback();
          runtimeKind = 'node';
        }

        if (runtimeKind === 'go') {
          console.log(chalk.dim('  Core loaded: Go control plane started'));
          console.log(chalk.dim(`  Launch mode: ${describeGoRuntimeLaunchMode(goRuntimeMode === 'prebuilt-binary')}`));
          console.log(chalk.green(`  ✓ Go control plane running at http://${resolveBrowserHost(runtime.host)}:${runtime.trpcPort}`));
          console.log(chalk.dim(`  API index: http://${resolveBrowserHost(runtime.host)}:${runtime.trpcPort}/api/index`));
        } else {
          console.log(chalk.dim('  Core loaded: orchestrator started'));
          console.log(chalk.dim(`  Launch mode: ${nodeRuntimeMode === 'go-fallback' ? 'Node compatibility runtime (Go fallback)' : 'Node compatibility runtime (explicit selection)'}`));
          console.log(chalk.green(`  ✓ tRPC control plane running at http://${runtime.host}:${runtime.trpcPort}/trpc`));
          if (opts.mcp) {
            console.log(chalk.green(`  ✓ MCP bridge target ws://127.0.0.1:${runtime.bridgePort ?? 3001} (+ HTTP health on /health when available)`));
          }
        }

        console.log(chalk.dim('  Startup mode summary:'));
        for (const line of describeStartupModeSummary({
          runtime: runtimeKind,
          dashboardRequested: Boolean(opts.dashboard),
          mcpRequested: Boolean(opts.mcp),
          supervisorRequested: Boolean(opts.supervisor),
          autoDriveRequested: Boolean(opts.autoDrive),
        })) {
          console.log(chalk.dim(`    • ${line}`));
        }
        let dashboardMode = opts.dashboard
          ? (runtimeKind === 'go'
            ? 'compatibility-backed dashboard runtime targeting the Go control plane'
            : 'integrated dashboard runtime targeting the Node compatibility control plane')
          : 'disabled by request';

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
            dashboardMode = runtimeKind === 'go'
              ? 'reused existing compatibility-backed dashboard runtime'
              : 'reused existing integrated dashboard runtime';
            console.log(chalk.dim(`  Dashboard mode: ${dashboardMode}`));
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
                HYPERCODE_TRPC_UPSTREAM: `${orchestratorBaseUrl}/trpc`,
                NEXT_PUBLIC_HYPERCODE_ORCHESTRATOR_URL: orchestratorBaseUrl,
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
              dashboardMode = runtimeKind === 'go'
                ? 'started compatibility-backed dashboard runtime'
                : 'started integrated dashboard runtime';
              console.log(chalk.dim(`  Dashboard mode: ${dashboardMode}`));
              if (runtimeKind === 'go') {
                console.log(chalk.yellow('  ⚠ Dashboard is running through the Node web compatibility layer against the Go control plane. Some mutation-heavy surfaces may still rely on compatibility fallbacks during the migration.'));
              }
              console.log(chalk.green(`  ✓ Dashboard runtime ready at ${dashboardUrl}`));
            } else if (dashboardLaunchErrorMessage) {
              dashboardMode = 'dashboard launch attempted but failed';
              console.log(chalk.dim(`  Dashboard mode: ${dashboardMode}`));
              console.log(chalk.yellow(`  ⚠ Dashboard runtime failed to launch: ${dashboardLaunchErrorMessage}`));
            } else if (dashboardExited) {
              dashboardMode = 'dashboard launch attempted but exited early';
              console.log(chalk.dim(`  Dashboard mode: ${dashboardMode}`));
              console.log(chalk.yellow(`  ⚠ Dashboard runtime exited before ${dashboardUrl} became ready.`));
            } else {
              dashboardMode = 'dashboard launch attempted and still starting';
              console.log(chalk.dim(`  Dashboard mode: ${dashboardMode}`));
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
        acquiredLockHandle.updateStartupMetadata({
          requestedRuntime,
          activeRuntime: runtimeKind,
          requestedPort,
          activePort,
          portDecision: startupPortDecision,
          portReason: startupPortReason,
          launchMode: runtimeKind === 'go'
            ? describeGoRuntimeLaunchMode(goRuntimeMode === 'prebuilt-binary')
            : (nodeRuntimeMode === 'go-fallback'
              ? 'Node compatibility runtime (Go fallback)'
              : 'Node compatibility runtime (explicit selection)'),
          dashboardMode,
          installDecision: process.env.HYPERCODE_STARTUP_INSTALL_DECISION,
          installReason: process.env.HYPERCODE_STARTUP_INSTALL_REASON,
          buildDecision: process.env.HYPERCODE_STARTUP_BUILD_DECISION,
          buildReason: process.env.HYPERCODE_STARTUP_BUILD_REASON,
          updatedAt: new Date().toISOString(),
        });

        console.log(chalk.dim('\n  Press Ctrl+C to stop\n'));

        process.once('exit', () => {
          cleanupDashboardChild();
          cleanupControlPlaneChild();
          lifecycle.cleanup();
        });
        process.once('SIGINT', () => {
          cleanupDashboardChild();
          cleanupControlPlaneChild();
          lifecycle.handleSigint();
        });
        process.once('SIGTERM', () => {
          cleanupDashboardChild();
          cleanupControlPlaneChild();
          lifecycle.handleSigterm();
        });
        process.once('uncaughtException', (error) => {
          cleanupDashboardChild();
          cleanupControlPlaneChild();
          lifecycle.handleUncaughtException(error);
        });
        process.once('unhandledRejection', (reason) => {
          cleanupDashboardChild();
          cleanupControlPlaneChild();
          lifecycle.handleUnhandledRejection(reason);
        });
      } catch (err: unknown) {
        if (dashboardChild && !dashboardChild.killed) {
          dashboardChild.kill();
        }
        if (controlPlaneChild && !controlPlaneChild.killed) {
          controlPlaneChild.kill();
        }
        lockHandle?.releaseSync();

        if (err instanceof HypercodeAlreadyRunningError) {
          const browserHost = resolveBrowserHost(err.host);
          const existingControlPlaneBase = `http://${browserHost}:${err.port}`;
          console.log(chalk.green(`  ✓ HyperCode is already running at ${existingControlPlaneBase}`));
          if (err.pid) {
            console.log(chalk.dim(`  Existing PID: ${err.pid}`));
          }
          console.log(chalk.dim(`  Detection source: ${err.source === 'lock' ? 'startup lock' : 'live port probe'}`));
          console.log(chalk.dim('  Reusing the existing control plane instead of starting a duplicate instance.'));

          const dashboardReuse = await resolveAlreadyRunningDashboardReuse({
            dashboardRequested: Boolean(opts.dashboard),
            requestedDashboardPort,
            explicitDashboardPort,
            host,
            shouldOpenDashboard: opts.openDashboard !== false && !opts.daemon,
          });

          if (dashboardReuse.dashboardUrl && dashboardReuse.reusedExisting) {
            console.log(chalk.dim(`  Dashboard mode: ${dashboardReuse.dashboardMode}`));
            console.log(chalk.green(`  ✓ Reusing dashboard runtime at ${dashboardReuse.dashboardUrl}`));
            if (dashboardReuse.shouldOpenDashboard) {
              try {
                const open = (await import('open')).default;
                await open(dashboardReuse.dashboardUrl);
                console.log(chalk.green(`  ✓ Opened dashboard at ${dashboardReuse.dashboardUrl}`));
              } catch {
                console.log(chalk.yellow(`  ⚠ Could not open the browser automatically. Visit ${dashboardReuse.dashboardUrl} manually.`));
              }
            } else {
              console.log(chalk.dim(`  Dashboard URL: ${dashboardReuse.dashboardUrl}`));
            }
          } else if (opts.dashboard) {
            console.log(chalk.dim(`  Dashboard mode: ${dashboardReuse.dashboardMode}`));
            if (dashboardReuse.dashboardUrl) {
              console.log(chalk.yellow(`  ⚠ No running dashboard runtime was detected at ${dashboardReuse.dashboardUrl}.`));
            }
            console.log(chalk.dim(`  Control plane API index: ${existingControlPlaneBase}/api/index`));
            console.log(chalk.dim('  Start or refresh the dashboard separately if you still want the web UI attached to this running control plane.'));
          }
          return;
        }

        const msg = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`  ✗ Failed to start: ${msg}`));
        process.exit(1);
      }
    });
}
