
function redirectProtocolUnsafeConsoleMethods(): void {
    const stderr = console.error.bind(console);

    console.log = stderr;
    console.info = stderr;
    console.debug = stderr;
    console.trace = stderr;
    console.dir = ((...args: unknown[]) => stderr(...args)) as typeof console.dir;
}

async function main() {
    // MCP stdio requires stdout to remain pristine JSON-RPC output only.
    redirectProtocolUnsafeConsoleMethods();

    process.on('unhandledRejection', (reason) => {
        console.error('[Borg Core] Unhandled promise rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
        console.error('[Borg Core] Uncaught exception:', error);
        process.exit(1);
    });

    try {
        const { MCPServer } = await import('./MCPServer.js');
        const mcp = new MCPServer({ skipWebsocket: true });
        await mcp.start();
        console.error("[Borg Core] MCP Server Stdio Entry Point Started.");
    } catch (err) {
        console.error("Failed to start MCP server:", err);
        process.exit(1);
    }
}

main();
