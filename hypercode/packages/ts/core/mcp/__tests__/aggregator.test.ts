import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { MCPAggregator } from '../../src/mcp/MCPAggregator.ts';
import { createClientFactory, FakeMCPClient } from './test-helpers.ts';

const tempDirs: string[] = [];

function createConfigPath(config: object): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hypercode-mcp-'));
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

describe('MCP master router aggregation', () => {
    it('aggregates tools from multiple enabled servers behind one runtime', async () => {
        const configPath = createConfigPath({
            github: { command: 'node', args: ['github.js'], enabled: true },
            memory: { command: 'node', args: ['memory.js'], enabled: true },
        });

        const aggregator = new MCPAggregator({
            configPath,
            createClient: createClientFactory({
                github: new FakeMCPClient([{ name: 'search_issues', description: 'Search GitHub issues' }]),
                memory: new FakeMCPClient([{ name: 'store_fact', description: 'Store a fact' }]),
            }),
        });

        await aggregator.initialize();
        const tools = await aggregator.listAggregatedTools();
        const servers = await aggregator.listServers();

        expect(tools.map((tool) => tool.name)).toEqual([
            'github__search_issues',
            'memory__store_fact',
        ]);
        expect(servers.map((server) => [server.name, server.status, server.toolCount])).toEqual([
            ['github', 'connected', 1],
            ['memory', 'connected', 1],
        ]);
    });

    it('keeps a server connected after a tool-level failure', async () => {
        const configPath = createConfigPath({
            github: { command: 'node', args: ['github.js'], enabled: true },
        });

        const aggregator = new MCPAggregator({
            configPath,
            createClient: createClientFactory({
                github: new FakeMCPClient(
                    [{ name: 'search_issues', description: 'Search GitHub issues' }],
                    () => {
                        throw new Error('tool input invalid');
                    },
                ),
            }),
        });

        await aggregator.initialize();

        await expect(
            aggregator.executeTool('github__search_issues', { owner: 'hypercode' }),
        ).rejects.toThrow('tool input invalid');

        const servers = await aggregator.listServers();
        expect(servers).toEqual([
            expect.objectContaining({
                name: 'github',
                status: 'connected',
                lastError: 'tool input invalid',
            }),
        ]);

        expect(aggregator.getTrafficEvents()).toEqual([
            expect.objectContaining({
                server: 'github',
                method: 'tools/call',
                success: false,
                error: 'tool input invalid',
                toolName: 'search_issues',
            }),
        ]);
    });
});
