
import { MeshService } from '../src/services/MeshService.js';
import { SwarmMessageType } from '../src/mesh/SwarmProtocol.js';

async function testMesh() {
    console.log("Starting Mesh Test (RPC Mode)...");

    const nodeA = new MeshService();
    const nodeB = new MeshService();

    // Node B listens for requests
    nodeB.on('message', (msg) => {
        if (msg.type === SwarmMessageType.CAPABILITY_QUERY) {
            console.log(`[Node B] Received QUERY from ${msg.sender}`);
            // Use sendResponse to reply
            nodeB.sendResponse(msg, SwarmMessageType.CAPABILITY_RESPONSE, { role: 'Worker', skills: ['TypeScript'] });
        }
    });

    nodeA.on('peer:connect', async (peerId) => {
        console.log(`[Node A] Connected to ${peerId}`);

        try {
            console.log("[Node A] Sending CAPABILITY_QUERY...");
            const response = await nodeA.request(peerId, SwarmMessageType.CAPABILITY_QUERY, { query: 'skills' });
            console.log("[Node A] Received RPC Response:", response);

            if (response.type === SwarmMessageType.CAPABILITY_RESPONSE && response.payload.role === 'Worker') {
                console.log("SUCCESS: RPC Verified.");
                process.exit(0);
            } else {
                console.error("FAILURE: Unexpected response");
                process.exit(1);
            }
        } catch (e) {
            console.error("[Node A] RPC Failed:", e);
            process.exit(1);
        }
    });

    // Wait for discovery and execution
    setTimeout(() => {
        console.log("Timeout waiting for test completion.");
        process.exit(1);
    }, 15000);
}

testMesh();
