import { describe, expect, it, vi } from 'vitest';

const executeCodeMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/services/CodeExecutorService.js', () => ({
    codeExecutorService: {
        executeCode: executeCodeMock,
    },
}));

import { createDirectModeAgentRunner, getDirectModeCompatibilityTools, getDirectModeMetadataGuardResult, getDirectModeSavedScriptTools, tryHandleDirectModeCompatibilityTool } from '../../src/mcp/directModeCompatibility.ts';

function createNativeSessionStub(overrides: Partial<{
    getLoadedToolNames: () => string[];
    hasTool: (name: string) => boolean;
    loadToolIntoSession: (name: string) => { loaded: boolean; evicted: string[] };
}> = {}) {
    return {
        getLoadedToolNames: overrides.getLoadedToolNames ?? (() => []),
        hasTool: overrides.hasTool ?? (() => false),
        loadToolIntoSession: overrides.loadToolIntoSession ?? (() => ({ loaded: false, evicted: [] })),
    };
}

function createToolSetStore(overrides: Partial<{
    loadToolSets: () => Promise<Array<{ name: string; description?: string | null; tools: string[] }>>;
    saveToolSet: (toolSet: { name: string; description?: string | null; tools: string[] }) => Promise<void>;
}> = {}) {
    return {
        loadToolSets: overrides.loadToolSets ?? vi.fn().mockResolvedValue([]),
        saveToolSet: overrides.saveToolSet ?? vi.fn().mockResolvedValue(undefined),
    };
}

