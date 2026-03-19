#!/usr/bin/env node

/**
 * Cross-platform Borg build orchestrator.
 *
 * Why this exists:
 * - Root Turbo builds only cover packages included in `pnpm-workspace.yaml`.
 * - Some extension deliverables live outside the root workspace (`apps/borg-extension`).
 * - The JetBrains plugin uses Gradle, so it needs a native build step.
 * - The richer browser extension has separate Chromium and Firefox modes that would
 *   otherwise overwrite the same `dist/` directory.
 */

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const args = new Set(process.argv.slice(2));
const workspaceOnly = args.has("--workspace-only");
const extensionsOnly = args.has("--extensions-only");

if (workspaceOnly && extensionsOnly) {
  console.error("[build] Choose either --workspace-only or --extensions-only, not both.");
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function printStep(message) {
  console.log(`\n[build] ${message}`);
}

function formatFailure(result) {
  return [
    result.error ? `error=${String(result.error)}` : null,
    typeof result.status === "number" ? `status=${result.status}` : null,
    result.signal ? `signal=${result.signal}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function fail(message, result) {
  const suffix = result ? ` (${formatFailure(result)})` : "";
  throw new Error(`${message}${suffix}`);
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: "utf-8",
    stdio: "inherit",
    shell: false,
    env: process.env,
    ...options,
  });

  return result;
}

function runPnpm(commandArgs, options = {}) {
  const direct = run(pnpmCommand, commandArgs, options);

  if (!direct.error) {
    return direct;
  }

  return run(`pnpm ${commandArgs.join(" ")}`, [], {
    ...options,
    shell: true,
  });
}

function copyDirectory(sourceDir, targetDir) {
  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(path.dirname(targetDir), { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true, force: true });
}

function runWorkspaceBuild() {
  printStep("Running Turbo workspace build (includes VS Code and browser-extension package workspaces)...");

  const result = runPnpm(
    [
      "exec",
      "turbo",
      "run",
      "build",
      "--filter=!@repo/*",
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        TURBO_DAEMON: "false",
      },
    },
  );

  if ((result.status ?? 1) !== 0) {
    fail("Workspace build failed", result);
  }
}

function runBrowserExtensionBuilds() {
  const extensionRoot = path.join(repoRoot, "apps", "borg-extension");
  const distDir = path.join(extensionRoot, "dist");
  const chromiumDistDir = path.join(extensionRoot, "dist-chromium");
  const firefoxDistDir = path.join(extensionRoot, "dist-firefox");
  const snapshotRoot = path.join(extensionRoot, ".build-artifacts");
  const chromiumSnapshotDir = path.join(snapshotRoot, "dist-chromium-snapshot");

  if (!existsSync(extensionRoot)) {
    printStep("Skipping browser-extension aggregate build because `apps/borg-extension` is not present.");
    return;
  }

  mkdirSync(snapshotRoot, { recursive: true });

  printStep("Installing Borg browser-extension workspace dependencies...");
  const installResult = runPnpm(["install", "--frozen-lockfile"], {
    cwd: extensionRoot,
    env: {
      ...process.env,
      CI: process.env.CI ?? "true",
    },
  });

  if ((installResult.status ?? 1) !== 0) {
    fail("Browser-extension dependency install failed", installResult);
  }

  printStep("Building Borg browser extension for Chromium/Chrome/Edge...");
  const chromiumBuild = runPnpm(["run", "base-build"], {
    cwd: extensionRoot,
    env: {
      ...process.env,
      CLI_CEB_DEV: "false",
      CLI_CEB_FIREFOX: "false",
    },
  });

  if ((chromiumBuild.status ?? 1) !== 0) {
    fail("Chromium browser-extension build failed", chromiumBuild);
  }

  if (!existsSync(distDir)) {
    fail(`Expected browser-extension output at ${distDir}`);
  }

  copyDirectory(distDir, chromiumDistDir);
  copyDirectory(distDir, chromiumSnapshotDir);

  printStep("Building Borg browser extension for Firefox...");
  const firefoxBuild = runPnpm(["run", "base-build"], {
    cwd: extensionRoot,
    env: {
      ...process.env,
      CLI_CEB_DEV: "false",
      CLI_CEB_FIREFOX: "true",
    },
  });

  if ((firefoxBuild.status ?? 1) !== 0) {
    fail("Firefox browser-extension build failed", firefoxBuild);
  }

  if (!existsSync(distDir)) {
    fail(`Expected Firefox browser-extension output at ${distDir}`);
  }

  copyDirectory(distDir, firefoxDistDir);

  // Restore the default `dist/` to the Chromium build so callers that already
  // expect `pnpm build` -> Chromium continue to work, while keeping a preserved
  // Firefox artifact beside it.
  copyDirectory(chromiumSnapshotDir, distDir);
  rmSync(snapshotRoot, { recursive: true, force: true });
}

function detectGradleCommand(jetbrainsRoot) {
  const wrapperCandidates = process.platform === "win32"
    ? [path.join(jetbrainsRoot, "gradlew.bat")]
    : [path.join(jetbrainsRoot, "gradlew")];

  const wrapper = wrapperCandidates.find((candidate) => existsSync(candidate));
  if (wrapper) {
    return { command: wrapper, args: ["buildPlugin"] };
  }

  const fallbackCandidates = process.platform === "win32"
    ? ["gradle", "gradle.bat"]
    : ["gradle"];

  for (const fallbackCommand of fallbackCandidates) {
    const probe = spawnSync(fallbackCommand, ["--version"], {
      cwd: jetbrainsRoot,
      stdio: "ignore",
      shell: false,
      env: process.env,
    });

    if (!probe.error && (probe.status ?? 1) === 0) {
      return { command: fallbackCommand, args: ["buildPlugin"] };
    }
  }

  return null;
}

function runJetBrainsBuild() {
  const jetbrainsRoot = path.join(repoRoot, "packages", "jetbrains");

  if (!existsSync(jetbrainsRoot)) {
    printStep("Skipping JetBrains plugin build because `packages/jetbrains` is not present.");
    return;
  }

  const gradle = detectGradleCommand(jetbrainsRoot);
  if (!gradle) {
    const strictJetBrainsBuild = process.env.BORG_REQUIRE_JETBRAINS_BUILD === "true";
    const message = "Skipping JetBrains plugin build because Gradle is not available. Install Gradle or add a Gradle wrapper under `packages/jetbrains`, or set BORG_REQUIRE_JETBRAINS_BUILD=true to fail instead.";

    if (strictJetBrainsBuild) {
      fail(message);
    }

    printStep(message);
    return;
  }

  printStep("Building JetBrains plugin artifact...");
  const result = run(gradle.command, gradle.args, {
    cwd: jetbrainsRoot,
    env: {
      ...process.env,
      CI: process.env.CI ?? "true",
    },
  });

  if ((result.status ?? 1) !== 0) {
    fail("JetBrains plugin build failed", result);
  }
}

async function main() {
  if (!extensionsOnly) {
    runWorkspaceBuild();
  }

  if (!workspaceOnly) {
    runBrowserExtensionBuilds();
    runJetBrainsBuild();
  }

  printStep("Build completed successfully ✅");
}

main().catch((error) => {
  console.error(`\n[build] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
