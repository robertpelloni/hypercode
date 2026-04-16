
import { CoderAgent } from '../src/agents/CoderAgent.js';
import { SwarmMessageType } from '../src/mesh/SwarmProtocol.js';

async function testDelegation() {
    console.log("Starting Worker Delegation Test (Unit Test Mode)...");

    // 1. Start Coder Worker
    const worker = new CoderAgent();
    // @ts-ignore - Access protected mesh for testing
    const workerMesh = worker.mesh;

    console.log(`[Test] Worker started: ${worker.nodeId}`);

    // 2. Mock Director (No real mesh needed for this test if we inject message)
    const directorId = "director-mock-id";

    // 3. Spy on sendDirect/sendResponse
    // @ts-ignore
    workerMesh.sendDirect = (target, type, payload) => {
        console.log(`[Test] Mock Network::sendDirect to ${target}: [${type}]`, payload);
        if (type === SwarmMessageType.TASK_RESULT) {
            console.log("SUCCESS: Task Result Received from Agent.");
            process.exit(0);
        }
    };
    // @ts-ignore
    workerMesh.sendResponse = (originalMsg, type, payload) => {
        console.log(`[Test] Mock Network::sendResponse: [${type}]`, payload);
    };

    // 4. Simulate Incoming TASK_OFFER
    const task = "Create a hello world function";
    console.log(`[Test] Simulating TASK_OFFER: "${task}"`);

    // Emit 'message' event as if it came from swarm
    // We need to wait a tick for listeners to be attached? usually instant.
    // However, worker.initialize() attaches listener in constructor.

    workerMesh.emit('message', {
        id: 'msg-123',
        type: SwarmMessageType.TASK_OFFER,
        sender: directorId,
        timestamp: Date.now(),
        payload: {
            task,
            requirements: ['coding'],
            requester: 'Director'
        }
    });

    // Wait for async processing
    setTimeout(() => {
        console.error("FAILURE: Timeout waiting for TASK_RESULT.");
        process.exit(1);
    }, 5000);
}

testDelegation();
