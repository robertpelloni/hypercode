import { z } from 'zod';
import { t, adminProcedure } from '../lib/trpc-core.js';
import { getMcpServer } from '../lib/mcpHelper.js';

export const directorRouter = t.router({
    memorize: t.procedure.input(z.object({ content: z.string(), source: z.string(), title: z.string().optional() })).mutation(async ({ input }) => {
        await getMcpServer().memoryManager.saveContext(input.content, {
            source: input.source,
            title: input.title || 'Untitled Web Page',
            type: 'web_page'
        });
        return "Memorized.";
    }),
    chat: t.procedure.input(z.object({ message: z.string() })).mutation(async ({ input }) => {
        const server = getMcpServer();

        // 1. Intercept Slash Commands
        if (input.message.trim().startsWith('/')) {
            const commandResult = await server.commandRegistry.execute(input.message);
            if (commandResult && commandResult.handled) {
                return commandResult.output;
            }
        }

        // 2. Intercept "Yes" / "Approve" for Suggestions
        const pending = server.suggestionService.getPendingSuggestions();
        if (pending.length > 0 && /^(yes|approve|do it|confirm|ok)$/i.test(input.message.trim())) {
            const latest = pending[0];
            const suggestion = server.suggestionService.resolveSuggestion(latest.id, 'APPROVED');

            if (suggestion && suggestion.payload?.tool) {
                (server.director as any).broadcast(`✅ Approved: **${latest.title}**. Executing ${suggestion.payload.tool}...`);
                const result = await server.executeTool(suggestion.payload.tool, suggestion.payload.args);
                return `✅ Execution Complete.\n\nResult:\n${JSON.stringify(result)?.substring(0, 200)}...`;
            }

            return `✅ Approved suggestion: **${latest.title}**. (No tool attached)`;
        }

        // 3. Default: Director Execution
        const result = await (server.director as any).executeTask(input.message);
        return result;
    }),
    status: t.procedure.query(() => {
        return getMcpServer().director.getStatus();
    }),
    updateConfig: t.procedure.input(z.object({
        defaultTopic: z.string().optional()
    })).mutation(({ input }) => {
        getMcpServer().director.updateConfig(input);
        return { success: true };
    }),
    stopAutoDrive: adminProcedure.mutation(async () => {
        getMcpServer().director.stopAutoDrive();
        return "Stopped";
    }),
    startAutoDrive: adminProcedure.mutation(async () => {
        getMcpServer().executeTool('start_auto_drive', {});
        return "Started";
    })
});
