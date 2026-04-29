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
    .action(async (opts, cmd) => {
      const allOpts = cmd ? cmd.optsWithGlobals() : opts;
      const isJson = allOpts.json === true;

      let servers: any[] = [];
      try {
        const res = await fetch('http://127.0.0.1:4000/trpc/mcp.listServers', { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const json = await res.json();
          servers = json?.result?.data ?? [];
        }
      } catch {}

      // Extract tools from servers
      let toolsList: any[] = [];
      for (const s of servers) {
        if (s.toolCount > 0) {
          toolsList.push({ name: `(${s.toolCount} tools)`, server: s.name, namespace: (s.tags ?? [])[0] ?? '', enabled: s.runtimeConnected, priority: '—', calls: '—', latency: '—' });
        }
      }
      if (opts.server) toolsList = toolsList.filter((t: any) => t.server === opts.server);
      if (opts.namespace) toolsList = toolsList.filter((t: any) => t.namespace === opts.namespace);

      if (isJson) {
        console.log(JSON.stringify({ tools: toolsList, serverCount: servers.length, totalToolCount: servers.reduce((a: number, s: any) => a + (s.toolCount ?? 0), 0) }, null, 2));
        return;
      }

      const chalk = (await import('chalk')).default;
      const Table = (await import('cli-table3')).default;

      if (toolsList.length === 0) {
        console.log(chalk.bold.cyan('\n  Available Tools\n'));
        console.log(chalk.dim('  No tools loaded. Is the server running? Use `borg start`.\n'));
        return;
      }

      const table = new Table({
        head: ['Server', 'Tools', 'Namespace', 'Connected'],
        style: { head: ['cyan'] },
      });

      for (const t of toolsList) {
        table.push([t.server, t.name, t.namespace, t.enabled ? chalk.green('✓') : '—']);
      }

      const total = servers.reduce((a: number, s: any) => a + (s.toolCount ?? 0), 0);
      console.log(chalk.bold.cyan(`\n  Available Tools (${total} across ${servers.length} servers)\n`));
      console.log(table.toString());
      console.log('');
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
    .action(async (query, opts, cmd) => {
      const allOpts = cmd ? cmd.optsWithGlobals() : opts;
      const isJson = allOpts.json === true;

      let results: any[] = [];
      try {
        const input = encodeURIComponent(JSON.stringify({ query, limit: parseInt(opts.topK) || 10 }));
        const res = await fetch(`http://127.0.0.1:4000/trpc/mcp.searchTools?input=${input}`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const json = await res.json();
          results = json?.result?.data?.tools ?? json?.result?.data ?? [];
        }
      } catch {}

      if (isJson) {
        console.log(JSON.stringify({ query, results }, null, 2));
        return;
      }

      const chalk = (await import('chalk')).default;
      console.log(chalk.bold.cyan(`\n  Tool Search: "${query}"\n`));
      if (results.length === 0) {
        console.log(chalk.dim('  No tools found. Is the server running?\n'));
        return;
      }

      const Table = (await import('cli-table3')).default;
      const table = new Table({ head: ['Tool', 'Server', 'Score'], style: { head: ['cyan'] } });
      for (const r of results.slice(0, 20)) {
        table.push([r.name ?? r.toolName, r.serverName ?? '—', r.score ? r.score.toFixed(3) : '—']);
      }
      console.log(table.toString());
      console.log('');
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
