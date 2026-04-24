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

describe('run_agent', () => {
    test('runs agent via injected dependencies', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const mcpManager = new MockMcpManager() as unknown as ProxyCtorArgs[0];
        const logManager = new MockLogManager() as unknown as ProxyCtorArgs[1];

        const policyService: PolicyServiceLike = { evaluate: () => ({ allowed: true }) };

        const proxy = new McpProxyManager(mcpManager, logManager, {
            policyService
        } as unknown as ProxyCtorArgs[2]);

        const agentManager: AgentManagerLike = {
            getAgents: () => [{ name: 'coder', model: 'gpt-4o', description: '', instructions: '' }]
        };

        const agentExecutor: AgentExecutorLike = {
            run: async (_agent: AgentDescriptor, task: string) => `ok:${task}`
        };

        proxy.setAgentDependencies(
            agentExecutor as unknown as Parameters<McpProxyManager['setAgentDependencies']>[0],
            agentManager as unknown as Parameters<McpProxyManager['setAgentDependencies']>[1]
        );

        await proxy.start();

        const res = await proxy.callTool('run_agent', { agentName: 'coder', task: 'hello' });
        expect(res.isError).toBeFalsy();
        expect(res.content[0].text).toBe('ok:hello');
    });

    test('blocks run_agent when policy denies', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const mcpManager = new MockMcpManager() as unknown as ProxyCtorArgs[0];
        const logManager = new MockLogManager() as unknown as ProxyCtorArgs[1];

        const policyService: PolicyServiceLike = { evaluate: () => ({ allowed: false, reason: 'nope' }) };

        const proxy = new McpProxyManager(mcpManager, logManager, {
            policyService
        } as unknown as ProxyCtorArgs[2]);

        await proxy.start();

        const res = await proxy.callTool('run_agent', { agentName: 'coder', task: 'hello' });
        expect(res.isError).toBeTruthy();
        expect(res.content[0].text).toContain('Policy Blocked');
    });
});
