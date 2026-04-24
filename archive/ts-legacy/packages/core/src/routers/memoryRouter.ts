import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { t, publicProcedure, getMemoryManager, getAgentMemoryService } from '../lib/trpc-core.js';
import path from 'path';
import {
    MemoryExportImportService,
    MEMORY_INTERCHANGE_FORMATS,
} from '../services/memory/MemoryExportImportService.js';
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/routers/memoryRouter.ts
import { readSectionedMemoryStoreStatus } from './memoryRouter.sectioned-store.js';
=======
import { readClaudeMemStoreStatus } from './memoryRouter.claude-mem.js';
>>>>>>> origin/rewrite/main-sanitized:packages/core/src/routers/memoryRouter.ts
import { 
    getCrossSessionMemoryLinksInputSchema,
    memoryInterchangeFormatSchema, 
    getMemoryTimelineWindowInputSchema,
    searchMemoryPivotInputSchema,
    observationTypeSchema, 
    userPromptRoleSchema, 
    structuredObservationSchema, 
    structuredUserPromptSchema, 
    getRecentObservationsInputSchema, 
    searchObservationsInputSchema, 
    getRecentUserPromptsInputSchema, 
    searchUserPromptsInputSchema 
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/routers/memoryRouter.ts
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/routers/memoryRouter.ts
} from '@hypercode/types';
=======
} from '@borg/types';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/routers/memoryRouter.ts

function requireAgentMemoryService(contextLabel: string) {
    const service = getAgentMemoryService();
    if (!service) {
        throw new TRPCError({
            code: 'SERVICE_UNAVAILABLE',
            message: `${contextLabel} is unavailable: Agent memory service not initialized`,
        });
    }
    return service;
}

function requireAgentMemoryCapability<T>(value: T | undefined, contextLabel: string): T {
    if (value === undefined) {
        throw new TRPCError({
            code: 'SERVICE_UNAVAILABLE',
            message: `${contextLabel} is unavailable: Agent memory service does not support this operation`,
        });
    }
    return value;
}
=======
} from '@borg/types';
>>>>>>> origin/rewrite/main-sanitized:packages/core/src/routers/memoryRouter.ts

