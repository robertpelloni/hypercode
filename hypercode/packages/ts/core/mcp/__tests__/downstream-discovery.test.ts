import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/fetch-metamcp.service.js', () => ({
    getMcpServers: vi.fn(),
}));

vi.mock('../../src/services/mcp-server-pool.service.js', () => ({
    mcpServerPool: {
        getSession: vi.fn(),
    },
}));

import {
    getDownstreamPrompt,
    isSameServerInstance,
    listDownstreamPrompts,
    listDownstreamResources,
    listDownstreamResourceTemplates,
    readDownstreamResource,
} from '../../src/mcp/downstreamDiscovery.ts';
import { getMcpServers } from '../../src/services/fetch-metamcp.service.js';
import { mcpServerPool } from '../../src/services/mcp-server-pool.service.js';

function createSession(options: {
    serverName?: string;
    capabilities?: { prompts?: object; resources?: object };
    request?: (payload: { method: string; params?: Record<string, unknown> }) => Promise<unknown>;
}) {
    return {
        client: {
            getServerVersion: () => ({ name: options.serverName ?? 'github' }),
            getServerCapabilities: () => options.capabilities ?? {},
            request: vi.fn((payload) => options.request?.(payload) ?? Promise.resolve({})),
        },
        cleanup: vi.fn(),
    };
}

