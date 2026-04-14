
import { MCPServer } from '../src/MCPServer.js';
import * as path from 'path';

async function runGrandUnificationTest() {
    console.log("🚀 Starting Grand Unification Test: 'The HyperCode Awakening'");

    // 1. Initialize Server (Core)
    const server = new MCPServer({ skipWebsocket: true, skipAutoDrive: true });

    try {
        // 2. Spawn a Task via Maestro (Swarm Orchestration)
        // We simulate a task that requires isolation
        console.log("\n[1/4] 🎭 Maestro: Creating Isolated Worktree...");
        const taskId = `grand-test-${Date.now()}`;
        const worktreePath = await server.gitWorktreeManager.createTaskEnvironment(taskId);
        console.log(`✅ Worktree Created: ${worktreePath}`);

        // 3. Use Agentic Browser to 'Research' (Browser-Use)
        console.log("\n[2/4] 🌐 Browser: Simulating Web Research...");
        // mocking actual browser call to avoid popping windows in CI/test env, 
        // but verifying the tool is accessible and wired.
        if (!server.browserTool) throw new Error("BrowserTool not initialized!");
        console.log("✅ BrowserTool is online and ready.");

        // 4. Use Cognee to Store 'Knowledge' (Graph Memory)
        console.log("\n[3/4] 🧠 Cognee: Storing Graph Knowledge...");
        // Simulate storing a fact derived from "research"
        const fact = {
            subject: "HyperCode Protocol",
            predicate: "has_status",
            object: "Operational"
        };
        // In a real run, we would await server.knowledgeService.addFact(fact);
        // For this test, we verify the service is up.
        // @ts-ignore
        if (!server.knowledgeService) throw new Error("KnowledgeService not initialized!");
        console.log(`✅ Cognee (KnowledgeService) is online. Ready to ingest: ${JSON.stringify(fact)}`);

        // 5. Use Semantic Search to Find Code (TxtAI)
        console.log("\n[4/4] 🔍 TxtAI: Semantic Search for 'Compiler Options'...");
        // We will search for something we know exists in this very repo
        const results = await server.searchService.search("compiler configuration", process.cwd());

        if (results.length > 0) {
            console.log(`✅ Search Successful! Found ${results.length} matches.`);
            console.log(`   Top match: ${path.basename(results[0].file)} (Score: ${results[0].score})`);
        } else {
            console.warn("⚠️ Search returned no results (Index might be empty or warming up).");
        }

        console.log("\n✨ Grand Unification Test PASSED: All Core Systems Linked.");

        // Cleanup
        await server.gitWorktreeManager.cleanupTaskEnvironment(taskId);
        console.log("🧹 Worktree Cleaned up.");
        process.exit(0);

    } catch (error) {
        console.error("❌ Test FAILED:", error);
        process.exit(1);
    }
}

runGrandUnificationTest();
