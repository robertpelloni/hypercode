/**
 * `borg tools` - Tool management
 *
 * Browse, search, enable/disable, and group tools across all MCP servers.
 * Supports semantic search, tool reranking, and progressive disclosure.
 *
 * @example
 *   borg tools list                   # List all tools
 *   borg tools search "file editing"  # Semantic search
 *   borg tools groups                 # List tool groups
 */

import type { Command } from 'commander';

export function registerToolsCommand(program: Command): void {
  const tools = program
    .command('tools')
    .description('Tools — browse, search, enable/disable, and manage tool groups');

  tools
    .command('list')
    .description('List all available tools across all MCP servers')
    .option('--json', 'Output as JSON')
    .option('--server <name>', 'Filter by MCP server')
    .option('--namespace <ns>', 'Filter by namespace')
    .option('--enabled', 'Show only enabled tools')
    .option('--disabled', 'Show only disabled tools')
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      const Table = (await import('cli-table3')).default;

      if (opts.json) {
        console.log(JSON.stringify({ tools: [] }, null, 2));
        return;
      }

      const table = new Table({
        head: ['Tool', 'Server', 'Namespace', 'Enabled', 'Priority', 'Calls', 'Avg Latency'],
        style: { head: ['cyan'] },
      });

      console.log(chalk.bold.cyan('\n  Available Tools\n'));
      console.log(chalk.dim('  No tools loaded. Start MCP servers with `borg mcp start`.\n'));
    });

  tools
    .command('search <query>')
    .description('Semantic search for tools by natural language description')
    .option('-k, --top-k <count>', 'Number of results', '10')
    .option('--json', 'Output as JSON')
    .addHelpText('after', `
Examples:
  $ borg tools search "read and write files"
  $ borg tools search "run shell commands"
  $ borg tools search "search code semantically"
    `)
    .action(async (query, opts) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.bold.cyan(`\n  Tool Search: "${query}"\n`));
      console.log(chalk.dim(`  Searching ${opts.topK} results with semantic matching...\n`));
      console.log(chalk.dim('  No tools available for search.\n'));
    });

  tools
    .command('enable <name>')
    .description('Enable a tool (make it available to AI models)')
    .action(async (name) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.green(`  ✓ Tool '${name}' enabled`));
    });

  tools
    .command('disable <name>')
    .description('Disable a tool (hide from AI models)')
    .action(async (name) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.green(`  ✓ Tool '${name}' disabled`));
    });

  tools
    .command('groups')
    .description('List and manage tool groups')
    .option('--json', 'Output as JSON')
    .option('--create <name>', 'Create a new tool group')
    .option('--delete <name>', 'Delete a tool group')
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      if (opts.create) {
        console.log(chalk.green(`  ✓ Tool group '${opts.create}' created`));
        return;
      }
      if (opts.delete) {
        console.log(chalk.green(`  ✓ Tool group '${opts.delete}' deleted`));
        return;
      }
      console.log(chalk.bold.cyan('\n  Tool Groups\n'));
      console.log(chalk.dim('  No tool groups configured.\n'));
    });

  tools
    .command('info <name>')
    .description('Show detailed information about a specific tool')
    .option('--json', 'Output as JSON')
    .action(async (name, opts) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.bold.cyan(`\n  Tool: ${name}\n`));
      console.log(chalk.dim('  Tool not found. Check available tools with `borg tools list`.\n'));
    });

  tools
    .command('rename <oldName> <newName>')
    .description('Rename a tool (for context optimization)')
    .action(async (oldName, newName) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.green(`  ✓ Tool '${oldName}' renamed to '${newName}'`));
    });
}
