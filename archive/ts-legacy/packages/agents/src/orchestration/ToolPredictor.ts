/**
 * @file ToolPredictor.ts
 * @module packages/agents/src/orchestration/ToolPredictor
 *
 * WHAT: Autonomous tool prediction and preemptive advertisement system.
 * Watches conversation flow and suggests relevant MCP tools before the model explicitly asks.
 *
 * WHY: High-tier models perform better when relevant tools are already in their context.
 * Discovering tools manually via 'search_tools' adds latency and token overhead.
 *
 * HOW:
 * 1. Analyzes recent conversation history and active goals.
 * 2. Matches semantic intent against the global tool catalog.
 * 3. Pre-loads (hydrates) predicted tools into the session working set.
 * 4. Injects these tools into the next LLM turn's advertised tool list.
 */

import { LLMService } from "@hypercode/ai";
import type { IMCPServer } from "@hypercode/adk";

export interface ToolPredictionResult {
    predictedTools: string[];
    reasoning: string;
}

export class ToolPredictor {
    private lastPredictionTime: number = 0;
    private readonly PREDICTION_COOLDOWN_MS = 30000; // Don't spam LLM for predictions

    constructor(
        private server: IMCPServer,
        private llmService: LLMService
    ) {}

    /**
     * Watches conversation and pre-loads relevant tools.
     */
    public async predictAndPreload(chatHistory: string, activeGoal?: string): Promise<ToolPredictionResult | null> {
        const now = Date.now();
        if (now - this.lastPredictionTime < this.PREDICTION_COOLDOWN_MS) {
            return null;
        }

        this.lastPredictionTime = now;

        try {
            // 1. Fetch available but not yet loaded tools for matching
            // We use the internal 'list_all_tools' via the server if possible, 
            // or just rely on semantic intent if the catalog is too large.
            
            // To keep it efficient, we don't send the whole tool list to the LLM.
            // Instead, we ask the LLM for "Topics" or "Keywords", then search the catalog.
            
            const topics = await this.identifyTopics(chatHistory, activeGoal);
            if (!topics || topics.length === 0) return null;

            console.log(`[ToolPredictor] 🧠 Predicted topics: ${topics.join(", ")}`);

            const predictedTools: string[] = [];
            for (const topic of topics) {
                const results = await this.server.executeTool('search_tools', { query: topic });
                const tools = this.parseSearchResults(results);
                predictedTools.push(...tools.slice(0, 2)); // Take top 2 per topic
            }

            const uniqueTools = Array.from(new Set(predictedTools));
            
            if (uniqueTools.length > 0) {
                console.log(`[ToolPredictor] 🚀 Preloading predicted tools: ${uniqueTools.join(", ")}`);
                for (const toolName of uniqueTools) {
                    // Pre-loading tells the meta-tools to hydrate the schema 
                    // and include it in advertised list.
                    await this.server.executeTool('load_tool', { tool_name: toolName });
                }
            }

            return {
                predictedTools: uniqueTools,
                reasoning: `Predicted based on topics: ${topics.join(", ")}`
            };

        } catch (error: any) {
            console.error(`[ToolPredictor] Prediction failed: ${error.message}`);
            return null;
        }
    }

    private async identifyTopics(chatHistory: string, activeGoal?: string): Promise<string[]> {
        const prompt = `
            You are the HyperCode Supervisor Tool Predictor. 
            Analyze the following conversation and active goal. 
            Identify 3-5 specific technical topics or capabilities that the AI will likely need next.
            Focus on things that might require specialized MCP tools (e.g., "browser automation", "postgres database", "github issues", "system monitoring", "aws deployment").

            GOAL: ${activeGoal || "N/A"}
            HISTORY: ${chatHistory.slice(-2000)}

            Return ONLY a comma-separated list of keywords. 
            Example: browser, database, aws, github
        `;

        const model = await this.server.modelSelector.selectModel({ taskComplexity: 'low', routingTaskType: 'worker' });
        const response = await this.llmService.generateText(model.provider, model.modelId, "Tool Prediction", prompt);
        
        return response.content
            .split(',')
            .map(s => s.trim().toLowerCase())
            .filter(s => s.length > 0 && s.length < 30);
    }

    private parseSearchResults(results: any): string[] {
        try {
            // Results from 'search_tools' is usually a JSON string in content[0].text
            const text = results.content?.[0]?.text || "[]";
            const tools = JSON.parse(text);
            return Array.isArray(tools) ? tools.map(t => t.name) : [];
        } catch (e) {
            return [];
        }
    }
}
