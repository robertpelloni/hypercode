/**
 * LiveSessionManager - Manages live session tracking for the web interface
 *
 * Handles:
 * - Tracking which sessions are marked as "live" (visible in web interface)
 * - AutoRun state management for batch processing
 * - Providing session info for connected web clients
 */

import { logger } from '../../utils/logger';
import type { LiveSessionInfo, AutoRunState } from '../types';
import { IHypercodeProvider } from '../../../main/services/IHypercodeProvider';

const LOG_CONTEXT = 'LiveSessionManager';

/**
 * Callback for broadcasting session live status changes
 */
export interface LiveSessionBroadcastCallbacks {
	broadcastSessionLive: (sessionId: string, agentSessionId?: string) => void;
	broadcastSessionOffline: (sessionId: string) => void;
	broadcastAutoRunState: (sessionId: string, state: AutoRunState | null) => void;
}

export class LiveSessionManager {
	constructor(private hypercodeProvider: IHypercodeProvider) {}

	// Live sessions - only these appear in the web interface
	private liveSessions: Map<string, LiveSessionInfo> = new Map();

	// AutoRun states per session - tracks which sessions have active batch processing
	private autoRunStates: Map<string, AutoRunState> = new Map();

	// Broadcast callbacks (set by WebServer)
	private broadcastCallbacks: LiveSessionBroadcastCallbacks | null = null;

	/**
	 * Set the broadcast callbacks for notifying clients of changes
	 */
	setBroadcastCallbacks(callbacks: LiveSessionBroadcastCallbacks): void {
		this.broadcastCallbacks = callbacks;
	}

	/**
	 * Mark a session as live (visible in web interface)
	 */
	setSessionLive(sessionId: string, agentSessionId?: string): void {
		this.liveSessions.set(sessionId, {
			sessionId,
			agentSessionId,
			enabledAt: Date.now(),
		});
		logger.info(
			`Session ${sessionId} marked as live (total: ${this.liveSessions.size})`,
			LOG_CONTEXT
		);

		// Verify Hypercode connection and ensure session is known to Core
		this.hypercodeProvider
			.getStatus()
			.then((status) => {
				if (status.connected) {
					logger.debug(`Hypercode Core connected (latency: ${status.latencyMs}ms)`, LOG_CONTEXT);
				}
			})
			.catch((err) => logger.error(`Hypercode status check failed: ${err}`, LOG_CONTEXT));

		// Broadcast to all connected clients
		this.broadcastCallbacks?.broadcastSessionLive(sessionId, agentSessionId);
	}

	/**
	 * Mark a session as offline (no longer visible in web interface)
	 */
	setSessionOffline(sessionId: string): void {
		const wasLive = this.liveSessions.delete(sessionId);
		if (wasLive) {
			logger.info(
				`Session ${sessionId} marked as offline (remaining: ${this.liveSessions.size})`,
				LOG_CONTEXT
			);

			// Archive session in Hypercode Core
			this.hypercodeProvider
				.archiveSession(sessionId)
				.catch((err) =>
					logger.error(`Hypercode session archiving failed for ${sessionId}: ${err}`, LOG_CONTEXT)
				);

			// Clean up any associated AutoRun state to prevent memory leaks
			if (this.autoRunStates.has(sessionId)) {
				this.autoRunStates.delete(sessionId);
				logger.debug(`Cleaned up AutoRun state for offline session ${sessionId}`, LOG_CONTEXT);
			}

			// Broadcast to all connected clients
			this.broadcastCallbacks?.broadcastSessionOffline(sessionId);
		}
	}

	/**
	 * Check if a session is currently live
	 */
	isSessionLive(sessionId: string): boolean {
		return this.liveSessions.has(sessionId);
	}

	/**
	 * Get live session info for a specific session
	 */
	getLiveSessionInfo(sessionId: string): LiveSessionInfo | undefined {
		return this.liveSessions.get(sessionId);
	}

	/**
	 * Get all live session IDs
	 */
	getLiveSessions(): LiveSessionInfo[] {
		return Array.from(this.liveSessions.values());
	}

	/**
	 * Get all live session IDs as an iterable
	 */
	getLiveSessionIds(): IterableIterator<string> {
		return this.liveSessions.keys();
	}

	/**
	 * Get the count of live sessions
	 */
	getLiveSessionCount(): number {
		return this.liveSessions.size;
	}

	// ============ AutoRun State Management ============

	/**
	 * Update AutoRun state for a session
	 * Also stores state locally so new clients can receive it on connect
	 */
	setAutoRunState(sessionId: string, state: AutoRunState | null): void {
		// Store state locally for new clients connecting later
		if (state && state.isRunning) {
			this.autoRunStates.set(sessionId, state);
			logger.info(
				`AutoRun state stored for session ${sessionId}: tasks=${state.completedTasks}/${state.totalTasks} (total stored: ${this.autoRunStates.size})`,
				LOG_CONTEXT
			);
		} else {
			const wasStored = this.autoRunStates.has(sessionId);
			this.autoRunStates.delete(sessionId);
			if (wasStored) {
				logger.info(
					`AutoRun state removed for session ${sessionId} (total stored: ${this.autoRunStates.size})`,
					LOG_CONTEXT
				);
			}
		}

		// Broadcast to all connected clients
		this.broadcastCallbacks?.broadcastAutoRunState(sessionId, state);
	}

	/**
	 * Get AutoRun state for a specific session
	 */
	getAutoRunState(sessionId: string): AutoRunState | undefined {
		return this.autoRunStates.get(sessionId);
	}

	/**
	 * Get all AutoRun states (for new client connections)
	 */
	getAutoRunStates(): Map<string, AutoRunState> {
		return this.autoRunStates;
	}

	/**
	 * Clear all state (called during server shutdown)
	 */
	clearAll(): void {
		// Mark all live sessions as offline
		for (const sessionId of this.liveSessions.keys()) {
			this.setSessionOffline(sessionId);
		}

		// Clear any remaining autoRunStates as a safety measure
		if (this.autoRunStates.size > 0) {
			logger.debug(
				`Clearing ${this.autoRunStates.size} remaining AutoRun states on cleanup`,
				LOG_CONTEXT
			);
			this.autoRunStates.clear();
		}
	}
}
