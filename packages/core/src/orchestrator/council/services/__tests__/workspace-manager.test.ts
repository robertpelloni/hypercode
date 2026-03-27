import { describe, it, expect, beforeEach } from 'vitest';
import { WorkspaceManagerService } from '../workspace-manager.js';
import type { CouncilDecision } from '../types.js';

describe('WorkspaceManagerService', () => {
  let manager: WorkspaceManagerService;

  beforeEach(() => {
    manager = new WorkspaceManagerService();
    manager.clearAllWorkspaces();
  });

  describe('workspace CRUD', () => {
    it('should create a workspace with default config', () => {
      const workspace = manager.createWorkspace('Test Project', '/path/to/project');
      
      expect(workspace.id).toMatch(/^ws_/);
      expect(workspace.name).toBe('Test Project');
      expect(workspace.path).toBe('/path/to/project');
      expect(workspace.status).toBe('active');
      expect(workspace.config.defaultConsensusMode).toBe('weighted');
      expect(workspace.config.defaultDebateRounds).toBe(2);
      expect(workspace.metadata.totalDebates).toBe(0);
    });

    it('should create a workspace with custom config', () => {
      const workspace = manager.createWorkspace('Custom Project', '/custom/path', {
        defaultConsensusMode: 'unanimous',
        defaultDebateRounds: 3,
        supervisorTeam: ['gpt-4', 'claude'],
        budgetLimit: 100,
      }, 'A custom project');
      
      expect(workspace.config.defaultConsensusMode).toBe('unanimous');
      expect(workspace.config.defaultDebateRounds).toBe(3);
      expect(workspace.config.supervisorTeam).toEqual(['gpt-4', 'claude']);
      expect(workspace.config.budgetLimit).toBe(100);
      expect(workspace.description).toBe('A custom project');
    });

    it('should get workspace by id', () => {
      const created = manager.createWorkspace('Test', '/test');
      const retrieved = manager.getWorkspace(created.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test');
    });

    it('should get workspace by path', () => {
      manager.createWorkspace('Test', '/unique/path');
      const retrieved = manager.getWorkspaceByPath('/unique/path');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test');
    });

    it('should return undefined for non-existent workspace', () => {
      expect(manager.getWorkspace('non-existent')).toBeUndefined();
    });

    it('should get all workspaces', () => {
      manager.createWorkspace('Project 1', '/path1');
      manager.createWorkspace('Project 2', '/path2');
      
      const all = manager.getAllWorkspaces();
      expect(all.length).toBe(2);
    });

    it('should update workspace', () => {
      const workspace = manager.createWorkspace('Original', '/path');
      const updated = manager.updateWorkspace(workspace.id, { name: 'Updated' });
      
      expect(updated?.name).toBe('Updated');
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(workspace.createdAt.getTime());
    });

    it('should update workspace config', () => {
      const workspace = manager.createWorkspace('Test', '/path');
      const updated = manager.updateWorkspaceConfig(workspace.id, { defaultDebateRounds: 5 });
      
      expect(updated?.config.defaultDebateRounds).toBe(5);
    });

    it('should delete workspace', () => {
      const workspace = manager.createWorkspace('ToDelete', '/path');
      const deleted = manager.deleteWorkspace(workspace.id);
      
      expect(deleted).toBe(true);
      expect(manager.getWorkspace(workspace.id)).toBeUndefined();
    });

    it('should archive workspace', () => {
      const workspace = manager.createWorkspace('ToArchive', '/path');
      const archived = manager.archiveWorkspace(workspace.id);
      
      expect(archived?.status).toBe('archived');
    });
  });

  describe('workspace filtering', () => {
    beforeEach(() => {
      const ws1 = manager.createWorkspace('Active 1', '/path1', { tags: ['frontend'] });
      const ws2 = manager.createWorkspace('Active 2', '/path2', { tags: ['backend'] });
      manager.createWorkspace('Paused', '/path3', { tags: ['frontend'] });
      manager.updateWorkspace(manager.getAllWorkspaces()[2].id, { status: 'paused' });
    });

    it('should filter by status', () => {
      const active = manager.getWorkspacesByStatus('active');
      expect(active.length).toBe(2);
    });

    it('should filter by tag', () => {
      const frontend = manager.getWorkspacesByTag('frontend');
      expect(frontend.length).toBe(2);
    });
  });

  describe('active workspace', () => {
    it('should set and get active workspace', () => {
      const workspace = manager.createWorkspace('Test', '/path');
      const success = manager.setActiveWorkspace(workspace.id);
      
      expect(success).toBe(true);
      expect(manager.getActiveWorkspace()?.id).toBe(workspace.id);
    });

    it('should not set archived workspace as active', () => {
      const workspace = manager.createWorkspace('Test', '/path');
      manager.archiveWorkspace(workspace.id);
      
      const success = manager.setActiveWorkspace(workspace.id);
      expect(success).toBe(false);
    });

    it('should clear active workspace', () => {
      const workspace = manager.createWorkspace('Test', '/path');
      manager.setActiveWorkspace(workspace.id);
      manager.clearActiveWorkspace();
      
      expect(manager.getActiveWorkspace()).toBeUndefined();
    });
  });

  describe('debate tracking', () => {
    it('should start a debate', () => {
      const workspace = manager.createWorkspace('Test', '/path');
      const debate = manager.startDebate(workspace.id, {
        id: 'task-1',
        description: 'Test task',
        context: 'Test context',
        files: ['file.ts'],
      });
      
      expect(debate).toBeDefined();
      expect(debate?.status).toBe('in_progress');
      expect(debate?.workspaceId).toBe(workspace.id);
    });

    it('should respect concurrent debate limit', () => {
      const workspace = manager.createWorkspace('Test', '/path', { maxConcurrentDebates: 1 });
      
      manager.startDebate(workspace.id, { id: '1', description: '', context: '', files: [] });
      const second = manager.startDebate(workspace.id, { id: '2', description: '', context: '', files: [] });
      
      expect(second).toBeUndefined();
    });

    it('should complete a debate and update metadata', () => {
      const workspace = manager.createWorkspace('Test', '/path');
      const debate = manager.startDebate(workspace.id, {
        id: 'task-1',
        description: 'Test',
        context: '',
        files: [],
      });
      
      const decision: CouncilDecision = {
        approved: true,
        consensus: 0.8,
        weightedConsensus: 0.85,
        votes: [],
        reasoning: 'Approved',
        dissent: [],
      };
      
      const completed = manager.completeDebate(workspace.id, debate!.debateId, decision, 1000, 0.05);
      
      expect(completed?.status).toBe('completed');
      expect(completed?.decision).toBeDefined();
      
      const updatedWorkspace = manager.getWorkspace(workspace.id);
      expect(updatedWorkspace?.metadata.totalDebates).toBe(1);
      expect(updatedWorkspace?.metadata.approvedDebates).toBe(1);
      expect(updatedWorkspace?.metadata.totalTokensUsed).toBe(1000);
    });

    it('should fail a debate', () => {
      const workspace = manager.createWorkspace('Test', '/path');
      const debate = manager.startDebate(workspace.id, {
        id: 'task-1',
        description: 'Test',
        context: '',
        files: [],
      });
      
      const failed = manager.failDebate(workspace.id, debate!.debateId, 'API error');
      
      expect(failed?.status).toBe('failed');
    });

    it('should get workspace debates', () => {
      const workspace = manager.createWorkspace('Test', '/path');
      manager.startDebate(workspace.id, { id: '1', description: '', context: '', files: [] });
      manager.startDebate(workspace.id, { id: '2', description: '', context: '', files: [] });
      
      const debates = manager.getWorkspaceDebates(workspace.id);
      expect(debates.length).toBe(2);
    });

    it('should get all active debates across workspaces', () => {
      const ws1 = manager.createWorkspace('Test 1', '/path1');
      const ws2 = manager.createWorkspace('Test 2', '/path2');
      
      manager.startDebate(ws1.id, { id: '1', description: '', context: '', files: [] });
      manager.startDebate(ws2.id, { id: '2', description: '', context: '', files: [] });
      
      const active = manager.getAllActiveDebates();
      expect(active.length).toBe(2);
    });
  });

  describe('statistics', () => {
    it('should calculate workspace stats', () => {
      const workspace = manager.createWorkspace('Test', '/path');
      const debate = manager.startDebate(workspace.id, {
        id: 'task-1',
        description: 'Test',
        context: '',
        files: [],
      });
      
      manager.completeDebate(workspace.id, debate!.debateId, {
        approved: true,
        consensus: 0.9,
        weightedConsensus: 0.9,
        votes: [
          { supervisor: 'gpt-4', approved: true, confidence: 0.9, weight: 1, comment: '' },
        ],
        reasoning: '',
        dissent: [],
      }, 500, 0.02);
      
      const stats = manager.getWorkspaceStats(workspace.id, 30);
      
      expect(stats).toBeDefined();
      expect(stats?.debates.total).toBe(1);
      expect(stats?.debates.approved).toBe(1);
    });

    it('should compare workspaces', () => {
      const ws1 = manager.createWorkspace('Project 1', '/path1');
      const ws2 = manager.createWorkspace('Project 2', '/path2');
      
      const comparison = manager.compareWorkspaces([ws1.id, ws2.id]);
      
      expect(comparison.workspaces.length).toBe(2);
      expect(comparison.metrics.length).toBe(2);
      expect(comparison.ranking.byApprovalRate.length).toBe(2);
    });
  });

  describe('bulk operations', () => {
    it('should pause all workspaces', () => {
      manager.createWorkspace('Test 1', '/path1');
      manager.createWorkspace('Test 2', '/path2');
      
      const count = manager.pauseAllWorkspaces();
      
      expect(count).toBe(2);
      expect(manager.getWorkspacesByStatus('paused').length).toBe(2);
    });

    it('should resume all workspaces', () => {
      manager.createWorkspace('Test 1', '/path1');
      manager.createWorkspace('Test 2', '/path2');
      manager.pauseAllWorkspaces();
      
      const count = manager.resumeAllWorkspaces();
      
      expect(count).toBe(2);
      expect(manager.getWorkspacesByStatus('active').length).toBe(2);
    });
  });

  describe('config cloning', () => {
    it('should clone config from one workspace to another', () => {
      const source = manager.createWorkspace('Source', '/source', {
        defaultDebateRounds: 5,
        consensusThreshold: 0.9,
      });
      const target = manager.createWorkspace('Target', '/target');
      
      manager.cloneWorkspaceConfig(source.id, target.id);
      
      const updated = manager.getWorkspace(target.id);
      expect(updated?.config.defaultDebateRounds).toBe(5);
      expect(updated?.config.consensusThreshold).toBe(0.9);
    });
  });

  describe('export/import', () => {
    it('should export workspace with debates', () => {
      const workspace = manager.createWorkspace('Test', '/path');
      manager.startDebate(workspace.id, { id: '1', description: '', context: '', files: [] });
      
      const exported = manager.exportWorkspace(workspace.id);
      
      expect(exported).toBeDefined();
      expect(exported?.workspace.name).toBe('Test');
      expect(exported?.debates.length).toBe(1);
    });

    it('should import workspace', () => {
      const workspace = manager.createWorkspace('Original', '/original');
      const exported = manager.exportWorkspace(workspace.id)!;
      
      const imported = manager.importWorkspace(exported);
      
      expect(imported.name).toBe('Original (imported)');
      expect(imported.id).not.toBe(workspace.id);
    });
  });

  describe('cleanup', () => {
    it('should clear all workspaces', () => {
      manager.createWorkspace('Test 1', '/path1');
      manager.createWorkspace('Test 2', '/path2');
      
      manager.clearAllWorkspaces();
      
      expect(manager.getAllWorkspaces().length).toBe(0);
    });
  });
});
