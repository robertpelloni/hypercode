/**
 * Agent Error Handling IPC Handlers
 *
 * Handles agent error state management:
 * - Clearing error states after recovery
 * - Retrying operations after errors
 *
 * Note: The actual error state is managed in the renderer. These handlers
 * provide logging and potential future main process coordination.
 */

import { ipcMain } from 'electron';
import { logger } from '../../utils/logger';

// ==========================================================================
// Types
// ==========================================================================

/**
 * Options for retrying after an error
 */
export interface RetryOptions {
	/** Optional prompt to use for the retry */
	prompt?: string;
	/** Whether to start a new session for the retry */
	newSession?: boolean;
}

/**
 * Response from agent error operations
 */
export interface AgentErrorResponse {
	success: boolean;
}

// ==========================================================================
// Handler Registration
// ==========================================================================

/**
 * Register all agent error-related IPC handlers
 */
export function registerAgentErrorHandlers(): void {
	// Clear an error state for a session (called after recovery action)
	ipcMain.handle(
		'agent:clearError',
		async (_event, sessionId: string): Promise<AgentErrorResponse> => {
			logger.debug('Clearing agent error for session', 'AgentError', { sessionId });
			// Note: The actual error state is managed in the renderer.
			// This handler is used to log the clear action and potentially
			// perform any main process cleanup needed.
			return { success: true };
		}
	);

	// Retry the last operation after an error (optionally with modified parameters)
	ipcMain.handle(
		'agent:retryAfterError',
		async (_event, sessionId: string, options?: RetryOptions): Promise<AgentErrorResponse> => {
			logger.info('Retrying after agent error', 'AgentError', {
				sessionId,
				hasPrompt: !!options?.prompt,
				newSession: options?.newSession || false,
			});
			// Note: The actual retry logic is handled in the renderer, which will:
			// 1. Clear the error state
			// 2. Optionally start a new session
			// 3. Re-send the last command or the provided prompt
			// This handler exists for logging and potential future main process coordination.
			return { success: true };
		}
	);
}
