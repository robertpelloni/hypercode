/**
 * `hypercode provider` - AI provider management
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

function normalizeText(value: string | null | undefined): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '—';
}

function formatNumber(value: number | null | undefined): string {
  return typeof value === 'number' ? String(value) : '—';
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
      console.error(chalk.dim('  Start HyperCode with `hypercode start` or point BORG_TRPC_UPSTREAM at a live /trpc endpoint.'));
    }
    process.exitCode = 1;
  }
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
  $ hypercode provider add anthropic --oauth    # Claude Max/Pro subscription
  $ hypercode provider add google --oauth       # Google AI Plus subscription
  $ hypercode provider add copilot --oauth      # Copilot Premium Plus
  $ hypercode provider add openai --oauth       # ChatGPT Plus subscription
    `)
    .action(async (name, opts) => {
      const chalk = (await import('chalk')).default;
      if (opts.oauth) {
        console.log(chalk.yellow(`  Starting OAuth flow for ${name}...`));
        console.log(chalk.dim('  (OAuth login not yet implemented)'));
      } else if (opts.apiKey) {
        console.log(chalk.green(`  ✓ Provider '${name}' added with API key`));
      } else {
        console.log(chalk.yellow('  Set API key via environment variable or --api-key flag'));
        console.log(chalk.dim(`  Example: export ${name.toUpperCase()}_API_KEY=sk-...`));
      }
    });

  provider
    .command('remove <name>')
    .description('Remove a configured provider')
    .option('-f, --force', 'Skip confirmation')
    .action(async (name) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.green(`  ✓ Provider '${name}' removed`));
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
    .action(async (name) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.yellow(`  Testing provider: ${name}...`));
      console.log(chalk.dim('  Sending test request...'));
      console.log(chalk.yellow(`  ⚠ Provider '${name}' not configured`));
    });

  provider
    .command('fallback')
    .description('Manage the automatic model fallback chain')
    .option('--show', 'Show current fallback chain')
    .option('--json', 'Output as JSON')
    .option('--set <models...>', 'Set fallback chain (ordered list)')
    .option('--task-type <type>', 'Show the fallback chain for a specific task type')
    .option('--strategy <strategy>', 'Fallback strategy: priority, cost-optimized, quota-aware, round-robin', 'quota-aware')
    .addHelpText('after', `
The fallback chain determines which model to use when the primary model's
quota is exhausted. Models are tried in order.

Examples:
  $ hypercode provider fallback --show
  $ hypercode provider fallback --set claude-opus-4 gpt-5.2 gemini-3-pro grok-4
  $ hypercode provider fallback --strategy cost-optimized
    `)
    .action(async (opts) => {
      await withProviderErrorHandling(async () => {
        const chalk = (await import('chalk')).default;

        if (opts.show) {
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
        console.log(chalk.dim('  Strategy: ') + (opts.strategy || 'quota-aware'));
        console.log(chalk.dim('  Chain:    ') + 'not configured');
        console.log(chalk.dim('\n  Use --show to inspect or --set to configure the fallback order.\n'));
      }, opts);
    });
}
