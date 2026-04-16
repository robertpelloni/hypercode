import { describe, test, expect } from 'vitest';
import { EventEmitter } from 'events';
import { McpProxyManager } from '../src/managers/McpProxyManager.js';
import { createLoggingMiddleware } from '../src/middleware/logging-middleware.js';

type ProxyCtorArgs = ConstructorParameters<typeof McpProxyManager>;

interface PolicyServiceLike {
  evaluate(ctx: unknown): { allowed: boolean; reason?: string };
}

interface SavedScriptServiceLike {
  getAllScripts(): unknown[];
}

interface RequestArgs {
  traceId?: string;
  depth?: number;
}

interface LogEntry {
  type?: string;
  tool?: string;
  args: RequestArgs;
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
  entries: LogEntry[] = [];
  log(entry: LogEntry) {
    this.entries.push(entry);
  }
  calculateCost() {
    return 0;
  }
}

describe('nested trace logging', () => {
  test('nested tool calls share traceId and increment depth', async () => {
    const logManager = new MockLogManager();

    const policyService: PolicyServiceLike = { evaluate: () => ({ allowed: true }) };
    const savedScriptService: SavedScriptServiceLike = { getAllScripts: () => [] };

    const proxy = new McpProxyManager(
      new MockMcpManager() as unknown as ProxyCtorArgs[0],
      logManager as unknown as ProxyCtorArgs[1],
      { policyService, savedScriptService } as unknown as ProxyCtorArgs[2]
    );

    proxy.useCallToolMiddleware(createLoggingMiddleware({ enabled: true, logManager }));

    proxy.registerInternalTool({
      name: 'inner',
      description: 'inner',
      inputSchema: { type: 'object' },
    }, async () => ({ content: [{ type: 'text', text: 'ok' }] }));

    proxy.registerInternalTool({
      name: 'outer',
      description: 'outer',
      inputSchema: { type: 'object' },
    }, async () => {
      await proxy.callTool('inner', {}, 's');
      return { content: [{ type: 'text', text: 'done' }] };
    });

    await proxy.start();

    await proxy.callTool('outer', {}, 's');

    const reqs = logManager.entries.filter(e => e.type === 'request');
    const outer = reqs.find(e => e.tool === 'outer');
    const inner = reqs.find(e => e.tool === 'inner');

    expect(outer.args.traceId).toBeTruthy();
    expect(inner.args.traceId).toBe(outer.args.traceId);
    expect(inner.args.depth).toBeGreaterThan(outer.args.depth);
  });
});
