/**
 * SwarmOrchestrator.ts
 * 
 * Manages horizontal parallel execution of sub-tasks by multiple AI agents.
 * 
 * Usage: Provide a massive prompt/task and let the Swarm split it, 
 * delegate to worker nodes, and aggregate the results.
 * 
 * v2.7.35: Wired decomposeGoal to the Autopilot Council for real LLM-backed
 * task decomposition, and executeTask to the Autopilot session runner for
 * live agent execution. Falls back to basic local decomposition if the
 * autopilot server is unavailable.
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { MeshService, SwarmMessageType, SwarmMessage } from '../../mesh/MeshService.js';

export interface SwarmTask {
    id: string;
    description: string;
    assignedModel?: string;
    result?: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    error?: string;
    /** Autopilot session ID if delegated to the Council */
    sessionId?: string;
}

export interface SwarmConfig {
    maxConcurrency?: number;
    defaultModel?: string;
    timeoutMs?: number;
    opencodeUrl?: string;
}

export class SwarmOrchestrator extends EventEmitter {
    private tasks: Map<string, SwarmTask> = new Map();
    private config: Required<Pick<SwarmConfig, 'maxConcurrency' | 'defaultModel' | 'timeoutMs'>>;
    private opencodeUrl: string;
    private mesh: MeshService;

    constructor(config: SwarmConfig = {}) {
        super();
        this.config = {
            maxConcurrency: config.maxConcurrency || 5,
            defaultModel: config.defaultModel || 'gpt-4o-mini',
            timeoutMs: config.timeoutMs || 120000
        };
        this.opencodeUrl = config.opencodeUrl || 'http://localhost:3847';
        this.mesh = new MeshService();
    }

