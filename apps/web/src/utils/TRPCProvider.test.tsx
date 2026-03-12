import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const { httpBatchLinkMock, createClientMock } = vi.hoisted(() => ({
  httpBatchLinkMock: vi.fn((options: unknown) => ({ type: 'httpBatchLink', options })),
  createClientMock: vi.fn((options: unknown) => ({ options })),
}));

vi.mock('@trpc/client', () => ({
  httpBatchLink: httpBatchLinkMock,
}));

vi.mock('./trpc', () => ({
  trpc: {
    createClient: createClientMock,
    Provider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  },
}));

import { TRPCProvider } from './TRPCProvider';

describe('TRPCProvider', () => {
  it('uses the default batch link transport without forcing POST for queries', () => {
    renderToStaticMarkup(
      React.createElement(
        TRPCProvider,
        null,
        React.createElement('div', null, 'dashboard'),
      ),
    );

    expect(httpBatchLinkMock).toHaveBeenCalledTimes(1);
    expect(httpBatchLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://localhost:3000/api/trpc',
      }),
    );
    expect(httpBatchLinkMock.mock.calls[0]?.[0]).not.toHaveProperty('methodOverride');
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });
});