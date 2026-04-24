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
    }
}
