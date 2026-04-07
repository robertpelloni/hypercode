
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { WebSocketClientTransport } from "@modelcontextprotocol/sdk/client/websocket.js";
import WebSocket from "ws"; // Requires 'ws' package or global in Node 22+

async function run() {
    console.log("Connecting to HyperCode Core via WebSocket...");

    // Create a WebSocket transport (Core runs on 3001 for WS)
    // Note: We need to ensure global WebSocket is available if the SDK expects it, 
    // or pass the implementation if the transport supports it.
    // The official SDK 'websocket.js' usually expects a URL.

    // Polyfill for Node environment if needed
    // @ts-ignore
    global.WebSocket = WebSocket;

    const transport = new WebSocketClientTransport(new URL("ws://localhost:3001"));

    const client = new Client(
        { name: "autonomous-trigger", version: "1.0.0" },
        { capabilities: {} }
    );

    try {
        await client.connect(transport);
        console.log("Connected to HyperCode Core!");

        // Trigger Auto-Drive
        console.log("Starting Auto-Drive...");
        const result = await client.callTool({
            name: "start_auto_drive",
            arguments: {}
        });

        console.log("Auto-Drive Started:", result);

        // Keep process alive to receive logs/events if we subscribed? 
        // Auto-drive is a fire-and-forget toggle in the Director, 
        // but we might want to listen for 'chat_reply' or status updates.

        // For now, just exit after triggering, as the Server (pnpm start) handles the loop.
        // process.exit(0);

        // Actually, let's keep it open to see if we get messages back
        console.log("Listening for events... (Press Ctrl+C to stop)");

    } catch (e) {
        console.error("Connection Failed:", e);
    }
}

run();
