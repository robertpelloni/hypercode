import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FALLBACK_PORTS = [3000, 3010, 3020, 3030, 3040];
const SPECIFIC_NEXT_DEV_TYPES_PATTERN = /^\.next-dev-\d+\/(types|dev\/types)\/\*\*\/\*\.ts$/;
const WEB_DEV_PORT_MARKER = ".hypercode-dev-port.json";

function buildNextDevTypeIncludes(distDir) {
  return [
    `${distDir}/types/**/*.ts`,
    `${distDir}/dev/types/**/*.ts`,
  ];
}

function normalizeTsconfigIncludes(distDir = ".next-dev-3000") {
  try {
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const tsconfigPath = path.resolve(scriptDir, "..", "tsconfig.json");
    const tsconfigRaw = fs.readFileSync(tsconfigPath, "utf8");
    const parsed = JSON.parse(tsconfigRaw);

    if (!Array.isArray(parsed.include)) {
      return;
    }

    const sanitizedIncludes = parsed.include.filter((entry) => {
      if (typeof entry !== "string") {
        return true;
      }

      return !SPECIFIC_NEXT_DEV_TYPES_PATTERN.test(entry);
    });

    for (const include of buildNextDevTypeIncludes(distDir)) {
      if (!sanitizedIncludes.includes(include)) {
        sanitizedIncludes.push(include);
      }
    }

    parsed.include = [...new Set(sanitizedIncludes)];
    fs.writeFileSync(tsconfigPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  } catch {
    // Best-effort normalization only. Development startup must remain resilient.
  }
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port);
  });
}

function resolvePort(args) {
  let explicit = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    // Support both `--port 3010` and `--port=3010` so callers can use either style.
    if (arg === "--port") {
      const nextArg = args[index + 1];
      if (nextArg) {
        explicit = true;
        return { port: nextArg, explicit };
      }
    }

    if (arg.startsWith("--port=")) {
      const value = arg.slice("--port=".length);
      if (value) {
        explicit = true;
        return { port: value, explicit };
      }
    }
  }

  return { port: process.env.PORT || "3000", explicit };
}

async function pickPort(requestedPort, explicitPort) {
  if (explicitPort) {
    return requestedPort;
  }

  const requestedIsFree = await isPortFree(Number(requestedPort));
  if (requestedIsFree) {
    return requestedPort;
  }

  for (const candidate of FALLBACK_PORTS) {
    if (String(candidate) === String(requestedPort)) {
      continue;
    }

    const free = await isPortFree(candidate);
    if (free) {
      return String(candidate);
    }
  }

  return requestedPort;
}

function resolveDevLockPath(distDir) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, "..", distDir, "dev", "lock");
}

function resolveWebDevPortMarkerPath() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, "..", WEB_DEV_PORT_MARKER);
}

function writeWebDevPortMarker(port, distDir) {
  try {
    const markerPath = resolveWebDevPortMarkerPath();
    const payload = {
      port: Number(port),
      distDir,
      pid: process.pid,
      writtenAt: new Date().toISOString(),
    };
    fs.writeFileSync(markerPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  } catch {
    // Best-effort marker only.
  }
}

function removeWebDevPortMarker(port) {
  try {
    const markerPath = resolveWebDevPortMarkerPath();
    if (!fs.existsSync(markerPath)) {
      return;
    }

    const raw = fs.readFileSync(markerPath, "utf8");
    const parsed = JSON.parse(raw);
    if (Number(parsed?.port) !== Number(port)) {
      return;
    }

    fs.rmSync(markerPath, { force: true });
  } catch {
    // Best-effort cleanup only.
  }
}

function removeDevLockIfPresent(lockPath) {
  try {
    if (fs.existsSync(lockPath)) {
      fs.rmSync(lockPath, { force: true });
      return true;
    }
  } catch {
    // Best-effort cleanup only.
  }

  return false;
}

async function cleanupStaleDevLockIfSafe(selectedPort, distDir) {
  const lockPath = resolveDevLockPath(distDir);
  const portIsFree = await isPortFree(Number(selectedPort));

  // Only clean lock files when the target port is currently free.
  // This avoids deleting lock state for an actively running Next dev instance.
  if (!portIsFree) {
    return;
  }

  if (removeDevLockIfPresent(lockPath)) {
    console.log(`[web dev] Removed stale lock: ${lockPath}`);
  }
}

async function main() {
  // pnpm scripts often forward args as: ["--", "--port", "3000"].
  // Next.js should only receive the real flags, not the delimiter token.
  const passThroughArgs = process.argv.slice(2).filter((arg) => arg !== "--");
  const { port: requestedPort, explicit: explicitPort } = resolvePort(passThroughArgs);
  const selectedPort = await pickPort(requestedPort, explicitPort);
  const effectiveArgs = explicitPort || selectedPort === requestedPort
    ? passThroughArgs
    : ["--port", selectedPort, ...passThroughArgs];

  if (!explicitPort && selectedPort !== requestedPort) {
    console.log(`[web dev] Port ${requestedPort} busy, falling back to ${selectedPort}`);
  }

  // Use a per-port development dist directory.
  // Reason: multiple dev servers (or a stale previous instance plus a new one) can race on the
  // same `.next-dev` folder and crash with filesystem errors like ENOTEMPTY while Next is cleaning
  // generated server assets. We keep tsconfig includes stable via wildcard normalization above,
  // so isolating each port's dist output is now the safer default.
  const distDir = process.env.NEXT_DIST_DIR || `.next-dev-${selectedPort}`;
  const env = {
    ...process.env,
    NEXT_DIST_DIR: distDir,
  };

  // Keep TypeScript includes aligned with the active per-port Next.js dev output.
  normalizeTsconfigIncludes(distDir);

  await cleanupStaleDevLockIfSafe(selectedPort, distDir);
  writeWebDevPortMarker(selectedPort, distDir);

  console.log(`[web dev] PORT=${selectedPort} NEXT_DIST_DIR=${distDir}`);

  const command = process.platform === "win32" ? "cmd.exe" : "pnpm";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", "pnpm", "exec", "next", "dev", ...effectiveArgs]
    : ["exec", "next", "dev", ...effectiveArgs];

  const child = spawn(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env,
  });

  child.on("error", (error) => {
    removeWebDevPortMarker(selectedPort);
    normalizeTsconfigIncludes(distDir);
    console.error(`[web dev] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    removeWebDevPortMarker(selectedPort);
    normalizeTsconfigIncludes(distDir);

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error(`[web dev] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
