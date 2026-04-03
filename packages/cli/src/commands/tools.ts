/**
 * `hypercode tools` - Tool management
 *
 * Browse and search tools exposed through the HyperCode control plane.
 * Uses the live MCP inventory/search surfaces instead of placeholder output.
 */

import type { Command } from 'commander';

import { queryTrpc, resolveControlPlaneLocation } from '../control-plane.js';

type ListedTool = {
  name: string;
  description?: string;
  server?: string;
  serverDisplayName?: string;
  serverTags?: string[];
  toolTags?: string[];
  semanticGroup?: string;
  semanticGroupLabel?: string;
  advertisedName?: string;
  keywords?: string[];
  alwaysOn?: boolean;
};

type SearchedTool = ListedTool & {
  originalName?: string | null;
  loaded?: boolean;
  hydrated?: boolean;
  deferred?: boolean;
  requiresSchemaHydration?: boolean;
  matchReason?: string;
  score?: number;
  rank?: number;
  autoLoaded?: boolean;
};

type DetailedTool = {
  uuid: string;
  name: string;
  description?: string;
  server?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, {
      type?: string | string[];
      description?: string;
    }>;
    required?: string[];
  } | null;
  isDeferred?: boolean;
  schemaParamCount?: number;
  mcpServerUuid?: string;
  always_on?: boolean;
};

type ToolGroup = {
  uuid: string;
  name: string;
  description?: string | null;
  tools?: string[];
};

type ToolToggleResult = {
  success: boolean;
  tool: DetailedTool;
};

type ToolSetMutationResult = ToolGroup | { success: boolean };

function normalizeText(value: string | undefined | null): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '—';
}

function normalizeArray(values: string[] | undefined): string {
  return Array.isArray(values) && values.length > 0 ? values.join(', ') : '—';
}

function matchesOptionalFilter(value: string | undefined, filter: string | undefined): boolean {
  if (!filter) {
    return true;
  }

  return typeof value === 'string' && value.toLowerCase() === filter.toLowerCase();
}

function filterListedTools(tools: ListedTool[], opts: {
  server?: string;
  namespace?: string;
  enabled?: boolean;
  disabled?: boolean;
}): ListedTool[] {
  return tools.filter((tool) => {
    if (!matchesOptionalFilter(tool.server, opts.server)) {
      return false;
    }

    if (!matchesOptionalFilter(tool.semanticGroup, opts.namespace)) {
      return false;
    }

    if (opts.enabled && opts.disabled) {
      return true;
    }

    if (opts.enabled) {
      return Boolean(tool.alwaysOn);
    }

    if (opts.disabled) {
      return !tool.alwaysOn;
    }

    return true;
  });
}

function parseTopK(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    throw new Error('top-k must be a positive integer');
  }

  return parsed;
}

function getSchemaParamCount(tool: DetailedTool): number {
  if (typeof tool.schemaParamCount === 'number') {
    return tool.schemaParamCount;
  }

  return Object.keys(tool.inputSchema?.properties ?? {}).length;
}

function formatSchemaType(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value.join(' | ');
  }

  return value ?? 'unknown';
}

async function withToolsErrorHandling(
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
      console.error(chalk.dim('  Start HyperCode with `hypercode start` or point HYPERCODE_TRPC_UPSTREAM at a live /trpc endpoint.'));
    }
    process.exitCode = 1;
  }
}

function unsupportedToolsCommand(message: string): Promise<void> {
  return Promise.reject(new Error(message));
}

