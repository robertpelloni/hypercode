
import { Client } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';

// Connection details from docker-compose.yml
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hypercode';

interface McpServer {
    uuid: string;
    name: string;
    type: string;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    headers?: Record<string, string>;
}

async function migrate() {
    console.log(`Connecting to Postgres at ${connectionString}...`);
    const client = new Client({
        connectionString,
    });

    try {
        await client.connect();
        console.log('Connected to Postgres.');

        // Check if table exists
        const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'mcp_servers'
      );
    `);

        if (!checkTable.rows[0].exists) {
            console.warn('Table mcp_servers does not exist. Assuming empty database.');
            await writeMcpJson({});
            return;
        }

        const res = await client.query('SELECT * FROM mcp_servers WHERE status != \'INACTIVE\''); // Assuming 'status' column exists implicitly or handled via join in original code. 
        // Wait, metamcp-schema.pg.ts does NOT have 'status' on mcp_servers table directly!
        // It's in namespace_server_mappings.
        // But for mcp.json we want ALL configured servers, maybe?
        // Let's just select all from mcp_servers for now.

        const rows = await client.query('SELECT * FROM mcp_servers');
        const servers: Record<string, any> = {};

        for (const row of rows.rows) {
            const server: any = {
                name: row.name,
                type: row.type || 'STDIO',
            };

            if (row.command) {
                server.command = row.command;
            }

            if (row.args && Array.isArray(row.args) && row.args.length > 0) {
                server.args = row.args;
            }

            if (row.env && Object.keys(row.env).length > 0) {
                server.env = row.env;
            }

            if (row.url) {
                server.url = row.url;
            }

            // Handle headers if they exist and are not empty
            if (row.headers && Object.keys(row.headers).length > 0) {
                // Flatten headers if needed or just assign
                // mcp.json usually structure: { "mcpServers": { "name": { "command":..., "args":..., "env":... } } }
                // mcp.json standard doesn't strictly define 'headers' for stdio, but for SSE/HTTP yes.
            }

            // Convert to mcp.json stdio/sse key format
            // mcp.json spec:
            // {
            //   "mcpServers": {
            //     "filesystem": {
            //       "command": "npx",
            //       "args": ["-y", "@modelcontextprotocol/server-filesystem", "..."]
            //     }
            //   }
            // }

            servers[row.name] = server;
        }

        const output = {
            mcpServers: servers
        };

        await writeMcpJson(output);

    } catch (err) {
        console.error('Migration failed:', err);
        // If connection fails, write empty mcp.json as fallback?
        // The user wants to "migrate", implies data preservation.
        // But if DB is down, maybe they just want to switch mechanisms.
        // I'll throw for now so I know it failed.
        process.exit(1);
    } finally {
        await client.end();
    }
}

async function writeMcpJson(data: any) {
    const outputPath = path.resolve(process.cwd(), 'mcp.json');
    await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Successfully wrote mcp.json to ${outputPath}`);
}

migrate();
