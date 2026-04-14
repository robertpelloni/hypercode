import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { MCPAggregator } from '../../src/mcp/MCPAggregator.ts';
import { createClientFactory, FakeMCPClient } from './test-helpers.ts';

const tempDirs: string[] = [];

function createConfigPath(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hypercode-mcp-traffic-'));
    tempDirs.push(dir);
    const configPath = path.join(dir, 'mcp.json');
    fs.writeFileSync(configPath, JSON.stringify({
        github: { command: 'node', args: ['github.js'], enabled: true },
    }, null, 2));
    return configPath;
}

afterEach(() => {
    while (tempDirs.length) {
        fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
});

describe('MCP traffic inspector', () => {
    it('records list and call traffic with params summary and latency', async () => {
        const aggregator = new MCPAggregator({
            configPath: createConfigPath(),
            createClient: createClientFactory({
                github: new FakeMCPClient([{ name: 'create_issue', description: 'Create issue' }]),
            }),
        });

        await aggregator.initialize();
        await aggregator.listAggregatedTools();
        await aggregator.executeTool('github__create_issue', { title: 'Bug', labels: ['p1'] });

        const events = aggregator.getTrafficEvents();

        expect(events).toHaveLength(2);
        expect(events[0]).toMatchObject({
            server: 'github',
            method: 'tools/list',
            success: true,
        });
        expect(events[1]).toMatchObject({
            server: 'github',
            method: 'tools/call',
            toolName: 'create_issue',
            success: true,
        });
        expect(events[1].paramsSummary).toContain('title=Bug');
        expect(events[1].latencyMs).toBeGreaterThanOrEqual(0);
    });
});
