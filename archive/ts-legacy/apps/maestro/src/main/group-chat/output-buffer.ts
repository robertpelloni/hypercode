/**
 * Output buffer management for group chat.
 * Buffers streaming output from group chat processes and releases on process exit.
 */

import { MAX_GROUP_CHAT_BUFFER_SIZE } from '../constants';

// Buffer for group chat output (keyed by sessionId)
// We buffer output and only route it on process exit to avoid duplicate messages from streaming chunks
// Uses array of chunks for O(1) append performance instead of O(n) string concatenation
// Tracks totalLength incrementally to avoid O(n) reduce on every append
const groupChatOutputBuffers = new Map<
	string,
	{ chunks: string[]; totalLength: number; truncated: boolean }
>();

/**
 * Append data to group chat output buffer. O(1) operation.
 * @returns The current total buffer length
 * @note If buffer exceeds MAX_GROUP_CHAT_BUFFER_SIZE, new data is silently dropped
 *       and the buffer is marked as truncated.
 */
export function appendToGroupChatBuffer(sessionId: string, data: string): number {
	let buffer = groupChatOutputBuffers.get(sessionId);
	if (!buffer) {
		buffer = { chunks: [], totalLength: 0, truncated: false };
		groupChatOutputBuffers.set(sessionId, buffer);
	}

	// Prevent memory exhaustion by enforcing max buffer size
	if (buffer.totalLength + data.length > MAX_GROUP_CHAT_BUFFER_SIZE) {
		if (!buffer.truncated) {
			buffer.truncated = true;
			// Add truncation marker as final chunk
			const marker = '\n...[output truncated due to size limit]...';
			buffer.chunks.push(marker);
			buffer.totalLength += marker.length;
		}
		// Silently drop new data once truncated
		return buffer.totalLength;
	}

	buffer.chunks.push(data);
	buffer.totalLength += data.length;
	return buffer.totalLength;
}

/** Get buffered output as a single string. Joins chunks on read. */
export function getGroupChatBufferedOutput(sessionId: string): string | undefined {
	const buffer = groupChatOutputBuffers.get(sessionId);
	if (!buffer || buffer.chunks.length === 0) return undefined;
	return buffer.chunks.join('');
}

/** Clear the buffer for a session. Call after processing buffered output. */
export function clearGroupChatBuffer(sessionId: string): void {
	groupChatOutputBuffers.delete(sessionId);
}

/** Check if a session has buffered output. */
export function hasGroupChatBuffer(sessionId: string): boolean {
	const buffer = groupChatOutputBuffers.get(sessionId);
	return buffer !== undefined && buffer.chunks.length > 0;
}

/** Check if a session's buffer was truncated due to size limit. */
export function isGroupChatBufferTruncated(sessionId: string): boolean {
	const buffer = groupChatOutputBuffers.get(sessionId);
	return buffer?.truncated ?? false;
}
