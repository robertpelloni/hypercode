import path from 'path';

import { MCPConfigStore } from './configStore.js';
import { namespaceToolName, parseNamespacedToolName } from './namespaces.js';
import { StdioClient } from './StdioClient.js';
import { MCPTrafficInspector, summarizeParams } from './trafficInspector.js';
import type {
    MCPAggregatedTool,
    MCPAggregatorOptions,
    MCPClientLike,
    MCPServerConfig,
    MCPServerState,
    MCPToolDefinition,
} from './types.js';

export class MCPAggregator {
    public readonly clients: Map<string, MCPClientLike> = new Map();
    public readonly configPath: string;

    private readonly configStore: MCPConfigStore;
    private readonly createClient: (name: string, config: MCPServerConfig) => MCPClientLike;
    private readonly restartDelayMs: number;
    private readonly now: () => number;
    private readonly serverStates: Map<string, MCPServerState> = new Map();
    private readonly trafficInspector: MCPTrafficInspector;
    private initializationState: {
        inProgress: boolean;
        initialized: boolean;
        lastStartedAt?: number;
        lastCompletedAt?: number;
        lastSuccessAt?: number;
        lastError?: string;
    } = {
        inProgress: false,
        initialized: false,
    };

    constructor(options?: string | MCPAggregatorOptions) {
        const normalizedOptions = typeof options === 'string'
            ? { configPath: options }
            : (options ?? {});

        this.configPath = normalizedOptions.configPath || path.join(process.cwd(), 'config', 'mcp_servers.json');
        this.configStore = new MCPConfigStore(this.configPath);
        this.createClient = normalizedOptions.createClient ?? ((name: string, config: MCPServerConfig) => new StdioClient(name, {
            ...config,
            env: config.env ?? {},
        }));
        this.restartDelayMs = normalizedOptions.restartDelayMs ?? 5_000;
        this.now = normalizedOptions.now ?? (() => Date.now());
        this.trafficInspector = new MCPTrafficInspector(normalizedOptions.maxTrafficEvents ?? 200);
    }

    public async initialize(): Promise<void> {
        this.initializationState.inProgress = true;
        this.initializationState.lastStartedAt = this.now();
        this.initializationState.lastError = undefined;
        try {
            const config = this.configStore.readAll();
            for (const [name, serverCfg] of Object.entries(config)) {
                this.serverStates.set(name, {
                    name,
                    config: serverCfg,
                    status: serverCfg.enabled ? 'stopped' : 'stopped',
                    toolCount: 0,
                    restartCount: 0,
                });

                if (serverCfg.enabled) {
                    await this.connectToServer(name, serverCfg);
                }
            }
            this.initializationState.initialized = true;
            this.initializationState.lastCompletedAt = this.now();
            this.initializationState.lastSuccessAt = this.initializationState.lastCompletedAt;
        } catch (error) {
            this.initializationState.lastCompletedAt = this.now();
            this.initializationState.lastError = error instanceof Error ? error.message : String(error);
            console.error('[MCPAggregator] Failed to load config:', error);
        } finally {
            this.initializationState.inProgress = false;
        }
    }

    public getInitializationStatus() {
        return {
            ...this.initializationState,
            connectedClientCount: this.clients.size,
            configuredServerCount: this.serverStates.size,
        };
    }

    public async connectToServer(name: string, config: MCPServerConfig): Promise<void> {
        const state = this.upsertState(name, config);
        state.status = 'connecting';

        console.log(`[MCPAggregator] Connecting to downstream server: ${name}...`);
        try {
            const previousClient = this.clients.get(name);
            if (previousClient) {
                await previousClient.close();
            }

            const client = this.createClient(name, config);
            await client.connect();
            this.clients.set(name, client);
            state.status = 'connected';
            state.lastError = undefined;
            state.toolCount = (await this.listToolsForServer(name, client)).length;
            console.log(`[MCPAggregator] ✓ Connected to ${name}`);
        } catch (error) {
            state.status = 'error';
            state.lastError = error instanceof Error ? error.message : String(error);
            console.error(`[MCPAggregator] ❌ Failed to connect to ${name}:`, error);
        }
    }

    public async executeTool(name: string, args: unknown): Promise<unknown> {
        const namespacedTool = parseNamespacedToolName(name);
        if (namespacedTool) {
            const client = this.clients.get(namespacedTool.serverName);
            if (!client) {
                throw new Error(`Tool '${name}' not found in any connected MCP server.`);
            }

            return this.callToolOnServer(namespacedTool.serverName, namespacedTool.toolName, args, client);
        }

        for (const [serverName, client] of this.clients.entries()) {
            const tools = await this.listToolsForServer(serverName, client);
            if (tools.find((tool) => tool.name === name)) {
                return this.callToolOnServer(serverName, name, args, client);
            }
        }

        throw new Error(`Tool '${name}' not found in any connected MCP server.`);
    }

