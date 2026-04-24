/**
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/mcp.ts
 * `hypercode mcp` - MCP Router management commands
=======
 * `borg mcp` - MCP Router management commands
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/mcp.ts
 *
 * Comprehensive MCP server lifecycle management, tool browsing,
 * traffic inspection, config sync, and directory access.
 */

import { readFileSync, writeFileSync } from 'node:fs';

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

type McpTrafficEvent = {
  timestamp?: number;
  serverName?: string;
  server?: string;
  method?: string;
  direction?: string;
  latencyMs?: number;
  success?: boolean;
  error?: string | null;
};

type McpServerMutationResult = McpServerRecord & {
  uuid?: string;
  type?: string;
  command?: string | null;
  args?: string[];
  env?: Record<string, string>;
  url?: string | null;
  always_on?: boolean;
};

type McpDeleteResult = {
  success?: boolean;
};

type McpJsoncEditorRecord = {
  path: string;
  content: string;
};

type McpSyncTargetRecord = {
  client: string;
  path: string;
  candidates: string[];
  exists: boolean;
};

type McpClientConfigPreview = {
  client: string;
  targetPath: string;
  existed: boolean;
  serverCount: number;
  json: string;
  document?: Record<string, unknown>;
};

type McpClientConfigSyncResult = McpClientConfigPreview & {
  written: boolean;
};

const SUPPORTED_SYNC_CLIENTS = ['claude-desktop', 'cursor', 'vscode'] as const;
type SupportedSyncClient = (typeof SUPPORTED_SYNC_CLIENTS)[number];

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

function isSupportedSyncClient(value: string): value is SupportedSyncClient {
  return (SUPPORTED_SYNC_CLIENTS as readonly string[]).includes(value);
}

function parseSyncClient(value: string): SupportedSyncClient {
  const normalized = value.trim().toLowerCase();
  if (isSupportedSyncClient(normalized)) {
    return normalized;
  }
  throw new Error(`Unsupported MCP client '${value}'. Supported clients: ${SUPPORTED_SYNC_CLIENTS.join(', ')}.`);
}

