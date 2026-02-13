import { z } from 'zod';
import { t } from '../lib/trpc-core.js';
import { getMcpServer } from '../lib/mcpHelper.js';

export const autonomyRouter = t.router({
    setLevel: t.procedure.input(z.object({ level: z.enum(['low', 'medium', 'high']) })).mutation(async ({ input }) => {
        getMcpServer().permissionManager.setAutonomyLevel(input.level);
        return input.level;
    }),
    getLevel: t.procedure.query(() => {
        return getMcpServer().permissionManager.autonomyLevel;
    }),
    activateFullAutonomy: t.procedure.mutation(async () => {
        const mcp = getMcpServer();
        mcp.permissionManager.setAutonomyLevel('high');
        (mcp.director as any).startChatDaemon();
        (mcp.director as any).startWatchdog(100);
        return "Autonomous Supervisor Activated (High Level + Chat Daemon + Watchdog)";
    })
});
