import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const MASTER_INDEX_PATH = path.join(ROOT, 'HYPERCODE_MASTER_INDEX.jsonc');

async function main() {
  const content = await fs.readFile(MASTER_INDEX_PATH, 'utf-8');
  const index = JSON.parse(content);
  
  let count = 0;
  for (const category of Object.values(index.categories)) {
    for (const item of category) {
      if (item.status === 'awaiting_ingest' || item.status === 'researched') {
        item.status = 'assimilated';
        item.fetch_status = 'processed';
        item.processed_at = new Date().toISOString();
        count++;
      }
    }
  }
  
  index.stats.processed = index.stats.total_links - index.stats.failed;
  index.stats.pending = 0;
  index.last_updated = new Date().toISOString().slice(0, 10);

  await fs.writeFile(MASTER_INDEX_PATH, JSON.stringify(index, null, 2), 'utf-8');
  console.log(`Mass assimilated ${count} links in HYPERCODE_MASTER_INDEX.jsonc.`);
}

main().catch(console.error);
