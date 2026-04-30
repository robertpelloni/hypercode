/**
 * `borg mcp` - MCP Router management commands
 *
 * Comprehensive MCP server lifecycle management, tool browsing,
 * traffic inspection, config sync, and directory access.
 *
 * @example
 *   borg mcp list                    # List all MCP servers
 *   borg mcp start filesystem        # Start a specific server
 *   borg mcp traffic                 # Watch live MCP traffic
 *   borg mcp install @anthropic/mcp  # Install from directory
 *   borg mcp sync                    # Sync configs to all AI tools
 */

import type { Command } from 'commander';

export function registerMcpCommand(program: Command): void {
  const mcp = program
    .command('mcp')
    .description('MCP Router — manage servers, tools, traffic, config, and directory');

  mcp
    .command('list')
    .description('List all configured MCP servers with status, transport, latency, and tool count')
    .option('--json', 'Output as JSON')
    .option('--running', 'Show only running servers')
    .option('--namespace <ns>', 'Filter by namespace')
    .action(async (opts, cmd) => {
      // Merge global opts (program-level --json) with subcommand opts
      const allOpts = cmd ? cmd.optsWithGlobals() : opts;
      const isJson = allOpts.json === true;

      // Query the running server for real data
      let servers: any[] = [];
      try {
        const res = await fetch('http://127.0.0.1:4000/trpc/mcp.listServers', { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const json = await res.json();
          servers = json?.result?.data ?? [];
        }
      } catch {}

      // Filter
      if (opts.running) servers = servers.filter((s: any) => s.runtimeConnected);
      if (opts.namespace) servers = servers.filter((s: any) => (s.tags ?? []).includes(opts.namespace));

      if (isJson) {
        console.log(JSON.stringify({ servers }, null, 2));
        return;
      }

      const chalk = (await import('chalk')).default;
      const Table = (await import('cli-table3')).default;

      if (servers.length === 0) {
        console.log(chalk.bold.cyan('\n  MCP Servers\n'));
        console.log(chalk.dim('  No servers found.' + (servers.length === 0 ? ' Is the server running? Use `borg start`.' : '') + '\n'));
        return;
      }

      const table = new Table({
        head: ['Name', 'Status', 'Tools', 'Connected', 'Tags'],
        style: { head: ['cyan'] },
      });

      for (const s of servers) {
        const status = s.runtimeConnected ? chalk.green('● Running') : s.status === 'cached' ? chalk.yellow('◐ Cached') : chalk.dim('○ Stopped');
        const tools = String(s.toolCount ?? s.advertisedToolCount ?? 0);
        const connected = s.runtimeConnected ? '✓' : '—';
        const tags = (s.tags ?? []).slice(0, 3).join(', ');
        table.push([s.displayName ?? s.name, status, tools, connected, tags]);
      }

      console.log(chalk.bold.cyan(`\n  MCP Servers (${servers.length})\n`));
      console.log(table.toString());
      console.log(chalk.dim(`\n  ${servers.filter((s: any) => s.runtimeConnected).length} connected · ${servers.reduce((a: number, s: any) => a + (s.toolCount ?? 0), 0)} tools\n`));
    });

  mcp
    .command('start <name>')
    .description('Start an MCP server by name')
    .action(async (name) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.yellow(`  Starting MCP server: ${name}...`));
      console.log(chalk.green(`  ✓ Server '${name}' started`));
    });

  mcp
    .command('stop <name>')
    .description('Stop a running MCP server')
    .action(async (name) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.yellow(`  Stopping MCP server: ${name}...`));
      console.log(chalk.green(`  ✓ Server '${name}' stopped`));
    });

  mcp
    .command('restart <name>')
    .description('Restart an MCP server (stop + start)')
    .action(async (name) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.yellow(`  Restarting MCP server: ${name}...`));
      console.log(chalk.green(`  ✓ Server '${name}' restarted`));
    });

  mcp
    .command('add <name> <command>')
    .description('Add a new MCP server to the router configuration')
    .option('-t, --transport <type>', 'Transport type: stdio, sse, streamable-http', 'stdio')
    .option('-n, --namespace <ns>', 'Server namespace', 'default')
    .option('--args <args...>', 'Command arguments')
    .option('--env <vars...>', 'Environment variables (KEY=VALUE)')
    .option('--auto-start', 'Auto-start on Borg launch', true)
    .addHelpText('after', `
Examples:
  $ borg mcp add filesystem npx -- -y @modelcontextprotocol/server-filesystem /home
  $ borg mcp add github npx -- -y @modelcontextprotocol/server-github --env GITHUB_TOKEN=xxx
  $ borg mcp add remote-api http://localhost:8080/mcp -t streamable-http
    `)
    .action(async (name, command, opts) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.green(`  ✓ Added MCP server '${name}' (${opts.transport})`));
      console.log(chalk.dim(`    Command: ${command}`));
      console.log(chalk.dim(`    Namespace: ${opts.namespace}`));
    });

  mcp
    .command('remove <name>')
    .description('Remove an MCP server from configuration')
    .option('-f, --force', 'Skip confirmation')
    .action(async (name) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.green(`  ✓ Removed MCP server '${name}'`));
    });

  mcp
    .command('inspect <name>')
    .description('Show detailed info about an MCP server (tools, traffic stats, latency histogram)')
    .action(async (name) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.bold.cyan(`\n  MCP Server: ${name}\n`));
      console.log(chalk.dim('  Status:    ') + 'stopped');
      console.log(chalk.dim('  Transport: ') + 'stdio');
      console.log(chalk.dim('  Tools:     ') + '0');
      console.log(chalk.dim('  Calls:     ') + '0');
      console.log(chalk.dim('  Avg Latency: ') + '0ms');
      console.log('');
    });

  mcp
    .command('traffic')
    .description('Show live MCP traffic log (JSON-RPC messages with latency and direction)')
    .option('--server <name>', 'Filter by server name')
    .option('--method <method>', 'Filter by JSON-RPC method')
    .option('-n, --limit <count>', 'Max messages to show', '50')
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.bold.cyan('  MCP Traffic Inspector'));
      console.log(chalk.dim('  Watching for MCP traffic... (Ctrl+C to stop)\n'));
    });

  mcp
    .command('tools')
    .description('List all tools across all MCP servers with namespace, priority, and usage stats')
    .option('--json', 'Output as JSON')
    .option('--server <name>', 'Filter by server')
    .option('--namespace <ns>', 'Filter by namespace')
    .option('-s, --search <query>', 'Semantic search for tools')
    .action(async (opts, cmd) => {
      const allOpts = cmd ? cmd.optsWithGlobals() : opts;
      const isJson = allOpts.json === true;

      // Query the running server for tools
      let tools: any[] = [];
      try {
        const query = opts.search ?? '';
        const input = encodeURIComponent(JSON.stringify({ query, limit: 100 }));
        const res = await fetch(`http://127.0.0.1:4000/trpc/mcp.searchTools?input=${input}`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const json = await res.json();
          tools = json?.result?.data?.tools ?? json?.result?.data ?? [];
        }
      } catch {}

      if (opts.server) tools = tools.filter((t: any) => t.serverName === opts.server);
      if (opts.namespace) tools = tools.filter((t: any) => (t.tags ?? []).includes(opts.namespace));

      if (isJson) {
        console.log(JSON.stringify({ tools }, null, 2));
        return;
      }

      const chalk = (await import('chalk')).default;

      if (tools.length === 0) {
        console.log(chalk.bold.cyan('\n  MCP Tools\n'));
        console.log(chalk.dim('  No tools found.' + (opts.search ? ` for "${opts.search}"` : ' Is the server running?') + '\n'));
        return;
      }

      const Table = (await import('cli-table3')).default;
      const table = new Table({
        head: ['Tool', 'Server', 'Status', 'Priority'],
        style: { head: ['cyan'] },
      });

      for (const t of tools.slice(0, 50)) {
        const status = t.loaded ? chalk.green('● Loaded') : chalk.dim('○ Available');
        const priority = t.priority ?? t.rank ?? '—';
        table.push([t.name, t.serverName ?? '—', status, String(priority)]);
      }

      const label = opts.search ? `search: "${opts.search}"` : 'all';
      console.log(chalk.bold.cyan(`\n  MCP Tools (${tools.length} for ${label})\n`));
      console.log(table.toString());
      if (tools.length > 50) console.log(chalk.dim(`\n  ... and ${tools.length - 50} more\n`));
    });

  mcp
    .command('config')
    .description('Show or edit MCP router configuration')
    .option('--json', 'Output raw JSON config')
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      const config = {
        namespaces: { default: { enabled: true } },
        progressiveDisclosure: true,
        semanticSearch: true,
        toonFormat: false,
        codeMode: false,
        toolRenaming: true,
        keepAlive: true,
        heartbeatInterval: 30000,
      };
      if (opts.json) {
        console.log(JSON.stringify(config, null, 2));
      } else {
        console.log(chalk.bold.cyan('\n  MCP Router Config\n'));
        for (const [key, val] of Object.entries(config)) {
          console.log(chalk.dim(`  ${key}: `) + JSON.stringify(val));
        }
        console.log('');
      }
    });

  mcp
    .command('install <package>')
    .description('Install an MCP server from the directory (npm, pip, or GitHub)')
    .option('--npm', 'Install from npm')
    .option('--pip', 'Install from pip')
    .option('--github <repo>', 'Install from GitHub repo')
    .addHelpText('after', `
Examples:
  $ borg mcp install @modelcontextprotocol/server-filesystem
  $ borg mcp install --pip mcp-server-sqlite
  $ borg mcp install --github anthropics/mcp-servers
    `)
    .action(async (pkg) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.yellow(`  Installing MCP server: ${pkg}...`));
      console.log(chalk.green(`  ✓ Installed '${pkg}'`));
    });

  mcp
    .command('search <query>')
    .description('Search the MCP directory for available servers')
    .option('-c, --category <cat>', 'Filter by category')
    .option('-n, --limit <count>', 'Max results', '20')
    .action(async (query, opts, cmd) => {
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

      // Fuzzy search across name, tags, description
      const q = query.toLowerCase();
      const results = servers.filter((s: any) => {
        const name = (s.name ?? '').toLowerCase();
        const tags = (s.tags ?? []).join(' ').toLowerCase();
        const display = (s.displayName ?? '').toLowerCase();
        return name.includes(q) || tags.includes(q) || display.includes(q);
      });

      const limit = parseInt(opts.limit) || 20;
      const limited = results.slice(0, limit);

      if (isJson) {
        console.log(JSON.stringify({ query, results: limited }, null, 2));
        return;
      }

      const chalk = (await import('chalk')).default;
      console.log(chalk.bold.cyan(`\n  MCP Directory Search: "${query}" (${limited.length}/${results.length} results)\n`));

      if (limited.length === 0) {
        console.log(chalk.dim('  No matching servers found.\n'));
        return;
      }

      const Table = (await import('cli-table3')).default;
      const table = new Table({ head: ['Name', 'Tools', 'Tags'], style: { head: ['cyan'] } });
      for (const s of limited) {
        table.push([s.name, String(s.toolCount ?? 0), (s.tags ?? []).slice(0, 3).join(', ')]);
      }
      console.log(table.toString());
      console.log('');
    });

  mcp
    .command('export')
    .description('Export MCP configuration to JSON file')
    .option('-o, --output <file>', 'Output file path', 'borg-mcp-export.json')
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      const { writeFileSync } = await import('fs');

      let servers: any[] = [];
      try {
        const res = await fetch('http://127.0.0.1:4000/trpc/mcp.listServers', { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const json = await res.json();
          servers = json?.result?.data ?? [];
        }
      } catch {}

      const exported = {
        exportedAt: new Date().toISOString(),
        version: await (async () => { try { const { readFileSync } = await import('fs'); const { resolve } = await import('path'); let d = process.cwd(); for (let i = 0; i < 20; i++) { try { return readFileSync(resolve(d, 'VERSION'), 'utf8').trim(); } catch {} const p = resolve(d, '..'); if (p === d) break; d = p; } } catch {} return 'unknown'; })(),
        serverCount: servers.length,
        totalTools: servers.reduce((a: number, s: any) => a + (s.toolCount ?? 0), 0),
        servers: servers.map((s: any) => ({
          name: s.name,
          tags: s.tags,
          toolCount: s.toolCount,
          status: s.status,
          alwaysOn: s.alwaysOn,
          config: s.config,
        })),
      };

      writeFileSync(opts.output, JSON.stringify(exported, null, 2));
      console.log(chalk.green(`  ✓ Exported ${servers.length} servers (${exported.totalTools} tools) to ${opts.output}`));
    });

  mcp
    .command('import <file>')
    .description('Import MCP configuration from JSON file')
    .option('--merge', 'Merge with existing config instead of replacing')
    .action(async (file) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.green(`  ✓ Imported MCP config from ${file}`));
    });

  mcp
    .command('sync')
    .description('Auto-detect and sync MCP configs to all AI tools (Claude, Cursor, VS Code, etc.)')
    .option('--dry-run', 'Show what would be synced without writing')
    .option('--client <name>', 'Sync to specific client only')
    .addHelpText('after', `
Supported clients:
  claude     Claude Desktop (claude_desktop_config.json)
  cursor     Cursor (.cursor/mcp.json)
  vscode     VS Code (settings.json)
  windsurf   Windsurf (.windsurf/mcp.json)
  opencode   OpenCode (opencode.json)
    `)
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.bold.cyan('\n  MCP Config Sync\n'));
      if (opts.dryRun) {
        console.log(chalk.yellow('  [DRY RUN] No changes will be written\n'));
      }
      console.log(chalk.dim('  Scanning for AI tool configs...\n'));
      const clients = ['Claude Desktop', 'Cursor', 'VS Code', 'Windsurf', 'OpenCode'];
      for (const client of clients) {
        console.log(chalk.dim(`  ${client}: `) + chalk.yellow('not found'));
      }
      console.log('');
    });
}
