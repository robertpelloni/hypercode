import { z } from 'zod';
export { t, publicProcedure, adminProcedure } from './lib/trpc-core.js';
import { t, publicProcedure, adminProcedure } from './lib/trpc-core.js';
import { getMcpServer } from './lib/mcpHelper.js';
import { suggestionsRouter } from './routers/suggestionsRouter.js';
import { squadRouter } from './routers/squadRouter.js';
import { councilRouter } from './routers/councilRouter.js';
import { graphRouter } from './routers/graphRouter.js';
import { workflowRouter } from './routers/workflowRouter.js';
import { testsRouter } from './routers/testsRouter.js';
import { contextRouter } from './routers/contextRouter.js';
import { commandsRouter } from './routers/commandsRouter.js';
import { symbolsRouter } from './routers/symbolsRouter.js';
import { autoDevRouter } from './routers/autoDevRouter.js';
import { shellRouter } from './routers/shellRouter.js';
import { memoryRouter } from './routers/memoryRouter.js';
import { skillsRouter } from './routers/skillsRouter.js';
import { researchRouter } from './routers/researchRouter.js';
import { pulseRouter } from './routers/pulseRouter.js';

import { knowledgeRouter } from './routers/knowledgeRouter.js';
import { agentMemoryRouter } from './routers/agentMemoryRouter.js';
import { planRouter as planServiceRouter } from './routers/planRouter.js';
import { metricsRouter as metricsServiceRouter } from './routers/metricsRouter.js';
import { supervisorRouter } from './routers/supervisorRouter.js';
import { lspRouter } from './routers/lspRouter.js';
import { settingsRouter } from './routers/settingsRouter.js';

import { sessionRouter } from './routers/sessionRouter.js';
import { billingRouter } from './routers/billingRouter.js';
import { mcpRouter } from './routers/mcpRouter.js';
import { healerRouter } from './routers/healerRouter.js';
import { darwinRouter } from './routers/darwinRouter.js';
import { autonomyRouter } from './routers/autonomyRouter.js';
import { directorRouter } from './routers/directorRouter.js';
import { directorConfigRouter } from './routers/directorConfigRouter.js';
import { gitRouter } from './routers/gitRouter.js';
import { auditRouter } from './routers/auditRouter.js';


// import { type AnyTRPCRouter } from '@trpc/server';

export const appRouter = t.router({
    graph: graphRouter,
    workflow: workflowRouter,
    tests: testsRouter,
    borgContext: contextRouter,
    commands: commandsRouter,
    symbols: symbolsRouter,
    autoDev: autoDevRouter,
    shell: shellRouter,
    memory: memoryRouter,
    knowledge: knowledgeRouter,
    research: researchRouter,
    pulse: pulseRouter,
    skills: skillsRouter,
    squad: squadRouter,
    suggestions: suggestionsRouter,
    council: councilRouter,
    supervisor: supervisorRouter,
    metrics: metricsServiceRouter,
    lsp: lspRouter,
    agentMemory: agentMemoryRouter,
    planService: planServiceRouter,
    settings: settingsRouter,
    session: sessionRouter,
    billing: billingRouter,
    mcp: mcpRouter,
    healer: healerRouter,
    darwin: darwinRouter,
    health: publicProcedure.query(() => {
        return { status: 'running', service: '@borg/core' };
    }),
    getTaskStatus: publicProcedure
        .input(z.object({ taskId: z.string().optional() }))
        .query(({ input }) => {
            const mcp = getMcpServer();
            if (!mcp || !mcp.projectTracker) return { taskId: 'offline', status: 'offline', progress: 0, currentTask: 'Offline' };

            const status = mcp.projectTracker.getStatus();
            return {
                taskId: status.currentTask,
                currentTask: status.currentTask,
                status: status.status,
                progress: status.progress
            };
        }),
    indexingStatus: t.procedure.query(() => {
        const mcp = getMcpServer();
        if (!mcp || !mcp.lspService) return { status: 'offline', filesIndexed: 0, totalFiles: 0 };
        return mcp.lspService.getStatus();
    }),
    autonomy: autonomyRouter,
    director: directorRouter,
    directorConfig: directorConfigRouter,
    executeTool: adminProcedure.input(z.object({
        name: z.string(),
        args: z.any()
    })).mutation(async ({ input }) => {
        const result = await getMcpServer().executeTool(input.name, input.args);
        // @ts-ignore
        if (result.isError) throw new Error(result.content[0].text);
        // @ts-ignore
        return result.content[0].text;
    }),
    git: gitRouter,
    audit: auditRouter,
});

export type AppRouter = typeof appRouter;
