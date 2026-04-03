/**
 * `hypercode config` - Configuration management
 *
 * View, set, and manage HyperCode configuration including
 * subsystem settings, secrets, and environment variables.
 */

import type { Command } from 'commander';
import { createInterface } from 'node:readline';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { queryTrpc, resolveControlPlaneLocation } from '../control-plane.js';
import { readCanonicalVersion } from '../version.js';

type ConfigEntry = {
  key: string;
  value: string;
};

type SecretEntry = {
  key: string;
  created_at?: string | number | Date;
  updated_at?: string | number | Date;
};

type SecretMutationResult = {
  success: boolean;
};

type ConfigResetResult = {
  success: boolean;
  section: string | null;
  removed: number;
  keys: string[];
};

type ConfigInitResult = {
  success: boolean;
  scope: 'global' | 'local';
  path: string;
};

function normalizeText(value: string | null | undefined): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '—';
}

function formatTimestamp(value: string | number | Date | undefined): string {
  if (typeof value === 'undefined' || value === null) {
    return '—';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toISOString();
}

function parseMaybeJson(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return '';
  }

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

function pickSection(grouped: Record<string, unknown>, section?: string): unknown {
  if (!section) {
    return grouped;
  }

  return grouped[section];
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

async function promptForSecretValue(key: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(`Secret '${key}' requires --value when stdin/stdout is not interactive`);
  }

  return await new Promise<string>((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`Enter secret value for ${key}: `, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function withConfigErrorHandling(
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

export function registerConfigCommand(program: Command): void {
  const commandDir = dirname(fileURLToPath(import.meta.url));
  const version = readCanonicalVersion(commandDir);

  const config = program
    .command('config')
    .alias('cfg')
    .description('Config — view and manage HyperCode configuration, secrets, and environment variables');

  config
    .command('show')
    .description('Display the current HyperCode configuration')
    .option('--json', 'Output as raw JSON')
    .option('--section <section>', 'Show specific section: server, mcp, memory, providers, sessions, director')
    .action(async (opts) => {
      await withConfigErrorHandling(async () => {
        const entries = await queryTrpc<ConfigEntry[]>('config.list');
        const grouped = {
          version,
          ...groupConfigEntries(entries),
        };
        const selected = pickSection(grouped, opts.section);

        if (typeof selected === 'undefined') {
          throw new Error(`Configuration section '${opts.section}' was not found`);
        }

        if (opts.json) {
          console.log(JSON.stringify(selected, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        console.log(chalk.bold.cyan('\n  HyperCode Configuration\n'));

        if (selected && typeof selected === 'object' && !Array.isArray(selected)) {
          printConfigObject(selected as Record<string, unknown>, chalk);
        } else {
          const label = opts.section ?? 'value';
          console.log(chalk.dim(`  ${label}: `) + JSON.stringify(selected));
        }
        console.log('');
      }, opts);
    });

  config
    .command('set <key> <value>')
    .description('Set a configuration value (dot-notation keys)')
    .option('--json', 'Output as JSON')
    .addHelpText('after', `
Examples:
  $ hypercode config set server.port 8080
  $ hypercode config set mcp.toonFormat true
  $ hypercode config set memory.primaryBackend sqlite
  $ hypercode config set director.enabled true
  $ hypercode config set logLevel debug
    `)
    .action(async (key, value, opts) => {
      await withConfigErrorHandling(async () => {
        await queryTrpc('config.update', { key, value });

        if (opts.json) {
          console.log(JSON.stringify({ ok: true, key, value }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        console.log(chalk.green(`  ✓ Set ${key} = ${value}`));
      }, opts);
    });

  config
    .command('get <key>')
    .description('Get a configuration value')
    .option('--json', 'Output as JSON')
    .action(async (key, opts) => {
      await withConfigErrorHandling(async () => {
        const value = await queryTrpc<string | null>('config.get', { key });

        if (value === null || typeof value === 'undefined') {
          throw new Error(`Configuration key '${key}' was not found`);
        }

        if (opts.json) {
          console.log(JSON.stringify({ key, value }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        console.log(chalk.dim(`  ${key}: `) + normalizeText(value));
      }, opts);
    });

  config
    .command('reset')
    .description('Reset configuration to defaults')
    .option('-f, --force', 'Skip confirmation')
    .option('--section <section>', 'Reset only a specific section')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await withConfigErrorHandling(async () => {
        const chalk = (await import('chalk')).default;
        const result = await queryTrpc<ConfigResetResult>('config.reset', {
          section: opts.section,
        });

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        const scope = result.section || 'all';
        console.log(chalk.green(`  ✓ Configuration reset (${scope})`));
        console.log(chalk.dim(`    Removed overrides: ${result.removed}`));
      }, opts);
    });

  config
    .command('secrets')
    .description('Manage secrets and environment variables')
    .option('--list', 'List all secrets (masked)')
    .option('--json', 'Output as JSON')
    .option('--set <key>', 'Set a secret value')
    .option('--value <value>', 'Secret value to use with --set')
    .option('--delete <key>', 'Delete a secret')
    .option('--env', 'Show environment variable sources')
    .addHelpText('after', `
Secrets are stored encrypted in ~/.hypercode/secrets.enc

Examples:
  $ hypercode config secrets --list
  $ hypercode config secrets --set OPENAI_API_KEY
  $ hypercode config secrets --delete GITHUB_TOKEN
  $ hypercode config secrets --env
    `)
    .action(async (opts) => {
      await withConfigErrorHandling(async () => {
        const chalk = (await import('chalk')).default;
        if (opts.list) {
          const secrets = await queryTrpc<SecretEntry[]>('secrets.list');

          if (opts.json) {
            console.log(JSON.stringify(secrets, null, 2));
            return;
          }

          console.log(chalk.bold.cyan('\n  Secrets (masked)\n'));
          if (secrets.length === 0) {
            console.log(chalk.dim('  No secrets configured.\n'));
            return;
          }

          const Table = (await import('cli-table3')).default;
          const table = new Table({
            head: ['Key', 'Updated', 'Created'],
            style: { head: ['cyan'] },
            wordWrap: true,
            colWidths: [36, 28, 28],
          });

          for (const secret of secrets) {
            table.push([
              secret.key,
              formatTimestamp(secret.updated_at),
              formatTimestamp(secret.created_at),
            ]);
          }

          console.log(table.toString());
          console.log('');
          return;
        }

        if (opts.set) {
          const value = typeof opts.value === 'string' ? opts.value : await promptForSecretValue(opts.set);
          const result = await queryTrpc<SecretMutationResult>('secrets.set', { key: opts.set, value });

          if (opts.json) {
            console.log(JSON.stringify({
              ok: result.success,
              key: opts.set,
            }, null, 2));
            return;
          }

          console.log(chalk.green(`  ✓ Secret '${opts.set}' set`));
        } else if (opts.delete) {
          const result = await queryTrpc<SecretMutationResult>('secrets.delete', { key: opts.delete });

          if (opts.json) {
            console.log(JSON.stringify({
              ok: result.success,
              key: opts.delete,
            }, null, 2));
            return;
          }

          console.log(chalk.green(`  ✓ Secret '${opts.delete}' deleted`));
        } else if (opts.env) {
          console.log(chalk.bold.cyan('\n  Environment Variable Sources\n'));
          console.log(chalk.dim('  .env files, system env, and encrypted secrets\n'));
        } else {
          console.log(chalk.dim('  Use --list, --set, --delete, or --env\n'));
        }
      }, opts);
    });

  config
    .command('init')
    .description('Initialize HyperCode configuration in current directory or globally')
    .option('--global', 'Initialize global config at ~/.hypercode/')
    .option('--local', 'Initialize local .hypercode/ config in current directory')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await withConfigErrorHandling(async () => {
        const chalk = (await import('chalk')).default;
        const scope = opts.global ? 'global' : 'local';
        const result = await queryTrpc<ConfigInitResult>('config.init', { scope });

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log(chalk.green(`  ✓ Configuration initialized (${result.scope})`));
        console.log(chalk.dim(`    Path: ${result.path}`));
      }, opts);
    });
}
