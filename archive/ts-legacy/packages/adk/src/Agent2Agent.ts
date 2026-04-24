/**
 * @file Agent2Agent.ts
 * @module packages/adk/src/Agent2Agent
 *
 * WHAT: Agent-to-Agent (A2A) communication protocol and interfaces.
 * Defines how different autonomous agents within HyperCode coordinate tasks.
 *
 * WHY: Multi-agent systems require structured message passing and task delegation
 * to ensure consistency and avoid redundant work.
 *
 * HOW:
 * 1. Define A2AMessage format (sender, recipient, type, payload).
 * 2. Define A2ATask for delegation.
 * 3. Provide base classes for A2A-capable agents.
 */

export enum A2AMessageType {
    TASK_REQUEST = 'TASK_REQUEST',
    TASK_RESPONSE = 'TASK_RESPONSE',
    TASK_NEGOTIATION = 'TASK_NEGOTIATION',
    CAPABILITY_REPORT = 'CAPABILITY_REPORT',
    CONSENSUS_VOTE = 'CONSENSUS_VOTE',
    STATE_UPDATE = 'STATE_UPDATE',
    HANDOFF = 'HANDOFF',
    DEBATE_PROPOSAL = 'DEBATE_PROPOSAL',
    CRITIQUE = 'CRITIQUE',
    HEARTBEAT = 'HEARTBEAT'
}

export interface A2AMessage<T = any> {
    id: string;
    timestamp: number;
    sender: string;
    recipient?: string; // Optional: Broadcast if empty
    type: A2AMessageType;
    payload: T;
    replyTo?: string; // ID of the message being replied to
}

export interface A2ATask {
    id: string;
    description: string;
    priority: number;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    assignedTo?: string;
    result?: any;
    error?: string;
}

export interface IA2AClient {
    sendMessage(message: A2AMessage): Promise<void>;
    onMessage(callback: (message: A2AMessage) => void): void;
    delegateTask(task: A2ATask, recipient: string): Promise<A2ATask>;
}

/**
 * A2A Protocol Implementation for local IPC or WebSocket bridge
 */
export class A2AProtocol {
    /**
     * Create a structured handoff message for another agent
     */
    static createHandoff(sender: string, recipient: string, context: string, pendingTasks: string[]): A2AMessage {
        return {
            id: `a2a-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            timestamp: Date.now(),
            sender,
            recipient,
            type: A2AMessageType.HANDOFF,
            payload: {
                context,
                pendingTasks
            }
        };
    }

    /**
     * Create a task request for a specialized agent
     */
    static createTaskRequest(sender: string, recipient: string, task: string, metadata?: any): A2AMessage {
        return {
            id: `a2a-task-${Date.now()}`,
            timestamp: Date.now(),
            sender,
            recipient,
            type: A2AMessageType.TASK_REQUEST,
            payload: {
                task,
                metadata
            }
        };
    }
}
