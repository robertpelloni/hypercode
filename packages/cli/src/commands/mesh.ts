import type { Command } from 'commander';

import { queryTrpc, resolveControlPlaneLocation } from '../control-plane.js';

interface MeshStatus {
  nodeId: string;
  peersCount: number;
}

interface RemoteCapabilities {
  capabilities: string[];
  role?: string;
  load?: number;
  cachedAt: number;
}

interface MatchingPeer {
  nodeId: string;
  capabilities: string[];
  role?: string;
  load?: number;
}

function normalizeCapabilityArgs(input: string[] | string | undefined): string[] {
  if (!input) {
    return [];
  }

  const values = Array.isArray(input) ? input : [input];
  return values
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

async function withMeshErrorHandling(
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
      console.error(chalk.red(`  ✗ ${message}`));
      console.error(chalk.dim('  Start HyperCode with `hypercode start` or point BORG_TRPC_UPSTREAM at a live /trpc endpoint.'));
    }
    process.exitCode = 1;
  }
}

export function registerMeshCommand(program: Command): void {
  const mesh = program
    .command('mesh')
    .description('Mesh — inspect HyperCode peer mesh status, peers, and capability matches');

  mesh
    .command('status')
    .description('Show the local mesh node and currently known peer count')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await withMeshErrorHandling(async () => {
        const [status, capabilities] = await Promise.all([
          queryTrpc<MeshStatus>('mesh.getStatus'),
          queryTrpc<Record<string, string[]>>('mesh.getCapabilities'),
        ]);
        const location = resolveControlPlaneLocation();
        const localCapabilities = capabilities[status.nodeId] ?? [];
        const payload = {
          ...status,
          localCapabilities,
          controlPlane: location,
        };

        if (opts.json) {
          console.log(JSON.stringify(payload, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        console.log(chalk.bold.cyan('\n  HyperCode Mesh Status\n'));
        console.log(chalk.dim('  Node ID:        ') + status.nodeId);
        console.log(chalk.dim('  Known peers:    ') + String(status.peersCount));
        console.log(chalk.dim('  Capabilities:   ') + (localCapabilities.length > 0 ? localCapabilities.join(', ') : 'none advertised'));
        console.log(chalk.dim('  Control plane:  ') + `${location.baseUrl} (${location.source})`);
        console.log('');
      }, opts);
    });

  mesh
    .command('peers')
    .description('List peers currently known by the local mesh service')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await withMeshErrorHandling(async () => {
        const [peers, capabilities] = await Promise.all([
          queryTrpc<string[]>('mesh.getPeers'),
          queryTrpc<Record<string, string[]>>('mesh.getCapabilities'),
        ]);

        const rows = peers.map((nodeId) => ({
          nodeId,
          capabilities: capabilities[nodeId] ?? [],
        }));

        if (opts.json) {
          console.log(JSON.stringify({ peers: rows }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        const Table = (await import('cli-table3')).default;
        const table = new Table({
          head: ['Peer', 'Capabilities'],
          style: { head: ['cyan'] },
        });

        for (const row of rows) {
          table.push([
            row.nodeId,
            row.capabilities.length > 0 ? row.capabilities.join(', ') : chalk.dim('unknown'),
          ]);
        }

        console.log(chalk.bold.cyan('\n  HyperCode Mesh Peers\n'));
        if (rows.length === 0) {
          console.log(chalk.dim('  No peers discovered yet.\n'));
          return;
        }
        console.log(table.toString());
        console.log('');
      }, opts);
    });

  mesh
    .command('capabilities [nodeId]')
    .description('Show local capabilities or query a specific peer capability cache')
    .option('--json', 'Output as JSON')
    .option('--timeout <ms>', 'Capability query timeout in milliseconds', '5000')
    .action(async (nodeId, opts) => {
      await withMeshErrorHandling(async () => {
        const timeoutMs = Number.parseInt(opts.timeout, 10);
        if (Number.isNaN(timeoutMs) || timeoutMs < 100) {
          throw new Error('Timeout must be a number greater than or equal to 100ms.');
        }

        if (!nodeId) {
          const [status, capabilities] = await Promise.all([
            queryTrpc<MeshStatus>('mesh.getStatus'),
            queryTrpc<Record<string, string[]>>('mesh.getCapabilities'),
          ]);
          const payload = {
            nodeId: status.nodeId,
            capabilities: capabilities[status.nodeId] ?? [],
            scope: 'local' as const,
          };

          if (opts.json) {
            console.log(JSON.stringify(payload, null, 2));
            return;
          }

          const chalk = (await import('chalk')).default;
          console.log(chalk.bold.cyan('\n  Local Mesh Capabilities\n'));
          console.log(chalk.dim('  Node ID:      ') + payload.nodeId);
          console.log(chalk.dim('  Capabilities: ') + (payload.capabilities.length > 0 ? payload.capabilities.join(', ') : 'none advertised'));
          console.log('');
          return;
        }

        const payload = await queryTrpc<RemoteCapabilities>('mesh.queryCapabilities', {
          nodeId,
          timeoutMs,
        });

        if (opts.json) {
          console.log(JSON.stringify({ nodeId, ...payload, scope: 'remote' }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        console.log(chalk.bold.cyan(`\n  Remote Mesh Capabilities: ${nodeId}\n`));
        console.log(chalk.dim('  Capabilities: ') + (payload.capabilities.length > 0 ? payload.capabilities.join(', ') : 'none advertised'));
        console.log(chalk.dim('  Role:         ') + (payload.role ?? 'unknown'));
        console.log(chalk.dim('  Load:         ') + (typeof payload.load === 'number' ? String(payload.load) : 'unknown'));
        console.log(chalk.dim('  Cached at:    ') + new Date(payload.cachedAt).toISOString());
        console.log('');
      }, opts);
    });

  mesh
    .command('find')
    .description('Find the first peer that advertises every required capability')
    .requiredOption('-c, --capability <capability...>', 'Required capability (repeat or pass comma-separated values)')
    .option('--json', 'Output as JSON')
    .option('--timeout <ms>', 'Capability query timeout in milliseconds', '5000')
    .action(async (opts) => {
      await withMeshErrorHandling(async () => {
        const timeoutMs = Number.parseInt(opts.timeout, 10);
        if (Number.isNaN(timeoutMs) || timeoutMs < 100) {
          throw new Error('Timeout must be a number greater than or equal to 100ms.');
        }

        const requiredCapabilities = normalizeCapabilityArgs(opts.capability);
        if (requiredCapabilities.length === 0) {
          throw new Error('Provide at least one required capability.');
        }

        const match = await queryTrpc<MatchingPeer | null>('mesh.findPeerForCapabilities', {
          requiredCapabilities,
          timeoutMs,
        });

        if (opts.json) {
          console.log(JSON.stringify({
            requiredCapabilities,
            match,
          }, null, 2));
          return;
        }

        const chalk = (await import('chalk')).default;
        console.log(chalk.bold.cyan('\n  HyperCode Mesh Capability Match\n'));
        console.log(chalk.dim('  Required: ') + requiredCapabilities.join(', '));
        if (!match) {
          console.log(chalk.yellow('  No matching peer found.\n'));
          return;
        }

        console.log(chalk.green(`  ✓ ${match.nodeId}`));
        console.log(chalk.dim('    Capabilities: ') + (match.capabilities.length > 0 ? match.capabilities.join(', ') : 'none advertised'));
        console.log(chalk.dim('    Role:         ') + (match.role ?? 'unknown'));
        console.log(chalk.dim('    Load:         ') + (typeof match.load === 'number' ? String(match.load) : 'unknown'));
        console.log('');
      }, opts);
    });
}
