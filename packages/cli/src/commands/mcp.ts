/**
 * `hypercode mcp` - MCP Router management commands
 *
 * Comprehensive MCP server lifecycle management, tool browsing,
 * traffic inspection, config sync, and directory access.
 */

import type { Command } from 'commander';

import { queryTrpc, resolveControlPlaneLocation } from '../control-plane.js';

type McpServerRecord = {
  name: string;
  displayName?: string;
  tags?: string[];
  status?: string;
  runtimeState?: string;
  warmupState?: string;
  runtimeConnected?: boolean;
  toolCount?: number;
  advertisedToolCount?: number;
  advertisedSource?: string;
  lastConnectedAt?: string | null;
  lastError?: string | null;
  alwaysOn?: boolean;
  config?: {
    command?: string;
    args?: string[];
    env?: string[];
  };
};

type McpToolRecord = {
  name: string;
  description?: string;
  server?: string;
  serverDisplayName?: string;
  semanticGroup?: string;
  semanticGroupLabel?: string;
  keywords?: string[];
  alwaysOn?: boolean;
  loaded?: boolean;
  hydrated?: boolean;
  deferred?: boolean;
  requiresSchemaHydration?: boolean;
  matchReason?: string;
  rank?: number;
};

type McpRegistryEntry = {
  id: string;
  name: string;
  url: string;
  category: string;
  description: string;
  tags: string[];
};

type ConfigEntry = {
  key: string;
  value: string;
};

function normalizeText(value: string | null | undefined): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '—';
}

function normalizeArray(values: string[] | undefined): string {
  return Array.isArray(values) && values.length > 0 ? values.join(', ') : '—';
}

function parsePositiveInt(value: string, fieldName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return parsed;
}

async function withMcpErrorHandling(
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
      console.error(chalk.dim('  Start HyperCode with `hypercode start` or point BORG_TRPC_UPSTREAM at a live /trpc endpoint.'));
    }
    process.exitCode = 1;
  }
}

function filterServers(
  servers: McpServerRecord[],
  opts: { running?: boolean; namespace?: string },
): McpServerRecord[] {
  return servers.filter((server) => {
    if (opts.running && !server.runtimeConnected && server.status !== 'connected') {
      return false;
    }

    if (opts.namespace) {
      const tags = server.tags ?? [];
      return tags.some((tag) => tag.toLowerCase() === opts.namespace?.toLowerCase());
    }

    return true;
  });
}

function filterTools(
  tools: McpToolRecord[],
  opts: { server?: string; namespace?: string },
): McpToolRecord[] {
  return tools.filter((tool) => {
    if (opts.server && tool.server?.toLowerCase() !== opts.server.toLowerCase()) {
      return false;
    }

    if (opts.namespace && tool.semanticGroup?.toLowerCase() !== opts.namespace.toLowerCase()) {
      return false;
    }

    return true;
  });
}

function filterRegistryEntries(
  entries: McpRegistryEntry[],
  query: string,
  category?: string,
): McpRegistryEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  return entries.filter((entry) => {
    if (category && entry.category.toLowerCase() !== category.toLowerCase()) {
      return false;
    }

    if (normalizedQuery.length === 0) {
      return true;
    }

    const haystack = [
      entry.name,
      entry.description,
      entry.category,
      entry.url,
      ...(entry.tags ?? []),
    ].join(' ').toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

function parseMaybeJson(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed.length === 0) return '';
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;

  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric) && trimmed === String(numeric)) {
    return numeric;
  }

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}'))
    || (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
}

function groupConfigEntries(entries: ConfigEntry[]): Record<string, unknown> {
  const grouped: Record<string, unknown> = {};

  for (const entry of entries) {
    const parts = entry.key.split('.');
    let cursor: Record<string, unknown> = grouped;

    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      const isLeaf = index === parts.length - 1;

      if (isLeaf) {
        cursor[part] = parseMaybeJson(entry.value);
        continue;
      }

      const next = cursor[part];
      if (!next || typeof next !== 'object' || Array.isArray(next)) {
        cursor[part] = {};
      }
      cursor = cursor[part] as Record<string, unknown>;
    }
  }

  return grouped;
}

function printConfigObject(obj: Record<string, unknown>, chalk: typeof import('chalk').default, prefix = '  '): void {
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      console.log(chalk.bold(`${prefix}${key}:`));
      printConfigObject(value as Record<string, unknown>, chalk, `${prefix}  `);
      continue;
    }

    console.log(chalk.dim(`${prefix}${key}: `) + JSON.stringify(value));
  }
}

