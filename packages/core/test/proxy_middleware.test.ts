import { describe, expect, test, vi } from 'vitest';

vi.mock('../src/db/index.js', () => ({
    db: {
        select: vi.fn(() => ({
            from: vi.fn(() => ({
                where: vi.fn().mockResolvedValue([]),
            })),
            innerJoin: vi.fn(() => ({
                where: vi.fn().mockResolvedValue([]),
            })),
        })),
    },
}));

describe('proxy middleware', () => {
    test('blocks tool calls outside the dynamic allowedTools whitelist', async () => {
        const { createFilterCallToolMiddleware } = await import('../src/services/legacy-proxy-middleware/filter-tools.functional.js');

        const next = vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'should not run' }],
        });

        const handler = createFilterCallToolMiddleware({ cacheEnabled: true })(next);
        const context: MetaMCPHandlerContext = {
            namespaceUuid: 'ns1',
            sessionId: 'session-1',
        };

        const result = await handler({
            method: 'tools/call',
            params: {
                name: 'run_code',
                arguments: { code: 'return 1;' },
                _meta: { allowedTools: ['search_tools'] },
            },
        } as never, context);

        expect(next).not.toHaveBeenCalled();
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('not in the allowed tools list');
    });

    test('permits tool calls that are explicitly whitelisted in allowedTools', async () => {
        const { createFilterCallToolMiddleware } = await import('../src/services/legacy-proxy-middleware/filter-tools.functional.js');

        const next = vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'ok' }],
        });

        const handler = createFilterCallToolMiddleware({ cacheEnabled: true })(next);
        const context: MetaMCPHandlerContext = {
            namespaceUuid: 'ns1',
            sessionId: 'session-1',
        };
        const request = {
            method: 'tools/call',
            params: {
                name: 'search_tools',
                arguments: { query: 'github issues' },
                _meta: { allowedTools: ['search_tools'] },
            },
        };

        const result = await handler(request as never, context);

        expect(next).toHaveBeenCalledWith(request, context);
        expect(result).toEqual({
            content: [{ type: 'text', text: 'ok' }],
        });
    });
});
