
import { z } from 'zod';
import { t, publicProcedure } from '../lib/trpc-core.js';
import { SystemEvent } from '../services/EventBus.js';

export const pulseRouter = t.router({
    getLatestEvents: publicProcedure
        .input(z.object({
            limit: z.number().default(20),
            afterTimestamp: z.number().optional()
        }))
        .query(async ({ input }) => {
            // @ts-ignore
            const mcp = global.mcpServerInstance;
            if (!mcp || !mcp.eventBus) return [];

            const history = mcp.eventBus.getHistory(input.limit);

            if (input.afterTimestamp) {
                return history.filter(e => e.timestamp > input.afterTimestamp!);
            }

            return history;
        }),

    getSystemStatus: publicProcedure.query(async () => {
        // @ts-ignore
        const mcp = global.mcpServerInstance;
        if (!mcp) return { status: 'offline' };

        return {
            status: 'online',
            uptime: process.uptime(),
            agents: Array.from(mcp.activeAgentsMap?.keys() || []),
            memoryInitialized: mcp.isMemoryInitialized
        };
    })
});
