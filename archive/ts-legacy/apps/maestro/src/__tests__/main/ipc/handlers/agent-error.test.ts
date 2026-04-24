/**
 * Tests for agent error IPC handlers
 *
 * Tests the agent:clearError and agent:retryAfterError handlers
 * which manage error state transitions and recovery operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain } from 'electron';

// Create hoisted mocks for more reliable mocking
const mocks = vi.hoisted(() => ({
	mockLogger: {
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

// Mock electron
vi.mock('electron', () => ({
	ipcMain: {
		handle: vi.fn(),
	},
}));

// Mock logger
vi.mock('../../../../main/utils/logger', () => ({
	logger: mocks.mockLogger,
}));

// Alias for easier access in tests
const mockLogger = mocks.mockLogger;

import { registerAgentErrorHandlers } from '../../../../main/ipc/handlers/agent-error';

describe('Agent Error IPC Handlers', () => {
	let handlers: Map<string, Function>;

	beforeEach(() => {
		vi.clearAllMocks();
		handlers = new Map();

		// Capture registered handlers
		vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: Function) => {
			handlers.set(channel, handler);
		});

		registerAgentErrorHandlers();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('handler registration', () => {
		it('should register agent:clearError handler', () => {
			expect(handlers.has('agent:clearError')).toBe(true);
		});

		it('should register agent:retryAfterError handler', () => {
			expect(handlers.has('agent:retryAfterError')).toBe(true);
		});

		it('should register exactly 2 handlers', () => {
			expect(handlers.size).toBe(2);
		});
	});

	describe('agent:clearError', () => {
		it('should return success for valid session ID', async () => {
			const handler = handlers.get('agent:clearError')!;
			const result = await handler({}, 'session-123');

			expect(result).toEqual({ success: true });
		});

		it('should log debug message with session ID', async () => {
			const handler = handlers.get('agent:clearError')!;
			await handler({}, 'test-session-abc');

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Clearing agent error for session',
				'AgentError',
				{ sessionId: 'test-session-abc' }
			);
		});

		it('should handle empty session ID', async () => {
			const handler = handlers.get('agent:clearError')!;
			const result = await handler({}, '');

			expect(result).toEqual({ success: true });
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Clearing agent error for session',
				'AgentError',
				{ sessionId: '' }
			);
		});

		it('should handle UUID format session ID', async () => {
			const handler = handlers.get('agent:clearError')!;
			const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
			const result = await handler({}, uuid);

			expect(result).toEqual({ success: true });
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Clearing agent error for session',
				'AgentError',
				{ sessionId: uuid }
			);
		});

		it('should handle long session ID', async () => {
			const handler = handlers.get('agent:clearError')!;
			const longSessionId = 'session-' + 'a'.repeat(500);
			const result = await handler({}, longSessionId);

			expect(result).toEqual({ success: true });
		});

		it('should handle special characters in session ID', async () => {
			const handler = handlers.get('agent:clearError')!;
			const specialId = 'session_with-special.chars:123';
			const result = await handler({}, specialId);

			expect(result).toEqual({ success: true });
		});

		it('should handle group chat session ID format', async () => {
			const handler = handlers.get('agent:clearError')!;
			const groupChatId = 'group-chat-test-123-participant-Agent-abc';
			const result = await handler({}, groupChatId);

			expect(result).toEqual({ success: true });
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Clearing agent error for session',
				'AgentError',
				{ sessionId: groupChatId }
			);
		});
	});

	describe('agent:retryAfterError', () => {
		it('should return success without options', async () => {
			const handler = handlers.get('agent:retryAfterError')!;
			const result = await handler({}, 'session-123');

			expect(result).toEqual({ success: true });
		});

		it('should return success with empty options', async () => {
			const handler = handlers.get('agent:retryAfterError')!;
			const result = await handler({}, 'session-123', {});

			expect(result).toEqual({ success: true });
		});

		it('should return success with prompt option', async () => {
			const handler = handlers.get('agent:retryAfterError')!;
			const result = await handler({}, 'session-123', { prompt: 'Retry with this prompt' });

			expect(result).toEqual({ success: true });
		});

		it('should return success with newSession option', async () => {
			const handler = handlers.get('agent:retryAfterError')!;
			const result = await handler({}, 'session-123', { newSession: true });

			expect(result).toEqual({ success: true });
		});

		it('should return success with both options', async () => {
			const handler = handlers.get('agent:retryAfterError')!;
			const result = await handler({}, 'session-123', {
				prompt: 'Retry prompt',
				newSession: true,
			});

			expect(result).toEqual({ success: true });
		});

		it('should log info with session ID and no options', async () => {
			const handler = handlers.get('agent:retryAfterError')!;
			await handler({}, 'test-session-xyz');

			expect(mockLogger.info).toHaveBeenCalledWith('Retrying after agent error', 'AgentError', {
				sessionId: 'test-session-xyz',
				hasPrompt: false,
				newSession: false,
			});
		});

		it('should log info with hasPrompt=true when prompt provided', async () => {
			const handler = handlers.get('agent:retryAfterError')!;
			await handler({}, 'session-abc', { prompt: 'Some prompt text' });

			expect(mockLogger.info).toHaveBeenCalledWith('Retrying after agent error', 'AgentError', {
				sessionId: 'session-abc',
				hasPrompt: true,
				newSession: false,
			});
		});

		it('should log info with newSession=true when specified', async () => {
			const handler = handlers.get('agent:retryAfterError')!;
			await handler({}, 'session-def', { newSession: true });

			expect(mockLogger.info).toHaveBeenCalledWith('Retrying after agent error', 'AgentError', {
				sessionId: 'session-def',
				hasPrompt: false,
				newSession: true,
			});
		});

		it('should handle empty prompt string as no prompt', async () => {
			const handler = handlers.get('agent:retryAfterError')!;
			await handler({}, 'session-123', { prompt: '' });

			expect(mockLogger.info).toHaveBeenCalledWith('Retrying after agent error', 'AgentError', {
				sessionId: 'session-123',
				hasPrompt: false,
				newSession: false,
			});
		});

		it('should handle undefined newSession as false', async () => {
			const handler = handlers.get('agent:retryAfterError')!;
			await handler({}, 'session-123', { prompt: 'test' });

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Retrying after agent error',
				'AgentError',
				expect.objectContaining({ newSession: false })
			);
		});

		it('should handle newSession=false explicitly', async () => {
			const handler = handlers.get('agent:retryAfterError')!;
			await handler({}, 'session-123', { newSession: false });

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Retrying after agent error',
				'AgentError',
				expect.objectContaining({ newSession: false })
			);
		});

		it('should handle very long prompt', async () => {
			const handler = handlers.get('agent:retryAfterError')!;
			const longPrompt = 'A'.repeat(10000);
			const result = await handler({}, 'session-123', { prompt: longPrompt });

			expect(result).toEqual({ success: true });
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Retrying after agent error',
				'AgentError',
				expect.objectContaining({ hasPrompt: true })
			);
		});

		it('should handle unicode in prompt', async () => {
			const handler = handlers.get('agent:retryAfterError')!;
			const result = await handler({}, 'session-123', { prompt: '请重试这个操作 🔄' });

			expect(result).toEqual({ success: true });
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Retrying after agent error',
				'AgentError',
				expect.objectContaining({ hasPrompt: true })
			);
		});
	});

	describe('handler idempotency', () => {
		it('should handle multiple clearError calls for same session', async () => {
			const handler = handlers.get('agent:clearError')!;

			const result1 = await handler({}, 'session-123');
			const result2 = await handler({}, 'session-123');
			const result3 = await handler({}, 'session-123');

			expect(result1).toEqual({ success: true });
			expect(result2).toEqual({ success: true });
			expect(result3).toEqual({ success: true });
			expect(mockLogger.debug).toHaveBeenCalledTimes(3);
		});

		it('should handle multiple retryAfterError calls for same session', async () => {
			const handler = handlers.get('agent:retryAfterError')!;

			const result1 = await handler({}, 'session-123', { prompt: 'First retry' });
			const result2 = await handler({}, 'session-123', { prompt: 'Second retry' });

			expect(result1).toEqual({ success: true });
			expect(result2).toEqual({ success: true });
			expect(mockLogger.info).toHaveBeenCalledTimes(2);
		});
	});

	describe('concurrent handler calls', () => {
		it('should handle concurrent clearError calls for different sessions', async () => {
			const handler = handlers.get('agent:clearError')!;

			const results = await Promise.all([
				handler({}, 'session-1'),
				handler({}, 'session-2'),
				handler({}, 'session-3'),
			]);

			expect(results).toEqual([{ success: true }, { success: true }, { success: true }]);
		});

		it('should handle concurrent retryAfterError calls', async () => {
			const handler = handlers.get('agent:retryAfterError')!;

			const results = await Promise.all([
				handler({}, 'session-1', { prompt: 'Prompt 1' }),
				handler({}, 'session-2', { newSession: true }),
				handler({}, 'session-3', { prompt: 'Prompt 3', newSession: false }),
			]);

			expect(results).toEqual([{ success: true }, { success: true }, { success: true }]);
		});
	});

	describe('edge cases', () => {
		it('should handle null-ish session ID', async () => {
			const handler = handlers.get('agent:clearError')!;

			// TypeScript would normally prevent this, but testing runtime behavior
			const result = await handler({}, null as unknown as string);

			expect(result).toEqual({ success: true });
		});

		it('should handle undefined options in retryAfterError', async () => {
			const handler = handlers.get('agent:retryAfterError')!;
			const result = await handler({}, 'session-123', undefined);

			expect(result).toEqual({ success: true });
			expect(mockLogger.info).toHaveBeenCalledWith('Retrying after agent error', 'AgentError', {
				sessionId: 'session-123',
				hasPrompt: false,
				newSession: false,
			});
		});
	});
});
