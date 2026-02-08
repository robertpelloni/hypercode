import { z } from 'zod';
import { t, getMcpServer } from '../lib/trpc-core.js';

export const supervisorRouter = t.router({
    decompose: t.procedure.input(z.object({
        goal: z.string()
    })).mutation(async ({ input }) => {
        const server = getMcpServer();
        return server.supervisor.decompose(input.goal);
    }),

    supervise: t.procedure.input(z.object({
        goal: z.string(),
        maxSteps: z.number().default(20)
    })).mutation(async ({ input }) => {
        const server = getMcpServer();
        return server.supervisor.supervise(input.goal, input.maxSteps);
    })
});
