
import { DarwinService } from '../src/services/DarwinService.js';
import { LLMService } from '@hypercode/ai';
import { MCPServer } from '../src/MCPServer.js';

// Mock LLM
// @ts-ignore
class MockLLM extends LLMService {
    constructor() {
        super();
    }
    // @ts-ignore
    async generateText(provider: string, model: string, sys: string, usr: string, opts: any) {
        if (sys.includes("prompt engineer")) {
            return { text: JSON.stringify({ mutatedPrompt: "Better prompt", reasoning: "Because." }) };
        }
        if (usr.includes("Compare two AI outputs")) {
            return { text: JSON.stringify({ winner: "B", reasoning: "B is better." }) };
        }
        return { text: "Mock response" };
    }
}

async function main() {
    console.log("Starting Darwin Verification...");
    const llm = new MockLLM();
    // @ts-ignore
    const server = {} as MCPServer;

    const darwin = new DarwinService(llm, server);

    console.log("1. Proposing Mutation...");
    const mutation = await darwin.proposeMutation("Do a thing", "Do it better");
    console.log("Mutation:", mutation);

    if (mutation.mutatedPrompt === "Better prompt") {
        console.log("✓ Mutation Proposal Success");
    } else {
        console.error("✗ Mutation Proposal Failed");
        process.exit(1);
    }

    console.log("2. Starting Experiment...");
    const exp = await darwin.startExperiment(mutation.id, "Test Task");
    console.log("Experiment Started:", exp);

    if (exp.status === 'PENDING' || exp.status === 'RUNNING') {
        console.log("✓ Experiment Start Success");
    } else {
        console.error("✗ Experiment Start Failed");
        process.exit(1);
    }

    // Wait for async experiment logic
    console.log("Waiting for experiment to complete...");
    await new Promise(r => setTimeout(r, 1000));

    const updatedExp = darwin.getStatus().experiments.find(e => e.id === exp.id);
    console.log("Experiment Status after delay:", updatedExp);

    if (updatedExp?.status === 'COMPLETED' && updatedExp.winner === 'B') {
        console.log("✓ Experiment Completion Success");
    } else {
        console.error("✗ Experiment Completion Failed");
        process.exit(1);
    }

    console.log("ALL CHECKS PASSED");
}

main().catch(console.error);
