#!/usr/bin/env node

/**
 * Runs deterministic release gate checks for Borg workspace.
 *
 * Why this exists:
 * - Readiness checks are now machine-readable JSON and should gate releases.
 * - We also want baseline regressions/type safety checks in one command.
 */

import { spawnSync } from "node:child_process";

const usePnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const useNode = process.execPath;
const ciMode = process.argv.includes("--ci");
const requireReadinessInCi = process.env.RELEASE_GATE_REQUIRE_READINESS === "1";

function run(name, command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf-8",
    ...options,
  });

  return { name, command, args, ...result };
}

function runPnpm(name, args, options = {}) {
  const direct = run(name, usePnpm, args, {
    shell: false,
    ...options,
  });

  if (!direct.error) {
    return direct;
  }

  // Fallback for shells/environments where pnpm wrapper resolution is unavailable.
  return run(name, `pnpm ${args.join(" ")}`, [], {
    shell: true,
    ...options,
  });
}

function formatCommandFailure(result) {
  return [
    result.error ? `error=${String(result.error)}` : null,
    typeof result.status === "number" ? `status=${result.status}` : null,
    result.signal ? `signal=${result.signal}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function fail(message, details) {
  console.error(`\n[release-gate] ${message}`);
  if (details) {
    console.error(details);
  }
  process.exit(1);
}

function printStep(message) {
  console.log(`\n[release-gate] ${message}`);
}

async function main() {
  if (!ciMode || requireReadinessInCi) {
    printStep("Running strict readiness probe (machine-readable JSON)...");

    const readiness = run(
      "readiness",
      useNode,
      ["scripts/verify_dev_readiness.mjs", "--strict-json"],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    if (readiness.error) {
      fail("Readiness probe failed to execute.", String(readiness.error));
    }

    if ((readiness.status ?? 1) !== 0) {
      fail(
        "Readiness probe reported failure.",
        [readiness.stdout, readiness.stderr].filter(Boolean).join("\n"),
      );
    }

    let readinessPayload;
    try {
      readinessPayload = JSON.parse(readiness.stdout);
    } catch {
      fail("Readiness output was not valid JSON.", readiness.stdout || readiness.stderr);
    }

    if (!readinessPayload?.passed) {
      fail("Readiness JSON indicates failed critical services.", JSON.stringify(readinessPayload, null, 2));
    }

    console.log("[release-gate] Readiness OK");
  } else {
    printStep("CI mode: skipping local readiness probe (requires running dev services).");
  }

  printStep("Running placeholder regression check...");
  const placeholder = runPnpm("placeholder-check", ["run", "check:placeholders"], {
    stdio: "inherit",
  });

  if ((placeholder.status ?? 1) !== 0) {
    fail(`Placeholder regression check failed. ${formatCommandFailure(placeholder)}`);
  }

  printStep("Running core typecheck...");
  const typecheck = runPnpm("core-typecheck", ["-C", "packages/core", "exec", "tsc", "--noEmit"], {
    stdio: "inherit",
  });

  if ((typecheck.status ?? 1) !== 0) {
    fail(`Core typecheck failed. ${formatCommandFailure(typecheck)}`);
  }

  printStep("All release gate checks passed ✅");
}

main().catch((error) => {
  fail("Unexpected release gate error.", String(error));
});
