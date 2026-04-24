/**
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/status.ts
 * `hypercode status` - Show system status overview
 *
 * Displays the current state of the HyperCode system including server status,
=======
 * `borg status` - Show system status overview
 *
 * Displays the current state of the borg system including server status,
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/status.ts
 * MCP servers, active sessions, and provider quotas.
 */

import type { Command } from 'commander';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { queryTrpc, resolveControlPlaneLocation } from '../control-plane.js';
import { readCanonicalVersion } from '../version.js';

type StartupStatusPayload = {
  status: string;
  ready: boolean;
  summary: string;
  uptime: number;
  runtime?: {
    version?: string | null;
  };
  checks?: {
    sectionedMemory?: {
      totalEntries?: number;
      sectionCount?: number;
    };
  };
};

type McpStatusPayload = {
  initialized: boolean;
  serverCount: number;
  toolCount: number;
  connectedCount: number;
};

type SessionRecord = {
  status?: string;
};

type ProviderQuotaRecord = {
  configured: boolean;
  authenticated: boolean;
};

function formatUptime(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || Number.isNaN(seconds) || seconds < 0) {
    return '—';
  }

  return `${Math.floor(seconds)}s`;
}

function withStatusColor(chalk: typeof import('chalk').default, ok: boolean): string {
  return ok ? chalk.green('● Ready') : chalk.yellow('◐ Degraded');
}

async function withStatusErrorHandling(
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
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/status.ts
      console.error(chalk.dim('  Start HyperCode with `hypercode start` or point HYPERCODE_TRPC_UPSTREAM at a live /trpc endpoint.'));
=======
      console.error(chalk.dim('  Start borg with `borg start` or point BORG_TRPC_UPSTREAM at a live /trpc endpoint.'));
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/status.ts
    }
    process.exitCode = 1;
  }
}

export function registerStatusCommand(program: Command): void {
  const commandDir = dirname(fileURLToPath(import.meta.url));
  const version = readCanonicalVersion(commandDir);

  program
    .command('status')
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/status.ts
    .description('Show HyperCode system status (server, MCP, sessions, memory, providers)')
    .option('--json', 'Output as JSON')
    .addHelpText('after', `
Examples:
  $ hypercode status          Show full system overview
  $ hypercode status --json   Machine-readable JSON output
=======
    .description('Show borg system status (server, MCP, sessions, memory, providers)')
    .option('--json', 'Output as JSON')
    .addHelpText('after', `
Examples:
  $ borg status          Show full system overview
  $ borg status --json   Machine-readable JSON output
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/status.ts
    `)
    .action(async (opts) => {
      await withStatusErrorHandling(async () => {
        const [startup, mcp, sessions, providers] = await Promise.all([
          queryTrpc<StartupStatusPayload>('startupStatus'),
          queryTrpc<McpStatusPayload>('mcp.getStatus'),
          queryTrpc<SessionRecord[]>('session.list'),
          queryTrpc<ProviderQuotaRecord[]>('billing.getProviderQuotas'),
        ]);

        const activeSessions = sessions.filter((session) => session.status === 'running' || session.status === 'active').length;
        const pausedSessions = sessions.filter((session) => session.status === 'paused').length;
        const configuredProviders = providers.filter((provider) => provider.configured).length;
        const authenticatedProviders = providers.filter((provider) => provider.authenticated).length;

        const status = {
          version: startup.runtime?.version ?? version,
          server: {
            status: startup.status,
            ready: startup.ready,
            uptime: startup.uptime,
            summary: startup.summary,
          },
          mcp: {
            initialized: mcp.initialized,
            servers: mcp.serverCount,
            connected: mcp.connectedCount,
            tools: mcp.toolCount,
          },
          sessions: {
            active: activeSessions,
            paused: pausedSessions,
            total: sessions.length,
          },
          memory: {
            entries: startup.checks?.sectionedMemory?.totalEntries ?? 0,
            sections: startup.checks?.sectionedMemory?.sectionCount ?? 0,
          },
          providers: {
            configured: configuredProviders,
            authenticated: authenticatedProviders,
            total: providers.length,
          },
        };

        if (opts.json) {
          console.log(JSON.stringify(status, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        const Table = (await import('cli-table3')).default;

<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/status.ts
        console.log(chalk.bold.cyan('\n  ⬡ HyperCode Status\n'));
=======
        console.log(chalk.bold.cyan('\n  ⬡ borg Status\n'));
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/status.ts

        const table = new Table({
          chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
          style: { head: ['cyan'], border: ['dim'] },
        });

        table.push(
          [chalk.bold('Component'), chalk.bold('Status'), chalk.bold('Details')],
          ['Server', withStatusColor(chalk, startup.ready), `Uptime: ${formatUptime(startup.uptime)} | ${startup.summary}`],
          ['MCP Router', withStatusColor(chalk, mcp.initialized), `Servers: ${mcp.serverCount} | Connected: ${mcp.connectedCount} | Tools: ${mcp.toolCount}`],
          ['Memory', chalk.green('● Active'), `Entries: ${status.memory.entries} | Sections: ${status.memory.sections}`],
          ['Sessions', activeSessions > 0 ? chalk.green('● Active') : chalk.dim('○ Idle'), `Active: ${activeSessions} | Paused: ${pausedSessions} | Total: ${sessions.length}`],
          ['Providers', configuredProviders > 0 ? chalk.green('● Configured') : chalk.dim('○ None'), `Configured: ${configuredProviders} | Authenticated: ${authenticatedProviders}`],
        );

        console.log(table.toString());
        console.log('');
      }, opts);
    });
}
