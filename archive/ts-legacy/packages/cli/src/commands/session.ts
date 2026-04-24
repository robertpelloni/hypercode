/**
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.ts
 * `hypercode session` - Development session management
=======
 * `borg session` - Development session management
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.ts
 *
 * Track, manage, and control development sessions across local
 * and cloud environments with auto-restart and export capabilities.
 *
 * @example
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.ts
 *   hypercode session list               # List all sessions
 *   hypercode session start ./my-project  # Start new session
 *   hypercode session export sess_123     # Export session history
=======
 *   borg session list               # List all sessions
 *   borg session start ./my-project  # Start new session
 *   borg session export sess_123     # Export session history
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.ts
 */

import type { Command } from 'commander';
import { readFileSync, writeFileSync } from 'node:fs';
import {
  CLI_HARNESSES,
  PRIMARY_CLI_HARNESS,
  formatCliHarnessHelpLines,
  formatCliHarnessList,
  resolveCliHarnessDefinition,
  resolveCliHarnessDefinitions,
  summarizeCliHarnessParity,
} from '../harnesses.js';
import { queryTrpc, resolveControlPlaneLocation } from '../control-plane.js';

type LocalSessionRecord = {
  id: string;
  name: string;
  cliType: string;
  workingDirectory: string;
  status: string;
  lastActivityAt: number;
  metadata?: Record<string, unknown>;
};

type CloudSessionRecord = {
  id: string;
  provider: string;
  projectName: string;
  task: string;
  status: string;
  updatedAt: string;
};

type CloudProviderRecord = {
  provider: string;
  name: string;
  enabled: boolean;
  hasApiKey?: boolean;
};

type CloudStatsRecord = {
  totalSessions: number;
  byProvider: Record<string, number>;
  byStatus: Record<string, number>;
  totalMessages: number;
  totalLogs: number;
  providers: number;
  enabledProviders: number;
};

type ListedSession = {
  source: 'local' | 'cloud';
  id: string;
  name: string;
  location: string;
  harness: string;
  model: string | null;
  status: string;
  lastActivity: number | string;
  active: boolean;
};

type SessionCreateInput = {
  name?: string;
  cliType: string;
  workingDirectory: string;
  autoRestart?: boolean;
  metadata?: Record<string, unknown>;
};

type SessionRecord = {
  id: string;
  name?: string | null;
  cliType: string;
  workingDirectory: string;
  status?: string;
  metadata?: Record<string, unknown>;
};

type SessionExportResult = {
  id: string;
  format: string;
  package: unknown;
};

type SessionImportResult = {
  imported: number;
  skipped: number;
  merged: number;
  errors: string[];
  dryRun: boolean;
  details: Array<{
    sessionId: string;
    action: 'imported' | 'merged' | 'skipped' | 'error';
    reason?: string;
  }>;
};

type CloudBroadcastResult = {
  delivered: number;
  skipped: number;
  results: Array<{
    sessionId: string;
    messageId: string;
    status: string;
  }>;
  skippedByReason: Record<string, number>;
  skippedSessionIds: string[];
  skippedSessions: Array<{
    id: string;
    provider: string;
    projectName: string;
    status: string;
    reason: string;
  }>;
  skippedSessionsSampled: boolean;
};

function normalizeText(value: string | null | undefined): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '—';
}

