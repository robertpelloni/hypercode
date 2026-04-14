import { describe, test, expect } from 'vitest';
import { EventEmitter } from 'events';
import { rmSync, mkdtempSync } from 'fs';
import path from 'path';
import os from 'os';
import { McpProxyManager } from '../src/managers/McpProxyManager.js';

type ProxyCtorArgs = ConstructorParameters<typeof McpProxyManager>;

interface PolicyServiceLike {
  evaluate(ctx: unknown): { allowed: boolean; reason?: string };
}

interface SavedScriptServiceLike {
  getAllScripts(): unknown[];
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

describe('toolset meta tools', () => {
  test('save_tool_set and toolset_list', async () => {
    process.env.MCP_PROGRESSIVE_MODE = 'true';
    process.env.MCP_DISABLE_METAMCP = 'true';

    const dir = mkdtempSync(path.join(os.tmpdir(), 'hypercode-toolset-test-'));
    process.env.BORG_DATA_DIR = dir;

    const policyService: PolicyServiceLike = { evaluate: () => ({ allowed: true }) };
    const savedScriptService: SavedScriptServiceLike = { getAllScripts: () => [] };

    const proxy = new McpProxyManager(
      new MockMcpManager() as unknown as ProxyCtorArgs[0],
      new MockLogManager() as unknown as ProxyCtorArgs[1],
      { policyService, savedScriptService } as unknown as ProxyCtorArgs[2]
    );

    await proxy.start();

    await proxy.callTool('load_tool', { name: 'a' }, 's');

    const saved = await proxy.callTool('save_tool_set', { name: 'My Set' }, 's');
    expect(saved.isError).toBeTruthy();

    const listed = await proxy.callTool('toolset_list', {}, 's');
    expect(listed.isError).toBeTruthy();

    rmSync(dir, { recursive: true, force: true });
  });
});
