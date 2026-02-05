import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import fs from "fs";

interface MCPServerConfig {
    command: string;
    args: string[];
    enabled: boolean;
    env?: Record<string, string>;
}

export class MCPAggregator {
    private clients: Map<string, Client> = new Map();
    private configPath: string;

    constructor(configPath?: string) {
        this.configPath = configPath || path.join(process.cwd(), 'config', 'mcp_servers.json');
    }

    public async initialize() {
        if (!fs.existsSync(this.configPath)) return;

        const configStr = fs.readFileSync(this.configPath, 'utf8');
        try {
            const config = JSON.parse(configStr) as Record<string, MCPServerConfig>;
            for (const [name, serverCfg] of Object.entries(config)) {
                if (serverCfg.enabled) {
                    await this.connectToServer(name, serverCfg);
                }
            }
        } catch (e) {
            console.error("[MCPAggregator] Failed to load config:", e);
        }
    }

    public async connectToServer(name: string, config: MCPServerConfig) {
        console.log(`[MCPAggregator] Connecting to downstream server: ${name}...`);
        try {
            const transport = new StdioClientTransport({
                command: config.command,
                args: config.args,
                env: { ...process.env, ...config.env } as Record<string, string>
            });

            const client = new Client(
                { name: "borg-aggregator", version: "1.0.0" },
                { capabilities: {} }
            );

            await client.connect(transport);
            this.clients.set(name, client);
            console.log(`[MCPAggregator] ✓ Connected to ${name}`);
        } catch (e) {
            console.error(`[MCPAggregator] ❌ Failed to connect to ${name}:`, e);
        }
    }

    public async executeTool(name: string, args: any): Promise<any> {
        // Namespaced tool call? e.g. "github__create_issue"
        const separatorIndex = name.indexOf("__");
        if (separatorIndex !== -1) {
            const serverName = name.substring(0, separatorIndex);
            const toolName = name.substring(separatorIndex + 2);

            const client = this.clients.get(serverName);
            if (client) {
                return await client.callTool({ name: toolName, arguments: args });
            }
        }

        // Fallback: Broadcast / Search
        for (const [serverName, client] of this.clients.entries()) {
            try {
                const tools = await client.listTools();
                if (tools.tools.find(t => t.name === name)) {
                    return await client.callTool({ name, arguments: args });
                }
            } catch (e) {
                // Ignore lookup errors
            }
        }

        throw new Error(`Tool '${name}' not found in any connected MCP server.`);
    }

    public async listAggregatedTools(): Promise<any[]> {
        const allTools: any[] = [];
        for (const [serverName, client] of this.clients.entries()) {
            try {
                const result = await client.listTools();
                const namespaced = result.tools.map(t => ({
                    ...t,
                    name: `${serverName}__${t.name}`, // Namespacing
                    _originalName: t.name,
                    description: `[${serverName}] ${t.description}`
                }));
                allTools.push(...namespaced);
            } catch (e) {
                console.error(`[MCPAggregator] Error listing tools from ${serverName}:`, e);
            }
        }
        return allTools;
    }

    public async addServerConfig(name: string, config: MCPServerConfig) {
        // 1. Update runtime
        await this.connectToServer(name, config);

        // 2. Persist to disk
        try {
            let currentConfig: Record<string, MCPServerConfig> = {};
            if (fs.existsSync(this.configPath)) {
                currentConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            }
            currentConfig[name] = config;

            // Ensure dir exists
            const dir = path.dirname(this.configPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            fs.writeFileSync(this.configPath, JSON.stringify(currentConfig, null, 2));
            console.log(`[MCPAggregator] Saved config for ${name}`);
        } catch (e) {
            console.error(`[MCPAggregator] Failed to save config:`, e);
            throw new Error("Failed to persist server config");
        }
    }

    public async listServers() {
        const config = fs.existsSync(this.configPath)
            ? JSON.parse(fs.readFileSync(this.configPath, 'utf8'))
            : {};

        const servers = [];
        for (const [name, cfg] of Object.entries(config)) {
            const client = this.clients.get(name);
            let status = 'stopped';
            let toolCount = 0;

            if (client) {
                status = 'connected';
                try {
                    const tools = await client.listTools();
                    toolCount = tools.tools.length;
                } catch (e) {
                    status = 'error';
                }
            }

            servers.push({
                name,
                config: cfg,
                status,
                toolCount
            });
        }
        return servers;
    }

    public async shutdown() {
        for (const client of this.clients.values()) {
            await client.close();
        }
    }
}
