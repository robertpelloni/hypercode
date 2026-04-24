import { describe, test, expect } from 'vitest';
import { EventEmitter } from 'events';
import { HubServer } from '../src/hub/HubServer.js';
import { McpProxyManager } from '../src/managers/McpProxyManager.js';

type ProxyCtorArgs = ConstructorParameters<typeof McpProxyManager>;
type HubCtorArgs = ConstructorParameters<typeof HubServer>;

interface PolicyContextShape {
  toolName?: string;
  endpointPath?: string;
}

interface PolicyServiceLike {
  evaluate(ctx: PolicyContextShape): { allowed: boolean; reason?: string };
}

interface SavedScriptServiceLike {
  getAllScripts(): unknown[];
}

interface EndpointLookup {
  namespaceId?: string;
}

class MockMcpManager extends EventEmitter {
  getClient(_name: string) {
    return null;
  }
  getAllServers() {
    return [];
  }
  getEndpointByPath(path: string) {
    if (path === '/api/mcp/coding') return { namespaceId: 'ns-coding' };
    return null;
  }
}

class MockLogManager {
  log(_entry: unknown) {}
  calculateCost() {
    return 0;
  }
}

describe('endpointPath policy context propagation', () => {
  test('endpointPath is available during policy evaluation', async () => {
    const mcpManager = new MockMcpManager() as unknown as ProxyCtorArgs[0];
    const logManager = new MockLogManager() as unknown as ProxyCtorArgs[1];

    let sawEndpointPath: string | undefined;
    const policyService: PolicyServiceLike = {
      evaluate: (ctx) => {
        if (ctx.toolName === 'run_code') {
          sawEndpointPath = ctx.endpointPath;
        }
        return { allowed: true };
      },
    };

    const savedScriptService: SavedScriptServiceLike = { getAllScripts: () => [] };

    const proxy = new McpProxyManager(mcpManager, logManager, {
      policyService,
      savedScriptService,
    });

    await proxy.start();

    const endpointResolver = (endpointPath: string): string | undefined => {
      const endpoint = (mcpManager as unknown as MockMcpManager).getEndpointByPath(endpointPath) as EndpointLookup | null;
      return endpoint?.namespaceId;
    };

    const hub = new HubServer(
      proxy as unknown as HubCtorArgs[0],
      {} as unknown as HubCtorArgs[1],
      undefined,
      undefined,
      undefined,
      endpointResolver,
    );

    await hub.handleMessage('s1', {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'run_code', arguments: { code: 'return 1;' }, endpointPath: '/api/mcp/coding' },
    });

    expect(sawEndpointPath).toBe('/api/mcp/coding');
  });
});
