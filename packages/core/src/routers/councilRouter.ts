import { z } from 'zod';
import { t, publicProcedure } from '../lib/trpc-core.js';
import { getMcpServer } from '../lib/mcpHelper.js';
import { DebateResult } from '@borg/agents';

export const councilRouter = t.router({
    runSession: publicProcedure.input(z.object({ proposal: z.string() })).mutation(async ({ input }) => {
        const result = await getMcpServer().council.runConsensusSession(input.proposal);
        return result;
    }),
    getLatestSession: publicProcedure.query(async () => {
        return getMcpServer().council.lastResult || null;
    }),
    listSessions: publicProcedure.query(async () => {
        return getMcpServer().councilService.listSessions();
    }),
    getSession: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
        return getMcpServer().councilService.getSession(input.id);
    })
});
