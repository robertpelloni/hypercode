import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const STATUS_PATH = path.join(ROOT, 'scripts', 'ingestion-status.json');

function parseArgs(argv) {
  const parsed = {
    status: '',
    url: '',
    error: '',
    source: 'manual',
    sync: false,
    attempts: undefined
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--status') parsed.status = argv[i + 1] || '';
    if (arg === '--url') parsed.url = argv[i + 1] || '';
    if (arg === '--error') parsed.error = argv[i + 1] || '';
    if (arg === '--source') parsed.source = argv[i + 1] || 'manual';
    if (arg === '--attempts') parsed.attempts = Number(argv[i + 1] || '1');
    if (arg === '--sync') parsed.sync = true;
  }

  return parsed;
}

function normalizeUrl(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl).trim());
    parsed.hash = '';
    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    parsed.pathname = cleanPath || '/';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return String(rawUrl).trim();
  }
}

async function readStatusFile() {
  try {
    const content = await fs.readFile(STATUS_PATH, 'utf-8');
    const parsed = JSON.parse(content);
    return {
      processed: Array.isArray(parsed?.processed) ? parsed.processed : [],
      pending: Array.isArray(parsed?.pending) ? parsed.pending : [],
      failed: Array.isArray(parsed?.failed) ? parsed.failed : []
    };
  } catch {
    return { processed: [], pending: [], failed: [] };
  }
}

function removeUrlFromLists(statusDoc, normalizedUrl) {
  statusDoc.processed = statusDoc.processed.filter((u) => normalizeUrl(u) !== normalizedUrl);
  statusDoc.pending = statusDoc.pending.filter((u) => normalizeUrl(u) !== normalizedUrl);
  statusDoc.failed = statusDoc.failed.filter((item) => normalizeUrl(item?.url || '') !== normalizedUrl);
}

async function writeStatusFile(statusDoc) {
  await fs.writeFile(STATUS_PATH, `${JSON.stringify(statusDoc, null, 2)}\n`, 'utf-8');
}

async function runSync() {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['scripts/sync_master_index.mjs'], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`sync_master_index exited with code ${code}`));
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const normalizedUrl = normalizeUrl(args.url);
  const status = String(args.status || '').toLowerCase();

  if (!normalizedUrl || !['processed', 'pending', 'failed'].includes(status)) {
    console.error('Usage: node scripts/update_ingestion_status.mjs --status <processed|pending|failed> --url <url> [--error <msg>] [--source <source>] [--attempts <n>] [--sync]');
    process.exitCode = 1;
    return;
  }

  const statusDoc = await readStatusFile();
  removeUrlFromLists(statusDoc, normalizedUrl);

  if (status === 'processed') {
    statusDoc.processed.push(normalizedUrl);
  } else if (status === 'pending') {
    statusDoc.pending.push(normalizedUrl);
  } else {
    statusDoc.failed.push({
      url: normalizedUrl,
      error: args.error || 'Unknown fetch failure',
      source: args.source || 'manual',
      attempts: Number.isFinite(args.attempts) ? Number(args.attempts) : 1,
      last_attempt_at: new Date().toISOString()
    });
  }

  await writeStatusFile(statusDoc);
  console.log(`[update_ingestion_status] Marked ${normalizedUrl} as ${status}`);

  if (args.sync) {
    await runSync();
  }
}

main().catch((error) => {
  console.error('[update_ingestion_status] Failed:', error);
  process.exitCode = 1;
});