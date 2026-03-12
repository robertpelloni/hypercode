import { z } from 'zod';
import { t, publicProcedure, adminProcedure } from '../lib/trpc-core.js';
import { logsRepository } from '../db/repositories/index.js';
import { GetLogsRequestSchema } from '../types/metamcp/logs.zod.js';

export const logsRouter = t.router({
    list: publicProcedure
        .input(GetLogsRequestSchema)
        .query(async ({ input }) => {
            return await logsRepository.findAll(input);
        }),

    summary: publicProcedure
        .input(z.object({ limit: z.number().min(1).max(5000).default(1000) }).optional())
        .query(async ({ input }) => {
            const limit = input?.limit ?? 1000;
            const logs = await logsRepository.findAll({ limit });

            const entries = Array.isArray(logs) ? logs : [];
            const totalCalls = entries.length;
            const errorCount = entries.filter((entry: any) => {
                const level = String(entry?.level ?? '').toLowerCase();
                return level === 'error' || Boolean(entry?.error);
            }).length;

            const durationSum = entries.reduce((acc: number, entry: any) => {
                const n = Number(entry?.durationMs);
                return acc + (Number.isFinite(n) ? n : 0);
            }, 0);

            const avgDurationMs = totalCalls > 0 ? Math.round(durationSum / totalCalls) : 0;
            const errorRate = totalCalls > 0 ? Number(((errorCount / totalCalls) * 100).toFixed(1)) : 0;

            const toolMap = new Map<string, { name: string; count: number; errors: number }>();
            for (const entry of entries) {
                const name = String(entry?.toolName ?? 'unknown');
                const current = toolMap.get(name) ?? { name, count: 0, errors: 0 };
                current.count += 1;

                const level = String(entry?.level ?? '').toLowerCase();
                if (level === 'error' || Boolean(entry?.error)) {
                    current.errors += 1;
                }

                toolMap.set(name, current);
            }

            const topTools = Array.from(toolMap.values())
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            const recentActivity = entries.slice(0, 30).map((entry: any) => ({
                toolName: String(entry?.toolName ?? 'unknown'),
                durationMs: Number(entry?.durationMs) || 0,
                error: Boolean(entry?.error) || String(entry?.level ?? '').toLowerCase() === 'error',
                timestamp: Number(entry?.timestamp) || null,
            }));

            return {
                totals: {
                    totalCalls,
                    errorCount,
                    errorRate,
                    avgDurationMs,
                    successRate: Number((100 - errorRate).toFixed(1)),
                },
                topTools,
                recentActivity,
            };
        }),

    clear: adminProcedure.mutation(async () => {
        await logsRepository.clear();
        return { success: true, message: "Logs cleared" };
    }),
});
