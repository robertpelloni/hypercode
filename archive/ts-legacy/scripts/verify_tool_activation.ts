
import { SubmoduleService } from '../packages/core/src/services/SubmoduleService.js';
import { MCPAggregator } from '../packages/core/src/mcp/MCPAggregator.js';
import path from 'path';

async function main() {
    console.log("Verifying Tool Activation...");

    // Mock Aggregator
    const mockAggregator = {
        addServerConfig: async (name: string, config: any) => {
            console.log(`[Mock] addServerConfig called for '${name}'`);
            console.log(`[Mock] Config:`, config);
            return;
        }
    } as unknown as MCPAggregator;

    const submoduleService = new SubmoduleService(process.cwd(), mockAggregator);

    // Mock detection (so we don't need real submodules for this test)
    submoduleService.detectCapabilities = (path: string) => {
        return {
            caps: ['mcp-server'],
            startCommand: 'node dist/index.js'
        };
    };

    console.log("Testing enableSubmodule('test-submodule')...");
    const result = await submoduleService.enableSubmodule('test-submodule');

    if (result.success) {
        console.log("✅ Success:", result.output);
    } else {
        console.error("❌ Failed:", result.output);
        process.exit(1);
    }
}

main().catch(console.error);
