/**
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/provider.ts
 * `hypercode provider` - AI provider management
=======
 * `borg provider` - AI provider management
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/provider.ts
 *
 * Configure and manage AI model providers, API keys, OAuth logins,
 * quota tracking, and automatic model fallback chains.
 */

import type { Command } from 'commander';

import { queryTrpc, resolveControlPlaneLocation } from '../control-plane.js';

type SettingsProviderRecord = {
  id: string;
  name: string;
  envVar: string;
  configured: boolean;
  keyPreview?: string | null;
};

type BillingProviderQuota = {
  provider: string;
  name: string;
  configured: boolean;
  authenticated: boolean;
  authMethod: string;
  authTruth?: string | null;
  tier?: string | null;
  limit?: number | null;
  used?: number;
  remaining?: number | null;
  resetDate?: string | null;
  rateLimitRpm?: number | null;
  availability?: string;
  lastError?: string | null;
  quotaConfidence?: string;
  quotaRefreshedAt?: string | null;
};

type BillingFallbackEntry = {
  priority: number;
  provider: string;
  model?: string;
  reason?: string;
};

type BillingFallbackResponse = {
  selectedTaskType: string | null;
  chain: BillingFallbackEntry[];
};

type ProviderKeyMutationResult = {
  success: boolean;
  updatedKey?: string;
  removedKey?: string;
  removedAny?: boolean;
};

type BillingRoutingStrategy = 'cheapest' | 'best' | 'round-robin';

type BillingRoutingStrategyResult = {
  ok: boolean;
  strategy: BillingRoutingStrategy;
};

type BillingTaskRoutingStrategyResult = {
  ok: boolean;
  taskType: string;
  strategy: BillingRoutingStrategy;
};

function normalizeText(value: string | null | undefined): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '—';
}

function formatNumber(value: number | null | undefined): string {
  return typeof value === 'number' ? String(value) : '—';
}

function findProviderByName(
  providers: SettingsProviderRecord[],
  name: string,
): SettingsProviderRecord | undefined {
  const normalized = name.trim().toLowerCase();
  return providers.find((entry) => (
    entry.id.toLowerCase() === normalized || entry.name.toLowerCase() === normalized
  ));
}

async function withProviderErrorHandling(
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
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/provider.ts
      console.error(chalk.dim('  Start HyperCode with `hypercode start` or point HYPERCODE_TRPC_UPSTREAM at a live /trpc endpoint.'));
=======
      console.error(chalk.dim('  Start borg with `borg start` or point BORG_TRPC_UPSTREAM at a live /trpc endpoint.'));
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/provider.ts
    }
    process.exitCode = 1;
  }
}

function parseRoutingStrategy(value: string): BillingRoutingStrategy {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'cheapest' || normalized === 'best' || normalized === 'round-robin') {
    return normalized;
  }

  throw new Error(`Unsupported fallback strategy '${value}'. Supported strategies: cheapest, best, round-robin.`);
}