function unsupportedMcpCommand(message: string): Promise<void> {
  return Promise.reject(new Error(message));
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
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/mcp.ts
      console.error(chalk.dim('  Start HyperCode with `hypercode start` or point HYPERCODE_TRPC_UPSTREAM at a live /trpc endpoint.'));
=======
      console.error(chalk.dim('  Start borg with `borg start` or point BORG_TRPC_UPSTREAM at a live /trpc endpoint.'));
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/mcp.ts
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

function findServerByName(servers: McpServerRecord[], name: string): McpServerRecord | undefined {
  const normalized = name.trim().toLowerCase();
  return servers.find((server) => (
    server.name.toLowerCase() === normalized
    || server.displayName?.toLowerCase() === normalized
  ));
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

function parseEnvVars(values: string[] | undefined): Record<string, string> | undefined {
  if (!Array.isArray(values) || values.length === 0) {
    return undefined;
  }

  const entries = values.map((entry) => {
    const separator = entry.indexOf('=');
    if (separator <= 0) {
      throw new Error(`Invalid environment variable '${entry}'. Expected KEY=VALUE.`);
    }

    return [entry.slice(0, separator), entry.slice(separator + 1)] as const;
  });

  return Object.fromEntries(entries);
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
    .option('--json', 'Output as JSON')
    .action(async (name, opts) => {
      await withMcpErrorHandling(
        () => unsupportedMcpCommand(`Live MCP start is unavailable for '${name}': the control plane does not expose a real server-start route yet.`),
        opts,
      );
    });

  mcp
    .command('stop <name>')
    .description('Stop a running MCP server')
    .option('--json', 'Output as JSON')
    .action(async (name, opts) => {
      await withMcpErrorHandling(
        () => unsupportedMcpCommand(`Live MCP stop is unavailable for '${name}': the control plane does not expose a real server-stop route yet.`),
        opts,
      );
    });

  mcp
    .command('restart <name>')
    .description('Restart an MCP server (stop + start)')
    .option('--json', 'Output as JSON')
    .action(async (name, opts) => {
      await withMcpErrorHandling(
        () => unsupportedMcpCommand(`Live MCP restart is unavailable for '${name}': the control plane does not expose a real server-restart route yet.`),
        opts,
      );
    });

  mcp
    .command('add <name> <command>')
    .description('Add a new MCP server to the router configuration')
    .option('-t, --transport <type>', 'Transport type: stdio, sse, streamable-http', 'stdio')
    .option('-n, --namespace <ns>', 'Server namespace', 'default')
    .option('--args <args...>', 'Command arguments')
    .option('--env <vars...>', 'Environment variables (KEY=VALUE)')
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/mcp.ts
    .option('--auto-start', 'Auto-start on HyperCode launch', true)
    .option('--no-auto-start', 'Do not auto-start on HyperCode launch')
    .addHelpText('after', `
Examples:
  $ hypercode mcp add filesystem npx -- -y @modelcontextprotocol/server-filesystem /home
  $ hypercode mcp add github npx -- -y @modelcontextprotocol/server-github --env GITHUB_TOKEN=xxx
  $ hypercode mcp add remote-api http://localhost:8080/mcp -t streamable-http
=======
    .option('--auto-start', 'Auto-start on borg launch', true)
    .option('--no-auto-start', 'Do not auto-start on borg launch')
    .addHelpText('after', `
Examples:
  $ borg mcp add filesystem npx -- -y @modelcontextprotocol/server-filesystem /home
  $ borg mcp add github npx -- -y @modelcontextprotocol/server-github --env GITHUB_TOKEN=xxx
  $ borg mcp add remote-api http://localhost:8080/mcp -t streamable-http
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/mcp.ts
    `)
    .option('--json', 'Output as JSON')
    .action(async (name, command, opts) => {
      await withMcpErrorHandling(async () => {
        const chalk = (await import('chalk')).default;
        const transport = String(opts.transport);
        if (opts.namespace && opts.namespace !== 'default') {
          throw new Error(`Live MCP add does not yet support namespace assignment ('${opts.namespace}'): the control plane create route has no namespace field or mapping mutation.`);
        }
        const env = parseEnvVars(opts.env);
        const created = await queryTrpc<McpServerMutationResult>('mcpServers.create', {
          name,
          description: null,
          type: transport,
          command: transport === 'stdio' ? command : null,
          args: transport === 'stdio' ? (opts.args ?? []) : [],
          env,
          url: transport === 'stdio' ? null : command,
          always_on: Boolean(opts.autoStart),
        });

        if (opts.json) {
          console.log(JSON.stringify({ server: created }, null, 2));
          return;
        }

        console.log(chalk.green(`  ✓ Added MCP server '${name}' (${transport})`));
        console.log(chalk.dim(`    Command: ${command}`));
        console.log(chalk.dim('    Namespace: default'));
      }, opts);
    });

  mcp
    .command('remove <name>')
    .description('Remove an MCP server from configuration')
    .option('-f, --force', 'Skip confirmation')
    .option('--json', 'Output as JSON')
    .action(async (name, opts) => {
      await withMcpErrorHandling(async () => {
        const chalk = (await import('chalk')).default;
        const servers = await queryTrpc<McpServerRecord[]>('mcpServers.list');
        const server = findServerByName(servers, name);
        const uuid = (server as McpServerMutationResult | undefined)?.uuid;

        if (!uuid) {
          throw new Error(`MCP server '${name}' was not found`);
        }

        const deleted = await queryTrpc<McpDeleteResult>('mcpServers.delete', { uuid });

        if (opts.json) {
          console.log(JSON.stringify(deleted, null, 2));
          return;
        }

        console.log(chalk.green(`  ✓ Removed MCP server '${name}'`));
      }, opts);
    });

  mcp
    .command('inspect <name>')
    .description('Show detailed info about an MCP server (tools, traffic stats, latency histogram)')
    .option('--json', 'Output as JSON')
    .action(async (name, opts) => {
      await withMcpErrorHandling(async () => {
        const [servers, tools] = await Promise.all([
          queryTrpc<McpServerRecord[]>('mcp.listServers'),
          queryTrpc<McpToolRecord[]>('mcp.listTools'),
        ]);
        const server = findServerByName(servers, name);

        if (!server) {
          throw new Error(`MCP server '${name}' was not found`);
        }

        const serverTools = tools.filter((tool) => tool.server?.toLowerCase() === server.name.toLowerCase());
        const payload = {
          server,
          tools: serverTools,
        };

        if (opts.json) {
          console.log(JSON.stringify(payload, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        const effectiveToolCount = serverTools.length > 0
          ? serverTools.length
          : (server.toolCount ?? server.advertisedToolCount ?? 0);
        console.log(chalk.bold.cyan(`\n  MCP Server: ${server.displayName ?? server.name}\n`));
        console.log(chalk.dim('  Name:          ') + server.name);
        console.log(chalk.dim('  Status:        ') + normalizeText(server.status ?? server.runtimeState));
        console.log(chalk.dim('  Warmup:        ') + normalizeText(server.warmupState));
        console.log(chalk.dim('  Tools:         ') + String(effectiveToolCount));
        console.log(chalk.dim('  Always On:     ') + (server.alwaysOn ? 'yes' : 'no'));
        console.log(chalk.dim('  Last Connected: ') + normalizeText(server.lastConnectedAt));
        console.log(chalk.dim('  Last Error:    ') + normalizeText(server.lastError));
        console.log(chalk.dim('  Tags:          ') + normalizeArray(server.tags));

        if (server.config) {
          console.log(chalk.dim('  Command:       ') + normalizeText(server.config.command));
          console.log(chalk.dim('  Args:          ') + normalizeArray(server.config.args));
          console.log(chalk.dim('  Env:           ') + normalizeArray(server.config.env));
        }

        if (serverTools.length > 0) {
          console.log('');
          console.log(chalk.dim('  Tool Names:'));
          for (const tool of serverTools.slice(0, 12)) {
            console.log(chalk.dim('    - ') + tool.name + (tool.description ? chalk.dim(` — ${tool.description}`) : ''));
          }
          if (serverTools.length > 12) {
            console.log(chalk.dim(`    … ${serverTools.length - 12} more tools`));
          }
        }

        console.log('');
      }, opts);
    });

  mcp
    .command('traffic')
    .description('Show live MCP traffic log (JSON-RPC messages with latency and direction)')
    .option('--json', 'Output as JSON')
    .option('--server <name>', 'Filter by server name')
    .option('--method <method>', 'Filter by JSON-RPC method')
    .option('-n, --limit <count>', 'Max messages to show', '50')
    .action(async (opts) => {
      await withMcpErrorHandling(async () => {
        const limit = parsePositiveInt(opts.limit, 'limit');
        const events = await queryTrpc<McpTrafficEvent[]>('mcp.traffic');
        const filtered = events
          .filter((event) => {
            const serverName = event.serverName ?? event.server ?? '';
            if (opts.server && serverName.toLowerCase() !== opts.server.toLowerCase()) {
              return false;
            }
            if (opts.method && event.method?.toLowerCase() !== opts.method.toLowerCase()) {
              return false;
            }
            return true;
          })
          .slice(-limit)
          .reverse();

        if (opts.json) {
          console.log(JSON.stringify({
            server: opts.server ?? null,
            method: opts.method ?? null,
            events: filtered,
          }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        const Table = (await import('cli-table3')).default;
        console.log(chalk.bold.cyan('\n  MCP Traffic Inspector\n'));

        if (filtered.length === 0) {
          console.log(chalk.dim('  No matching MCP traffic events found.\n'));
          return;
        }

        const table = new Table({
          head: ['When', 'Server', 'Method', 'Direction', 'Latency', 'Status'],
          style: { head: ['cyan'] },
          wordWrap: true,
          colWidths: [26, 20, 28, 12, 10, 20],
        });

        for (const event of filtered) {
          const status = event.error
            ? `error: ${event.error}`
            : event.success === false
              ? 'error'
              : 'ok';
          table.push([
            event.timestamp ? new Date(event.timestamp).toISOString() : '—',
            normalizeText(event.serverName ?? event.server),
            normalizeText(event.method),
            normalizeText(event.direction),
            typeof event.latencyMs === 'number' ? `${event.latencyMs}ms` : '—',
            status,
          ]);
        }

        console.log(table.toString());
        console.log('');
      }, opts);
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
    .option('--json', 'Output as JSON')
    .addHelpText('after', `
Examples:
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/mcp.ts
  $ hypercode mcp install @modelcontextprotocol/server-filesystem
  $ hypercode mcp install --pip mcp-server-sqlite
  $ hypercode mcp install --github anthropics/mcp-servers
=======
  $ borg mcp install @modelcontextprotocol/server-filesystem
  $ borg mcp install --pip mcp-server-sqlite
  $ borg mcp install --github anthropics/mcp-servers
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/mcp.ts
    `)
    .action(async (pkg, opts) => {
      await withMcpErrorHandling(
        () => unsupportedMcpCommand(`Live MCP install is unavailable for '${pkg}': the control plane does not expose a real install route for directory entries yet.`),
        opts,
      );
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
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/mcp.ts
    .option('-o, --output <file>', 'Output file path', 'hypercode-mcp-export.json')
=======
    .option('-o, --output <file>', 'Output file path', 'borg-mcp-export.json')
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/mcp.ts
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await withMcpErrorHandling(async () => {
        const editor = await queryTrpc<McpJsoncEditorRecord>('mcp.getJsoncEditor');
        writeFileSync(opts.output, editor.content, 'utf8');

        if (opts.json) {
          console.log(JSON.stringify({
            output: opts.output,
            sourcePath: editor.path,
            bytes: Buffer.byteLength(editor.content, 'utf8'),
          }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        console.log(chalk.green(`  ✓ Exported MCP config to ${opts.output}`));
        console.log(chalk.dim(`    Source: ${editor.path}`));
      }, opts);
    });

  mcp
    .command('import <file>')
    .description('Import MCP configuration from JSON file')
    .option('--merge', 'Merge with existing config instead of replacing')
    .option('--json', 'Output as JSON')
    .action(async (file, opts) => {
      await withMcpErrorHandling(async () => {
        if (opts.merge) {
          throw new Error('Live MCP config import does not yet support merge mode.');
        }

        const content = readFileSync(file, 'utf8');
        await queryTrpc<{ ok: boolean }>('mcp.saveJsoncEditor', { content });

        if (opts.json) {
          console.log(JSON.stringify({
            success: true,
            file,
            bytes: Buffer.byteLength(content, 'utf8'),
          }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        console.log(chalk.green(`  ✓ Imported MCP config from ${file}`));
      }, opts);
    });

  mcp
    .command('sync')
    .description('Auto-detect and sync MCP configs to all AI tools (Claude, Cursor, VS Code, etc.)')
    .option('--dry-run', 'Show what would be synced without writing')
    .option('--client <name>', 'Sync to specific client only')
    .option('--json', 'Output as JSON')
    .addHelpText('after', `
Supported clients:
  claude-desktop  Claude Desktop
  cursor          Cursor
  vscode          VS Code
    `)
    .action(async (opts) => {
      await withMcpErrorHandling(async () => {
        const requestedClient = opts.client ? parseSyncClient(String(opts.client)) : null;

        if (requestedClient) {
          const result = opts.dryRun
            ? await queryTrpc<McpClientConfigPreview>('mcpServers.exportClientConfig', { client: requestedClient })
            : await queryTrpc<McpClientConfigSyncResult>('mcpServers.syncClientConfig', { client: requestedClient });

          if (opts.json) {
            console.log(JSON.stringify({
              dryRun: Boolean(opts.dryRun),
              result,
            }, null, 2));
            return;
          }

          const chalk = (await import('chalk')).default;
          console.log(chalk.bold.cyan('\n  MCP Config Sync\n'));
          if (opts.dryRun) {
            console.log(chalk.yellow('  [DRY RUN] No changes were written\n'));
          }
          console.log(chalk.green(`  ✓ ${requestedClient} ${opts.dryRun ? 'previewed' : 'synced'}`));
          console.log(chalk.dim(`    Path: ${result.targetPath}`));
          console.log(chalk.dim(`    Existing file: ${result.existed ? 'yes' : 'no'}`));
          console.log(chalk.dim(`    MCP servers: ${result.serverCount}`));
          console.log('');
          return;
        }

        const targets = await queryTrpc<McpSyncTargetRecord[]>('mcpServers.syncTargets');
        const results = await Promise.all(targets.map((target) => (
          opts.dryRun
            ? queryTrpc<McpClientConfigPreview>('mcpServers.exportClientConfig', { client: parseSyncClient(target.client) })
            : queryTrpc<McpClientConfigSyncResult>('mcpServers.syncClientConfig', { client: parseSyncClient(target.client) })
        )));

        if (opts.json) {
          console.log(JSON.stringify({
            dryRun: Boolean(opts.dryRun),
            results,
          }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        const Table = (await import('cli-table3')).default;

        console.log(chalk.bold.cyan('\n  MCP Config Sync\n'));
        if (opts.dryRun) {
          console.log(chalk.yellow('  [DRY RUN] No changes were written\n'));
        }

        const table = new Table({
          head: ['Client', 'Path', 'Existing', 'Servers', 'Status'],
          style: { head: ['cyan'] },
          wordWrap: true,
          colWidths: [18, 56, 10, 10, 14],
        });

        for (const result of results) {
          const status = opts.dryRun
            ? 'previewed'
            : ('written' in result && result.written ? 'written' : 'skipped');
          table.push([
            result.client,
            result.targetPath,
            result.existed ? 'yes' : 'no',
            String(result.serverCount),
            status,
          ]);
        }

        console.log(table.toString());
        console.log('');
      }, opts);
    });
}
