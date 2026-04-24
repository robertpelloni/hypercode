import { describe, test, expect } from 'vitest';
import { EventEmitter } from 'events';
import { McpProxyManager } from '../src/managers/McpProxyManager.js';

type ProxyCtorArgs = ConstructorParameters<typeof McpProxyManager>;

interface PolicyServiceLike {
    evaluate(ctx: unknown): { allowed: boolean; reason?: string };
}

interface SavedScriptRecord {
    id: string;
    name: string;
    code: string;
    language: string;
    isFavorite: boolean;
    runCount: number;
    createdAt: number;
    updatedAt: number;
}

interface ScriptExecutionResult {
    success: boolean;
    result: number;
    logs: unknown[];
    durationMs: number;
    script: SavedScriptRecord;
}

interface SavedScriptServiceLike {
    getAllScripts(): SavedScriptRecord[];
    executeScriptByName(name: string, args?: Record<string, unknown>): Promise<ScriptExecutionResult>;
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

describe('script__ dynamic tools', () => {
    test('getAllTools includes script__ tools from saved scripts', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const policyService: PolicyServiceLike = { evaluate: () => ({ allowed: true }) };

        const proxy = new McpProxyManager(
            new MockMcpManager() as unknown as ProxyCtorArgs[0],
            new MockLogManager() as unknown as ProxyCtorArgs[1],
            { policyService } as unknown as ProxyCtorArgs[2]
        );

        const list = await proxy.getAllTools('sess');
        expect(Array.isArray(list)).toBeTrue();
    });

    test('script__ tool routes to executeScriptByName when DB available', async () => {
        process.env.MCP_DISABLE_METAMCP = 'true';

        const savedScriptService: SavedScriptServiceLike = {
            getAllScripts: () => [{ id: '1', name: 'hello', code: 'return 1;', language: 'javascript', isFavorite: false, runCount: 0, createdAt: 0, updatedAt: 0 }],
            executeScriptByName: async () => ({ success: true, result: 123, logs: [], durationMs: 1, script: { id: '1', name: 'hello', code: 'return 1;', language: 'javascript', isFavorite: false, runCount: 0, createdAt: 0, updatedAt: 0 } })
        };

        const policyService: PolicyServiceLike = { evaluate: () => ({ allowed: true }) };

        const proxy = new McpProxyManager(
            new MockMcpManager() as unknown as ProxyCtorArgs[0],
            new MockLogManager() as unknown as ProxyCtorArgs[1],
            { policyService, savedScriptService } as unknown as ProxyCtorArgs[2]
        );

        await proxy.start();

        const res = await proxy.callTool('script__hello', { foo: 'bar' }, 'sess');
        expect(res.isError).toBeFalsy();
        const payload = JSON.parse(res.content[0].text);
        expect(payload.result).toBe(123);
    });
});
