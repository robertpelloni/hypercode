
import WebSocket from 'ws';

async function testUrl(url: string) {
    console.log(`Testing ${url}...`);
    return new Promise((resolve) => {
        const ws = new WebSocket(url);

        ws.on('open', () => {
            console.log(`✅ ${url}: CONNECTED`);
            ws.close();
            resolve(true);
        });

        ws.on('error', (err) => {
            console.log(`❌ ${url}: ERROR - ${err.message}`);
            resolve(false);
        });

        setTimeout(() => {
            console.log(`⚠️ ${url}: TIMEOUT`);
            ws.terminate();
            resolve(false);
        }, 2000);
    });
}

async function run() {
    await testUrl('ws://127.0.0.1:3001');
    await testUrl('ws://localhost:3001');
}

run();
