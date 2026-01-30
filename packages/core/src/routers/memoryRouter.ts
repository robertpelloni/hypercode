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
        if (!mcpServer) throw new Error("MCPServer not initialized");

        // Lazy init valid check?
        // We need access to vectorStore.
        // MCPServer doesn't expose it publicly in the interface I saw earlier (it was private).
        // I might need to make it public or add a public accessor.

        // Check and init memory system
        if (!mcpServer.vectorStore) {
            console.log("Memory system not ready, initializing...");
            await mcpServer.initializeMemorySystem();
        }

        if (!mcpServer.vectorStore) {
            return { success: false, error: "VectorStore failed to initialize" };
        }

        const docId = `web/${Date.now()}/${Math.random().toString(36).substring(7)}`;

        await mcpServer.vectorStore.addDocuments([{
            id: docId,
            file_path: input.url, // Treat URL as file path for now
            content: `Title: ${input.title || 'Untitled'}\nSource: ${input.source}\nURL: ${input.url}\n\n${input.content}`,
            hash: 'dynamic-web-content'
        }]);

        return { success: true, id: docId };
    }),

    query: publicProcedure.input(z.object({
        query: z.string(),
        limit: z.number().optional().default(5)
    })).query(async ({ input }) => {
        // @ts-ignore
        const mcpServer = global.mcpServerInstance;
        if (!mcpServer || !mcpServer.vectorStore) return [];

        return await mcpServer.vectorStore.search(input.query, input.limit);
    })
});
