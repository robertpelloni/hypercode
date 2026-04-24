import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";

const CANDIDATE_PORTS = [3000, 3010, 3020, 3030, 3040];

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    // Do not force IPv4 host here.
    // On Windows, Next often binds IPv6 (::), and checking only 0.0.0.0
    // can incorrectly report a busy port as free.
    server.listen(port);
  });
}

async function pickPort() {
  for (const port of CANDIDATE_PORTS) {
    // Check both IPv4 and IPv6 listeners by optimistic bind test.
    // If either stack already owns the port, listen() will fail and we skip it.
    const free = await isPortFree(port);
    if (free) {
      return port;
    }
  }

  throw new Error(`No free dev port found in [${CANDIDATE_PORTS.join(", ")}]`);
}

async function removeStaleLock(distDir) {
  const lockPath = path.join(process.cwd(), distDir, "dev", "lock");

  try {
    await fs.rm(lockPath, { force: true });
  } catch {
    // Best effort cleanup only.
  }
}

async function main() {
  const selectedPort = await pickPort();
  const selectedDistDir = ".next-dev";

  // Cleanup the stable dev lock path used by this launcher.
  // This prevents stale lock files from previous interrupted runs from blocking startup.
  await removeStaleLock(".next-dev");

  const env = {
    ...process.env,
    NEXT_DIST_DIR: selectedDistDir,
  };

  console.log(`[web dev:auto] PORT=${selectedPort} NEXT_DIST_DIR=${selectedDistDir}`);

  const command = process.platform === "win32" ? "cmd.exe" : "pnpm";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", "pnpm", "run", "dev", "--port", String(selectedPort)]
    : ["run", "dev", "--port", String(selectedPort)];

  const child = spawn(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env,
  });

  child.on("error", (error) => {
    console.error(`[web dev:auto] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error(`[web dev:auto] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
