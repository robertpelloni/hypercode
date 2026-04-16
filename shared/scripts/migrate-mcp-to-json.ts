
import path from 'path';
import fs from 'fs/promises';
import { DatabaseManager } from '../cli/mcp-router-cli/packages/core/src/db/index.js';
import { ConfigurationService } from '../cli/mcp-router-cli/packages/core/src/services/ConfigurationService.js';

async function migrate() {
    const dataDir = path.resolve('./data'); // Assuming data is in ./data relative to execution root
    console.log(`[Migration] Initializing services with data dir: ${dataDir}`);

    // Ensure data directory exists
    try {
        await fs.mkdir(dataDir, { recursive: true });
    } catch (err) {
        // Ignore if exists
    }

    const db = DatabaseManager.getInstance(dataDir);
    const configService = ConfigurationService.getInstance(dataDir);

    console.log('[Migration] Exporting configurations...');
    try {
        // Export in 'HyperCode' format (native hypercode format)
        const jsonContent = await configService.exportConfigs('HyperCode');

        // Config file path - creating it in the root
        const configPath = path.resolve('mcp.json');
        console.log(`[Migration] Writing config to ${configPath}`);

        await fs.writeFile(configPath, jsonContent, 'utf-8');

        console.log('[Migration] Successfully exported mcp.json');
        console.log(jsonContent);
    } catch (error) {
        console.error('[Migration] Failed to export configurations:', error);
        process.exit(1);
    }
}

migrate().catch(console.error);
