/**
 * `hypercode dashboard` - Open the web dashboard
 *
 * Launches the HyperCode WebUI dashboard in the default browser.
 * If the server isn't running, optionally starts it first.
 *
 * @example
 *   hypercode dashboard            # Open dashboard in browser
 *   hypercode dashboard --port 8080
 */

import type { Command } from 'commander';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCanonicalVersion } from '../version.js';

export function registerDashboardCommand(program: Command): void {
  const commandDir = dirname(fileURLToPath(import.meta.url));
  const version = readCanonicalVersion(commandDir);

  program
    .command('dashboard')
    .alias('ui')
    .description('Open the HyperCode WebUI dashboard in the default browser')
    .option('-p, --port <number>', 'Dashboard port', '3000')
    .option('-H, --host <address>', 'Dashboard host', 'localhost')
    .option('--no-open', 'Start dashboard server without opening browser')
    .option('--dev', 'Start in development mode with hot reload')
    .addHelpText('after', `
The dashboard provides a comprehensive visual interface to all HyperCode subsystems:
  - System overview with health metrics
  - MCP Router management (servers, tools, traffic, config, directory)
  - Memory browser and search
  - Agent management and chat
  - Session tracking and control
  - Provider quota and billing dashboard
  - Tool browser with semantic search
  - Configuration editor
  - Submodule dashboard

Examples:
  $ hypercode dashboard                  Open in browser at localhost:3000
  $ hypercode dashboard --port 8080      Custom port
  $ hypercode dashboard --dev            Development mode with HMR
  $ hypercode dashboard --no-open        Start without opening browser
    `)
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      const url = `http://${opts.host}:${opts.port}`;

      console.log(chalk.bold.cyan('\n  ⬡ HyperCode Dashboard\n'));
      console.log(chalk.dim(`  URL: ${url}`));
      console.log(chalk.dim(`  Mode: ${opts.dev ? 'development' : 'production'}`));
      console.log('');

      if (opts.open !== false) {
        try {
          const open = (await import('open')).default;
          await open(url);
          console.log(chalk.green('  ✓ Dashboard opened in browser'));
        } catch {
          console.log(chalk.yellow(`  ⚠ Could not open browser. Visit ${url} manually.`));
        }
      }

      console.log(chalk.dim('\n  Press Ctrl+C to stop\n'));
    });

  // About command (bonus)
  program
    .command('about')
    .description('Show HyperCode version, project info, and submodule status')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;

      if (opts.json) {
        console.log(JSON.stringify({
          name: 'HyperCode',
          subtitle: 'The Neural Operating System',
          version,
          packages: ['@hypercode/core', '@hypercode/cli', '@hypercode/types', '@hypercode/ai', '@hypercode/agents', '@hypercode/tools', '@hypercode/search', '@hypercode/memory', '@hypercode/adk'],
          repository: 'https://github.com/robertpelloni/hypercode',
        }, null, 2));
        return;
      }

      console.log(chalk.bold.cyan('\n  ⬡ HyperCode — The Neural Operating System'));
  console.log(chalk.dim(`  Version: ${version}\n`));
      console.log(chalk.dim('  "The Ultimate AI Tool Dashboard & Development Orchestrator"\n'));

      console.log(chalk.bold('  Packages:'));
      const pkgs = [
        ['@hypercode/core', 'Backend server, MCP router, orchestrator'],
        ['@hypercode/cli', 'Command-line interface'],
        ['@hypercode/types', 'Shared TypeScript types & Zod schemas'],
        ['@hypercode/ai', 'LLM service, model selector'],
        ['@hypercode/agents', 'Director, Council, Supervisor'],
        ['@hypercode/tools', 'File, terminal, browser, chain executor'],
        ['@hypercode/search', 'Semantic & text search service'],
        ['@hypercode/memory', 'Multi-backend memory system'],
        ['@hypercode/adk', 'Agent Development Kit'],
      ];

      for (const [name, desc] of pkgs) {
        console.log(chalk.cyan(`    ${name.padEnd(20)}`) + chalk.dim(desc));
      }

      console.log(chalk.dim('\n  Repository: https://github.com/robertpelloni/hypercode'));
      console.log(chalk.dim('  License: MIT\n'));
    });
}
