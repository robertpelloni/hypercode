import { describe, test, expect } from 'vitest';
import { EventEmitter } from 'events';
import { McpProxyManager } from '../src/managers/McpProxyManager.js';

type ProxyCtorArgs = ConstructorParameters<typeof McpProxyManager>;

interface PolicyServiceLike {
    evaluate(ctx: unknown): { allowed: boolean; reason?: string };
}

interface AgentDescriptor {
    name: string;
    model?: string;
    description?: string;
    instructions?: string;
}

interface AgentManagerLike {
    getAgents(): AgentDescriptor[];
}

interface AgentExecutorLike {
    run(agent: AgentDescriptor, task: string): Promise<string>;
}

class MockMcpManager extends EventEmitter {
    getClient(name: string) {
        return null;
    }
    getAllServers() {
        return [];
    }
}

class MockLogManager {
    log(_entry: unknown) {}
    calculateCost() {
        return 0;
    }
}

describe('run_task', () => {
    test('runs tool then agent step sequence', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const policyService: PolicyServiceLike = { evaluate: () => ({ allowed: true }) };

        const proxy = new McpProxyManager(
            new MockMcpManager() as unknown as ProxyCtorArgs[0],
            new MockLogManager() as unknown as ProxyCtorArgs[1],
            { policyService } as unknown as ProxyCtorArgs[2]
        );

        proxy.registerInternalTool({
            name: 'mock_echo',
            description: 'Echo',
            inputSchema: { type: 'object', properties: { message: { type: 'string' } } }
        }, async (args: Record<string, unknown>) => ({ content: [{ type: 'text', text: String(args.message) }] }));

        const agentManager: AgentManagerLike = {
            getAgents: () => [{ name: 'coder', model: 'gpt-4o', description: '', instructions: '' }]
        };

        const agentExecutor: AgentExecutorLike = {
            run: async (_agent: AgentDescriptor, task: string) => `agent:${task}`
        };

        proxy.setAgentDependencies(
            agentExecutor as unknown as Parameters<McpProxyManager['setAgentDependencies']>[0],
            agentManager as unknown as Parameters<McpProxyManager['setAgentDependencies']>[1]
        );

        await proxy.start();

        const res = await proxy.callTool('run_task', {
            steps: [
                { type: 'tool', name: 'mock_echo', args: { message: 'hi' } },
                { type: 'agent', name: 'coder', task: 'do thing', args: { foo: 'bar' } }
            ]
        });

        expect(res.isError).toBeFalsy();
        const payload = JSON.parse(res.content[0].text);
        expect(payload.results.length).toBe(2);
    });

    test('stops on error by default', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const policyService: PolicyServiceLike = { evaluate: () => ({ allowed: true }) };

        const proxy = new McpProxyManager(
            new MockMcpManager() as unknown as ProxyCtorArgs[0],
            new MockLogManager() as unknown as ProxyCtorArgs[1],
            { policyService } as unknown as ProxyCtorArgs[2]
        );

        await proxy.start();

        const res = await proxy.callTool('run_task', {
            steps: [
                { type: 'tool', name: 'run_code', args: { code: 'return 1;' } },
                { type: 'tool', name: 'mock_echo', args: { message: 'later' } }
            ]
        });

        expect(res.isError).toBeTruthy();
    });

    test('continues on error when stopOnError=false', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const policyService: PolicyServiceLike = { evaluate: () => ({ allowed: true }) };

        const proxy = new McpProxyManager(
            new MockMcpManager() as unknown as ProxyCtorArgs[0],
            new MockLogManager() as unknown as ProxyCtorArgs[1],
            { policyService } as unknown as ProxyCtorArgs[2]
        );

        proxy.registerInternalTool({
            name: 'mock_echo',
            description: 'Echo',
            inputSchema: { type: 'object', properties: { message: { type: 'string' } } }
        }, async (args: Record<string, unknown>) => ({ content: [{ type: 'text', text: String(args.message) }] }));

        await proxy.start();

        const res = await proxy.callTool('run_task', {
            stopOnError: false,
            steps: [
                { type: 'tool', name: 'run_code', args: { code: 'return 1;' } },
                { type: 'tool', name: 'mock_echo', args: { message: 'ok' } }
            ]
        });

        expect(res.isError).toBeFalsy();
        const payload = JSON.parse(res.content[0].text);
        expect(payload.results.length).toBe(2);
    });
});
