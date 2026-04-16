import { describe, expect, test, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('proxy logging middleware', () => {
  test('denies tool calls rejected by an attached policy id', async () => {
    const { createPolicyMiddleware } = await import('../src/services/legacy-proxy-middleware/policy.functional.js');
    const { policyService } = await import('../src/services/stubs/policy.service.stub.js');

    const next = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'ok' }],
    });

    vi.spyOn(policyService, 'getPolicy').mockResolvedValue({ id: 'policy-1' } as never);
    vi.spyOn(policyService, 'evaluateAccess').mockReturnValue(false);

    const middleware = createPolicyMiddleware({ enabled: true });
    const handler = middleware(next);
    const request = {
      method: 'tools/call',
      params: {
        name: 'github__create_issue',
        arguments: { title: 'Bug' },
        _meta: { policyId: 'policy-1' },
      },
    };
    const context: MetaMCPHandlerContext = {
      namespaceUuid: 'ns1',
      sessionId: 'session-1',
    };

    await expect(handler(request as never, context)).rejects.toThrow(
      "Access denied to tool 'github__create_issue' by policy 'policy-1'.",
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('passes through when no policy id is attached', async () => {
    const { createPolicyMiddleware } = await import('../src/services/legacy-proxy-middleware/policy.functional.js');

    const next = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'ok' }],
    });

    const middleware = createPolicyMiddleware({ enabled: true });
    const handler = middleware(next);
    const request = {
      method: 'tools/call',
      params: {
        name: 'github__create_issue',
        arguments: { title: 'Bug' },
      },
    };
    const context: MetaMCPHandlerContext = {
      namespaceUuid: 'ns1',
      sessionId: 'session-1',
    };

    const result = await handler(request as never, context);

    expect(next).toHaveBeenCalledWith(request, context);
    expect(result).toEqual({
      content: [{ type: 'text', text: 'ok' }],
    });
  });
});
