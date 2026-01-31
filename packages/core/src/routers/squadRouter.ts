
import { z } from 'zod';
import { t, publicProcedure } from '../trpc.js';

export const squadRouter = t.router({
    list: publicProcedure.query(async () => {
        // @ts-ignore
        const server = global.mcpServerInstance;
        if (!server) return [];
        return server.squadService.listMembers();
    }),

    spawn: publicProcedure
        .input(z.object({
            branch: z.string(),
            goal: z.string()
        }))
        .mutation(async ({ input }) => {
            // @ts-ignore
            const server = global.mcpServerInstance;
            if (!server) throw new Error("Server not initialized");
            return await server.squadService.spawnMember(input.branch, input.goal);
        }),

    kill: publicProcedure
        .input(z.object({
            branch: z.string()
        }))
        .mutation(async ({ input }) => {
            // @ts-ignore
            const server = global.mcpServerInstance;
            if (!server) throw new Error("Server not initialized");
            return await server.squadService.killMember(input.branch);
        }),

    // --- Indexer ---

    toggleIndexer: publicProcedure
        .input(z.object({ enabled: z.boolean() }))
        .mutation(async ({ input }) => {
            // @ts-ignore
            const server = global.mcpServerInstance;
            if (!server) return false;
            return await server.squadService.toggleIndexer(input.enabled);
        }),

    getIndexerStatus: publicProcedure.query(() => {
        // @ts-ignore
        const server = global.mcpServerInstance;
        if (!server) return { running: false, indexing: false };
        return server.squadService.getIndexerStatus();
    })
});
