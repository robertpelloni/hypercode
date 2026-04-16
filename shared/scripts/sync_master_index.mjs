import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const MASTER_INDEX_PATH = path.join(ROOT, 'HYPERCODE_MASTER_INDEX.jsonc');
const RESOURCES_LIST_PATH = path.join(ROOT, 'scripts', 'resources-list.json');
const INGESTION_STATUS_PATH = path.join(ROOT, 'scripts', 'ingestion-status.json');

const STATUS_TO_FETCH_STATE = {
  assimilated: 'processed',
  integrated_partial: 'processed',
  researched: 'processed',
  prioritized: 'pending',
  researching: 'pending',
  awaiting_ingest: 'pending',
  failed: 'failed'
};

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');

function stripJsonComments(content) {
  return content.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => (g ? '' : m));
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeUrl(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl).trim());
    parsed.hash = '';
    if (parsed.searchParams.has('utm_source')) parsed.searchParams.delete('utm_source');
    if (parsed.searchParams.has('utm_medium')) parsed.searchParams.delete('utm_medium');
    if (parsed.searchParams.has('utm_campaign')) parsed.searchParams.delete('utm_campaign');
    const cleanedPath = parsed.pathname.replace(/\/+$/, '');
    parsed.pathname = cleanedPath || '/';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return String(rawUrl).trim();
  }
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function toCategoryKey(value) {
  return slugify(value).replace(/-/g, '_') || 'uncategorized';
}

function deriveSource(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('github.com')) return 'github';
    if (host.includes('docs.')) return 'documentation';
    if (host.includes('reddit.com')) return 'community';
    if (host.includes('x.com') || host.includes('twitter.com')) return 'social';
    return host;
  } catch {
    return 'unknown';
  }
}

function deriveKind(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    if (host.includes('github.com')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 2 && !['blob', 'tree', 'pull', 'issues'].includes(parts[2])) return 'repo';
      if (pathname.includes('/blob/') || pathname.includes('/tree/')) return 'docs';
      return 'repo';
    }

    if (host.includes('docs.') || pathname.includes('/docs/')) return 'docs';
    if (host.includes('reddit.com') || host.includes('news.ycombinator.com')) return 'discussion';
    if (pathname.includes('/dashboard') || pathname.includes('/settings') || pathname.includes('/billing')) return 'dashboard';
    return 'web';
  } catch {
    return 'other';
  }
}

function deriveName(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (host === 'github.com' && parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    if (parts.length > 0) return `${host}/${parts.slice(0, 2).join('/')}`;
    return host;
  } catch {
    return url;
  }
}

function deriveId(url, existingId) {
  if (existingId && String(existingId).trim()) return String(existingId).trim();
  return slugify(deriveName(url));
}

function inferFetchStatus(status, current) {
  if (current && ['processed', 'pending', 'failed', 'skipped'].includes(current)) return current;
  return STATUS_TO_FETCH_STATE[status] || 'pending';
}

function mergeArrays(left, right) {
  return Array.from(new Set([...(left || []), ...(right || [])].filter(Boolean)));
}

async function readJsonFile(filePath, fallback) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

async function readMasterIndex() {
  const content = await fs.readFile(MASTER_INDEX_PATH, 'utf-8');
  return JSON.parse(stripJsonComments(content));
}

function buildCategoryMap(existingCategories) {
  const urlToCategory = new Map();
  const categories = isObject(existingCategories) ? existingCategories : {};

  for (const [categoryKey, items] of Object.entries(categories)) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (!item?.url) continue;
      urlToCategory.set(normalizeUrl(item.url), categoryKey);
    }
  }

  return urlToCategory;
}

