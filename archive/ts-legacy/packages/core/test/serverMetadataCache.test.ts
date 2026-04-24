import { describe, expect, it } from 'vitest';

import {
    buildBinaryDiscoveryMetadata,
    buildServerConfigFingerprint,
    hasReusableMetadataCache,
    hydrateMetadataFromCache,
} from '../src/mcp/serverMetadataCache.ts';

const baseServer = {
    uuid: 'server-1',
    name: 'demo',
    description: null as string | null,
    always_on: false,
    type: 'STDIO' as const,
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    env: { DEMO_TOKEN: 'secret' },
    url: null,
    headers: {},
    bearerToken: null,
};

describe('server metadata cache', () => {
    it('captures rich tool metadata from a successful binary load', () => {
        const metadata = buildBinaryDiscoveryMetadata(baseServer, [
            {
                name: 'search_docs',
                title: 'Search Docs',
                description: 'Searches documentation',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: { type: 'string' },
                    },
                    required: ['query'],
                },
                outputSchema: {
                    type: 'object',
                    properties: {
                        results: { type: 'array' },
                    },
                },
                annotations: {
                    readOnlyHint: true,
                },
            },
        ], '2026-03-09T00:00:00.000Z');

        expect(metadata.metadataSource).toBe('binary');
        expect(metadata.lastSuccessfulBinaryLoadAt).toBe('2026-03-09T00:00:00.000Z');
        expect(metadata.configFingerprint).toBe(buildServerConfigFingerprint(baseServer));
        expect(metadata.tools).toHaveLength(1);
        expect(metadata.tools[0]).toMatchObject({
            name: 'search_docs',
            title: 'Search Docs',
            description: 'Searches documentation',
        });
        expect(metadata.tools[0].inputSchema).toMatchObject({
            properties: {
                query: { type: 'string' },
            },
            required: ['query'],
        });
        expect(metadata.tools[0].annotations).toEqual({ readOnlyHint: true });
        expect(metadata.tools[0].raw?.outputSchema).toBeTruthy();
    });

    it('reuses cached metadata only when the launch fingerprint still matches', () => {
        const cached = buildBinaryDiscoveryMetadata(baseServer, [{ name: 'ping' }], '2026-03-09T00:00:00.000Z');

        expect(hasReusableMetadataCache(cached, baseServer)).toBe(true);
        expect(hasReusableMetadataCache(cached, {
            ...baseServer,
            args: ['-y', '@modelcontextprotocol/server-filesystem'],
        })).toBe(false);
    });

    it('hydrates cached metadata without pretending it came from a fresh binary load', () => {
        const cached = buildBinaryDiscoveryMetadata(baseServer, [{ name: 'search_docs' }], '2026-03-09T00:00:00.000Z');
        const hydrated = hydrateMetadataFromCache(cached, baseServer, '2026-03-09T01:00:00.000Z');

        expect(hydrated.metadataSource).toBe('cache');
        expect(hydrated.cacheHydratedAt).toBe('2026-03-09T01:00:00.000Z');
        expect(hydrated.lastSuccessfulBinaryLoadAt).toBe('2026-03-09T00:00:00.000Z');
        expect(hydrated.toolCount).toBe(1);
        expect(hydrated.tools[0].name).toBe('search_docs');
    });
});