import { z } from 'zod';
import { t, publicProcedure, adminProcedure } from '../lib/trpc-core.js';
import { toolSetsRepository } from '../db/repositories/index.js';
import { ToolSetSchema } from '../types/metamcp/tool-sets.zod.js';

const CreateToolSetInput = z.object({
    name: z.string(),
    description: z.string().nullable().optional(),
    tools: z.array(z.string()),
    user_id: z.string().nullable().optional(),
});

const UpdateToolSetInput = z.object({
    uuid: z.string(),
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    tools: z.array(z.string()).optional(),
    user_id: z.string().nullable().optional(),
});

export const toolSetsRouter = t.router({
    list: publicProcedure.query(async () => {
        return await toolSetsRepository.findAll();
    }),

    get: publicProcedure
        .input(z.object({ uuid: z.string() }))
        .query(async ({ input }) => {
            return await toolSetsRepository.findByUuid(input.uuid);
        }),

    create: adminProcedure
        .input(CreateToolSetInput)
        .mutation(async ({ input }) => {
            return await toolSetsRepository.create(input);
        }),

    update: adminProcedure
        .input(UpdateToolSetInput)
        .mutation(async ({ input }) => {
            const updated = await toolSetsRepository.update(input);
            if (!updated) {
                throw new Error("Tool set not found");
            }
            return updated;
        }),

    delete: adminProcedure
        .input(z.object({ uuid: z.string() }))
        .mutation(async ({ input }) => {
            await toolSetsRepository.deleteByUuid(input.uuid);
            return { success: true };
        }),
});
