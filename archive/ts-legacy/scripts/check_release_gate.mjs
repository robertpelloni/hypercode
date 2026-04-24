#!/usr/bin/env node

/**
<<<<<<< HEAD:archive/ts-legacy/scripts/check_release_gate.mjs
 * Runs deterministic release gate checks for Hypercode workspace.
=======
 * Runs deterministic release gate checks for Borg workspace.
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:scripts/check_release_gate.mjs
 *
 * Why this exists:
 * - Readiness checks are now machine-readable JSON and should gate releases.
 * - We also want baseline regressions/type safety checks in one command.
 */

import { spawnSync } from "node:child_process";

const usePnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const useNode = process.execPath;
const args = new Set(process.argv.slice(2));
const skipReadiness = args.has("--skip-readiness");
const includeTurboLint = args.has("--with-turbo-lint");
const strictVisuals = args.has("--strict-visuals");
const includeVisuals = args.has("--with-visuals") || strictVisuals;

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
  if (!skipReadiness) {
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
    printStep("Skipping readiness probe (--skip-readiness).");
  }

  printStep("Running placeholder regression check...");
  const placeholder = runPnpm("placeholder-check", ["run", "check:placeholders"], {
    stdio: "inherit",
  });

  if ((placeholder.status ?? 1) !== 0) {
    fail(`Placeholder regression check failed. ${formatCommandFailure(placeholder)}`);
  }

  if (includeVisuals) {
    const visualsCommand = strictVisuals ? "visuals:verify:strict" : "visuals:verify";
    printStep(`Running visuals verification check (${visualsCommand})...`);
    const visualsVerify = runPnpm("visuals-verify", ["run", visualsCommand], {
      stdio: "inherit",
    });

    if ((visualsVerify.status ?? 1) !== 0) {
      fail(`Visuals verification failed. ${formatCommandFailure(visualsVerify)}`);
    }
  } else {
    printStep("Skipping visuals verification (screenshots are manual, opt-in release artifacts).");
  }

  printStep("Running core typecheck...");
  const typecheck = runPnpm("core-typecheck", ["-C", "packages/core", "exec", "tsc", "--noEmit"], {
    stdio: "inherit",
  });

  if ((typecheck.status ?? 1) !== 0) {
    fail(`Core typecheck failed. ${formatCommandFailure(typecheck)}`);
  }

  if (includeTurboLint) {
    printStep("Running scoped Turbo lint...");
    const turboLint = runPnpm("turbo-lint", ["run", "lint:turbo"], {
      stdio: "inherit",
    });

    if ((turboLint.status ?? 1) !== 0) {
      fail(`Scoped Turbo lint failed. ${formatCommandFailure(turboLint)}`);
    }
  }

  printStep("All release gate checks passed ✅");
}

main().catch((error) => {
  fail("Unexpected release gate error.", String(error));
});
