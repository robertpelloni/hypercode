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
    }),

    /** Get current supervisor status - active tasks, workers, queue depth */
    status: t.procedure.query(async () => {
        const server = getMcpServer();
        const sup = server.supervisor;
        return {
            isActive: sup.isActive?.() ?? false,
            activeWorkers: sup.getActiveWorkers?.() ?? [],
            queueDepth: sup.getQueueDepth?.() ?? 0,
            lastActivity: sup.getLastActivity?.() ?? null,
            totalTasksCompleted: sup.getTotalCompleted?.() ?? 0,
        };
    }),

    /** List all tasks managed by the supervisor - recent history */
    listTasks: t.procedure.input(z.object({
        limit: z.number().min(1).max(100).default(20),
        status: z.enum(['all', 'pending', 'active', 'completed', 'failed']).default('all'),
    }).optional()).query(async ({ input }) => {
        const server = getMcpServer();
        const sup = server.supervisor;
        const allTasks = sup.listTasks?.() ?? [];
        const filtered = input?.status === 'all'
            ? allTasks
            : allTasks.filter((t: any) => t.status === input?.status);
        return filtered.slice(0, input?.limit ?? 20);
    }),

    /** Cancel a running supervised task */
    cancel: t.procedure.input(z.object({
        taskId: z.string()
    })).mutation(async ({ input }) => {
        const server = getMcpServer();
        const sup = server.supervisor;
        if (sup.cancelTask) {
            await sup.cancelTask(input.taskId);
            return { success: true, taskId: input.taskId };
        }
        return { success: false, error: 'Cancel not supported' };
    }),
});
