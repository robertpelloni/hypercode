import { beforeEach, describe, expect, it, vi } from 'vitest';

const executeCodeMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/services/CodeExecutorService.js', () => ({
    codeExecutorService: {
        executeCode: executeCodeMock,
    },
}));

import { executeSavedScriptTool, listSavedScriptTools } from '../../src/mcp/savedScriptExecution.ts';

describe('executeSavedScriptTool', () => {
    beforeEach(() => {
        executeCodeMock.mockReset();
    });

    it('lists saved scripts as reusable tools through the shared helper', async () => {
        const tools = await listSavedScriptTools(
            {
                loadScripts: vi.fn().mockResolvedValue([
                    { name: 'cleanup', code: 'print("cleanup")', description: 'Cleanup script' },
                ]),
            },
            (script) => script.description ?? `Run saved script '${script.name}'.`,
        );

        expect(tools).toEqual([
            {
                name: 'script__cleanup',
                description: 'Cleanup script',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
        ]);
    });

    it('returns null when the requested saved script does not exist', async () => {
        const result = await executeSavedScriptTool('script__missing', {
            loadScripts: vi.fn().mockResolvedValue([]),
        });

        expect(result).toBeNull();
        expect(executeCodeMock).not.toHaveBeenCalled();
    });

    it('executes an existing saved script and returns plain text output', async () => {
        executeCodeMock.mockResolvedValueOnce('hello from saved script');

        const result = await executeSavedScriptTool('script__cleanup', {
            loadScripts: vi.fn().mockResolvedValue([
                { name: 'cleanup', code: 'print("cleanup")', description: 'Cleanup script' },
            ]),
        });

        expect(executeCodeMock).toHaveBeenCalledWith('print("cleanup")', undefined);
        expect(result).toEqual({
            isError: false,
            content: [{ type: 'text', text: 'hello from saved script' }],
        });
    });

    it('passes a delegate callback through to the executor for future tool-aware script support', async () => {
        const delegate = vi.fn().mockResolvedValue({ ok: true });
        executeCodeMock.mockImplementationOnce(async (_code, toolHandler) => {
            await toolHandler?.('search_tools', { query: 'github' });
            return 'delegated';
        });

        const result = await executeSavedScriptTool(
            'script__cleanup',
            {
                loadScripts: vi.fn().mockResolvedValue([
                    { name: 'cleanup', code: 'print("cleanup")', description: 'Cleanup script' },
                ]),
            },
            { policyId: 'policy-1' },
            delegate,
        );

        expect(delegate).toHaveBeenCalledWith('search_tools', { query: 'github' }, { policyId: 'policy-1' });
        expect(result).toEqual({
            isError: false,
            content: [{ type: 'text', text: 'delegated' }],
        });
    });
});