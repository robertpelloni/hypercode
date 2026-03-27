import { describe, test, expect, beforeEach } from 'vitest';
import { DebateHistoryService } from '../debate-history.js';
import type { DevelopmentTask, CouncilDecision, Vote } from '../types.js';

describe('DebateHistoryService', () => {
  let service: DebateHistoryService;

  const mockTask: DevelopmentTask = {
    id: 'task-1',
    description: 'Implement user authentication',
    context: 'Building a secure login system',
    files: ['auth.ts', 'user.ts'],
  };

  const mockVotes: Vote[] = [
    { supervisor: 'GPT-4', approved: true, confidence: 0.9, weight: 1, comment: 'Looks good' },
    { supervisor: 'Claude', approved: true, confidence: 0.85, weight: 1, comment: 'Approved with suggestions' },
    { supervisor: 'Gemini', approved: false, confidence: 0.7, weight: 1, comment: 'Needs more tests' },
  ];

  const mockDecision: CouncilDecision = {
    approved: true,
    consensus: 0.67,
    weightedConsensus: 0.68,
    votes: mockVotes,
    reasoning: 'Majority approved the implementation',
    dissent: ['Gemini suggested more tests'],
  };

  beforeEach(() => {
    service = new DebateHistoryService();
    service.updateConfig({ enabled: true, autoSave: true });
    service.clearAll();
  });

  describe('saveDebate', () => {
    test('saves debate and returns record with id', () => {
      const record = service.saveDebate(mockTask, mockDecision, {
        debateRounds: 2,
        consensusMode: 'weighted',
      });

      expect(record.id).toMatch(/^debate_/);
      expect(record.task).toEqual(mockTask);
      expect(record.decision).toEqual(mockDecision);
      expect(record.metadata.debateRounds).toBe(2);
      expect(record.metadata.consensusMode).toBe('weighted');
      expect(record.metadata.supervisorCount).toBe(3);
      expect(record.metadata.participatingSupervisors).toEqual(['GPT-4', 'Claude', 'Gemini']);
    });

    test('emits debate_saved event', () => {
      let eventData: any = null;
      service.on('debate_saved', (data) => { eventData = data; });

      service.saveDebate(mockTask, mockDecision, {});

      expect(eventData).not.toBeNull();
      expect(eventData.task.id).toBe('task-1');
    });

    test('stores dynamic selection metadata', () => {
      const record = service.saveDebate(mockTask, mockDecision, {
        dynamicSelection: {
          enabled: true,
          taskType: 'security-audit',
          confidence: 0.95,
        },
      });

      expect(record.metadata.dynamicSelection?.enabled).toBe(true);
      expect(record.metadata.dynamicSelection?.taskType).toBe('security-audit');
      expect(record.metadata.dynamicSelection?.confidence).toBe(0.95);
    });
  });

  describe('getDebate', () => {
    test('retrieves saved debate by id', () => {
      const saved = service.saveDebate(mockTask, mockDecision, {});
      const retrieved = service.getDebate(saved.id);

      expect(retrieved).toEqual(saved);
    });

    test('returns undefined for non-existent id', () => {
      const result = service.getDebate('non-existent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('deleteRecord', () => {
    test('deletes existing record', () => {
      const saved = service.saveDebate(mockTask, mockDecision, {});
      const deleted = service.deleteRecord(saved.id);

      expect(deleted).toBe(true);
      expect(service.getDebate(saved.id)).toBeUndefined();
    });

    test('returns false for non-existent record', () => {
      const deleted = service.deleteRecord('non-existent');
      expect(deleted).toBe(false);
    });

    test('emits debate_deleted event', () => {
      let eventData: any = null;
      service.on('debate_deleted', (data) => { eventData = data; });

      const saved = service.saveDebate(mockTask, mockDecision, {});
      service.deleteRecord(saved.id);

      expect(eventData).not.toBeNull();
      expect(eventData.id).toBe(saved.id);
    });
  });

  describe('queryDebates', () => {
    beforeEach(() => {
      service.saveDebate(mockTask, mockDecision, { sessionId: 'session-1', consensusMode: 'weighted' });
      service.saveDebate(
        { ...mockTask, id: 'task-2' },
        { ...mockDecision, approved: false, consensus: 0.3 },
        { sessionId: 'session-2', consensusMode: 'unanimous' }
      );
      service.saveDebate(
        { ...mockTask, id: 'task-3' },
        { ...mockDecision, consensus: 0.9 },
        { sessionId: 'session-1', consensusMode: 'weighted' }
      );
    });

    test('returns all records by default', () => {
      const results = service.queryDebates();
      expect(results.length).toBe(3);
    });

    test('filters by sessionId', () => {
      const results = service.queryDebates({ sessionId: 'session-1' });
      expect(results.length).toBe(2);
    });

    test('filters by approved status', () => {
      const approved = service.queryDebates({ approved: true });
      expect(approved.length).toBe(2);

      const rejected = service.queryDebates({ approved: false });
      expect(rejected.length).toBe(1);
    });

    test('filters by supervisor name', () => {
      const results = service.queryDebates({ supervisorName: 'Claude' });
      expect(results.length).toBe(3);
    });

    test('filters by consensus range', () => {
      const highConsensus = service.queryDebates({ minConsensus: 0.8 });
      expect(highConsensus.length).toBe(1);

      const lowConsensus = service.queryDebates({ maxConsensus: 0.5 });
      expect(lowConsensus.length).toBe(1);
    });

    test('sorts by timestamp descending by default', () => {
      const results = service.queryDebates();
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].timestamp).toBeGreaterThanOrEqual(results[i].timestamp);
      }
    });

    test('sorts by consensus', () => {
      const results = service.queryDebates({ sortBy: 'consensus', sortOrder: 'asc' });
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].decision.consensus).toBeLessThanOrEqual(results[i].decision.consensus);
      }
    });

    test('applies pagination', () => {
      const page1 = service.queryDebates({ limit: 2, offset: 0 });
      const page2 = service.queryDebates({ limit: 2, offset: 2 });

      expect(page1.length).toBe(2);
      expect(page2.length).toBe(1);
    });
  });

  describe('getStats', () => {
    test('returns empty stats for no records', () => {
      const stats = service.getStats();

      expect(stats.totalDebates).toBe(0);
      expect(stats.approvalRate).toBe(0);
      expect(stats.averageConsensus).toBe(0);
    });

    test('calculates correct statistics', () => {
      service.saveDebate(mockTask, mockDecision, { consensusMode: 'weighted' });
      service.saveDebate(
        { ...mockTask, id: 'task-2' },
        { ...mockDecision, approved: false, consensus: 0.4 },
        { consensusMode: 'weighted' }
      );

      const stats = service.getStats();

      expect(stats.totalDebates).toBe(2);
      expect(stats.approvedCount).toBe(1);
      expect(stats.rejectedCount).toBe(1);
      expect(stats.approvalRate).toBe(0.5);
      expect(stats.debatesByConsensusMode['weighted']).toBe(2);
    });

    test('groups by supervisor', () => {
      service.saveDebate(mockTask, mockDecision, {});

      const stats = service.getStats();

      expect(stats.debatesBySupervisor['GPT-4']).toBe(1);
      expect(stats.debatesBySupervisor['Claude']).toBe(1);
      expect(stats.debatesBySupervisor['Gemini']).toBe(1);
    });
  });

  describe('getSupervisorVoteHistory', () => {
    test('returns empty history for unknown supervisor', () => {
      const history = service.getSupervisorVoteHistory('Unknown');

      expect(history.totalVotes).toBe(0);
      expect(history.approvals).toBe(0);
      expect(history.recentVotes).toEqual([]);
    });

    test('tracks supervisor voting patterns', () => {
      service.saveDebate(mockTask, mockDecision, {});
      service.saveDebate({ ...mockTask, id: 'task-2' }, mockDecision, {});

      const gpt4History = service.getSupervisorVoteHistory('GPT-4');
      expect(gpt4History.totalVotes).toBe(2);
      expect(gpt4History.approvals).toBe(2);
      expect(gpt4History.averageConfidence).toBe(0.9);

      const geminiHistory = service.getSupervisorVoteHistory('Gemini');
      expect(geminiHistory.totalVotes).toBe(2);
      expect(geminiHistory.approvals).toBe(0);
      expect(geminiHistory.rejections).toBe(2);
    });

    test('returns recent votes limited to 10', () => {
      for (let i = 0; i < 15; i++) {
        service.saveDebate({ ...mockTask, id: `task-${i}` }, mockDecision, {});
      }

      const history = service.getSupervisorVoteHistory('Claude');
      expect(history.recentVotes.length).toBe(10);
    });
  });

  describe('export functions', () => {
    beforeEach(() => {
      service.saveDebate(mockTask, mockDecision, { sessionId: 'test-session' });
    });

    test('exportToJson returns valid JSON', () => {
      const json = service.exportToJson();
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
      expect(parsed[0].task.id).toBe('task-1');
    });

    test('exportToCsv returns valid CSV', () => {
      const csv = service.exportToCsv();
      const lines = csv.split('\n');

      expect(lines.length).toBe(2);
      expect(lines[0]).toContain('id,timestamp');
      expect(lines[1]).toContain('task-1');
    });
  });

  describe('clearAll', () => {
    test('removes all records', () => {
      service.saveDebate(mockTask, mockDecision, {});
      service.saveDebate({ ...mockTask, id: 'task-2' }, mockDecision, {});

      const count = service.clearAll();

      expect(count).toBe(2);
      expect(service.getRecordCount()).toBe(0);
    });

    test('emits cleared event', () => {
      let eventData: any = null;
      service.on('cleared', (data) => { eventData = data; });

      service.saveDebate(mockTask, mockDecision, {});
      service.clearAll();

      expect(eventData).not.toBeNull();
      expect(eventData.count).toBe(1);
    });
  });

  describe('config management', () => {
    test('getConfig returns current config', () => {
      const config = service.getConfig();

      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('maxRecords');
      expect(config).toHaveProperty('retentionDays');
    });

    test('updateConfig updates and returns new config', () => {
      const updated = service.updateConfig({ maxRecords: 500 });

      expect(updated.maxRecords).toBe(500);
      expect(service.getConfig().maxRecords).toBe(500);
    });

    test('emits config_updated event', () => {
      let eventData: any = null;
      service.on('config_updated', (data) => { eventData = data; });

      service.updateConfig({ retentionDays: 30 });

      expect(eventData).not.toBeNull();
      expect(eventData.retentionDays).toBe(30);
    });
  });

  describe('isEnabled/getRecordCount', () => {
    test('isEnabled reflects config', () => {
      service.updateConfig({ enabled: true });
      expect(service.isEnabled()).toBe(true);

      service.updateConfig({ enabled: false });
      expect(service.isEnabled()).toBe(false);
    });

    test('getRecordCount returns correct count', () => {
      expect(service.getRecordCount()).toBe(0);

      service.saveDebate(mockTask, mockDecision, {});
      expect(service.getRecordCount()).toBe(1);

      service.saveDebate({ ...mockTask, id: 'task-2' }, mockDecision, {});
      expect(service.getRecordCount()).toBe(2);
    });
  });

  describe('pruning', () => {
    test('prunes when exceeding maxRecords', () => {
      service.updateConfig({ maxRecords: 3 });

      for (let i = 0; i < 5; i++) {
        service.saveDebate({ ...mockTask, id: `task-${i}` }, mockDecision, {});
      }

      expect(service.getRecordCount()).toBe(3);
    });
  });
});