function mergeExistingEntries(existingCategories) {
  const merged = new Map();
  const categories = isObject(existingCategories) ? existingCategories : {};

  for (const items of Object.values(categories)) {
    if (!Array.isArray(items)) continue;

    for (const item of items) {
      if (!item?.url) continue;
      const normalized = normalizeUrl(item.url);
      const previous = merged.get(normalized) || {};
      merged.set(normalized, {
        ...previous,
        ...item,
        normalized_url: normalized,
        tags: mergeArrays(previous.tags, item.tags),
        discovered_from: mergeArrays(previous.discovered_from, item.discovered_from)
      });
    }
  }

  return merged;
}

function upsertFromResourceList(entries, resourceList, categoryMap) {
  for (const group of resourceList) {
    const categoryKey = toCategoryKey(group.category || 'uncategorized');
    const links = Array.isArray(group.links) ? group.links : [];

    for (const url of links) {
      const normalized = normalizeUrl(url);
      const existing = entries.get(normalized) || {};
      const entry = {
        ...existing,
        id: deriveId(normalized, existing.id),
        name: existing.name || deriveName(normalized),
        url: normalized,
        summary: existing.summary || 'Pending triage from external corpus.',
        relevance: existing.relevance || 'Untriaged',
        status: existing.status || 'awaiting_ingest',
        normalized_url: normalized,
        source: existing.source || deriveSource(normalized),
        kind: existing.kind || deriveKind(normalized),
        tags: mergeArrays(existing.tags, [group.category]),
        discovered_from: mergeArrays(existing.discovered_from, ['scripts/resources-list.json']),
        discovered_at: existing.discovered_at || new Date().toISOString(),
        fetch_status: inferFetchStatus(existing.status, existing.fetch_status),
        fetch_error: existing.fetch_error || null,
        last_checked_at: existing.last_checked_at || null,
        processed_at: existing.processed_at || null
      };

      entries.set(normalized, entry);
      if (!categoryMap.has(normalized)) categoryMap.set(normalized, categoryKey);
    }
  }
}

function applyIngestionStatus(entries, ingestionStatus) {
  const nowIso = new Date().toISOString();

  const processed = Array.isArray(ingestionStatus?.processed) ? ingestionStatus.processed : [];
  const pending = Array.isArray(ingestionStatus?.pending) ? ingestionStatus.pending : [];
  const failed = Array.isArray(ingestionStatus?.failed) ? ingestionStatus.failed : [];

  for (const rawUrl of processed) {
    const normalized = normalizeUrl(rawUrl);
    const entry = entries.get(normalized);
    if (!entry) continue;

    entry.fetch_status = 'processed';
    entry.last_checked_at = nowIso;
    entry.processed_at = entry.processed_at || nowIso;
    if (entry.status === 'awaiting_ingest') entry.status = 'researched';
    entries.set(normalized, entry);
  }

  for (const rawUrl of pending) {
    const normalized = normalizeUrl(rawUrl);
    const entry = entries.get(normalized);
    if (!entry) continue;

    entry.fetch_status = 'pending';
    entry.last_checked_at = nowIso;
    if (!entry.status || entry.status === 'failed') entry.status = 'awaiting_ingest';
    entries.set(normalized, entry);
  }

  for (const failure of failed) {
    const normalized = normalizeUrl(failure?.url);
    if (!normalized) continue;

    const existing = entries.get(normalized) || {
      id: deriveId(normalized),
      name: deriveName(normalized),
      url: normalized,
      summary: 'Ingestion target that currently fails retrieval.',
      relevance: 'Untriaged',
      status: 'failed',
      normalized_url: normalized,
      source: deriveSource(normalized),
      kind: deriveKind(normalized),
      tags: ['ingestion-failure'],
      discovered_from: ['scripts/ingestion-status.json'],
      discovered_at: nowIso
    };

    const merged = {
      ...existing,
      fetch_status: 'failed',
      status: 'failed',
      fetch_error: failure?.error || existing.fetch_error || 'Unknown fetch failure',
      last_checked_at: failure?.last_attempt_at || nowIso,
      fetch_attempts: Number(failure?.attempts || existing.fetch_attempts || 1),
      discovered_from: mergeArrays(existing.discovered_from, ['scripts/ingestion-status.json'])
    };

    entries.set(normalized, merged);
  }
}

