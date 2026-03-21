import { z } from "zod";
import { t, publicProcedure, adminProcedure } from "../lib/trpc-core.js";
import { linksBacklogRepository } from "../db/repositories/links-backlog.repo.js";
import { BobbyBookmarksBacklogAdapter } from "../services/bobby-bookmarks-adapter.js";

export const linksBacklogRouter = t.router({
    list: publicProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(200).default(50),
                offset: z.number().min(0).default(0),
                search: z.string().optional(),
                source: z.string().optional(),
                research_status: z.enum(["pending", "running", "done", "failed", "skipped"]).optional(),
                cluster_id: z.string().optional(),
                show_duplicates: z.boolean().default(false),
            }).optional()
        )
        .query(async ({ input }) => {
            const [items, total] = await Promise.all([
                linksBacklogRepository.listLinks(input),
                linksBacklogRepository.countLinks(input),
            ]);

            return { items, total };
        }),

    stats: publicProcedure.query(async () => {
        return linksBacklogRepository.getStats();
    }),

    get: publicProcedure
        .input(z.object({ uuid: z.string() }))
        .query(async ({ input }) => {
            return linksBacklogRepository.findByUuid(input.uuid) ?? null;
        }),

    syncFromBobbyBookmarks: adminProcedure
        .input(
            z.object({
                baseUrl: z.string().url(),
                perPage: z.number().min(1).max(250).default(100),
                includeDuplicates: z.boolean().default(true),
                includeResearched: z.boolean().default(true),
            })
        )
        .mutation(async ({ input }) => {
            const adapter = new BobbyBookmarksBacklogAdapter(input);
            return adapter.sync();
        }),
});
