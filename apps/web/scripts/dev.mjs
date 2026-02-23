import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FALLBACK_PORTS = [3000, 3010, 3020, 3030, 3040];
const WILDCARD_NEXT_DEV_TYPES = ".next-dev-*/types/**/*.ts";
const WILDCARD_NEXT_DEV_DEV_TYPES = ".next-dev-*/dev/types/**/*.ts";
const SPECIFIC_NEXT_DEV_TYPES_PATTERN = /^\.next-dev-\d+\/(types|dev\/types)\/\*\*\/\*\.ts$/;

function normalizeTsconfigIncludes() {
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

    if (!sanitizedIncludes.includes(WILDCARD_NEXT_DEV_TYPES)) {
      sanitizedIncludes.push(WILDCARD_NEXT_DEV_TYPES);
    }

    if (!sanitizedIncludes.includes(WILDCARD_NEXT_DEV_DEV_TYPES)) {
      sanitizedIncludes.push(WILDCARD_NEXT_DEV_DEV_TYPES);
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
  // Keep TypeScript include globs stable across dev port changes.
  normalizeTsconfigIncludes();

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

  // Use a single stable development dist directory.
  // Reason: Next.js mutates tsconfig includes based on distDir; when distDir changes per port,
  // stale explicit include entries can accumulate and later break type-check/build runs.
  // Keeping distDir stable eliminates that drift while still separating dev from production `.next`.
  const distDir = process.env.NEXT_DIST_DIR || ".next-dev";
  const env = {
    ...process.env,
    NEXT_DIST_DIR: distDir,
  };

  await cleanupStaleDevLockIfSafe(selectedPort, distDir);

  console.log(`[web dev] PORT=${selectedPort} NEXT_DIST_DIR=${distDir}`);

  const command = process.platform === "win32" ? "cmd.exe" : "pnpm";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", "pnpm", "exec", "next", "dev", "--webpack", ...effectiveArgs]
    : ["exec", "next", "dev", "--webpack", ...effectiveArgs];

  const child = spawn(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env,
  });

  child.on("error", (error) => {
    normalizeTsconfigIncludes();
    console.error(`[web dev] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    normalizeTsconfigIncludes();

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