import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

type DetectionMode = 'present' | 'missing';

const mockState: {
  cliDetectionMode: DetectionMode;
  executionEnvironmentMode: DetectionMode;
  cliDetections: unknown;
  executionEnvironmentData: Record<string, any>;
  providerQuotas: unknown;
  sessions: unknown;
} = {
  cliDetectionMode: 'present',
  executionEnvironmentMode: 'present',
  cliDetections: [
    {
      id: 'claude',
      name: 'Claude Code',
      command: 'claude',
      homepage: 'https://example.com/claude',
      docsUrl: 'https://example.com/docs/claude',
      installHint: 'install claude',
      sessionCapable: true,
      installed: true,
      resolvedPath: 'C:/bin/claude.cmd',
      version: '1.0.0',
      detectionError: null,
    },
  ],
  executionEnvironmentData: {
    summary: {
      preferredShellLabel: 'PowerShell 7',
      verifiedShellCount: 1,
      shellCount: 1,
      verifiedToolCount: 1,
      toolCount: 1,
      ready: true,
    },
    shells: [
      {
        id: 'pwsh',
        name: 'PowerShell',
        verified: true,
        installed: true,
        preferred: true,
        resolvedPath: 'C:/Program Files/PowerShell/7/pwsh.exe',
        family: 'powershell',
        version: '7.5.0',
      },
    ],
    tools: [
      {
        id: 'node',
        name: 'Node.js',
        verified: true,
        installed: true,
        resolvedPath: 'C:/Program Files/nodejs/node.exe',
        version: '22.0.0',
        capabilities: ['runtime'],
      },
    ],
  },
  providerQuotas: [],
  sessions: [],
};

vi.mock('@/utils/trpc', () => {
  const createUseQuery = <T,>(getData: () => T, isLoading = false) => () => ({
    data: getData(),
    isLoading,
    refetch: vi.fn(async () => undefined),
  });

  const createUseMutation = () => () => ({
    mutate: vi.fn(),
    isPending: false,
    variables: undefined,
  });

  return {
    trpc: {
      tools: {
        list: {
          useQuery: createUseQuery(() => [
            {
              uuid: 'tool-1',
              name: 'code.search',
              description: 'Searches codebase',
              server: 'core',
            },
          ]),
        },
        get detectCliHarnesses() {
          if (mockState.cliDetectionMode === 'missing') {
            return undefined;
          }
          return {
            useQuery: createUseQuery(() => mockState.cliDetections),
          };
        },
        get detectExecutionEnvironment() {
          if (mockState.executionEnvironmentMode === 'missing') {
            return undefined;
          }
          return {
            useQuery: createUseQuery(() => mockState.executionEnvironmentData),
          };
        },
      },
      mcpServers: {
        list: {
          useQuery: createUseQuery(() => [
            {
              uuid: 'server-1',
              name: 'core',
              error_status: 'NONE',
              _meta: {
                status: 'ready',
                metadataSource: 'cache',
                toolCount: 1,
                lastSuccessfulBinaryLoadAt: '2026-03-13T00:00:00.000Z',
              },
            },
          ]),
        },
        reloadMetadata: {
          useMutation: createUseMutation(),
        },
        clearMetadataCache: {
          useMutation: createUseMutation(),
        },
      },
      apiKeys: {
        list: {
          useQuery: createUseQuery(() => []),
        },
      },
      billing: {
        getProviderQuotas: {
          useQuery: createUseQuery(() => mockState.providerQuotas),
        },
      },
      session: {
        list: {
          useQuery: createUseQuery(() => mockState.sessions),
        },
        getState: {
          useQuery: createUseQuery(() => ({
            isAutoDriveActive: false,
            activeGoal: null,
          })),
        },
      },
      expert: {
        getStatus: {
          useQuery: createUseQuery(() => ({
            researcher: 'idle',
            coder: 'idle',
          })),
        },
      },
      agentMemory: {
        stats: {
          useQuery: createUseQuery(() => ({
            session: 0,
            working: 0,
            longTerm: 0,
            total: 0,
          })),
        },
      },
      shell: {
        getSystemHistory: {
          useQuery: createUseQuery(() => []),
        },
      },
      serverHealth: {
        check: {
          useQuery: createUseQuery(() => ({
            status: 'healthy',
            crashCount: 0,
            maxAttempts: 5,
          })),
        },
      },
    },
  };
});

vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock('@hypercode/ui', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  CardHeader: ({ children, ...props }: any) => <header {...props}>{children}</header>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

import AIToolsDashboard from './page';

describe('AIToolsDashboard optional detection hooks', () => {
  it('renders with CLI detection query missing while execution environment remains available', () => {
    mockState.cliDetectionMode = 'missing';
    mockState.executionEnvironmentMode = 'present';

    const html = renderToStaticMarkup(<AIToolsDashboard />);

    expect(html).toContain('AI Tools');
    expect(html).toContain('Execution Environment');
    expect(html).toContain('PowerShell 7');
    expect(html).toContain('No CLI harness detections available yet.');
  });

  it('renders with execution-environment query missing while CLI detection remains available', () => {
    mockState.cliDetectionMode = 'present';
    mockState.executionEnvironmentMode = 'missing';

    const html = renderToStaticMarkup(<AIToolsDashboard />);

    expect(html).toContain('CLI Harness Directory');
    expect(html).toContain('Claude Code');
    expect(html).toContain('Execution environment details are still loading.');
  });

  it('renders when both optional detection queries are unavailable', () => {
    mockState.cliDetectionMode = 'missing';
    mockState.executionEnvironmentMode = 'missing';

    const html = renderToStaticMarkup(<AIToolsDashboard />);

    expect(html).toContain('AI Tools');
    expect(html).toContain('No CLI harness detections available yet.');
    expect(html).toContain('Execution environment details are still loading.');
    expect(html).toContain('Search Tool Inventory');
  });

  it('renders safely when execution-environment payload is present but sparse', () => {
    const previous = mockState.executionEnvironmentData;
    mockState.cliDetectionMode = 'present';
    mockState.executionEnvironmentMode = 'present';
    mockState.executionEnvironmentData = {
      summary: {},
    };

    const html = renderToStaticMarkup(<AIToolsDashboard />);

    expect(html).toContain('Execution Environment');
    expect(html).toContain('None verified');
    expect(html).toContain('0/0');

    mockState.executionEnvironmentData = previous;
  });

  it('renders safely when execution-environment shells/tools contain malformed entries', () => {
    const previous = mockState.executionEnvironmentData;
    mockState.cliDetectionMode = 'present';
    mockState.executionEnvironmentMode = 'present';
    mockState.executionEnvironmentData = {
      summary: {},
      shells: [
        {
          id: '',
          name: 123,
          verified: 'yes',
          installed: null,
          family: '',
        },
        'invalid-shell',
      ],
      tools: [
        {
          id: null,
          name: null,
          capabilities: 'runtime',
        },
        null,
      ],
    };

    const html = renderToStaticMarkup(<AIToolsDashboard />);

    expect(html).toContain('Execution Environment');
    expect(html).toContain('Unknown shell');
    expect(html).toContain('Unknown tool');
    expect(html).toContain('0/2');

    mockState.executionEnvironmentData = previous;
  });

  it('renders safely when list payloads are malformed non-arrays', () => {
    const previousCliDetections = mockState.cliDetections;
    const previousProviderQuotas = mockState.providerQuotas;
    const previousSessions = mockState.sessions;

    mockState.cliDetectionMode = 'present';
    mockState.executionEnvironmentMode = 'present';
    mockState.cliDetections = { not: 'an-array' };
    mockState.providerQuotas = 'invalid-quotas';
    mockState.sessions = { invalid: true };

    const html = renderToStaticMarkup(<AIToolsDashboard />);

    expect(html).toContain('AI Tools');
    expect(html).toContain('No CLI harness detections available yet.');
    expect(html).toContain('Connected Providers');
    expect(html).toContain('0/13');

    mockState.cliDetections = previousCliDetections;
    mockState.providerQuotas = previousProviderQuotas;
    mockState.sessions = previousSessions;
  });
});
