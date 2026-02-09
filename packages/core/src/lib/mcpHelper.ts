import type { MCPServer } from '../MCPServer.js';

export function getMcpServer(): MCPServer {
    // @ts-ignore
    const server = global.mcpServerInstance;
    if (!server) {
        throw new Error("MCPServer instance not initialized. Ensure the server has started.");
    }
    return server;
}