    public async listAggregatedTools(): Promise<MCPAggregatedTool[]> {
        const allTools: MCPAggregatedTool[] = [];

        for (const [serverName, client] of this.clients.entries()) {
            const tools = await this.listToolsForServer(serverName, client);
            const namespaced = tools.map((tool) => this.namespaceTool(serverName, tool));
            allTools.push(...namespaced);
        }

        return allTools;
    }

    public async addServerConfig(name: string, config: MCPServerConfig): Promise<void> {
        this.configStore.upsert(name, config);
        this.upsertState(name, config);
        await this.connectToServer(name, config);
        console.log(`[MCPAggregator] Saved config for ${name}`);
    }

    public async removeServerConfig(name: string): Promise<void> {
        const client = this.clients.get(name);
        if (client) {
            await client.close();
            this.clients.delete(name);
        }

        this.configStore.remove(name);
        this.serverStates.delete(name);
    }

    public async notifyServerExit(name: string, error?: Error): Promise<void> {
        const state = this.serverStates.get(name);
        if (!state) {
            return;
        }

        this.clients.delete(name);
        state.status = 'restarting';
        state.restartCount += 1;
        state.lastError = error?.message;

        if (this.restartDelayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, this.restartDelayMs));
        }

        await this.connectToServer(name, state.config);
    }

    public async listServers(): Promise<MCPServerState[]> {
        const config = this.configStore.readAll();
        for (const [name, serverConfig] of Object.entries(config)) {
            this.upsertState(name, serverConfig);
        }

        return Array.from(this.serverStates.values()).map((state) => ({ ...state }));
    }

    public async searchTools(query: string): Promise<MCPAggregatedTool[]> {
        const normalizedQuery = query.trim().toLowerCase();
        const tools = await this.listAggregatedTools();

        if (!normalizedQuery) {
            return tools;
        }

        return tools.filter((tool) => {
            const haystack = `${tool.name} ${tool._originalName} ${tool.description ?? ''} ${tool.server}`.toLowerCase();
            return haystack.includes(normalizedQuery);
        });
    }

    public getTrafficEvents() {
        return this.trafficInspector.getEvents();
    }

    public async shutdown(): Promise<void> {
        for (const client of this.clients.values()) {
            await client.close();
        }
        this.clients.clear();
    }

    private upsertState(name: string, config: MCPServerConfig): MCPServerState {
        const existing = this.serverStates.get(name);
        const nextState: MCPServerState = existing
            ? { ...existing, config }
            : {
                name,
                config,
                status: config.enabled ? 'stopped' : 'stopped',
                toolCount: 0,
                restartCount: 0,
            };

        this.serverStates.set(name, nextState);
        return nextState;
    }

    private namespaceTool(serverName: string, tool: MCPToolDefinition): MCPAggregatedTool {
        return {
            ...tool,
            server: serverName,
            name: namespaceToolName(serverName, tool.name),
            _originalName: tool.name,
            description: `[${serverName}] ${tool.description ?? ''}`.trim(),
        };
    }

    private async listToolsForServer(serverName: string, client: MCPClientLike): Promise<MCPToolDefinition[]> {
        const start = this.now();

        try {
            const tools = await client.listTools();
            const state = this.serverStates.get(serverName);
            if (state) {
                state.toolCount = tools.length;
                state.status = 'connected';
            }

            this.trafficInspector.record({
                server: serverName,
                method: 'tools/list',
                paramsSummary: '',
                latencyMs: this.now() - start,
                success: true,
                timestamp: this.now(),
            });

            return tools;
        } catch (error) {
            const state = this.serverStates.get(serverName);
            if (state) {
                state.status = 'error';
                state.lastError = error instanceof Error ? error.message : String(error);
            }

            this.trafficInspector.record({
                server: serverName,
                method: 'tools/list',
                paramsSummary: '',
                latencyMs: this.now() - start,
                success: false,
                timestamp: this.now(),
                error: error instanceof Error ? error.message : String(error),
            });

            console.error(`[MCPAggregator] Error listing tools from ${serverName}:`, error);
            return [];
        }
    }

    private async callToolOnServer(serverName: string, toolName: string, args: unknown, client: MCPClientLike): Promise<unknown> {
        const start = this.now();

        try {
            const result = await client.callTool(toolName, args);
            const state = this.serverStates.get(serverName);
            if (state) {
                state.status = 'connected';
                state.lastError = undefined;
            }

            this.trafficInspector.record({
                server: serverName,
                method: 'tools/call',
                paramsSummary: summarizeParams(args),
                latencyMs: this.now() - start,
                success: true,
                timestamp: this.now(),
                toolName,
            });
            return result;
        } catch (error) {
            const state = this.serverStates.get(serverName);
            if (state) {
                state.lastError = error instanceof Error ? error.message : String(error);
            }

            this.trafficInspector.record({
                server: serverName,
                method: 'tools/call',
                paramsSummary: summarizeParams(args),
                latencyMs: this.now() - start,
                success: false,
                timestamp: this.now(),
                toolName,
                error: error instanceof Error ? error.message : String(error),
            });

            throw error;
        }
    }
}
