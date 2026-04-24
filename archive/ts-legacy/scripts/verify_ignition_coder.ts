/**
 * verify_ignition_coder.ts
 *
 * Phase 62 Ignition Verification: CoderAgent
 * Tests that the CoderAgent can execute real LLM-driven coding tasks.
 *
 * What it does:
 * 1. Wires up real LLMService + ModelSelector
 * 2. Constructs a real CoderAgent
 * 3. Asks the agent to create a file via LLM
 * 4. Verifies the file was actually written to disk
 * 5. Cleans up the test file
 */

import { CoderAgent } from '../packages/core/src/agents/CoderAgent.js';
import { LLMService, ModelSelector } from '../packages/ai/src/index.js';
import fs from 'fs/promises';
import path from 'path';

async function main() {
    console.log("🔥 IGNITION: Verifying CoderAgent...");

    // Wire up the real service chain:
    // ModelSelector picks the best available model (Google → Anthropic → OpenAI → DeepSeek → Local)
    // LLMService provides the generateText() interface used by CoderAgent
    const selector = new ModelSelector();
    const llm = new LLMService(selector);
    const agent = new CoderAgent(llm);

    // Test task: Ask the agent to create a simple file
    const testFile = 'ignition_test.txt';
    const task = `Create a file named ${testFile} with content 'Systems Online. Ignition Successful.'`;

    try {
        // This triggers the full coding pipeline:
        // 1. ModelSelector selects best available model (checks keys, quota, depletion)
        // 2. LLM generates a JSON plan { filename, content, reasoning }
        // 3. CoderAgent parses the JSON (with markdown code block fallback)
        // 4. CoderAgent writes the file to disk via fs.writeFile
        const result = await agent.handleTask({ task });
        console.log("Agent Result:", result);

        // Verify the file was actually created on disk
        const filePath = path.resolve(process.cwd(), testFile);
        const content = await fs.readFile(filePath, 'utf-8');

        if (content.includes('Ignition Successful')) {
            console.log("✅ SUCCESS: File created with correct content.");
            // Cleanup — remove the test file we just created
            await fs.unlink(filePath);
        } else {
            console.error("❌ FAILURE: File content mismatch:", content);
            process.exit(1);
        }

    } catch (e) {
        console.error("❌ FAILURE: Agent execution failed", e);
        process.exit(1);
    }
}

main();
