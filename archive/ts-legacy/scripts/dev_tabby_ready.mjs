#!/usr/bin/env node

import { execFile, spawn } from 'node:child_process';

import {
  detectBrowserExtensionArtifacts,
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
  getHypercodeStartLockPath,
=======
  getBorgStartLockPath,
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
  getPreferredWebPorts,
  getWaitingReasons,
  chooseStaleCoreRefreshTarget,
  isCompatibleStartupStatusContract,
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
  isLikelyHypercodeCoreCommand,
=======
  isLikelyBorgCoreCommand,
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
  isHttpProbeResponsive,
  isDirectExecution,
  parseListeningPidFromLsof,
  parseListeningPidFromNetstat,
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
  readHypercodeStartLockRecord,
=======
  readBorgStartLockRecord,
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
  summarizeBrowserExtensionArtifacts,
  waitForCoreBridgeShutdown,
} from './dev_tabby_ready_helpers.mjs';

const WEB_PORT_CANDIDATES = [3000, 3010, 3020, 3030, 3040];
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
const POLL_INTERVAL_MS = Number(process.env.HYPERCODE_DEV_READY_POLL_MS || 2000);
const READY_TIMEOUT_MS = Number(process.env.HYPERCODE_DEV_READY_TIMEOUT_MS || 600000);
const WEB_DETECT_TIMEOUT_MS = Number(process.env.HYPERCODE_DEV_READY_WEB_TIMEOUT_MS || 15000);
const TRPC_QUERY_TIMEOUT_MS = Number(process.env.HYPERCODE_DEV_READY_TRPC_TIMEOUT_MS || 12000);
const AUTO_OPEN_DASHBOARD = process.env.HYPERCODE_DEV_READY_OPEN_BROWSER !== '0';
const AUTO_REFRESH_STALE_CORE = process.env.HYPERCODE_DEV_READY_RESTART_STALE_CORE !== '0';
=======
const POLL_INTERVAL_MS = Number(process.env.BORG_DEV_READY_POLL_MS || 2000);
const READY_TIMEOUT_MS = Number(process.env.BORG_DEV_READY_TIMEOUT_MS || 600000);
const WEB_DETECT_TIMEOUT_MS = Number(process.env.BORG_DEV_READY_WEB_TIMEOUT_MS || 15000);
const TRPC_QUERY_TIMEOUT_MS = Number(process.env.BORG_DEV_READY_TRPC_TIMEOUT_MS || 12000);
const AUTO_OPEN_DASHBOARD = process.env.BORG_DEV_READY_OPEN_BROWSER !== '0';
const AUTO_REFRESH_STALE_CORE = process.env.BORG_DEV_READY_RESTART_STALE_CORE !== '0';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
const REPO_ROOT = process.cwd();
const DEFAULT_CORE_BRIDGE_PORT = resolveBridgePort();
const FALLBACK_BRIDGE_PORT_CANDIDATES = [DEFAULT_CORE_BRIDGE_PORT, 3011, 3021, 3031, 3041];
let activeBridgePort = DEFAULT_CORE_BRIDGE_PORT;

