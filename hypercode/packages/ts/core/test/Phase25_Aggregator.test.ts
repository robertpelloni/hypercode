import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MCPAggregator } from '../src/mcp/MCPAggregator';
import fs from 'fs';
import path from 'path';

// Mock dependencies
vi.mock('fs');
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
    Client: class {
        connect() { return Promise.resolve(); }
        callTool(args: any) { return Promise.resolve({ content: [{ type: 'text', text: 'result' }] }); }
        listTools() {
            return Promise.resolve({
                tools: [
                    { name: 'mock_tool', description: 'A mock tool' }
                ]
            });
        }
        close() { return Promise.resolve(); }
    }
}));
vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
    StdioClientTransport: class { }
}));

describe('MCPAggregator', () => {
    let aggregator: MCPAggregator;
    const mockConfigPath = path.join(process.cwd(), 'config', 'test_mcp_config.json');

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup mock config
        const existsSyncMock = vi.mocked(fs.existsSync as unknown as (path: string) => boolean);
        const readFileSyncMock = vi.mocked(fs.readFileSync as unknown as (path: string, encoding: BufferEncoding) => string);
        existsSyncMock.mockReturnValue(true);
        readFileSyncMock.mockReturnValue(JSON.stringify({
            "test-server": {
                "command": "node",
                "args": ["server.js"],
                "enabled": true
            }
        }));
    });

    it('initializes and connects to enabled servers', async () => {
        aggregator = new MCPAggregator(mockConfigPath);
        await aggregator.initialize();

        // Check if connections were made (internally clients map should be populated)
        // Since clients are private, we can verify via listAggregatedTools which iterates them
        const tools = await aggregator.listAggregatedTools();
        expect(tools.length).toBeGreaterThan(0);
        expect(tools[0].name).toBe('test-server__mock_tool');
    });

    it('executes namespaced tool', async () => {
        aggregator = new MCPAggregator(mockConfigPath);
        await aggregator.initialize();

        const result = await aggregator.executeTool('test-server__mock_tool', {});
        expect(result).toBeDefined();
    });

    it('broadcasts non-namespaced tool', async () => {
        aggregator = new MCPAggregator(mockConfigPath);
        await aggregator.initialize();

        const result = await aggregator.executeTool('mock_tool', {});
        expect(result).toBeDefined();
    });
});
