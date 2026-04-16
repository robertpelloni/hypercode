#!/usr/bin/env node
/**
 * HyperCode CLI - The Neural Operating System Command Interface
 * @module @hypercode/cli
 * @version dynamic (root VERSION)
 *
 * Main entry point for the `hypercode` command. Provides comprehensive CLI access
 * to all HyperCode subsystems: MCP router, memory, agents, sessions, providers,
 * tools, skills, configuration, and the web dashboard.
 */

import { Command } from 'commander';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerStartCommand } from './commands/start.js';
import { registerStatusCommand } from './commands/status.js';
import { registerMcpCommand } from './commands/mcp.js';
import { registerMemoryCommand } from './commands/memory.js';
import { registerAgentCommand } from './commands/agent.js';
import { registerSessionCommand } from './commands/session.js';
import { registerProviderCommand } from './commands/provider.js';
import { registerToolsCommand } from './commands/tools.js';
import { registerConfigCommand } from './commands/config.js';
import { registerDashboardCommand } from './commands/dashboard.js';
import { registerMeshCommand } from './commands/mesh.js';
import { readCanonicalVersion } from './version.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const version = readCanonicalVersion(__dirname);

const program = new Command();

program
  .name('hypercode')
  .description('HyperCode — The Neural Operating System\n\nThe ultimate AI tool dashboard & development orchestrator.\nManage MCP servers, memory, agents, sessions, providers, and more.')
  .version(version, '-v, --version', 'Display the current HyperCode version')
  .option('--json', 'Output results as JSON (applies to list/status commands)')
  .option('--config <path>', 'Path to hypercode config file', '~/.hypercode/config.jsonc')
  .option('--log-level <level>', 'Log level: debug, info, warn, error', 'info')
  .option('--no-color', 'Disable colored output');

// Register all command groups
registerStartCommand(program);
registerStatusCommand(program);
registerMcpCommand(program);
registerMemoryCommand(program);
registerAgentCommand(program);
registerSessionCommand(program);
registerProviderCommand(program);
registerToolsCommand(program);
registerConfigCommand(program);
registerDashboardCommand(program);
registerMeshCommand(program);

// Default action: show help if no command given
program.action(() => {
  program.help();
});

program.parse(process.argv);
