/**
 * @file TaskQueue.ts
 * @module packages/agents/src/orchestration/TaskQueue
 *
 * WHAT: Decentralized task queue for Agent-to-Agent (A2A) collaboration.
 * Allows agents to publish background tasks that other idle agents can pull.
 *
 * WHY: Decouples task creation from execution. Highly specialized agents 
 * (e.g. Code Reviewer, Security Auditor) can monitor the queue for relevant work.
 *
 * HOW:
 * 1. Maintain a prioritized list of A2ATask objects.
 * 2. Support 'claiming' a task by an agent ID.
 * 3. Emit A2A signals (TASK_REQUEST) when new high-priority work is queued.
 */

import { A2ATask, A2AMessageType } from "@hypercode/adk";
import { a2aBroker } from "./A2ABroker.js";
import { EventEmitter } from "events";

export class TaskQueue extends EventEmitter {
    private tasks: Map<string, A2ATask> = new Map();

    constructor() {
        super();
    }

    /**
     * Publishes a new task to the collective queue.
     */
    public async publishTask(task: A2ATask) {
        this.tasks.set(task.id, {
            ...task,
            status: 'pending'
        });

        console.log(`[TaskQueue] 📥 New task queued: ${task.description} (Priority: ${task.priority})`);

        // Broadcast a signal to all agents that new work is available
        await a2aBroker.routeMessage({
            id: `work-notice-${task.id}`,
            timestamp: Date.now(),
            sender: 'TASK_QUEUE',
            type: A2AMessageType.TASK_REQUEST,
            payload: { task: task.description, taskId: task.id, priority: task.priority }
        });

        this.emit('task_queued', task);
    }

    /**
     * Allows an agent to claim a task.
     */
    public claimTask(taskId: string, agentId: string): boolean {
        const task = this.tasks.get(taskId);
        if (task && task.status === 'pending') {
            task.status = 'in_progress';
            task.assignedTo = agentId;
            this.emit('task_claimed', { taskId, agentId });
            return true;
        }
        return false;
    }

    public updateTask(taskId: string, updates: Partial<A2ATask>) {
        const task = this.tasks.get(taskId);
        if (task) {
            Object.assign(task, updates);
            this.emit('task_updated', task);
        }
    }

    public listTasks(): A2ATask[] {
        return Array.from(this.tasks.values()).sort((a, b) => b.priority - a.priority);
    }
}

export const taskQueue = new TaskQueue();
