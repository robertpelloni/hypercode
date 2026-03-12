import { z } from 'zod';
import { t, publicProcedure, getMemoryManager, getAgentMemoryService } from '../lib/trpc-core.js';
import path from 'path';
import {
    MemoryExportImportService,
    MEMORY_INTERCHANGE_FORMATS,
} from '../services/memory/MemoryExportImportService.js';
import { readClaudeMemStoreStatus } from './memoryRouter.claude-mem.js';

const memoryInterchangeFormatSchema = z.enum(['json', 'csv', 'jsonl', 'json-provider', 'claude-mem-store']);
const observationTypeSchema = z.enum(['discovery', 'decision', 'progress', 'warning', 'fix']);
const userPromptRoleSchema = z.enum(['goal', 'objective', 'prompt']);

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
        const service = getAgentMemoryService();
        if (!service) return [];
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

    recordObservation: publicProcedure.input(z.object({
        toolName: z.string().optional(),
        title: z.string().optional(),
        subtitle: z.string().optional(),
        narrative: z.string().optional(),
        rawInput: z.unknown().optional(),
        rawOutput: z.unknown().optional(),
        facts: z.array(z.string()).optional(),
        concepts: z.array(z.string()).optional(),
        filesRead: z.array(z.string()).optional(),
        filesModified: z.array(z.string()).optional(),
        type: observationTypeSchema.optional(),
        namespace: z.enum(['user', 'agent', 'project']).default('project'),
        metadata: z.record(z.unknown()).optional(),
    })).mutation(async ({ input }) => {
        const service = getAgentMemoryService();
        if (!service?.recordObservation) return { success: false };

        const memory = await service.recordObservation(input);
        return { success: true, memory };
    }),

    captureUserPrompt: publicProcedure.input(z.object({
        content: z.string().min(1),
        role: userPromptRoleSchema.default('prompt'),
        sessionId: z.string().optional(),
        activeGoal: z.string().nullable().optional(),
        lastObjective: z.string().nullable().optional(),
        metadata: z.record(z.unknown()).optional(),
    })).mutation(async ({ input }) => {
        const service = getAgentMemoryService();
        if (!service?.captureUserPrompt) return { success: false };

        const memory = await service.captureUserPrompt(input);
        return { success: true, memory };
    }),

    getRecentObservations: publicProcedure.input(z.object({
        limit: z.number().optional().default(10),
        namespace: z.enum(['user', 'agent', 'project']).optional(),
        type: observationTypeSchema.optional(),
    }).optional().default({ limit: 10 })).query(async ({ input }) => {
        const service = getAgentMemoryService();
        if (!service?.getRecentObservations) return [];
        return service.getRecentObservations(input.limit, {
            namespace: input.namespace,
            type: input.type,
        });
    }),

    searchObservations: publicProcedure.input(z.object({
        query: z.string(),
        limit: z.number().optional().default(10),
        namespace: z.enum(['user', 'agent', 'project']).optional(),
        type: observationTypeSchema.optional(),
    })).query(async ({ input }) => {
        const service = getAgentMemoryService();
        if (!service?.searchObservations) return [];
        return await service.searchObservations(input.query, {
            limit: input.limit,
            namespace: input.namespace,
            type: input.type,
        });
    }),

    getRecentUserPrompts: publicProcedure.input(z.object({
        limit: z.number().optional().default(10),
        role: userPromptRoleSchema.optional(),
    }).optional().default({ limit: 10 })).query(async ({ input }) => {
        const service = getAgentMemoryService();
        if (!service?.getRecentUserPrompts) return [];
        return service.getRecentUserPrompts(input.limit, {
            role: input.role,
        });
    }),

    searchUserPrompts: publicProcedure.input(z.object({
        query: z.string(),
        limit: z.number().optional().default(10),
        role: userPromptRoleSchema.optional(),
    })).query(async ({ input }) => {
        const service = getAgentMemoryService();
        if (!service?.searchUserPrompts) return [];
        return await service.searchUserPrompts(input.query, {
            limit: input.limit,
            role: input.role,
        });
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
        const service = getAgentMemoryService();
        if (!service?.getRecentSessionSummaries) return [];
        return service.getRecentSessionSummaries(input.limit);
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
        const service = getAgentMemoryService();
        if (!service?.searchSessionSummaries) return [];
        return await service.searchSessionSummaries(input.query, input.limit);
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

    getClaudeMemStatus: publicProcedure.query(async () => {
        const memoryManager = getMemoryManager() as { getPipelineSummary?: () => import('../services/memory/MemoryManager.js').MemoryPipelineSummary };
        return await readClaudeMemStoreStatus(process.cwd(), memoryManager.getPipelineSummary?.() ?? null);
    }),
});

