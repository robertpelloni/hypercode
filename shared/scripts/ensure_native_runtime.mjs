#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

function log(message) {
  console.log(`[native-preflight] ${message}`);
}

function warn(message) {
  console.warn(`[native-preflight] ${message}`);
}

function fail(message) {
  console.error(`[native-preflight] ${message}`);
}

function run(command, args, cwd = repoRoot) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });

  return (result.status ?? 1) === 0;
}

function resolveWorkspacePackage(request, fromDirectory) {
  return require.resolve(request, { paths: [fromDirectory] });
}

function isKnownBetterSqliteNode24Failure(reason) {
  return typeof reason === 'string'
    && process.platform === 'win32'
    && Number(process.versions.node.split('.')[0] ?? '0') >= 24
    && reason.includes('Could not locate the bindings file');
}

function ensureBetterSqlite3() {
  function probeBetterSqlite3() {
    const Database = require('better-sqlite3');
    const db = new Database(':memory:');
    db.close();
  }

  try {
    probeBetterSqlite3();
    log('better-sqlite3 is ready for the current Node runtime.');
    return true;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (isKnownBetterSqliteNode24Failure(reason)) {
      warn(`better-sqlite3 is not usable for Node ${process.versions.node} in this workspace (${reason}).`);
      warn('Skipping automatic better-sqlite3 rebuild because this Node 24 Windows failure is a known non-blocking startup issue for the HyperCode Hub; Maestro/native SQLite features may remain unavailable until rebuilt in a compatible environment.');
      return true;
    }
    warn(`better-sqlite3 is missing or not usable for Node ${process.versions.node}; rebuilding... (${reason})`);
  }

  if (!run('pnpm', ['rebuild', 'better-sqlite3'])) {
    fail('better-sqlite3 rebuild failed.');
    return false;
  }

  try {
    probeBetterSqlite3();
    log('better-sqlite3 rebuild succeeded.');
    return true;
  } catch (error) {
    fail(`better-sqlite3 still failed to load after rebuild: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

function ensureElectronRuntime() {
  let packageJsonPath;

  try {
    packageJsonPath = resolveWorkspacePackage('electron/package.json', path.join(repoRoot, 'apps', 'maestro'));
  } catch (error) {
    warn('Electron is not currently resolvable from apps\\maestro; skipping Maestro runtime repair.');
    return true;
  }

  const electronDir = path.dirname(packageJsonPath);
  const electronBinary = process.platform === 'win32'
    ? path.join(electronDir, 'dist', 'electron.exe')
    : path.join(electronDir, 'dist', 'electron');

  if (fs.existsSync(electronBinary)) {
    log('Electron runtime is present for Maestro.');
    return true;
  }

  warn('Electron runtime is missing for Maestro; running the Electron package installer...');

  if (!run(process.execPath, ['install.js'], electronDir)) {
    warn('Electron package installer failed. HyperCode Hub can still start, but Maestro may not launch.');
    return true;
  }

  if (fs.existsSync(electronBinary)) {
    log('Electron runtime install succeeded.');
    return true;
  }

  warn('Electron package installer completed, but the runtime binary is still missing. HyperCode Hub can still start, but Maestro may not launch.');
  return true;
}

const sqliteReady = ensureBetterSqlite3();
const electronReady = ensureElectronRuntime();

if (!electronReady) {
  warn('Maestro runtime preflight completed with warnings.');
}

if (!sqliteReady) {
  process.exit(1);
}
