
export interface QuotaConfig {
    dailyBudgetUsd: number;
    monthlyBudgetUsd: number;
    providerLimits?: Record<string, number>; // provider -> usd
}

export interface ModelUsage {
    modelId: string;
    tokensInput: number;
    tokensOutput: number;
    costUsd: number;
    timestamp: number;
}

export class QuotaService {
    private usage: ModelUsage[] = [];
    private config: QuotaConfig = {
        dailyBudgetUsd: 1.00, // Default $1.00/day
        monthlyBudgetUsd: 20.00
    };

    // Prices per 1M tokens (Simplified example)
    private prices: Record<string, { input: number, output: number }> = {
        "claude-3-5-sonnet": { input: 3.00, output: 15.00 },
        "claude-3-5-sonnet-20241022": { input: 3.00, output: 15.00 },
        "gpt-4o": { input: 5.00, output: 15.00 },
        "gpt-4o-mini": { input: 0.15, output: 0.60 },
        "gemini-1.5-pro": { input: 3.50, output: 10.50 },
        "gemini-2.0-flash": { input: 0.10, output: 0.40 }, // Estimated
        "gemini-1.5-flash": { input: 0.075, output: 0.30 },
        "local": { input: 0, output: 0 }
    };

    public setConfig(config: QuotaConfig) {
        this.config = config;
    }

    public trackUsage(modelId: string, inputTokens: number, outputTokens: number) {
        const price = this.prices[modelId] || { input: 0, output: 0 };
        const cost = (inputTokens / 1_000_000 * price.input) + (outputTokens / 1_000_000 * price.output);

        this.usage.push({
            modelId: modelId,
            tokensInput: inputTokens,
            tokensOutput: outputTokens,
            costUsd: cost,
            timestamp: Date.now()
        });

        console.log(`[Quota] Tracked usage for ${modelId}: $${cost.toFixed(6)}. Total session: $${this.getSessionTotal().toFixed(4)}`);
    }

    public getSessionTotal(): number {
        return this.usage.reduce((sum, u) => sum + u.costUsd, 0);
    }

    public getDailyTotal(): number {
        const today = new Date().setHours(0, 0, 0, 0);
        return this.usage
            .filter(u => u.timestamp >= today)
            .reduce((sum, u) => sum + u.costUsd, 0);
    }

    public getUsageByModel() {
        const breakdown: Record<string, { cost: number, requests: number, tokens: number }> = {};

        for (const u of this.usage) {
            if (!breakdown[u.modelId]) {
                breakdown[u.modelId] = { cost: 0, requests: 0, tokens: 0 };
            }
            breakdown[u.modelId].cost += u.costUsd;
            breakdown[u.modelId].requests += 1;
            breakdown[u.modelId].tokens += (u.tokensInput + u.tokensOutput);
        }

        return Object.entries(breakdown).map(([modelId, stats]) => ({
            provider: modelId, // Using modelId as provider/label for now
            cost: stats.cost,
            requests: stats.tokens // The UI expects 'requests' but often displays token counts or call counts. Let's use tokens? existing code used sum of tokens.
        }));
    }

    public isBudgetExceeded(): boolean {
        const daily = this.getDailyTotal();
        if (daily >= this.config.dailyBudgetUsd) {
            console.warn(`[Quota] Daily budget exceeded: $${daily.toFixed(4)} / $${this.config.dailyBudgetUsd}`);
            return true;
        }
        return false;
    }

    public getReport() {
        return {
            session: this.getSessionTotal(),
            daily: this.getDailyTotal(),
            config: this.config,
            isExceeded: this.isBudgetExceeded()
        };
    }
}
