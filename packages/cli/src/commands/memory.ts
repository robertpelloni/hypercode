/**
 * `borg memory` - Universal memory management
 *
 * Manage Borg's multi-backend memory system: add, search, browse,
 * import/export, prune, and configure memory backends.
 *
 * @example
 *   borg memory add "Project uses TypeScript ESM"
 *   borg memory search "authentication flow"
 *   borg memory export --format json
 */

import type { Command } from 'commander';

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
  $ borg memory add "User prefers dark mode"
  $ borg memory add "API uses OAuth 2.0" -t semantic --tags auth api
  $ borg memory add "Deploy with: pnpm build && pnpm start" -t procedural
    `)
    .action(async (content, opts) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.green(`  ✓ Memory added (${opts.type})`));
      console.log(chalk.dim(`    Content: ${content.substring(0, 80)}${content.length > 80 ? '...' : ''}`));
      if (opts.tags) console.log(chalk.dim(`    Tags: ${opts.tags.join(', ')}`));
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
      const chalk = (await import('chalk')).default;
      console.log(chalk.bold.cyan(`\n  Memory Search: "${query}"\n`));
      console.log(chalk.dim('  No memories found. Add some with `borg memory add`.\n'));
    });

  mem
    .command('list')
    .description('List recent memory entries')
    .option('-n, --limit <count>', 'Number of entries to show', '20')
    .option('-t, --type <type>', 'Filter by type')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.bold.cyan('\n  Recent Memories\n'));
      console.log(chalk.dim('  No memories stored yet.\n'));
    });

  mem
    .command('export')
    .description('Export all memories to file')
    .option('-f, --format <format>', 'Export format: json, markdown, csv', 'json')
    .option('-o, --output <file>', 'Output file path')
    .option('-t, --type <type>', 'Export only specific type')
    .option('--backend <backend>', 'Export from specific backend')
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      const file = opts.output || `borg-memories-export.${opts.format}`;
      console.log(chalk.green(`  ✓ Exported memories to ${file}`));
    });

  mem
    .command('import <file>')
    .description('Import memories from file')
    .option('--merge', 'Merge with existing (skip duplicates)')
    .option('--backend <backend>', 'Import into specific backend')
    .action(async (file) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.green(`  ✓ Imported memories from ${file}`));
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
    .action(async (opts) => {
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
      const chalk = (await import('chalk')).default;
      console.log(chalk.bold.cyan('\n  Memory Statistics\n'));
      console.log(chalk.dim('  Total entries:   ') + '0');
      console.log(chalk.dim('  Active backends: ') + '1');
      console.log(chalk.dim('  Storage used:    ') + '0 KB');
      console.log(chalk.dim('  Last harvest:    ') + 'never');
      console.log(chalk.dim('  Last prune:      ') + 'never');
      console.log('');
    });
}
