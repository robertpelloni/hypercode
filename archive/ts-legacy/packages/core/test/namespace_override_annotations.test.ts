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

interface ToolDefinitionShape {
  name: string;
  description: string;
  inputSchema: { type: string };
  annotations?: Record<string, unknown>;
}

function getToolRegistry(proxy: McpProxyManager): Map<string, string> {
  return Reflect.get(proxy as object, 'toolRegistry') as Map<string, string>;
}

function getToolDefinitions(proxy: McpProxyManager): Map<string, ToolDefinitionShape> {
  return Reflect.get(proxy as object, 'toolDefinitions') as Map<string, ToolDefinitionShape>;
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

describe('namespace override annotations', () => {
  test('merges overrideAnnotations into tools/list entries', async () => {
    process.env.MCP_DISABLE_METAMCP = 'true';
    process.env.MCP_PROGRESSIVE_MODE = 'false';

    const policyService: PolicyServiceLike = { evaluate: () => ({ allowed: true }) };
    const savedScriptService: SavedScriptServiceLike = { getAllScripts: () => [] };

    const proxy = new McpProxyManager(
      new MockMcpManager() as unknown as ProxyCtorArgs[0],
      new MockLogManager() as unknown as ProxyCtorArgs[1],
      { policyService, savedScriptService } as unknown as ProxyCtorArgs[2]
    );

    getToolRegistry(proxy).set('x', 'internal');
    getToolDefinitions(proxy).set('x', { name: 'x', description: 'desc', inputSchema: { type: 'object' }, annotations: { readOnlyHint: true } });

    await proxy.callTool('namespace_set', { namespaceId: 'ns1' }, 'sess');
    await proxy.callTool(
      'namespace_tool_override_set',
      {
        namespaceId: 'ns1',
        toolName: 'x',
        status: 'active',
        overrideAnnotations: { readOnlyHint: false, custom: 'y' },
      },
      'sess'
    );

    const tools = await proxy.getAllTools('sess');
    const tool = tools.find((t: { name?: string }) => t.name === 'x');
    expect(Boolean(tool)).toBe(true);
    expect(tool.annotations?.readOnlyHint).toBe(false);
    expect(tool.annotations?.custom).toBe('y');
  });
});
