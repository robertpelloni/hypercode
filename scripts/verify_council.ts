
import { MCPServer } from '../packages/core/src/MCPServer.js';

// Mock Config
process.env.AUTONOMY_LEVEL = 'low'; // Force consultation for high risk
process.env.NODE_ENV = 'development';

async function run() {
    console.log("Initializing MCPServer for Council Test...");
    const server = new MCPServer({ skipWebsocket: true });

    // Mock Permission Manager to force consultation
    // Actually, we can just call council directly for unit test
    console.log("Starting Debate Manual Test...");

    const proposal = "Execute tool 'delete_file' on 'C:/Users/hyper/workspace/hypercode/packages/core/src/index.ts'";

    try {
        const result = await server['council'].startDebate(proposal);

        console.log("\n--- DEBATE RESULTS ---");
        console.log(`Decision: ${result.approved ? 'APPROVED' : 'DENIED'}`);
        console.log(`Summary: ${result.summary}`);
        console.log("Transcripts:");
        result.transcripts.forEach(t => {
            console.log(`[${t.speaker}]: ${t.text}`);
        });

    } catch (e) {
        console.error("Debate Failed:", e);
    }
}

run();
