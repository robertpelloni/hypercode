import { z } from 'zod';
import { t, publicProcedure, adminProcedure } from '../lib/trpc-core.js';
import { configRepo } from '../db/repositories/index.js';
import { configService } from '../services/config.service.js';
import { jsonConfigProvider } from '../services/config/JsonConfigProvider.js';

const ConfigValueSchema = z.object({
    id: z.string(),
    value: z.string(),
    description: z.string().optional(),
});

export const configRouter = t.router({
    list: publicProcedure
        .output(z.array(z.object({ key: z.string(), value: z.string() })))
        .query(async () => {
            const configRecord = await configRepo.findAll();
            return Object.entries(configRecord).map(([key, value]) => ({ key, value }));
        }),

    get: publicProcedure
        .input(z.object({ key: z.string() }))
        .query(async ({ input }) => {
            return await configRepo.get(input.key); // configRepo has 'get', not 'findByKey'
        }),

    upsert: adminProcedure
        .input(ConfigValueSchema)
        .mutation(async ({ input }) => {
            return await configRepo.set(input.id, input.value); // configRepo set(key, value)
            // configRepo doesn't have upsert(id, value, desc). DB configTable has key, val.
            // Zod schema ConfigValueSchema has description. Repo doesn't use it?
            // configTable has id, value, created_at, updated_at. No description exposed in `config.repo.ts` set method?
            // I'll stick to configRepo.set(input.id, input.value).
        }),

    delete: adminProcedure
        .input(z.object({ key: z.string() }))
        .mutation(async ({ input }) => {
            return await configRepo.delete(input.key);
        }),

    update: adminProcedure
        .input(z.object({ key: z.string(), value: z.string() }))
        .mutation(async ({ input }) => {
            return await configRepo.set(input.key, input.value);
        }),

    getMcpTimeout: publicProcedure.query(async () => {
        return await configService.getMcpTimeout();
    }),

    setMcpTimeout: adminProcedure
        .input(z.object({ timeout: z.number().min(1000).max(86400000) }))
        .mutation(async ({ input }) => {
            await configService.setMcpTimeout(input.timeout);
            return { success: true };
        }),

    getMcpMaxAttempts: publicProcedure.query(async () => {
        return await configService.getMcpMaxAttempts();
    }),

    setMcpMaxAttempts: adminProcedure
        .input(z.object({ maxAttempts: z.number().min(1).max(10) }))
        .mutation(async ({ input }) => {
            await configService.setMcpMaxAttempts(input.maxAttempts);
            return { success: true };
        }),

    getMcpMaxTotalTimeout: publicProcedure.query(async () => {
        return await configService.getMcpMaxTotalTimeout();
    }),

    setMcpMaxTotalTimeout: adminProcedure
        .input(z.object({ timeout: z.number().min(1000).max(86400000) }))
        .mutation(async ({ input }) => {
            await configService.setMcpMaxTotalTimeout(input.timeout);
            return { success: true };
        }),

    getMcpResetTimeoutOnProgress: publicProcedure.query(async () => {
        return await configService.getMcpResetTimeoutOnProgress();
    }),

    setMcpResetTimeoutOnProgress: adminProcedure
        .input(z.object({ enabled: z.boolean() }))
        .mutation(async ({ input }) => {
            await configService.setMcpResetTimeoutOnProgress(input.enabled);
            return { success: true };
        }),

    getSessionLifetime: publicProcedure.query(async () => {
        return await configService.getSessionLifetime();
    }),

    setSessionLifetime: adminProcedure
        .input(z.object({ lifetime: z.number().min(300000).max(86400000).nullable().optional() }))
        .mutation(async ({ input }) => {
            await configService.setSessionLifetime(input.lifetime);
            return { success: true };
        }),

    getSignupDisabled: publicProcedure.query(async () => {
        return await configService.isSignupDisabled();
    }),

    setSignupDisabled: adminProcedure
        .input(z.object({ disabled: z.boolean() }))
        .mutation(async ({ input }) => {
            await configService.setSignupDisabled(input.disabled);
            return { success: true };
        }),

    getSsoSignupDisabled: publicProcedure.query(async () => {
        return await configService.isSsoSignupDisabled();
    }),

    setSsoSignupDisabled: adminProcedure
        .input(z.object({ disabled: z.boolean() }))
        .mutation(async ({ input }) => {
            await configService.setSsoSignupDisabled(input.disabled);
            return { success: true };
        }),

    getBasicAuthDisabled: publicProcedure.query(async () => {
        return await configService.isBasicAuthDisabled();
    }),

    setBasicAuthDisabled: adminProcedure
        .input(z.object({ disabled: z.boolean() }))
        .mutation(async ({ input }) => {
            await configService.setBasicAuthDisabled(input.disabled);
            return { success: true };
        }),

    getAuthProviders: publicProcedure.query(async () => {
        return await configService.getAuthProviders();
    }),

    getAlwaysVisibleTools: publicProcedure.query(async () => {
        return await jsonConfigProvider.loadAlwaysVisibleTools();
    }),

    setAlwaysVisibleTools: adminProcedure
        .input(z.object({ tools: z.array(z.string()) }))
        .mutation(async ({ input }) => {
            const tools = await jsonConfigProvider.saveAlwaysVisibleTools(input.tools);
            return { success: true, tools };
        }),
});
