#!/usr/bin/env node

/**
<<<<<<< HEAD:archive/ts-legacy/scripts/verify_dev_readiness.mjs
 * Verifies local multi-service dev readiness for Hypercode workspace.
=======
 * Verifies local multi-service dev readiness for Borg workspace.
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/verify_dev_readiness.mjs
 *
 * Why this exists:
 * - Root `pnpm run dev` starts many long-running tasks across packages/submodules.
 * - Regressions often present as one service silently moving to a fallback port.
 * - We want a deterministic, one-command readiness report with explicit URLs.
 */

import {
  detectBrowserExtensionArtifacts,
  getPreferredWebPorts,
  summarizeBrowserExtensionArtifacts,
} from './dev_tabby_ready_helpers.mjs';

const REPO_ROOT = process.cwd();
const WEB_PORT_CANDIDATES = [3000, 3010, 3020, 3030, 3040];
const REQUEST_TIMEOUT_MS = Number(process.env.READINESS_TIMEOUT_MS || 5000);
const REQUEST_RETRIES = Number(process.env.READINESS_RETRIES || 2);
const RETRY_DELAY_MS = Number(process.env.READINESS_RETRY_DELAY_MS || 1000);
const strictJsonMode = process.argv.includes("--strict-json");
const softMode = process.argv.includes("--soft");
const jsonMode = process.argv.includes("--json") || strictJsonMode;
const compactJsonMode = strictJsonMode || process.argv.includes("--json-compact");

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
<<<<<<< HEAD:archive/ts-legacy/scripts/verify_dev_readiness.mjs
  return normalizePort(env.HYPERCODE_BRIDGE_PORT)
    ?? normalizePort(env.HYPERCODE_CORE_BRIDGE_PORT)
=======
  return normalizePort(env.BORG_BRIDGE_PORT)
    ?? normalizePort(env.BORG_CORE_BRIDGE_PORT)
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/verify_dev_readiness.mjs
    ?? 3001;
}

function buildServiceChecks(coreBridgePorts) {
  return [
    {
<<<<<<< HEAD:archive/ts-legacy/scripts/verify_dev_readiness.mjs
      id: "hypercode-web",
      description: "Hypercode Next.js dashboard",
=======
      id: "borg-web",
      description: "Borg Next.js dashboard",
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/verify_dev_readiness.mjs
      ports: getPreferredWebPorts(REPO_ROOT, WEB_PORT_CANDIDATES),
      path: "/api/trpc/startupStatus?input=%7B%7D|/dashboard",
      critical: true,
    },
    {
<<<<<<< HEAD:archive/ts-legacy/scripts/verify_dev_readiness.mjs
      id: "hypercode-core-bridge",
      description: "Hypercode Core extension bridge stream",
=======
      id: "borg-core-bridge",
      description: "Borg Core extension bridge stream",
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/verify_dev_readiness.mjs
      ports: coreBridgePorts,
      path: "/api/mesh/stream|/health",
      critical: true,
    },
    {
<<<<<<< HEAD:archive/ts-legacy/scripts/verify_dev_readiness.mjs
      id: "hypercode-mcp-status",
      description: "Hypercode MCP status query via web API",
=======
      id: "borg-mcp-status",
      description: "Borg MCP status query via web API",
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/verify_dev_readiness.mjs
      ports: getPreferredWebPorts(REPO_ROOT, WEB_PORT_CANDIDATES),
      path: "/api/trpc/mcp.getStatus?input=%7B%7D",
      critical: true,
    },
    {
<<<<<<< HEAD:archive/ts-legacy/scripts/verify_dev_readiness.mjs
      id: "hypercode-memory-status",
      description: "Hypercode memory status query via web API",
=======
      id: "borg-memory-status",
      description: "Borg memory status query via web API",
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/verify_dev_readiness.mjs
      ports: getPreferredWebPorts(REPO_ROOT, WEB_PORT_CANDIDATES),
      path: "/api/trpc/memory.getAgentStats?input=%7B%7D",
      critical: true,
    },
  ];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
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

async function detectBridgePorts() {
  for (const port of getPreferredWebPorts(REPO_ROOT, WEB_PORT_CANDIDATES)) {
    const url = `http://127.0.0.1:${port}/api/trpc/startupStatus?input=%7B%7D`;
    const response = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS);
    if (!response.ok) {
      continue;
    }

    try {
      const text = await fetch(url).then((res) => res.text());
      const payload = JSON.parse(text);
      const data = extractTrpcData(payload);
      const bridgePort = data?.checks?.extensionBridge?.port;
      if (Number.isInteger(bridgePort)) {
        return [Number(bridgePort)];
      }

      const bridgePortMatch = text.match(/"extensionBridge"\s*:\s*\{[\s\S]*?"port"\s*:\s*(\d+)/u);
      if (bridgePortMatch) {
        return [Number(bridgePortMatch[1])];
      }
    } catch {
      // fall back to the configured/default port
    }
  }

  return [resolveBridgePort()];
}

async function detectRunningEndpoint(service) {
  let lastFailure = {
    statusCode: null,
    error: null,
  };

  for (let attempt = 0; attempt <= REQUEST_RETRIES; attempt += 1) {
    const pathCandidates = service.path.includes('|')
      ? service.path.split('|').map((p) => p.trim()).filter(Boolean)
      : [service.path];

    const checks = await Promise.all(service.ports.flatMap((port) =>
      pathCandidates.map(async (pathCandidate) => {
        const url = `http://127.0.0.1:${port}${pathCandidate}`;
        const result = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS);
        return { port, url, result };
      }),
    ));

    const firstUp = checks.find((check) => check.result.ok);
    if (firstUp) {
      return {
        status: "up",
        port: firstUp.port,
        url: firstUp.url,
        statusCode: firstUp.result.status,
        error: null,
      };
    }

    for (const check of checks) {
      if (typeof check.result.status === 'number') {
        lastFailure.statusCode = check.result.status;
      }
      if (check.result.error) {
        lastFailure.error = check.result.error;
      }
    }

    if (attempt < REQUEST_RETRIES) {
      await sleep(RETRY_DELAY_MS);
    }
  }

  return {
    status: "down",
    port: null,
    url: null,
    statusCode: lastFailure.statusCode,
    error: lastFailure.error,
  };
}

