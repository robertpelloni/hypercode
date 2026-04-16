#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const args = new Set(process.argv.slice(2));
const profile = args.has('--profile=workspace') || args.has('--workspace')
  ? 'workspace'
  : 'go-primary';

const EXIT_READY = 0;
const EXIT_INSTALL_REQUIRED = 10;

function info(message) {
  console.log(`[startup-install-check] ${message}`);
}

function needsInstall(message) {
  info(message);
  process.exit(EXIT_INSTALL_REQUIRED);
}

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    needsInstall(`${label} is missing (${path.relative(repoRoot, filePath)}).`);
  }
}

function ensureResolvable(request, fromDirectory) {
  try {
    require.resolve(request, { paths: [fromDirectory] });
  } catch {
    needsInstall(`Dependency ${request} is not currently resolvable from ${path.relative(repoRoot, fromDirectory)}.`);
  }
}

function ensureLockNotNewerThanModules() {
  const lockPath = path.join(repoRoot, 'pnpm-lock.yaml');
  const modulesStatePath = path.join(repoRoot, 'node_modules', '.modules.yaml');

  ensureFile(lockPath, 'pnpm lockfile');
  ensureFile(modulesStatePath, 'pnpm modules state');

  const lockStat = fs.statSync(lockPath);
  const modulesStat = fs.statSync(modulesStatePath);
  if (lockStat.mtimeMs > modulesStat.mtimeMs + 1) {
    needsInstall('pnpm-lock.yaml is newer than node_modules/.modules.yaml; install is required to sync workspace dependencies.');
  }
}

function runGoPrimaryChecks() {
  ensureFile(path.join(repoRoot, 'node_modules', '.modules.yaml'), 'pnpm modules state');
  ensureFile(path.join(repoRoot, 'packages', 'cli', 'tsconfig.json'), 'CLI tsconfig');
  ensureFile(path.join(repoRoot, 'go', 'go.mod'), 'Go module file');
  ensureFile(path.join(repoRoot, 'go', 'cmd', 'hypercode', 'main.go'), 'Go control-plane entrypoint');
  ensureLockNotNewerThanModules();

  const cliRoot = path.join(repoRoot, 'packages', 'cli');
  ensureResolvable('typescript/package.json', cliRoot);
  ensureResolvable('commander', cliRoot);
  ensureResolvable('chalk', cliRoot);

  info('Go-primary startup dependencies already look ready; install can be skipped.');
  process.exit(EXIT_READY);
}

function runWorkspaceChecks() {
  needsInstall('Workspace profile requires a full install pass by default.');
}

if (profile === 'workspace') {
  runWorkspaceChecks();
} else {
  runGoPrimaryChecks();
}
