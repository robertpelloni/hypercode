/**
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/dashboard.ts
 * `hypercode dashboard` - Open the web dashboard
 *
 * Launches the HyperCode WebUI dashboard in the default browser.
 * If the server isn't running, optionally starts it first.
 *
 * @example
 *   hypercode dashboard            # Open dashboard in browser
 *   hypercode dashboard --port 8080
=======
 * `borg dashboard` - Open the web dashboard
 *
 * Launches the borg WebUI dashboard in the default browser.
 * If the server isn't running, optionally starts it first.
 *
 * @example
 *   borg dashboard            # Open dashboard in browser
 *   borg dashboard --port 8080
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/dashboard.ts
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
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/dashboard.ts
    .description('Open the HyperCode WebUI dashboard in the default browser')
=======
    .description('Open the borg WebUI dashboard in the default browser')
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/dashboard.ts
    .option('-p, --port <number>', 'Dashboard port', '3000')
    .option('-H, --host <address>', 'Dashboard host', 'localhost')
    .option('--no-open', 'Start dashboard server without opening browser')
    .option('--dev', 'Start in development mode with hot reload')
    .addHelpText('after', `
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/dashboard.ts
The dashboard provides a comprehensive visual interface to all HyperCode subsystems:
=======
The dashboard provides a comprehensive visual interface to all borg subsystems:
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/dashboard.ts
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
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/dashboard.ts
  $ hypercode dashboard                  Open in browser at localhost:3000
  $ hypercode dashboard --port 8080      Custom port
  $ hypercode dashboard --dev            Development mode with HMR
  $ hypercode dashboard --no-open        Start without opening browser
=======
  $ borg dashboard                  Open in browser at localhost:3000
  $ borg dashboard --port 8080      Custom port
  $ borg dashboard --dev            Development mode with HMR
  $ borg dashboard --no-open        Start without opening browser
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/dashboard.ts
    `)
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      const url = `http://${opts.host}:${opts.port}`;

<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/dashboard.ts
      console.log(chalk.bold.cyan('\n  ⬡ HyperCode Dashboard\n'));
=======
      console.log(chalk.bold.cyan('\n  ⬡ borg Dashboard\n'));
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/dashboard.ts
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
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/dashboard.ts
    .description('Show HyperCode version, project info, and submodule status')
=======
    .description('Show borg version, project info, and submodule status')
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/dashboard.ts
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;

      if (opts.json) {
        console.log(JSON.stringify({
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/dashboard.ts
          name: 'HyperCode',
          subtitle: 'The Neural Operating System',
          version,
          packages: ['@hypercode/core', '@hypercode/cli', '@hypercode/types', '@hypercode/ai', '@hypercode/agents', '@hypercode/tools', '@hypercode/search', '@hypercode/memory', '@hypercode/adk'],
          repository: 'https://github.com/robertpelloni/hypercode',
=======
          name: 'borg',
          subtitle: 'The Neural Operating System',
          version,
          packages: ['@borg/core', '@borg/cli', '@borg/types', '@borg/ai', '@borg/agents', '@borg/tools', '@borg/search', '@borg/memory', '@borg/adk'],
          repository: 'https://github.com/robertpelloni/borg',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/dashboard.ts
        }, null, 2));
        return;
      }

<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/dashboard.ts
      console.log(chalk.bold.cyan('\n  ⬡ HyperCode — The Neural Operating System'));
=======
      console.log(chalk.bold.cyan('\n  ⬡ borg — The Neural Operating System'));
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/dashboard.ts
  console.log(chalk.dim(`  Version: ${version}\n`));
      console.log(chalk.dim('  "The Ultimate AI Tool Dashboard & Development Orchestrator"\n'));

      console.log(chalk.bold('  Packages:'));
      const pkgs = [
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/dashboard.ts
        ['@hypercode/core', 'Backend server, MCP router, orchestrator'],
        ['@hypercode/cli', 'Command-line interface'],
        ['@hypercode/types', 'Shared TypeScript types & Zod schemas'],
        ['@hypercode/ai', 'LLM service, model selector'],
        ['@hypercode/agents', 'Director, Council, Supervisor'],
        ['@hypercode/tools', 'File, terminal, browser, chain executor'],
        ['@hypercode/search', 'Semantic & text search service'],
        ['@hypercode/memory', 'Multi-backend memory system'],
        ['@hypercode/adk', 'Agent Development Kit'],
=======
        ['@borg/core', 'Backend server, MCP router, orchestrator'],
        ['@borg/cli', 'Command-line interface'],
        ['@borg/types', 'Shared TypeScript types & Zod schemas'],
        ['@borg/ai', 'LLM service, model selector'],
        ['@borg/agents', 'Director, Council, Supervisor'],
        ['@borg/tools', 'File, terminal, browser, chain executor'],
        ['@borg/search', 'Semantic & text search service'],
        ['@borg/memory', 'Multi-backend memory system'],
        ['@borg/adk', 'Agent Development Kit'],
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/dashboard.ts
      ];

      for (const [name, desc] of pkgs) {
        console.log(chalk.cyan(`    ${name.padEnd(20)}`) + chalk.dim(desc));
      }

<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/dashboard.ts
      console.log(chalk.dim('\n  Repository: https://github.com/robertpelloni/hypercode'));
=======
      console.log(chalk.dim('\n  Repository: https://github.com/robertpelloni/borg'));
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/dashboard.ts
      console.log(chalk.dim('  License: MIT\n'));
    });
}
