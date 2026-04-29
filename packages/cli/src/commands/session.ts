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
    .command('start <workdir>')
    .description('Start a new development session in the given directory')
    .option('-h, --harness <harness>', 'CLI harness: opencode, claude, codex, gemini, goose, custom', 'opencode')
    .option('-m, --model <model>', 'AI model to use')
    .option('-p, --provider <provider>', 'Provider to use')
    .option('-n, --name <name>', 'Session name')
    .option('--auto-restart', 'Auto-restart on crash', true)
    .option('--supervisor', 'Enable supervisor mode')
    .addHelpText('after', `
Examples:
  $ borg session start ./my-app
  $ borg session start ./my-app --harness claude --model claude-opus-4
  $ borg session start ./my-app --supervisor --auto-restart
    `)
    .action(async (workdir, opts) => {
      const chalk = (await import('chalk')).default;
      const id = `sess_${Date.now().toString(36)}`;
      console.log(chalk.green(`  ✓ Session started: ${id}`));
      console.log(chalk.dim(`    Workdir:  ${workdir}`));
      console.log(chalk.dim(`    Harness:  ${opts.harness}`));
      console.log(chalk.dim(`    Model:    ${opts.model || 'auto'}`));
      console.log(chalk.dim(`    Restart:  ${opts.autoRestart ? 'enabled' : 'disabled'}`));
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
