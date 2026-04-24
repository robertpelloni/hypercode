
import { McpProxyManager } from '../src/managers/McpProxyManager.js';
import { EventEmitter } from 'events';

type ProxyCtorArgs = ConstructorParameters<typeof McpProxyManager>;

interface LogEntry {
    type?: string;
    tool?: string;
}

// Mock McpManager
class MockMcpManager extends EventEmitter {
    getClient(name: string) {
        return null;
    }
    getAllServers() {
        return [];
    }
}

// Mock LogManager
class MockLogManager {
    log(entry: LogEntry) {
        // console.log('[MockLog]', entry.type, entry.tool);
    }
    calculateCost() {
        return 0;
    }
}

async function runTests() {
    console.log('Starting Chain Tests...');

    // Reason: test doubles only implement the subset needed by the proxy constructor.
    // What: narrow mocks to constructor argument shapes through `unknown` instead of permissive casts.
    // Why: keeps tests lightweight while reducing broad untyped assertions.
    const mcpManager = new MockMcpManager() as unknown as ProxyCtorArgs[0];
    const logManager = new MockLogManager() as unknown as ProxyCtorArgs[1];
    const proxy = new McpProxyManager(mcpManager, logManager);

    // Disable MetaMCP connection for tests
    process.env.MCP_DISABLE_METAMCP = 'true';
    
    // Register mock tools
    proxy.registerInternalTool({
        name: "mock_echo",
        description: "Echoes input",
        inputSchema: { type: "object", properties: { message: { type: "string" } } }
    }, async (args: Record<string, unknown>) => {
        return { content: [{ type: "text", text: String(args.message ?? '') }] };
    });

    proxy.registerInternalTool({
        name: "mock_reverse",
        description: "Reverses input string",
        inputSchema: { type: "object", properties: { input: { type: "string" } } }
    }, async (args: Record<string, unknown>) => {
        const input = String(args.input ?? '');
        return { content: [{ type: "text", text: input.split('').reverse().join('') }] };
    });

    proxy.registerInternalTool({
        name: "mock_fail",
        description: "Always fails",
        inputSchema: { type: "object" }
    }, async (_args: Record<string, unknown>) => {
        return { isError: true, content: [{ type: "text", text: "Intentional failure" }] };
    });

    await proxy.start();

    // Test 1: Successful Chain
    console.log('\nTest 1: Echo -> Reverse Chain');
    const chainResult = await proxy.callTool('mcp_chain', {
        mcpPath: [
            {
                toolName: "mock_echo",
                toolArgs: JSON.stringify({ message: "hello" })
            },
            {
                toolName: "mock_reverse",
                toolArgs: JSON.stringify({ input: "CHAIN_RESULT" })
            }
        ]
    });

    if (chainResult.content[0].text === 'olleh') { // Result is raw string if it's a string
        console.log('PASS: Got expected output "olleh"');
    } else {
        console.error('FAIL: Expected "olleh", got:', chainResult.content[0].text);
        process.exit(1);
    }

    // Test 2: Error Handling
    console.log('\nTest 2: Chain with Failure');
    const failResult = await proxy.callTool('mcp_chain', {
        mcpPath: [
            {
                toolName: "mock_echo",
                toolArgs: JSON.stringify({ message: "start" })
            },
            {
                toolName: "mock_fail",
                toolArgs: "{}"
            },
            {
                toolName: "mock_reverse",
                toolArgs: JSON.stringify({ input: "CHAIN_RESULT" })
            }
        ]
    });

    if (failResult.isError && failResult.content[0].text.includes("Chain failed at step 2")) {
        console.log('PASS: Chain stopped at failure step correctly.');
    } else {
        console.error('FAIL: Chain did not handle error correctly.', failResult);
        process.exit(1);
    }

    console.log('\nAll tests passed!');
}

runTests().catch(console.error);
