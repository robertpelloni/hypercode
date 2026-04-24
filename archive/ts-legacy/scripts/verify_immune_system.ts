
// @ts-ignore
import { EventBus } from '../packages/core/src/services/EventBus.js';
// @ts-ignore
import { TerminalSensor } from '../packages/core/src/sensors/TerminalSensor.js';
// @ts-ignore
import { HealerReactor } from '../packages/core/src/reactors/HealerReactor.js';
// @ts-ignore
import { HealerService } from '../packages/core/src/services/HealerService.js';
// @ts-ignore
import { LLMService } from '../packages/ai/src/LLMService.js';
// @ts-ignore
import { ModelSelector } from '../packages/ai/src/ModelSelector.js';
import fs from 'fs/promises';
import path from 'path';

async function verify() {
    console.log("🧪 Verifying Immune System...");

    // 1. Mock Infrastructure
    const eventBus = new EventBus();
    const selector = new ModelSelector();
    const llm = new LLMService(selector);

    // Mock MCPServer (just enough for HealerService)
    const mockServer = {} as any;

    const healerService = new HealerService(llm, mockServer);

    // Override llm.generateText to return a simulated fix
    // This avoids using real API credits and guarantees a predictable fix for testing
    // @ts-ignore
    healerService.llm = {
        generateText: async (provider: string, model: string, system: string, prompt: string) => {
            if (prompt.includes('Return JSON format')) {
                // Diagnosis Step
                return {
                    content: JSON.stringify({
                        errorType: "SyntaxError",
                        description: "Unexpected token",
                        file: "packages/core/src/reactors/test_generated/sick_file.ts",
                        suggestedFix: "Remove the semicolon",
                        confidence: 1.0
                    })
                };
            } else {
                // Fix Application Step
                return {
                    content: `
                    // Fixed Code
                    export const TEST_CONSTANT = "I am healed";
                    `
                };
            }
        }
    } as any;

    const healerReactor = new HealerReactor(eventBus, healerService);
    healerReactor.start();

    // 2. Create a "Sick" File
    const testDir = path.join(process.cwd(), 'packages', 'core', 'src', 'reactors', 'test_generated');
    await fs.mkdir(testDir, { recursive: true });
    const sickFile = path.join(testDir, 'sick_file.ts');

    console.log("Creating sick file:", sickFile);
    await fs.writeFile(sickFile, 'This is a syntax error;', 'utf-8');

    // 3. Simulate Terminal Error (The Sensor would normally do this)
    console.log("Simulating terminal error...");
    const errorLog = `
    Error: SyntaxError: Unexpected token
    at ${sickFile}:1:1
    `;

    // We emit the event directly to test the Reactor -> Service loop
    // (We verified Sensor -> Bus in Phase 43)
    eventBus.emitEvent('terminal:error', 'TerminalSensor', { error: errorLog, message: errorLog });

    // 4. Wait for Healing
    console.log("Waiting 5s for immune response...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 5. Verify Fix
    const content = await fs.readFile(sickFile, 'utf-8');
    console.log("File content after healing:\n", content);

    if (content.includes('I am healed')) {
        console.log("✅ Immune System Successful! File was healed.");
    } else {
        console.error("❌ Immune System Failure. File remains broken.");
        process.exit(1);
    }

    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
}

verify().catch(console.error);
