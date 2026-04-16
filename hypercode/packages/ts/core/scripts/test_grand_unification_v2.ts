
import { MCPServer } from '../src/MCPServer.js';
import * as path from 'path';
import * as fs from 'fs';
import { SessionManager } from '../src/services/SessionManager.js';

async function runGrandUnificationV2() {
    console.log("🚀 Starting Grand Unification V2: 'Resilient Intelligence'");

    // 1. Initialize Server
    const server = new MCPServer({ skipWebsocket: true, skipAutoDrive: true });

    try {
        console.log("\n[1/5] 💾 Session Persistence Test...");
        const sessionFile = path.join(process.cwd(), '.hypercode-session.json');

        // Clean start
        if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile);

        // Modify State
        server.sessionManager.updateState({
            isAutoDriveActive: true,
            activeGoal: "Conquer the Universe"
        });
        server.sessionManager.save();

        // Verify File
        if (!fs.existsSync(sessionFile)) throw new Error("Session file not created!");
        const savedData = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
        if (savedData.activeGoal !== "Conquer the Universe") throw new Error("Session data mismatch!");
        console.log("✅ Session Saved Successfully.");

        // Simulate Restart (New Instance)
        const newSessionManager = new SessionManager(process.cwd());
        const restored = newSessionManager.getState();
        if (!restored.isAutoDriveActive || restored.activeGoal !== "Conquer the Universe") {
            throw new Error("Session Restoration Failed!");
        }
        console.log("✅ Session Restored Successfully.");

        // 2. Director Autopilot Integration
        console.log("\n[2/5] 🎬 Director Autopilot State...");

        // Reset Director to IDLE
        server.director.stopAutoDrive();

        // Start AutoDrive
        await server.director.executeTask("Test Task", 1); // Run a single task to warm up
        await server.director.startAutoDrive();

        const directorConfig = server.director.getConfig();
        console.log(`✅ Director Config Loaded (Heartbeat: ${directorConfig.heartbeatIntervalMs}ms)`);

        // Verify Session Manager reflection
        const currentSession = server.sessionManager.getState();
        if (!currentSession.isAutoDriveActive) throw new Error("Director did not update SessionManager on startAutoDrive!");
        console.log("✅ Director <-> SessionManager Sync Verified.");

        server.director.stopAutoDrive();

        // 3. Squads & Worktrees
        console.log("\n[3/5] 🎭 Maestro: Squad Isolation...");
        const taskId = `v2-test-${Date.now()}`;
        const worktreePath = await server.gitWorktreeManager.createTaskEnvironment(taskId);
        console.log(`✅ Worktree Created: ${worktreePath}`);
        await server.gitWorktreeManager.cleanupTaskEnvironment(taskId);
        console.log("✅ Worktree Cleaned.");

        // 4. Model Fallback Configuration Check
        console.log("\n[4/5] 🧠 Model Selector Fallback...");
        // @ts-ignore
        const selector = server.modelSelector;
        // Access private property via cast if necessary, or just test selection
        const model = await selector.selectModel({ taskComplexity: 'high' });
        console.log(`✅ Model Selected: ${model.provider}/${model.modelId}`);
        if (!['google', 'openai', 'anthropic'].includes(model.provider) && model.provider !== 'lmstudio') {
            console.warn(`⚠️ Unexpected provider selected: ${model.provider}`);
        }

        // 5. Cleanup
        console.log("\n[5/5] 🧹 Final Cleanup...");
        if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile);

        console.log("\n✨ Grand Unification V2 PASSED: Resilience Systems Operational.");
        process.exit(0);

    } catch (error) {
        console.error("\n❌ Test FAILED:", error);
        process.exit(1);
    }
}

runGrandUnificationV2();
