#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const readmePath = resolve(root, 'README.md');
const checkOnly = process.argv.includes('--check');

const tableRows = [
  { label: 'Dashboard Home', path: 'docs/screenshots/dashboard-home.png' },
  { label: 'MCP Registry', path: 'docs/screenshots/mcp-registry.png' },
  { label: 'MCP Search', path: 'docs/screenshots/mcp-search.png' },
  { label: 'MCP Inspector', path: 'docs/screenshots/mcp-inspector.png' },
  { label: 'Billing', path: 'docs/screenshots/billing.png' },
  { label: 'GitHub Actions', path: 'docs/screenshots/github-actions.png' },
];

let readme = readFileSync(readmePath, 'utf8');
const eol = readme.includes('\r\n') ? '\r\n' : '\n';
const lines = readme.split(/\r?\n/);

for (const row of tableRows) {
  const hasImage = existsSync(resolve(root, row.path));
  const status = hasImage ? '✅ Added' : '⬜ Add';
  const prefix = `| ${row.label} | \`${row.path}\` |`;
  const nextLine = `| ${row.label} | \`${row.path}\` | ${status} |`;

  const lineIndex = lines.findIndex((line) => line.startsWith(prefix));
  if (lineIndex === -1) {
    console.error(`Missing expected screenshot table row for: ${row.label}`);
    process.exit(1);
  }

  lines[lineIndex] = nextLine;
}

readme = lines.join(eol);
const original = readFileSync(readmePath, 'utf8');

if (checkOnly) {
  if (original === readme) {
    console.log('SCREENSHOT_STATUS_SYNC_CHECK_OK');
    process.exit(0);
  }

  console.error('SCREENSHOT_STATUS_SYNC_CHECK_FAILED');
  console.error('Run: pnpm run sync:screenshot-status');
  process.exit(1);
}

writeFileSync(readmePath, readme, 'utf8');
console.log('SCREENSHOT_STATUS_SYNC_OK');
