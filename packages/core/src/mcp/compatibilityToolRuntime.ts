import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { SavedScriptConfig } from '../interfaces/IConfigProvider.js';

interface AgentRunnerLike {
    runAgent(
        task: string,
        toolCallback: (toolName: string, toolArgs: unknown, meta?: Record<string, unknown>) => Promise<unknown>,
        policyId?: string,
    ): Promise<unknown>;
}

interface AgentMemoryServiceLike {
    add(
        content: string,
        type: 'session' | 'working' | 'long_term',
        namespace: 'user' | 'agent' | 'project',
        metadata?: Record<string, unknown>,
    ): Promise<unknown>;
    search(query: string, options?: { limit?: number }): Promise<unknown>;
}

interface SavedScriptStoreLike {
    saveScript(script: SavedScriptConfig): Promise<void>;
}

interface ConfigImportServiceLike {
    importClaudeConfig(configJson: string): Promise<{ imported: number; skipped: string[] }>;
}

interface PythonExecutorLike {
    execute(code: string): Promise<{ output: string; error?: string | null } | string>;
}

interface RunCodeExecutorLike {
    execute(input: { code: string; context: Record<string, unknown> }): Promise<unknown>;
}

interface RunCodeOptions {
    beforeExecute?: () => void | (() => void | Promise<void>) | Promise<void | (() => void | Promise<void>)>;
    isExecutionError?: (result: unknown) => boolean;
    formatError?: (error: unknown) => CallToolResult;
}

export interface CompatibleLlmServiceLike {
    modelSelector: {
        selectModel(input: { taskComplexity: 'medium' }): Promise<{ provider: string; modelId: string }>;
    };
    generateText(
        provider: string,
        modelId: string,
        systemPrompt: string,
        prompt: string,
    ): Promise<{ content?: string | null }>;
}

type CompatibilityToolDelegate = (
    toolName: string,
    toolArgs: Record<string, unknown>,
    meta?: Record<string, unknown>,
) => Promise<unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeToolArgs(value: unknown): Record<string, unknown> {
    return isRecord(value) ? value : {};
}

export async function executeCompatibleRunCode(
    args: Record<string, unknown>,
    executor: RunCodeExecutorLike,
    options: RunCodeOptions = {},
): Promise<CallToolResult> {
    const code = typeof args.code === 'string' ? args.code : '';
    const context = isRecord(args.context) ? args.context : {};
    const cleanup = await options.beforeExecute?.();

    try {
        const execResult = await executor.execute({ code, context });
        const success = !(options.isExecutionError?.(execResult) ?? false);

        return {
            content: [{ type: 'text', text: JSON.stringify(execResult, null, 2) }],
            isError: !success,
        };
    } catch (error) {
        if (options.formatError) {
            return options.formatError(error);
        }

        return {
            isError: true,
            content: [{ type: 'text', text: `Code execution error: ${error instanceof Error ? error.message : String(error)}` }],
        };
    } finally {
        if (typeof cleanup === 'function') {
            await cleanup();
        }
    }
}

export function createCompatibleAgentRunner(
    llm: CompatibleLlmServiceLike,
    options: { includePolicyIdInToolMeta?: boolean } = {},
): AgentRunnerLike {
    const includePolicyIdInToolMeta = options.includePolicyIdInToolMeta ?? false;

    return {
        runAgent: async (task, toolCallback, policyId) => {
            const model = await llm.modelSelector.selectModel({ taskComplexity: 'medium' });
            const prompt = `You are an autonomous tool-using assistant.\nTask: ${task}\n\nReturn JSON only:\n{\n  "analysis": "short plan",\n  "tool": { "name": "optional_tool_name", "arguments": {} },\n  "final": "final response"\n}`;
            const response = await llm.generateText(
                model.provider,
                model.modelId,
                'You are a precise JSON-only planner. Use a tool only when required.',
                prompt,
            );

            const raw = response.content?.trim() ?? '{}';
            let parsed: {
                analysis?: string;
                tool?: { name?: string; arguments?: unknown };
                final?: string;
            };

            try {
                parsed = JSON.parse(raw);
            } catch {
                const fenced = raw.match(/```json\s*([\s\S]*?)```/i)?.[1];
                parsed = fenced ? JSON.parse(fenced) : { final: raw };
            }

            let toolResult: unknown = null;
            if (parsed.tool?.name) {
                const callMeta = includePolicyIdInToolMeta && policyId ? { policyId } : {};
                toolResult = await toolCallback(parsed.tool.name, normalizeToolArgs(parsed.tool.arguments), callMeta);
            }

            return {
                analysis: parsed.analysis ?? 'No analysis provided.',
                toolResult,
                final: parsed.final ?? 'Task processed.',
                rawModelOutput: raw,
            };
        },
    };
}

