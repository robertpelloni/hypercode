import { z } from 'zod';
import { t, publicProcedure } from '../lib/trpc-core.js';
import path from 'path';

export const memoryRouter = t.router({
    saveContext: publicProcedure.input(z.object({
        source: z.string(), // e.g. "chatgpt", "web_page", "claude"
        url: z.string(),
        title: z.string().optional(),
        content: z.string(),
        metadata: z.record(z.any()).optional()
    })).mutation(async ({ input }) => {
        // @ts-ignore
        const mcpServer = global.mcpServerInstance;
        if (!mcpServer || !mcpServer.memoryManager) {
            return { success: false, error: "MemoryManager not initialized" };
        }

        const id = await mcpServer.memoryManager.saveContext(input.content, {
            title: input.title,
            source: input.source,
            url: input.url,
            ...input.metadata
        });

        return { success: true, id };
    }),

    query: publicProcedure.input(z.object({
        query: z.string(),
        limit: z.number().optional().default(5)
    })).query(async ({ input }) => {
        // @ts-ignore
        const mcpServer = global.mcpServerInstance;
        if (!mcpServer || !mcpServer.memoryManager) return [];

        return await mcpServer.memoryManager.search(input.query, input.limit);
    }),

    listContexts: publicProcedure.query(async () => {
        // @ts-ignore
        const mcpServer = global.mcpServerInstance;
        if (!mcpServer || !mcpServer.memoryManager) return [];
        return await mcpServer.memoryManager.listContexts();
    }),

    getContext: publicProcedure.input(z.object({
        id: z.string()
    })).query(async ({ input }) => {
        // @ts-ignore
        const mcpServer = global.mcpServerInstance;
        if (!mcpServer || !mcpServer.memoryManager) return null;
        return await mcpServer.memoryManager.getContext(input.id);
    }),

    deleteContext: publicProcedure.input(z.object({
        id: z.string()
    })).mutation(async ({ input }) => {
        // @ts-ignore
        const mcpServer = global.mcpServerInstance;
        if (!mcpServer || !mcpServer.memoryManager) return { success: false };
        await mcpServer.memoryManager.deleteContext(input.id);
        return { success: true };
    })
});
