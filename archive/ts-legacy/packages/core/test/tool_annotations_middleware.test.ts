import { describe, test, expect } from 'vitest';
import { EventEmitter } from 'events';
import { McpProxyManager } from '../src/managers/McpProxyManager.js';
import { ToolAnnotationManager } from '../src/managers/ToolAnnotationManager.js';

type ProxyCtorArgs = ConstructorParameters<typeof McpProxyManager>;

interface ToolDefinitionShape {
  name: string;
  description: string;
  inputSchema: { type: string };
}

interface ListToolsRequestShape {
  method: string;
  params: Record<string, unknown>;
}

interface ListToolsResponseShape {
  tools: Array<{ name?: string; annotations?: Record<string, unknown> }>;
}

type AnnotationManagerArg = Parameters<McpProxyManager['setToolAnnotationManager']>[0];

function getToolRegistry(proxy: McpProxyManager): Map<string, string> {
  return Reflect.get(proxy as object, 'toolRegistry') as Map<string, string>;
}

function getToolDefinitions(proxy: McpProxyManager): Map<string, ToolDefinitionShape> {
  return Reflect.get(proxy as object, 'toolDefinitions') as Map<string, ToolDefinitionShape>;
}

function getNamespaceOverrides(proxy: McpProxyManager): { setOverride(namespaceId: string, toolName: string, status: string): void } {
  return Reflect.get(proxy as object, 'namespaceOverrides') as { setOverride(namespaceId: string, toolName: string, status: string): void };
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

describe('tool annotation listTools middleware', () => {
  test('hides tools with uiHints.hidden and applies displayName', async () => {
    process.env.MCP_DISABLE_METAMCP = 'true';
    process.env.MCP_PROGRESSIVE_MODE = 'false';

    const proxy = new McpProxyManager(
      new MockMcpManager() as unknown as ProxyCtorArgs[0],
      new MockLogManager() as unknown as ProxyCtorArgs[1]
    );

    getToolRegistry(proxy).set('a', 'internal');
    getToolDefinitions(proxy).set('a', { name: 'a', description: 'a', inputSchema: { type: 'object' } });
    getToolRegistry(proxy).set('b', 'internal');
    getToolDefinitions(proxy).set('b', { name: 'b', description: 'b', inputSchema: { type: 'object' } });

    getNamespaceOverrides(proxy).setOverride('default', 'a', 'active');
    getNamespaceOverrides(proxy).setOverride('default', 'b', 'active');

    const anns = new ToolAnnotationManager();
    anns.setAnnotation('internal', 'a', { uiHints: { hidden: true } });
    anns.setAnnotation('internal', 'b', { displayName: 'B', uiHints: {} });
    proxy.setToolAnnotationManager(anns as unknown as AnnotationManagerArg);

    const tools = await proxy.listTools(
      { method: 'tools/list', params: {} } as unknown as ListToolsRequestShape,
      { sessionId: 's', namespaceId: 'default' }
    ) as unknown as ListToolsResponseShape;
    const byName = new Map(tools.tools.map((t) => [t.name, t]));
    const b = byName.get('b');
    expect(Boolean(b)).toBe(true);
    expect(b.annotations?.displayName).toBe('B');

    expect(byName.has('a')).toBe(false);
  });
});
