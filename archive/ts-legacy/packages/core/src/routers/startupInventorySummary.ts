import type { getCachedToolInventory } from '../mcp/cachedToolInventory.js';

export function summarizeCachedInventory(cachedInventory: Awaited<ReturnType<typeof getCachedToolInventory>>) {
    const serverCount = cachedInventory.servers.length;
    const toolCount = cachedInventory.tools.length;
    const alwaysOnServerCount = cachedInventory.servers.filter((server) => Boolean(server.alwaysOnAdvertised)).length;
    const alwaysOnToolCount = cachedInventory.tools.filter((tool) => Boolean(tool.alwaysOn)).length;

    return {
        source: cachedInventory.source,
        snapshotUpdatedAt: cachedInventory.snapshotUpdatedAt,
        serverCount,
        toolCount,
        alwaysOnServerCount,
        alwaysOnToolCount,
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/routers/startupInventorySummary.ts
        databaseAvailable: cachedInventory.databaseAvailable,
        databaseError: cachedInventory.databaseError,
        fallbackUsed: cachedInventory.fallbackUsed,
    };
}
=======
    };
}
>>>>>>> origin/rewrite/main-sanitized:packages/core/src/routers/startupInventorySummary.ts
