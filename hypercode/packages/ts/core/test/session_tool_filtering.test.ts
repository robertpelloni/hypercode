import { afterEach, describe, expect, test } from 'vitest';
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

describe('session tool filtering', () => {
  afterEach(() => {
    delete process.env.MCP_PROGRESSIVE_MODE;
    delete process.env.MCP_DISABLE_METAMCP;
  });

  test('tools/list filtered to loaded tools in progressive mode', async () => {
    process.env.MCP_PROGRESSIVE_MODE = 'true';
    process.env.MCP_DISABLE_METAMCP = 'true';

    const policyService: PolicyServiceLike = { evaluate: () => ({ allowed: true }) };
    const savedScriptService: SavedScriptServiceLike = { getAllScripts: () => [] };

    const mcpManager = new MockMcpManager() as unknown as ProxyCtorArgs[0];
    const logManager = new MockLogManager() as unknown as ProxyCtorArgs[1];
    const proxyOptions = {
      policyService,
      savedScriptService,
    } as unknown as ProxyCtorArgs[2];

    const proxy = new McpProxyManager(mcpManager, logManager, proxyOptions);

    proxy.registerInternalTool(
      {
        name: 'a',
        description: 'a',
        inputSchema: { type: 'object' },
      },
      async () => {
        return { content: [{ type: 'text', text: 'a' }] };
      },
    );

    proxy.registerInternalTool(
      {
        name: 'b',
        description: 'b',
        inputSchema: { type: 'object' },
      },
      async () => {
        return { content: [{ type: 'text', text: 'b' }] };
      },
    );

    await proxy.start();

    await proxy.callTool('load_tool', { name: 'a' }, 's');

    const tools = await proxy.getAllTools('s');
    expect(tools.find((t: ToolLike) => t.name === 'a')).toBeTruthy();
    expect(tools.find((t: ToolLike) => t.name === 'b')).toBeUndefined();
  });
});
