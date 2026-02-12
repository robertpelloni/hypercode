import { z } from 'zod';
import { t, publicProcedure } from '../lib/trpc-core.js';
import { getMcpServer } from '../lib/mcpHelper.js';

export const researchRouter = t.router({
    /** Conduct deep research on a topic — multi-source search, read, memorize */
    conduct: publicProcedure
        .input(z.object({
            topic: z.string(),
            depth: z.number().min(1).max(10).default(3)
        }))
        .mutation(async ({ input }) => {
            const mcp = getMcpServer();
            if (!mcp) throw new Error("MCP Server not found");

            const service = (mcp as any).researchService;
            const report = await service.research(input.topic, input.depth);
            return { report };
        }),

    /** Directly ingest a URL into memory for later retrieval */
    ingest: publicProcedure
        .input(z.object({
            url: z.string().url(),
        }))
        .mutation(async ({ input }) => {
            const mcp = getMcpServer();
            if (!mcp) throw new Error("MCP Server not found");

            const service = (mcp as any).researchService;
            const result = await service.ingest(input.url);
            return { result };
        }),

    /** Recursive deep research — multi-step topic traversal with sub-topics */
    recursiveResearch: publicProcedure
        .input(z.object({
            topic: z.string(),
            depth: z.number().min(1).max(5).default(2),
            maxBreadth: z.number().min(1).max(10).default(3),
        }))
        .mutation(async ({ input }) => {
            const mcp = getMcpServer();
            if (!mcp) throw new Error("MCP Server not found");

            // Use DeepResearchService if available (more advanced), fallback to ResearchService
            const deepService = (mcp as any).deepResearch;
            if (deepService?.recursiveResearch) {
                const result = await deepService.recursiveResearch(
                    input.topic, input.depth, input.maxBreadth
                );
                return { result };
            }

            // Fallback: basic research
            const service = (mcp as any).researchService;
            const report = await service.research(input.topic, input.depth);
            return { result: { topic: input.topic, summary: report, sources: [], relatedTopics: [] } };
        }),

    /** Generate research queries for a topic (planning step) */
    generateQueries: publicProcedure
        .input(z.object({
            topic: z.string(),
        }))
        .query(async ({ input }) => {
            const mcp = getMcpServer();
            if (!mcp) throw new Error("MCP Server not found");

            const deepService = (mcp as any).deepResearch;
            if (deepService?.generateQueries) {
                const queries = await deepService.generateQueries(input.topic);
                return { queries };
            }
            // Fallback: return the topic itself
            return { queries: [input.topic] };
        }),
});
