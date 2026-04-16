import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { MCPAggregator } from '../../src/mcp/MCPAggregator.ts';
import { createClientFactory, FakeMCPClient } from './test-helpers.ts';

const tempDirs: string[] = [];

function createConfigPath(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hypercode-mcp-crash-'));
    tempDirs.push(dir);
    const configPath = path.join(dir, 'mcp.json');
    fs.writeFileSync(configPath, JSON.stringify({
        alpha: { command: 'node', args: ['alpha.js'], enabled: true },
        beta: { command: 'node', args: ['beta.js'], enabled: true },
    }, null, 2));
    return configPath;
}

afterEach(() => {
    while (tempDirs.length) {
        fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
});

describe('MCP crash isolation', () => {
    it('restarts a failed server without disturbing healthy peers', async () => {
        const alphaClient = new FakeMCPClient([{ name: 'alpha_tool', description: 'Alpha' }]);
        const betaClients = [
            new FakeMCPClient([{ name: 'beta_tool', description: 'Beta' }]),
            new FakeMCPClient([{ name: 'beta_tool', description: 'Beta' }]),
        ];
        let betaIndex = 0;

        const aggregator = new MCPAggregator({
            configPath: createConfigPath(),
            restartDelayMs: 0,
            createClient: (name, config) => {
                if (name === 'alpha') {
                    return alphaClient;
                }
                return createClientFactory({ beta: betaClients[Math.min(betaIndex++, betaClients.length - 1)] })(name, config);
            },
        });

        await aggregator.initialize();
        await aggregator.listAggregatedTools(); // trigger lazy connect
        await aggregator.notifyServerExit('beta', new Error('crashed'));
        await aggregator.listAggregatedTools(); // trigger lazy reconnect after restart

        const servers = await aggregator.listServers();
        const alphaState = servers.find((server) => server.name === 'alpha');
        const betaState = servers.find((server) => server.name === 'beta');

        expect(alphaState?.status).toBe('connected');
        expect(betaState?.status).toBe('connected');
        expect(betaState?.restartCount).toBe(1);
    });
});
