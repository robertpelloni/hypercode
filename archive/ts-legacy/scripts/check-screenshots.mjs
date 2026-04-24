#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const readmePath = resolve(root, 'README.md');

const requiredScreenshots = [
  'docs/screenshots/dashboard-home.png',
  'docs/screenshots/mcp-registry.png',
  'docs/screenshots/mcp-search.png',
  'docs/screenshots/mcp-inspector.png',
  'docs/screenshots/billing.png',
  'docs/screenshots/github-actions.png',
];

const strictMode = process.argv.includes('--strict');

const missing = requiredScreenshots.filter((relativePath) => !existsSync(resolve(root, relativePath)));

const readme = readFileSync(readmePath, 'utf8');
const missingReferences = requiredScreenshots.filter((relativePath) => !readme.includes(`\`${relativePath}\``));

if (missing.length === 0 && missingReferences.length === 0) {
  console.log('SCREENSHOTS_CHECK_OK');
  process.exit(0);
}

if (missing.length > 0) {
  console.error('Missing screenshot files:');
  for (const file of missing) {
    console.error(`  - ${file}`);
  }
}

if (missingReferences.length > 0) {
  console.error('README screenshot table is missing path references:');
  for (const file of missingReferences) {
    console.error(`  - ${file}`);
  }
  process.exit(1);
}

if (missing.length > 0 && strictMode) {
  process.exit(1);
}

if (missing.length > 0) {
  console.log('SCREENSHOTS_CHECK_WARN_MISSING (non-strict mode)');
  process.exit(0);
}
