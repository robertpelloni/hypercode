#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const profile = args.has('--profile=workspace') || args.has('--workspace')
  ? 'workspace'
  : 'go-primary';

const EXIT_READY = 0;
const EXIT_BUILD_REQUIRED = 20;

function info(message) {
  console.log(`[startup-build-check] ${message}`);
}

function needsBuild(message) {
  info(message);
  process.exit(EXIT_BUILD_REQUIRED);
}

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    needsBuild(`${label} is missing (${path.relative(repoRoot, filePath)}).`);
  }
}

function getMtime(filePath) {
  return fs.statSync(filePath).mtimeMs;
}

function getNewestMtime(rootPath, options = {}) {
  const {
    include = () => true,
    excludeDirs = new Set(['node_modules', 'dist', 'build', '.git', '.turbo', '.next']),
  } = options;

  if (!fs.existsSync(rootPath)) {
    return 0;
  }

  const stat = fs.statSync(rootPath);
  if (!stat.isDirectory()) {
    return include(rootPath) ? stat.mtimeMs : 0;
  }

  let newest = 0;
  const entries = fs.readdirSync(rootPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      if (excludeDirs.has(entry.name)) {
        continue;
      }
      newest = Math.max(newest, getNewestMtime(fullPath, options));
      continue;
    }

    if (!include(fullPath)) {
      continue;
    }

    newest = Math.max(newest, fs.statSync(fullPath).mtimeMs);
  }

  return newest;
}

function runGoPrimaryChecks() {
  if (process.env.HYPERCODE_STARTUP_BUILD_WEB === '1') {
    needsBuild('HYPERCODE_STARTUP_BUILD_WEB=1 requests additional dashboard validation, so the Go-primary build step must run.');
  }

  const cliEntry = path.join(repoRoot, 'packages', 'cli', 'dist', 'cli', 'src', 'index.js');
  const cliRoot = path.join(repoRoot, 'packages', 'cli');
  const goBinary = process.platform === 'win32'
    ? path.join(repoRoot, 'go', 'hypercode.exe')
    : path.join(repoRoot, 'go', 'hypercode');
  const goRoot = path.join(repoRoot, 'go');

  ensureFile(cliEntry, 'Built CLI entrypoint');
  ensureFile(goBinary, 'Built Go control-plane binary');

  const newestCliInput = Math.max(
    getNewestMtime(path.join(cliRoot, 'src'), {
      include: (filePath) => /\.(?:ts|tsx|js|mjs|cjs|json)$/i.test(filePath),
    }),
    getMtime(path.join(cliRoot, 'package.json')),
    getMtime(path.join(cliRoot, 'tsconfig.json')),
  );

  const cliArtifactTime = getMtime(cliEntry);
  if (newestCliInput > cliArtifactTime + 1) {
    needsBuild('CLI sources are newer than the built CLI entrypoint; Go-primary startup build is required.');
  }

  const newestGoInput = Math.max(
    getNewestMtime(path.join(goRoot, 'cmd'), {
      include: (filePath) => /\.(?:go|mod|sum)$/i.test(filePath),
      excludeDirs: new Set(['node_modules', '.git']),
    }),
    getNewestMtime(path.join(goRoot, 'internal'), {
      include: (filePath) => /\.(?:go|mod|sum)$/i.test(filePath),
      excludeDirs: new Set(['node_modules', '.git']),
    }),
    getMtime(path.join(goRoot, 'go.mod')),
    getMtime(path.join(goRoot, 'go.sum')),
  );

  const goArtifactTime = getMtime(goBinary);
  if (newestGoInput > goArtifactTime + 1) {
    needsBuild('Go sources are newer than the built Go control-plane binary; Go-primary startup build is required.');
  }

  info('Go-primary startup build artifacts already look current; build can be skipped.');
  process.exit(EXIT_READY);
}

function runWorkspaceChecks() {
  needsBuild('Workspace profile requires a full build pass by default.');
}

if (profile === 'workspace') {
  runWorkspaceChecks();
} else {
  runGoPrimaryChecks();
}
