import { describe, expect, it, vi } from 'vitest';

import {
    createCompatibleAgentRunner,
    executeCompatibleImportConfig,
    executeCompatibleRunCode,
    executeCompatibleRunAgent,
    executeCompatibleRunPython,
    executeCompatibleSearchMemory,
    executeCompatibleSaveMemory,
    executeCompatibleSaveScript,
} from '../../src/mcp/compatibilityToolRuntime.ts';

describe('compatibilityToolRuntime', () => {
    it('runs compatible agents through a shared delegated tool path and preserves policyId', async () => {
        const runAgent = vi.fn(async (_task, toolCallback: (toolName: string, toolArgs: unknown, meta?: Record<string, unknown>) => Promise<unknown>) => ({
            analysis: 'Inspect the tool sets.',
            toolResult: await toolCallback('toolset_list', {}, { original: true }),
            final: 'Done.',
        }));
        const delegatedToolCaller = vi.fn().mockResolvedValue({ listed: true });

        const result = await executeCompatibleRunAgent(
            {
                task: 'inspect available tool sets',
                policyId: 'policy-123',
            },
            { runAgent },
            delegatedToolCaller,
            'runner unavailable',
        );

        expect(runAgent).toHaveBeenCalledWith(
            'inspect available tool sets',
            expect.any(Function),
            'policy-123',
        );
        expect(delegatedToolCaller).toHaveBeenCalledWith('toolset_list', {}, { original: true, policyId: 'policy-123' });
        expect(result).toEqual({
            isError: false,
            content: [{
                type: 'text',
                text: JSON.stringify({
                    analysis: 'Inspect the tool sets.',
                    toolResult: { listed: true },
                    final: 'Done.',
                }, null, 2),
            }],
        });
    });

    it('blocks recursive agent calls from the shared compatibility helper', async () => {
        const result = await executeCompatibleRunAgent(
            { task: 'recurse' },
            {
                runAgent: async (_task, toolCallback) => {
                    await toolCallback('run_agent', { task: 'nested' });
                    return { unreachable: true };
                },
            },
            vi.fn(),
            'runner unavailable',
        );

        expect(result.isError).toBe(true);
        const [content] = result.content;
        expect(content.type).toBe('text');
        if (content.type === 'text') {
            expect(content.text).toContain('Recursive agent calls restricted.');
        }
    });

    it('builds a shared agent runner that parses fenced JSON and optionally forwards policy metadata', async () => {
        const llm = {
            modelSelector: {
                selectModel: vi.fn().mockResolvedValue({ provider: 'openai', modelId: 'gpt-test' }),
            },
            generateText: vi.fn().mockResolvedValue({
                content: '```json\n{"analysis":"Need a tool.","tool":{"name":"toolset_list","arguments":null},"final":"Done."}\n```',
            }),
        };
        const runner = createCompatibleAgentRunner(llm, { includePolicyIdInToolMeta: true });
        const toolCallback = vi.fn().mockResolvedValue({ listed: true });

        const result = await runner.runAgent('inspect tool sets', toolCallback, 'policy-123');

        expect(toolCallback).toHaveBeenCalledWith('toolset_list', {}, { policyId: 'policy-123' });
        expect(result).toEqual({
            analysis: 'Need a tool.',
            toolResult: { listed: true },
            final: 'Done.',
            rawModelOutput: '```json\n{"analysis":"Need a tool.","tool":{"name":"toolset_list","arguments":null},"final":"Done."}\n```',
        });
    });

    it('stores memory using the shared compatibility helper', async () => {
        const add = vi.fn().mockResolvedValue({ id: 'mem-1' });
        const search = vi.fn();

        const result = await executeCompatibleSaveMemory(
            { content: 'remember this', type: 'working' },
            { add, search },
            { source: 'tool_call', sessionId: 'session-1' },
        );

        expect(add).toHaveBeenCalledWith('remember this', 'working', 'agent', { source: 'tool_call', sessionId: 'session-1' });
        expect(result).toEqual({
            isError: false,
            content: [{ type: 'text', text: 'Memory saved (working).' }],
        });
    });

    it('returns an unavailable error when save_memory has no memory service', async () => {
        const result = await executeCompatibleSaveMemory(
            { content: 'remember this' },
            undefined,
        );

        expect(result).toEqual({
            isError: true,
            content: [{ type: 'text', text: 'Memory service not available.' }],
        });
    });

    it('runs python through the shared compatibility helper for string executors and structured executors', async () => {
        const stringResult = await executeCompatibleRunPython(
            { code: 'print("hello")' },
            { execute: vi.fn().mockResolvedValue('hello\n') },
        );

        expect(stringResult).toEqual({
            isError: false,
            content: [{ type: 'text', text: 'hello\n' }],
        });

        const structuredResult = await executeCompatibleRunPython(
            { code: 'print("hello")' },
            { execute: vi.fn().mockResolvedValue({ output: '', error: 'boom' }) },
        );

        expect(structuredResult).toEqual({
            isError: true,
            content: [{ type: 'text', text: 'Execution failed: boom' }],
        });
    });

    it('runs code through the shared compatibility helper with lifecycle hooks', async () => {
        const enable = vi.fn();
        const disable = vi.fn();
        const execute = vi.fn().mockResolvedValue({ success: true, result: 42 });

        const result = await executeCompatibleRunCode(
            { code: 'return 42;', context: { foo: 'bar' } },
            { execute },
            {
                beforeExecute: () => {
                    enable();
                    return () => {
                        disable();
                    };
                },
                isExecutionError: (value) => typeof value === 'object' && value !== null && 'success' in value && (value as { success?: unknown }).success === false,
            },
        );

        expect(enable).toHaveBeenCalled();
        expect(execute).toHaveBeenCalledWith({ code: 'return 42;', context: { foo: 'bar' } });
        expect(disable).toHaveBeenCalled();
        expect(result).toEqual({
            isError: false,
            content: [{ type: 'text', text: JSON.stringify({ success: true, result: 42 }, null, 2) }],
        });
    });

    it('supports custom run_code error formatting', async () => {
        const result = await executeCompatibleRunCode(
            { code: 'raise boom' },
            { execute: vi.fn().mockRejectedValue(new Error('boom')) },
            {
                formatError: (error) => ({
                    isError: true,
                    content: [{ type: 'text', text: `Custom: ${error instanceof Error ? error.message : String(error)}` }],
                }),
            },
        );

        expect(result).toEqual({
            isError: true,
            content: [{ type: 'text', text: 'Custom: boom' }],
        });
    });

    it('searches memory using the shared compatibility helper', async () => {
        const add = vi.fn();
        const search = vi.fn().mockResolvedValue([{ id: 'mem-1', content: 'remember this' }]);

        const result = await executeCompatibleSearchMemory(
            { query: 'remember', limit: 3 },
            { add, search },
        );

        expect(search).toHaveBeenCalledWith('remember', { limit: 3 });
        expect(result).toEqual({
            isError: false,
            content: [{
                type: 'text',
                text: JSON.stringify([{ id: 'mem-1', content: 'remember this' }], null, 2),
            }],
        });
    });

    it('returns an unavailable error when search_memory has no memory service', async () => {
        const result = await executeCompatibleSearchMemory(
            { query: 'remember' },
            undefined,
        );

        expect(result).toEqual({
            isError: true,
            content: [{ type: 'text', text: 'Memory service not available.' }],
        });
    });

    it('saves scripts using the shared compatibility helper', async () => {
        const saveScript = vi.fn().mockResolvedValue(undefined);

        const result = await executeCompatibleSaveScript(
            { name: 'cleanup', code: 'print("cleanup")', description: 'Cleanup script' },
            { saveScript },
        );

        expect(saveScript).toHaveBeenCalledWith({
            name: 'cleanup',
            code: 'print("cleanup")',
            description: 'Cleanup script',
        });
        expect(result).toEqual({
            isError: false,
            content: [{ type: 'text', text: "Script 'cleanup' saved successfully." }],
        });
    });

    it('returns a tool error when saving scripts fails in the shared compatibility helper', async () => {
        const saveScript = vi.fn().mockRejectedValue(new Error('disk full'));

        const result = await executeCompatibleSaveScript(
            { name: 'cleanup', code: 'print("cleanup")' },
            { saveScript },
        );

        expect(result).toEqual({
            isError: true,
            content: [{ type: 'text', text: 'Failed to save script: disk full' }],
        });
    });

    it('imports config using the shared compatibility helper', async () => {
        const importClaudeConfig = vi.fn().mockResolvedValue({ imported: 2, skipped: ['bad-server'] });

        const result = await executeCompatibleImportConfig(
            { configJson: '{"mcpServers":{}}' },
            { importClaudeConfig },
            'import unavailable',
        );

        expect(importClaudeConfig).toHaveBeenCalledWith('{"mcpServers":{}}');
        expect(result).toEqual({
            isError: false,
            content: [{ type: 'text', text: 'Import completed.\nSuccessful: 2\nSkipped: bad-server' }],
        });
    });

    it('returns unavailable error when config import service is missing', async () => {
        const result = await executeCompatibleImportConfig(
            { configJson: '{"mcpServers":{}}' },
            undefined,
            'import unavailable',
        );

        expect(result).toEqual({
            isError: true,
            content: [{ type: 'text', text: 'import unavailable' }],
        });
    });
});
