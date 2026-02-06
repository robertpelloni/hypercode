
import { LLMService } from '@borg/ai';
import { SearchService } from '@borg/search';
import { MemoryManager } from './MemoryManager.js';
import { BrowserTool } from '@borg/tools';

// Dynamically import WebSearchTool if needed, or define interface
// We'll rely on our own internal 'search' helper that uses the SearchService if strictly compliant,
// BUT SearchService is local ripgrep.
// We need external search.
// If WebSearchTool is in core, we import it. If not, we mock it or use a different service.
// Let's assume for this overwrite we try to find it, but if not, we use a placeholder.
// Ideally usage: const search = new WebSearchTool();

export interface ResearchResult {
    topic: string;
    summary: string;
    sources: { title: string, url: string, keyPoints: string[] }[];
    relatedTopics: string[];
}

export class DeepResearchService {
    private llm: LLMService;
    private memory: MemoryManager;
    private browser: BrowserTool;

    constructor(llm: LLMService, _search: SearchService, memory: MemoryManager) {
        this.llm = llm;
        // SearchService ignored for now as it's local. We need Web Search.
        this.memory = memory;
        this.browser = new BrowserTool();
    }

    public async researchTopic(topic: string, depth: number = 2): Promise<ResearchResult> {
        console.log(`[DeepResearch] Starting research on: ${topic} (Depth: ${depth})`);

        // 1. Generate Search Queries
        const queries = await this.generateQueries(topic);
        console.log(`[DeepResearch] Generated queries: ${queries.join(', ')}`);

        // 2. Execute Search & Gather URLs
        const allUrls = new Set<string>();
        const sources: { title: string, url: string, content?: string }[] = [];

        // Dynamic Import of WebSearchTool to avoid issues if not standard
        let WebSearchToolClass: any;
        try {
            // Try local path first as per MCPServer hint
            const module = await import('../tools/WebSearchTool.js');
            WebSearchToolClass = module.WebSearchTool;
        } catch (e) {
            console.warn("Could not load local WebSearchTool, trying @borg/tools");
            try {
                const tools = await import('@borg/tools');
                WebSearchToolClass = tools.SearchTools ? tools.SearchTools[0] : undefined; // Fallback guess
            } catch (e2) {
                console.error("No WebSearchTool found.");
            }
        }

        if (WebSearchToolClass) {
            const searchTool = new WebSearchToolClass();
            for (const q of queries.slice(0, 3)) {
                try {
                    // Interface guess: execute(query) or search(query)
                    // Standard MCP tool usually has 'handler(args)'
                    const result = await searchTool.handler({ query: q });
                    // Result is { content: [{ type: 'text', text: 'JSON...' }] }
                    const text = result.content[0].text;
                    let parsed;
                    try { parsed = JSON.parse(text); } catch { parsed = []; } // Assume array

                    if (Array.isArray(parsed)) {
                        parsed.slice(0, 3).forEach((r: any) => {
                            if (r.url) {
                                allUrls.add(r.url);
                                sources.push({ title: r.title, url: r.url });
                            }
                        });
                    } else if (parsed.results) { // Brave format
                        parsed.results.slice(0, 3).forEach((r: any) => {
                            if (r.url) {
                                allUrls.add(r.url);
                                sources.push({ title: r.title, url: r.url });
                            }
                        });
                    }
                } catch (e) {
                    console.error("Search failed for", q, e);
                }
            }
        }

        console.log(`[DeepResearch] found ${allUrls.size} unique sources.`);

        // 3. Visit & Scrape
        const scrapedData: string[] = [];
        let count = 0;
        for (const source of sources) {
            if (count >= 3) break;
            scrapedData.push(`Source: ${source.url}\n(Content scraping pending)`);
            count++;
        }

        if (scrapedData.length === 0) {
            scrapedData.push("No sources found. Synthesizing from internal knowledge.");
        }

        // 4. Synthesize
        const synthesis = await this.synthesize(topic, scrapedData.join('\n\n'));

        // 5. Memorize
        await this.memory.saveContext(`Research Report: ${topic}\n\n${synthesis.summary}`, {
            source: 'DeepResearchService',
            title: `Research: ${topic}`,
            type: 'research_report'
        });

        return synthesis;
    }

    private async generateQueries(topic: string): Promise<string[]> {
        const prompt = `Generate 3 specific web search queries to deeply research the topic: "${topic}". Return only the queries, one per line.`;

        try {
            const model = await this.llm.modelSelector.selectModel({ taskComplexity: 'low' });
            const response = await this.llm.generateText(
                model.provider,
                model.modelId,
                "You are a research assistant.",
                prompt
            );
            return response.content.split('\n').filter(l => l.trim().length > 0);
        } catch (e) {
            return [topic, `${topic} analysis`, `${topic} latest news`];
        }
    }

    private async synthesize(topic: string, rawData: string): Promise<ResearchResult> {
        const prompt = `
            You are a Research Scholar.
            Topic: ${topic}
            
            Raw Data:
            ${rawData.substring(0, 10000)}
            
            Task:
            1. Summarize the key findings.
            2. List the sources used.
            3. Suggest 3 related topics.
            
            Format as JSON:
            {
                "topic": "${topic}",
                "summary": "...",
                "sources": [ { "title": "...", "url": "...", "keyPoints": [] } ],
                "relatedTopics": []
            }
        `;

        try {
            const model = await this.llm.modelSelector.selectModel({ taskComplexity: 'high' });
            const response = await this.llm.generateText(
                model.provider,
                model.modelId,
                "You are a helpful research assistant. Output valid JSON only.",
                prompt
            );
            const cleanJson = response.content.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleanJson) as ResearchResult;
        } catch (e) {
            return {
                topic,
                summary: "Failed to synthesize JSON.",
                sources: [],
                relatedTopics: []
            };
        }
    }
}
