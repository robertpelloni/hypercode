/**
 * @file SwarmController.ts
 * @module packages/agents/src/orchestration/SwarmController
 *
 * WHAT: Advanced Multi-Model Swarm Orchestration system.
 * Coordinates a team of diverse LLMs (Claude, GPT, Gemini, Qwen) on a shared task.
 *
 * WHY: Leverages the unique strengths of different model architectures.
 * Provides a configurable and modular autonomous loop with oversight.
 *
 * HOW:
 * 1. Maintain a 'Swarm' of active models and their current roles.
 * 2. Manage a shared 'Neural Transcript' of the collective conversation.
 * 3. Use a 'Supervisor' model to plan and a 'Critic' model to evaluate completion.
 * 4. Support rotating Implementers, Testers, and Planners.
 */

import { LLMService, SelectedModel } from "@hypercode/ai";
import type { IMCPServer } from "@hypercode/adk";
import { A2AMessageType, a2aBroker } from "../../../core/src/services/A2ABroker.js";

export enum SwarmRole {
    SUPERVISOR = 'supervisor',
    CRITIC = 'critic',
    PLANNER = 'planner',
    IMPLEMENTER = 'implementer',
    TESTER = 'tester'
}

export interface SwarmMember {
    id: string;
    name: string;
    role: SwarmRole;
    provider: string;
    modelId: string;
    status: 'idle' | 'thinking' | 'working';
}

export interface SwarmSessionConfig {
    maxTurns: number;
    completionThreshold: number; // 0.0 to 1.0
    autoRotate: boolean;
}

export class SwarmController {
    private members: Map<string, SwarmMember> = new Map();
    private transcript: string[] = [];
    private activeGoal: string = "";

    constructor(
        private server: IMCPServer,
        private llmService: LLMService
    ) {}

    /**
     * Add a model to the active swarm
     */
    public addMember(member: SwarmMember) {
        this.members.set(member.id, member);
        console.log(`[Swarm] Added member: ${member.name} (${member.role})`);
        
        // Register with A2A broker for communication
        // a2aBroker.registerAgent(member.id, this.createA2AWrapper(member));
    }

    /**
     * Start a swarm collaboration session
     */
    public async startSession(goal: string, config: SwarmSessionConfig) {
        this.activeGoal = goal;
        this.transcript = [`Collective Goal: ${goal}`];
        console.log(`[Swarm] 🧠 Starting session for goal: "${goal}"`);

        let turnCount = 0;
        let isComplete = false;

        while (turnCount < config.maxTurns && !isComplete) {
            turnCount++;
            console.log(`[Swarm] --- Turn ${turnCount} ---`);

            // 1. Planning Turn
            const plan = await this.executeMemberTurn(SwarmRole.PLANNER, "Create the current implementation strategy.");
            this.transcript.push(`PLANNER: ${plan}`);

            // 2. Implementation Turn
            const work = await this.executeMemberTurn(SwarmRole.IMPLEMENTER, `Execute the plan: ${plan}`);
            this.transcript.push(`IMPLEMENTER: ${work}`);

            // 3. Testing Turn
            const testResult = await this.executeMemberTurn(SwarmRole.TESTER, `Verify the work: ${work}`);
            this.transcript.push(`TESTER: ${testResult}`);

            // 4. Evaluation (Critic)
            const evaluation = await this.executeEvaluation(config.completionThreshold);
            this.transcript.push(`CRITIC: ${evaluation.feedback}`);
            
            isComplete = evaluation.isComplete;
            
            if (config.autoRotate) {
                this.rotateRoles();
            }

            // Emit update to dashboard
            await this.broadcastUpdate();
        }

        return {
            success: isComplete,
            turns: turnCount,
            transcript: this.transcript
        };
    }

    private async executeMemberTurn(role: SwarmRole, instruction: string): Promise<string> {
        const member = Array.from(this.members.values()).find(m => m.role === role);
        if (!member) return `[System]: No active member for role ${role}`;

        member.status = 'thinking';
        const prompt = `
            TRANSCRIPT:
            ${this.transcript.join("\n\n")}

            INSTRUCTION for ${member.name} (${member.role.toUpperCase()}):
            ${instruction}
        `;

        try {
            const response = await this.llmService.generateText(
                member.provider,
                member.modelId,
                `You are part of a model swarm. Your role is ${member.role}.`,
                prompt
            );
            member.status = 'idle';
            return response.content;
        } catch (e: any) {
            member.status = 'idle';
            return `ERROR: ${e.message}`;
        }
    }

    private async executeEvaluation(threshold: number): Promise<{ isComplete: boolean, feedback: string }> {
        const critic = Array.from(this.members.values()).find(m => m.role === SwarmRole.CRITIC);
        const modelId = critic?.modelId || "gemini-2.5-flash"; // Fallback to local or cheap model

        const prompt = `
            Evaluate the following swarm transcript against the goal: "${this.activeGoal}"
            
            TRANSCRIPT:
            ${this.transcript.slice(-5).join("\n\n")}

            Is the task complete? If so, start your response with "COMPLETE".
            Otherwise, provide constructive criticism for the next cycle.
        `;

        try {
            const response = await this.llmService.generateText(
                critic?.provider || "google",
                modelId,
                "You are the Swarm Critic.",
                prompt
            );
            const content = response.content.trim();
            return {
                isComplete: content.startsWith("COMPLETE"),
                feedback: content
            };
        } catch (e: any) {
            return { isComplete: false, feedback: "Evaluation failed: " + e.message };
        }
    }

    private rotateRoles() {
        const members = Array.from(this.members.values());
        // Simple rotation logic
        const firstRole = members[0].role;
        for (let i = 0; i < members.length - 1; i++) {
            members[i].role = members[i+1].role;
        }
        members[members.length - 1].role = firstRole;
    }

    private async broadcastUpdate() {
        // Send status to dashboard via event bus or A2A
        await a2aBroker.routeMessage({
            id: `swarm-update-${Date.now()}`,
            timestamp: Date.now(),
            sender: 'SWARM_CONTROLLER',
            type: A2AMessageType.STATE_UPDATE,
            payload: {
                members: Array.from(this.members.values()),
                transcriptCount: this.transcript.length
            }
        });
    }
}
