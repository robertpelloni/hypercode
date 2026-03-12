import { z } from 'zod';
import {
    t,
    publicProcedure,
    adminProcedure,
    getMcpServer,
    getProjectTracker,
    getLspService,
    getMcpAggregator,
    getAgentMemoryService,
    getBrowserService,
    getSessionSupervisor,
    getMcpConfigService,
} from '../lib/trpc-core.js';
import { mcpServersRepository, toolsRepository } from '../db/repositories/index.js';
import { buildStartupStatusSnapshot } from './startupStatus.js';

export const systemProcedures = {
    health: publicProcedure.query(() => {
        return { status: 'running', service: '@borg/core' };
    }),
    startupStatus: publicProcedure.query(async () => {
        const mcpServer = getMcpServer();
        const aggregator = getMcpAggregator();
        const agentMemory = getAgentMemoryService();
        const browserService = getBrowserService();
        const sessionSupervisor = getSessionSupervisor();
        const mcpConfigService = getMcpConfigService();

        const [liveServerCount, sessionCount, browserStatus, persistedServerCount, persistedToolCount] = await Promise.all([
            aggregator?.listServers?.().then((servers) => servers.length).catch(() => 0) ?? 0,
            Promise.resolve(sessionSupervisor?.listSessions?.().length ?? 0),
            Promise.resolve(browserService?.getStatus?.() ?? { active: false, pageCount: 0, pageIds: [] }),
            mcpServersRepository.findAll().then((servers) => servers.length).catch(() => 0),
            toolsRepository.findAll().then((tools) => tools.length).catch(() => 0),
        ]);

        return buildStartupStatusSnapshot({
            mcpServer,
            aggregator,
            agentMemory,
            browserService,
            browserStatus,
            sessionSupervisor,
            sessionCount,
            mcpConfigService,
            liveServerCount,
            persistedServerCount,
            persistedToolCount,
        });
    }),
    getTaskStatus: publicProcedure
        .input(z.object({ taskId: z.string().optional() }))
        .query(() => {
            const tracker = getProjectTracker();
            if (!tracker) {
                return { taskId: 'offline', status: 'offline', progress: 0, currentTask: 'Offline' };
            }

            const status = tracker.getStatus();
            return {
                taskId: status.currentTask,
                currentTask: status.currentTask,
                status: status.status,
                progress: status.progress
            };
        }),
    indexingStatus: t.procedure.query(() => {
        const lspService = getLspService();
        if (!lspService) return { status: 'offline', filesIndexed: 0, totalFiles: 0 };
        return lspService.getStatus();
    }),
    executeTool: adminProcedure.input(z.object({
        name: z.string(),
        args: z.record(z.unknown())
    })).mutation(async ({ input }) => {
        const result = await getMcpServer().executeTool(input.name, input.args);
        if (result.isError) throw new Error(result.content[0].text);
        return result.content[0].text;
    }),
};
