import { describe, expect, it } from 'vitest';

import { buildBulkImportServers, normalizeImportedServerType } from './mcp-import';

describe('normalizeImportedServerType', () => {
    it('normalizes common transport aliases', () => {
        expect(normalizeImportedServerType({ type: 'stdio' })).toBe('STDIO');
        expect(normalizeImportedServerType({ type: 'http', url: 'https://example.com/mcp' })).toBe('STREAMABLE_HTTP');
        expect(normalizeImportedServerType({ type: 'streamable-http', url: 'https://example.com/mcp' })).toBe('STREAMABLE_HTTP');
        expect(normalizeImportedServerType({ transportType: 'stdio' })).toBe('STDIO');
    });

    it('infers SSE endpoints from URL shape when type is omitted', () => {
        expect(normalizeImportedServerType({ url: 'https://example.com/sse' })).toBe('SSE');
        expect(normalizeImportedServerType({ url: 'https://example.com/mcp' })).toBe('STREAMABLE_HTTP');
    });
});

describe('buildBulkImportServers', () => {
    it('parses Super-MCP style configs with schema headers, aliases, and extra fields', () => {
        const preview = buildBulkImportServers(JSON.stringify({
            $schema: 'https://example.com/schema.json',
            mcpServers: {
                filesystem: {
                    type: 'stdio',
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-filesystem@latest'],
                },
                github: {
                    type: 'http',
                    url: 'https://api.githubcopilot.com/mcp/',
                },
                wordpress: {
                    url: 'https://robertpelloni.com/wp-json/mcp/v1/example/sse',
                },
                imagesorcery: {
                    command: 'imagesorcery-mcp',
                    transportType: 'stdio',
                    autoApprove: ['blur'],
                    timeout: 100,
                },
                semgrepstream: {
                    type: 'streamable-http',
                    url: 'https://mcp.semgrep.ai/mcp',
                },
            },
        }));

        expect(preview.importedNames).toEqual([
            'filesystem',
            'github',
            'wordpress',
            'imagesorcery',
            'semgrepstream',
        ]);

        expect(preview.servers).toEqual([
            expect.objectContaining({ name: 'filesystem', type: 'STDIO', command: 'npx' }),
            expect.objectContaining({ name: 'github', type: 'STREAMABLE_HTTP', url: 'https://api.githubcopilot.com/mcp/' }),
            expect.objectContaining({ name: 'wordpress', type: 'SSE', url: 'https://robertpelloni.com/wp-json/mcp/v1/example/sse' }),
            expect.objectContaining({ name: 'imagesorcery', type: 'STDIO', command: 'imagesorcery-mcp' }),
            expect.objectContaining({ name: 'semgrepstream', type: 'STREAMABLE_HTTP', url: 'https://mcp.semgrep.ai/mcp' }),
        ]);
    });

    it('normalizes imported server names so bulk import matches HyperCode validation', () => {
        const preview = buildBulkImportServers(JSON.stringify({
            mcpServers: {
                'robertpelloni.com': {
                    url: 'https://robertpelloni.com/wp-json/mcp/v1/example/sse',
                },
                'my server': {
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-memory'],
                },
                'my.server': {
                    command: 'uvx',
                    args: ['basic-memory', 'mcp'],
                },
            },
        }));

        expect(preview.importedNames).toEqual([
            'robertpelloni-com',
            'my-server',
            'my-server-2',
        ]);
    });

    it('accepts a single server snippet without surrounding braces', () => {
        const preview = buildBulkImportServers(`
            "prism-mcp": {
                "command": "npx",
                "args": ["-y", "prism-mcp-server"]
            }
        `);

        expect(preview.importedNames).toEqual(['prism-mcp']);
        expect(preview.servers).toEqual([
            expect.objectContaining({
                name: 'prism-mcp',
                type: 'STDIO',
                command: 'npx',
                args: ['-y', 'prism-mcp-server'],
            }),
        ]);
    });
});
