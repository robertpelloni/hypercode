/**
 * `hypercode agent` - Agent management commands
 *
 * Manage AI agents: list available definitions, spawn instances,
 * monitor running agents, and interact via chat.
 *
 * @example
 *   hypercode agent list              # List available agent definitions
 *   hypercode agent spawn architect   # Spawn an architect agent
 *   hypercode agent chat agent_123    # Chat with a running agent
 */

import type { Command } from 'commander';
import { queryTrpc, resolveControlPlaneLocation } from '../control-plane.js';

type DirectorStatus = {
  status?: string;
};

type SupervisorStatus = {
  isActive?: boolean;
  activeWorkers?: string[];
  queueDepth?: number;
  lastActivity?: string | null;
  totalTasksCompleted?: number;
};

type CouncilStatus = {
  enabled?: boolean;
  supervisorCount?: number;
  availableCount?: number;
};

async function withAgentErrorHandling(
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

function unsupportedAgentCommand(message: string): Promise<void> {
  return Promise.reject(new Error(message));
}

export function registerAgentCommand(program: Command): void {
  const agent = program
    .command('agent')
    .description('Agents — manage AI agent definitions, instances, and orchestration');

  agent
    .command('list')
    .description('List all available agent definitions with model, provider, and role')
    .option('--json', 'Output as JSON')
    .option('--provider <provider>', 'Filter by provider')
    .option('--role <role>', 'Filter by role')
    .action(async (opts) => {
      await withAgentErrorHandling(
        () => unsupportedAgentCommand('Live agent definition listing is unavailable: the control plane does not expose a real agent inventory route yet.'),
        opts,
      );
    });

  agent
    .command('spawn <name>')
    .description('Spawn an agent instance from a definition')
    .option('-m, --model <model>', 'Override the default model')
    .option('-p, --provider <provider>', 'Override the default provider')
    .option('-w, --workdir <path>', 'Working directory for the agent', '.')
    .option('--system-prompt <prompt>', 'Custom system prompt')
    .option('--temperature <temp>', 'LLM temperature', '0.7')
    .option('--json', 'Output as JSON')
    .addHelpText('after', `
Examples:
  $ hypercode agent spawn architect
  $ hypercode agent spawn builder --model gpt-5.2 --workdir ./my-project
  $ hypercode agent spawn researcher --provider google
    `)
    .action(async (name, opts) => {
      await withAgentErrorHandling(
        () => unsupportedAgentCommand(`Live agent spawn is unavailable for '${name}': the control plane does not expose a real generic agent spawn route yet.`),
        opts,
      );
    });

  agent
    .command('stop <id>')
    .description('Stop a running agent instance')
    .option('-f, --force', 'Force stop without cleanup')
    .option('--json', 'Output as JSON')
    .action(async (id, opts) => {
      await withAgentErrorHandling(
        () => unsupportedAgentCommand(`Live agent stop is unavailable for '${id}': the control plane does not expose a real generic agent stop route yet.`),
        opts,
      );
    });

  agent
    .command('status')
    .description('Show all running agent instances with metrics')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await withAgentErrorHandling(
        () => unsupportedAgentCommand('Live agent status is unavailable: the control plane does not expose a real generic running-agent inventory route yet.'),
        opts,
      );
    });

  agent
    .command('chat <id>')
    .description('Open interactive chat session with a running agent')
    .option('--json', 'Output as JSON')
    .action(async (id, opts) => {
      await withAgentErrorHandling(
        () => unsupportedAgentCommand(`Live agent chat is unavailable for '${id}': the control plane only exposes stateless agent chat, not attached agent-instance chat.`),
        opts,
      );
    });

  agent
    .command('council')
    .description('Manage the Director/Council/Supervisor system')
    .option('--start', 'Start the council')
    .option('--stop', 'Stop the council')
    .option('--status', 'Show council status')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await withAgentErrorHandling(async () => {
        const chalk = (await import('chalk')).default;

        if (opts.status) {
          const [director, supervisor, council] = await Promise.all([
            queryTrpc<DirectorStatus>('director.status'),
            queryTrpc<SupervisorStatus>('supervisor.status'),
            queryTrpc<CouncilStatus>('council.status'),
          ]);

          const payload = {
            director,
            supervisor,
            council,
          };

          if (opts.json) {
            console.log(JSON.stringify(payload, null, 2));
            return;
          }

          console.log(chalk.bold.cyan('\n  Agent Council\n'));
          console.log(chalk.dim('  Director:   ') + (director.status ? chalk.green(director.status) : chalk.yellow('offline')));
          console.log(chalk.dim('  Supervisor: ') + (supervisor.isActive ? chalk.green('active') : chalk.yellow('idle')));
          console.log(chalk.dim('  Queue:      ') + String(supervisor.queueDepth ?? 0));
          console.log(chalk.dim('  Workers:    ') + String(supervisor.activeWorkers?.length ?? 0));
          console.log(chalk.dim('  Council:    ') + `${council.supervisorCount ?? 0} members`);
          console.log(chalk.dim('  Enabled:    ') + ((council.enabled ?? false) ? chalk.green('yes') : chalk.yellow('no')));
          console.log('');
          return;
        }

        console.log(chalk.bold.cyan('\n  Agent Council\n'));
        console.log(chalk.dim('  Use --status to inspect the live Director/Council/Supervisor state.\n'));
      }, opts);
    });
}
