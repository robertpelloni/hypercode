import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const mockState = {
  contextError: null as { message: string } | null,
  handoffsError: null as { message: string } | null,
};

<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/project/page.test.tsx
vi.mock('@hypercode/ui', () => ({
=======
vi.mock('@borg/ui', () => ({
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/project/page.test.tsx
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  Badge: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/utils/trpc', () => ({
  trpc: {
    useContext: () => ({}),
    project: {
      getContext: {
        useQuery: () => ({
          data: '# Project Context',
          isLoading: false,
          error: mockState.contextError,
        }),
      },
      getHandoffs: {
        useQuery: () => ({
          data: [],
          isLoading: false,
          error: mockState.handoffsError,
        }),
      },
      updateContext: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
    },
    agentMemory: {
      pickup: {
        useMutation: () => ({
          mutate: vi.fn(),
        }),
      },
    },
  },
}));

describe('ProjectPage', () => {
  it('renders explicit project query errors instead of fallback empty-state copy', async () => {
    mockState.contextError = { message: 'Project context is unavailable: permission denied' };
    mockState.handoffsError = { message: 'Project handoffs are unavailable: directory unreadable' };

    const { default: ProjectPage } = await import('./page');
    const html = renderToStaticMarkup(<ProjectPage />);

    expect(html).toContain('Project context is unavailable: permission denied');
    expect(html).toContain('Project handoffs are unavailable: directory unreadable');
    expect(html).not.toContain('No previous handoffs found.');
  });
});