function normalizePort(value) {
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

function resolveBridgePort(env = process.env) {
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
  return normalizePort(env.HYPERCODE_BRIDGE_PORT)
    ?? normalizePort(env.HYPERCODE_CORE_BRIDGE_PORT)
=======
  return normalizePort(env.BORG_BRIDGE_PORT)
    ?? normalizePort(env.BORG_CORE_BRIDGE_PORT)
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
    ?? 3001;
}

function buildCoreBridgeProbeUrls(port = activeBridgePort) {
  const coreHttpBase = `http://127.0.0.1:${port}`;
  return [
    `${coreHttpBase}/api/mesh/stream`,
    `${coreHttpBase}/health`,
  ];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchStatus(url, timeoutMs = 4000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
    });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    return {
      ok: false,
      status: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function detectWebPort() {
  for (const port of getPreferredWebPorts(REPO_ROOT, WEB_PORT_CANDIDATES)) {
    const candidates = [
      `http://127.0.0.1:${port}/api/trpc/startupStatus?input=%7B%7D`,
      `http://127.0.0.1:${port}/dashboard`,
    ];

    for (const url of candidates) {
      const status = await fetchStatus(url, WEB_DETECT_TIMEOUT_MS);
      if (isHttpProbeResponsive(status)) {
        return { port, url };
      }
    }
  }

  return null;
}

function extractTrpcData(payload) {
  if (Array.isArray(payload) && payload.length > 0) {
    return extractTrpcData(payload[0]);
  }

  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const result = payload.result;
  if (!result || typeof result !== 'object') {
    return undefined;
  }

  const data = result.data;
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Object.prototype.hasOwnProperty.call(data, 'json')) {
    return data.json;
  }

  return data;
}

async function fetchTrpcQuery(webPort, procedureName, input = {}) {
  const url = new URL(`http://127.0.0.1:${webPort}/api/trpc/${procedureName}`);
  url.searchParams.set('input', JSON.stringify(input));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRPC_QUERY_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
    });

    if (!response.ok) {
      return { ok: false, url: url.toString(), status: response.status, data: null };
    }

    const text = await response.text();
    try {
      const payload = JSON.parse(text);
      return { ok: true, url: url.toString(), status: response.status, data: extractTrpcData(payload) };
    } catch {
      return { ok: true, url: url.toString(), status: response.status, data: null, raw: text };
    }
  } catch (error) {
    return {
      ok: false,
      url: url.toString(),
      status: null,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTrpcMutation(webPort, procedureName, input = {}) {
  const url = `http://127.0.0.1:${webPort}/api/trpc/${procedureName}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRPC_QUERY_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      return { ok: false, url, status: response.status, data: null };
    }

    const text = await response.text();
    try {
      const payload = JSON.parse(text);
      return { ok: true, url, status: response.status, data: extractTrpcData(payload) };
    } catch {
      return { ok: true, url, status: response.status, data: null, raw: text };
    }
  } catch (error) {
    return {
      ok: false,
      url,
      status: null,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function getBrowserOpenCommand(url) {
  if (process.platform === 'win32') {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', 'start', '', url],
    };
  }

  if (process.platform === 'darwin') {
    return {
      command: 'open',
      args: [url],
    };
  }

  return {
    command: 'xdg-open',
    args: [url],
  };
}

function openDashboardInBrowser(url) {
  if (!AUTO_OPEN_DASHBOARD) {
    return;
  }

  const { command, args } = getBrowserOpenCommand(url);
  const child = spawn(command, args, {
    cwd: REPO_ROOT,
    detached: true,
    stdio: 'ignore',
  });

  child.unref();
}

function getPnpmSpawnSpec(commandArgs, cwd = REPO_ROOT) {
  if (process.platform === 'win32') {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', 'pnpm', ...commandArgs],
      cwd,
    };
  }

  return {
    command: 'pnpm',
    args: commandArgs,
    cwd,
  };
}

function execFileText(command, args) {
  return new Promise((resolve) => {
    execFile(command, args, { cwd: REPO_ROOT, windowsHide: true }, (error, stdout) => {
      if (error) {
        resolve('');
        return;
      }

      resolve(stdout);
    });
  });
}

function runPnpmCommand(commandArgs, cwd = REPO_ROOT) {
  const { command, args } = getPnpmSpawnSpec(commandArgs, cwd);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env: {
        ...process.env,
        CI: process.env.CI ?? 'true',
      },
    });

    child.on('error', (error) => reject(error));
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`pnpm ${commandArgs.join(' ')} failed (code=${code ?? 'null'} signal=${signal ?? 'null'})`));
    });
  });
}

async function ensureOfficialBrowserExtensionArtifacts() {
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
  const extensionRoot = `${REPO_ROOT}${process.platform === 'win32' ? '\\' : '/'}apps${process.platform === 'win32' ? '\\' : '/'}hypercode-extension`;

  console.log('[Hypercode Dev Ready] official browser-extension artifacts missing; building Chromium + Firefox bundles...');

  await runPnpmCommand(['-C', 'apps/hypercode-extension', 'run', 'build'], REPO_ROOT);
  await runPnpmCommand(['-C', 'apps/hypercode-extension', 'run', 'build:firefox'], REPO_ROOT);

  console.log(`[Hypercode Dev Ready] browser-extension artifacts refreshed from ${extensionRoot}`);
=======
  const extensionRoot = `${REPO_ROOT}${process.platform === 'win32' ? '\\' : '/'}apps${process.platform === 'win32' ? '\\' : '/'}borg-extension`;

  console.log('[Borg Dev Ready] official browser-extension artifacts missing; building Chromium + Firefox bundles...');

  await runPnpmCommand(['-C', 'apps/borg-extension', 'run', 'build'], REPO_ROOT);
  await runPnpmCommand(['-C', 'apps/borg-extension', 'run', 'build:firefox'], REPO_ROOT);

  console.log(`[Borg Dev Ready] browser-extension artifacts refreshed from ${extensionRoot}`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
}

async function warmMcpAndMemory(webPort) {
  await Promise.allSettled([
    fetchTrpcQuery(webPort, 'startupStatus', {}),
    fetchTrpcQuery(webPort, 'mcp.listServers', {}),
    fetchTrpcQuery(webPort, 'mcp.listTools', {}),
    fetchTrpcQuery(webPort, 'mcp.getStatus', {}),
    fetchTrpcQuery(webPort, 'mcp.searchTools', { query: '' }),
    fetchTrpcQuery(webPort, 'memory.getAgentStats', {}),
    fetchTrpcQuery(webPort, 'memory.listContexts', {}),
    fetchTrpcQuery(webPort, 'browser.status', {}),
    fetchTrpcQuery(webPort, 'session.list', {}),
    fetchTrpcQuery(webPort, 'session.getState', {}),
    fetchTrpcMutation(webPort, 'session.restore', {}),
  ]);
}

async function evaluateReadiness() {
  const web = await detectWebPort();
  const coreBridgeChecks = await Promise.all(buildCoreBridgeProbeUrls().map((url) => fetchStatus(url)));
  const coreBridge = coreBridgeChecks.find((check) => check.ok) ?? coreBridgeChecks[0] ?? { ok: false, status: null };
  const extensions = detectBrowserExtensionArtifacts(REPO_ROOT);
  const extension = summarizeBrowserExtensionArtifacts(extensions);
  const orchestrator = await fetchStatus('http://127.0.0.1:3847/health', 2000);

  let mcpStatus = { ok: false, data: null, url: null };
  let memoryStatus = { ok: false, data: null, url: null };
  let browserStatus = { ok: false, data: null, url: null };
  let sessionStatus = { ok: false, data: null, url: null };
  let startupStatus = { ok: false, compatible: false, data: null, url: null };

  if (web) {
    const [startupResult, mcpResult, memoryResult, browserResult, sessionResult] = await Promise.all([
      fetchTrpcQuery(web.port, 'startupStatus', {}),
      fetchTrpcQuery(web.port, 'mcp.getStatus', {}),
      fetchTrpcQuery(web.port, 'memory.getAgentStats', {}),
      fetchTrpcQuery(web.port, 'browser.status', {}),
      fetchTrpcQuery(web.port, 'session.list', {}),
    ]);

    startupStatus = {
      ok: startupResult.ok,
      compatible: startupResult.ok && isCompatibleStartupStatusContract(startupResult.data),
      data: startupResult.data,
      url: startupResult.url,
    };

    mcpStatus = {
      ok: mcpResult.ok,
      data: mcpResult.data,
      url: mcpResult.url,
    };

    memoryStatus = {
      ok: memoryResult.ok,
      data: memoryResult.data,
      url: memoryResult.url,
    };

    browserStatus = {
      ok: browserResult.ok,
      data: browserResult.data,
      url: browserResult.url,
    };

    sessionStatus = {
      ok: sessionResult.ok,
      data: sessionResult.data,
      url: sessionResult.url,
    };
  }

  const startupSnapshotReady = Boolean(startupStatus.data?.ready);
  const startupContractCompatible = startupStatus.ok && startupStatus.compatible;
  const fallbackTelemetryHealthy = Boolean(
    mcpStatus.ok
      && memoryStatus.ok
      && browserStatus.ok
      && sessionStatus.ok,
  );

  // Prefer the richer startup contract when available, but allow readiness to proceed
  // when the core bridge serves a legacy contract and all fallback telemetry probes are healthy.
  const ready = Boolean(web)
    && coreBridge.ok
    && orchestrator.ok
    && startupStatus.ok
    && (startupSnapshotReady || fallbackTelemetryHealthy)
    && (startupContractCompatible || fallbackTelemetryHealthy)
    && extension.ready;

  return {
    ready,
    web,
    coreBridge,
    orchestrator,
    startupStatus,
    mcpStatus,
    memoryStatus,
    browserStatus,
    sessionStatus,
    extensions,
    extension,
  };
}

function printReadySummary(state) {
  const webPort = state.web?.port;
  const dashboardUrl = webPort ? `http://127.0.0.1:${webPort}` : 'unavailable';

<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
  console.log('\n[Hypercode Dev Ready] ✅ stack is ready');
  console.log(`[Hypercode Dev Ready] Dashboard: ${dashboardUrl}`);
  console.log(`[Hypercode Dev Ready] Orchestrator: http://127.0.0.1:3847 (Health: /health)`);
  console.log(`[Hypercode Dev Ready] Core bridge: ws://127.0.0.1:${activeBridgePort} (HTTP probe: /api/mesh/stream or /health)`);
  console.log(`[Hypercode Dev Ready] Startup telemetry API: ${state.startupStatus.url ?? 'unavailable'}`);
  console.log(`[Hypercode Dev Ready] MCP telemetry API: ${state.mcpStatus.url ?? 'unavailable'}`);
  console.log(`[Hypercode Dev Ready] Memory telemetry API: ${state.memoryStatus.url ?? 'unavailable'}`);
  console.log(`[Hypercode Dev Ready] Browser telemetry API: ${state.browserStatus.url ?? 'unavailable'}`);
  console.log(`[Hypercode Dev Ready] Session telemetry API: ${state.sessionStatus.url ?? 'unavailable'}`);
  console.log(`[Hypercode Dev Ready] Extension artifacts: ${state.extension.summary ?? 'unavailable'}`);
  for (const artifact of state.extensions) {
    console.log(`[Hypercode Dev Ready] ${artifact.label}: ${artifact.artifactPath ?? 'unavailable'}`);
=======
  console.log('\n[Borg Dev Ready] ✅ stack is ready');
  console.log(`[Borg Dev Ready] Dashboard: ${dashboardUrl}`);
  console.log(`[Borg Dev Ready] Orchestrator: http://127.0.0.1:3847 (Health: /health)`);
  console.log(`[Borg Dev Ready] Core bridge: ws://127.0.0.1:${activeBridgePort} (HTTP probe: /api/mesh/stream or /health)`);
  console.log(`[Borg Dev Ready] Startup telemetry API: ${state.startupStatus.url ?? 'unavailable'}`);
  console.log(`[Borg Dev Ready] MCP telemetry API: ${state.mcpStatus.url ?? 'unavailable'}`);
  console.log(`[Borg Dev Ready] Memory telemetry API: ${state.memoryStatus.url ?? 'unavailable'}`);
  console.log(`[Borg Dev Ready] Browser telemetry API: ${state.browserStatus.url ?? 'unavailable'}`);
  console.log(`[Borg Dev Ready] Session telemetry API: ${state.sessionStatus.url ?? 'unavailable'}`);
  console.log(`[Borg Dev Ready] Extension artifacts: ${state.extension.summary ?? 'unavailable'}`);
  for (const artifact of state.extensions) {
    console.log(`[Borg Dev Ready] ${artifact.label}: ${artifact.artifactPath ?? 'unavailable'}`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
  }
}

function printWaitingSummary(state, elapsedMs) {
  const missing = getWaitingReasons(state);

<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
  console.log(`[Hypercode Dev Ready] connecting ${Math.floor(elapsedMs / 1000)}s: ${missing.join(' | ')}`);
=======
  console.log(`[Borg Dev Ready] connecting ${Math.floor(elapsedMs / 1000)}s: ${missing.join(' | ')}`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
}

function spawnTurboDev() {
  const env = {
    ...process.env,
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
    HYPERCODE_BRIDGE_PORT: String(activeBridgePort),
=======
    BORG_BRIDGE_PORT: String(activeBridgePort),
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
    CI: 'true',
    TURBO_DAEMON: 'false',
  };

  const command = process.platform === 'win32' ? 'cmd.exe' : 'pnpm';
  const turboArgs = [
    'turbo',
    'run',
    'dev',
    '--concurrency',
    '22',
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
    '--filter=!@hypercode/cli',
=======
    '--filter=!@borg/cli',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
    '--filter=!@repo/*',
  ];
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'pnpm', ...turboArgs]
    : turboArgs;

  return spawn(command, args, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env,
  });
}

function spawnCliDev() {
  const env = {
    ...process.env,
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
    HYPERCODE_BRIDGE_PORT: String(activeBridgePort),
=======
    BORG_BRIDGE_PORT: String(activeBridgePort),
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
    CI: 'true',
  };

  const { command, args, cwd } = getPnpmSpawnSpec([
    '-C',
    'packages/cli',
    'exec',
    'tsx',
    'src/index.ts',
    'start',
    '--port',
    '3100',
  ]);

  return spawn(command, args, {
    cwd,
    stdio: 'inherit',
    env,
  });
}

function spawnOrchestratorDev() {
  const env = {
    ...process.env,
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
    HYPERCODE_BRIDGE_PORT: String(activeBridgePort),
    HYPERCODE_ORCHESTRATOR_PORT: '3847',
=======
    BORG_BRIDGE_PORT: String(activeBridgePort),
    BORG_ORCHESTRATOR_PORT: '3847',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
  };

  const { command, args, cwd } = getPnpmSpawnSpec([
    'run',
    'dev:orchestrator',
  ]);

  return spawn(command, args, {
    cwd,
    stdio: 'inherit',
    env,
  });
}

async function detectExistingCoreBridge() {
  const checks = await Promise.all(buildCoreBridgeProbeUrls().map((url) => fetchStatus(url)));

  return checks.some((check) => check.ok);
}

async function detectCoreBridgeOwnerPid(port = activeBridgePort) {
  if (process.platform === 'win32') {
    const output = await execFileText('netstat', ['-ano', '-p', 'tcp']);
    return parseListeningPidFromNetstat(output, port);
  }

  const output = await execFileText('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t']);
  return parseListeningPidFromLsof(output);
}

async function readProcessCommandLine(pid) {
  if (typeof pid !== 'number' || pid <= 0) {
    return '';
  }

  if (process.platform === 'win32') {
    const output = await execFileText('powershell.exe', [
      '-NoProfile',
      '-Command',
      `$p = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" | Select-Object -ExpandProperty CommandLine; if ($p) { $p }`,
    ]);

    return output.trim();
  }

  const output = await execFileText('ps', ['-p', String(pid), '-o', 'args=']);
  return output.trim();
}

async function detectCoreBridgeOwner(port = activeBridgePort) {
  const pid = await detectCoreBridgeOwnerPid(port);
  if (!pid) {
    return null;
  }

  const commandLine = await readProcessCommandLine(pid);
  return {
    pid,
    commandLine,
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
    trusted: isLikelyHypercodeCoreCommand(commandLine),
=======
    trusted: isLikelyBorgCoreCommand(commandLine),
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
  };
}

async function stopExistingCoreBridge(pid, sourceLabel) {
  if (typeof pid !== 'number' || pid <= 0 || pid === process.pid) {
    return false;
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch (error) {
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
    console.warn(`[Hypercode Dev Ready] could not terminate stale Hypercode core PID ${pid} from ${sourceLabel}: ${error instanceof Error ? error.message : String(error)}`);
=======
    console.warn(`[Borg Dev Ready] could not terminate stale Borg core PID ${pid} from ${sourceLabel}: ${error instanceof Error ? error.message : String(error)}`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
    return false;
  }

  const stopped = await waitForCoreBridgeShutdown(
    buildCoreBridgeProbeUrls(),
    {
      timeoutMs: TRPC_QUERY_TIMEOUT_MS,
      pollIntervalMs: POLL_INTERVAL_MS,
    },
    {
      probeImpl: fetchStatus,
      waitImpl: sleep,
    },
  );

  if (!stopped) {
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
    console.warn(`[Hypercode Dev Ready] stale Hypercode core PID ${pid} from ${sourceLabel} did not release the bridge within ${Math.floor(TRPC_QUERY_TIMEOUT_MS / 1000)}s.`);
=======
    console.warn(`[Borg Dev Ready] stale Borg core PID ${pid} from ${sourceLabel} did not release the bridge within ${Math.floor(TRPC_QUERY_TIMEOUT_MS / 1000)}s.`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
  }

  return stopped;
}

async function selectActiveBridgePort() {
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
  const explicitPort = normalizePort(process.env.HYPERCODE_BRIDGE_PORT)
    ?? normalizePort(process.env.HYPERCODE_CORE_BRIDGE_PORT);
=======
  const explicitPort = normalizePort(process.env.BORG_BRIDGE_PORT)
    ?? normalizePort(process.env.BORG_CORE_BRIDGE_PORT);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
  if (explicitPort) {
    return explicitPort;
  }

  const defaultOwner = await detectCoreBridgeOwner(DEFAULT_CORE_BRIDGE_PORT);
  if (!defaultOwner || defaultOwner.trusted) {
    return DEFAULT_CORE_BRIDGE_PORT;
  }

  for (const candidate of FALLBACK_BRIDGE_PORT_CANDIDATES) {
    if (candidate === DEFAULT_CORE_BRIDGE_PORT) {
      continue;
    }

    const ownerPid = await detectCoreBridgeOwnerPid(candidate);
    if (!ownerPid) {
      return candidate;
    }
  }

  return DEFAULT_CORE_BRIDGE_PORT;
}

function waitForChildExit(label, child) {
  return new Promise((resolve, reject) => {
    child.once('exit', (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }

      if ((code ?? 1) === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} exited (${code ?? 1})`));
    });
  });
}

async function main() {
  activeBridgePort = await selectActiveBridgePort();
  if (activeBridgePort !== DEFAULT_CORE_BRIDGE_PORT) {
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
    console.log(`[Hypercode Dev Ready] bridge port ${DEFAULT_CORE_BRIDGE_PORT} is occupied by a non-Hypercode process; using fallback port ${activeBridgePort}.`);
=======
    console.log(`[Borg Dev Ready] bridge port ${DEFAULT_CORE_BRIDGE_PORT} is occupied by a non-Borg process; using fallback port ${activeBridgePort}.`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
  }

  const child = spawnTurboDev();
  const orchestratorChild = spawnOrchestratorDev();
  let reuseExistingCoreBridge = await detectExistingCoreBridge();
  let cliChild = reuseExistingCoreBridge ? null : spawnCliDev();
  let childExit = null;
  let cliChildExit = null;
  let orchestratorChildExit = null;
  let attemptedStaleCoreRefresh = false;

  if (reuseExistingCoreBridge) {
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
    console.log(`[Hypercode Dev Ready] reusing existing core bridge on port ${activeBridgePort}; skipping duplicate CLI launch.`);
=======
    console.log(`[Borg Dev Ready] reusing existing core bridge on port ${activeBridgePort}; skipping duplicate CLI launch.`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
  }

  const attachCliChild = (nextCliChild) => {
    cliChild = nextCliChild;
    cliChildExit = null;

    if (!nextCliChild) {
      return;
    }

    nextCliChild.on('error', (error) => {
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
      console.error(`[Hypercode Dev Ready] failed to start CLI server: ${error instanceof Error ? error.message : String(error)}`);
=======
      console.error(`[Borg Dev Ready] failed to start CLI server: ${error instanceof Error ? error.message : String(error)}`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
      process.exit(1);
    });

    nextCliChild.on('exit', (code, signal) => {
      cliChildExit = { code, signal };
    });
  };

  const terminateChild = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }

    if (cliChild && !cliChild.killed) {
      cliChild.kill(signal);
    }

    if (!orchestratorChild.killed) {
      orchestratorChild.kill(signal);
    }
  };

  process.on('SIGINT', () => terminateChild('SIGINT'));
  process.on('SIGTERM', () => terminateChild('SIGTERM'));

  child.on('error', (error) => {
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
    console.error(`[Hypercode Dev Ready] failed to start dev stack: ${error instanceof Error ? error.message : String(error)}`);
=======
    console.error(`[Borg Dev Ready] failed to start dev stack: ${error instanceof Error ? error.message : String(error)}`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    childExit = { code, signal };
  });

  orchestratorChild.on('error', (error) => {
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
    console.error(`[Hypercode Dev Ready] failed to start orchestrator: ${error instanceof Error ? error.message : String(error)}`);
=======
    console.error(`[Borg Dev Ready] failed to start orchestrator: ${error instanceof Error ? error.message : String(error)}`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
    // Non-fatal if everything else works, but we should log it
  });

  orchestratorChild.on('exit', (code, signal) => {
    orchestratorChildExit = { code, signal };
  });

  attachCliChild(cliChild);

  const startedAt = Date.now();
  let warmed = false;
  let dashboardOpened = false;
  let extensionBuildPromise = null;

  while (Date.now() - startedAt <= READY_TIMEOUT_MS) {
    if (childExit) {
      const exitDescriptor = childExit.signal
        ? `signal=${childExit.signal}`
        : `code=${childExit.code ?? 1}`;

      throw new Error(`dev stack exited before readiness (${exitDescriptor})`);
    }

    if (cliChildExit) {
      const exitDescriptor = cliChildExit.signal
        ? `signal=${cliChildExit.signal}`
        : `code=${cliChildExit.code ?? 1}`;

      throw new Error(`CLI server exited before readiness (${exitDescriptor})`);
    }

    const state = await evaluateReadiness();

    const reportedBridgePort = Number.isInteger(state.startupStatus.data?.checks?.extensionBridge?.port)
      ? Number(state.startupStatus.data.checks.extensionBridge.port)
      : null;
    if (reportedBridgePort && reportedBridgePort !== activeBridgePort) {
      activeBridgePort = reportedBridgePort;
    }

    if (!state.extension.ready && !extensionBuildPromise) {
      extensionBuildPromise = ensureOfficialBrowserExtensionArtifacts().catch((error) => {
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
        console.warn(`[Hypercode Dev Ready] browser-extension build failed: ${error instanceof Error ? error.message : String(error)}`);
=======
        console.warn(`[Borg Dev Ready] browser-extension build failed: ${error instanceof Error ? error.message : String(error)}`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
      });
    }

    if (state.ready) {
      if (state.web && !warmed) {
        warmed = true;
        await warmMcpAndMemory(state.web.port);
      }

      if (state.web && !dashboardOpened) {
        dashboardOpened = true;
        openDashboardInBrowser(`http://127.0.0.1:${state.web.port}/dashboard`);
      }

      printReadySummary(state);
      break;
    }

    if (
      reuseExistingCoreBridge
      && state.startupStatus.ok
      && state.startupStatus.compatible === false
    ) {
      if (!attemptedStaleCoreRefresh && AUTO_REFRESH_STALE_CORE) {
        attemptedStaleCoreRefresh = true;
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
        const lockPath = getHypercodeStartLockPath();
        const lockRecord = readHypercodeStartLockRecord(lockPath);
=======
        const lockPath = getBorgStartLockPath();
        const lockRecord = readBorgStartLockRecord(lockPath);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
        const owner = lockRecord ? null : await detectCoreBridgeOwner();
        const refreshTarget = chooseStaleCoreRefreshTarget({
          lockRecord,
          owner,
          currentPid: process.pid,
        });

        if (refreshTarget.kind === 'lock' && lockRecord) {
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
          console.warn(`[Hypercode Dev Ready] existing core bridge is healthy but serving an older startup contract; stopping Hypercode core PID ${lockRecord.pid} from ${lockPath} and starting a fresh CLI instance.`);
=======
          console.warn(`[Borg Dev Ready] existing core bridge is healthy but serving an older startup contract; stopping Borg core PID ${lockRecord.pid} from ${lockPath} and starting a fresh CLI instance.`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
          const stopped = await stopExistingCoreBridge(refreshTarget.pid, lockPath);

          if (stopped) {
            reuseExistingCoreBridge = false;
            attachCliChild(spawnCliDev());
            await sleep(POLL_INTERVAL_MS);
            continue;
          }

<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
          console.warn('[Hypercode Dev Ready] existing core bridge is healthy but serving an older startup contract; the locked Hypercode core could not be stopped automatically.');
        } else if (refreshTarget.kind === 'owner') {
          console.warn(`[Hypercode Dev Ready] existing core bridge is healthy but serving an older startup contract; stopping Hypercode-owned bridge PID ${refreshTarget.pid} discovered from port ${activeBridgePort} and starting a fresh CLI instance.`);
=======
          console.warn('[Borg Dev Ready] existing core bridge is healthy but serving an older startup contract; the locked Borg core could not be stopped automatically.');
        } else if (refreshTarget.kind === 'owner') {
          console.warn(`[Borg Dev Ready] existing core bridge is healthy but serving an older startup contract; stopping Borg-owned bridge PID ${refreshTarget.pid} discovered from port ${activeBridgePort} and starting a fresh CLI instance.`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
          const stopped = await stopExistingCoreBridge(refreshTarget.pid, refreshTarget.sourceLabel);

          if (stopped) {
            reuseExistingCoreBridge = false;
            attachCliChild(spawnCliDev());
            await sleep(POLL_INTERVAL_MS);
            continue;
          }

<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
          console.warn('[Hypercode Dev Ready] existing core bridge is healthy but serving an older startup contract; the Hypercode-owned port listener could not be stopped automatically.');
        } else if (refreshTarget.kind === 'skip-untrusted-owner') {
          console.warn(`[Hypercode Dev Ready] existing core bridge is healthy but serving an older startup contract; port ${activeBridgePort} is owned by PID ${refreshTarget.pid}, but its command line did not look Hypercode-owned, so automatic refresh was skipped.`);
        } else {
          console.warn('[Hypercode Dev Ready] existing core bridge is healthy but serving an older startup contract; no Hypercode startup lock or port owner PID was found, so automatic refresh was skipped.');
        }
      }

      console.warn('[Hypercode Dev Ready] existing core bridge is healthy but serving an older startup contract; restart the Hypercode CLI/core bridge so `pnpm run dev` can validate the current readiness payload.');
=======
          console.warn('[Borg Dev Ready] existing core bridge is healthy but serving an older startup contract; the Borg-owned port listener could not be stopped automatically.');
        } else if (refreshTarget.kind === 'skip-untrusted-owner') {
          console.warn(`[Borg Dev Ready] existing core bridge is healthy but serving an older startup contract; port ${activeBridgePort} is owned by PID ${refreshTarget.pid}, but its command line did not look Borg-owned, so automatic refresh was skipped.`);
        } else {
          console.warn('[Borg Dev Ready] existing core bridge is healthy but serving an older startup contract; no Borg startup lock or port owner PID was found, so automatic refresh was skipped.');
        }
      }

      console.warn('[Borg Dev Ready] existing core bridge is healthy but serving an older startup contract; restart the Borg CLI/core bridge so `pnpm run dev` can validate the current readiness payload.');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
    }

    printWaitingSummary(state, Date.now() - startedAt);
    await sleep(POLL_INTERVAL_MS);
  }

  if (!warmed) {
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
    console.warn(`\n[Hypercode Dev Ready] ⚠ readiness timeout (${Math.floor(READY_TIMEOUT_MS / 1000)}s). Keeping dev stack running for manual inspection.`);
=======
    console.warn(`\n[Borg Dev Ready] ⚠ readiness timeout (${Math.floor(READY_TIMEOUT_MS / 1000)}s). Keeping dev stack running for manual inspection.`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
  }

  await Promise.all([
    waitForChildExit('dev stack', child),
    waitForChildExit('orchestrator', orchestratorChild),
    ...(cliChild ? [waitForChildExit('CLI server', cliChild)] : []),
  ]);
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  main().catch((error) => {
<<<<<<< HEAD:archive/ts-legacy/scripts/dev_tabby_ready.mjs
    console.error(`[Hypercode Dev Ready] unexpected error: ${error instanceof Error ? error.message : String(error)}`);
=======
    console.error(`[Borg Dev Ready] unexpected error: ${error instanceof Error ? error.message : String(error)}`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/dev_tabby_ready.mjs
    process.exit(1);
  });
}
