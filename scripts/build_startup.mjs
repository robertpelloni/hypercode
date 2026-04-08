#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const goCommand = process.platform === 'win32' ? 'go.exe' : 'go';

const args = new Set(process.argv.slice(2));
const profile = args.has('--profile=workspace') || args.has('--workspace')
  ? 'workspace'
  : 'go-primary';

function printStep(message) {
  console.log(`\n[startup-build] ${message}`);
}

function fail(message, result) {
  const details = result
    ? [
        result.error ? `error=${String(result.error)}` : null,
        typeof result.status === 'number' ? `status=${result.status}` : null,
        result.signal ? `signal=${result.signal}` : null,
      ].filter(Boolean).join(' ')
    : '';
  throw new Error(details ? `${message} (${details})` : message);
}

function run(command, commandArgs, options = {}) {
  return spawnSync(command, commandArgs, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
    env: process.env,
    ...options,
  });
}

function runPnpm(commandArgs, options = {}) {
  const direct = run(pnpmCommand, commandArgs, options);
  if (!direct.error) {
    return direct;
  }

  return spawnSync(`pnpm ${commandArgs.join(' ')}`, [], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: true,
    env: process.env,
    ...options,
  });
}

function runWorkspaceBuild() {
  printStep('Running full workspace build for Node compatibility surfaces...');
  const result = runPnpm(['run', 'build:workspace']);
  if ((result.status ?? 1) !== 0) {
    fail('Workspace startup build failed', result);
  }
}

function runGoPrimaryBuild() {
  printStep('Running Go-primary startup build (Go control plane + CLI)...');

  const cliBuild = runPnpm(['-C', 'packages/cli', 'run', 'build']);
  if ((cliBuild.status ?? 1) !== 0) {
    fail('CLI startup build failed', cliBuild);
  }

  const goBuild = run(goCommand, ['build', '-buildvcs=false', './cmd/hypercode'], {
    cwd: path.join(repoRoot, 'go'),
  });
  if ((goBuild.status ?? 1) !== 0) {
    fail('Go control-plane build failed', goBuild);
  }

  if (process.env.HYPERCODE_STARTUP_BUILD_WEB === '1') {
    printStep('HYPERCODE_STARTUP_BUILD_WEB=1 set; validating web dashboard build too...');
    const webBuild = runPnpm(['-C', 'apps/web', 'run', 'build']);
    if ((webBuild.status ?? 1) !== 0) {
      fail('Web dashboard startup build failed', webBuild);
    }
  } else {
    printStep('Skipping dashboard/web build in Go-primary startup mode. Set HYPERCODE_STARTUP_BUILD_WEB=1 to include it.');
  }
}

try {
  if (profile === 'workspace') {
    runWorkspaceBuild();
  } else {
    runGoPrimaryBuild();
  }

  printStep(`Startup build completed successfully for profile: ${profile}`);
} catch (error) {
  console.error(`\n[startup-build] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