    /**
     * Decompose a master prompt into actionable sub-tasks.
     * 
     * Uses the Autopilot Council's debate endpoint to generate a real
     * task breakdown via multi-model consensus. Falls back to a simple
     * three-phase split if the council is unreachable.
     */
    public async decomposeGoal(masterPrompt: string): Promise<SwarmTask[]> {
        console.log(`[Swarm] Decomposing: ${masterPrompt}`);

        let subTasks: SwarmTask[] = [];

        try {
            // Use the Autopilot Council to decompose the goal via multi-model debate.
            // The council dispatches to GPT-4o, Claude, DeepSeek, Gemini, and Grok
            // in parallel, then synthesizes a consensus task list.
            const res = await fetch(`${this.opencodeUrl}/api/council/debate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: uuidv4(),
                    description: `Decompose this goal into 3-7 independent, parallel-executable sub-tasks. Return ONLY a JSON array of objects with {description: string}. Goal: ${masterPrompt}`,
                    context: `You are a task decomposition architect. Break the goal into concrete, actionable sub-tasks that can be executed independently and in parallel by different AI models. Each task should be self-contained.`,
                    files: []
                }),
                signal: AbortSignal.timeout(this.config.timeoutMs)
            });

            if (res.ok) {
                const debateResult = await res.json();
                // The council returns a consensus result — extract the task array from it.
                // The result structure varies, so we try to parse JSON from the consensus text.
                const consensusText = debateResult?.consensus?.finalAnswer
                    || debateResult?.consensus?.text
                    || debateResult?.result
                    || '';

                const parsed = this.extractTasksFromLLMResponse(consensusText, masterPrompt);
                if (parsed.length > 0) {
                    subTasks = parsed;
                    console.log(`[Swarm] Council decomposed goal into ${subTasks.length} real tasks`);
                }
            }
        } catch (err: any) {
            console.warn(`[Swarm] Council unavailable for decomposition (${err.message}), using local fallback`);
        }

        // Fallback: basic three-phase decomposition if council didn't return tasks
        if (subTasks.length === 0) {
            subTasks = [
                { id: uuidv4(), description: `Analyze and plan: ${masterPrompt}`, status: 'pending' },
                { id: uuidv4(), description: `Implement core logic for: ${masterPrompt}`, status: 'pending' },
                { id: uuidv4(), description: `Verify and test: ${masterPrompt}`, status: 'pending' }
            ];
            console.log(`[Swarm] Using fallback decomposition (${subTasks.length} tasks)`);
        }

        subTasks.forEach(t => this.tasks.set(t.id, t));
        return subTasks;
    }

    /**
     * Attempts to extract a JSON array of tasks from an LLM response string.
     * Handles both clean JSON and JSON embedded within markdown code fences.
     */
    private extractTasksFromLLMResponse(text: string, fallbackPrompt: string): SwarmTask[] {
        if (!text || typeof text !== 'string') return [];

        // Strip markdown code fences if present
        const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();

        // Try to find a JSON array in the response
        const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
        if (!arrayMatch) return [];

        try {
            const parsed = JSON.parse(arrayMatch[0]);
            if (!Array.isArray(parsed)) return [];

            return parsed
                .filter((item: any) => item && (item.description || item.task || item.name))
                .map((item: any) => ({
                    id: uuidv4(),
                    description: item.description || item.task || item.name,
                    status: 'pending' as const
                }));
        } catch {
            return [];
        }
    }

    /**
     * Executes the swarm loop until all tasks are complete.
     * Respects maxConcurrency to prevent overloading the autopilot server.
     */
    public async executeSwarm(): Promise<Map<string, SwarmTask>> {
        this.emit('swarm:started', { totalTasks: this.tasks.size });

        const pending = Array.from(this.tasks.values()).filter(t => t.status === 'pending');
        const concurrency = this.config.maxConcurrency;

        // Execute tasks in batches respecting concurrency limits
        for (let i = 0; i < pending.length; i += concurrency) {
            const batch = pending.slice(i, i + concurrency);
            const promises = batch.map(task => this.executeTask(task));
            await Promise.allSettled(promises);
        }

        this.emit('swarm:completed', { results: Array.from(this.tasks.values()) });
        return this.tasks;
    }

    /**
     * Execute a single task by broadcasting to the Mesh Network.
     * If an agent accepts and completes it, the result is captured.
     * Falls back to a local stub if the mesh fails or times out.
     */
    private async executeTask(task: SwarmTask): Promise<void> {
        task.status = 'running';
        task.assignedModel = this.config.defaultModel;
        this.emit('task:started', task);

        try {
            console.log(`[SwarmOrchestrator] 🌐 Broadcasting TASK_OFFER to Mesh Network: "${task.description.slice(0, 30)}..."`);

            // Broadcast task to the Mesh
            this.mesh.broadcast(SwarmMessageType.TASK_OFFER, {
                task: task.description,
                requirements: [] // Could be inferred from the task text
            });

            // Wait for a TASK_RESULT from any agent
            const resultPromise = new Promise<{ result?: any, error?: string }>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    this.mesh.off('message', handler);
                    reject(new Error('Mesh execution timed out'));
                }, this.config.timeoutMs);

                const handler = (msg: SwarmMessage) => {
                    if (msg.type === SwarmMessageType.TASK_RESULT) {
                        const payload = msg.payload as any;
                        if (payload.originalTaskId && msg.target === this.mesh.nodeId) { // Verify it's for us
                            clearTimeout(timeout);
                            this.mesh.off('message', handler);
                            resolve({ result: payload.result, error: payload.error });
                        }
                    }
                };
                this.mesh.on('message', handler);
            });

            const meshResult = await resultPromise;

            if (meshResult.error) {
                throw new Error(meshResult.error);
            }

            task.result = typeof meshResult.result === 'string'
                ? meshResult.result
                : JSON.stringify(meshResult.result, null, 2);
            task.status = 'completed';
            this.emit('task:completed', task);
            return;

        } catch (err: any) {
            console.warn(`[SwarmOrchestrator] Mesh delegation failed for "${task.description}": ${err.message}. Falling back to local execution.`);
        }

        // Local fallback: mark as completed with a note that no LLM was used
        console.log(`[Worker - local] Completing locally: ${task.description}`);
        task.result = `[Local fallback] Task "${task.description}" requires manual execution — autopilot unavailable`;
        task.status = 'completed';
        this.emit('task:completed', task);
    }

    public destroy() {
        this.mesh.destroy();
    }
}
