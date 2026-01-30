import { ModelSelector } from "@borg/ai";
import { LLMService } from "@borg/ai";

interface CouncilMember {
    name: string;
    role: string;
    personality: string;
}

interface DebateResult {
    approved: boolean;
    transcripts: { speaker: string, text: string }[];
    summary: string;
}

export class Council {
    private members: CouncilMember[] = [
        { name: "Product Manager", role: "Strategy & Value", personality: "Focuses on user value, roadmap alignment, pragmatic utility, and efficient delivery." },
        { name: "The Architect", role: "System Design", personality: "Focuses on clean code, modularity, scalability, and technical elegance. Strict." },
        { name: "The Critic", role: "Quality Assurance", personality: "Focuses on edge cases, bugs, security risks, and potential failures. Pessimistic." }
    ];

    private llmService: LLMService;
    public lastResult: DebateResult | null = null;

    constructor(private modelSelector: ModelSelector) {
        this.llmService = new LLMService();
    }

    async runConsensusSession(topic: string): Promise<DebateResult> {
        console.log(`[Council] 🏛️ Convening Consensus Session on: "${topic}"`);
        const transcripts: { speaker: string, text: string }[] = [];
        let context = `Topic: "${topic}"\n\n`;

        // 1. Product Manager Proposal
        const product = this.members[0];
        const proposal = await this.consultMember(product, context, "Propose a high-level direction/task based on this topic. Be concrete.");
        context += `[${product.name}]: ${proposal.response}\n\n`;
        transcripts.push({ speaker: product.name, text: proposal.response });

        // 2. Architect Critique
        const architect = this.members[1];
        const archCritique = await this.consultMember(architect, context, "Critique the proposal for technical feasibility, structural elegance, and maintainability.");
        context += `[${architect.name}]: ${archCritique.response}\n\n`;
        transcripts.push({ speaker: architect.name, text: archCritique.response });

        // 3. Critic Review
        const critic = this.members[2];
        const securityReview = await this.consultMember(critic, context, "Identify risks, edge cases, or security flaws in the architecture proposal.");
        context += `[${critic.name}]: ${securityReview.response}\n\n`;
        transcripts.push({ speaker: critic.name, text: securityReview.response });

        // 4. Product Manager Synthesis (Final Directive)
        const directive = await this.consultMember(product, context, "Synthesize the feedback into a single, actionable DIRECTIVE for the Agent. Start your response with 'DIRECTIVE: ...'", "DIRECTIVE: STANDBY");
        transcripts.push({ speaker: "Final Directive", text: directive.response });

        // Extract directive text
        let finalDirective = directive.response;
        const match = finalDirective.match(/DIRECTIVE:\s*(.*)/i);
        if (match) {
            finalDirective = match[1].trim();
        }

        console.log(`[Council] 🏁 Consensus Reached: ${finalDirective.substring(0, 100)}...`);

        const result: DebateResult = {
            approved: true,
            transcripts,
            summary: finalDirective
        };

        this.lastResult = result;
        return result;
    }

    private async consultMember(member: CouncilMember, context: string, instruction: string, fallbackText: string = "I have no strong objections, proceed with caution."): Promise<{ member: CouncilMember, response: string, shortAdvice: string }> {
        const model = await this.modelSelector.selectModel({ taskComplexity: 'medium', taskType: 'supervisor' });

        const systemPrompt = `You are ${member.name}, a member of the AI Council.
Role: ${member.role}
Personality: ${member.personality}

Context of Debate:
${context}

Task: ${instruction}
Keep your response concise (under 4 sentences).`;

        let attempts = 0;
        const maxAttempts = 2; // Retry once

        while (attempts < maxAttempts) {
            attempts++;
            try {
                const response = await this.llmService.generateText(model.provider, model.modelId, systemPrompt, "Your turn.");
                const content = response.content.trim();
                console.log(`[Council] 👤 ${member.name}: ${content}`);

                return {
                    member,
                    response: content,
                    shortAdvice: content
                };
            } catch (e: any) {
                console.error(`[Council] ⚠️ Error consulting ${member.name} (Attempt ${attempts}):`, e.message);
                if (attempts < maxAttempts) {
                    await new Promise(r => setTimeout(r, 2000)); // Backoff
                }
            }
        }

        // Fallback after retries
        console.error(`[Council] ❌ ${member.name} failed to respond.`);
        return {
            member,
            response: fallbackText,
            shortAdvice: "No objection."
        };
    }
}
