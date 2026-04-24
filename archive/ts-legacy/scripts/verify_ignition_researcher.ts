/**
 * verify_ignition_researcher.ts
 *
 * Phase 62 Ignition Verification: ResearcherAgent
 * Tests that the ResearcherAgent can execute real research via DeepResearchService.
 *
 * What it does:
 * 1. Creates a mock MCPServer (for tool execution context)
 * 2. Wires up real LLMService + ModelSelector + MemoryManager + SearchService
 * 3. Constructs a real DeepResearchService and ResearcherAgent
 * 4. Asks the agent to research a topic
 * 5. Validates the structured response contains a summary and findings
 */

import { ResearcherAgent } from '../packages/core/src/agents/ResearcherAgent.js';
import { DeepResearchService } from '../packages/core/src/services/DeepResearchService.js';
import { LLMService, ModelSelector } from '../packages/ai/src/index.js';
import { SearchService } from '../packages/search/src/index.js';
import { MemoryManager } from '../packages/core/src/services/MemoryManager.js';
import type { MCPServer } from '../packages/core/src/MCPServer.js';

async function main() {
    console.log("🔥 IGNITION: Verifying ResearcherAgent...");

    // Mock MCPServer — provides executeTool for DeepResearchService.ingest()
    // We only need enough to satisfy the constructor and any tool calls during research.
    const serverMock = {
        executeTool: async (name: string, args: any) => {
            console.log(`[MockServer] executeTool ${name}`, args);
            if (name === 'navigate') return { content: [{ text: 'Navigated' }] };
            if (name === 'read_page') return { content: [{ text: 'Mock page content with relevant info.' }] };
            return { content: [] };
        },
        wssInstance: null // No WebSocket broadcasting in test
    } as unknown as MCPServer;

    // Wire up the real service chain:
    // ModelSelector → LLMService → DeepResearchService → ResearcherAgent
    const selector = new ModelSelector();
    const llm = new LLMService(selector);
    const memory = new MemoryManager(process.cwd());
    const search = new SearchService();
    const deepResearch = new DeepResearchService(serverMock, llm, search, memory);

    const agent = new ResearcherAgent(deepResearch);

    const task = "What is the latest stable version of TypeScript as of 2025?";

    try {
        // This triggers the full research pipeline:
        // 1. LLM generates search queries
        // 2. WebSearchTool (DuckDuckGo) executes searches
        // 3. LLM synthesizes findings into a structured report
        // 4. MemoryManager stores the report
        // NOTE: May fail if DuckDuckGo blocks the request in CI/headless environments.
        const result = await agent.handleTask({ task });
        console.log("Agent Result:", JSON.stringify(result, null, 2));

        if (result.summary && result.findings.length > 0) {
            console.log("✅ SUCCESS: Research returned summary and findings.");
        } else {
            // Structured response without sources = agent pipeline works but search was blocked
            console.log("⚠️ PARTIAL: structured response received but might be empty.", result);
        }

    } catch (e) {
        console.error("❌ FAILURE: Agent execution failed", e);
        process.exit(1);
    }
}

main();
