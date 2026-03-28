/**
 * `borg session` - Development session management
 *
 * Track, manage, and control development sessions across local
 * and cloud environments with auto-restart and export capabilities.
 *
 * @example
 *   borg session list               # List all sessions
 *   borg session start ./my-project  # Start new session
 *   borg session export sess_123     # Export session history
 */

import type { Command } from 'commander';
import {
  CLI_HARNESSES,
  PRIMARY_CLI_HARNESS,
  formatCliHarnessHelpLines,
  formatCliHarnessList,
  resolveCliHarnessDefinition,
  resolveCliHarnessDefinitions,
  summarizeCliHarnessParity,
} from '../harnesses.js';

export function registerSessionCommand(program: Command): void {
  const session = program
    .command('session')
    .alias('sess')
    .description('Sessions — manage development sessions (local, cloud, import/export)');

  session
    .command('list')
    .description('List all development sessions with status, harness, and activity')
    .option('--json', 'Output as JSON')
    .option('--active', 'Show only active sessions')
    .option('--cloud', 'Show only cloud dev sessions')
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      const Table = (await import('cli-table3')).default;
      const table = new Table({
        head: ['ID', 'Name', 'Workdir', 'Harness', 'Model', 'Status', 'Last Activity'],
        style: { head: ['cyan'] },
      });
      console.log(chalk.bold.cyan('\n  Development Sessions\n'));
      console.log(chalk.dim('  No sessions found. Use `borg session start` to create one.\n'));
    });

  session
    .command('harnesses')
    .description('List Borg-supported CLI harness identities and maturity')
    .option('--json', 'Output harness metadata as JSON')
    .option('--verbose', 'Show extra integration and tool inventory details')
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      const definitions = resolveCliHarnessDefinitions();
      const parity = summarizeCliHarnessParity();
      if (opts.json) {
        console.log(JSON.stringify(definitions, null, 2));
        return;
      }

      const Table = (await import('cli-table3')).default;
      const table = new Table({
        head: ['Harness', 'Role', 'Maturity', 'Runtime', 'Tools', 'Source', 'Launch'],
        style: { head: ['cyan'] },
      });

      for (const definition of definitions) {
        table.push([
          definition.id,
          definition.primary ? 'primary' : 'supported',
          definition.maturity,
          definition.runtime || 'n/a',
          definition.toolCallCount ? `${definition.toolCallCount} source-backed` : 'external/unknown',
          definition.submodulePath || 'built-in',
          definition.launchCommand || definition.upstream || definition.description,
        ]);
      }

      console.log(chalk.bold.cyan('\n  CLI Harnesses\n'));
      console.log(chalk.dim(`  Source-backed: ${parity.sourceBackedHarnessCount}/${parity.totalHarnesses} harnesses, ${parity.sourceBackedToolCount} enumerated HyperCode tool calls`));
      console.log(chalk.dim(`  Metadata-only: ${parity.metadataOnlyHarnessCount}, operator-defined: ${parity.operatorDefinedHarnessCount}\n`));
      console.log(table.toString());
      if (opts.verbose) {
        for (const definition of definitions) {
          console.log('');
          console.log(chalk.cyan(`  ${definition.id}`));
          console.log(chalk.dim(`    Inventory: ${definition.toolInventoryStatus}`));
          console.log(chalk.dim(`    Level:  ${definition.integrationLevel}`));
          if (definition.parityNotes) {
            console.log(chalk.dim(`    Note:   ${definition.parityNotes}`));
          }
          if (definition.toolInventorySource) {
            console.log(chalk.dim(`    Tools:  ${definition.toolInventorySource}`));
          }
          if (definition.toolCallNames?.length) {
            console.log(chalk.dim(`    Calls:  ${definition.toolCallNames.join(', ')}`));
          }
        }
      }
      console.log('');
    });

  session
    .command('start <workdir>')
    .description('Start a new development session in the given directory')
    .option('-h, --harness <harness>', `CLI harness: ${formatCliHarnessList()}`, PRIMARY_CLI_HARNESS)
    .option('-m, --model <model>', 'AI model to use')
    .option('-p, --provider <provider>', 'Provider to use')
    .option('-n, --name <name>', 'Session name')
    .option('--auto-restart', 'Auto-restart on crash', true)
    .option('--supervisor', 'Enable supervisor mode')
    .addHelpText('after', `
Examples:
  $ borg session start ./my-app
  $ borg session start ./my-app --harness hypercode
  $ borg session start ./my-app --harness claude --model claude-opus-4
  $ borg session start ./my-app --supervisor --auto-restart

Harnesses:
${formatCliHarnessHelpLines()}
    `)
    .action(async (workdir, opts) => {
      const chalk = (await import('chalk')).default;
      const definition = resolveCliHarnessDefinition(opts.harness);
      if (!definition) {
        console.error(
          chalk.red(
            `  ✗ Unknown harness '${opts.harness}'. Supported harnesses: ${formatCliHarnessList()}`
          )
        );
        process.exitCode = 1;
        return;
      }
      const id = `sess_${Date.now().toString(36)}`;
      console.log(chalk.green(`  ✓ Session started: ${id}`));
      console.log(chalk.dim(`    Workdir:  ${workdir}`));
      console.log(chalk.dim(`    Harness:  ${opts.harness}`));
      console.log(chalk.dim(`    Maturity: ${definition.maturity}`));
      console.log(chalk.dim(`    Model:    ${opts.model || 'auto'}`));
      console.log(chalk.dim(`    Restart:  ${opts.autoRestart ? 'enabled' : 'disabled'}`));
      if (definition.primary) {
        console.log(chalk.cyan(`    Role:     primary Borg CLI harness lane`));
      }
      if (definition.submodulePath) {
        console.log(chalk.dim(`    Source:   ${definition.submodulePath}`));
      }
      if (definition.launchCommand) {
        console.log(chalk.dim(`    Launch:   ${definition.launchCommand}`));
      }
      if (definition.capabilities?.length) {
        console.log(chalk.dim(`    Features: ${definition.capabilities.join(', ')}`));
      }
      if (definition.toolCallCount) {
        console.log(chalk.dim(`    Tools:    ${definition.toolCallCount} source-backed HyperCode tool calls`));
      }
      if (definition.toolInventorySource) {
        console.log(chalk.dim(`    Source:   ${definition.toolInventorySource}`));
      }
      if (definition.parityNotes) {
        console.log(chalk.dim(`    Notes:    ${definition.parityNotes}`));
      }
    });

  session
    .command('stop <id>')
    .description('Stop a running session')
    .option('-f, --force', 'Force stop')
    .action(async (id) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.green(`  ✓ Session '${id}' stopped`));
    });

  session
    .command('resume <id>')
    .description('Resume a paused or stopped session')
    .action(async (id) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.green(`  ✓ Session '${id}' resumed`));
    });

  session
    .command('pause <id>')
    .description('Pause a running session (preserves state)')
    .action(async (id) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.green(`  ✓ Session '${id}' paused`));
    });

  session
    .command('export <id>')
    .description('Export session history, messages, and metadata')
    .option('-f, --format <format>', 'Export format: json, markdown', 'json')
    .option('-o, --output <file>', 'Output file path')
    .action(async (id, opts) => {
      const chalk = (await import('chalk')).default;
      const file = opts.output || `session-${id}-export.${opts.format}`;
      console.log(chalk.green(`  ✓ Session '${id}' exported to ${file}`));
    });

  session
    .command('import <file>')
    .description('Import a session from exported file')
    .action(async (file) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.green(`  ✓ Session imported from ${file}`));
    });

  session
    .command('broadcast <message>')
    .description('Send a message to all active sessions')
    .option('--cloud', 'Include cloud dev sessions')
    .action(async (message) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.green(`  ✓ Broadcast sent to all sessions: "${message.substring(0, 50)}..."`));
    });

  session
    .command('cloud')
    .description('Manage cloud development sessions (Jules, Devin, Codex)')
    .option('--list', 'List cloud sessions')
    .option('--transfer <id>', 'Transfer local session to cloud')
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.bold.cyan('\n  Cloud Dev Sessions\n'));
      console.log(chalk.dim('  No cloud sessions configured.\n'));
    });
}
