import { SpecializedAgent } from '../mesh/SpecializedAgent.js';
import { LLMService } from '@borg/ai';
import fs from 'fs/promises';
import path from 'path';

export class CoderAgent extends SpecializedAgent {
    private llm: LLMService;

    constructor() {
        super('Coder', ['coding', 'refactoring', 'debugging']);
        this.llm = new LLMService();
    }

    protected async handleTask(offer: any): Promise<any> {
        console.log(`[CoderAgent] 🧠 Analyzing task: "${offer.task}"`);

        // 1. Think / Generate Code
        const prompt = `You are a Coder Agent in the Borg Collective.
Task: ${offer.task}

Return JSON with:
{
  "filename": "string",
  "content": "string",
  "reasoning": "string"
}
Output ONLY valid JSON.`;

        try {
            const completion = await this.llm.generateText('openai', 'gpt-4o', 'You are an expert software engineer.', prompt);
            const response = completion.content;

            let plan;
            try {
                plan = JSON.parse(response);
            } catch (e) {
                // Fallback if LLM output markdown code block
                const match = response.match(/```json\n([\s\S]*?)\n```/);
                if (match) {
                    plan = JSON.parse(match[1]);
                } else {
                    throw new Error("Failed to parse LLM JSON response");
                }
            }

            console.log(`[CoderAgent] 💡 Generated Plan: Write ${plan.filename}`);

            // 2. Execute Action (Write to Disk)
            // Ideally, we respect a workspace root.
            const workspaceRoot = process.cwd();
            const targetPath = path.resolve(workspaceRoot, plan.filename);

            await fs.writeFile(targetPath, plan.content, 'utf-8');
            console.log(`[CoderAgent] 💾 Wrote to ${targetPath}`);

            return {
                status: 'completed',
                filesChanged: [plan.filename],
                reasoning: plan.reasoning
            };

        } catch (error: any) {
            console.error(`[CoderAgent] 💥 Error:`, error);
            throw error;
        }
    }
}
