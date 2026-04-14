import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { MCPAggregator } from '../src/mcp/MCPAggregator.ts';

// Mock Dependencies
const mockListTools = vi.fn();
const mockCallTool = vi.fn();
const mockConnect = vi.fn();
const mockClose = vi.fn();

vi.mock('../src/mcp/StdioClient.ts', () => {
    return {
        StdioClient: class {
            constructor(public name: string, public config: any) { }
            connect = mockConnect;
            listTools = mockListTools;
            callTool = mockCallTool;
            close = mockClose;
        }
    };
});

describe('MCPAggregator', () => {
    let aggregator: MCPAggregator;
    let configPath: string;

    beforeEach(() => {
        vi.clearAllMocks();
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hypercode-mcp-aggregator-'));
        configPath = path.join(tempDir, 'mcp_servers.json');
        fs.writeFileSync(configPath, JSON.stringify({
            'test-server': {
                command: 'echo',
                args: ['hello'],
                enabled: true,
            },
            'disabled-server': {
                command: 'echo',
                args: ['disabled'],
                enabled: false,
            },
        }));
        aggregator = new MCPAggregator({ configPath });
    });

    it('initializes enabled servers lazily without connecting immediately', async () => {
        await aggregator.initialize();
        expect(mockConnect).not.toHaveBeenCalled();

        const servers = await aggregator.listServers();
        expect(servers.find((server) => server.name === 'test-server')?.status).toBe('stopped');
    });

    it('warms always-on advertised servers in the background without touching others', async () => {
        await aggregator.initialize();

        aggregator.seedAdvertisedInventory({
            servers: [
                { name: 'test-server', alwaysOnAdvertised: true, advertisedToolCount: 1 },
                { name: 'disabled-server', alwaysOnAdvertised: true, advertisedToolCount: 1 },
            ],
            source: 'config',
        });
        aggregator.warmAdvertisedServers();
        await Promise.resolve();

        const servers = await aggregator.listServers();
        const warmed = servers.find((server) => server.name === 'test-server');
        const disabled = servers.find((server) => server.name === 'disabled-server');

        expect(mockConnect).toHaveBeenCalledTimes(1);
        expect(warmed?.status).toBe('connected');
        expect(warmed?.warmupStatus).toBe('ready');
        expect(warmed?.advertisedAlwaysOn).toBe(true);
        expect(warmed?.advertisedToolCount).toBe(1);
        expect(disabled?.status).toBe('stopped');
    });

    it('lists aggregated tools with prefixes', async () => {
        mockListTools.mockResolvedValueOnce([
            { name: 'read_file', description: 'Reads a file' }
        ]);

        await aggregator.initialize();
        const tools = await aggregator.listAggregatedTools();

        expect(mockConnect).toHaveBeenCalledTimes(1);
        expect(tools).toHaveLength(1);
        expect(tools[0].name).toBe('test-server__read_file');
        expect(tools[0].description).toContain('[test-server]');
    });

    it('routes execution to correct server', async () => {
        mockListTools.mockResolvedValueOnce([
            { name: 'read_file', description: 'Reads a file' }
        ]);
        mockCallTool.mockResolvedValueOnce({ content: [{ text: 'success' }] });
        await aggregator.initialize();

        await aggregator.executeTool('test-server__read_file', { path: 'foo.txt' });

        expect(mockCallTool).toHaveBeenCalledWith('read_file', { path: 'foo.txt' });
    });

    it('throws error for unknown server prefix', async () => {
        await aggregator.initialize();
        await expect(aggregator.executeTool('unknown_tool', {}))
            .rejects.toThrow("Tool 'unknown_tool' not found in any connected MCP server.");
    });

    it('does not spawn server processes when listing tools in lazy mode', async () => {
        // In lazy session mode the aggregator must not eagerly connect to unstarted
        // servers during listAggregatedTools(). Binaries should only be spawned when
        // executeTool() is actually called for that server.
        const lazyAggregator = new MCPAggregator({
            configPath,
            lazyMode: true,
        });
        await lazyAggregator.initialize();

        const tools = await lazyAggregator.listAggregatedTools();

        // No server is pre-connected, so lazy mode must return an empty list and
        // must NOT have triggered any client.connect() calls.
        expect(mockConnect).not.toHaveBeenCalled();
        expect(tools).toHaveLength(0);
    });

    it('getLazyMode reflects the value passed in options', () => {
        const lazyAggregator = new MCPAggregator({ configPath, lazyMode: true });
        expect(lazyAggregator.getLazyMode()).toBe(true);

        const eagerAggregator = new MCPAggregator({ configPath, lazyMode: false });
        expect(eagerAggregator.getLazyMode()).toBe(false);
    });

    it('setLazyMode toggles lazy mode at runtime', async () => {
        // Start in eager mode so that listAggregatedTools() can connect normally.
        mockListTools.mockResolvedValue([{ name: 'my_tool', description: 'A tool' }]);
        await aggregator.initialize();

        expect(aggregator.getLazyMode()).toBe(false);

        // Switch to lazy mode and verify no new connections are made for unconnected servers.
        aggregator.setLazyMode(true);
        expect(aggregator.getLazyMode()).toBe(true);
        vi.clearAllMocks();

        const tools = await aggregator.listAggregatedTools();
        expect(mockConnect).not.toHaveBeenCalled();
        // test-server is not connected (no prior connect in this branch), so lazy mode returns nothing.
        expect(tools).toHaveLength(0);
    });
});
