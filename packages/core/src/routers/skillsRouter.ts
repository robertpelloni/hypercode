
import { z } from 'zod';
import { t, publicProcedure } from '../lib/trpc-core.js';

export const skillsRouter = t.router({
    list: publicProcedure.query(async () => {
        // @ts-ignore
        const mcpServer = global.mcpServerInstance;
        if (!mcpServer || !mcpServer.skillRegistry) return [];

        return mcpServer.skillRegistry.getSkills();
    }),

    assimilate: publicProcedure.input(z.object({
        topic: z.string(),
        docsUrl: z.string().optional()
    })).mutation(async ({ input }) => {
        // @ts-ignore
        const mcpServer = global.mcpServerInstance;
        if (!mcpServer || !mcpServer.skillAssimilationService) {
            return { success: false, logs: ["Service not ready"] };
        }

        return await mcpServer.skillAssimilationService.assimilate({
            topic: input.topic,
            docsUrl: input.docsUrl,
            autoInstall: true
        });
    }),
});
