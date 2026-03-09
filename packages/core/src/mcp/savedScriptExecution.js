import { codeExecutorService } from '../services/CodeExecutorService.js';

function normalizeToolArgs(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value
        : {};
}

function formatExecutionOutput(result) {
    return typeof result === 'string'
        ? result
        : JSON.stringify(result, null, 2);
}

export async function listSavedScriptTools(store, descriptionFactory) {
    const scripts = await store.loadScripts();
    return scripts.map((script) => ({
        name: `script__${script.name}`,
        description: descriptionFactory(script),
        inputSchema: {
            type: 'object',
            properties: {},
        },
    }));
}

export async function executeSavedScriptTool(name, store, meta, delegate) {
    if (!name.startsWith('script__')) {
        return null;
    }

    const scriptName = name.replace('script__', '');
    const scripts = await store.loadScripts();
    const script = scripts.find((candidate) => candidate.name === scriptName);

    if (!script) {
        return null;
    }

    try {
        const result = await codeExecutorService.executeCode(
            script.code,
            delegate
                ? async (toolName, toolArgs) => {
                    if (toolName === 'run_code' || toolName.startsWith('script__')) {
                        throw new Error('Recursion restricted in saved scripts');
                    }

                    return await delegate(toolName, normalizeToolArgs(toolArgs), meta);
                }
                : undefined,
        );

        return {
            isError: false,
            content: [{ type: 'text', text: formatExecutionOutput(result) }],
        };
    } catch (error) {
        const errorInfo = {
            message: error instanceof Error ? error.message : String(error),
            name: error instanceof Error ? error.name : 'Error',
            stack: error instanceof Error ? error.stack : undefined,
        };

        return {
            isError: true,
            content: [{
                type: 'text',
                text: `Script Error: ${errorInfo.message}\nName: ${errorInfo.name}${errorInfo.stack ? `\nStack: ${errorInfo.stack}` : ''}`,
            }],
        };
    }
}