function buildCategories(entries, categoryMap) {
  const categories = {};

  for (const [normalized, entry] of entries.entries()) {
    const categoryKey = categoryMap.get(normalized) || toCategoryKey(entry.category || 'uncategorized');
    if (!categories[categoryKey]) categories[categoryKey] = [];

    categories[categoryKey].push({
      id: entry.id,
      name: entry.name,
      url: entry.url,
      summary: entry.summary,
      relevance: entry.relevance,
      status: entry.status,
      source: entry.source,
      kind: entry.kind,
      tags: entry.tags || [],
      normalized_url: entry.normalized_url,
      discovered_from: entry.discovered_from || [],
      discovered_at: entry.discovered_at || null,
      fetch_status: inferFetchStatus(entry.status, entry.fetch_status),
      fetch_error: entry.fetch_error || null,
      fetch_attempts: entry.fetch_attempts || 0,
      last_checked_at: entry.last_checked_at || null,
      processed_at: entry.processed_at || null
    });
  }

  for (const key of Object.keys(categories)) {
    categories[key].sort((a, b) => a.name.localeCompare(b.name));
  }

  return categories;
}

function computeStats(entries) {
  let processed = 0;
  let pending = 0;
  let failed = 0;
  let submodules = 0;

  for (const entry of entries.values()) {
    const fetchStatus = inferFetchStatus(entry.status, entry.fetch_status);
    if (fetchStatus === 'processed') processed += 1;
    else if (fetchStatus === 'failed') failed += 1;
    else pending += 1;

    if (entry.path && String(entry.path).includes('external/')) submodules += 1;
  }

  return {
    total_links: entries.size,
    processed,
    pending,
    failed,
    submodules
  };
}

async function main() {
  const [masterIndex, resourcesList, ingestionStatus] = await Promise.all([
    readMasterIndex(),
    readJsonFile(RESOURCES_LIST_PATH, []),
    readJsonFile(INGESTION_STATUS_PATH, { processed: [], pending: [], failed: [] })
  ]);

  const categoryMap = buildCategoryMap(masterIndex.categories);
  const entries = mergeExistingEntries(masterIndex.categories);

  upsertFromResourceList(entries, Array.isArray(resourcesList) ? resourcesList : [], categoryMap);
  applyIngestionStatus(entries, ingestionStatus);

  const categories = buildCategories(entries, categoryMap);
  const stats = computeStats(entries);

  const output = {
    version: '2.0.0',
    schema: 'hypercode-master-index/v2',
    last_updated: new Date().toISOString().slice(0, 10),
    stats,
    ingestion: {
      updated_at: new Date().toISOString(),
      sources: [
        {
          file: 'scripts/resources-list.json',
          link_count: Array.isArray(resourcesList)
            ? resourcesList.reduce((acc, group) => acc + (Array.isArray(group.links) ? group.links.length : 0), 0)
            : 0
        },
        {
          file: 'scripts/ingestion-status.json',
          failed_count: Array.isArray(ingestionStatus?.failed) ? ingestionStatus.failed.length : 0
        }
      ],
      queue: {
        processed: stats.processed,
        pending: stats.pending,
        failed: stats.failed
      }
    },
    categories
  };

  if (dryRun) {
    console.log('[sync_master_index] Dry run complete');
    console.log(JSON.stringify({
      total_links: stats.total_links,
      processed: stats.processed,
      pending: stats.pending,
      failed: stats.failed,
      category_count: Object.keys(categories).length
    }, null, 2));
    return;
  }

  await fs.writeFile(MASTER_INDEX_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf-8');
  console.log(`[sync_master_index] Updated ${MASTER_INDEX_PATH}`);
  console.log(`[sync_master_index] Links: ${stats.total_links} | processed=${stats.processed} pending=${stats.pending} failed=${stats.failed}`);
}

main().catch((error) => {
  console.error('[sync_master_index] Failed:', error);
  process.exitCode = 1;
});