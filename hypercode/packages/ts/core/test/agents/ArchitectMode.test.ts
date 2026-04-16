import { describe, test, expect, beforeEach, mock } from 'vitest';
import { ArchitectMode, type ArchitectSession, type EditPlan } from '../../src/agents/ArchitectMode.ts';

describe('ArchitectMode', () => {
  let architect: ArchitectMode;
  let mockChatFn: ReturnType<typeof mock>;

  beforeEach(() => {
    // Define mock implementation inside beforeEach to ensure it's fresh for every test
    mockChatFn = mock(async (model: string, messages: any[]) => {
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const userMessage = messages.find(m => m.role === 'user')?.content || '';
      
      if (systemMessage.includes('Implementation plan') || userMessage.toLowerCase().includes('create the edit plan as json')) {
        return JSON.stringify({
          description: 'Implementation plan',
          estimatedComplexity: 'medium',
          files: [
            { path: 'src/file1.ts', action: 'modify', reasoning: 'Update logic' },
            { path: 'src/file2.ts', action: 'modify', reasoning: 'Update styles' }
          ],
          steps: ['Step 1', 'Step 2'],
          risks: ['Risk A']
        });
      }
      
      if (systemMessage.includes('precise code editor')) {
        return '// Edited code content';
      }
      
      return 'Architectural analysis and reasoning output.';
    });

    architect = new ArchitectMode({
      reasoningModel: 'o3-mini',
      editingModel: 'gpt-4o',
    });
    // Reason: bun mock type is broader than ArchitectMode's expected chat callback signature.
    // What: narrow once at the call boundary using the method parameter type.
    // Why: avoids pervasive `any` in tests while keeping deterministic mock behavior.
    architect.setChatFunction(mockChatFn as unknown as Parameters<ArchitectMode['setChatFunction']>[0]);
    // Silence error events to prevent unhandled rejections during intentional failures
    architect.on('error', () => {});
  });

  describe('Session Management', () => {
    test('should start a new session', async () => {
      const session = await architect.startSession('Implement auth');
      
      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.task).toBe('Implement auth');
      expect(session.status).toBe('reviewing');
    });

    test('should get session by ID', async () => {
      const created = await architect.startSession('Test task');
      const retrieved = architect.getSession(created.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    test('should list all sessions', async () => {
      await architect.startSession('Task 1');
      await architect.startSession('Task 2');
      
      const sessions = architect.listSessions();
      expect(sessions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Reasoning and Planning', () => {
    test('should invoke chat function for reasoning and planning', async () => {
      await architect.startSession('Complex feature');
      
      expect(mockChatFn).toHaveBeenCalled();
    });

    test('should emit lifecycle events', async () => {
      const events: string[] = [];
      architect.on('sessionStarted', () => events.push('started'));
      architect.on('planCreated', () => events.push('planned'));
      
      await architect.startSession('Test task');
      
      expect(events).toContain('started');
      expect(events).toContain('planned');
    });

    test('should handle reasoning errors', async () => {
      // Temporarily override for this specific test
      mockChatFn.mockImplementationOnce(async () => { throw new Error('Model timeout'); });
      
      const session = await architect.startSession('Will fail');
      
      // Wait for background reasoning to fail
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const updated = architect.getSession(session.id);
      expect(updated?.status).toBe('error');
    });
  });

  describe('Plan Approval and Execution', () => {
    test('should transition to editing after approval', async () => {
      const session = await architect.startSession('Test task');
      const approved = architect.approvePlan(session.id);
      
      expect(approved).toBe(true);
      expect(architect.getSession(session.id)?.status).toBe('editing');
    });

    test('should generate edits for planned files', async () => {
      const session = await architect.startSession('Multi-file task');
      
      // Wait for reasoning to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      architect.approvePlan(session.id);
      
      // Wait for editing to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const updated = architect.getSession(session.id);
      expect(updated?.status).toBe('complete');
      expect(updated?.editOutput).toContain('src/file1.ts');
      expect(updated?.editOutput).toContain('src/file2.ts');
    });

    test('should reject plan', async () => {
      const session = await architect.startSession('Test task');
      const rejected = architect.rejectPlan(session.id, 'Too risky');
      
      expect(rejected).toBe(true);
      expect(architect.getSession(session.id)?.status).toBe('complete');
    });

    test('should revise plan with feedback', async () => {
      const session = await architect.startSession('Test task');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // The mock implementation returns JSON if 'json' or 'plan' is in the content.
      // In revisePlan, the task is updated with 'Revision feedback'.
      // We need to ensure the mock still returns JSON for this request.
      
      const revised = await architect.revisePlan(session.id, 'Use different pattern');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const updated = architect.getSession(session.id);
      if (updated?.status === 'error') {
        console.log('Revision error:', updated.error);
      }
      expect(revised).toBeDefined();
      expect(updated?.status).toBe('reviewing');
    });
  });
});