function formatLine(service, result) {
  if (result.status === "up") {
    return `✅ ${service.id.padEnd(18)} ${String(result.statusCode).padEnd(3)} ${result.url}`;
  }

  const failureDetails = [
    typeof result.statusCode === 'number' ? `lastStatus=${result.statusCode}` : null,
    result.error ? `lastError=${result.error}` : null,
  ].filter(Boolean).join(' ');

  const suffix = failureDetails ? ` ${failureDetails}` : '';
  return `❌ ${service.id.padEnd(18)} DOWN checked=[${service.ports.join(",")}] path=${service.path}${suffix}`;
}

function getFailureHint(serviceId, result) {
<<<<<<< HEAD:archive/ts-legacy/scripts/verify_dev_readiness.mjs
  if (serviceId === 'hypercode-core-bridge') {
    return 'Core API bridge is unreachable. Ensure the configured Hypercode bridge port is running and not blocked by another process.';
  }

  if (serviceId === 'hypercode-memory-status') {
=======
  if (serviceId === 'borg-core-bridge') {
    return 'Core API bridge is unreachable. Ensure the configured Borg bridge port is running and not blocked by another process.';
  }

  if (serviceId === 'borg-memory-status') {
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/verify_dev_readiness.mjs
    if (result.statusCode === 502) {
      return 'Web is up but memory API upstream is unavailable (502). Start/restart core services and verify memory router initialization logs.';
    }
    return 'Memory status endpoint is unavailable. Verify web app can reach core backend and that memory procedures are registered.';
  }

<<<<<<< HEAD:archive/ts-legacy/scripts/verify_dev_readiness.mjs
  if (serviceId === 'hypercode-mcp-status') {
=======
  if (serviceId === 'borg-mcp-status') {
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/verify_dev_readiness.mjs
    return 'MCP status endpoint failed. Verify tRPC routing and core MCP aggregator startup logs.';
  }

  return 'Service did not become ready within retry window. Check process logs and port conflicts.';
}

function checkExtensionArtifacts() {
  const items = detectBrowserExtensionArtifacts(process.cwd()).map((artifact) => ({
    id: artifact.id,
    description: artifact.label,
    critical: true,
    status: artifact.ready ? 'up' : 'down',
    missing: artifact.missingFiles,
    checkedFiles: artifact.requiredFiles,
    artifactPath: artifact.artifactPath,
  }));

  return summarizeBrowserExtensionArtifacts(items.map((artifact) => ({
    ...artifact,
    ready: artifact.status === 'up',
    missingFiles: artifact.missing,
    requiredFiles: artifact.checkedFiles,
    label: artifact.description,
    artifactPath: artifact.artifactPath,
  })));
}

async function main() {
  if (!jsonMode) {
<<<<<<< HEAD:archive/ts-legacy/scripts/verify_dev_readiness.mjs
    console.log(`\n[Hypercode Dev Readiness] timeout=${REQUEST_TIMEOUT_MS}ms mode=${softMode ? "soft" : "strict"}`);
=======
    console.log(`\n[Borg Dev Readiness] timeout=${REQUEST_TIMEOUT_MS}ms mode=${softMode ? "soft" : "strict"}`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/verify_dev_readiness.mjs
  }

  const serviceChecks = buildServiceChecks(await detectBridgePorts());
  const results = await Promise.all(
    serviceChecks.map(async (service) => ({
      service,
      result: await detectRunningEndpoint(service),
    })),
  );

  if (!jsonMode) {
    console.log("\nService Status:");
    for (const { service, result } of results) {
      console.log(formatLine(service, result));
    }
  }

  const extensionArtifacts = detectBrowserExtensionArtifacts(process.cwd()).map((artifact) => ({
    id: artifact.id,
    description: artifact.label,
    critical: true,
    status: artifact.ready ? 'up' : 'down',
    missing: artifact.missingFiles,
    checkedFiles: artifact.requiredFiles,
    artifactPath: artifact.artifactPath,
  }));
  const extensionSummary = summarizeBrowserExtensionArtifacts(extensionArtifacts.map((artifact) => ({
    ...artifact,
    ready: artifact.status === 'up',
    missingFiles: artifact.missing,
    requiredFiles: artifact.checkedFiles,
    label: artifact.description,
    artifactPath: artifact.artifactPath,
  })));
  const failedExtensionArtifacts = extensionArtifacts.filter((artifact) => artifact.critical && artifact.status !== 'up');
  const failedCritical = [
    ...results.filter(({ service, result }) => service.critical && result.status !== "up"),
    ...failedExtensionArtifacts.map((artifact) => ({ service: { id: artifact.id }, result: { status: artifact.status } })),
  ];

  const payload = {
    tool: "verify_dev_readiness",
    mode: softMode ? "soft" : "strict",
    timeoutMs: REQUEST_TIMEOUT_MS,
    retries: REQUEST_RETRIES,
    retryDelayMs: RETRY_DELAY_MS,
    passed: failedCritical.length === 0,
    checkedAt: new Date().toISOString(),
    services: results.map(({ service, result }) => ({
      id: service.id,
      description: service.description,
      critical: service.critical,
      checkedPorts: service.ports,
      path: service.path,
      status: result.status,
      url: result.url,
      port: result.port,
      statusCode: result.statusCode,
      error: result.error ?? null,
      hint: result.status === 'up' ? null : getFailureHint(service.id, result),
    })),
    artifacts: extensionArtifacts.map((artifact) => ({
      id: artifact.id,
      description: artifact.description,
      critical: artifact.critical,
      status: artifact.status,
      artifactPath: artifact.artifactPath,
      checkedFiles: artifact.checkedFiles,
      missingFiles: artifact.missing,
    })),
    browserExtensionReady: extensionSummary.ready,
  };

  if (jsonMode) {
    console.log(JSON.stringify(payload, null, compactJsonMode ? 0 : 2));
  }

  if (failedCritical.length > 0) {
    if (!jsonMode) {
      console.log("\nSummary: ❌ readiness failed (critical services down)");
      if (failedExtensionArtifacts.length > 0) {
        for (const artifact of failedExtensionArtifacts) {
          console.log(`❌ ${artifact.id} missing files in ${artifact.artifactPath ?? 'unavailable'}: ${artifact.missing.join(', ')}`);
        }
      }

      const failedServices = results.filter(({ service, result }) => service.critical && result.status !== 'up');
      if (failedServices.length > 0) {
        console.log('\nTroubleshooting hints:');
        for (const { service, result } of failedServices) {
          console.log(`- ${service.id}: ${getFailureHint(service.id, result)}`);
        }
      }
    }

    if (!softMode) {
      process.exit(1);
    }

    if (!jsonMode) {
      console.log("Soft mode enabled; returning exit code 0 despite failures.");
    }
  } else {
    if (!jsonMode) {
      console.log("\nSummary: ✅ readiness passed");
    }
  }
}

main().catch((error) => {
<<<<<<< HEAD:archive/ts-legacy/scripts/verify_dev_readiness.mjs
  console.error("[Hypercode Dev Readiness] Unexpected error:", error);
=======
  console.error("[Borg Dev Readiness] Unexpected error:", error);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/verify_dev_readiness.mjs
  process.exit(1);
});