export function registerProviderCommand(program: Command): void {
  const provider = program
    .command('provider')
    .alias('prov')
    .description('Providers — manage AI providers, API keys, OAuth, quotas, and model fallback');

  provider
    .command('list')
    .description('List all configured providers with status and quota usage')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await withProviderErrorHandling(async () => {
        const [settingsProviders, quotas] = await Promise.all([
          queryTrpc<SettingsProviderRecord[]>('settings.getProviders'),
          queryTrpc<BillingProviderQuota[]>('billing.getProviderQuotas'),
        ]);

        const quotaMap = new Map(quotas.map((entry) => [entry.provider, entry]));
        const merged = settingsProviders.map((providerRecord) => {
          const quota = quotaMap.get(providerRecord.id);
          return {
            ...providerRecord,
            quota: quota ?? null,
          };
        });

        if (opts.json) {
          console.log(JSON.stringify({ providers: merged }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        const Table = (await import('cli-table3')).default;

        console.log(chalk.bold.cyan('\n  AI Providers\n'));
        if (merged.length === 0) {
          console.log(chalk.dim('  No provider data available.\n'));
          return;
        }

        const table = new Table({
          head: ['Provider', 'Configured', 'Authenticated', 'Auth', 'Used', 'Remaining', 'Preview'],
          style: { head: ['cyan'] },
          wordWrap: true,
          colWidths: [22, 12, 15, 16, 12, 12, 18],
        });

        for (const entry of merged) {
          table.push([
            `${entry.name}\n${chalk.dim(entry.id)}`,
            entry.configured ? chalk.green('yes') : chalk.dim('no'),
            entry.quota?.authenticated ? chalk.green('yes') : chalk.dim('no'),
            normalizeText(entry.quota?.authMethod),
            formatNumber(entry.quota?.used),
            formatNumber(entry.quota?.remaining),
            normalizeText(entry.keyPreview),
          ]);
        }

        console.log(table.toString());
        console.log('');
      }, opts);
    });

  provider
    .command('add <name>')
    .description('Add and configure a new AI provider')
    .option('-k, --api-key <key>', 'API key (or set via env var)')
    .option('--oauth', 'Use OAuth login flow (for subscription services)')
    .option('--base-url <url>', 'Custom API base URL')
    .option('--models <models...>', 'Enabled models for this provider')
    .option('--json', 'Output as JSON')
    .addHelpText('after', `
Supported providers:
  openai       OpenAI API (GPT-5, Codex, etc.)
  anthropic    Anthropic API (Claude Opus, Sonnet)
  google       Google AI API (Gemini Pro, Flash)
  xai          xAI API (Grok)
  deepseek     DeepSeek API
  mistral      Mistral API
  openrouter   OpenRouter (multi-provider gateway)
  copilot      GitHub Copilot (via OAuth/PAT)
  antigravity  Antigravity (via Google OAuth)
  local        Local models (Ollama, LM Studio, etc.)

OAuth-capable subscription services:
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/provider.ts
  $ hypercode provider add anthropic --oauth    # Claude Max/Pro subscription
  $ hypercode provider add google --oauth       # Google AI Plus subscription
  $ hypercode provider add copilot --oauth      # Copilot Premium Plus
  $ hypercode provider add openai --oauth       # ChatGPT Plus subscription
=======
  $ borg provider add anthropic --oauth    # Claude Max/Pro subscription
  $ borg provider add google --oauth       # Google AI Plus subscription
  $ borg provider add copilot --oauth      # Copilot Premium Plus
  $ borg provider add openai --oauth       # ChatGPT Plus subscription
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/provider.ts
    `)
    .action(async (name, opts) => {
      await withProviderErrorHandling(async () => {
        if (opts.oauth) {
          throw new Error('Live provider add does not yet support OAuth flows.');
        }
        if (opts.baseUrl) {
          throw new Error('Live provider add does not yet support custom base URLs.');
        }
        if (opts.models?.length) {
          throw new Error('Live provider add does not yet support model allowlists.');
        }
        if (!opts.apiKey) {
          throw new Error(`Live provider add requires --api-key for '${name}'.`);
        }

        const providers = await queryTrpc<SettingsProviderRecord[]>('settings.getProviders');
        const providerRecord = findProviderByName(providers, name);
        if (!providerRecord) {
          throw new Error(`Provider '${name}' was not found`);
        }

        const result = await queryTrpc<ProviderKeyMutationResult>('settings.updateProviderKey', {
          provider: providerRecord.id,
          key: opts.apiKey,
        });

        if (opts.json) {
          console.log(JSON.stringify({
            ok: result.success,
            provider: providerRecord.id,
            envVar: providerRecord.envVar,
          }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        console.log(chalk.green(`  ✓ Provider '${providerRecord.name}' configured`));
        console.log(chalk.dim(`    Env var: ${providerRecord.envVar}`));
      }, opts);
    });

  provider
    .command('remove <name>')
    .description('Remove a configured provider')
    .option('-f, --force', 'Skip confirmation')
    .option('--json', 'Output as JSON')
    .action(async (name, opts) => {
      await withProviderErrorHandling(async () => {
        const providers = await queryTrpc<SettingsProviderRecord[]>('settings.getProviders');
        const providerRecord = findProviderByName(providers, name);
        if (!providerRecord) {
          throw new Error(`Provider '${name}' was not found`);
        }

        const result = await queryTrpc<ProviderKeyMutationResult>('settings.removeProviderKey', {
          provider: providerRecord.id,
        });

        if (opts.json) {
          console.log(JSON.stringify({
            ok: result.success,
            provider: providerRecord.id,
            envVar: providerRecord.envVar,
            removedAny: result.removedAny ?? false,
          }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        console.log(chalk.green(`  ✓ Provider '${providerRecord.name}' removed`));
        console.log(chalk.dim(`    Env var: ${providerRecord.envVar}`));
      }, opts);
    });

  provider
    .command('quota')
    .description('Show quota and billing information for all providers')
    .option('--json', 'Output as JSON')
    .option('--provider <name>', 'Show quota for specific provider')
    .action(async (opts) => {
      await withProviderErrorHandling(async () => {
        const quotas = await queryTrpc<BillingProviderQuota[]>('billing.getProviderQuotas');
        const filtered = opts.provider
          ? quotas.filter((entry) => entry.provider.toLowerCase() === opts.provider.toLowerCase())
          : quotas;

        if (opts.json) {
          console.log(JSON.stringify({ providers: filtered }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        const Table = (await import('cli-table3')).default;

        console.log(chalk.bold.cyan('\n  Provider Quotas & Billing\n'));
        if (filtered.length === 0) {
          console.log(chalk.dim('  No matching provider quota data found.\n'));
          return;
        }

        const table = new Table({
          head: ['Provider', 'Tier', 'Used', 'Limit', 'Remaining', 'Availability', 'Reset'],
          style: { head: ['cyan'] },
          wordWrap: true,
          colWidths: [22, 14, 10, 10, 12, 18, 22],
        });

        for (const entry of filtered) {
          table.push([
            `${entry.name}\n${chalk.dim(entry.provider)}`,
            normalizeText(entry.tier),
            formatNumber(entry.used),
            formatNumber(entry.limit),
            formatNumber(entry.remaining),
            normalizeText(entry.availability),
            normalizeText(entry.resetDate),
          ]);
        }

        console.log(table.toString());
        console.log('');
      }, opts);
    });

  provider
    .command('test <name>')
    .description('Test connectivity and authentication for a provider')
    .option('--json', 'Output as JSON')
    .action(async (name, opts) => {
      await withProviderErrorHandling(async () => {
        const [settingsProviders, quotas] = await Promise.all([
          queryTrpc<SettingsProviderRecord[]>('settings.getProviders'),
          queryTrpc<BillingProviderQuota[]>('billing.getProviderQuotas'),
        ]);

        const normalizedName = name.trim().toLowerCase();
        const providerRecord = settingsProviders.find((entry) => (
          entry.id.toLowerCase() === normalizedName || entry.name.toLowerCase() === normalizedName
        ));
        const quota = quotas.find((entry) => (
          entry.provider.toLowerCase() === normalizedName || entry.name.toLowerCase() === normalizedName
        )) ?? null;

        if (!providerRecord && !quota) {
          throw new Error(`Provider '${name}' was not found`);
        }

        const payload = {
          provider: providerRecord ?? null,
          quota,
          reachable: quota?.availability === 'available',
          authenticated: quota?.authenticated ?? providerRecord?.configured ?? false,
        };

        if (opts.json) {
          console.log(JSON.stringify(payload, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        const label = providerRecord?.name ?? quota?.name ?? name;
        console.log(chalk.bold.cyan(`\n  Provider Check: ${label}\n`));
        console.log(chalk.dim('  Configured:     ') + ((providerRecord?.configured ?? quota?.configured) ? chalk.green('yes') : chalk.yellow('no')));
        console.log(chalk.dim('  Authenticated:  ') + ((quota?.authenticated ?? false) ? chalk.green('yes') : chalk.yellow('no')));
        console.log(chalk.dim('  Auth method:    ') + normalizeText(quota?.authMethod));
        console.log(chalk.dim('  Availability:   ') + normalizeText(quota?.availability));
        console.log(chalk.dim('  Tier:           ') + normalizeText(quota?.tier));
        console.log(chalk.dim('  Remaining:      ') + formatNumber(quota?.remaining));
        console.log(chalk.dim('  Last error:     ') + normalizeText(quota?.lastError));
        console.log('');
      }, opts);
    });

  provider
    .command('fallback')
    .description('Manage the automatic model fallback chain')
    .option('--show', 'Show current fallback chain')
    .option('--json', 'Output as JSON')
    .option('--set <models...>', 'Set fallback chain (ordered list)')
    .option('--task-type <type>', 'Show the fallback chain for a specific task type')
    .option('--strategy <strategy>', 'Routing strategy: cheapest, best, round-robin')
    .addHelpText('after', `
The fallback chain determines which model to use when the primary model's
quota is exhausted. Models are tried in order.

Examples:
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/provider.ts
  $ hypercode provider fallback --show
  $ hypercode provider fallback --set claude-opus-4 gpt-5.2 gemini-3-pro grok-4
  $ hypercode provider fallback --strategy cheapest
=======
  $ borg provider fallback --show
  $ borg provider fallback --set claude-opus-4 gpt-5.2 gemini-3-pro grok-4
  $ borg provider fallback --strategy cheapest
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/provider.ts
    `)
    .action(async (opts) => {
      await withProviderErrorHandling(async () => {
        const chalk = (await import('chalk')).default;

        if (opts.set?.length) {
          throw new Error('Live provider fallback --set is unavailable: the control plane does not expose a fallback-chain mutation route yet.');
        }

        if (opts.strategy) {
          const strategy = parseRoutingStrategy(String(opts.strategy));
          const result = opts.taskType
            ? await queryTrpc<BillingTaskRoutingStrategyResult>('billing.setTaskRoutingRule', {
              taskType: opts.taskType,
              strategy,
            })
            : await queryTrpc<BillingRoutingStrategyResult>('billing.setRoutingStrategy', { strategy });

          if (opts.json) {
            console.log(JSON.stringify(result, null, 2));
            return;
          }

          if ('taskType' in result) {
            console.log(chalk.green(`  ✓ Provider routing strategy for ${result.taskType} set to ${result.strategy}`));
            return;
          }

          console.log(chalk.green(`  ✓ Provider routing strategy set to ${result.strategy}`));
          return;
        }

        if (opts.show || !opts.set) {
          const fallback = await queryTrpc<BillingFallbackResponse>('billing.getFallbackChain', opts.taskType
            ? { taskType: opts.taskType }
            : undefined);

          if (opts.json) {
            console.log(JSON.stringify(fallback, null, 2));
            return;
          }

          console.log(chalk.bold.cyan('\n  Model Fallback Chain\n'));
          console.log(chalk.dim('  Task type: ') + normalizeText(fallback.selectedTaskType));

          if (fallback.chain.length === 0) {
            console.log(chalk.dim('  No fallback chain is currently configured.\n'));
            return;
          }

          const Table = (await import('cli-table3')).default;
          const table = new Table({
            head: ['Priority', 'Provider', 'Model', 'Reason'],
            style: { head: ['cyan'] },
            wordWrap: true,
            colWidths: [10, 18, 30, 28],
          });

          for (const entry of fallback.chain) {
            table.push([
              String(entry.priority),
              entry.provider,
              normalizeText(entry.model),
              normalizeText(entry.reason),
            ]);
          }

          console.log(table.toString());
          console.log('');
          return;
        }

        console.log(chalk.bold.cyan('\n  Model Fallback Chain\n'));
        console.log(chalk.dim('\n  Use --show to inspect the live fallback order.\n'));
      }, opts);
    });
}