function extractSessionModel(metadata: Record<string, unknown> | undefined): string | null {
  if (!metadata) {
    return null;
  }

  const candidates = ['model', 'modelName', 'modelHint', 'provider'];
  for (const key of candidates) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function isLocalSessionActive(status: string): boolean {
  return ['starting', 'running', 'stopping', 'restarting'].includes(status);
}

function isCloudSessionActive(status: string): boolean {
  return ['pending', 'active', 'awaiting_approval'].includes(status);
}

function toActivityTimestamp(value: number | string): number {
  if (typeof value === 'number') {
    return value;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatLastActivity(value: number | string): string {
  const timestamp = toActivityTimestamp(value);
  if (timestamp <= 0) {
    return '—';
  }

  return new Date(timestamp).toISOString();
}

async function withSessionErrorHandling(
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
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.ts
      console.error(chalk.dim('  Start HyperCode with `hypercode start` or point HYPERCODE_TRPC_UPSTREAM at a live /trpc endpoint.'));
=======
      console.error(chalk.dim('  Start borg with `borg start` or point BORG_TRPC_UPSTREAM at a live /trpc endpoint.'));
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.ts
    }
    process.exitCode = 1;
  }
}

function unsupportedSessionCommand(message: string): Promise<void> {
  return Promise.reject(new Error(message));
}

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
      await withSessionErrorHandling(async () => {
        const [localSessions, cloudSessions] = await Promise.all([
          opts.cloud ? Promise.resolve([] as LocalSessionRecord[]) : queryTrpc<LocalSessionRecord[]>('session.list'),
          queryTrpc<CloudSessionRecord[]>('cloudDev.listSessions'),
        ]);

        const normalized: ListedSession[] = [
          ...localSessions.map((entry) => ({
            source: 'local' as const,
            id: entry.id,
            name: entry.name,
            location: entry.workingDirectory,
            harness: entry.cliType,
            model: extractSessionModel(entry.metadata),
            status: entry.status,
            lastActivity: entry.lastActivityAt,
            active: isLocalSessionActive(entry.status),
          })),
          ...cloudSessions.map((entry) => ({
            source: 'cloud' as const,
            id: entry.id,
            name: entry.projectName,
            location: entry.task,
            harness: entry.provider,
            model: null,
            status: entry.status,
            lastActivity: entry.updatedAt,
            active: isCloudSessionActive(entry.status),
          })),
        ]
          .filter((entry) => (opts.cloud ? entry.source === 'cloud' : true))
          .filter((entry) => (opts.active ? entry.active : true))
          .sort((left, right) => toActivityTimestamp(right.lastActivity) - toActivityTimestamp(left.lastActivity));

        if (opts.json) {
          console.log(JSON.stringify({
            sessions: normalized.map(({ active, ...entry }) => entry),
          }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        const Table = (await import('cli-table3')).default;
        const table = new Table({
          head: ['ID', 'Name', 'Workspace / Task', 'Harness / Provider', 'Model', 'Status', 'Last Activity'],
          style: { head: ['cyan'] },
          wordWrap: true,
          colWidths: [18, 22, 34, 20, 18, 16, 26],
        });

        console.log(chalk.bold.cyan('\n  Development Sessions\n'));
        if (normalized.length === 0) {
          const emptyMessage = opts.cloud
            ? '  No matching cloud sessions found.\n'
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.ts
            : '  No matching sessions found. Use `hypercode session start` or `hypercode session cloud` to create one.\n';
=======
            : '  No matching sessions found. Use `borg session start` or `borg session cloud` to create one.\n';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.ts
          console.log(chalk.dim(emptyMessage));
          return;
        }

        for (const entry of normalized) {
          table.push([
            `${entry.id}\n${chalk.dim(entry.source)}`,
            entry.name,
            entry.location,
            entry.harness,
            normalizeText(entry.model),
            entry.active ? chalk.green(entry.status) : chalk.dim(entry.status),
            formatLastActivity(entry.lastActivity),
          ]);
        }

        console.log(table.toString());
        console.log('');
      }, opts);
    });

  session
    .command('harnesses')
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.ts
    .description('List HyperCode-supported CLI harness identities and maturity')
=======
    .description('List borg-supported CLI harness identities and maturity')
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.ts
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
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.ts
      console.log(chalk.dim(`  Source-backed: ${parity.sourceBackedHarnessCount}/${parity.totalHarnesses} harnesses, ${parity.sourceBackedToolCount} enumerated HyperCode tool calls`));
=======
      console.log(chalk.dim(`  Source-backed: ${parity.sourceBackedHarnessCount}/${parity.totalHarnesses} harnesses, ${parity.sourceBackedToolCount} enumerated borg tool calls`));
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.ts
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
    .option('--json', 'Output as JSON')
    .option('--auto-restart', 'Auto-restart on crash', true)
    .option('--supervisor', 'Enable supervisor mode')
    .addHelpText('after', `
Examples:
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.ts
  $ hypercode session start ./my-app
  $ hypercode session start ./my-app --harness hypercode
  $ hypercode session start ./my-app --harness claude --model claude-opus-4
  $ hypercode session start ./my-app --supervisor --auto-restart
=======
  $ borg session start ./my-app
  $ borg session start ./my-app --harness borg
  $ borg session start ./my-app --harness claude --model claude-opus-4
  $ borg session start ./my-app --supervisor --auto-restart
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.ts

Harnesses:
    ${formatCliHarnessHelpLines()}
    `)
    .action(async (workdir, opts) => {
      await withSessionErrorHandling(async () => {
        const chalk = (await import('chalk')).default;
        const definition = resolveCliHarnessDefinition(opts.harness);
        if (!definition) {
          throw new Error(`Unknown harness '${opts.harness}'. Supported harnesses: ${formatCliHarnessList()}`);
        }

        const metadata: Record<string, unknown> = {};
        if (opts.model) {
          metadata.model = opts.model;
        }
        if (opts.provider) {
          metadata.provider = opts.provider;
        }
        if (opts.supervisor) {
          metadata.supervisor = true;
        }
        if (definition.maturity) {
          metadata.harnessMaturity = definition.maturity;
        }
        if (definition.primary) {
          metadata.harnessRole = 'primary';
        }

        const createInput: SessionCreateInput = {
          name: opts.name,
          cliType: opts.harness,
          workingDirectory: workdir,
          autoRestart: opts.autoRestart,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        };

        const created = await queryTrpc<SessionRecord>('session.create', createInput);
        const started = await queryTrpc<SessionRecord>('session.start', { id: created.id });

        if (opts.json) {
          console.log(JSON.stringify({
            session: started,
            harness: definition.id,
            maturity: definition.maturity,
            launchCommand: definition.launchCommand ?? null,
            toolInventorySource: definition.toolInventorySource ?? null,
          }, null, 2));
          return;
        }

        console.log(chalk.green(`  ✓ Session started: ${started.id}`));
        console.log(chalk.dim(`    Workdir:  ${started.workingDirectory || workdir}`));
        console.log(chalk.dim(`    Harness:  ${started.cliType || opts.harness}`));
        console.log(chalk.dim(`    Status:   ${normalizeText(started.status)}`));
        console.log(chalk.dim(`    Maturity: ${definition.maturity}`));
        console.log(chalk.dim(`    Model:    ${opts.model || extractSessionModel(started.metadata) || 'auto'}`));
        console.log(chalk.dim(`    Restart:  ${opts.autoRestart ? 'enabled' : 'disabled'}`));
        if (definition.primary) {
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.ts
          console.log(chalk.cyan('    Role:     primary HyperCode CLI harness lane'));
=======
          console.log(chalk.cyan('    Role:     primary borg CLI harness lane'));
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.ts
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
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/session.ts
          console.log(chalk.dim(`    Tools:    ${definition.toolCallCount} source-backed HyperCode tool calls`));
=======
          console.log(chalk.dim(`    Tools:    ${definition.toolCallCount} source-backed borg tool calls`));
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/session.ts
        }
        if (definition.toolInventorySource) {
          console.log(chalk.dim(`    Source:   ${definition.toolInventorySource}`));
        }
        if (definition.parityNotes) {
          console.log(chalk.dim(`    Notes:    ${definition.parityNotes}`));
        }
      }, opts);
    });

  session
    .command('stop <id>')
    .description('Stop a running session')
    .option('-f, --force', 'Force stop')
    .option('--json', 'Output as JSON')
    .action(async (id, opts) => {
      await withSessionErrorHandling(async () => {
        const chalk = (await import('chalk')).default;
        const stopped = await queryTrpc<SessionRecord>('session.stop', {
          id,
          force: opts.force || undefined,
        });

        if (opts.json) {
          console.log(JSON.stringify({
            session: stopped,
          }, null, 2));
          return;
        }

        console.log(chalk.green(`  ✓ Session '${stopped.id}' stop requested`));
        console.log(chalk.dim(`    Status:   ${normalizeText(stopped.status)}`));
        console.log(chalk.dim(`    Harness:  ${normalizeText(stopped.cliType)}`));
        console.log(chalk.dim(`    Workdir:  ${normalizeText(stopped.workingDirectory)}`));
      }, opts);
    });

  session
    .command('resume <id>')
    .description('Resume a paused or stopped session')
    .option('--json', 'Output as JSON')
    .action(async (id, opts) => {
      await withSessionErrorHandling(async () => {
        const chalk = (await import('chalk')).default;
        const resumed = await queryTrpc<SessionRecord>('session.restart', { id });

        if (opts.json) {
          console.log(JSON.stringify({
            session: resumed,
          }, null, 2));
          return;
        }

        console.log(chalk.green(`  ✓ Session '${resumed.id}' resume requested`));
        console.log(chalk.dim(`    Status:   ${normalizeText(resumed.status)}`));
        console.log(chalk.dim(`    Harness:  ${normalizeText(resumed.cliType)}`));
        console.log(chalk.dim(`    Workdir:  ${normalizeText(resumed.workingDirectory)}`));
      }, opts);
    });

  session
    .command('pause <id>')
    .description('Pause a running session (preserves state)')
    .option('--json', 'Output as JSON')
    .action(async (id, opts) => {
      await withSessionErrorHandling(
        () => unsupportedSessionCommand(`Live session pause is unavailable for '${id}': the control plane does not expose a real pause route yet.`),
        opts,
      );
    });

  session
    .command('export <id>')
    .description('Export session history, messages, and metadata')
    .option('-f, --format <format>', 'Export format: json, markdown', 'json')
    .option('-o, --output <file>', 'Output file path')
    .option('--json', 'Output as JSON')
    .action(async (id, opts) => {
      await withSessionErrorHandling(async () => {
        const chalk = (await import('chalk')).default;
        const result = await queryTrpc<SessionExportResult>('sessionExport.export', {
          format: opts.format,
          sessionIds: [id],
        });

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        const file = opts.output || `session-${id}-export.${opts.format}`;
        writeFileSync(file, `${JSON.stringify(result.package, null, 2)}\n`, 'utf8');
        console.log(chalk.green(`  ✓ Session '${id}' exported to ${file}`));
      }, opts);
    });

  session
    .command('import <file>')
    .description('Import a session from exported file')
    .option('--dry-run', 'Preview import results without applying them')
    .option('--replace', 'Replace instead of merging with existing sessions')
    .option('--source-environment <name>', 'Label the import source environment')
    .option('--json', 'Output as JSON')
    .action(async (file, opts) => {
      await withSessionErrorHandling(async () => {
        const chalk = (await import('chalk')).default;
        const data = readFileSync(file, 'utf8');
        const result = await queryTrpc<SessionImportResult>('sessionExport.import', {
          data,
          dryRun: Boolean(opts.dryRun),
          merge: !opts.replace,
          sourceEnvironment: opts.sourceEnvironment,
        });

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log(chalk.green(`  ✓ Session import processed from ${file}`));
        console.log(chalk.dim(`    Imported: ${result.imported}`));
        console.log(chalk.dim(`    Merged:   ${result.merged}`));
        console.log(chalk.dim(`    Skipped:  ${result.skipped}`));
        console.log(chalk.dim(`    Dry run:  ${result.dryRun ? 'yes' : 'no'}`));

        if (result.errors.length > 0) {
          console.log(chalk.yellow('\n  Import errors:'));
          for (const error of result.errors) {
            console.log(chalk.yellow(`    - ${error}`));
          }
        }
      }, opts);
    });

  session
    .command('broadcast <message>')
    .description('Send a message to all active sessions')
    .option('--cloud', 'Include cloud dev sessions')
    .option('--force', 'Include terminal cloud sessions')
    .option('--json', 'Output as JSON')
    .action(async (message, opts) => {
      await withSessionErrorHandling(async () => {
        if (!opts.cloud) {
          throw new Error('Live local session broadcast is unavailable: only cloud session broadcast is currently wired. Re-run with --cloud to use the live cloudDev.broadcastMessage route.');
        }

        const result = await queryTrpc<CloudBroadcastResult>('cloudDev.broadcastMessage', {
          content: message,
          force: Boolean(opts.force),
        });

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        console.log(chalk.green(`  ✓ Broadcast delivered to ${result.delivered} cloud session${result.delivered === 1 ? '' : 's'}`));
        console.log(chalk.dim(`    Skipped: ${result.skipped}`));

        if (result.skipped > 0 && Object.keys(result.skippedByReason).length > 0) {
          console.log(chalk.dim(`    Reasons: ${Object.entries(result.skippedByReason).map(([reason, count]) => `${reason}=${count}`).join(', ')}`));
        }
      }, opts);
    });

  session
    .command('cloud')
    .description('Manage cloud development sessions (Jules, Devin, Codex)')
    .option('--list', 'List cloud sessions')
    .option('--json', 'Output as JSON')
    .option('--transfer <id>', 'Transfer local session to cloud')
    .action(async (opts) => {
      await withSessionErrorHandling(async () => {
        if (opts.transfer) {
          throw new Error(`Live cloud transfer is unavailable for '${opts.transfer}': the control plane does not expose a real local-to-cloud transfer route yet.`);
        }

        const [providers, sessions, stats] = await Promise.all([
          queryTrpc<CloudProviderRecord[]>('cloudDev.listProviders'),
          queryTrpc<CloudSessionRecord[]>('cloudDev.listSessions'),
          queryTrpc<CloudStatsRecord>('cloudDev.stats'),
        ]);

        if (opts.json) {
          console.log(JSON.stringify({ providers, sessions, stats }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        const Table = (await import('cli-table3')).default;

        console.log(chalk.bold.cyan('\n  Cloud Dev Sessions\n'));
        console.log(chalk.dim(`  Providers: ${stats.enabledProviders}/${stats.providers} enabled | Sessions: ${stats.totalSessions} | Messages: ${stats.totalMessages} | Logs: ${stats.totalLogs}\n`));

        if (providers.length > 0) {
          const providersTable = new Table({
            head: ['Provider', 'Enabled', 'API Key'],
            style: { head: ['cyan'] },
            colWidths: [28, 12, 12],
          });

          for (const provider of providers) {
            providersTable.push([
              `${provider.name}\n${chalk.dim(provider.provider)}`,
              provider.enabled ? chalk.green('yes') : chalk.dim('no'),
              provider.hasApiKey ? chalk.green('yes') : chalk.dim('no'),
            ]);
          }

          console.log(providersTable.toString());
          console.log('');
        }

        if (sessions.length === 0) {
          console.log(chalk.dim('  No cloud sessions found.\n'));
          return;
        }

        const sessionsTable = new Table({
          head: ['ID', 'Project', 'Provider', 'Status', 'Last Update'],
          style: { head: ['cyan'] },
          wordWrap: true,
          colWidths: [18, 28, 18, 20, 28],
        });

        for (const entry of sessions) {
          const active = isCloudSessionActive(entry.status);
          sessionsTable.push([
            entry.id,
            `${entry.projectName}\n${chalk.dim(entry.task)}`,
            entry.provider,
            active ? chalk.green(entry.status) : chalk.dim(entry.status),
            formatLastActivity(entry.updatedAt),
          ]);
        }

        console.log(sessionsTable.toString());
        console.log('');
      }, opts);
    });
}
