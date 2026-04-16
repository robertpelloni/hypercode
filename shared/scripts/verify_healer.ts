
import { HealerService } from '../packages/core/src/services/HealerService.js';
import path from 'path';

// Mock LLM
const mockLLM = {
    generateText: async (prompt, options) => {
        if (prompt.includes("Diagnosis")) {
            return JSON.stringify({
                explanation: "Fixed syntax error",
                newContent: "const x = 10; // Fixed"
            });
        }
        return JSON.stringify({
            errorType: "SyntaxError",
            description: "Missing semicolon",
            file: path.join(process.cwd(), 'temp_broken.ts'),
            suggestedFix: "Add semicolon",
            confidence: 0.95
        });
    }
};

// Mock Server
const mockServer = {};

async function testHealer() {
    console.log("🚑 Testing Healer Service...");
    const fs = await import('fs/promises');

    const testFile = path.join(process.cwd(), 'temp_broken.ts');
    await fs.writeFile(testFile, "const x = 10 // Broken", 'utf-8');

    // @ts-ignore
    const healer = new HealerService(mockLLM, mockServer);

    const success = await healer.heal("SyntaxError: Missing semicolon at temp_broken.ts:1");

    if (success) {
        console.log("✅ Healer returned success.");
        const content = await fs.readFile(testFile, 'utf-8');
        if (content.includes("// Fixed")) {
            console.log("✅ File content updated correctly.");
        } else {
            console.error("❌ File content NOT updated.");
        }
    } else {
        console.error("❌ Healer returned failure.");
    }

    // Cleanup
    await fs.unlink(testFile);
}

testHealer().catch(console.error);
