import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { MCPAggregator } from '../../src/mcp/MCPAggregator.ts';
import { parseNamespacedToolName } from '../../src/mcp/namespaces.ts';
import { createClientFactory, FakeMCPClient } from './test-helpers.ts';

const tempDirs: string[] = [];

function createConfigPath(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hypercode-mcp-namespace-'));
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

describe('MCP namespacing', () => {
    it('keeps colliding tool names deterministic via namespace prefixes', async () => {
        const aggregator = new MCPAggregator({
            configPath: createConfigPath(),
            createClient: createClientFactory({
                alpha: new FakeMCPClient([{ name: 'search', description: 'alpha search' }]),
                beta: new FakeMCPClient([{ name: 'search', description: 'beta search' }]),
            }),
        });

        await aggregator.initialize();
        const tools = await aggregator.listAggregatedTools();

        expect(tools.map((tool) => tool.name)).toEqual(['alpha__search', 'beta__search']);
        expect(parseNamespacedToolName('alpha__search')).toEqual({ serverName: 'alpha', toolName: 'search' });
    });
});
