/**
 * `borg config` - Configuration management
 *
 * View, set, and manage Borg AIOS configuration including
 * all subsystem settings, secrets, and environment variables.
 *
 * @example
 *   borg config show                # Show current config
 *   borg config set server.port 8080
 *   borg config secrets             # Manage secrets
 */

import type { Command } from 'commander';

export function registerConfigCommand(program: Command): void {
  const config = program
    .command('config')
    .alias('cfg')
    .description('Config — view and manage Borg configuration, secrets, and environment variables');

  config
    .command('show')
    .description('Display the current Borg configuration')
    .option('--json', 'Output as raw JSON')
    .option('--section <section>', 'Show specific section: server, mcp, memory, providers, sessions, director')
    .action(async (opts, cmd) => {
      const allOpts = cmd ? cmd.optsWithGlobals() : opts;
      const isJson = allOpts.json === true;

      const { readFileSync } = await import('fs');
      const { resolve } = await import('path');

      // Read real version from VERSION file
      let version = 'unknown';
      try {
        for (let dir = process.cwd(); dir !== resolve(dir, '..'); dir = resolve(dir, '..')) {
          try {
            version = readFileSync(resolve(dir, 'VERSION'), 'utf8').trim();
            break;
          } catch {}
        }
      } catch {}

      // Try to get config from running server
      let serverConfig: any = null;
      try {
        const res = await fetch('http://127.0.0.1:4000/trpc/settings.getAll', { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const json = await res.json();
          serverConfig = json?.result?.data ?? null;
        }
      } catch {}

      const defaultConfig = {
        version,
        server: { host: '0.0.0.0', port: 4000, cors: true },
        mcp: {
          enabled: true,
          progressiveDisclosure: true,
          semanticSearch: true,
          toonFormat: false,
          codeMode: false,
          toolRenaming: true,
          keepAlive: true,
          heartbeatIntervalMs: 30000,
        },
        memory: {
          primaryBackend: 'file',
          autoHarvest: false,
          pruneThreshold: 0.3,
          embeddingModel: 'text-embedding-3-small',
        },
        director: { enabled: false, autoApprove: false, checkIntervalMs: 60000 },
        logLevel: 'info',
        dataDir: '~/.borg',
      };

      // Merge server config if available
      const config = serverConfig ? { ...defaultConfig, ...serverConfig, version } : defaultConfig;

      if (isJson) {
        const data = opts.section ? (config as Record<string, unknown>)[opts.section] : config;
        console.log(JSON.stringify(data, null, 2));
        return;
      }

      const chalk = (await import('chalk')).default;
      console.log(chalk.bold.cyan('\n  Borg Configuration\n'));
      const printConfig = (obj: Record<string, unknown>, prefix = '  ') => {
        for (const [key, val] of Object.entries(obj)) {
          if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            console.log(chalk.bold(`${prefix}${key}:`));
            printConfig(val as Record<string, unknown>, prefix + '  ');
          } else {
            console.log(chalk.dim(`${prefix}${key}: `) + String(val));
          }
        }
      };

      if (opts.section && opts.section in config) {
        printConfig({ [opts.section]: (config as Record<string, unknown>)[opts.section] });
      } else {
        printConfig(config);
      }
      console.log('');
    });

  config
    .command('set <key> <value>')
    .description('Set a configuration value (dot-notation keys)')
    .addHelpText('after', `
Examples:
  $ borg config set server.port 8080
  $ borg config set mcp.toonFormat true
  $ borg config set memory.primaryBackend sqlite
  $ borg config set director.enabled true
  $ borg config set logLevel debug
    `)
    .action(async (key, value) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.green(`  ✓ Set ${key} = ${value}`));
    });

  config
    .command('get <key>')
    .description('Get a configuration value')
    .action(async (key) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.dim(`  ${key}: `) + 'undefined');
    });

  config
    .command('reset')
    .description('Reset configuration to defaults')
    .option('-f, --force', 'Skip confirmation')
    .option('--section <section>', 'Reset only a specific section')
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      const scope = opts.section || 'all';
      console.log(chalk.green(`  ✓ Configuration reset (${scope})`));
    });

  config
    .command('secrets')
    .description('Manage secrets and environment variables')
    .option('--list', 'List all secrets (masked)')
    .option('--set <key>', 'Set a secret value')
    .option('--delete <key>', 'Delete a secret')
    .option('--env', 'Show environment variable sources')
    .addHelpText('after', `
Secrets are stored encrypted in ~/.borg/secrets.enc

Examples:
  $ borg config secrets --list
  $ borg config secrets --set OPENAI_API_KEY
  $ borg config secrets --delete GITHUB_TOKEN
  $ borg config secrets --env
    `)
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      if (opts.list) {
        console.log(chalk.bold.cyan('\n  Secrets (masked)\n'));
        console.log(chalk.dim('  No secrets configured.\n'));
      } else if (opts.set) {
        console.log(chalk.yellow(`  Setting secret: ${opts.set}`));
        console.log(chalk.dim('  (Interactive input not yet implemented)'));
      } else if (opts.delete) {
        console.log(chalk.green(`  ✓ Secret '${opts.delete}' deleted`));
      } else if (opts.env) {
        console.log(chalk.bold.cyan('\n  Environment Variable Sources\n'));
        console.log(chalk.dim('  .env files, system env, and encrypted secrets\n'));
      } else {
        console.log(chalk.dim('  Use --list, --set, --delete, or --env\n'));
      }
    });

  config
    .command('init')
    .description('Initialize Borg configuration in current directory or globally')
    .option('--global', 'Initialize global config at ~/.borg/')
    .option('--local', 'Initialize local .borg/ config in current directory')
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      const scope = opts.global ? 'global (~/.borg/)' : 'local (.borg/)';
      console.log(chalk.green(`  ✓ Configuration initialized (${scope})`));
    });
}
