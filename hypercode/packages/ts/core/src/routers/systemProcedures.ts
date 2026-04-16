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
    getSessionImportService,
    getMcpConfigService,
} from '../lib/trpc-core.js';
import { buildStartupStatusSnapshot } from './startupStatus.js';
import { detectLocalExecutionEnvironment } from '../services/execution-environment.js';
import { getCachedToolInventory } from '../mcp/cachedToolInventory.js';
import { readSectionedMemoryStoreStatus } from './memoryRouter.sectioned-store.js';
import { summarizeCachedInventory } from './startupInventorySummary.js';
import { mcpServerPool } from '../services/mcp-server-pool.service.js';
import type { MemoryPipelineSummary } from '../services/memory/MemoryManager.js';

const EXECUTION_ENV_CACHE_TTL_MS = Number(process.env.HYPERCODE_EXECUTION_ENV_CACHE_TTL_MS ?? 30_000);

let executionEnvironmentCache:
    | {
        value: Awaited<ReturnType<typeof detectLocalExecutionEnvironment>> | null;
        expiresAt: number;
      }
    | null = null;
let executionEnvironmentInFlight: Promise<Awaited<ReturnType<typeof detectLocalExecutionEnvironment>> | null> | null = null;

async function getCachedExecutionEnvironment() {
    if (EXECUTION_ENV_CACHE_TTL_MS <= 0) {
        return detectLocalExecutionEnvironment().catch(() => null);
    }

    const now = Date.now();
    if (executionEnvironmentCache && executionEnvironmentCache.expiresAt > now) {
        return executionEnvironmentCache.value;
    }

    if (executionEnvironmentInFlight) {
        return executionEnvironmentInFlight;
    }

    executionEnvironmentInFlight = detectLocalExecutionEnvironment()
        .then((environment) => {
            executionEnvironmentCache = {
                value: environment,
                expiresAt: Date.now() + EXECUTION_ENV_CACHE_TTL_MS,
            };
            return environment;
        })
        .catch(() => {
            executionEnvironmentCache = {
                value: null,
                expiresAt: Date.now() + EXECUTION_ENV_CACHE_TTL_MS,
            };
            return null;
        })
        .finally(() => {
            executionEnvironmentInFlight = null;
        });

    return executionEnvironmentInFlight;
}

export const systemProcedures = {
    health: publicProcedure.query(() => {
        return { status: 'running', service: '@hypercode/core' };
    }),
    startupStatus: publicProcedure.query(async () => {
        const mcpServer = getMcpServer();
        const aggregator = getMcpAggregator();
        const agentMemory = getAgentMemoryService();
        const browserService = getBrowserService();
        const sessionSupervisor = getSessionSupervisor();
        const sessionImportService = getSessionImportService();
        const mcpConfigService = getMcpConfigService();

        const memoryManager = (mcpServer as { memoryManager?: { getPipelineSummary?: () => MemoryPipelineSummary } }).memoryManager;
        const memoryPipelineSummary: MemoryPipelineSummary | null = memoryManager?.getPipelineSummary?.() ?? null;

        const [runtimeServers, sessionCount, browserStatus, executionEnvironment, cachedInventory, sectionedMemoryStoreStatus, importedMaintenanceStats] = await Promise.all([
            aggregator?.listServers?.().catch(() => []) ?? [],
            Promise.resolve(sessionSupervisor?.listSessions?.().length ?? 0),
            Promise.resolve(browserService?.getStatus?.() ?? { active: false, pageCount: 0, pageIds: [] }),
            getCachedExecutionEnvironment(),
            getCachedToolInventory().catch(() => ({
                servers: [],
                tools: [],
                toolCounts: new Map(),
                source: 'empty' as const,
                snapshotUpdatedAt: null,
                databaseAvailable: false,
                databaseError: 'Persisted MCP inventory is unavailable: startup snapshot fallback failed.',
                fallbackUsed: true,
            })),
            readSectionedMemoryStoreStatus(process.cwd(), memoryPipelineSummary).catch(() => null),
            Promise.resolve(sessionImportService?.getImportedMaintenanceStats?.() ?? null),
        ]);

        const liveServerCount = runtimeServers.filter((server) => server.status === 'connected').length;
        const residentLiveServerCount = runtimeServers.filter(
            (server) => server.status === 'connected' && Boolean(server.advertisedAlwaysOn),
        ).length;
        const warmingServerCount = runtimeServers.filter((server) => server.warmupStatus === 'scheduled' || server.warmupStatus === 'warming').length;
        const failedWarmupServerCount = runtimeServers.filter((server) => server.warmupStatus === 'failed').length;
        const lifecycleModes = mcpServerPool.getLifecycleModes();

        const cachedInventorySummary = summarizeCachedInventory(cachedInventory);

        const persistedServerCount = cachedInventorySummary.serverCount;
        const persistedToolCount = cachedInventorySummary.toolCount;
        const persistedAlwaysOnServerCount = cachedInventorySummary.alwaysOnServerCount;
        const persistedAlwaysOnToolCount = cachedInventorySummary.alwaysOnToolCount;

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
            residentLiveServerCount,
            warmingServerCount,
            failedWarmupServerCount,
            lazySessionMode: lifecycleModes.lazySessionMode,
            persistedServerCount,
            persistedToolCount,
            persistedAlwaysOnServerCount,
            persistedAlwaysOnToolCount,
            inventorySource: cachedInventorySummary.source,
            inventorySnapshotUpdatedAt: cachedInventorySummary.snapshotUpdatedAt,
            inventoryPersistence: {
                databaseAvailable: cachedInventorySummary.databaseAvailable,
                fallbackUsed: cachedInventorySummary.fallbackUsed,
                error: cachedInventorySummary.databaseError,
            },
            executionEnvironment: executionEnvironment?.summary ?? null,
            sectionedMemory: sectionedMemoryStoreStatus
                ? {
                    enabled: Boolean(sectionedMemoryStoreStatus.runtimePipeline.sectionedStoreEnabled),
                    storePath: sectionedMemoryStoreStatus.storePath,
                    storeExists: sectionedMemoryStoreStatus.exists,
                    totalEntries: sectionedMemoryStoreStatus.totalEntries,
                    sectionCount: sectionedMemoryStoreStatus.sectionCount,
                    defaultSectionCount: sectionedMemoryStoreStatus.defaultSectionCount,
                    presentDefaultSectionCount: sectionedMemoryStoreStatus.presentDefaultSectionCount,
                    missingSections: sectionedMemoryStoreStatus.missingSections,
                    lastUpdatedAt: sectionedMemoryStoreStatus.lastUpdatedAt,
                }
                : null,
            importedSessions: importedMaintenanceStats
                ? {
                    totalSessions: Number((importedMaintenanceStats as { totalSessions?: number }).totalSessions ?? 0),
                    inlineTranscriptCount: Number((importedMaintenanceStats as { inlineTranscriptCount?: number }).inlineTranscriptCount ?? 0),
                    archivedTranscriptCount: Number((importedMaintenanceStats as { archivedTranscriptCount?: number }).archivedTranscriptCount ?? 0),
                    missingRetentionSummaryCount: Number((importedMaintenanceStats as { missingRetentionSummaryCount?: number }).missingRetentionSummaryCount ?? 0),
                }
                : null,
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
