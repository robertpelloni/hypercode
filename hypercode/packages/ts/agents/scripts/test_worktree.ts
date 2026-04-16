import { WorktreeManager } from '../src/orchestration/WorktreeManager';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log("Testing WorktreeManager...");
    const manager = new WorktreeManager(process.cwd());
    const taskId = "test-task-" + Date.now();

    try {
        console.log(`Creating worktree for ${taskId}...`);
        const wtPath = await manager.createTaskEnvironment(taskId);
        console.log(`Worktree created at: ${wtPath}`);

        if (fs.existsSync(wtPath) && fs.existsSync(path.join(wtPath, '.git'))) {
            console.log("SUCCESS: Worktree directory and .git file exist.");
        } else {
            console.error("FAILURE: Worktree not created properly.");
        }

        // Cleanup
        console.log("Cleaning up...");
        await manager.cleanupTaskEnvironment(taskId);

        if (fs.existsSync(wtPath)) {
            console.error("FAILURE: Worktree directory still exists.");
        } else {
            console.log("SUCCESS: Worktree cleaned up.");
        }

    } catch (e) {
        console.error("Test Failed:", e);
    }
}

main();
