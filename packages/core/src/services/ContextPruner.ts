
import { Message } from '../interfaces/VectorProvider.js'; // Assuming Message interface exists or we define a generic one

/**
 * ContextPruner
 * 
 * Handles strict token management for infinite context windows.
 * Implements a "Sliding Window + Landmark" strategy:
 * 1. Always keep System Prompt (first message).
 * 2. Always keep last N messages (Recency Buffer).
 * 3. Prune middle messages based on relevance/importance (or FIFO if no relevance metadata).
 * 4. Summarize dropped segments (future).
 */

export interface PruningOptions {
    maxTokens: number;
    keepLast: number; // Number of messages to always keep
    keepFirst: number; // Number of initial messages to keep (system prompts)
    estimatedTokensPerChar?: number; // Default 0.25 (4 chars per token)
}

export class ContextPruner {
    private options: PruningOptions;

    constructor(options: Partial<PruningOptions> = {}) {
        this.options = {
            maxTokens: options.maxTokens || 100000,
            keepLast: options.keepLast || 10,
            keepFirst: options.keepFirst || 1,
            estimatedTokensPerChar: options.estimatedTokensPerChar || 0.25
        };
    }

    /**
     * Estimates token count for a list of messages.
     */
    public estimateTokens(messages: any[]): number {
        let text = '';
        for (const m of messages) {
            if (typeof m.content === 'string') {
                text += m.content;
            } else if (Array.isArray(m.content)) {
                // Handle Multi-modal content (Text + Image)
                for (const block of m.content) {
                    if (block.type === 'text') text += block.text;
                }
            }
        }
        return Math.ceil(text.length * (this.options.estimatedTokensPerChar || 0.25));
    }

    /**
     * Prunes messages to fit within maxTokens.
     * Returns the pruned list of messages.
     */
    public prune(messages: any[]): any[] {
        const totalTokens = this.estimateTokens(messages);

        if (totalTokens <= this.options.maxTokens) {
            return messages;
        }

        console.log(`[ContextPruner] Pruning context: ${totalTokens} > ${this.options.maxTokens}`);

        // Strategy:
        // 1. Keep First N (System Instructions)
        // 2. Keep Last M (Recent Dialogue)
        // 3. Drop from the "Middle-Start" until fit.

        const { keepFirst, keepLast } = this.options;

        if (messages.length <= keepFirst + keepLast) {
            console.warn(`[ContextPruner] Context exceeded maxTokens but message count is too low to prune safely.`);
            return messages;
        }

        const safeFirst = messages.slice(0, keepFirst);
        const safeLast = messages.slice(-keepLast);

        // Candidates for pruning are in the middle
        let middle = messages.slice(keepFirst, -keepLast);

        // Remove from the beginning of the middle block (oldest "active" memories)
        // until we fit or run out of middle messages

        let currentTokens = totalTokens;

        while (middle.length > 0 && currentTokens > this.options.maxTokens) {
            const removed = middle.shift(); // Remove oldest
            const removedTokens = this.estimateTokens([removed]);
            currentTokens -= removedTokens;
        }

        // TODO: Insert a "Summary" message here indicating X messages were dropped?

        return [...safeFirst, ...middle, ...safeLast];
    }
}
