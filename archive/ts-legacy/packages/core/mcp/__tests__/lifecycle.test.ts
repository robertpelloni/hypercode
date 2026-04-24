import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { MCPAggregator } from '../../src/mcp/MCPAggregator.ts';
import { createClientFactory, FakeMCPClient } from './test-helpers.ts';

const tempDirs: string[] = [];

function createConfigPath(config: object): string {
<<<<<<< HEAD:archive/ts-legacy/packages/core/mcp/__tests__/lifecycle.test.ts
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hypercode-mcp-lifecycle-'));
=======
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'borg-mcp-lifecycle-'));
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/mcp/__tests__/lifecycle.test.ts
    tempDirs.push(dir);
    const configPath = path.join(dir, 'mcp.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return configPath;
}

afterEach(() => {
    while (tempDirs.length) {
        fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
});

describe('MCP lifecycle', () => {
    it('initializes enabled servers and can remove persisted server config', async () => {
        const configPath = createConfigPath({
            alpha: { command: 'node', args: ['alpha.js'], enabled: true },
            beta: { command: 'node', args: ['beta.js'], enabled: false },
        });

        const alphaClient = new FakeMCPClient([{ name: 'ping', description: 'Ping' }]);
        const aggregator = new MCPAggregator({
            configPath,
            createClient: createClientFactory({ alpha: alphaClient }),
        });

        await aggregator.initialize();
        await aggregator.listAggregatedTools(); // trigger lazy connect for enabled servers
        expect((await aggregator.listServers()).map((server) => [server.name, server.status])).toEqual([
            ['alpha', 'connected'],
            ['beta', 'stopped'],
        ]);

        await aggregator.removeServerConfig('alpha');
        const persisted = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Record<string, unknown>;

        expect(alphaClient.closeCalls).toBe(1);
        expect(persisted.alpha).toBeUndefined();
    });
});
