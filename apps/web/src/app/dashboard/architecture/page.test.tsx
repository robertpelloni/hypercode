import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const mockState = {
  gitModulesError: null as { message: string } | null,
  gitModules: [] as unknown[],
};

vi.mock('@/components/Mermaid', () => ({
  default: ({ chart }: { chart: string }) => <pre>{chart}</pre>,
}));

vi.mock('@/utils/trpc', () => {
  const createUseQuery = <T,>(getData: () => T, getError?: () => { message: string } | null) => () => ({
    data: getData(),
    error: getError ? getError() : null,
    isLoading: false,
  });

  return {
    trpc: {
      git: {
        getModules: {
          useQuery: createUseQuery(() => mockState.gitModules, () => mockState.gitModulesError),
        },
      },
      graph: {
        get: {
          useQuery: createUseQuery(() => ({ dependencies: {} })),
        },
      },
    },
  };
});

describe('ArchitecturePage', () => {
  it('renders git module query errors instead of the empty-state copy', async () => {
    mockState.gitModules = [];
    mockState.gitModulesError = { message: 'Git modules are unavailable: Malformed .gitmodules file' };

    const { default: ArchitecturePage } = await import('./page');
    const html = renderToStaticMarkup(<ArchitecturePage />);

    expect(html).toContain('Git modules are unavailable: Malformed .gitmodules file');
    expect(html).not.toContain('No submodules found (.gitmodules empty)');
  });
});