describe('directModeCompatibility', () => {
    it('advertises MetaMCP-compatible direct-mode aliases in HyperCode', () => {
        expect(getDirectModeCompatibilityTools()).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'run_code' }),
            expect.objectContaining({ name: 'run_python' }),
            expect.objectContaining({ name: 'run_agent' }),
            expect.objectContaining({ name: 'save_memory' }),
            expect.objectContaining({ name: 'search_memory' }),
            expect.objectContaining({ name: 'save_script' }),
            expect.objectContaining({ name: 'save_tool_set' }),
            expect.objectContaining({ name: 'load_tool_set' }),
            expect.objectContaining({ name: 'toolset_list' }),
            expect.objectContaining({ name: 'import_mcp_config' }),
        ]));
    });

    it('surfaces saved scripts as direct-mode script tools', async () => {
        const tools = await getDirectModeSavedScriptTools({
            loadScripts: vi.fn().mockResolvedValue([
                { name: 'cleanup', code: 'print(1)', description: 'Cleanup script' },
            ]),
            saveScript: vi.fn(),
        });

        expect(tools).toEqual([
            expect.objectContaining({
                name: 'script__cleanup',
                description: 'Cleanup script',
            }),
        ]);
    });

    it('temporarily enables code mode to execute run_code and restores the previous state', async () => {
        const enable = vi.fn();
        const disable = vi.fn();
        const executeCode = vi.fn().mockResolvedValue({
            success: true,
            result: 'Executed',
            executionTime: 4,
            toolsCalled: ['echo'],
        });

        const result = await tryHandleDirectModeCompatibilityTool('run_code', {
            code: 'return 1;',
            context: { repo: 'hypercode' },
        }, {
            enable,
            disable,
            executeCode,
            isEnabled: () => false,
        }, {
            execute: vi.fn(),
        }, {
            add: vi.fn(),
        }, {
            loadScripts: vi.fn(),
            saveScript: vi.fn(),
        }, createToolSetStore(), createNativeSessionStub(), undefined, undefined, undefined);

        expect(enable).toHaveBeenCalledTimes(1);
        expect(executeCode).toHaveBeenCalledWith('return 1;', { repo: 'hypercode' });
        expect(disable).toHaveBeenCalledTimes(1);
        expect(result?.isError).toBe(false);
        expect(JSON.parse(result!.content[0].text)).toEqual(expect.objectContaining({
            success: true,
            result: 'Executed',
        }));
    });

    it('returns null for unknown compatibility tools', async () => {
        const result = await tryHandleDirectModeCompatibilityTool('unknown_tool', {}, {
            enable: vi.fn(),
            disable: vi.fn(),
            executeCode: vi.fn(),
            isEnabled: () => false,
        }, {
            execute: vi.fn(),
        }, {
            add: vi.fn(),
        }, {
            loadScripts: vi.fn(),
            saveScript: vi.fn(),
        }, createToolSetStore(), createNativeSessionStub(), undefined, undefined, undefined);

        expect(result).toBeNull();
    });

    it('runs run_agent through the HyperCode-native autonomous agent compatibility path', async () => {
        const runAgent = vi.fn(async (_task, toolCallback: (toolName: string, toolArgs: unknown, meta?: Record<string, unknown>) => Promise<unknown>) => ({
            analysis: 'Inspect the loaded tools first.',
            toolResult: await toolCallback('toolset_list', {}, { policyId: 'policy-123' }),
            final: 'Done.',
            rawModelOutput: '{"analysis":"Inspect the loaded tools first.","tool":{"name":"toolset_list","arguments":{}},"final":"Done."}',
        }));
        const delegatedToolCaller = vi.fn().mockResolvedValue({ ok: true });

        const result = await tryHandleDirectModeCompatibilityTool('run_agent', {
            task: 'inspect available tool sets',
            policyId: 'policy-123',
        }, {
            enable: vi.fn(),
            disable: vi.fn(),
            executeCode: vi.fn(),
            isEnabled: () => false,
        }, {
            execute: vi.fn(),
        }, {
            add: vi.fn(),
        }, {
            loadScripts: vi.fn(),
            saveScript: vi.fn(),
        }, createToolSetStore(), createNativeSessionStub(), { runAgent }, delegatedToolCaller, undefined);

        expect(runAgent).toHaveBeenCalledWith(
            'inspect available tool sets',
            expect.any(Function),
            'policy-123',
        );
        expect(delegatedToolCaller).toHaveBeenCalledWith('toolset_list', {}, { policyId: 'policy-123' });
        expect(result).toEqual({
            isError: false,
            content: [{
                type: 'text',
                text: JSON.stringify({
                    analysis: 'Inspect the loaded tools first.',
                    toolResult: { ok: true },
                    final: 'Done.',
                    rawModelOutput: '{"analysis":"Inspect the loaded tools first.","tool":{"name":"toolset_list","arguments":{}},"final":"Done."}',
                }, null, 2),
            }],
        });
    });

    it('blocks recursive run_agent tool calls from within the autonomous agent loop', async () => {
        const runAgent = vi.fn(async (_task, toolCallback: (toolName: string, toolArgs: unknown) => Promise<unknown>) => {
            await toolCallback('run_agent', { task: 'nested' });
            return { analysis: 'should not reach', final: 'should not reach' };
        });

        const result = await tryHandleDirectModeCompatibilityTool('run_agent', {
            task: 'attempt recursion',
        }, {
            enable: vi.fn(),
            disable: vi.fn(),
            executeCode: vi.fn(),
            isEnabled: () => false,
        }, {
            execute: vi.fn(),
        }, {
            add: vi.fn(),
        }, {
            loadScripts: vi.fn(),
            saveScript: vi.fn(),
        }, createToolSetStore(), createNativeSessionStub(), { runAgent }, vi.fn(), undefined);

        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Recursive agent calls restricted.');
    });

    it('builds a native direct-mode agent runner from HyperCode llm service', async () => {
        const runner = createDirectModeAgentRunner({
            modelSelector: {
                selectModel: vi.fn().mockResolvedValue({ provider: 'openai', modelId: 'gpt-test' }),
            },
            generateText: vi.fn().mockResolvedValue({
                content: '{"analysis":"Need a tool.","tool":{"name":"toolset_list","arguments":{}},"final":"Done."}',
            }),
        });
        const toolCallback = vi.fn().mockResolvedValue({ listed: true });

        const result = await runner.runAgent('inspect tool sets', toolCallback, 'policy-123');

        expect(toolCallback).toHaveBeenCalledWith('toolset_list', {}, { policyId: 'policy-123' });
        expect(result).toEqual({
            analysis: 'Need a tool.',
            toolResult: { listed: true },
            final: 'Done.',
            rawModelOutput: '{"analysis":"Need a tool.","tool":{"name":"toolset_list","arguments":{}},"final":"Done."}',
        });
    });

    it('returns an error result when direct-mode metadata restricts a tool outside allowedTools', () => {
        expect(getDirectModeMetadataGuardResult('run_code', {
            allowedTools: ['search_tools', 'toolset_list'],
        })).toEqual({
            isError: true,
            content: [{
                type: 'text',
                text: "Access denied: Tool 'run_code' is not in the allowed tools list for this agent.",
            }],
        });

        expect(getDirectModeMetadataGuardResult('search_tools', {
            allowedTools: ['search_tools', 'toolset_list'],
        })).toBeNull();
    });

    it('routes run_python through the HyperCode sandbox compatibility path', async () => {
        const execute = vi.fn().mockResolvedValue({ output: 'hello from python' });

        const result = await tryHandleDirectModeCompatibilityTool('run_python', {
            code: 'print("hello from python")',
        }, {
            enable: vi.fn(),
            disable: vi.fn(),
            executeCode: vi.fn(),
            isEnabled: () => false,
        }, {
            execute,
        }, {
            add: vi.fn(),
        }, {
            loadScripts: vi.fn(),
            saveScript: vi.fn(),
        }, createToolSetStore(), createNativeSessionStub(), undefined, undefined, undefined);

        expect(execute).toHaveBeenCalledWith('python', 'print("hello from python")');
        expect(result).toEqual({
            isError: false,
            content: [{ type: 'text', text: 'hello from python' }],
        });
    });

    it('imports MCP config through the HyperCode native config import service', async () => {
        const importClaudeConfig = vi.fn().mockResolvedValue({ imported: 2, skipped: ['bad-server'] });

        const result = await tryHandleDirectModeCompatibilityTool('import_mcp_config', {
            configJson: '{"mcpServers":{"github":{"command":"node","args":["server.js"]}}}',
        }, {
            enable: vi.fn(),
            disable: vi.fn(),
            executeCode: vi.fn(),
            isEnabled: () => false,
        }, {
            execute: vi.fn(),
        }, {
            add: vi.fn(),
        }, {
            loadScripts: vi.fn(),
            saveScript: vi.fn(),
        }, createToolSetStore(), createNativeSessionStub(), undefined, undefined, { importClaudeConfig });

        expect(importClaudeConfig).toHaveBeenCalledWith('{"mcpServers":{"github":{"command":"node","args":["server.js"]}}}');
        expect(result).toEqual({
            isError: false,
            content: [{ type: 'text', text: 'Import completed.\nSuccessful: 2\nSkipped: bad-server' }],
        });
    });

    it('routes save_memory through HyperCode native agent memory storage', async () => {
        const add = vi.fn().mockResolvedValue({ id: 'mem-1' });

        const result = await tryHandleDirectModeCompatibilityTool('save_memory', {
            content: 'remember this',
            type: 'working',
        }, {
            enable: vi.fn(),
            disable: vi.fn(),
            executeCode: vi.fn(),
            isEnabled: () => false,
        }, {
            execute: vi.fn(),
        }, {
            add,
            search: vi.fn(),
        }, {
            loadScripts: vi.fn(),
            saveScript: vi.fn(),
        }, createToolSetStore(), createNativeSessionStub(), undefined, undefined, undefined);

        expect(add).toHaveBeenCalledWith('remember this', 'working', 'agent', { source: 'tool_call' });
        expect(result).toEqual({
            isError: false,
            content: [{ type: 'text', text: 'Memory saved (working).' }],
        });
    });

    it('routes search_memory through HyperCode native agent memory search', async () => {
        const search = vi.fn().mockResolvedValue([{ id: 'mem-1', content: 'remember this' }]);

        const result = await tryHandleDirectModeCompatibilityTool('search_memory', {
            query: 'remember',
            limit: 3,
        }, {
            enable: vi.fn(),
            disable: vi.fn(),
            executeCode: vi.fn(),
            isEnabled: () => false,
        }, {
            execute: vi.fn(),
        }, {
            add: vi.fn(),
            search,
        }, {
            loadScripts: vi.fn(),
            saveScript: vi.fn(),
        }, createToolSetStore(), createNativeSessionStub(), undefined, undefined, undefined);

        expect(search).toHaveBeenCalledWith('remember', { limit: 3 });
        expect(result).toEqual({
            isError: false,
            content: [{
                type: 'text',
                text: JSON.stringify([{ id: 'mem-1', content: 'remember this' }], null, 2),
            }],
        });
    });

    it('saves scripts through HyperCode managed config storage', async () => {
        const saveScript = vi.fn().mockResolvedValue(undefined);

        const result = await tryHandleDirectModeCompatibilityTool('save_script', {
            name: 'cleanup',
            code: 'print("cleanup")',
            description: 'Cleanup script',
        }, {
            enable: vi.fn(),
            disable: vi.fn(),
            executeCode: vi.fn(),
            isEnabled: () => false,
        }, {
            execute: vi.fn(),
        }, {
            add: vi.fn(),
        }, {
            loadScripts: vi.fn(),
            saveScript,
        }, createToolSetStore(), createNativeSessionStub(), undefined, undefined);

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

    it('saves tool sets from the current HyperCode session working set', async () => {
        const saveToolSet = vi.fn().mockResolvedValue(undefined);
        const toolSetStore = createToolSetStore({ saveToolSet });

        const result = await tryHandleDirectModeCompatibilityTool('save_tool_set', {
            name: 'web_dev',
            description: 'Web tools',
        }, {
            enable: vi.fn(),
            disable: vi.fn(),
            executeCode: vi.fn(),
            isEnabled: () => false,
        }, {
            execute: vi.fn(),
        }, {
            add: vi.fn(),
        }, {
            loadScripts: vi.fn(),
            saveScript: vi.fn(),
        }, toolSetStore, createNativeSessionStub({
            getLoadedToolNames: () => ['github__create_issue', 'filesystem__read_file'],
        }), undefined, undefined, undefined);

        expect(saveToolSet).toHaveBeenCalledWith({
            name: 'web_dev',
            description: 'Web tools',
            tools: ['github__create_issue', 'filesystem__read_file'],
        });
        expect(result).toEqual({
            isError: false,
            content: [{ type: 'text', text: "Tool Set 'web_dev' saved with 2 tools." }],
        });
    });

    it('loads saved tool sets into the current HyperCode session working set', async () => {
        const loadToolIntoSession = vi.fn(() => ({ loaded: true, evicted: [] }));
        const toolSetStore = createToolSetStore({
            loadToolSets: vi.fn().mockResolvedValue([
                {
                    name: 'web_dev',
                    description: 'Web tools',
                    tools: ['github__create_issue', 'filesystem__read_file', 'missing__tool'],
                },
            ]),
        });

        const result = await tryHandleDirectModeCompatibilityTool('load_tool_set', {
            name: 'web_dev',
        }, {
            enable: vi.fn(),
            disable: vi.fn(),
            executeCode: vi.fn(),
            isEnabled: () => false,
        }, {
            execute: vi.fn(),
        }, {
            add: vi.fn(),
        }, {
            loadScripts: vi.fn(),
            saveScript: vi.fn(),
        }, toolSetStore, createNativeSessionStub({
            hasTool: (name) => name !== 'missing__tool',
            loadToolIntoSession,
        }), undefined, undefined, undefined);

        expect(loadToolIntoSession).toHaveBeenCalledWith('github__create_issue');
        expect(loadToolIntoSession).toHaveBeenCalledWith('filesystem__read_file');
        expect(result).toEqual({
            isError: false,
            content: [{
                type: 'text',
                text: "Loaded 2 tools from set 'web_dev'. Warning: 1 tools could not be found (might be offline): missing__tool",
            }],
        });
    });

    it('lists saved HyperCode-managed tool sets', async () => {
        const toolSetStore = createToolSetStore({
            loadToolSets: vi.fn().mockResolvedValue([
                {
                    name: 'web_dev',
                    description: 'Web tools',
                    tools: ['github__create_issue', 'filesystem__read_file'],
                },
            ]),
        });

        const result = await tryHandleDirectModeCompatibilityTool('toolset_list', {}, {
            enable: vi.fn(),
            disable: vi.fn(),
            executeCode: vi.fn(),
            isEnabled: () => false,
        }, {
            execute: vi.fn(),
        }, {
            add: vi.fn(),
        }, {
            loadScripts: vi.fn(),
            saveScript: vi.fn(),
        }, toolSetStore, createNativeSessionStub(), undefined, undefined, undefined);

        expect(result).toEqual({
            isError: false,
            content: [{
                type: 'text',
                text: JSON.stringify([
                    {
                        name: 'web_dev',
                        description: 'Web tools',
                        tools: ['github__create_issue', 'filesystem__read_file'],
                        toolCount: 2,
                    },
                ], null, 2),
            }],
        });
    });

    it('executes saved script tools through the HyperCode sandbox path', async () => {
        executeCodeMock.mockResolvedValueOnce('script output');

        const result = await tryHandleDirectModeCompatibilityTool('script__cleanup', {}, {
            enable: vi.fn(),
            disable: vi.fn(),
            executeCode: vi.fn(),
            isEnabled: () => false,
        }, {
            execute: vi.fn(),
        }, {
            add: vi.fn(),
        }, {
            loadScripts: vi.fn().mockResolvedValue([
                { name: 'cleanup', code: 'print("cleanup")', description: 'Cleanup script' },
            ]),
            saveScript: vi.fn(),
        }, createToolSetStore(), createNativeSessionStub(), undefined, undefined, undefined);

        expect(executeCodeMock).toHaveBeenCalledWith('print("cleanup")', undefined);
        expect(result).toEqual({
            isError: false,
            content: [{ type: 'text', text: 'script output' }],
        });
    });
});