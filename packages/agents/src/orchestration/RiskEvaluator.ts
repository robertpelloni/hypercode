export interface RiskScore {
    level: 'low' | 'medium' | 'high' | 'critical';
    score: number;
    reasons: string[];
    requiresApproval: boolean;
}

export class RiskEvaluator {
    public evaluateAction(toolName: string, args: any): RiskScore {
        const score = this.calculateBaseScore(toolName);
        const factors = this.analyzeArguments(toolName, args);

        const finalScore = score + factors.modifier;

        let level: RiskScore['level'] = 'low';
        if (finalScore >= 80) level = 'critical';
        else if (finalScore >= 60) level = 'high';
        else if (finalScore >= 40) level = 'medium';

        return {
            level,
            score: finalScore,
            reasons: factors.reasons,
            requiresApproval: finalScore >= 60
        };
    }

    private calculateBaseScore(toolName: string): number {
        const highRiskTools = ['execute_shell', 'write_file', 'delete_file', 'apply_patch'];
        const mediumRiskTools = ['read_file', 'list_files', 'search_files'];

        if (highRiskTools.includes(toolName)) return 60;
        if (mediumRiskTools.includes(toolName)) return 20;
        return 10;
    }

    private analyzeArguments(toolName: string, args: any): { modifier: number; reasons: string[] } {
        let modifier = 0;
        const reasons: string[] = [];

        if (toolName === 'execute_shell') {
            const command = args?.command || '';
            if (command.includes('rm -rf') || command.includes('sudo')) {
                modifier += 40;
                reasons.push('Command contains destructive or elevated operations (rm, sudo)');
            }
            if (command.includes('npm publish') || command.includes('git push')) {
                modifier += 30;
                reasons.push('Command initiates external publication or remote sync');
            }
        }

        if (toolName === 'write_file' || toolName === 'apply_patch') {
            const path = args?.path || args?.file || '';
            if (path.includes('.env') || path.includes('credentials') || path.includes('config')) {
                modifier += 30;
                reasons.push('Modifying sensitive configuration or credential files');
            }
        }

        if (reasons.length === 0) {
            reasons.push('Standard operation profile');
        }

        return { modifier, reasons };
import { LLMService } from "@borg/ai";

export interface RiskResult {
    score: number;
    level: 'low' | 'medium' | 'high' | 'critical';
    rationale: string;
}

export class RiskEvaluator {
    constructor(private llmService: LLMService) {}

    private async selectRiskModel(routingTaskType: 'general' | 'planning'): Promise<{ provider: string; modelId: string }> {
        return await this.llmService.modelSelector.selectModel({
            taskComplexity: 'medium',
            taskType: 'supervisor',
            routingTaskType,
        });
    }

    /**
     * Calculates a risk score (0-100) for a proposed set of changes or debate outcome.
     */
    async calculateRiskScore(topic: string, summary: string): Promise<RiskResult> {
        const prompt = `
            Analyze the following technical task/debate result and provide a risk score between 0 and 100.
            
            SCORING CRITERIA:
            - 0-20 (LOW): Documentation, minor refactors, safe additions, high consensus.
            - 21-50 (MEDIUM): New features, UI changes, non-critical logic updates.
            - 51-80 (HIGH): Core logic changes, complex refactors, security-adjacent work.
            - 81-100 (CRITICAL): Database schema changes, auth/security logic, destructive operations, no consensus.

            TOPIC: ${topic}
            SUMMARY: ${summary}
            
            Respond with a JSON object: { "score": number, "rationale": "one sentence explanation" }
        `;

        try {
            const selection = await this.selectRiskModel('general');
            const response = await this.llmService.generateText(
                selection.provider,
                selection.modelId,
                'You are a borg risk evaluator. Return concise JSON only.',
                prompt,
                {
                    taskType: 'supervisor',
                    routingTaskType: 'general',
                },
            );
            
            // Simple JSON extractor (handles potential markdown wrapping)
            const jsonMatch = response.content.match(/\{.*\}/s);
            const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { score: 50, rationale: "Failed to parse risk analysis." };
            
            const score = Math.min(Math.max(data.score, 0), 100);
            return {
                score,
                level: this.getRiskLevel(score),
                rationale: data.rationale
            };
        } catch (error) {
            console.error("[Agents:Risk] Error calculating risk score:", error);
            return { score: 50, level: 'medium', rationale: "Risk evaluation failed due to service error." };
        }
    }

    /**
     * Evaluates the risk of an implementation plan.
     */
    async evaluatePlanRisk(planText: string): Promise<RiskResult> {
        const prompt = `
            Analyze this implementation plan and provide a risk score (0-100).
            
            PLAN:
            ${planText}
            
            Consider:
            1. Scope: Tightly bounded or sweeping?
            2. Impact: Does it touch auth, security, state, or DB schemas?
            3. Destructiveness: Is it mostly adding or deleting/modifying?

            Respond with a JSON object: { "score": number, "rationale": "one sentence explanation" }
        `;

        try {
            const selection = await this.selectRiskModel('planning');
            const response = await this.llmService.generateText(
                selection.provider,
                selection.modelId,
                'You are a borg implementation risk evaluator. Return concise JSON only.',
                prompt,
                {
                    taskType: 'supervisor',
                    routingTaskType: 'planning',
                },
            );
            
            const jsonMatch = response.content.match(/\{.*\}/s);
            const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { score: 50, rationale: "Failed to parse plan risk analysis." };
            
            const score = Math.min(Math.max(data.score, 0), 100);
            return {
                score,
                level: this.getRiskLevel(score),
                rationale: data.rationale
            };
        } catch (error) {
            console.error("[Agents:Risk] Error evaluating plan risk:", error);
            return { score: 50, level: 'medium', rationale: "Plan evaluation failed." };
        }
    }

    private getRiskLevel(score: number): RiskResult['level'] {
        if (score <= 20) return 'low';
        if (score <= 50) return 'medium';
        if (score <= 80) return 'high';
        return 'critical';
    }
}
