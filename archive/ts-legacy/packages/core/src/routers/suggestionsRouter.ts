import { z } from 'zod';
import { t, publicProcedure, getMcpServer, getSuggestionService } from '../lib/trpc-core.js';

export const suggestionsRouter = t.router({
    list: publicProcedure.query(() => {
        return getSuggestionService().getPendingSuggestions();
    }),
    resolve: publicProcedure.input(z.object({
        id: z.string(),
        status: z.enum(['APPROVED', 'REJECTED'])
    })).mutation(async ({ input }) => {
        const suggestionService = getSuggestionService();
        const suggestion = suggestionService.resolveSuggestion(input.id, input.status);

        // EXECUTION LOGIC FOR APPROVED ACTIONS
        if (suggestion && input.status === 'APPROVED' && suggestion.payload && suggestion.payload.tool) {
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/routers/suggestionsRouter.ts
            console.log(`[HyperCode Core] Auto-Executing Approved Suggestion: ${suggestion.title}`);
=======
            console.log(`[borg Core] Auto-Executing Approved Suggestion: ${suggestion.title}`);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/routers/suggestionsRouter.ts
            await getMcpServer().executeTool(suggestion.payload.tool, suggestion.payload.args || {});
        }
        return suggestion ?? null;
    }),
    clearAll: publicProcedure.mutation(() => {
        getSuggestionService().clearAll?.();
        return true;
    })
});