export const memoryRouter = t.router({
    saveContext: publicProcedure.input(z.object({
        source: z.string(),
        url: z.string(),
        title: z.string().optional(),
        content: z.string(),
        metadata: z.record(z.unknown()).optional()
    })).mutation(async ({ input }) => {
        const memoryManager = getMemoryManager();

        const id = await memoryManager.saveContext(input.content, {
            title: input.title,
            source: input.source,
            url: input.url,
            ...input.metadata
        });

        return { success: true, id };
    }),

    query: publicProcedure.input(z.object({
        query: z.string(),
        limit: z.number().optional().default(5)
    })).query(async ({ input }) => {
        return await getMemoryManager().search?.(input.query, input.limit) ?? [];
    }),

    listContexts: publicProcedure.query(async () => {
        return await getMemoryManager().listContexts();
    }),

    getContext: publicProcedure.input(z.object({
        id: z.string()
    })).query(async ({ input }) => {
        return await getMemoryManager().getContext?.(input.id) ?? null;
    }),

    deleteContext: publicProcedure.input(z.object({
        id: z.string()
    })).mutation(async ({ input }) => {
        const memoryManager = getMemoryManager();
        if (!memoryManager.deleteContext) return { success: false };
        await memoryManager.deleteContext(input.id);
        return { success: true };
    }),

    // --- Agent Memory Service (Tiered) ---

    getAgentStats: publicProcedure.query(async () => {
        return getAgentMemoryService()?.getStats() ?? null;
    }),

    searchAgentMemory: publicProcedure.input(z.object({
        query: z.string(),
        type: z.enum(['session', 'working', 'long_term']).optional(),
        limit: z.number().optional().default(10)
    })).query(async ({ input }) => {
        const service = requireAgentMemoryService('Agent memory search');
        return await service.search(input.query, {
            type: input.type,
            limit: input.limit
        });
    }),

    addFact: publicProcedure.input(z.object({
        content: z.string(),
        type: z.enum(['working', 'long_term']).default('working')
    })).mutation(async ({ input }) => {
        const service = getAgentMemoryService();
        if (!service) return { success: false };
        await service.add(input.content, input.type, 'user', { source: 'dashboard' });
        return { success: true };
    }),

    recordObservation: publicProcedure.input(structuredObservationSchema).mutation(async ({ input }) => {
        const service = getAgentMemoryService();
        if (!service?.recordObservation) return { success: false };

        const memory = await service.recordObservation(input);
        return { success: true, memory };
    }),

    captureUserPrompt: publicProcedure.input(structuredUserPromptSchema).mutation(async ({ input }) => {
        const service = getAgentMemoryService();
        if (!service?.captureUserPrompt) return { success: false };

        const memory = await service.captureUserPrompt(input);
        return { success: true, memory };
    }),

    getRecentObservations: publicProcedure.input(getRecentObservationsInputSchema).query(async ({ input }) => {
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/routers/memoryRouter.ts
        const service = requireAgentMemoryService('Recent observations');
        const getRecentObservations = requireAgentMemoryCapability(service.getRecentObservations, 'Recent observations');
        return getRecentObservations(input.limit, {
=======
        const service = getAgentMemoryService();
        if (!service?.getRecentObservations) return [];
        return service.getRecentObservations(input.limit, {
>>>>>>> origin/rewrite/main-sanitized:packages/core/src/routers/memoryRouter.ts
            namespace: input.namespace,
            type: input.type,
        });
    }),

    searchObservations: publicProcedure.input(searchObservationsInputSchema).query(async ({ input }) => {
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/routers/memoryRouter.ts
        const service = requireAgentMemoryService('Observation search');
        const searchObservations = requireAgentMemoryCapability(service.searchObservations, 'Observation search');
        return await searchObservations(input.query, {
=======
        const service = getAgentMemoryService();
        if (!service?.searchObservations) return [];
        return await service.searchObservations(input.query, {
>>>>>>> origin/rewrite/main-sanitized:packages/core/src/routers/memoryRouter.ts
            limit: input.limit,
            namespace: input.namespace,
            type: input.type,
        });
    }),

    getRecentUserPrompts: publicProcedure.input(getRecentUserPromptsInputSchema).query(async ({ input }) => {
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/routers/memoryRouter.ts
        const service = requireAgentMemoryService('Recent user prompts');
        const getRecentUserPrompts = requireAgentMemoryCapability(service.getRecentUserPrompts, 'Recent user prompts');
        return getRecentUserPrompts(input.limit, {
=======
        const service = getAgentMemoryService();
        if (!service?.getRecentUserPrompts) return [];
        return service.getRecentUserPrompts(input.limit, {
>>>>>>> origin/rewrite/main-sanitized:packages/core/src/routers/memoryRouter.ts
            role: input.role,
        });
    }),

    searchUserPrompts: publicProcedure.input(searchUserPromptsInputSchema).query(async ({ input }) => {
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/routers/memoryRouter.ts
        const service = requireAgentMemoryService('User prompt search');
        const searchUserPrompts = requireAgentMemoryCapability(service.searchUserPrompts, 'User prompt search');
        return await searchUserPrompts(input.query, {
=======
        const service = getAgentMemoryService();
        if (!service?.searchUserPrompts) return [];
        return await service.searchUserPrompts(input.query, {
>>>>>>> origin/rewrite/main-sanitized:packages/core/src/routers/memoryRouter.ts
            limit: input.limit,
            role: input.role,
        });
    }),

    searchMemoryPivot: publicProcedure.input(searchMemoryPivotInputSchema).query(async ({ input }) => {
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/routers/memoryRouter.ts
        const service = requireAgentMemoryService('Memory pivot search');
        const searchByPivot = requireAgentMemoryCapability(service.searchByPivot, 'Memory pivot search');
        return searchByPivot(input);
    }),

    getMemoryTimelineWindow: publicProcedure.input(getMemoryTimelineWindowInputSchema).query(async ({ input }) => {
        const service = requireAgentMemoryService('Memory timeline window');
        const getTimelineWindow = requireAgentMemoryCapability(service.getTimelineWindow, 'Memory timeline window');
        return getTimelineWindow(input);
    }),

    getCrossSessionMemoryLinks: publicProcedure.input(getCrossSessionMemoryLinksInputSchema).query(async ({ input }) => {
        const service = requireAgentMemoryService('Cross-session memory links');
        const getCrossSessionLinks = requireAgentMemoryCapability(service.getCrossSessionLinks, 'Cross-session memory links');
        return getCrossSessionLinks(input);
=======
        const service = getAgentMemoryService();
        if (!service?.searchByPivot) return [];
        return service.searchByPivot(input);
    }),

    getMemoryTimelineWindow: publicProcedure.input(getMemoryTimelineWindowInputSchema).query(async ({ input }) => {
        const service = getAgentMemoryService();
        if (!service?.getTimelineWindow) return [];
        return service.getTimelineWindow(input);
    }),

    getCrossSessionMemoryLinks: publicProcedure.input(getCrossSessionMemoryLinksInputSchema).query(async ({ input }) => {
        const service = getAgentMemoryService();
        if (!service?.getCrossSessionLinks) return [];
        return service.getCrossSessionLinks(input);
>>>>>>> origin/rewrite/main-sanitized:packages/core/src/routers/memoryRouter.ts
    }),

    captureSessionSummary: publicProcedure.input(z.object({
        sessionId: z.string().min(1),
        name: z.string().optional(),
        cliType: z.string().optional(),
        workingDirectory: z.string().optional(),
        status: z.string().optional(),
        restartCount: z.number().int().min(0).optional(),
        startedAt: z.number().optional(),
        stoppedAt: z.number().optional(),
        lastActivityAt: z.number().optional(),
        lastError: z.string().optional(),
        lastExitCode: z.number().optional(),
        activeGoal: z.string().nullable().optional(),
        lastObjective: z.string().nullable().optional(),
        logTail: z.array(z.string()).optional(),
        metadata: z.record(z.unknown()).optional(),
    })).mutation(async ({ input }) => {
        const service = getAgentMemoryService();
        if (!service?.captureSessionSummary) return { success: false };

        const memory = await service.captureSessionSummary(input);
        return { success: true, memory };
    }),

    getRecentSessionSummaries: publicProcedure.input(z.object({
        limit: z.number().optional().default(10),
    }).optional().default({ limit: 10 })).query(async ({ input }) => {
        const service = requireAgentMemoryService('Recent session summaries');
        const getRecentSessionSummaries = requireAgentMemoryCapability(service.getRecentSessionSummaries, 'Recent session summaries');
        return getRecentSessionSummaries(input.limit);
    }),

    getSessionBootstrap: publicProcedure.input(z.object({
        activeGoal: z.string().nullable().optional(),
        lastObjective: z.string().nullable().optional(),
    }).optional().default({})).query(async ({ input }) => {
        const service = getAgentMemoryService();
        if (!service?.getSessionBootstrap) return null;
        return service.getSessionBootstrap({
            activeGoal: input.activeGoal,
            lastObjective: input.lastObjective,
        });
    }),

    getToolContext: publicProcedure.input(z.object({
        toolName: z.string().min(1),
        args: z.record(z.unknown()).optional(),
        activeGoal: z.string().nullable().optional(),
        lastObjective: z.string().nullable().optional(),
    })).query(async ({ input }) => {
        const service = getAgentMemoryService();
        if (!service?.getToolContext) return null;
        return service.getToolContext({
            toolName: input.toolName,
            args: input.args,
            activeGoal: input.activeGoal,
            lastObjective: input.lastObjective,
        });
    }),

    searchSessionSummaries: publicProcedure.input(z.object({
        query: z.string(),
        limit: z.number().optional().default(10),
    })).query(async ({ input }) => {
        const service = requireAgentMemoryService('Session summary search');
        const searchSessionSummaries = requireAgentMemoryCapability(service.searchSessionSummaries, 'Session summary search');
        return await searchSessionSummaries(input.query, input.limit);
    }),

    // --- Export / Import (Phase 70: Memory Multi-Backend) ---

    exportMemories: publicProcedure.input(z.object({
        userId: z.string().default('default'),
        format: memoryInterchangeFormatSchema.default('json'),
    })).query(async ({ input }) => {
        const manager = getMemoryManager();
        const exportService = new MemoryExportImportService(manager, { workspaceRoot: process.cwd() });
        const data = await exportService.exportAll(input.userId, input.format);
        return { data, format: input.format, exportedAt: new Date().toISOString() };
    }),

    importMemories: publicProcedure.input(z.object({
        userId: z.string().default('default'),
        format: memoryInterchangeFormatSchema.default('json'),
        data: z.string(),
    })).mutation(async ({ input }) => {
        const manager = getMemoryManager();
        const exportService = new MemoryExportImportService(manager, { workspaceRoot: process.cwd() });
        const result = await exportService.importBulk(input.data, input.format, input.userId);
        return { ...result, importedAt: new Date().toISOString() };
    }),

    listInterchangeFormats: publicProcedure.query(async () => {
        return MEMORY_INTERCHANGE_FORMATS;
    }),

    convertMemories: publicProcedure.input(z.object({
        userId: z.string().default('default'),
        fromFormat: memoryInterchangeFormatSchema,
        toFormat: memoryInterchangeFormatSchema,
        data: z.string(),
    })).mutation(async ({ input }) => {
        const manager = getMemoryManager();
        const exportService = new MemoryExportImportService(manager, { workspaceRoot: process.cwd() });
        const data = await exportService.convert(input.data, input.fromFormat, input.toFormat, input.userId);
        return {
            data,
            fromFormat: input.fromFormat,
            toFormat: input.toFormat,
            convertedAt: new Date().toISOString(),
        };
    }),

    getSectionedMemoryStatus: publicProcedure.query(async () => {
        const memoryManager = getMemoryManager() as { getPipelineSummary?: () => import('../services/memory/MemoryManager.js').MemoryPipelineSummary };
        return await readSectionedMemoryStoreStatus(process.cwd(), memoryManager.getPipelineSummary?.() ?? null);
    }),
});