describe('downstreamDiscovery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('filters self-referencing downstream servers', async () => {
        vi.mocked(getMcpServers).mockResolvedValue({
            self: {
                uuid: 'self',
                name: 'metamcp-unified-hypercode-core-namespace',
                type: 'STDIO',
                status: 'active',
                error_status: 'none',
                created_at: new Date().toISOString(),
                stderr: 'inherit',
                command: 'node',
                args: [],
                env: {},
                url: null,
                headers: {},
                oauth_tokens: null,
                bearerToken: undefined,
            },
        });

        const result = await listDownstreamPrompts({
            context: {
                namespaceUuid: 'hypercode-core-namespace',
                sessionId: 'hypercode-core-session',
            },
            promptToClient: {},
        });

        expect(result.prompts).toEqual([]);
        expect(mcpServerPool.getSession).not.toHaveBeenCalled();
        expect(isSameServerInstance({ name: 'metamcp-unified-hypercode-core-namespace' }, 'hypercode-core-namespace')).toBe(true);
    });

    it('lists prompts and caches prompt ownership by prefixed name', async () => {
        const session = createSession({
            serverName: 'GitHub Cloud',
            capabilities: { prompts: {} },
            request: async ({ method }) => {
                expect(method).toBe('prompts/list');
                return {
                    prompts: [{ name: 'summarize_issue', description: 'Summarize issue' }],
                };
            },
        });
        vi.mocked(getMcpServers).mockResolvedValue({
            github: {
                uuid: 'github',
                name: 'GitHub Cloud',
                type: 'STDIO',
                status: 'active',
                error_status: 'none',
                created_at: new Date().toISOString(),
                stderr: 'inherit',
                command: 'node',
                args: [],
                env: {},
                url: null,
                headers: {},
                oauth_tokens: null,
                bearerToken: undefined,
            },
        });
        vi.mocked(mcpServerPool.getSession).mockResolvedValue(session as never);
        const promptToClient: Record<string, unknown> = {};

        const result = await listDownstreamPrompts({
            context: {
                namespaceUuid: 'hypercode-core-namespace',
                sessionId: 'hypercode-core-session',
            },
            cursor: 'cursor-1',
            meta: { trace: true },
            promptToClient: promptToClient as never,
        });

        expect(result).toEqual({
            prompts: [{ name: 'GitHubCloud__summarize_issue', description: 'Summarize issue' }],
            nextCursor: 'cursor-1',
        });
        expect(promptToClient).toHaveProperty('GitHubCloud__summarize_issue', session);
    });

    it('fetches a prompt by stripping the HyperCode server prefix', async () => {
        const session = createSession({
            serverName: 'GitHub Cloud',
            capabilities: { prompts: {} },
            request: async ({ method, params }) => {
                expect(method).toBe('prompts/get');
                expect(params).toEqual({
                    name: 'summarize_issue',
                    arguments: { issue: 42 },
                    _meta: { trace: true },
                });
                return {
                    messages: [{ role: 'user', content: { type: 'text', text: 'Issue 42' } }],
                };
            },
        });

        const result = await getDownstreamPrompt({
            name: 'GitHubCloud__summarize_issue',
            arguments: { issue: 42 },
            meta: { trace: true },
            promptToClient: {
                GitHubCloud__summarize_issue: session as never,
            },
        });

        expect(result).toEqual({
            messages: [{ role: 'user', content: { type: 'text', text: 'Issue 42' } }],
        });
    });

    it('lists resources and reads them through the cached downstream owner', async () => {
        const session = createSession({
            serverName: 'Docs Server',
            capabilities: { resources: {} },
            request: async ({ method, params }) => {
                if (method === 'resources/list') {
                    return {
                        resources: [{ uri: 'file:///guide.md', name: 'Guide' }],
                    };
                }

                expect(method).toBe('resources/read');
                expect(params).toEqual({
                    uri: 'file:///guide.md',
                    _meta: { trace: true },
                });
                return {
                    contents: [{ uri: 'file:///guide.md', text: '# Guide' }],
                };
            },
        });
        vi.mocked(getMcpServers).mockResolvedValue({
            docs: {
                uuid: 'docs',
                name: 'Docs Server',
                type: 'STDIO',
                status: 'active',
                error_status: 'none',
                created_at: new Date().toISOString(),
                stderr: 'inherit',
                command: 'node',
                args: [],
                env: {},
                url: null,
                headers: {},
                oauth_tokens: null,
                bearerToken: undefined,
            },
        });
        vi.mocked(mcpServerPool.getSession).mockResolvedValue(session as never);
        const resourceToClient: Record<string, unknown> = {};

        const listResult = await listDownstreamResources({
            context: {
                namespaceUuid: 'hypercode-core-namespace',
                sessionId: 'hypercode-core-session',
            },
            resourceToClient: resourceToClient as never,
        });

        expect(listResult.resources).toEqual([{ uri: 'file:///guide.md', name: 'Guide' }]);
        expect(resourceToClient).toHaveProperty('file:///guide.md', session);

        const readResult = await readDownstreamResource({
            uri: 'file:///guide.md',
            meta: { trace: true },
            resourceToClient: resourceToClient as never,
        });

        expect(readResult).toEqual({
            contents: [{ uri: 'file:///guide.md', text: '# Guide' }],
        });
    });

    it('lists resource templates through downstream MCP sessions', async () => {
        const session = createSession({
            serverName: 'Docs Server',
            capabilities: { resources: {} },
            request: async ({ method }) => {
                expect(method).toBe('resources/templates/list');
                return {
                    resourceTemplates: [{ uriTemplate: 'file:///docs/{slug}.md', name: 'Doc page' }],
                };
            },
        });
        vi.mocked(getMcpServers).mockResolvedValue({
            docs: {
                uuid: 'docs',
                name: 'Docs Server',
                type: 'STDIO',
                status: 'active',
                error_status: 'none',
                created_at: new Date().toISOString(),
                stderr: 'inherit',
                command: 'node',
                args: [],
                env: {},
                url: null,
                headers: {},
                oauth_tokens: null,
                bearerToken: undefined,
            },
        });
        vi.mocked(mcpServerPool.getSession).mockResolvedValue(session as never);

        const result = await listDownstreamResourceTemplates({
            context: {
                namespaceUuid: 'hypercode-core-namespace',
                sessionId: 'hypercode-core-session',
            },
        });

        expect(result).toEqual({
            resourceTemplates: [{ uriTemplate: 'file:///docs/{slug}.md', name: 'Doc page' }],
            nextCursor: undefined,
        });
    });
});
