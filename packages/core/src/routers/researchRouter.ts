import { z } from 'zod';
import { t, publicProcedure } from '../lib/trpc-core.js';
// @ts-ignore
import { ResearchService } from '../services/ResearchService.js';

export const researchRouter = t.router({
    conduct: publicProcedure
        .input(z.object({
            topic: z.string(),
            depth: z.number().min(1).max(10).default(3)
        }))
        .mutation(async ({ ctx, input }) => {
            // @ts-ignore
            const mcp = global.mcpServerInstance;
            if (!mcp) throw new Error("MCP Server not found");

            // @ts-ignore
            const service: ResearchService = mcp.researchService;
            const report = await service.research(input.topic, input.depth);
            return { report };
        })
});
