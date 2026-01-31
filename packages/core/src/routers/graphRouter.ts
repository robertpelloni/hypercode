import { z } from 'zod';
import { t, publicProcedure } from '../lib/trpc-core.js';
import { RepoGraphService } from '../services/RepoGraphService.js';

// Lazy-initialized graph service (initialized on first call)
let graphService: RepoGraphService | null = null;

function getGraphService(): RepoGraphService {
    if (!graphService) {
        // @ts-ignore - global.mcpServerInstance may have autoTestService with repoGraph
        if (global.mcpServerInstance?.autoTestService?.repoGraph) {
            // @ts-ignore
            graphService = global.mcpServerInstance.autoTestService.repoGraph;
        } else {
            // Fallback: create standalone instance
            graphService = new RepoGraphService(process.cwd());
        }
    }
    return graphService!;
}

export const graphRouter = t.router({
    get: publicProcedure.query(async () => {
        const service = getGraphService();
        if (!service) {
            return { nodes: [], links: [] };
        }
        // Build graph if not initialized
        // @ts-ignore - isInitialized is private but we check it for optimization
        if (!service['isInitialized']) {
            await service.buildGraph();
        }
        return service.toJSON();
    }),

    rebuild: publicProcedure.mutation(async () => {
        const service = getGraphService();
        await service.buildGraph();
        return { success: true, ...service.toJSON() };
    }),

    getConsumers: publicProcedure
        .input(z.object({ filePath: z.string() }))
        .query(({ input }) => {
            const service = getGraphService();
            return service.getConsumers(input.filePath);
        }),

    getDependencies: publicProcedure
        .input(z.object({ filePath: z.string() }))
        .query(({ input }) => {
            const service = getGraphService();
            return service.getDependencies(input.filePath);
        }),

    getSymbolsGraph: publicProcedure.query(async () => {
        // @ts-ignore
        const mcp = global.mcpServerInstance;
        if (!mcp || !mcp.memoryManager) return { nodes: [], links: [] };

        const symbols = await mcp.memoryManager.getAllSymbols();

        const nodes: any[] = [];
        const links: any[] = [];

        symbols.forEach((sym: any) => {
            // Node for the symbol
            nodes.push({
                id: sym.id,
                name: sym.metadata.name,
                val: 5, // Size
                group: 'symbol',
                kind: sym.metadata.kind, // function, class, etc.
                file: sym.metadata.file_path
            });

            // Link to the file
            // The file node ID in RepoGraph is usually the relative path
            if (sym.metadata.file_path) {
                links.push({
                    source: sym.metadata.file_path,
                    target: sym.id,
                    type: 'defines'
                });
            }
        });

        return { nodes, links };
    }),
});