export function registerToolsCommand(program: Command): void {
  const tools = program
    .command('tools')
    .description('Tools — browse, search, enable/disable, and manage tool groups');

  tools
    .command('list')
    .description('List all available tools across all MCP servers')
    .option('--json', 'Output as JSON')
    .option('--server <name>', 'Filter by MCP server')
    .option('--namespace <ns>', 'Filter by semantic group / namespace')
    .option('--enabled', 'Show only always-on tools')
    .option('--disabled', 'Show only non-always-on tools')
    .action(async (opts) => {
      await withToolsErrorHandling(async () => {
        const toolsList = await queryTrpc<ListedTool[]>('mcp.listTools');
        const filtered = filterListedTools(toolsList, opts);

        if (opts.json) {
          console.log(JSON.stringify({ tools: filtered }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        const Table = (await import('cli-table3')).default;

        console.log(chalk.bold.cyan('\n  Available Tools\n'));
        if (filtered.length === 0) {
          console.log(chalk.dim('  No matching tools found.\n'));
          return;
        }

        const table = new Table({
          head: ['Tool', 'Server', 'Group', 'Always On', 'Keywords'],
          style: { head: ['cyan'] },
          wordWrap: true,
          colWidths: [28, 20, 22, 12, 36],
        });

        for (const tool of filtered) {
          table.push([
            `${tool.name}${tool.description ? `\n${chalk.dim(tool.description)}` : ''}`,
            normalizeText(tool.serverDisplayName ?? tool.server),
            normalizeText(tool.semanticGroupLabel ?? tool.semanticGroup),
            tool.alwaysOn ? chalk.green('yes') : chalk.dim('no'),
            normalizeArray(tool.keywords),
          ]);
        }

        console.log(table.toString());
        console.log('');
      }, opts);
    });

  tools
    .command('search <query>')
    .description('Semantic search for tools by natural language description')
    .option('-k, --top-k <count>', 'Number of results', '10')
    .option('--profile <profile>', 'Search profile hint (e.g. repo-coding, web-research, local-ops)')
    .option('--json', 'Output as JSON')
    .addHelpText('after', `
Examples:
  $ hypercode tools search "read and write files"
  $ hypercode tools search "run shell commands"
  $ hypercode tools search "search code semantically"
    `)
    .action(async (query, opts) => {
      await withToolsErrorHandling(async () => {
        const topK = parseTopK(opts.topK);
        const results = await queryTrpc<SearchedTool[]>('mcp.searchTools', {
          query,
          ...(opts.profile ? { profile: opts.profile } : {}),
        });
        const limited = results.slice(0, topK);

        if (opts.json) {
          console.log(JSON.stringify({ query, profile: opts.profile ?? null, results: limited }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        const Table = (await import('cli-table3')).default;

        console.log(chalk.bold.cyan(`\n  Tool Search: "${query}"\n`));
        if (limited.length === 0) {
          console.log(chalk.dim('  No matching tools found.\n'));
          return;
        }

        const table = new Table({
          head: ['Rank', 'Tool', 'Server', 'State', 'Why'],
          style: { head: ['cyan'] },
          wordWrap: true,
          colWidths: [8, 28, 20, 18, 46],
        });

        for (const tool of limited) {
          const state: string[] = [];
          if (tool.alwaysOn) state.push('always-on');
          if (tool.loaded) state.push('loaded');
          if (tool.hydrated) state.push('hydrated');
          if (tool.autoLoaded) state.push('auto-loaded');
          if (tool.requiresSchemaHydration) state.push('needs schema');
          if (tool.deferred) state.push('deferred');

          table.push([
            String(tool.rank ?? '—'),
            `${tool.name}${tool.description ? `\n${chalk.dim(tool.description)}` : ''}`,
            normalizeText(tool.serverDisplayName ?? tool.server),
            state.length > 0 ? state.join(', ') : chalk.dim('available'),
            normalizeText(tool.matchReason ?? (typeof tool.score === 'number' ? `score ${tool.score}` : null)),
          ]);
        }

        console.log(table.toString());
        console.log('');
      }, opts);
    });

  tools
    .command('enable <name>')
    .description('Enable a tool (make it available to AI models)')
    .option('--json', 'Output as JSON')
    .action(async (name, opts) => {
      await withToolsErrorHandling(async () => {
        const chalk = (await import('chalk')).default;
        const result = await queryTrpc<ToolToggleResult>('tools.setAlwaysOn', {
          uuid: name,
          alwaysOn: true,
        });

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log(chalk.green(`  ✓ Tool '${name}' enabled`));
      }, opts);
    });

  tools
    .command('disable <name>')
    .description('Disable a tool (hide from AI models)')
    .option('--json', 'Output as JSON')
    .action(async (name, opts) => {
      await withToolsErrorHandling(async () => {
        const chalk = (await import('chalk')).default;
        const result = await queryTrpc<ToolToggleResult>('tools.setAlwaysOn', {
          uuid: name,
          alwaysOn: false,
        });

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log(chalk.green(`  ✓ Tool '${name}' disabled`));
      }, opts);
    });

  tools
    .command('groups')
    .description('List and manage tool groups')
    .option('--json', 'Output as JSON')
    .option('--create <name>', 'Create a new tool group')
    .option('--delete <name>', 'Delete a tool group')
    .action(async (opts) => {
      await withToolsErrorHandling(async () => {
        const chalk = (await import('chalk')).default;
        if (opts.create) {
          const created = await queryTrpc<ToolSetMutationResult>('toolSets.create', {
            name: opts.create,
            description: null,
            tools: [],
          });

          if (opts.json) {
            console.log(JSON.stringify({ group: created }, null, 2));
            return;
          }

          console.log(chalk.green(`  ✓ Tool group '${opts.create}' created`));
          return;
        }
        if (opts.delete) {
          const deleted = await queryTrpc<ToolSetMutationResult>('toolSets.delete', {
            uuid: opts.delete,
          });

          if (opts.json) {
            console.log(JSON.stringify(deleted, null, 2));
            return;
          }

          console.log(chalk.green(`  ✓ Tool group '${opts.delete}' deleted`));
          return;
        }

        const groups = await queryTrpc<ToolGroup[]>('toolSets.list');

        if (opts.json) {
          console.log(JSON.stringify({ groups }, null, 2));
          return;
        }

        console.log(chalk.bold.cyan('\n  Tool Groups\n'));
        if (groups.length === 0) {
          console.log(chalk.dim('  No tool groups configured.\n'));
          return;
        }

        const Table = (await import('cli-table3')).default;
        const table = new Table({
          head: ['Name', 'Description', 'Tools', 'UUID'],
          style: { head: ['cyan'] },
          wordWrap: true,
          colWidths: [24, 44, 10, 40],
        });

        for (const group of groups) {
          table.push([
            normalizeText(group.name),
            normalizeText(group.description),
            Array.isArray(group.tools) ? String(group.tools.length) : '0',
            normalizeText(group.uuid),
          ]);
        }

        console.log(table.toString());
        console.log('');
      }, opts);
    });

  tools
    .command('info <name>')
    .description('Show detailed information about a specific tool')
    .option('--json', 'Output as JSON')
    .action(async (name, opts) => {
      await withToolsErrorHandling(async () => {
        const tool = await queryTrpc<DetailedTool | null>('tools.get', { uuid: name });
        if (!tool) {
          throw new Error(`Tool '${name}' was not found`);
        }

        if (opts.json) {
          console.log(JSON.stringify({ tool }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        const Table = (await import('cli-table3')).default;
        const properties = Object.entries(tool.inputSchema?.properties ?? {});
        const required = new Set(tool.inputSchema?.required ?? []);

        console.log(chalk.bold.cyan(`\n  Tool: ${tool.name}\n`));

        const summary = new Table({
          colWidths: [18, 72],
          wordWrap: true,
          style: { head: ['cyan'] },
        });

        summary.push(
          ['Description', normalizeText(tool.description)],
          ['Server', normalizeText(tool.server)],
          ['Always On', tool.always_on ? chalk.green('yes') : chalk.dim('no')],
          ['Deferred', tool.isDeferred ? chalk.yellow('yes') : chalk.dim('no')],
          ['Parameters', String(getSchemaParamCount(tool))],
          ['Server UUID', normalizeText(tool.mcpServerUuid)],
        );

        console.log(summary.toString());

        if (properties.length === 0) {
          console.log(chalk.dim('\n  No input schema properties available.\n'));
          return;
        }

        const schemaTable = new Table({
          head: ['Parameter', 'Type', 'Required', 'Description'],
          style: { head: ['cyan'] },
          wordWrap: true,
          colWidths: [24, 18, 12, 54],
        });

        for (const [propertyName, propertySchema] of properties) {
          schemaTable.push([
            propertyName,
            formatSchemaType(propertySchema?.type),
            required.has(propertyName) ? chalk.green('yes') : chalk.dim('no'),
            normalizeText(propertySchema?.description),
          ]);
        }

        console.log('\n' + schemaTable.toString());
        console.log('');
      }, opts);
    });

  tools
    .command('rename <oldName> <newName>')
    .description('Rename a tool (for context optimization)')
    .option('--json', 'Output as JSON')
    .action(async (oldName, newName, opts) => {
      await withToolsErrorHandling(
        () => unsupportedToolsCommand(`Live tool rename is unavailable for '${oldName}': the control plane does not expose a real tool-rename route yet.`),
        opts,
      );
    });
}
