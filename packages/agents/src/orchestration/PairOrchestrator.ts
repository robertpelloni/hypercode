/**
 * @file PairOrchestrator.ts
 * @module packages/agents/src/orchestration/PairOrchestrator
 *
 * WHAT: Multi-model pair programming and rotation system.
 * Coordinates multiple frontier models (Claude, GPT, Gemini) in a shared chatroom.
 *
 * WHY: Cross-model consensus and rotating roles (Planner/Implementer/Tester) 
 * significantly reduce hallucinations and improve code quality for complex tasks.
 *
 * HOW:
 * 1. Defines a 'Squad' of models.
 * 2. Rotates active roles every turn or task.
 * 3. Facilitates debate between Planner and Tester before the Implementer starts.
 * 4. Shares a unified conversation history across all models.
 */

import { LLMService, SelectedModel } from "@hypercode/ai";
import type { IMCPServer } from "@hypercode/adk";

export enum PairRole {
    PLANNER = 'planner',
    IMPLEMENTER = 'implementer',
    TESTER = 'tester'
}

export interface SquadMember {
    name: string;
    role: PairRole;
    provider: string;
    modelId: string;
}

export interface PairSessionResult {
    success: boolean;
    history: string[];
    finalOutput: string;
}

export class PairOrchestrator {
    private squad: SquadMember[] = [];
    private history: string[] = [];

    constructor(
        private server: IMCPServer,
        private llmService: LLMService
    ) {}

    /**
     * Initializes a squad with frontier models.
     */
    public setupFrontierSquad() {
        this.squad = [
            { name: "Claude (Architect)", role: PairRole.PLANNER, provider: "anthropic", modelId: "claude-3-5-sonnet-20241022" },
            { name: "GPT (Engineer)", role: PairRole.IMPLEMENTER, provider: "openai", modelId: "gpt-4o" },
            { name: "Gemini (Reviewer)", role: PairRole.TESTER, provider: "google", modelId: "gemini-1.5-pro" }
        ];
    }

    /**
     * Rotates roles within the squad.
     */
    public rotateRoles() {
        if (this.squad.length < 2) return;
        
        const roles = this.squad.map(m => m.role);
        // Shift roles: [R1, R2, R3] -> [R3, R1, R2]
        const lastRole = roles.pop()!;
        roles.unshift(lastRole);

        this.squad.forEach((member, i) => {
            member.role = roles[i];
        });

        console.log(`[PairOrchestrator] 🔄 Roles rotated:`);
        this.squad.forEach(m => console.log(`  - ${m.name}: ${m.role}`));
    }

    /**
     * Executes a task using the multi-model loop.
     */
    public async runTask(task: string): Promise<PairSessionResult> {
        console.log(`[PairOrchestrator] 🚀 Starting Multi-Model Task: "${task}"`);
        this.history = [`USER: ${task}`];

        // 1. Planning Phase (Planner)
        const plan = await this.executeTurn(PairRole.PLANNER, `Create a detailed implementation plan for this task: ${task}`);
        this.history.push(`PLANNER (${this.getMemberName(PairRole.PLANNER)}): ${plan}`);

        // 2. Review Phase (Tester)
        const feedback = await this.executeTurn(PairRole.TESTER, `Review this plan and identify potential edge cases or bugs: ${plan}`);
        this.history.push(`TESTER (${this.getMemberName(PairRole.TESTER)}): ${feedback}`);

        // 3. Debate/Refinement (Planner responds to Tester)
        const finalPlan = await this.executeTurn(PairRole.PLANNER, `Refine the plan based on this feedback: ${feedback}`);
        this.history.push(`PLANNER (${this.getMemberName(PairRole.PLANNER)}): ${finalPlan}`);

        // 4. Implementation Phase (Implementer)
        const implementation = await this.executeTurn(PairRole.IMPLEMENTER, `Implement the final plan. Focus on correctness and performance. Plan: ${finalPlan}`);
        this.history.push(`IMPLEMENTER (${this.getMemberName(PairRole.IMPLEMENTER)}): ${implementation}`);

        // 5. Verification Phase (Tester)
        const verification = await this.executeTurn(PairRole.TESTER, `Verify the implementation against the plan and task requirements. Implementation: ${implementation}`);
        this.history.push(`TESTER (${this.getMemberName(PairRole.TESTER)}): ${verification}`);

        return {
            success: !verification.toLowerCase().includes("fail"),
            history: this.history,
            finalOutput: implementation
        };
    }

    private async executeTurn(role: PairRole, prompt: string): Promise<string> {
        const member = this.squad.find(m => m.role === role);
        if (!member) throw new Error(`No member assigned to role: ${role}`);

        console.log(`[PairOrchestrator] 👤 ${member.name} (${member.role}) is thinking...`);

        const systemPrompt = `You are part of a multi-agent pair programming squad. 
        Your name is ${member.name}. Your current role is ${member.role.toUpperCase()}.
        Collaborate with your teammates to solve the task perfectly.
        
        SQUAD ROLES:
        - PLANNER: Breaks down the task and designs the solution.
        - IMPLEMENTER: Writes the actual code and executes tools.
        - TESTER: Identifies bugs, edge cases, and verifies correctness.`;

        // Share unified history (excluding current prompt to avoid duplication if it's already there)
        const fullHistory = this.history.join("\n\n");
        const turnPrompt = `CONVERSATION HISTORY:\n${fullHistory}\n\nCURRENT TURN (${member.role.toUpperCase()}): ${prompt}`;

        try {
            const response = await this.llmService.generateText(
                member.provider,
                member.modelId,
                systemPrompt,
                turnPrompt,
                { taskComplexity: 'high' }
            );

            return response.content;
        } catch (error: any) {
            console.error(`[PairOrchestrator] Turn failed for ${member.name}: ${error.message}`);
            return `ERROR: ${error.message}`;
        }
    }

    private getMemberName(role: PairRole): string {
        return this.squad.find(m => m.role === role)?.name || "Unknown";
    }
}
