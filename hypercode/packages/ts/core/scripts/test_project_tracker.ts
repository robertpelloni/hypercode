
import { ProjectTracker } from '../src/services/ProjectTracker.js';
import fs from 'fs';
import path from 'path';

const MOCK_FILE = 'mock_task.md';

function createMockFile() {
    const content = `
# Mock Tasks

- [x] Phase 1: Completed
- [/] Phase 2: Active
  - [x] Step 1
  - [ ] Step 2: Target
  - [ ] Step 3: Pending
- [ ] Phase 3: Future
`;
    fs.writeFileSync(MOCK_FILE, content);
}

async function testProjectTracker() {
    console.log("🧪 Starting ProjectTracker Test...");

    // Setup
    createMockFile();
    const tracker = new ProjectTracker(process.cwd());

    // 1. Test getNextTask
    // Override internal logic to force it to look at MOCK_FILE?
    // ProjectTracker looks for specific filenames. 
    // I should probably subclass or mock, but let's just rename mock_file to task.md temporarily in a safe dir?
    // Or simpler: Modify ProjectTracker to accept a filename override in `getNextTask`? 
    // No, I'll just rely on the fact that ProjectTracker looks for `task.md` in CWD as a fallback.

    fs.renameSync(MOCK_FILE, 'task.md');

    try {
        console.log("1️⃣  Testing getNextTask()...");
        const task = tracker.getNextTask();

        if (!task) throw new Error("No task found!");
        if (!task.description.includes("Step 2: Target")) throw new Error(`Wrong task found: ${task.description}`);

        console.log(`✅ Found correctly: ${task.description}`);

        // 2. Test completeTask
        console.log("2️⃣  Testing completeTask()...");
        tracker.completeTask(task);

        const content = fs.readFileSync('task.md', 'utf-8');
        if (!content.includes('[x] Step 2: Target')) throw new Error("File not updated!");

        console.log("✅ Task marked as complete in file.");

        // 3. Test getNextTask again (Should be Step 3)
        console.log("3️⃣  Testing getNextTask (Sequence)...");
        const nextTask = tracker.getNextTask();

        if (!nextTask) throw new Error("No next task found!");
        if (!nextTask.description.includes("Step 3: Pending")) throw new Error(`Wrong next task: ${nextTask.description}`);

        console.log(`✅ Found next correctly: ${nextTask.description}`);

    } catch (e) {
        console.error("❌ Test Failed:", e);
        process.exit(1);
    } finally {
        // Cleanup
        if (fs.existsSync('task.md')) fs.unlinkSync('task.md');
    }
}

testProjectTracker();
