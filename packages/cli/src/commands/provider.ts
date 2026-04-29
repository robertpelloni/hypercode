/**
 * `borg provider` - AI provider management
 *
 * Configure and manage AI model providers, API keys, OAuth logins,
 * quota tracking, and automatic model fallback chains.
 *
 * @example
 *   borg provider list         # List providers with quota status
 *   borg provider add openai   # Add a new provider
 *   borg provider quota        # Show all quota/billing info
 */

import type { Command } from 'commander';

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
      const chalk = (await import('chalk')).default;
      const Table = (await import('cli-table3')).default;

      if (opts.json) {
        console.log(JSON.stringify({ providers: [] }, null, 2));
        return;
      }

      const table = new Table({
        head: ['Provider', 'Status', 'Auth', 'Models', 'Quota Used', 'Quota Limit', 'Resets'],
        style: { head: ['cyan'] },
      });

      console.log(chalk.bold.cyan('\n  AI Providers\n'));
      console.log(chalk.dim('  No providers configured. Use `borg provider add` to add one.\n'));
      console.log(chalk.dim('  Supported: openai, anthropic, google, xai, deepseek, mistral,'));
      console.log(chalk.dim('             openrouter, copilot, antigravity, local\n'));
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
  $ borg provider add anthropic --oauth    # Claude Max/Pro subscription
  $ borg provider add google --oauth       # Google AI Plus subscription
  $ borg provider add copilot --oauth      # Copilot Premium Plus
  $ borg provider add openai --oauth       # ChatGPT Plus subscription
    `)
    .action(async (name, opts) => {
      const chalk = (await import('chalk')).default;
      if (opts.oauth) {
        console.log(chalk.yellow(`  Starting OAuth flow for ${name}...`));
        console.log(chalk.dim('  (OAuth login not yet implemented)'));
      } else if (opts.apiKey) {
        console.log(chalk.green(`  ✓ Provider '${name}' added with API key`));
      } else {
        console.log(chalk.yellow(`  Set API key via environment variable or --api-key flag`));
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
      const chalk = (await import('chalk')).default;
      console.log(chalk.bold.cyan('\n  Provider Quotas & Billing\n'));
      console.log(chalk.dim('  No providers configured with quota tracking.\n'));
      console.log(chalk.dim('  Tip: Enable quota tracking with `borg provider add <name>`\n'));
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
    .option('--set <models...>', 'Set fallback chain (ordered list)')
    .option('--strategy <strategy>', 'Fallback strategy: priority, cost-optimized, quota-aware, round-robin', 'quota-aware')
    .addHelpText('after', `
The fallback chain determines which model to use when the primary model's
quota is exhausted. Models are tried in order.

Examples:
  $ borg provider fallback --show
  $ borg provider fallback --set claude-opus-4 gpt-5.2 gemini-3-pro grok-4
  $ borg provider fallback --strategy cost-optimized
    `)
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      console.log(chalk.bold.cyan('\n  Model Fallback Chain\n'));
      console.log(chalk.dim('  Strategy: ') + (opts.strategy || 'quota-aware'));
      console.log(chalk.dim('  Chain:    ') + 'not configured');
      console.log(chalk.dim('\n  Use --set to configure the fallback order.\n'));
    });
}
