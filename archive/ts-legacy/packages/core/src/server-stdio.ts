
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
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/server-stdio.ts
        console.error('[HyperCode Core] Unhandled promise rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
        console.error('[HyperCode Core] Uncaught exception:', error);
=======
        console.error('[borg Core] Unhandled promise rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
        console.error('[borg Core] Uncaught exception:', error);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/server-stdio.ts
        process.exit(1);
    });

    try {
        const { startStdioLoader } = await import('./stdioLoader.js');
        await startStdioLoader();
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/server-stdio.ts
        console.error('[HyperCode Core] MCP stdio loader started.');
=======
        console.error('[borg Core] MCP stdio loader started.');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/server-stdio.ts
    } catch (err) {
        console.error("Failed to start MCP server:", err);
        process.exit(1);
    }
}

main();
