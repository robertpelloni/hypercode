import { describe, test, expect } from 'vitest';
import { EventEmitter } from 'events';
import { McpProxyManager } from '../src/managers/McpProxyManager.js';

type ProxyCtorArgs = ConstructorParameters<typeof McpProxyManager>;

interface PolicyServiceLike {
    evaluate(ctx: unknown): { allowed: boolean; reason?: string };
}

interface SavedScriptServiceLike {
    getAllScripts(): unknown[];
}

interface ToolLike {
    name?: string;
}

interface CallRequestShape {
    params: { name?: string };
}

class MockMcpManager extends EventEmitter {
    getClient(_name: string) {
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

describe('namespace tool overrides', () => {
    test('list hides hidden tools and applies alias', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const policyService: PolicyServiceLike = { evaluate: () => ({ allowed: true }) };
        const savedScriptService: SavedScriptServiceLike = { getAllScripts: () => [] };

        const proxy = new McpProxyManager(
            new MockMcpManager() as unknown as ProxyCtorArgs[0],
            new MockLogManager() as unknown as ProxyCtorArgs[1],
            { policyService, savedScriptService } as unknown as ProxyCtorArgs[2]
        );

        await proxy.start();

        await proxy.callTool('namespace_set', { namespaceId: 'ns1' }, 'sess');
        await proxy.callTool('namespace_tool_override_set', { namespaceId: 'ns1', toolName: 'search_tools', status: 'hidden' }, 'sess');
        await proxy.callTool('namespace_tool_override_set', { namespaceId: 'ns1', toolName: 'run_code', status: 'active', aliasName: 'exec_js' }, 'sess');

        const tools = await proxy.getAllTools('sess');
        expect(tools.find((t: ToolLike) => t.name === 'search_tools')).toBeUndefined();
        expect(tools.find((t: ToolLike) => t.name === 'exec_js')).toBeTruthy();
        expect(tools.find((t: ToolLike) => t.name === 'run_code')).toBeUndefined();
    });

    test('call maps alias to original tool name', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const policyService: PolicyServiceLike = { evaluate: () => ({ allowed: true }) };
        const savedScriptService: SavedScriptServiceLike = { getAllScripts: () => [] };

        const proxy = new McpProxyManager(
            new MockMcpManager() as unknown as ProxyCtorArgs[0],
            new MockLogManager() as unknown as ProxyCtorArgs[1],
            { policyService, savedScriptService } as unknown as ProxyCtorArgs[2]
        );

        proxy.useCallToolMiddleware((next: (req: unknown, ctx: unknown) => Promise<unknown>) => async (req: CallRequestShape, ctx: unknown) => {
            if (req.params.name === 'run_code') {
                return { content: [{ type: 'text', text: 'hit' }] };
            }
            return next(req, ctx);
        });

        await proxy.start();

        await proxy.callTool('namespace_set', { namespaceId: 'ns1' }, 'sess');
        await proxy.callTool('namespace_tool_override_set', { namespaceId: 'ns1', toolName: 'run_code', status: 'active', aliasName: 'exec_js' }, 'sess');

        const res = await proxy.callTool('exec_js', { code: 'return 1;' }, 'sess');
        expect(res.isError).toBeFalsy();
    });

    test('call blocks disabled tool', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const policyService: PolicyServiceLike = { evaluate: () => ({ allowed: true }) };
        const savedScriptService: SavedScriptServiceLike = { getAllScripts: () => [] };

        const proxy = new McpProxyManager(
            new MockMcpManager() as unknown as ProxyCtorArgs[0],
            new MockLogManager() as unknown as ProxyCtorArgs[1],
            { policyService, savedScriptService } as unknown as ProxyCtorArgs[2]
        );

        await proxy.start();

        await proxy.callTool('namespace_set', { namespaceId: 'ns1' }, 'sess');
        await proxy.callTool('namespace_tool_override_set', { namespaceId: 'ns1', toolName: 'run_code', status: 'disabled' }, 'sess');

        const res = await proxy.callTool('run_code', { code: 'return 1;' }, 'sess');
        expect(res.isError).toBeTruthy();
    });
});
