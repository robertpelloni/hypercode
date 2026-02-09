import { initTRPC } from '@trpc/server';
import { z } from 'zod';

export const t = initTRPC.create();

// Mock RBAC Middleware
const isAdmin = t.middleware(async ({ next, ctx }) => {
    // In a real app, check ctx.user.role via JWT/Session
    // For local desktop app, we default to ADMIN unless config says 'demo_mode'
    // For local desktop app, we default to ADMIN unless config says 'demo_mode'
    try {
        const config = getMcpServer().directorConfig;
        if (config?.demo_mode) {
            throw new Error("UNAUTHORIZED: Demo Mode enabled. Action restricted.");
        }
    } catch (e: any) {
        // If server not initialized, strict mode might block, or we allow.
        // Logic: If error is "UNAUTHORIZED", rethrow.
        if (e.message && e.message.startsWith("UNAUTHORIZED")) throw e;
        // Else ignore (server missing)
    }
    return next();
});

export const publicProcedure = t.procedure;
export const adminProcedure = t.procedure.use(isAdmin);

/**
 * Typed accessor for the global MCPServer instance.
 * Eliminates @ts-ignore usage throughout trpc.ts routers.
 */
export function getMcpServer(): any {
    const server = (global as any).mcpServerInstance;
    if (!server) throw new Error("MCPServer instance not found");
    return server;
}
