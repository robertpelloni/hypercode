#!/usr/bin/env node
/**
 * check_submodule_versions.mjs
 *
 * Enumerates all Git submodules, extracts their current commit, version tag,
 * commit date, and upstream status. Outputs a JSON report to
 * docs/SUBMODULE_VERSIONS.json suitable for consumption by the Hypercode dashboard.
 *
 * Usage:
 *   node scripts/check_submodule_versions.mjs [--update] [--json]
 *
 * Flags:
 *   --update  Run `git submodule update --remote` before checking (pulls latest).
 *   --json    Output raw JSON to stdout instead of a formatted table.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(ROOT, 'docs', 'SUBMODULE_VERSIONS.json');

const args = process.argv.slice(2);
const doUpdate = args.includes('--update');
const jsonOnly = args.includes('--json');

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf-8', ...opts }).trim();
  } catch {
    return '';
  }
}

function categorize(subPath) {
  if (subPath.startsWith('external/agents_repos')) return 'Agent';
  if (subPath.startsWith('external/auth')) return 'Auth';
  if (subPath.startsWith('external/config_repos')) return 'Config';
  if (subPath.startsWith('external/misc')) return 'Misc';
  if (subPath.startsWith('external/plugins')) return 'Plugin';
  if (subPath.startsWith('external/research')) return 'Research';
  if (subPath.startsWith('external/skills_repos')) return 'Skill';
  if (subPath.startsWith('external/tools')) return 'Tool';
  if (subPath.startsWith('external/web_repos')) return 'Web';
  if (subPath.startsWith('references')) return 'Reference';
  if (subPath.startsWith('archive')) return 'Archive';
  if (subPath.startsWith('packages')) return 'Package';
  if (subPath.startsWith('submodules')) return 'Core';
  return 'Other';
}

// ── Main ──────────────────────────────────────────────

if (doUpdate) {
  console.log('⬆ Pulling latest submodule commits...');
  run('git submodule update --remote');
}

console.log('🔍 Scanning submodules...\n');

const statusOutput = run('git submodule status');
if (!statusOutput) {
  console.log('No submodules found.');
  process.exit(0);
}

const lines = statusOutput.split('\n').filter(Boolean);
const results = [];

for (const line of lines) {
  const match = line.trim().match(/^([+\-U]?)([0-9a-f]+)\s+(.*?)(\s+\(.*\))?$/);
  if (!match) continue;

  const prefix = match[1]; // + = out of date, - = not initialized, U = merge conflict
  const sha = match[2];
  const subPath = match[3];
  const tagLabel = match[4] ? match[4].trim().replace(/[()]/g, '') : null;
  const name = path.basename(subPath);
  const fullPath = path.join(ROOT, subPath);

  let commitDate = null;
  let commitMessage = null;
  let localBranch = null;
  let behindAhead = null;

  if (fs.existsSync(fullPath)) {
    commitDate = run(`git -C "${fullPath}" show -s --format=%ci HEAD`);
    commitMessage = run(`git -C "${fullPath}" show -s --format=%s HEAD`);
    localBranch = run(`git -C "${fullPath}" rev-parse --abbrev-ref HEAD`);

    // Check if tracking branch exists and compare
    const trackingBranch = run(`git -C "${fullPath}" rev-parse --abbrev-ref @{u} 2>/dev/null`);
    if (trackingBranch) {
      const behind = run(`git -C "${fullPath}" rev-list --count HEAD..@{u}`);
      const ahead = run(`git -C "${fullPath}" rev-list --count @{u}..HEAD`);
      behindAhead = { behind: parseInt(behind) || 0, ahead: parseInt(ahead) || 0 };
    }
  }

  let status = 'ok';
  if (prefix === '+') status = 'modified';
  else if (prefix === '-') status = 'not-initialized';
  else if (prefix === 'U') status = 'conflict';

  results.push({
    name,
    path: subPath,
    category: categorize(subPath),
    sha: sha.substring(0, 12),
    version: tagLabel || null,
    branch: localBranch || null,
    commitDate: commitDate || null,
    lastCommit: commitMessage || null,
    status,
    behindAhead,
  });
}

// Generate the report
const report = {
  generatedAt: new Date().toISOString(),
  totalSubmodules: results.length,
  byStatus: {
    ok: results.filter(r => r.status === 'ok').length,
    modified: results.filter(r => r.status === 'modified').length,
    notInitialized: results.filter(r => r.status === 'not-initialized').length,
    conflict: results.filter(r => r.status === 'conflict').length,
  },
  byCategory: {},
  submodules: results,
};

for (const r of results) {
  report.byCategory[r.category] = (report.byCategory[r.category] || 0) + 1;
}

// Ensure docs/ exists
fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));

if (jsonOnly) {
  console.log(JSON.stringify(report, null, 2));
} else {
  // Pretty table output
  console.log(`📦 ${results.length} submodules found\n`);
  console.log('┌' + '─'.repeat(24) + '┬' + '─'.repeat(12) + '┬' + '─'.repeat(16) + '┬' + '─'.repeat(14) + '┬' + '─'.repeat(12) + '┐');
  console.log('│ ' + 'Name'.padEnd(22) + ' │ ' + 'Category'.padEnd(10) + ' │ ' + 'Version'.padEnd(14) + ' │ ' + 'Status'.padEnd(12) + ' │ ' + 'SHA'.padEnd(10) + ' │');
  console.log('├' + '─'.repeat(24) + '┼' + '─'.repeat(12) + '┼' + '─'.repeat(16) + '┼' + '─'.repeat(14) + '┼' + '─'.repeat(12) + '┤');

  for (const r of results) {
    const ver = (r.version || r.branch || '-').substring(0, 14);
    const stat = r.status === 'ok' ? '✅ ok' : r.status === 'modified' ? '⚠️ modified' : r.status;
    console.log(
      '│ ' + r.name.substring(0, 22).padEnd(22) +
      ' │ ' + r.category.padEnd(10) +
      ' │ ' + ver.padEnd(14) +
      ' │ ' + stat.padEnd(12) +
      ' │ ' + r.sha.padEnd(10) +
      ' │'
    );
  }

  console.log('└' + '─'.repeat(24) + '┴' + '─'.repeat(12) + '┴' + '─'.repeat(16) + '┴' + '─'.repeat(14) + '┴' + '─'.repeat(12) + '┘');
  console.log(`\n📄 Report written to ${path.relative(ROOT, OUTPUT_PATH)}`);
}
