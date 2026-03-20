/**
 * @file catalogRouter.ts
 * @module packages/core/src/routers/catalogRouter
 *
 * WHAT:
 * tRPC router for the MCP Registry Intelligence Published Catalog feature.
 * Exposes read-only catalog queries and admin-only ingestion/validation triggers.
 *
 * WHY:
 * This router is the API boundary between the dashboard UI and the
 * catalog data layer. All catalog logic stays in services; this router just
 * wires inputs → services → typed outputs.
 *
 * HOW:
 * - publicProcedure: list, search, get — safe for any authenticated session
 * - adminProcedure: ingest trigger, validate trigger — restricted to admins
 * - Graceful degradation: if ingestion/validation fails, error is returned
 *   without crashing the server (consistent with Borg's resilience patterns)
 */

import { z } from "zod";
import { t, publicProcedure, adminProcedure } from "../lib/trpc-core.js";
import { publishedCatalogRepository } from "../db/repositories/published-catalog.repo.js";
import { ingestPublishedCatalog } from "../services/published-catalog-ingestor.js";
import { validatePublishedServer } from "../services/published-catalog-validator.js";

// ---- Shared output schemas ----

const publishedServerSchema = z.object({
    uuid: z.string(),
    canonical_id: z.string(),
    display_name: z.string(),
    description: z.string().nullable(),
    author: z.string().nullable(),
    repository_url: z.string().nullable(),
    homepage_url: z.string().nullable(),
    icon_url: z.string().nullable(),
    transport: z.string(),
    install_method: z.string(),
    auth_model: z.string(),
    status: z.string(),
    confidence: z.number(),
    tags: z.array(z.string()),
    categories: z.array(z.string()),
    stars: z.number().nullable(),
    last_seen_at: z.date().nullable(),
    last_verified_at: z.date().nullable(),
    created_at: z.date(),
    updated_at: z.date(),
});

const validationRunSchema = z.object({
    uuid: z.string(),
    server_uuid: z.string(),
    run_mode: z.string(),
    started_at: z.date(),
    finished_at: z.date().nullable(),
    outcome: z.string(),
    failure_class: z.string().nullable(),
    tool_count: z.number().nullable(),
    findings_summary: z.record(z.unknown()).nullable(),
    performed_by: z.string(),
    created_at: z.date(),
});

const configRecipeSchema = z.object({
    uuid: z.string(),
    server_uuid: z.string(),
    recipe_version: z.number(),
    template: z.record(z.unknown()),
    required_secrets: z.array(z.string()),
    required_env: z.record(z.string()),
    confidence: z.number(),
    explanation: z.string().nullable(),
    is_active: z.boolean(),
    generated_by: z.string(),
    created_at: z.date(),
    updated_at: z.date(),
});

// ---- Router ----

export const catalogRouter = t.router({
    /**
     * List published servers with optional filtering and pagination.
     * Used by the Registry dashboard table.
     */
    list: publicProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(200).default(50),
                offset: z.number().min(0).default(0),
                search: z.string().optional(),
                status: z
                    .enum([
                        "discovered",
                        "normalized",
                        "probeable",
                        "validated",
                        "certified",
                        "broken",
                        "archived",
                    ])
                    .optional(),
                transport: z.string().optional(),
                install_method: z.string().optional(),
            }).optional()
        )
        .query(async ({ input }) => {
            const [servers, total] = await Promise.all([
                publishedCatalogRepository.listServers(input),
                publishedCatalogRepository.countServers(input),
            ]);
            return { servers, total };
        }),

    /**
     * Get a single published server by UUID, including its latest validation run
     * and active recipe.
     */
    get: publicProcedure
        .input(z.object({ uuid: z.string() }))
        .query(async ({ input }) => {
            const [server, latestRun, activeRecipe, sources] = await Promise.all([
                publishedCatalogRepository.findServerByUuid(input.uuid),
                publishedCatalogRepository
                    .listRunsForServer(input.uuid, 1)
                    .then((runs) => runs[0] ?? null),
                publishedCatalogRepository.getActiveRecipe(input.uuid),
                publishedCatalogRepository.findSourcesByServerUuid(input.uuid),
            ]);

            return {
                server: server ?? null,
                latestRun: latestRun ?? null,
                activeRecipe: activeRecipe ?? null,
                sources: sources.map((s) => ({
                    uuid: s.uuid,
                    source_name: s.source_name,
                    source_url: s.source_url ?? null,
                    first_seen_at: s.first_seen_at,
                    last_seen_at: s.last_seen_at,
                })),
            };
        }),

    /**
     * Get validation run history for a server.
     */
    listRuns: publicProcedure
        .input(z.object({ server_uuid: z.string(), limit: z.number().min(1).max(50).default(10) }))
        .query(async ({ input }) => {
            return publishedCatalogRepository.listRunsForServer(input.server_uuid, input.limit);
        }),

    /**
     * Trigger ingestion from all registered external registry sources.
     * Admin-only. Returns a report of what was fetched and upserted.
     */
    triggerIngestion: adminProcedure
        .mutation(async () => {
            const report = await ingestPublishedCatalog();
            return {
                started_at: report.started_at,
                finished_at: report.finished_at,
                total_upserted: report.total_upserted,
                total_errors: report.total_errors,
                results: report.results.map((r) => ({
                    source: r.source,
                    fetched: r.fetched,
                    upserted: r.upserted,
                    error_count: r.errors.length,
                    // First 5 errors for diagnostics (avoid leaking full stack traces)
                    sample_errors: r.errors.slice(0, 5),
                })),
            };
        }),

    /**
     * Trigger validation for a specific server.
     * Admin-only. Returns the validation outcome.
     */
    triggerValidation: adminProcedure
        .input(z.object({ server_uuid: z.string() }))
        .mutation(async ({ input }) => {
            const output = await validatePublishedServer(input.server_uuid);
            return {
                run_uuid: output.run_uuid,
                outcome: output.outcome,
                failure_class: output.failure_class ?? null,
                tool_count: output.tool_count ?? null,
                findings_summary: output.findings_summary ?? null,
            };
        }),

    /**
     * Get catalog statistics for the dashboard summary cards.
     */
    stats: publicProcedure
        .query(async () => {
            const [total, validated, broken, recentlyUpdated] = await Promise.all([
                publishedCatalogRepository.countServers({}),
                publishedCatalogRepository.countServers({ status: "validated" }),
                publishedCatalogRepository.countServers({ status: "broken" }),
                publishedCatalogRepository.countRecentlyUpdated(24),
            ]);

            // Status breakdown — query each status
            const statuses = [
                "discovered",
                "normalized",
                "probeable",
                "validated",
                "certified",
                "broken",
                "archived",
            ] as const;

            const statusCounts = await Promise.all(
                statuses.map(async (s) => ({
                    status: s,
                    count: await publishedCatalogRepository.countServers({ status: s }),
                }))
            );

            const byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s.count]));

            return {
                total,
                byStatus,
                validated,
                broken,
                recentlyUpdated,
            };
        }),
});
