/**
 * @file Handshake.ts
 * @module packages/agents/src/orchestration/Handshake
 *
 * WHAT: Negotiation protocol for Agent-to-Agent (A2A) task handoffs.
 * Ensures agents agree on capabilities and constraints before starting work.
 *
 * WHY: Blind task delegation leads to failures if the recipient lacks tools 
 * or has high latency. Negotiation allows the requester to pick the best provider.
 *
 * HOW:
 * 1. Requester sends TASK_NEGOTIATION signal.
 * 2. Potential providers reply with CAPABILITY_REPORT.
 * 3. Requester evaluates reports and sends TASK_ASSIGN to the winner.
 */

import { A2AMessage, A2AMessageType } from "@hypercode/adk";
import { a2aBroker } from "./A2ABroker.js";

export interface CapabilityReport {
    agentId: string;
    capabilities: string[];
    canHandle: boolean;
    estimatedLatencyMs: number;
    reasoning: string;
}

export class Handshake {
    /**
     * Conducts a negotiation for a task and returns the best candidate ID.
     */
    public async negotiateTask(sender: string, task: string): Promise<string | null> {
        console.log(`[A2A Handshake] 🤝 Starting negotiation for task: "${task}"`);

        const negotiationId = `neg-${Date.now()}`;
        const responses: CapabilityReport[] = [];

        // Track in broker for UI visibility
        a2aBroker.recordNegotiation(negotiationId, sender, task);

        // 1. Broadcast Negotiation Request
        await a2aBroker.routeMessage({
            id: negotiationId,
            timestamp: Date.now(),
            sender,
            type: A2AMessageType.TASK_NEGOTIATION,
            payload: { task }
        });

        // 2. Wait for Capability Reports (Correlation via replyTo)
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                a2aBroker.removeListener('message_routed', handleResponse);
                resolve(this.pickBestCandidate(responses));
            }, 5000); // 5s timeout for bids

            const handleResponse = (msg: A2AMessage) => {
                if (msg.replyTo === negotiationId && msg.type === A2AMessageType.CAPABILITY_REPORT) {
                    const bid = msg.payload as CapabilityReport;
                    responses.push(bid);
                    a2aBroker.recordBid(negotiationId, bid);
                }
            };

            a2aBroker.on('message_routed', handleResponse);
        });
    }

    private pickBestCandidate(reports: CapabilityReport[]): string | null {
        const qualified = reports.filter(r => r.canHandle);
        if (qualified.length === 0) return null;

        // Sort by latency as a tie-breaker
        qualified.sort((a, b) => a.estimatedLatencyMs - b.estimatedLatencyMs);
        return qualified[0].agentId;
    }
}
