import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { MCPAggregator } from '../../src/mcp/MCPAggregator.ts';
import { createClientFactory, FakeMCPClient } from './test-helpers.ts';

const tempDirs: string[] = [];

function createConfigPath(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hypercode-mcp-search-'));
    tempDirs.push(dir);
    const configPath = path.join(dir, 'mcp.json');
    fs.writeFileSync(configPath, JSON.stringify({
        github: { command: 'node', args: ['github.js'], enabled: true },
        memory: { command: 'node', args: ['memory.js'], enabled: true },
    }, null, 2));
    return configPath;
}

afterEach(() => {
    while (tempDirs.length) {
        fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
});

describe('MCP tool search', () => {
    it('returns relevant namespaced tools by name and description', async () => {
        const aggregator = new MCPAggregator({
            configPath: createConfigPath(),
            createClient: createClientFactory({
                github: new FakeMCPClient([{ name: 'search_issues', description: 'Search GitHub issues' }]),
                memory: new FakeMCPClient([{ name: 'store_fact', description: 'Store important memory facts' }]),
            }),
        });

        await aggregator.initialize();
        const results = await aggregator.searchTools('memory');

        expect(results.map((tool) => tool.name)).toEqual(['memory__store_fact']);
    });
});
