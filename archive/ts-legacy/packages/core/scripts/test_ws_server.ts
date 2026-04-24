
import { MCPServer } from '../src/MCPServer.js';
import WebSocket from 'ws';

async function testConnection() {
    console.log("Attempting to connect to EXISTING server at ws://localhost:3001...");
    try {
        await new Promise<void>((resolve, reject) => {
            const ws = new WebSocket('ws://127.0.0.1:3001');
            const timer = setTimeout(() => {
                ws.terminate();
                reject(new Error("Connection timed out"));
            }, 2000);

            ws.on('open', () => {
                clearTimeout(timer);
                console.log("✅ CONNECTED to existing server!");
                ws.close();
                resolve();
            });

            ws.on('error', (err) => {
                clearTimeout(timer);
                reject(err); // Propagate error to try starting server
            });
        });
        console.log("Existing server is HEALTHY.");
        process.exit(0);
    } catch (e) {
        console.log("Could not connect to existing server:", e.message);
        console.log("Starting NEW MCPServer instance...");

        try {
            const server = new MCPServer(); // Should start on 3001
            // Give it a moment
            await new Promise(r => setTimeout(r, 2000));

            // Try connecting again
            const ws = new WebSocket('ws://localhost:3001');
            await new Promise<void>((resolve, reject) => {
                ws.on('open', () => {
                    console.log("✅ CONNECTED to NEW server!");
                    ws.close();
                    resolve();
                });
                ws.on('error', (err) => reject(err));
            });
            console.log("New server is HEALTHY.");
            process.exit(0);
        } catch (err) {
            console.error("FAILED to start/connect to new server:", err);
            process.exit(1);
        }
    }
}

testConnection().catch(console.error);
