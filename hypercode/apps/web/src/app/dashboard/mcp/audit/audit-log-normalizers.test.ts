import { describe, expect, it } from 'vitest';

import { normalizeAuditLogs } from './audit-log-normalizers';

describe('audit log normalizers', () => {
  it('normalizes malformed mixed audit entries into safe rows', () => {
    const rows = normalizeAuditLogs([
      null,
      42,
      {
        id: '',
        action: 'mcp.server.add',
        actor: '  ',
        resource: '',
        timestamp: null,
        details: { server: 'filesystem' },
      },
      {
        id: 'evt-2',
        action: 'mcp.server.remove',
        actor: 'operator',
        resource: 'server/fs',
        timestamp: '2026-03-13T00:00:00.000Z',
        details: null,
      },
    ] as any);

    expect(rows).toEqual([
      {
        id: 'mcp.server.add-3',
        action: 'mcp.server.add',
        actor: null,
        resource: 'unknown.resource',
        timestamp: '1970-01-01T00:00:00.000Z',
        details: { server: 'filesystem' },
      },
      {
        id: 'evt-2',
        action: 'mcp.server.remove',
        actor: 'operator',
        resource: 'server/fs',
        timestamp: '2026-03-13T00:00:00.000Z',
        details: null,
      },
    ]);
  });

  it('returns an empty list for non-array payloads', () => {
    expect(normalizeAuditLogs({ bad: true } as any)).toEqual([]);
    expect(normalizeAuditLogs(undefined as any)).toEqual([]);
  });
});
