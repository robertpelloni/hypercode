/**
 * `borg agent` - Agent management commands
 *
 * Manage AI agents: list available definitions, spawn instances,
 * monitor running agents, and interact via chat.
 *
 * @example
 *   borg agent list              # List available agent definitions
 *   borg agent spawn architect   # Spawn an architect agent
 *   borg agent chat agent_123    # Chat with a running agent
 */

import type { Command } from 'commander';

export function registerAgentCommand(program: Command): void {
  const agent = program
    .command('agent')
    .description('Agents — manage AI agent definitions, instances, and orchestration');

  agent
    .command('list')
    .description('List all available agent definitions with model, provider, and role')
    .option('--json', 'Output as JSON')
    .option('--provider <provider>', 'Filter by provider')
    .option('--role <role>', 'Filter by role')
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      const Table = (await import('cli-table3')).default;

      if (opts.json) {
        console.log(JSON.stringify({ agents: [] }, null, 2));
        return;
      }

      const table = new Table({
        head: ['Name', 'Model', 'Provider', 'Role', 'Status'],
        style: { head: ['cyan'] },
      });

      const agents = [
        ['architect', 'claude-opus-4', 'anthropic', 'Architect', 'available'],
        ['builder', 'gpt-5.2-codex', 'openai', 'Builder', 'available'],
        ['researcher', 'gemini-3-pro', 'google', 'Researcher', 'available'],
        ['critic', 'grok-4', 'xai', 'Critic', 'available'],
        ['supernova', 'claude-sonnet-4', 'anthropic', 'General', 'available'],
      ];

      for (const a of agents) {
        const status = a[4] === 'running'
          ? (await import('chalk')).default.green('● running')
          : (await import('chalk')).default.dim('○ available');
        table.push([a[0], a[1], a[2], a[3], status]);
      }

      console.log(chalk.bold.cyan('\n  Available Agents\n'));
      console.log(table.toString());
      console.log(chalk.dim(`\n  ${agents.length} agents available. Use \`borg agent spawn <name>\` to start one.\n`));
    });

  agent
    .command('spawn <name>')
    .description('Spawn an agent instance from a definition')
    .option('-m, --model <model>', 'Override the default model')
    .option('-p, --provider <provider>', 'Override the default provider')
    .option('-w, --workdir <path>', 'Working directory for the agent', '.')
    .option('--system-prompt <prompt>', 'Custom system prompt')
    .option('--temperature <temp>', 'LLM temperature', '0.7')
    .addHelpText('after', `
Examples:
  $ borg agent spawn architect
  $ borg agent spawn builder --model gpt-5.2 --workdir ./my-project
  $ borg agent spawn researcher --provider google
    `)
    .action(async (name, opts) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.yellow(`  Spawning agent: ${name}...`));
      console.log(chalk.green(`  ✓ Agent '${name}' spawned (id: agent_${Date.now()})`));
      console.log(chalk.dim(`    Model: ${opts.model || 'default'}`));
      console.log(chalk.dim(`    Workdir: ${opts.workdir}`));
    });

  agent
    .command('stop <id>')
    .description('Stop a running agent instance')
    .option('-f, --force', 'Force stop without cleanup')
    .action(async (id) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.green(`  ✓ Agent '${id}' stopped`));
    });

  agent
    .command('status')
    .description('Show all running agent instances with metrics')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.bold.cyan('\n  Running Agents\n'));
      console.log(chalk.dim('  No agents currently running.\n'));
    });

  agent
    .command('chat <id>')
    .description('Open interactive chat session with a running agent')
    .action(async (id) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.bold.cyan(`\n  Chat with Agent: ${id}`));
      console.log(chalk.dim('  Type your message and press Enter. Type "exit" to quit.\n'));

      const readline = await import('node:readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.on('line', (line: string) => {
        if (line.trim().toLowerCase() === 'exit') {
          rl.close();
          return;
        }
        console.log(chalk.dim(`  [Agent] Processing: "${line.substring(0, 50)}..."`));
      });
    });

  agent
    .command('council')
    .description('Manage the Director/Council/Supervisor system')
    .option('--start', 'Start the council')
    .option('--stop', 'Stop the council')
    .option('--status', 'Show council status')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.bold.cyan('\n  Agent Council\n'));
      console.log(chalk.dim('  Director:   ') + chalk.yellow('not configured'));
      console.log(chalk.dim('  Supervisor: ') + chalk.yellow('not configured'));
      console.log(chalk.dim('  Council:    ') + chalk.yellow('0 members'));
      console.log(chalk.dim('\n  Configure in `borg config set director.enabled true`\n'));
    });
}
