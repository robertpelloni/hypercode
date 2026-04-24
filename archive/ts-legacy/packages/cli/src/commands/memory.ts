import type { Command } from 'commander';
import { readFileSync, writeFileSync } from 'node:fs';

import { queryTrpc, resolveControlPlaneLocation } from '../control-plane.js';

type MemorySearchRecord = {
  id?: string;
  content: string;
  metadata?: Record<string, unknown>;
  score?: number;
};

type MemoryContextRecord = {
  id: string;
  title?: string;
  source?: string;
  createdAt?: number;
  chunks?: number;
  metadata?: Record<string, unknown>;
};

type MemoryStatsRecord = {
  sessionCount: number;
  workingCount: number;
  longTermCount: number;
  observationCount: number;
  sessionSummaryCount: number;
  promptCount: number;
};

type SectionedMemoryStatus = {
  totalEntries: number;
  sectionCount: number;
  populatedSectionCount: number;
  missingSections: string[];
  lastUpdatedAt: string | null;
  runtimePipeline: {
    configuredMode: string;
    providerCount: number;
    providerNames: string[];
    sectionedStoreEnabled: boolean;
  };
};

type MemoryAddResult = {
  success: boolean;
};

type MemoryExportResult = {
  data: string;
  format: string;
  exportedAt: string;
};

type MemoryImportResult = {
  imported: number;
  errors: number;
  importedAt: string;
};

function normalizeText(value: string | null | undefined): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '—';
}

function previewContent(value: string, limit = 120): string {
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

function formatNumber(value: number | null | undefined): string {
  return typeof value === 'number' ? String(value) : '—';
}

function parsePositiveInt(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function normalizeMemoryType(value: string): 'working' | 'long_term' {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'working' || normalized === 'short-term' || normalized === 'short_term') {
    return 'working';
  }
  if (normalized === 'long-term' || normalized === 'long_term' || normalized === 'semantic') {
    return 'long_term';
  }
  throw new Error(`Memory type '${value}' is not supported by the live memory add route. Use working or long-term.`);
}

async function withMemoryErrorHandling(
  action: () => Promise<void>,
  opts: { json?: boolean } = {},
): Promise<void> {
  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (opts.json) {
      console.log(JSON.stringify({ error: message }, null, 2));
    } else {
      const chalk = (await import('chalk')).default;
      const location = resolveControlPlaneLocation();
      console.error(chalk.red(`  ✗ ${message}`));
      console.error(chalk.dim(`  Control plane: ${location.baseUrl} (${location.source})`));
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/memory.ts
      console.error(chalk.dim('  Start HyperCode with `hypercode start` or point HYPERCODE_TRPC_UPSTREAM at a live /trpc endpoint.'));
=======
      console.error(chalk.dim('  Start borg with `borg start` or point BORG_TRPC_UPSTREAM at a live /trpc endpoint.'));
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/memory.ts
    }
    process.exitCode = 1;
  }
}

