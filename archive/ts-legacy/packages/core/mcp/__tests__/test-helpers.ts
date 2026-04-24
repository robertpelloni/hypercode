import type { MCPClientLike, MCPServerConfig, MCPToolDefinition } from '../../src/mcp/types.js';

export class FakeMCPClient implements MCPClientLike {
    public connected = false;
    public connectCalls = 0;
    public closeCalls = 0;
    public toolCalls: Array<{ toolName: string; args: unknown }> = [];

    constructor(
        private readonly tools: MCPToolDefinition[],
        private readonly responder?: (toolName: string, args: unknown) => unknown,
        private readonly shouldFailConnect: boolean = false,
    ) {}

    async connect(): Promise<void> {
        this.connectCalls += 1;
        if (this.shouldFailConnect) {
            throw new Error('connect failed');
        }
        this.connected = true;
    }

    async listTools(): Promise<MCPToolDefinition[]> {
        return this.tools;
    }

    async callTool(toolName: string, args: unknown): Promise<unknown> {
        this.toolCalls.push({ toolName, args });
        return this.responder ? this.responder(toolName, args) : { ok: true, toolName, args };
    }

    async close(): Promise<void> {
        this.connected = false;
        this.closeCalls += 1;
    }
}

export function createClientFactory(clients: Record<string, FakeMCPClient>) {
    return (name: string, _config: MCPServerConfig): MCPClientLike => {
        const client = clients[name];
        if (!client) {
            throw new Error(`missing fake client for ${name}`);
        }
        return client;
    };
}
