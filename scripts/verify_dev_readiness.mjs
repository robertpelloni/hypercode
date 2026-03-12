#!/usr/bin/env node

/**
 * Verifies local multi-service dev readiness for Borg workspace.
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

const SERVICE_CHECKS = [
  {
    id: "borg-web",
    description: "Borg Next.js dashboard",
    ports: getPreferredWebPorts(REPO_ROOT, WEB_PORT_CANDIDATES),
    path: "/api/trpc/startupStatus?input=%7B%7D|/",
    critical: true,
  },
  {
    id: "borg-core-bridge",
    description: "Borg Core extension bridge stream",
    ports: [3001],
    path: "/api/mesh/stream|/health",
    critical: true,
  },
  {
    id: "borg-mcp-status",
    description: "Borg MCP status query via web API",
    ports: getPreferredWebPorts(REPO_ROOT, WEB_PORT_CANDIDATES),
    path: "/api/trpc/mcp.getStatus?input=%7B%7D",
    critical: true,
  },
  {
    id: "borg-memory-status",
    description: "Borg memory status query via web API",
    ports: getPreferredWebPorts(REPO_ROOT, WEB_PORT_CANDIDATES),
    path: "/api/trpc/memory.getAgentStats?input=%7B%7D",
    critical: true,
  },
];

const REQUEST_TIMEOUT_MS = Number(process.env.READINESS_TIMEOUT_MS || 5000);
const REQUEST_RETRIES = Number(process.env.READINESS_RETRIES || 2);
const RETRY_DELAY_MS = Number(process.env.READINESS_RETRY_DELAY_MS || 1000);
const strictJsonMode = process.argv.includes("--strict-json");
const softMode = process.argv.includes("--soft");
const jsonMode = process.argv.includes("--json") || strictJsonMode;
const compactJsonMode = strictJsonMode || process.argv.includes("--json-compact");

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
  if (serviceId === 'borg-core-bridge') {
    return 'Core API bridge is unreachable. Ensure packages/core dev server is running on port 3001 and not blocked by another process.';
  }

  if (serviceId === 'borg-memory-status') {
    if (result.statusCode === 502) {
      return 'Web is up but memory API upstream is unavailable (502). Start/restart core services and verify memory router initialization logs.';
    }
    return 'Memory status endpoint is unavailable. Verify web app can reach core backend and that memory procedures are registered.';
  }

  if (serviceId === 'borg-mcp-status') {
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
    console.log(`\n[Borg Dev Readiness] timeout=${REQUEST_TIMEOUT_MS}ms mode=${softMode ? "soft" : "strict"}`);
  }

  const results = await Promise.all(
    SERVICE_CHECKS.map(async (service) => ({
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
  console.error("[Borg Dev Readiness] Unexpected error:", error);
  process.exit(1);
});