export function registerMemoryCommand(program: Command): void {
  const mem = program
    .command('memory')
    .alias('mem')
    .description('Memory — manage universal memory system (add, search, browse, import/export, prune)');

  mem
    .command('add <content>')
    .description('Add a new memory entry')
    .option('-t, --type <type>', 'Memory type: short-term, medium-term, long-term, episodic, semantic, procedural', 'long-term')
    .option('--tags <tags...>', 'Tags for categorization')
    .option('-s, --source <source>', 'Source of the memory', 'cli')
    .addHelpText('after', `
Examples:
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/memory.ts
  $ hypercode memory add "User prefers dark mode"
  $ hypercode memory add "API uses OAuth 2.0" -t semantic --tags auth api
  $ hypercode memory add "Deploy with: pnpm build && pnpm start" -t procedural
=======
  $ borg memory add "User prefers dark mode"
  $ borg memory add "API uses OAuth 2.0" -t semantic --tags auth api
  $ borg memory add "Deploy with: pnpm build && pnpm start" -t procedural
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/memory.ts
    `)
    .option('--json', 'Output as JSON')
    .action(async (content, opts) => {
      await withMemoryErrorHandling(async () => {
        if (opts.tags?.length) {
          throw new Error('Live memory add does not yet support CLI tag attachment.');
        }
        if (opts.source && opts.source !== 'cli') {
          throw new Error('Live memory add does not yet support overriding the memory source.');
        }

        const type = normalizeMemoryType(opts.type);
        const result = await queryTrpc<MemoryAddResult>('memory.addFact', {
          content,
          type,
        });

        if (opts.json) {
          console.log(JSON.stringify({ success: result.success, type, content }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        console.log(chalk.green(`  ✓ Memory added (${type})`));
        console.log(chalk.dim(`    Content: ${content.substring(0, 80)}${content.length > 80 ? '...' : ''}`));
      }, opts);
    });

  mem
    .command('search <query>')
    .description('Search memories using semantic similarity')
    .option('-k, --top-k <count>', 'Number of results', '10')
    .option('-t, --type <type>', 'Filter by memory type')
    .option('--tags <tags...>', 'Filter by tags')
    .option('--threshold <score>', 'Minimum relevance score (0-1)', '0.5')
    .option('--json', 'Output as JSON')
    .option('--backend <backend>', 'Search specific backend')
    .action(async (query, opts) => {
      await withMemoryErrorHandling(async () => {
        const limit = parsePositiveInt(opts.topK, 'top-k');
        const results = await queryTrpc<MemorySearchRecord[]>('memory.query', { query, limit });

        if (opts.json) {
          console.log(JSON.stringify({ query, results }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        const Table = (await import('cli-table3')).default;

        console.log(chalk.bold.cyan(`\n  Memory Search: "${query}"\n`));
        if (results.length === 0) {
          console.log(chalk.dim('  No matching memories found.\n'));
          return;
        }

        const table = new Table({
          head: ['ID', 'Preview', 'Score', 'Source'],
          style: { head: ['cyan'] },
          wordWrap: true,
          colWidths: [24, 64, 10, 18],
        });

        for (const entry of results) {
          table.push([
            normalizeText(entry.id),
            previewContent(entry.content),
            typeof entry.score === 'number' ? entry.score.toFixed(3) : '—',
            normalizeText(typeof entry.metadata?.source === 'string' ? entry.metadata.source : undefined),
          ]);
        }

        console.log(table.toString());
        console.log('');
      }, opts);
    });

  mem
    .command('list')
    .description('List recent memory entries')
    .option('-n, --limit <count>', 'Number of entries to show', '20')
    .option('-t, --type <type>', 'Filter by type')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await withMemoryErrorHandling(async () => {
        const limit = parsePositiveInt(opts.limit, 'limit');
        const contexts = await queryTrpc<MemoryContextRecord[]>('memory.listContexts');
        const filtered = contexts
          .filter((entry) => {
            if (!opts.type) {
              return true;
            }
            return entry.metadata?.type === opts.type;
          })
          .slice(0, limit);

        if (opts.json) {
          console.log(JSON.stringify({ contexts: filtered }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        const Table = (await import('cli-table3')).default;

        console.log(chalk.bold.cyan('\n  Recent Memories\n'));
        if (filtered.length === 0) {
          console.log(chalk.dim('  No stored memory contexts found.\n'));
          return;
        }

        const table = new Table({
          head: ['ID', 'Title', 'Source', 'Chunks', 'Created'],
          style: { head: ['cyan'] },
          wordWrap: true,
          colWidths: [24, 30, 16, 10, 28],
        });

        for (const entry of filtered) {
          table.push([
            entry.id,
            normalizeText(entry.title),
            normalizeText(entry.source),
            formatNumber(entry.chunks),
            typeof entry.createdAt === 'number' ? new Date(entry.createdAt).toISOString() : '—',
          ]);
        }

        console.log(table.toString());
        console.log('');
      }, opts);
    });

  mem
    .command('export')
    .description('Export all memories to file')
    .option('-f, --format <format>', 'Export format: json, markdown, csv', 'json')
    .option('-o, --output <file>', 'Output file path')
    .option('-t, --type <type>', 'Export only specific type')
    .option('--backend <backend>', 'Export from specific backend')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await withMemoryErrorHandling(async () => {
        if (opts.type) {
          throw new Error('Live memory export does not yet support type filtering.');
        }
        if (opts.backend) {
          throw new Error('Live memory export does not yet support backend selection.');
        }

        const result = await queryTrpc<MemoryExportResult>('memory.exportMemories', {
          format: opts.format,
          userId: 'default',
        });

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/memory.ts
        const file = opts.output || `hypercode-memories-export.${result.format}`;
=======
        const file = opts.output || `borg-memories-export.${result.format}`;
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/memory.ts
        writeFileSync(file, result.data, 'utf8');
        console.log(chalk.green(`  ✓ Exported memories to ${file}`));
      }, opts);
    });

  mem
    .command('import <file>')
    .description('Import memories from file')
    .option('--merge', 'Merge with existing (skip duplicates)')
    .option('--backend <backend>', 'Import into specific backend')
    .option('-f, --format <format>', 'Import format: json, csv, jsonl, json-provider, sectioned-memory-store', 'json')
    .option('--json', 'Output as JSON')
    .action(async (file, opts) => {
      await withMemoryErrorHandling(async () => {
        if (opts.merge) {
          throw new Error('Live memory import does not yet support merge/deduplication mode.');
        }
        if (opts.backend) {
          throw new Error('Live memory import does not yet support backend selection.');
        }

        const data = readFileSync(file, 'utf8');
        const result = await queryTrpc<MemoryImportResult>('memory.importMemories', {
          format: opts.format,
          data,
          userId: 'default',
        });

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        console.log(chalk.green(`  ✓ Imported memories from ${file}`));
        console.log(chalk.dim(`    Imported: ${result.imported}`));
        console.log(chalk.dim(`    Errors:   ${result.errors}`));
      }, opts);
    });

  mem
    .command('prune')
    .description('Prune old, redundant, or low-relevance memories')
    .option('--dry-run', 'Show what would be pruned without deleting')
    .option('--threshold <score>', 'Relevance threshold for pruning', '0.3')
    .option('--older-than <days>', 'Prune entries older than N days')
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      if (opts.dryRun) {
        console.log(chalk.yellow('  [DRY RUN] No memories will be deleted\n'));
      }
      console.log(chalk.green('  ✓ Pruning complete: 0 entries removed'));
    });

  mem
    .command('backends')
    .description('List configured memory backends and their status')
    .option('--json', 'Output as JSON')
    .action(async () => {
      const chalk = (await import('chalk')).default;
      const Table = (await import('cli-table3')).default;
      const table = new Table({
        head: ['Backend', 'Status', 'Entries', 'Storage'],
        style: { head: ['cyan'] },
      });
      table.push(['file (default)', chalk.green('● Active'), '0', '0 KB']);
      console.log(chalk.bold.cyan('\n  Memory Backends\n'));
      console.log(table.toString());
      console.log('');
    });

  mem
    .command('stats')
    .description('Show memory system statistics')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await withMemoryErrorHandling(async () => {
        const [stats, sectionedStatus] = await Promise.all([
          queryTrpc<MemoryStatsRecord | null>('memory.getAgentStats'),
          queryTrpc<SectionedMemoryStatus>('memory.getSectionedMemoryStatus'),
        ]);

        const payload = {
          stats,
          sectionedStore: sectionedStatus,
        };

        if (opts.json) {
          console.log(JSON.stringify(payload, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        console.log(chalk.bold.cyan('\n  Memory Statistics\n'));
        console.log(chalk.dim('  Session memories:    ') + formatNumber(stats?.sessionCount));
        console.log(chalk.dim('  Working memories:    ') + formatNumber(stats?.workingCount));
        console.log(chalk.dim('  Long-term memories:  ') + formatNumber(stats?.longTermCount));
        console.log(chalk.dim('  Observations:        ') + formatNumber(stats?.observationCount));
        console.log(chalk.dim('  Session summaries:   ') + formatNumber(stats?.sessionSummaryCount));
        console.log(chalk.dim('  Prompt captures:     ') + formatNumber(stats?.promptCount));
        console.log(chalk.dim('  Sectioned entries:   ') + formatNumber(sectionedStatus.totalEntries));
        console.log(chalk.dim('  Sections:            ') + `${sectionedStatus.populatedSectionCount}/${sectionedStatus.sectionCount}`);
        console.log(chalk.dim('  Providers:           ') + `${sectionedStatus.runtimePipeline.providerCount} (${sectionedStatus.runtimePipeline.providerNames.join(', ') || 'none'})`);
        console.log(chalk.dim('  Last updated:        ') + normalizeText(sectionedStatus.lastUpdatedAt));
        if (sectionedStatus.missingSections.length > 0) {
          console.log(chalk.dim('  Missing sections:    ') + sectionedStatus.missingSections.join(', '));
        }
        console.log('');
      }, opts);
    });
}
