import { z } from 'zod';
import { t, publicProcedure, getMcpServer } from '../lib/trpc-core.js';
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/routers/agentRouter.ts
import { a2aBroker, taskQueue } from '@hypercode/agents';
=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/routers/agentRouter.ts
import { TRPCError } from '@trpc/server';

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return typeof error === 'string' ? error : 'Unknown error';
}

export const agentRouter = t.router({
    /**
     * Run a specific tool by name with arguments.
     * Used by Inspector and Agents.
     */
    runTool: publicProcedure
        .input(z.object({
            serverName: z.string().optional(), // Optional if name is unique or namespaced
            toolName: z.string(),
            arguments: z.record(z.any()).optional().default({}),
        }))
        .mutation(async ({ input }) => {
            const server = getMcpServer();
            if (!server) {
                throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'MCP Server not initialized' });
            }

<<<<<<< HEAD:archive/ts-legacy/packages/core/src/routers/agentRouter.ts
            // In MetaMCP/HyperCode, tools are often namespaced: "server__tool" or just "tool" if unique.
=======
            // In MetaMCP/borg, tools are often namespaced: "server__tool" or just "tool" if unique.
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/routers/agentRouter.ts
            // If serverName is provided, we might need to look it up specifically, 
            // but the aggregator usually acts as a unified client.
            // We'll call the server's executeTool method which handles policies and permissions.

            try {
                // If the aggregator exposes a direct client-like interface:
                const result = await server.executeTool(input.toolName, input.arguments);

                return result;
            } catch (error: any) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: error.message || 'Tool execution failed',
                    cause: error
                });
            }
        }),

    /**
     * Simple chat interface for the Agent Playground.
     * Uses the "expert" or default LLM to reason about tools.
     */
    chat: publicProcedure
        .input(z.object({
            message: z.string(),
            context: z.any().optional(),
        }))
        .mutation(async ({ input }) => {
            const server = getMcpServer();
            if (!server) {
                throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'MCP Server not initialized' });
            }

            const llm = server.llmService;
            if (!llm || typeof llm.generate !== 'function') {
                return {
                    response: `[Agent] Chat model unavailable. Received: "${input.message}"`,
                    tool_calls: [],
                    degraded: true,
                };
            }

            const contextSnippet = input.context ? `\n\nContext:\n${JSON.stringify(input.context).slice(0, 4000)}` : '';
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/routers/agentRouter.ts
            const prompt = `You are HyperCode Agent Chat. Give concise, actionable guidance and suggest tool usage when helpful.\n\nUser:\n${input.message}${contextSnippet}`;
=======
            const prompt = `You are borg Agent Chat. Give concise, actionable guidance and suggest tool usage when helpful.\n\nUser:\n${input.message}${contextSnippet}`;
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/routers/agentRouter.ts

            try {
                const result = await llm.generate(prompt, {
                    maxTokens: 600,
                });

                return {
                    response: result?.text ?? 'No response generated.',
                    tool_calls: [],
                    degraded: false,
                };
            } catch (error: unknown) {
                return {
                    response: `[Agent] Failed to generate response: ${getErrorMessage(error)}`,
                    tool_calls: [],
                    degraded: true,
                };
            }
        }),
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/routers/agentRouter.ts

    /**
     * List all currently active A2A-capable agents.
     */
    listA2AAgents: publicProcedure.query(() => {
        return a2aBroker.listAgents();
    }),

    /**
     * Get recent A2A message history for the broker.
     */
    getA2AMessages: publicProcedure.query(() => {
        return a2aBroker.getHistory();
    }),

    /**
     * Get active A2A task negotiations.
     */
    getNegotiations: publicProcedure.query(() => {
        return a2aBroker.getNegotiations();
    }),

    /**
     * Get active A2A tasks from the collective queue.
     */
    getQueuedTasks: publicProcedure.query(() => {
        return taskQueue.listTasks();
    }),

    /**
     * Get recent A2A traffic logs from disk.
     */
    getA2ALogs: publicProcedure
        .input(z.object({ limit: z.number().default(100) }))
        .query(async ({ input }) => {
            if (global.mcpServerInstance?.a2aLogger) {
                return await global.mcpServerInstance.a2aLogger.getRecentLogs(input.limit);
            }
            return [];
        }),

    /**
     * Broadcast an A2A message from the dashboard.
     */
    a2aBroadcast: publicProcedure
        .input(z.object({
            type: z.string(),
            payload: z.any().optional(),
        }))
        .mutation(async ({ input }) => {
            await a2aBroker.routeMessage({
                id: `a2a-dash-${Date.now()}`,
                timestamp: Date.now(),
                sender: 'DASHBOARD',
                type: input.type as any,
                payload: input.payload || {},
            });
            return { success: true };
        }),
=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/routers/agentRouter.ts
});
