import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['C:/Users/hyper/workspace/borg/packages/core/dist/MCPServer.js']
});

const client = new Client({ name: 'borg-dist-probe-verify', version: '1.0.0' }, { capabilities: {} });

try {
  await client.connect(transport);
  console.log('DIST_PROBE_CONNECTED');
  const tools = await client.listTools();
  console.log('DIST_PROBE_TOOLS=' + tools.tools.length);
  await client.close();
  console.log('DIST_PROBE_DONE');
} catch (error) {
  console.error('DIST_PROBE_ERROR', error);
  process.exitCode = 1;
}
