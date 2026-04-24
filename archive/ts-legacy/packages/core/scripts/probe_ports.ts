
import net from 'net';

const ports = [3001, 3100];

async function checkPort(port: number) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2000);

        socket.on('connect', () => {
            console.log(`✅ Port ${port} is OPEN and accepting connections.`);
            socket.destroy();
            resolve(true);
        });

        socket.on('timeout', () => {
            console.log(`⚠️ Port ${port} TIMED OUT.`);
            socket.destroy();
            resolve(false);
        });

        socket.on('error', (err) => {
            console.log(`❌ Port ${port} connection failed: ${err.message}`);
            resolve(false);
        });

        console.log(`Probing port ${port}...`);
        socket.connect(port, '127.0.0.1');
    });
}

async function run() {
    console.log("Starting Port Probe...");
    for (const port of ports) {
        await checkPort(port);
    }
}

run();