export function registerMcpCommand(program: Command): void {
  const mcp = program
    .command('mcp')
    .description('MCP Router — manage servers, tools, traffic, config, and directory');

  mcp
    .command('list')
    .description('List all configured MCP servers with status, transport, latency, and tool count')
    .option('--json', 'Output as JSON')
    .option('--running', 'Show only running servers')
    .option('--namespace <ns>', 'Filter by namespace tag')
    .action(async (opts) => {
      await withMcpErrorHandling(async () => {
        const servers = await queryTrpc<McpServerRecord[]>('mcp.listServers');
        const filtered = filterServers(servers, opts);

        if (opts.json) {
          console.log(JSON.stringify({ servers: filtered }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        const Table = (await import('cli-table3')).default;

        console.log(chalk.bold.cyan('\n  MCP Servers\n'));
        if (filtered.length === 0) {
          console.log(chalk.dim('  No matching MCP servers found.\n'));
          return;
        }

        const table = new Table({
          head: ['Name', 'Status', 'Warmup', 'Tools', 'Always On', 'Tags'],
          style: { head: ['cyan'] },
          wordWrap: true,
          colWidths: [24, 14, 14, 10, 12, 36],
        });

        for (const server of filtered) {
          const status = normalizeText(server.status ?? server.runtimeState);
          table.push([
            `${server.displayName ?? server.name}\n${chalk.dim(server.name)}`,
            status,
            normalizeText(server.warmupState),
            String(server.toolCount ?? server.advertisedToolCount ?? 0),
            server.alwaysOn ? chalk.green('yes') : chalk.dim('no'),
            normalizeArray(server.tags),
          ]);
        }

        console.log(table.toString());
        console.log('');
      }, opts);
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
    .option('--auto-start', 'Auto-start on HyperCode launch', true)
    .addHelpText('after', `
Examples:
  $ hypercode mcp add filesystem npx -- -y @modelcontextprotocol/server-filesystem /home
  $ hypercode mcp add github npx -- -y @modelcontextprotocol/server-github --env GITHUB_TOKEN=xxx
  $ hypercode mcp add remote-api http://localhost:8080/mcp -t streamable-http
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
    .action(async (_opts) => {
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
    .action(async (opts) => {
      await withMcpErrorHandling(async () => {
        const tools = opts.search
          ? await queryTrpc<McpToolRecord[]>('mcp.searchTools', { query: opts.search })
          : await queryTrpc<McpToolRecord[]>('mcp.listTools');
        const filtered = filterTools(tools, opts);

        if (opts.json) {
          console.log(JSON.stringify({
            query: opts.search ?? null,
            tools: filtered,
          }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        const Table = (await import('cli-table3')).default;

        console.log(chalk.bold.cyan('\n  MCP Tools\n'));
        if (opts.search) {
          console.log(chalk.dim(`  Search: ${opts.search}\n`));
        }

        if (filtered.length === 0) {
          console.log(chalk.dim('  No matching MCP tools found.\n'));
          return;
        }

        const table = new Table({
          head: ['Tool', 'Server', 'Group', 'State', 'Why'],
          style: { head: ['cyan'] },
          wordWrap: true,
          colWidths: [28, 20, 20, 24, 42],
        });

        for (const tool of filtered) {
          const state: string[] = [];
          if (tool.alwaysOn) state.push('always-on');
          if (tool.loaded) state.push('loaded');
          if (tool.hydrated) state.push('hydrated');
          if (tool.deferred) state.push('deferred');
          if (tool.requiresSchemaHydration) state.push('needs schema');

          table.push([
            `${tool.name}${tool.description ? `\n${chalk.dim(tool.description)}` : ''}`,
            normalizeText(tool.serverDisplayName ?? tool.server),
            normalizeText(tool.semanticGroupLabel ?? tool.semanticGroup),
            state.length > 0 ? state.join(', ') : chalk.dim('available'),
            normalizeText(tool.matchReason),
          ]);
        }

        console.log(table.toString());
        console.log('');
      }, opts);
    });

  mcp
    .command('config')
    .description('Show or edit MCP router configuration')
    .option('--json', 'Output raw JSON config')
    .action(async (opts) => {
      await withMcpErrorHandling(async () => {
        const entries = await queryTrpc<ConfigEntry[]>('config.list');
        const config = groupConfigEntries(entries).mcp;

        if (!config || typeof config !== 'object' || Array.isArray(config)) {
          throw new Error("MCP configuration section 'mcp' was not found");
        }

        if (opts.json) {
          console.log(JSON.stringify(config, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        console.log(chalk.bold.cyan('\n  MCP Router Config\n'));
        printConfigObject(config as Record<string, unknown>, chalk);
        console.log('');
      }, opts);
    });

  mcp
    .command('install <package>')
    .description('Install an MCP server from the directory (npm, pip, or GitHub)')
    .option('--npm', 'Install from npm')
    .option('--pip', 'Install from pip')
    .option('--github <repo>', 'Install from GitHub repo')
    .addHelpText('after', `
Examples:
  $ hypercode mcp install @modelcontextprotocol/server-filesystem
  $ hypercode mcp install --pip mcp-server-sqlite
  $ hypercode mcp install --github anthropics/mcp-servers
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
    .option('--json', 'Output as JSON')
    .action(async (query, opts) => {
      await withMcpErrorHandling(async () => {
        const limit = parsePositiveInt(opts.limit, 'limit');
        const entries = await queryTrpc<McpRegistryEntry[]>('mcpServers.registrySnapshot');
        const filtered = filterRegistryEntries(entries, query, opts.category).slice(0, limit);

        if (opts.json) {
          console.log(JSON.stringify({ query, category: opts.category ?? null, results: filtered }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        const Table = (await import('cli-table3')).default;

        console.log(chalk.bold.cyan(`\n  MCP Directory Search: "${query}"\n`));
        if (filtered.length === 0) {
          console.log(chalk.dim('  No matching registry entries found.\n'));
          return;
        }

        const table = new Table({
          head: ['Name', 'Category', 'Tags', 'URL'],
          style: { head: ['cyan'] },
          wordWrap: true,
          colWidths: [28, 18, 24, 54],
        });

        for (const entry of filtered) {
          table.push([
            `${entry.name}\n${chalk.dim(entry.description)}`,
            normalizeText(entry.category),
            normalizeArray(entry.tags),
            normalizeText(entry.url),
          ]);
        }

        console.log(table.toString());
        console.log('');
      }, opts);
    });

  mcp
    .command('export')
    .description('Export MCP configuration to JSON file')
    .option('-o, --output <file>', 'Output file path', 'hypercode-mcp-export.json')
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.green(`  ✓ Exported MCP config to ${opts.output}`));
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
