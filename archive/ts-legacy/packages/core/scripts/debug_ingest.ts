
import { MCPServer } from '../src/MCPServer.js';
import { ResearchService } from '../src/services/ResearchService.js';
import { MemoryManager } from '../src/services/MemoryManager.js';

async function main() {
    console.log("🔍 Debugging Ingestion...");
    const server = new MCPServer({ skipWebsocket: true }); // Skip WS to force fallback
    const memory = new MemoryManager(process.cwd());
    const research = new ResearchService(server, memory);

    // Initial wait for tools to load if any async init
    await new Promise(r => setTimeout(r, 1000));

    const url = "https://github.com/lobehub/lobehub";
    console.log(`Ingesting: ${url}`);

    try {
        const result = await research.ingest(url);
        console.log("Result:", result);
    } catch (e) {
        console.error("Ingest Error:", e);
    }

    // Verify immediately
    const check = await memory.search("LobeHub", 1);
    console.log("Immediate Verification:", check.length > 0 ? "FOUND" : "NOT FOUND");
}

main().catch(console.error);
