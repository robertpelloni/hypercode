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

interface CallRequestShape {
  method: string;
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
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

describe('tool annotation call blocking', () => {
  test('blocks tool call when annotation uiHints.hidden is true', async () => {
    process.env.MCP_DISABLE_METAMCP = 'true';

    const proxy = new McpProxyManager(
      new MockMcpManager() as unknown as ProxyCtorArgs[0],
      new MockLogManager() as unknown as ProxyCtorArgs[1]
    );

    getToolRegistry(proxy).set('b', 'internal');
    getToolDefinitions(proxy).set('b', { name: 'b', description: 'b', inputSchema: { type: 'object' } });
    getNamespaceOverrides(proxy).setOverride('ns', 'b', 'active');

    const anns = new ToolAnnotationManager();
    anns.setAnnotation('internal', 'b', { uiHints: { hidden: true } });
    proxy.setToolAnnotationManager(anns as unknown as AnnotationManagerArg);

    proxy.useCallToolMiddleware((next: (req: unknown, ctx: unknown) => Promise<unknown>) => async (req: { params: { name?: string } }, ctx: unknown) => {
      if (req.params.name === 'b') {
        return { content: [{ type: 'text', text: 'ok' }] };
      }
      return next(req, ctx);
    });

    const res = await proxy.callToolRpc({ method: 'tools/call', params: { name: 'b', arguments: {} } } as unknown as CallRequestShape, {
      sessionId: 's',
      namespaceId: 'ns',
    });

    expect(res.isError).toBeTruthy();
  });
});
