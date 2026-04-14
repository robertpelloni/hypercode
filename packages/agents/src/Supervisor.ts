import { LLMService } from "@hypercode/ai";
import type { IMCPServer } from "@hypercode/adk";

interface SubTask {
    id: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    assignedTo: string; // 'worker' | 'researcher' | 'coder'
    result?: string;
}

interface SupervisorContext {
    goal: string;
    subtasks: SubTask[];
    history: string[];
}

export class Supervisor {
    private server: IMCPServer;
    private llmService: LLMService;

    constructor(server: IMCPServer) {
        this.server = server;
        // @ts-ignore
        this.llmService = new LLMService(server.modelSelector);
    }

    /**
     * Decomposes a high-level goal into actionable subtasks.
     */
    public async decompose(goal: string): Promise<SubTask[]> {
        const prompt = `GOAL: ${goal}
        
        You are the Supervisor. Break this goal down into 3-5 distinct, actionable subtasks.
        Each subtask must be assignable to a specific specialized worker persona:
        - 'researcher': Web search, documentation reading, data gathering.
        - 'coder': Writing code, fixing bugs, running tests.
        - 'worker': General file operations, system commands.

        Return a JSON array of objects with structure:
        { "description": "string", "assignedTo": "researcher|coder|worker" }
        `;

        try {
            const model = await this.server.modelSelector.selectModel({ taskComplexity: 'medium', routingTaskType: 'planning' });
            const response = await this.llmService.generateText(model.provider, model.modelId, "Supervisor Planning", prompt, {
                taskComplexity: 'medium',
                routingTaskType: 'planning',
            });

            // Extract JSON
            let jsonStr = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
            // Basic heuristic cleanup if model adds text
            const firstBracket = jsonStr.indexOf('[');
            const lastBracket = jsonStr.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1) {
                jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
            }

            const rawTasks = JSON.parse(jsonStr);

            return rawTasks.map((t: any, index: number) => ({
                id: `subtask-${Date.now()}-${index}`,
                description: t.description,
                status: 'pending',
                assignedTo: t.assignedTo || 'worker'
            }));

        } catch (error) {
            console.error("[Supervisor] Decomposition failed:", error);
            // Fallback: Single task
            return [{
                id: `subtask-${Date.now()}-fallback`,
                description: goal,
                status: 'pending',
                assignedTo: 'worker'
            }];
        }
    }

    /**
     * Orchestrates the execution of a goal by managing subtasks.
     */
    public async supervise(goal: string, maxSteps: number = 20): Promise<string> {
        console.log(`[Supervisor] 🛡️ Taking control of goal: "${goal}"`);

        // 1. Plan
        const subtasks = await this.decompose(goal);
        console.log(`[Supervisor] 📋 Plan created with ${subtasks.length} steps:`);
        subtasks.forEach(t => console.log(`  - [${t.assignedTo}] ${t.description}`));

        const context: SupervisorContext = {
            goal,
            subtasks,
            history: []
        };

        // 2. Execute Loop
        let finalResult = "";

        for (const task of subtasks) {
            task.status = 'in_progress';
            console.log(`[Supervisor] ▶️ Starting subtask: ${task.description}`);

            try {
                // Delegation: In a real system, this spawns a *new* Director/Worker instance.
                // For Phase 24, we will execute it using a "Scoped Director" approach or simply recursive tool usage.
                // Since 'Director' is the main loop, we can simulate delegation by calling tools directly 
                // but determining the tools based on the persona.

                const result = await this.executeSubTask(task);
                task.result = result;
                task.status = 'completed';
                context.history.push(`Task [${task.description}] Completed: ${result}`);
            } catch (e: any) {
                task.status = 'failed';
                task.result = e.message;
                context.history.push(`Task [${task.description}] Failed: ${e.message}`);
                console.error(`[Supervisor] ❌ Subtask failed: ${e.message}`);
            }
        }

        // 3. Summarize
        return `Supervisor Execution Complete.\nSummary:\n${context.history.join('\n')}`;
    }

    /**
     * Simulates the execution of a subtask by a "Worker".
     * Ideally this would spin up a `Worker` class instance.
     */
    private async executeSubTask(task: SubTask): Promise<string> {
        // "Mock" Spawner for now - we just use the LLM to decide on a single tool call to start it, 
        // or simplistic execution. 
        // Real implementation: Instantiate a `Worker` (mini-Director) and await its result.

        // Use the Sandbox/CodeMode for 'coder' tasks?
        if (task.assignedTo === 'coder') {
            return `[Delegated to Coder]: Logic requires Worker implementation. For now, executing: ${task.description}`;
        }

        return `[Delegated to ${task.assignedTo}]: ${task.description} (Simulated Success)`;
    }
}
