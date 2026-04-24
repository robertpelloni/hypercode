
import { MemoryManager } from '../src/services/MemoryManager.js';

async function main() {
    console.log("🔍 Verifying Knowledge Graph Ingestion...");
    const memory = new MemoryManager(process.cwd());

    // Search for Batch 4 topics
    const topics = ["MiroMindAI", "OpenCodeInterpreter", "LobeHub"];

    for (const topic of topics) {
        console.log(`\nChecking: ${topic}`);
        const results = await memory.search(topic, 1);

        if (results.length > 0) {
            console.log(`✅ Found: ${results[0].metadata.title || 'Untitled'} (ID: ${results[0].id})`);
            console.log(`   Preview: ${results[0].content.substring(0, 100)}...`);
        } else {
            console.log(`❌ Not Found: ${topic}`);
        }
    }
}

main().catch(console.error);
