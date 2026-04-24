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

interface AgentRunnerLike {
  run(input: unknown): Promise<string>;
}

interface AgentCatalogLike {
  getAgents(): Array<{ name: string }>;
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

describe('endpointPath propagation (meta tools)', () => {
  test('endpointPath is provided for run_agent policy evaluation', async () => {
    const mcpManager = new MockMcpManager() as unknown as ProxyCtorArgs[0];
    const logManager = new MockLogManager() as unknown as ProxyCtorArgs[1];

    const seen: string[] = [];
    const policyService: PolicyServiceLike = {
      evaluate: (ctx) => {
        if (ctx.toolName === 'run_agent') {
          seen.push(String(ctx.endpointPath));
        }
        return { allowed: true };
      },
    };

    const savedScriptService: SavedScriptServiceLike = { getAllScripts: () => [] };

    const proxy = new McpProxyManager(mcpManager, logManager, {
      policyService,
      savedScriptService,
    });

    const agentRunner: AgentRunnerLike = { run: async () => 'ok' };
    const agentCatalog: AgentCatalogLike = { getAgents: () => [{ name: 'coder' }] };
    proxy.setAgentDependencies(
      agentRunner as unknown as Parameters<McpProxyManager['setAgentDependencies']>[0],
      agentCatalog as unknown as Parameters<McpProxyManager['setAgentDependencies']>[1]
    );

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
      params: { name: 'run_agent', arguments: { agentName: 'coder', task: 't' }, endpointPath: '/api/mcp/coding' },
    });

    expect(seen[0]).toBe('/api/mcp/coding');
  });
});
