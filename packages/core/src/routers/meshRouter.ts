import { t, publicProcedure, adminProcedure } from '../lib/trpc-core.js';
import { z } from 'zod';
import { MeshService, SwarmMessageType } from '../mesh/MeshService.js';

// We create a singleton or a way to access the global mesh.
// In actual implementation, this might be attached to the global orchestrator
let meshServiceInstance: MeshService | null = null;

function getMeshService(): MeshService {
    if (!meshServiceInstance) {
        meshServiceInstance = new MeshService();
    }
    return meshServiceInstance;
}

export const meshRouter = t.router({
    getStatus: adminProcedure.query(async () => {
        const mesh = getMeshService();
        return {
            nodeId: mesh.nodeId,
            peersCount: mesh.getPeers().length
        };
    }),
    
    getPeers: adminProcedure.query(async () => {
        const mesh = getMeshService();
        return mesh.getPeers();
    }),

    getCapabilities: adminProcedure.query(async () => {
        const mesh = getMeshService();
        return mesh.getMeshCapabilities();
    }),

    broadcast: adminProcedure
        .input(z.object({
            type: z.nativeEnum(SwarmMessageType),
            payload: z.any()
        }))
        .mutation(async ({ input }) => {
            const mesh = getMeshService();
            mesh.broadcast(input.type, input.payload);
            return { success: true };
        })
});
