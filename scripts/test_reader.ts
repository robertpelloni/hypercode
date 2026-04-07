
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
    console.log("Connecting to HyperCode Core Stdio...");
    const transport = new StdioClientTransport({
        command: "node",
        args: ["c:/Users/hyper/workspace/hypercode/packages/core/dist/server-stdio.js"]
    });

    const client = new Client(
        { name: "test-client", version: "1.0.0" },
        { capabilities: {} }
    );

    await client.connect(transport);
    console.log("Connected.");

    // Set Autonomy to High to bypass permission checks for test
    await client.callTool({
        name: "set_autonomy",
        arguments: { level: "high" }
    });

    const url = "https://example.com";
    console.log(`Calling read_page on ${url}...`);

    try {
        const result = await client.callTool({
            name: "read_page",
            arguments: { url }
        });

        // @ts-ignore
        const text = result.content[0].text;
        console.log("--- Content Start ---");
        console.log(text.substring(0, 500));
        console.log("--- Content End ---");

        if (text.includes("Example Domain")) {
            console.log("SUCCESS: Read basic domain content.");
        } else {
            console.error("FAILURE: unexpected content.");
        }

    } catch (e: any) {
        console.error("Tool execution failed:", e.message);
    }

    process.exit(0);
}

main();
