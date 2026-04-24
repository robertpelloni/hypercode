import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { JsonConfigProvider } from '../src/services/config/JsonConfigProvider.ts';
<<<<<<< HEAD:archive/ts-legacy/packages/core/test/mcpJsonConfig.test.ts
import { loadHyperCodeMcpConfig, stripJsonComments, writeHyperCodeMcpConfig } from '../src/mcp/mcpJsonConfig.ts';
=======
import { loadBorgMcpConfig, stripJsonComments, writeBorgMcpConfig } from '../src/mcp/mcpJsonConfig.ts';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/test/mcpJsonConfig.test.ts

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
<<<<<<< HEAD:archive/ts-legacy/packages/core/test/mcpJsonConfig.test.ts
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hypercode-mcp-jsonc-'));
=======
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'borg-mcp-jsonc-'));
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/test/mcpJsonConfig.test.ts
    tempDirs.push(dir);
    return dir;
}

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('mcp jsonc persistence', () => {
        it('preserves quoted URLs while removing jsonc comments', async () => {
                const workspaceRoot = await makeTempDir();
                const rawJsonc = `// top-level comment
{
    "mcpServers": {
        "mindsdb": {
            "type": "SSE",
            "url": "http://localhost:47334/mcp/sse", // trailing comment should be removed
            /* keep the URL above intact while removing this block comment */
            "description": "Local MindsDB"
        }
    }
}
`;

                await fs.writeFile(path.join(workspaceRoot, 'mcp.jsonc'), rawJsonc, 'utf-8');

                const stripped = stripJsonComments(rawJsonc);
<<<<<<< HEAD:archive/ts-legacy/packages/core/test/mcpJsonConfig.test.ts
                const parsed = await loadHyperCodeMcpConfig(workspaceRoot);
=======
                const parsed = await loadBorgMcpConfig(workspaceRoot);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/test/mcpJsonConfig.test.ts

                expect(stripped).toContain('"url": "http://localhost:47334/mcp/sse"');
                expect(stripped).not.toContain('top-level comment');
                expect(stripped).not.toContain('trailing comment should be removed');
                expect(parsed.mcpServers.mindsdb.url).toBe('http://localhost:47334/mcp/sse');
                expect(parsed.mcpServers.mindsdb.description).toBe('Local MindsDB');
        });

    it('writes metadata to mcp.jsonc while keeping mcp.json compatibility clean', async () => {
        const workspaceRoot = await makeTempDir();

<<<<<<< HEAD:archive/ts-legacy/packages/core/test/mcpJsonConfig.test.ts
        await writeHyperCodeMcpConfig({
=======
        await writeBorgMcpConfig({
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/test/mcpJsonConfig.test.ts
            mcpServers: {
                demo: {
                    command: 'npx',
                    args: ['demo-server'],
                    description: 'Demo server',
                    type: 'STDIO',
                    _meta: {
                        status: 'ready',
                        discoveredAt: '2026-03-08T00:00:00.000Z',
                        toolCount: 1,
                        tools: [{
                            name: 'demo_tool',
                            description: 'Runs the demo tool',
                            inputSchema: {
                                properties: {
                                    query: { type: 'string' },
                                },
                                required: ['query'],
                            },
                        }],
                    },
                },
            },
            scripts: [{ name: 'saved-script', code: 'console.log(1);' }],
            settings: { theme: 'dark' },
        }, workspaceRoot);

        const jsoncRaw = await fs.readFile(path.join(workspaceRoot, 'mcp.jsonc'), 'utf-8');
        const jsonRaw = await fs.readFile(path.join(workspaceRoot, 'mcp.json'), 'utf-8');
        const compatibilityConfig = JSON.parse(jsonRaw) as { mcpServers: Record<string, Record<string, unknown>> };
<<<<<<< HEAD:archive/ts-legacy/packages/core/test/mcpJsonConfig.test.ts
        const loadedConfig = await loadHyperCodeMcpConfig(workspaceRoot);
=======
        const loadedConfig = await loadBorgMcpConfig(workspaceRoot);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/test/mcpJsonConfig.test.ts

        expect(jsoncRaw).toContain('_meta');
        expect(jsonRaw).not.toContain('_meta');
        expect(compatibilityConfig.mcpServers.demo.command).toBe('npx');
        expect(loadedConfig.mcpServers.demo._meta?.tools[0]?.name).toBe('demo_tool');
        expect(loadedConfig.scripts).toHaveLength(1);
        expect(loadedConfig.settings).toEqual({ theme: 'dark' });
    });

    it('preserves cached metadata when JsonConfigProvider saves server config updates', async () => {
        const workspaceRoot = await makeTempDir();

<<<<<<< HEAD:archive/ts-legacy/packages/core/test/mcpJsonConfig.test.ts
        await writeHyperCodeMcpConfig({
=======
        await writeBorgMcpConfig({
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/test/mcpJsonConfig.test.ts
            mcpServers: {
                demo: {
                    command: 'npx',
                    args: ['demo-server'],
                    _meta: {
                        status: 'ready',
                        discoveredAt: '2026-03-08T00:00:00.000Z',
                        toolCount: 1,
                        tools: [{ name: 'demo_tool' }],
                    },
                },
            },
        }, workspaceRoot);

        const provider = new JsonConfigProvider(workspaceRoot);
        await provider.saveMcpServers([
            {
                name: 'demo',
                type: 'stdio',
                command: 'pnpm',
                args: ['demo-server'],
            },
        ]);

<<<<<<< HEAD:archive/ts-legacy/packages/core/test/mcpJsonConfig.test.ts
        const loadedConfig = await loadHyperCodeMcpConfig(workspaceRoot);
=======
        const loadedConfig = await loadBorgMcpConfig(workspaceRoot);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/test/mcpJsonConfig.test.ts
        const loadedServers = await provider.loadMcpServers();

        expect(loadedConfig.mcpServers.demo.command).toBe('pnpm');
        expect(loadedConfig.mcpServers.demo._meta?.toolCount).toBe(1);
        expect(loadedServers).toHaveLength(1);
        expect(loadedServers[0]).toMatchObject({
            name: 'demo',
            type: 'stdio',
            command: 'pnpm',
            args: ['demo-server'],
        });
    });
});