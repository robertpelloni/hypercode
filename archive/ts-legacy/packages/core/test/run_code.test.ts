import { describe, test, expect } from 'vitest';
import { EventEmitter } from 'events';
import { McpProxyManager } from '../src/managers/McpProxyManager.js';

type ProxyCtorArgs = ConstructorParameters<typeof McpProxyManager>;

interface PolicyServiceLike {
    evaluate(): { allowed: boolean; reason?: string };
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

describe('run_code', () => {
    test('executes code and can call internal tools', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const mcpManager = new MockMcpManager() as unknown as ProxyCtorArgs[0];
        const logManager = new MockLogManager() as unknown as ProxyCtorArgs[1];
        const proxy = new McpProxyManager(mcpManager, logManager);

        proxy.registerInternalTool({
            name: 'mock_echo',
            description: 'Echoes input',
            inputSchema: { type: 'object', properties: { message: { type: 'string' } } }
        }, async (args: Record<string, unknown>) => ({ content: [{ type: 'text', text: String(args.message ?? '') }] }));

        await proxy.start();

        const res = await proxy.callTool('run_code', {
            code: "const out = await mcp.call('mock_echo', { message: 'hi' }); return out;"
        });

        expect(res.isError).toBeFalsy();
        const payload = JSON.parse(res.content[0].text);
        expect(payload.result).toBeDefined();
    });

    test('blocks recursive run_code calls', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const mcpManager = new MockMcpManager() as unknown as ProxyCtorArgs[0];
        const logManager = new MockLogManager() as unknown as ProxyCtorArgs[1];
        const proxy = new McpProxyManager(mcpManager, logManager);

        await proxy.start();

        const res = await proxy.callTool('run_code', {
            code: "await mcp.call('run_code', { code: 'return 1;' });"
        });

        expect(res.isError).toBeTruthy();
    });

    test('blocks run_code when policy denies execute', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const mcpManager = new MockMcpManager() as unknown as ProxyCtorArgs[0];
        const logManager = new MockLogManager() as unknown as ProxyCtorArgs[1];

        const policyService: PolicyServiceLike = {
            evaluate: () => ({ allowed: false, reason: 'blocked by test policy' })
        };

        const proxy = new McpProxyManager(mcpManager, logManager, {
            policyService: policyService as unknown as ProxyCtorArgs[2] extends undefined ? never : NonNullable<ProxyCtorArgs[2]> extends infer O ? O extends { policyService?: unknown } ? O['policyService'] : never : never
        });

        await proxy.start();

        const res = await proxy.callTool('run_code', { code: 'return 1;' });
        expect(res.isError).toBeTruthy();
        expect(res.content[0].text).toContain('Policy Blocked');
    });
});
