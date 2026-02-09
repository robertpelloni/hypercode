import { z } from 'zod';
import { t, publicProcedure } from '../lib/trpc-core.js';
import { getMcpServer } from '../lib/mcpHelper.js';

export const testsRouter = t.router({
    status: publicProcedure.query(() => {
        const service = getMcpServer().autoTestService;
        const results: Record<string, { status: string; timestamp: number; output?: string }> = {};
        for (const [file, result] of service.testResults.entries()) {
            results[file] = result;
        }
        return {
            isRunning: service.isRunning,
            results
        };
    }),

    start: publicProcedure.mutation(async () => {
        await getMcpServer().autoTestService.start();
        return { success: true };
    }),

    stop: publicProcedure.mutation(() => {
        getMcpServer().autoTestService.stop();
        return { success: true };
    }),

    run: publicProcedure.input(z.object({
        filePath: z.string()
    })).mutation(async ({ input }) => {
        const service = getMcpServer().autoTestService;
        // Manually trigger test runner
        // @ts-ignore - method existence check
        const testFile = service.findTestFile?.(input.filePath);
        if (testFile) {
            // @ts-ignore
            service.runTest?.(testFile);
            return { success: true, testFile };
        }
        return { success: false, error: 'No test file found' };
    }),

    results: publicProcedure.query(() => {
        const service = getMcpServer().autoTestService;
        const results: Array<{ file: string; status: string; timestamp: number; output?: string }> = [];
        for (const [file, result] of service.testResults.entries()) {
            results.push({ file, ...result });
        }
        return results.sort((a, b) => b.timestamp - a.timestamp);
    }),
});
