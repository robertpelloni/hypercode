import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db/repositories/index.js', () => ({
    mcpServersRepository: {
        findAll: vi.fn(),
        findByUuid: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        reloadMetadata: vi.fn(),
        clearMetadataCache: vi.fn(),
        deleteByUuid: vi.fn(),
        bulkCreate: vi.fn(),
    },
}));

vi.mock('../mcp/mcpJsonConfig.js', () => ({
    loadBorgMcpConfig: vi.fn(async () => ({ mcpServers: {} })),
}));

vi.mock('../mcp/clientConfigSync.js', () => ({
    clientConfigSyncService: {
        listTargets: vi.fn(),
        previewSync: vi.fn(),
        syncClientConfig: vi.fn(),
    },
    SUPPORTED_MCP_CLIENTS: ['claude-desktop', 'cursor', 'vscode'],
}));

const { mcpServersRouter } = await import('./mcpServersRouter.js');
const { mcpServersRepository } = await import('../db/repositories/index.js');

function createCaller() {
    return mcpServersRouter.createCaller({} as never);
}

describe('mcpServersRouter degraded SQLite handling', () => {
    const repositoryMocks = vi.mocked(mcpServersRepository);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('surfaces a clear error for list when SQLite is unavailable', async () => {
        repositoryMocks.findAll.mockRejectedValue(
            new Error('SQLite runtime is unavailable for borg DB-backed features (Could not locate the bindings file. Tried: better-sqlite3.node)'),
        );

        const caller = createCaller();

        await expect(caller.list()).rejects.toMatchObject({
            message: 'MCP server registry is unavailable: SQLite runtime is unavailable for this run.',
        });
    });

    it('surfaces a clear error for create when SQLite is unavailable', async () => {
        repositoryMocks.create.mockRejectedValue(
            new Error('SQLite runtime is unavailable for borg DB-backed features (Could not locate the bindings file. Tried: better-sqlite3.node)'),
        );

        const caller = createCaller();

        await expect(caller.create({
            name: 'test-server',
            type: 'STDIO',
            command: 'node',
            args: ['server.js'],
        })).rejects.toMatchObject({
            message: 'MCP server registry is unavailable: SQLite runtime is unavailable for this run.',
        });
    });
});
