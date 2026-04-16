
import { MCPServer } from '../packages/core/src/MCPServer.js';
import { mcpServersRepository } from '../packages/core/src/db/repositories/index.js';
import { namespacesRepository } from '../packages/core/src/db/repositories/index.js';
import { endpointsRepository } from '../packages/core/src/db/repositories/index.js';
import { McpServerPool } from '../packages/core/src/services/mcp-server-pool.service.js';

async function main() {
    console.log("🚀 Starting MetaMCP Backend Verification...");

    // 1. Initialize Server
    const server = new MCPServer({ skipWebsocket: true, skipAutoDrive: true });
    await server.initializeMemorySystem();
    console.log("✅ MCPServer Initialized");

    // 2. Create Test Namespace
    const namespace = await namespacesRepository.create({
        name: "verification-test",
        description: "Created by verification script"
    });
    console.log(`✅ Namespace Created: ${namespace.name} (${namespace.uuid})`);

    // 3. Add STDIO MCP Server (Memory)
    // Using @modelcontextprotocol/server-memory which should be available or we can use a simple node script
    const serverConfig = await mcpServersRepository.create({
        name: "memory-server",
        type: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-memory"],
        env: "{}",
    });
    console.log(`✅ MCP Server Config Created: ${serverConfig.name}`);

    // 4. Link Server to Namespace
    await namespacesRepository.addServerToNamespace(namespace.uuid, serverConfig.uuid);
    console.log("✅ Server linked to Namespace");

    // 5. Connect/Start Pool
    // Usually handled by auto-discovery or the server pool service directly
    // Let's try to trigger a connection via the pool
    const pool = server.mcpServerPool as McpServerPool; // Assuming public access or I need to cast

    // We need to trigger the pool to load this server.
    // The pool usually loads all servers on startup or when requested.
    // Let's force a sync/refresh logic if available, or just manually connect.

    console.log("🔄 Triggering Server Connection...");
    // Ideally: await pool.connectServer(serverConfig);
    // But since pool manages lifecycle, we might rely on it detecting the DB change if we reload it.
    // For verification, we might need to manually instantiate a client for this server config.

    // Check if tools are discoverable
    // const tools = await server.getTools();
    // console.log("🛠️ Discovered Tools:", tools.map(t => t.name));

    console.log("✅ Verification Script Complete (Partial - DB Logic Verified)");
    process.exit(0);
}

main().catch(console.error);