export async function executeCompatibleRunAgent(
    args: Record<string, unknown>,
    agentRunner: AgentRunnerLike | undefined,
    delegatedToolCaller: CompatibilityToolDelegate | undefined,
    unavailableMessage: string,
): Promise<CallToolResult> {
    if (!agentRunner || !delegatedToolCaller) {
        return {
            isError: true,
            content: [{ type: 'text', text: unavailableMessage }],
        };
    }

    const task = typeof args.task === 'string' ? args.task : '';
    const policyId = typeof args.policyId === 'string' ? args.policyId : undefined;

    try {
        const result = await agentRunner.runAgent(
            task,
            async (toolName, toolArgs, meta) => {
                if (toolName === 'run_code' || toolName === 'run_agent') {
                    throw new Error('Recursive agent calls restricted.');
                }

                const callMeta = policyId ? { ...meta, policyId } : meta;
                return await delegatedToolCaller(toolName, normalizeToolArgs(toolArgs), callMeta);
            },
            policyId,
        );

        return {
            isError: false,
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const name = error instanceof Error ? error.name : 'Error';
        const stack = error instanceof Error ? error.stack : undefined;
        return {
            isError: true,
            content: [{
                type: 'text',
                text: `Agent Error: ${message}\nName: ${name}${stack ? `\nStack: ${stack}` : ''}`,
            }],
        };
    }
}

export async function executeCompatibleSaveMemory(
    args: Record<string, unknown>,
    agentMemoryService: AgentMemoryServiceLike | undefined,
    metadata: Record<string, unknown> = { source: 'tool_call' },
    unavailableMessage = 'Memory service not available.',
): Promise<CallToolResult> {
    if (!agentMemoryService) {
        return {
            isError: true,
            content: [{ type: 'text', text: unavailableMessage }],
        };
    }

    const content = typeof args.content === 'string' ? args.content : '';
    const type = args.type === 'working' ? 'working' : 'long_term';

    await agentMemoryService.add(content, type, 'agent', metadata);
    return {
        isError: false,
        content: [{ type: 'text', text: `Memory saved (${type}).` }],
    };
}

export async function executeCompatibleSearchMemory(
    args: Record<string, unknown>,
    agentMemoryService: AgentMemoryServiceLike | undefined,
    unavailableMessage = 'Memory service not available.',
): Promise<CallToolResult> {
    if (!agentMemoryService) {
        return {
            isError: true,
            content: [{ type: 'text', text: unavailableMessage }],
        };
    }

    const query = typeof args.query === 'string' ? args.query : '';
    const limit = typeof args.limit === 'number' ? args.limit : 5;
    const results = await agentMemoryService.search(query, { limit });

    return {
        isError: false,
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
    };
}

export async function executeCompatibleSaveScript(
    args: Record<string, unknown>,
    savedScriptStore: SavedScriptStoreLike,
): Promise<CallToolResult> {
    const script: SavedScriptConfig = {
        name: typeof args.name === 'string' ? args.name : '',
        code: typeof args.code === 'string' ? args.code : '',
        description: typeof args.description === 'string' ? args.description : null,
    };

    try {
        await savedScriptStore.saveScript(script);
        return {
            isError: false,
            content: [{ type: 'text', text: `Script '${script.name}' saved successfully.` }],
        };
    } catch (error) {
        return {
            isError: true,
            content: [{ type: 'text', text: `Failed to save script: ${error instanceof Error ? error.message : String(error)}` }],
        };
    }
}

export async function executeCompatibleImportConfig(
    args: Record<string, unknown>,
    configImportService: ConfigImportServiceLike | undefined,
    unavailableMessage: string,
): Promise<CallToolResult> {
    if (!configImportService) {
        return {
            isError: true,
            content: [{ type: 'text', text: unavailableMessage }],
        };
    }

    const configJson = typeof args.configJson === 'string' ? args.configJson : '';
    try {
        const result = await configImportService.importClaudeConfig(configJson);
        return {
            isError: false,
            content: [{ type: 'text', text: `Imported ${result.imported} servers. Skipped: ${JSON.stringify(result.skipped)}` }],
        };
    } catch (error) {
        return {
            isError: true,
            content: [{ type: 'text', text: `Import failed: ${error instanceof Error ? error.message : String(error)}` }],
        };
    }
}

export async function executeCompatibleRunPython(
    args: Record<string, unknown>,
    pythonExecutor: PythonExecutorLike,
): Promise<CallToolResult> {
    const code = typeof args.code === 'string' ? args.code : '';

    try {
        const result = await pythonExecutor.execute(code);
        if (typeof result === 'string') {
            return {
                isError: false,
                content: [{ type: 'text', text: result }],
            };
        }

        const isError = typeof result.error === 'string' && result.error.length > 0;
        return {
            isError,
            content: [{ type: 'text', text: isError ? `Execution failed: ${result.error}` : result.output }],
        };
    } catch (error) {
        return {
            isError: true,
            content: [{ type: 'text', text: `Execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        };
    }
}
