import { describe, expect, it } from 'vitest';

import {
  filterSecurityAuditLogs,
  normalizeSecurityAuditLogs,
  normalizeSecurityAutonomyLevel,
} from './security-page-normalizers';

describe('security page normalizers', () => {
  it('normalizes malformed audit logs into safe rows', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    const logs = normalizeSecurityAuditLogs([
      {
        timestamp: 1710000000000,
        action: ' tool.call ',
        params: { tool: 'read_file' },
        level: 'warn',
      },
      {
        timestamp: 'bad',
        action: '',
        params: circular,
        level: 'unknown',
      },
      null,
    ] as any);

    expect(logs[0]).toEqual({
      timestamp: 1710000000000,
      action: 'tool.call',
      params: { tool: 'read_file' },
      level: 'WARN',
    });

    expect(logs[1].action).toBe('unknown.action.2');
    expect(logs[1].level).toBe('INFO');
    expect(typeof logs[1].timestamp).toBe('number');

    expect(logs[2].action).toBe('unknown.action.3');
    expect(logs[2].params).toBeNull();
  });

  it('filters logs by level/search and survives unserializable params', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    const logs = normalizeSecurityAuditLogs([
      { timestamp: 1, action: 'mcp.server.add', params: { server: 'fs' }, level: 'INFO' },
      { timestamp: 2, action: 'policy.denied', params: circular, level: 'ERROR' },
    ] as any);

    expect(filterSecurityAuditLogs(logs, 'ERROR', '')).toHaveLength(1);
    expect(() => filterSecurityAuditLogs(logs, 'ALL', 'unserializable')).not.toThrow();
    expect(filterSecurityAuditLogs(logs, 'ALL', 'mcp.server')).toHaveLength(1);
  });

  it('normalizes autonomy level to supported values', () => {
    expect(normalizeSecurityAutonomyLevel('low')).toBe('low');
    expect(normalizeSecurityAutonomyLevel('medium')).toBe('medium');
    expect(normalizeSecurityAutonomyLevel('high')).toBe('high');
    expect(normalizeSecurityAutonomyLevel('experimental')).toBe('low');
    expect(normalizeSecurityAutonomyLevel(undefined)).toBe('low');
  });
});
