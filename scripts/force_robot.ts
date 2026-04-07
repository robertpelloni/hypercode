import WebSocket from 'ws';

const url = 'ws://localhost:3001';
const ws = new WebSocket(url);

ws.on('open', () => {
    console.log("Connected to HyperCode Core. Triggering Auto-Drive...");

    // Determine a request ID
    const requestId = "force_robot_" + Date.now();

    // The protocol for Calling a Tool via WS in MCPServer.ts is:
    // It listens for type: 'CALL_TOOL'?
    // Wait, MCPServer.ts implementation of WebSocketServerTransport usually handles 'tool_call' or similar?
    // Let's check MCPServer code logic for incoming messages.
    // MCPServer.ts line 626:
    // wss.on('connection', ... ws.on('message', ...
    // It checks for 'STATUS_UPDATE'.
    // It DOES NOT seem to have a generic "Execute Tool" handler exposed on the RAW WebSocket for *commands*?
    // Wait. MCPServer.ts lines 615+ sets up WebSocketServerTransport.
    // The WebSocketServerTransport (JSON-RPC) handles the actual tool calls if it's following MCP spec.

    // However, the `ws.on('message')` block in MCPServer.ts (lines 628-641) *intercepts* specific messages like STATUS_UPDATE.
    // The `wsTransport` (line 620) is connected to `this.wsServer.connect(wsTransport)`.
    // So `wsServer` is an MCP Server. It expects JSON-RPC 2.0 messages.

    // So we should send a standard JSON-RPC request to execute `start_auto_drive`.

    const jsonRpc = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
            name: "start_auto_drive",
            arguments: {}
        }
    };

    ws.send(JSON.stringify(jsonRpc));
    console.log("Sent JSON-RPC request:", JSON.stringify(jsonRpc));
});

ws.on('message', (data) => {
    console.log("Received:", data.toString());
    // If successful, we should see a result.
});

ws.on('error', (e) => {
    console.error("Connection error:", e.message);
    process.exit(1);
});
