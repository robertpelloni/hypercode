
import { MCPServer } from '../src/MCPServer.js';
import path from 'path';
import fs from 'fs';

async function main() {
    console.log("🐝 Testing The Swarm (Squads)...");

    // Mock Options
    const options = {
        skipWebsocket: true,
        skipAutoDrive: true
    };

    const server = new MCPServer(options);
    console.log("✅ MCPServer Initialized.");

    const testBranch = `swarm-test-${Date.now()}`;
    const testGoal = "Research the meaning of life (Mock)";

    // 1. Spawn Squad
    console.log(`\n[Test] Spawning Squad Member: ${testBranch}`);
    try {
        const res = await server.executeTool('start_squad', { branch: testBranch, goal: testGoal });
        console.log(`[Result] ${res.content[0].text}`);
    } catch (e: any) {
        console.error(`[Error] Spawn failed: ${e.message}`);
        process.exit(1);
    }

    // 2. List Squads
    console.log(`\n[Test] Listing Squads...`);
    try {
        const res = await server.executeTool('list_squads', {});
        const list = JSON.parse(res.content[0].text);
        console.log(`[Result] Active Members: ${list.length}`);
        console.log(JSON.stringify(list, null, 2));

        if (list.length === 0) throw new Error("List is empty!");
        if (list[0].branch !== testBranch) throw new Error("Branch mismatch!");
    } catch (e: any) {
        console.error(`[Error] List failed: ${e.message}`);
        process.exit(1);
    }

    // 3. Kill Squad
    console.log(`\n[Test] Killing Squad Member: ${testBranch}`);
    try {
        const res = await server.executeTool('kill_squad', { branch: testBranch });
        console.log(`[Result] ${res.content[0].text}`);
    } catch (e: any) {
        console.error(`[Error] Kill failed: ${e.message}`);
        process.exit(1);
    }

    // 4. Verify Cleanup
    console.log(`\n[Test] Verifying Cleanup...`);
    const res = await server.executeTool('list_squads', {});
    const list = JSON.parse(res.content[0].text);
    if (list.length !== 0) {
        console.error(`[Error] Cleanup failed, member still exists.`);
        process.exit(1);
    }

    console.log("\n✨ Swarm Test PASSED!");
    process.exit(0);
}

main().catch(err => {
    console.error("Test Failed:", err);
    process.exit(1);
});
