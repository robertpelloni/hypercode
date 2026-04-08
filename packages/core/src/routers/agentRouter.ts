import { z } from 'zod';
import { t, publicProcedure, getMcpServer } from '../lib/trpc-core.js';
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

            // In MetaMCP/HyperCode, tools are often namespaced: "server__tool" or just "tool" if unique.
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
            const prompt = `You are HyperCode Agent Chat. Give concise, actionable guidance and suggest tool usage when helpful.\n\nUser:\n${input.message}${contextSnippet}`;

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
});
