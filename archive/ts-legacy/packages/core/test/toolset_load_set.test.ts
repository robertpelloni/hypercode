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

interface InternalToolShape {
  name: string;
  inputSchema: { type: string };
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

describe('load_tool_set', () => {
  test('loads tool names from tool_ids', async () => {
    process.env.MCP_PROGRESSIVE_MODE = 'true';
    process.env.MCP_DISABLE_METAMCP = 'true';

    const policyService: PolicyServiceLike = { evaluate: () => ({ allowed: true }) };
    const savedScriptService: SavedScriptServiceLike = { getAllScripts: () => [] };

    const proxy = new McpProxyManager(
      new MockMcpManager() as unknown as ProxyCtorArgs[0],
      new MockLogManager() as unknown as ProxyCtorArgs[1],
      { policyService, savedScriptService } as unknown as ProxyCtorArgs[2]
    );

    proxy.registerInternalTool({ name: 'a', inputSchema: { type: 'object' } } as unknown as InternalToolShape, async () => ({ content: [{ type: 'text', text: 'a' }] }));
    proxy.registerInternalTool({ name: 'b', inputSchema: { type: 'object' } } as unknown as InternalToolShape, async () => ({ content: [{ type: 'text', text: 'b' }] }));

    await proxy.start();

    const res = await proxy.callTool('load_tool_set', { toolSetId: 'missing' }, 's');
    expect(res.isError).toBeTruthy();
  });
});
