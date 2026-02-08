import { z } from 'zod';
import { t, getMcpServer } from '../lib/trpc-core.js';

export const lspRouter = t.router({
    findSymbol: t.procedure.input(z.object({
        filePath: z.string(),
        symbolName: z.string()
    })).query(async ({ input }) => {
        const server = getMcpServer();
        return server.lspService.findSymbol(input.filePath, input.symbolName);
    }),

    findReferences: t.procedure.input(z.object({
        filePath: z.string(),
        line: z.number(),
        character: z.number()
    })).query(async ({ input }) => {
        const server = getMcpServer();
        return server.lspService.findReferences(input.filePath, input.line, input.character);
    }),

    getSymbols: t.procedure.input(z.object({
        filePath: z.string()
    })).query(async ({ input }) => {
        const server = getMcpServer();
        return server.lspService.getSymbols(input.filePath);
    }),

    searchSymbols: t.procedure.input(z.object({
        query: z.string()
    })).query(async ({ input }) => {
        const server = getMcpServer();
        return server.lspService.searchSymbols(input.query);
    }),

    indexProject: t.procedure.mutation(async () => {
        const server = getMcpServer();
        await server.lspService.indexProject();
        return { success: true };
    })
});
