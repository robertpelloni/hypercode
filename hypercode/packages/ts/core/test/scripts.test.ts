import { describe, test, expect } from 'vitest';
import { EventEmitter } from 'events';
import { McpProxyManager } from '../src/managers/McpProxyManager.js';

type ProxyCtorArgs = ConstructorParameters<typeof McpProxyManager>;

interface PolicyContextShape {
    toolName?: string;
}

interface PolicyServiceLike {
    evaluate(ctx: PolicyContextShape): { allowed: boolean; reason?: string };
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

describe('saved scripts tools', () => {
    test('policy can deny script_create', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const policyService: PolicyServiceLike = {
            evaluate: (ctx) => ({ allowed: ctx.toolName !== 'script_create', reason: 'denied' })
        };

        const proxy = new McpProxyManager(
            new MockMcpManager() as unknown as ProxyCtorArgs[0],
            new MockLogManager() as unknown as ProxyCtorArgs[1],
            { policyService } as unknown as ProxyCtorArgs[2]
        );

        await proxy.start();

        const res = await proxy.callTool('script_create', { name: 'x', code: 'return 1;' });
        expect(res.isError).toBeTruthy();
        expect(res.content[0].text).toContain('Policy Blocked');
    });

    test('scripts_list returns json array (even without DB)', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const policyService: PolicyServiceLike = { evaluate: () => ({ allowed: true }) };

        const proxy = new McpProxyManager(
            new MockMcpManager() as unknown as ProxyCtorArgs[0],
            new MockLogManager() as unknown as ProxyCtorArgs[1],
            { policyService } as unknown as ProxyCtorArgs[2]
        );

        await proxy.start();

        const res = await proxy.callTool('scripts_list', {});
        expect(res.isError).toBeFalsy();
        const arr = JSON.parse(res.content[0].text);
        expect(Array.isArray(arr)).toBeTrue();
    });
});
