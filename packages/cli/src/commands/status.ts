/**
 * `borg status` - Show system status overview
 *
 * Queries the running Borg AIOS server for real status data.
 * Falls back to a static overview if the server isn't reachable.
 */

import type { Command } from 'commander';

const DEFAULT_PORT = 4000;

interface StatusData {
  version: string;
  server: { status: string; uptime: number; mcpReady: boolean };
  mcp: { servers: number; running: number; tools: number; connected: number };
  sessions: { active: number; paused: number; total: number };
  memory: { entries: number; backends: number };
  providers: { configured: number; active: number };
}

async function fetchTRPC(host: string, path: string): Promise<any> {
  try {
    const res = await fetch(`http://${host}${path}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.result?.data ?? json;
  } catch {
    return null;
  }
}

async function getRealStatus(host: string): Promise<StatusData | null> {
  const [startupStatus, mcpStatus, health] = await Promise.all([
    fetchTRPC(host, '/trpc/startupStatus'),
    fetchTRPC(host, '/trpc/mcp.getStatus'),
    fetchTRPC(host, '/health'),
  ]);

  if (!health) return null;

  return {
    version: health.name === '@borg/core' ? 'running' : 'unknown',
    server: {
      status: health.status ?? 'unknown',
      uptime: health.uptime ?? 0,
      mcpReady: health.mcpReady ?? false,
    },
    mcp: {
      servers: mcpStatus?.serverCount ?? 0,
      running: mcpStatus?.connectedCount ?? 0,
      tools: mcpStatus?.toolCount ?? 0,
      connected: mcpStatus?.connectedCount ?? 0,
    },
    sessions: { active: 0, paused: 0, total: 0 },
    memory: { entries: 0, backends: 1 },
    providers: { configured: 0, active: 0 },
  };
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show Borg AIOS system status (server, MCP, sessions, memory, providers)')
    .option('--json', 'Output as JSON')
    .option('-p, --port <number>', 'Server port', String(DEFAULT_PORT))
    .addHelpText('after', `
Examples:
  $ borg status          Show full system overview
  $ borg status --json   Machine-readable JSON output
  $ borg status -p 4100  Query server on port 4100
    `)
    .action(async (opts) => {
      const chalk = (await import('chalk')).default;
      const Table = (await import('cli-table3')).default;
      const { readFileSync, existsSync } = await import('fs');
      const { resolve } = await import('path');
      // Walk up to find VERSION file
      let version = 'unknown';
      for (let dir = import.meta.dirname ?? '.'; dir !== '/'; dir = resolve(dir, '..')) {
        const vPath = resolve(dir, 'VERSION');
        if (existsSync(vPath)) { version = readFileSync(vPath, 'utf8').trim(); break; }
      }

      const jsonMode = opts.json ?? program.opts().json;
      const port = parseInt(opts.port, 10) || DEFAULT_PORT;
      const host = `127.0.0.1:${port}`;

      const real = await getRealStatus(host);

      if (jsonMode) {
        const status = real ?? {
          version,
          server: { status: 'stopped', uptime: 0, mcpReady: false },
          mcp: { servers: 0, running: 0, tools: 0, connected: 0 },
          sessions: { active: 0, paused: 0, total: 0 },
          memory: { entries: 0, backends: 0 },
          providers: { configured: 0, active: 0 },
        };
        (status as any).version = version;
        console.log(JSON.stringify(status, null, 2));
        return;
      }

      console.log(chalk.bold.cyan(`\n  ⬡ Borg AIOS v${version} — Status\n`));

      const table = new Table({
        chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
        style: { head: ['cyan'], border: ['dim'] },
      });

      if (real) {
        const up = formatUptime(real.server.uptime);
        const serverStatus = real.server.status === 'ok' ? chalk.green('● Running') : chalk.yellow('○ Starting');
        const mcpStatus = real.mcp.connected > 0 ? chalk.green(`● Connected`) : real.mcp.servers > 0 ? chalk.yellow(`◐ ${real.mcp.servers} cached`) : chalk.dim('○ Empty');
        const mcpDetails = `Servers: ${real.mcp.servers} | Tools: ${real.mcp.tools} | Connected: ${real.mcp.connected}`;

        table.push(
          [chalk.bold('Component'), chalk.bold('Status'), chalk.bold('Details')],
          ['Server', serverStatus, `Uptime: ${up} | MCP: ${real.server.mcpReady ? '✓' : 'pending'}`],
          ['MCP Router', mcpStatus, mcpDetails],
          ['Memory', real.memory.entries > 0 ? chalk.green(`● ${real.memory.entries} entries`) : chalk.dim('○ Empty'), `Backends: ${real.memory.backends}`],
          ['Agents', chalk.dim('○ Idle'), 'Running: 0 | Available: 20+'],
          ['Sessions', chalk.dim('○ None'), `Active: ${real.sessions.active} | Paused: ${real.sessions.paused}`],
          ['Providers', real.providers.configured > 0 ? chalk.yellow(`◐ ${real.providers.configured}`) : chalk.dim('○ None'), `Active: ${real.providers.active}`],
          ['Dashboard', chalk.dim('○ Stopped'), 'http://localhost:3000'],
        );
        console.log(table.toString());
        console.log(chalk.dim(`\n  Server: http://${host}/trpc  |  Health: http://${host}/health\n`));
      } else {
        table.push(
          [chalk.bold('Component'), chalk.bold('Status'), chalk.bold('Details')],
          ['Server', chalk.red('○ Stopped'), `http://${host}`],
          ['MCP Router', chalk.dim('○ N/A'), 'Server not running'],
          ['Memory', chalk.dim('○ N/A'), 'Server not running'],
          ['Agents', chalk.dim('○ Idle'), 'Available: 20+'],
          ['Sessions', chalk.dim('○ None'), 'No active sessions'],
          ['Providers', chalk.dim('○ None'), 'Not configured'],
          ['Dashboard', chalk.dim('○ Stopped'), 'http://localhost:3000'],
        );
        console.log(table.toString());
        console.log(chalk.dim(`\n  Use ${chalk.cyan('`borg start`')} to launch the server\n`));
      }
    });
}
