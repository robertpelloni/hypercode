
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3001');

const CALLS = [
    {
        method: "tools/call",
        params: {
            name: "set_autonomy",
            arguments: { level: "high" }
        }
    },
    {
        method: "tools/call",
        params: {
            name: "start_chat_daemon",
            arguments: {}
        }
    },
    {
        method: "tools/call",
        params: {
            name: "start_watchdog",
            arguments: { maxCycles: 100 }
        }
    }
];

ws.on('open', async () => {
    console.log("Connected to HyperCode Core (ws://localhost:3001)");

    let id = 1;
    for (const call of CALLS) {
        const request = {
            jsonrpc: "2.0",
            id: id++,
            method: call.method,
            params: call.params
        };

        console.log(`Sending: ${call.params.name}...`);
        ws.send(JSON.stringify(request));

        // Wait briefly
        await new Promise(r => setTimeout(r, 500));
    }

    console.log("✅ Autonomy Activation Signals Sent.");
    ws.close();
});

ws.on('message', (data) => {
    console.log("Response:", data.toString());
});

ws.on('error', (err) => {
    console.error("Connection Error:", err.message);
    console.error("Ensure HyperCode Core is running (pnpm start)!");
    process.exit(1);
});
