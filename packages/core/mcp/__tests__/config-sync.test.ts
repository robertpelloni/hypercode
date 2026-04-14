import { describe, expect, it } from 'vitest';

import {
    ClientConfigSyncService,
    type ServerRecord,
    type SupportedMcpClient,
} from '../../src/mcp/clientConfigSync.ts';

function createService(options?: {
    existingFiles?: Record<string, string>;
    platform?: NodeJS.Platform;
    appData?: string;
    cwd?: string;
}) {
    const existingFiles = options?.existingFiles ?? {};
    const writes = new Map<string, string>();

    const servers: ServerRecord[] = [
        {
            name: 'filesystem',
            type: 'STDIO',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', 'C:/workspace'],
            env: { NODE_ENV: 'test' },
            url: null,
            headers: {},
            bearerToken: null,
        },
        {
            name: 'remote-api',
            type: 'SSE',
            command: null,
            args: [],
            env: {},
            url: 'https://example.com/mcp',
            headers: { 'X-Test': 'yes' },
            bearerToken: 'secret-token',
        },
    ];

    const service = new ClientConfigSyncService({
        platform: options?.platform ?? 'win32',
        cwd: options?.cwd ?? 'C:\\workspace\\hypercode',
        homedir: () => 'C:\\Users\\hyper',
        env: {
            APPDATA: options?.appData ?? 'C:\\Users\\hyper\\AppData\\Roaming',
        },
        loadServers: async () => servers,
        fileSystem: {
            access: async (filePath) => {
                if (!(filePath in existingFiles)) {
                    throw new Error(`missing: ${filePath}`);
                }
            },
            readFile: async (filePath) => {
                const content = existingFiles[filePath];
                if (content === undefined) {
                    throw new Error(`missing read: ${filePath}`);
                }
                return content;
            },
            mkdir: async () => undefined,
            writeFile: async (filePath, content) => {
                writes.set(filePath, content);
            },
        },
    });

    return { service, writes };
}

describe('ClientConfigSyncService', () => {
    it('resolves an existing Cursor config path before falling back to alternates', async () => {
        const existingPath = 'C:\\Users\\hyper\\AppData\\Roaming\\Cursor\\User\\mcp.json';
        const { service } = createService({
            existingFiles: {
                [existingPath]: '{}',
            },
        });

        const target = await service.resolveTarget('cursor');

        expect(target.path).toBe(existingPath);
        expect(target.exists).toBe(true);
        expect(target.candidates[0]).toContain('globalStorage');
    });

    it('builds Claude-compatible config previews from stored MCP server definitions', async () => {
        const { service } = createService();

        const preview = await service.previewSync('claude-desktop');

        expect(preview.serverCount).toBe(2);
        expect(preview.document.mcpServers).toEqual({
            filesystem: {
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-filesystem', 'C:/workspace'],
                env: { NODE_ENV: 'test' },
            },
            'remote-api': {
                url: 'https://example.com/mcp',
                headers: {
                    'X-Test': 'yes',
                    Authorization: 'Bearer secret-token',
                },
            },
        });
    });

    it('merges MCP servers into VS Code settings.json while preserving unrelated settings', async () => {
        const settingsPath = 'C:\\Users\\hyper\\AppData\\Roaming\\Code\\User\\settings.json';
        const { service, writes } = createService({
            existingFiles: {
                [settingsPath]: JSON.stringify({
                    'workbench.colorTheme': 'Default Dark+',
                    editor: { formatOnSave: true },
                }),
            },
        });

        const result = await service.syncClientConfig('vscode', settingsPath);
        const writtenJson = writes.get(settingsPath);

        expect(result.written).toBe(true);
        expect(writtenJson).toBeDefined();
        expect(JSON.parse(writtenJson ?? '{}')).toMatchObject({
            'workbench.colorTheme': 'Default Dark+',
            editor: { formatOnSave: true },
            mcpServers: {
                filesystem: {
                    command: 'npx',
                },
                'remote-api': {
                    url: 'https://example.com/mcp',
                },
            },
        });
    });

    it.each<SupportedMcpClient>(['claude-desktop', 'cursor', 'vscode'])('lists a target for %s', async (client) => {
        const { service } = createService();

        const targets = await service.listTargets();
        const entry = targets.find((target) => target.client === client);

        expect(entry).toBeDefined();
        expect(entry?.path.length).toBeGreaterThan(0);
    });
});
