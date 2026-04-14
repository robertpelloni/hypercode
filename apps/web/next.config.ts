import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Prevent Next.js from clearing the console
console.clear = () => { };

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const appSrcRoot = fileURLToPath(new URL("./src", import.meta.url));
const isDevelopment = process.env.NODE_ENV !== "production";

if (process.platform === "win32" && !process.env.NAPI_RS_NATIVE_LIBRARY_PATH) {
  const oxideNativePath = fileURLToPath(
    new URL(
      "../../node_modules/.pnpm/@tailwindcss+oxide-win32-x64-msvc@4.1.18/node_modules/@tailwindcss/oxide-win32-x64-msvc/tailwindcss-oxide.win32-x64-msvc.node",
      import.meta.url,
    ),
  );

  if (fs.existsSync(oxideNativePath)) {
    process.env.NAPI_RS_NATIVE_LIBRARY_PATH = oxideNativePath;
  }
}

const nextConfig: NextConfig = {
  // Keep dev and production outputs separated by default.
  // This prevents long-running dev servers from being invalidated when builds or cleanup tasks
  // touch `.next` while development is active.
  distDir: process.env.NEXT_DIST_DIR || (isDevelopment ? ".next-dev" : ".next"),
  // Pin tracing root to this monorepo root to avoid Next.js inferring C:\Users\hyper
  // when multiple lockfiles are present in parent directories.
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
  },
  transpilePackages: ["@hypercode/ui"],
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string> | undefined),
      "@": appSrcRoot,
    };

    return config;
  },
  serverExternalPackages: [
    "better-sqlite3",
    "hyperswarm",
    "onnxruntime-node",
    "@lancedb/lancedb",
    "@lancedb/lancedb-win32-x64-msvc",
    "udx-native",
    "vectordb",
    "sharp"
  ],
};

export default nextConfig;
