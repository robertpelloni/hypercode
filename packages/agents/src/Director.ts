import type { IMCPServer, IAgentMemoryService } from "@hypercode/adk";
import { LLMService } from "@hypercode/ai";
import { Council } from "./Council.js";
import { DIRECTOR_SYSTEM_PROMPT } from "@hypercode/ai";
import { WorktreeManager } from "./orchestration/WorktreeManager.js";

interface AgentContext {
    goal: string;
    history: string[];
    maxSteps: number;
}

export class Director {
    private server: IMCPServer;
    private llmService: LLMService;
    private council: Council;
    private worktreeManager: WorktreeManager;
    private memoryService: IAgentMemoryService | undefined;

    // Auto-Drive State
    private isAutoDriveActive: boolean = false; // SAFE START: Default to false
    private currentStatus: 'IDLE' | 'THINKING' | 'DRIVING' = 'IDLE';
    private monitor: ConversationMonitor | null = null; // Smart Supervisor

    // Execution State
    private activeGoal: string | null = null;
    public currentProjectTask: any = null; // Phase 59: Track active project task
    private lastGoal: string | null = null;
    private lastGoalTime: number = 0;
    private currentStep: number = 0;
    private maxSteps: number = 0;
    private history: string[] = [];

    constructor(server: IMCPServer) {
        this.server = server;
        // @ts-ignore
        this.llmService = new LLMService(server.modelSelector);
        // @ts-ignore
        this.council = new Council(server.modelSelector);
        // @ts-ignore
        this.council.setServer(server);
        this.worktreeManager = new WorktreeManager();

        // @ts-ignore
        if (server.agentMemoryService) {
            // @ts-ignore
            this.memoryService = server.agentMemoryService;
        }

        // 🧠 Restore Session State
        // @ts-ignore
        if (server.sessionManager) {
            // @ts-ignore
            const state = server.sessionManager.getState();
            if (state.isAutoDriveActive) {
                console.log(`[Director] 🔄 Restoring Auto-Drive State (Goal: ${state.activeGoal})`);
                this.isAutoDriveActive = true;
                this.currentStatus = 'DRIVING';
                this.activeGoal = state.activeGoal;
                this.startMonitor(); // Reboot monitors
            }
        }
    }

    // Configuration
    private config = {
        defaultTopic: "Implement Roadmap Features",
        taskCooldownMs: 10000,
        heartbeatIntervalMs: 60000,  // Increased from 30s to reduce focus stealing
        periodicSummaryMs: 120000,
        pasteToSubmitDelayMs: 1000,
        acceptDetectionMode: 'polling' as 'polling' | 'state',
        pollingIntervalMs: 60000,  // Increased from 30s
        targetWindowTitle: 'Code' as string,  // Target VS Code window for keystroke injection
        // Personality & Custom Instructions
        // Personality & Custom Instructions
        persona: 'default' as 'default' | 'homie' | 'professional' | 'chaos',
        customInstructions: "", // User-defined hints/themes

        // Advanced Controls
        enableChatPaste: true, // Output to Chat Window
        enableCouncil: true, // Autonomous Decision Making
        autoSubmitChat: true, // If true, Director submits its own messages immediately
        chatPrefix: "[Director]:", // Prefix for chat messages
        // Message Type Prefixes
        directorActionPrefix: "🎬 **Director Action**:",
        councilPrefix: "🏛️ [Council]:",
        statusPrefix: "📊 [Director Status]:",

        lmStudioTimeoutMs: 30000, // Timeout for LLM requests
        stopDirector: false, // Emergency Stop (Software Toggle)
        nudgeThresholdMs: 300000, // Inactivity nudge threshold (5 mins)
        verboseLogging: false
    };

    public getConfig() {
        return { ...this.config };
    }

    public updateConfig(newConfig: Partial<typeof this.config>) {
        console.log(`[Director] Updating Config:`, JSON.stringify(newConfig));
        this.config = { ...this.config, ...newConfig };
        // Trigger any side effects (e.g. restarting timers) if necessary
        if (this.monitor) {
            // this.monitor.updateConfig(this.config); // TODO: Implement if monitor needs it
        }
    }

    public getStatus() {
        return {
            active: this.isAutoDriveActive,
            status: this.currentStatus,
            goal: this.activeGoal,
            step: this.currentStep,
            totalSteps: this.maxSteps,
            lastHistory: this.history.slice(-3),
            config: this.config
        };
    }

    /**
     * Handles a user message.
     * If Idle/Finished: Starts a new task with the message as goal.
     * If Busy: Injects the message into the active history for the agent to see in the next step.
     */
    public async handleUserMessage(message: string): Promise<string> {
        if (this.currentStatus === 'IDLE' || this.activeGoal === null) {
            // Start new task
            this.executeTask(message, 20, 'user'); // Fire and forget (async)
            return "Started new task: " + message;
        } else {
            // Inject into running context
            console.log(`[Director] 📨 Injecting user message into running task: "${message}"`);
            this.history.push(`\n[USER INTERRUPTION]: ${message}\n(You must Address this immediately)`);
            return "Message sent to running agent.";
        }
    }

    /**
     * Executes a single goal using the Director's reasoning loop.
     */
    async executeTask(goal: string, maxSteps: number = 10, origin: 'user' | 'council' = 'user'): Promise<string> {
        // Prevent Spam: If exact same goal as last time and finished recently, skip.
        if (this.activeGoal === goal || (this.history.length > 0 && this.lastGoal === goal && Date.now() - this.lastGoalTime < 60000)) {
            console.error(`[Director] 🚫 Skipping duplicate goal: "${goal}"`);
            return "Skipped duplicate goal.";
        }

        this.lastGoal = goal;
        this.lastGoalTime = Date.now();
        this.activeGoal = goal;
        this.maxSteps = maxSteps;
        this.history = [];
        this.currentStatus = 'DRIVING';

        // Generate a task ID (slug)
        const taskId = `task-${Date.now()}-${goal.substring(0, 10).replace(/[^a-zA-Z0-9]/g, '')}`;
        let worktreePath = "";

        try {
            worktreePath = await this.worktreeManager.createTaskEnvironment(taskId);
            console.log(`[Director] 🌳 Worktree created at: ${worktreePath}`);
        } catch (e) {
            console.error(`[Director] Failed to create worktree, falling back to main cwd: ${e}`);
        }

        // 0. Retrieve Context from Memory (Hippocampus)
        let priorContext = "";
        if (this.memoryService) {
            try {
                const memories = await this.memoryService.search(goal, { limit: 3, type: 'long_term' });
                if (memories.length > 0) {
                    priorContext = `\n\n[RECALLED MEMORIES]:\n${memories.map(m => `- ${m.content} (Confidence: ${m.score?.toFixed(2)})`).join('\n')}\n(Use these memories to guide your plan)`;
                    console.log(`[Director] 🧠 Recalled ${memories.length} relevant memories.`);
                }
            } catch (e) {
                console.warn(`[Director] Memory retrieval failed: ${e}`);
            }
        }

        const context: AgentContext = {
            goal: `${goal}\n\n[ENVIRONMENT]: You are working in an ISOLATED git worktree at '${worktreePath}'.\nALL file operations (View, Edit, Create) MUST use this path as the base or absolute path.\nDo NOT edit files outside this directory unless explicitly analyzing 'main'.${priorContext}`,
            history: this.history,
            maxSteps
        };

        console.error(`[Director] Starting task: "${goal}" (Limit: ${maxSteps} steps)`);

        const actionPrefix = origin === 'council'
            ? (this.config.councilPrefix || "🏛️ [Council]:")
            : (this.config.directorActionPrefix || "🎬 **Director Action**:");

        await this.broadcast(`${actionPrefix} ${goal}`);

        let taskResult = "Task stopped: Max steps reached.";

        try {
            for (let step = 1; step <= maxSteps; step++) {
                this.currentStep = step;
                if (!this.isAutoDriveActive && step > 1) { // Allow single run, but check auto flag if in loop
                    // pass
                }

                console.error(`[Director] Step ${step}/${maxSteps}`);

                // 1. Think
                const plan = await this.think(context);
                context.history.push(`Thinking: ${plan.reasoning}`);

                if (plan.action === 'FINISH') {
                    console.error("[Director] Task Completed.");
                    this.activeGoal = null;
                    this.currentStatus = this.isAutoDriveActive ? 'IDLE' : 'IDLE';
                    taskResult = plan.result || "Task completed successfully.";

                    // Attempt Merge
                    if (worktreePath) {
                        try {
                            await this.worktreeManager.mergeTask(taskId);
                            taskResult += " (Merged)";

                            // 🧠 Save Success to Long-Term Memory
                            if (this.memoryService) {
                                await this.memoryService.addLongTerm(
                                    `Task "${goal}" completed successfully.\nSummary: ${taskResult}`,
                                    { source: 'director', confidence: 1.0, tags: ['success', 'task'] }
                                );
                                console.log(`[Director] 🧠 Consolidated success to long-term memory.`);
                            }

                        } catch (e: any) {
                            taskResult += ` (Merge Failed: ${e.message})`;
                            console.error(`[Director] Worktree merge failed: ${e}`);
                        }

                        // Phase 59: Complete Project Task
                        // @ts-ignore
                        if (this.currentProjectTask && this.server.projectTracker) {
                            try {
                                // @ts-ignore
                                this.server.projectTracker.completeTask(this.currentProjectTask);
                                console.log(`[Director] ✅ Marked task "${this.currentProjectTask.description}" as complete.`);
                                this.currentProjectTask = null;
                            } catch (e) { console.error(`[Director] Failed to complete project task: ${e}`); }
                        }
                    }
                    break;
                }

                // 1b. Council Advice (Advisory but using Consensus Engine)
                const isHighAutonomy = this.server.permissionManager.getAutonomyLevel() === 'high';
                if (!isHighAutonomy && !plan.toolName.startsWith('vscode_read') && !plan.toolName.startsWith('list_')) {
                    // Quick consult, no blocking UI
                    // Uses the consensus engine for a quick check
                    const debate = await this.council.runConsensusSession(`Action: ${plan.toolName}. Reasoning: ${plan.reasoning}`);
                    context.history.push(`Council Advice: ${debate.summary}`);
                    console.error(`[Director] 🛡️ Council Advice: ${debate.summary}`);
                }

                // 2. Act
                try {
                    console.error(`[Director] Executing: ${plan.toolName}`);

                    // Inject CWD if tool supports it? 
                    // Most tools don't have explicit CWD override in top-level params unless designed so.
                    // But we told the agent "You are in ${worktreePath}".
                    // If the agent calls `run_command`, it should provide `Cwd: worktreePath`.
                    // If the agent calls `write_file`, it should provide `TargetFile: worktreePath/foo.ts`.

                    const result = await this.server.executeTool(plan.toolName, plan.params);
                    const observation = JSON.stringify(result);
                    context.history.push(`Action: ${plan.toolName}(${JSON.stringify(plan.params)})`);
                    context.history.push(`Observation: ${observation}`);
                } catch (error: any) {
                    console.error(`[Director] Action Failed: ${error.message}`);
                    context.history.push(`Error: ${error.message}`);
                }
            }
        } finally {
            // Cleanup
            if (worktreePath) {
                await this.worktreeManager.cleanupTaskEnvironment(taskId);
            }
        }

        return taskResult;
    }

    /**
     * Phase 60: The Mesh - P2P Delegation
     * Broadcasts a task to the Swarm for fulfillment.
     */
    public async delegateToSwarm(task: string, requirements: string[] = ['Worker']): Promise<string> {
        // @ts-ignore
        const mesh = this.server.meshService;
        if (!mesh) {
            return "Swarm Mesh not available.";
        }

        console.log(`[Director] 🕸️ Delegating task to Swarm: "${task}"`);

        // Broadcast TASK_OFFER
        // Using string type to avoid cyclic dependency on @hypercode/core definitions
        mesh.broadcast('TASK_OFFER', {
            task,
            requester: 'Director', // Identity
            requirements
        });

        // In a real implementation, we would wait for 'TASK_ACCEPT' response
        // For now, we fire-and-forget and log.
        return "Task broadcasted to Swarm network.";
    }

    /**
     * Starts the Autonomous Loop.
     * Unlike before, this DOES NOT rely on the Chat Input Box.
     * It runs internally and posts updates to Chat.
     */
    async startAutoDrive(): Promise<string> {
        if (this.isAutoDriveActive) {
            return "Auto-Drive is already active.";
        }
        this.isAutoDriveActive = true;
        this.currentStatus = 'DRIVING';

        // Persist State
        // @ts-ignore
        if (this.server.sessionManager) {
            // @ts-ignore
            this.server.sessionManager.updateState({
                isAutoDriveActive: true,
                activeGoal: this.activeGoal
            });
            // @ts-ignore
            this.server.sessionManager.save();
        }

        // Init Live Feed
        try {
            const fs = await import('fs');
            const path = await import('path');
            fs.writeFileSync(path.join(process.cwd(), 'DIRECTOR_LIVE.md'), '# 🎬 Director Live Feed\nWaiting for action...\n');
        } catch (e) { }

        console.error(`[Director] Starting Auto-Drive (Internal Loop)...`);
        await this.broadcast("⚡ **Auto-Drive Engaged**\nI am now operating autonomously. The Council will direct the workflow.");

        // Start Monitor to handle Idle states by triggering Council
        this.startMonitor();

        return "Auto-Drive Started.";
    }

    stopAutoDrive() {
        console.error("[Director] Stopping Auto-Drive...");
        this.isAutoDriveActive = false;
        this.currentStatus = 'IDLE';
        if (this.monitor) {
            this.monitor.stop();
            this.monitor = null;
        }
    }

    /**
     * The heartbeat of Autonomy.
     * Checks for "Needs Approval" (Terminal) or "Idle" (Needs Direction).
     */
    private startMonitor() {
        this.monitor = new ConversationMonitor(this.server, this.llmService, this);
        this.monitor.start();
    }

    // --- Helpers ---

    // --- Helpers ---

    public async broadcast(message: string) {
        // In a real system, this would push to the UI via WebSocket
        console.log(`\n📢 [DIRECTOR BROADCAST]: ${message}\n`);
        // LIVE FEED: Write to DIRECTOR_LIVE.md for IDE Visibility
        try {
            const fs = await import('fs');
            const path = await import('path');
            const feedPath = path.join(process.cwd(), 'DIRECTOR_LIVE.md');
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = `\n### [${timestamp}] Director\n${message}\n`;

            // Append to file
            fs.appendFileSync(feedPath, logEntry);
        } catch (e) { }

        // LIVE FEED: Paste to Chat Window and auto-submit
        try {
            console.error(`[Director] 📤 Broadcasting to chat: ${message.substring(0, 50)}...`);
            // Paste to chat (Extension focuses chat window)
            // Note: We DO NOT submit status updates automatically, as this causes a feedback loop
            // where the Agent treats its own status message as a new User Command.
            // SILENCING BROADCAST TO STOP LOOP
            // @ts-ignore
            const config = this.config;
            if (!config.stopDirector && (config.enableChatPaste !== false)) {
                // BLOCKING: Wait for paste delay to prevent spam
                const delay = config.pasteToSubmitDelayMs || 1000;

                const prefix = config.chatPrefix !== undefined ? config.chatPrefix : '[Director]:';
                await this.server.executeTool('chat_reply', {
                    text: `${prefix} ${message}`,
                    submit: config.autoSubmitChat || false
                });

                if (config.autoSubmitChat) {
                    // Wait extra time for submission to process
                    await new Promise(r => setTimeout(r, delay + 2000));
                } else {
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        } catch (e: any) {
            console.error(`[Director] ❌ Broadcast Error: ${e.message}`);
        }
    }

    private async think(context: AgentContext): Promise<any> {
        let memoryContext = "";
        try {
            // @ts-ignore
            const memoryResult = await this.server.executeTool("search_codebase", { query: context.goal });
            // @ts-ignore
            const memoryText = memoryResult.content?.[0]?.text || "";
            if (memoryText && !memoryText.includes("No matches")) {
                memoryContext = `\nRELEVANT CODEBASE CONTEXT:\n${memoryText.substring(0, 2000)}\n`;
            }
        } catch (e) { }

        const model = await this.server.modelSelector.selectModel({ taskComplexity: 'medium' });

        // Pinned Context Injection
        // @ts-ignore
        const pinnedContext = this.server.contextManager ? this.server.contextManager.getContextPrompt() : "";

        // Shell History Injection
        let shellContext = "";
        try {
            // @ts-ignore
            if (this.server.shellService) {
                // @ts-ignore
                const history = await this.server.shellService.getHistory(10); // Get last 10 commands
                if (history && history.length > 0) {
                    shellContext = `\nRECENT SHELL HISTORY:\n${history.join('\n')}\n`;
                }
            }
        } catch (e) { }

        let systemPrompt = DIRECTOR_SYSTEM_PROMPT;

        // Inject Personality
        if (this.config.persona === 'homie') {
            systemPrompt += "\n\nSTYLE: Informal, friendly, use emojis (🤙, 🚀). concise.";
        } else if (this.config.persona === 'professional') {
            systemPrompt += "\n\nSTYLE: Formal, precise, no emojis. Focus on business value.";
        } else if (this.config.persona === 'chaos') {
            systemPrompt += "\n\nSTYLE: Chaotic goodness. Maximally creative. Unpredictable but functional.";
        }

        // Inject User Custom Instructions
        if (this.config.customInstructions && this.config.customInstructions.trim().length > 0) {
            systemPrompt += `\n\nUSER OVERRIDE INSTRUCTIONS:\n${this.config.customInstructions}\n(You MUST prioritize these instructions over default styles)`;
        }

        // PRUNE HISTORY (Infinite Context V3)
        // Convert history strings to pseudo-messages for the pruner
        const rawMessages = context.history.map(h => ({ role: 'user', content: h }));

        // @ts-ignore
        const safeMessages = this.server.memoryManager ? this.server.memoryManager.pruneContext(rawMessages, {
            maxTokens: 10000, // Reasonable logic history limit
            keepFirst: 0,
            keepLast: 10 // Always keep last 10 steps
        }) : rawMessages;

        const effectiveHistory = safeMessages.map((m: any) => m.content);

        const userPrompt = `GOAL: ${context.goal}\n${memoryContext}\n${pinnedContext}\n${shellContext}\nHISTORY:\n${effectiveHistory.join('\n')}\nWhat is the next step?`;

        try {
            // @ts-ignore
            const timeout = this.config.lmStudioTimeoutMs || 30000;
            const response = await this.llmService.generateText(model.provider, model.modelId, systemPrompt, userPrompt, { timeout });
            let jsonStr = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (error) {
            return this.heuristicFallback(context);
        }
    }

    private heuristicFallback(context: AgentContext): any {
        const goal = context.goal.toLowerCase();
        const lastEntry = context.history[context.history.length - 1] || "";

        // Research Heuristic
        if (/(?:research|learn|understand|investigate|deep dive)/i.test(goal)) {
            // Check if we already did research
            const hasResearched = context.history.some(h => h.includes("research_recursively"));
            if (!hasResearched) {
                return {
                    action: 'CONTINUE',
                    toolName: 'research_recursively',
                    params: { topic: goal, depth: 2 },
                    reasoning: "Goal involves research, starting deep dive."
                };
            }
        }

        if (!lastEntry) return { action: 'CONTINUE', toolName: 'list_files', params: { path: process.cwd() }, reasoning: "Looking around." };

        // Detect loops
        if (context.history.length > 5 && lastEntry === context.history[context.history.length - 3]) {
            return { action: 'FINISH', toolName: '', params: {}, result: "Stuck in loop.", reasoning: "Loop detected." };
        }

        return { action: 'FINISH', toolName: '', params: {}, result: "Heuristic finish.", reasoning: "No LLM response." };
    }

    // Expose for Monitor
    public getIsActive() { return this.isAutoDriveActive; }
}

class ConversationMonitor {
    private server: IMCPServer;
    private llmService: LLMService;
    private director: Director;
    private interval: NodeJS.Timeout | null = null;
    private summaryInterval: NodeJS.Timeout | null = null; // 2-min summary timer
    private lastActivityTime: number = Date.now();
    private isRunningTask: boolean = false;

    constructor(server: IMCPServer, llmService: LLMService, director: Director) {
        this.server = server;
        this.llmService = llmService;
        this.director = director;
    }

    start() {
        if (this.interval) clearTimeout(this.interval); // Cleanup old standard
        if (this.summaryInterval) clearTimeout(this.summaryInterval);

        this.isRunningTask = false;

        // Start Heartbeat Loop
        const runHeartbeat = async () => {
            if (!this.director.getIsActive()) return;

            await this.checkAndAct();

            // @ts-ignore
            const config = this.director.getConfig();
            const delay = config.heartbeatIntervalMs || 30000;
            // @ts-ignore
            this.interval = setTimeout(runHeartbeat, delay);
        };

        // Start Summary Loop
        const runSummary = async () => {
            if (!this.director.getIsActive()) return;

            await this.postPeriodicSummary();

            // @ts-ignore
            const config = this.director.getConfig();
            const delay = config.periodicSummaryMs || 120000;
            // @ts-ignore
            this.summaryInterval = setTimeout(runSummary, delay);
        };

        // Kickoff
        // @ts-ignore
        this.interval = setTimeout(runHeartbeat, 1000);
        // @ts-ignore
        this.summaryInterval = setTimeout(runSummary, 60000);

        console.log(`[ConversationMonitor] Started dynamic loops.`);
    }

    stop() {
        if (this.interval) clearTimeout(this.interval);
        if (this.summaryInterval) clearTimeout(this.summaryInterval);
        this.interval = null;
        this.summaryInterval = null;
    }

    private lastSummary: string = "";

    /**
     * Posts a periodic summary to the chat to keep the development loop alive.
     * Reads context files (README, ROADMAP, DIRECTOR_LIVE) and generates summary.
     */
    private async postPeriodicSummary() {
        if (!this.director.getIsActive()) return;
        if (this.isRunningTask) return; // Don't interrupt ongoing work

        try {
            const fs = await import('fs');
            const path = await import('path');
            const cwd = process.cwd();

            // Read context files
            let context = '## Current Context\n';
            const readFile = (name: string) => {
                try {
                    const p = path.join(cwd, name);
                    if (fs.existsSync(p)) {
                        const content = fs.readFileSync(p, 'utf8').substring(0, 1000);
                        return `### ${name}\n${content}\n`;
                    }
                } catch (e) { }
                return '';
            };

            context += readFile('README.md');
            context += readFile('docs/ROADMAP.md');
            context += readFile('docs/USER_DIRECTIVES_INBOX.md');
            context += readFile('DIRECTOR_LIVE.md');

            // Feed actual chat history (Scraped via extension)
            try {
                const chatRes = await this.server.executeTool('get_chat_history', {});
                const chatHistory = chatRes.content?.[0]?.text || "";
                if (chatHistory && !chatHistory.includes("Error")) {
                    context += `\n### LATEST CHAT CONVERSATION (Scraped):\n${chatHistory.slice(-2000)}\n`;
                }
            } catch (e) { }

            // Generate brief summary via LLM
            // Generate brief summary via LLM
            const config = this.director.getConfig();
            const prompt = `You are the Director. Based on the following context, write a 1-sentence status update for the development chat. 
            
            Current Default Focus: "${config.defaultTopic}"
            
            Crucial: If the system is waiting for the Council or User, say exactly what you are waiting for, but add an encouraging remark about the Default Focus.
            Example: "Standing by for user input. Ready to proceed with Roadmap features."
            
            If nothing has changed, output "SAME".
            Tone: Brief, actionable, and encouraging.
            \n\n${context}`;

            const model = await this.server.modelSelector.selectModel({ task: 'summary' });
            const response = await this.llmService.generateText(model.provider, model.modelId, 'Director Status', prompt);
            let summary = response.content.trim().substring(0, 200);

            if (summary === "SAME" || summary === this.lastSummary) {
                console.log("[Director] Status unchanged, skipping broadcast.");
                return;
            }

            this.lastSummary = summary;

            // Broadcast to chat with Alt-Enter submit
            const statusPrefix = config.statusPrefix || "📊 [Director Status]:";
            if (config.enableChatPaste !== false) {
                // USER REQUEST: Auto-submit this summary to drive the loop
                await this.server.executeTool('chat_reply', { text: `${statusPrefix} ${summary}`, submit: true });
            }
            // await new Promise(r => setTimeout(r, 500));
            // await this.server.executeTool('vscode_submit_chat', {});

            console.error(`[Director] 📊 Posted periodic summary.`);
        } catch (e: any) {
            console.error(`[Director] Summary Error: ${e.message}`);
        }
    }

    private async checkAndAct() {
        console.error(`[Director] ❤️ Monitor Heartbeat (Active: ${this.director.getIsActive()})`); // DEBUG
        if (!this.director.getIsActive()) {
            this.stop();
            return;
        }

        // [Phase 9] Healer Logic: Detect Failures
        // @ts-ignore
        if (this.server.autoTestService && !this.isRunningTask) {
            // @ts-ignore
            const results = this.server.autoTestService.testResults;
            if (results) {
                for (const [fpath, info] of results.entries()) {
                    // Check if fail within last 60s
                    if (info.status === 'fail' && Date.now() - info.timestamp < 60000) {
                        console.error(`[Director:Healer] 🚑 Detected failure: ${fpath}`);
                        await this.healFailure(fpath, info.output || "No output captured.");
                    }
                }
            }
        }

        // Accept pending changes via Extension (Safe, no terminal spam)
        // Only uses WebSocket bridge to VS Code Extension
        try { await this.server.executeTool('vscode_execute_command', { command: 'interactive.acceptChanges' }); } catch (e) { }

        // PERIODIC ALT+ENTER: Click Accept buttons that pause development
        // Uses WebSocket 'SUBMIT_CHAT' instead of native_input to avoid focus stealing
        // @ts-ignore
        const lastActive = this.server.lastUserActivityTime || 0;
        if (Date.now() - lastActive > 5000) {
            try {
                // Use WebSocket bridge (Safe)
                await this.server.executeTool('chat_submit', {});
            } catch (e) { }
        }

        // If Director is busy executing a task, don't interrupt (unless stuck?)
        if (this.isRunningTask) {
            return;
        }

        const state = await this.detectState();
        await this.respondToState(state);

        // Smart Nudge for Inactivity
        await this.checkInactivity();
    }

    private async checkInactivity() {
        if (!this.director.getIsActive()) return;
        if (this.isRunningTask) return;

        const idleTime = Date.now() - this.lastActivityTime;
        // @ts-ignore
        const config = this.director.getConfig();
        const nudgeThreshold = config.nudgeThresholdMs || 300000; // 5 minutes

        if (idleTime > nudgeThreshold) {
            console.log("[Director] 💡 System idle for too long. Sending Smart Nudge...");

            // Generate a nudge based on current goal/roadmap
            const roadmapStr = this.director.getConfig().defaultTopic || "General improvements";
            const prompt = `The system has been idle for 5 minutes. The current focus is "${roadmapStr}". 
            Suggest a small, specific next task for the Director to work on. Be encouraging and brief.`;

            const model = await this.server.modelSelector.selectModel({ task: 'summary' });
            const response = await this.llmService.generateText(model.provider, model.modelId, 'Director Nudge', prompt);

            const nudge = response.content.trim();
            if (config.enableChatPaste !== false) {
                await this.server.executeTool('chat_reply', {
                    text: `[Director]: ⚡ **Smart Nudge**: ${nudge}`,
                    submit: false // Don't auto-submit nudges, wait for user or council
                });
            }

            this.lastActivityTime = Date.now(); // Reset to prevent spam
        }
    }

    private async detectState(): Promise<'NEEDS_APPROVAL' | 'IDLE' | 'BUSY'> {
        // 1. Check Terminal for "Approve?" (Explicit)
        try {
            // @ts-ignore
            const termResult = await this.server.executeTool('vscode_read_terminal', {});
            // @ts-ignore
            const content = (termResult.content?.[0]?.text || "").trim().slice(-500);
            if (/(?:approve\?|continue\?|\[y\/n\])/i.test(content)) return 'NEEDS_APPROVAL';
        } catch (e) { }

        // 0. Check User Activity (Anti-Hijack)
        // @ts-ignore
        const lastUserActive = this.server.lastUserActivityTime || 0;
        if (Date.now() - lastUserActive < 5000) {
            // User is typing/clicking. Agent must wait.
            // console.error("[Monitor] User Active - Agent Yielding");
            return 'BUSY';
        }

        // 2. Check Time
        const idleTime = Date.now() - this.lastActivityTime;

        // 3. Infer UI Blockage (Inline Chat / Alt-Enter)
        // If we are technically "Running a Task" but have been idle for > 60s (was 5s), 
        // we are likely waiting for an "Alt-Enter" confirmation in the UI.
        if (this.isRunningTask && idleTime > 60000) {
            console.error("[Director] ⚠️ Mid-Task Stall detected (UI Block?). Triggering Approval...");
            return 'NEEDS_APPROVAL';
        }

        // 4. True Idle (Council)
        if (idleTime > 10000 && !this.isRunningTask) return 'IDLE';

        return 'BUSY';
    }

    private async respondToState(state: string) {
        if (state === 'NEEDS_APPROVAL') {
            // @ts-ignore
            const config = this.director.getConfig();
            console.error(`[Director] 🟢 Auto-Approving via VS Code Commands...`);

            // 1. Accept Interactive Changes (Inline Chat / Diff)
            try {
                await this.server.executeTool('vscode_execute_command', { command: 'interactive.acceptChanges' });
            } catch (e) { }

            // 2. Submit Chat (Terminal/Inline)
            try {
                // Try sending 'y' first just in case it's a simple y/n prompt in terminal
                await this.server.executeTool('vscode_execute_command', {
                    command: 'workbench.action.terminal.sendSequence',
                    args: { text: "y\u000D" }
                });
            } catch (e) { }

            // 3. Accept Terminal Chat
            try { await this.server.executeTool('vscode_execute_command', { command: 'workbench.action.terminal.chat.accept' }); } catch (e) { }

            // 4. Fallback: Generic Enter (Less invasive than y+enter+alt+enter)
            await new Promise(r => setTimeout(r, 200));
            try {
                await this.server.executeTool('vscode_execute_command', {
                    command: 'workbench.action.terminal.sendSequence',
                    args: { text: "\u000D" }
                });
            } catch (e) { }

            this.lastActivityTime = Date.now();
        } else if (state === 'IDLE') {
            // IDLE -> Council Meeting -> Execution
            await this.runCouncilLoop();
            this.lastActivityTime = Date.now();
        }
    }

    private lastDirective: string | null = null;
    private recentDirectives: { summary: string, timestamp: number }[] = [];

    private async runCouncilLoop() {
        this.isRunningTask = true;
        try {
            // @ts-ignore
            const config = this.director.getConfig();

            // 0. EMERGENCY KILL SWITCH
            const fs = await import('fs');
            const path = await import('path');
            if (fs.existsSync(path.join(process.cwd(), 'STOP_DIRECTOR')) || config.stopDirector) {
                console.error("[Director] 🛑 Stop Signal Detected. Autonomy halted.");
                this.stop();
                return;
            }

            console.error(`[Director] 🤖 Convening Council (Consensus Session)...`);

            if (config.enableCouncil === false) {
                console.error("[Director] ⏸️ Council Paused by Config.");
                return;
            }

            // @ts-ignore
            const activeCouncil = this.server.council || (this.director as any).council;

            if (activeCouncil) {
                const previousContext = this.lastDirective ? `Previous Directive was: "${this.lastDirective}". The Director just finished this cycle.` : "";
                const focus = config.defaultTopic ? `\n\nCURRENT FOCUS: "${config.defaultTopic}"\n(You MUST verify this focus is being addressed)` : "";

                // Phase 59: Inject Project Tracker Context
                // @ts-ignore
                const projectTracker = this.server.projectTracker;
                // @ts-ignore
                const nextTask = projectTracker ? projectTracker.getNextTask() : null;
                let taskContext = "";
                if (nextTask) {
                    taskContext = `\n\n[PROJECT PLAN]: The next priority task is: "${nextTask.description}" (File: ${nextTask.sourceFile}). Please direct the agent to complete this specific task.`;
                    // @ts-ignore
                    this.director.currentProjectTask = nextTask;
                } else {
                    taskContext = "\n\n[PROJECT PLAN]: No specific tasks found in task.md or ROADMAP.md. Proceed with GENERAL IMPROVEMENTS.";
                }

                // IMPORTANT: Append a note about repitition
                const antiRepetition = `\n\nCRITICAL: Do NOT issue the same directive again. If the previous directive was "${this.lastDirective}", assume it is DONE or FAILED. Choose the NEXT step.`;

                const prompt = `The agent is IDLE. ${previousContext}${focus}${taskContext}${antiRepetition} Review state. Provide a NEW directive. If no work is needed, reply 'DIRECTIVE: STANDBY'.`;

                const directive = await activeCouncil.runConsensusSession(prompt);
                console.error(`[Director] 📜 Council Directive: ${directive.summary}`);

                if (directive.summary && !directive.summary.includes("STANDBY")) {

                    // DUPLICATE DETECTION (Hardened with Fuzzy Match)
                    const now = Date.now();

                    // Helper: Check if two strings effectively mean the same thing (word overlap)
                    const isSimilar = (a: string, b: string) => {
                        if (a === b) return true;
                        const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 2)); // Words > 2 chars
                        const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(w => w.length > 2));
                        // If one string is very short, be careful
                        if (wordsA.size === 0 || wordsB.size === 0) return false;

                        const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
                        const overlap = intersection.size / Math.min(wordsA.size, wordsB.size);
                        return overlap > 0.3; // AGGRESSIVE: > 30% overlap triggers duplicate
                    };

                    const isDuplicate = this.recentDirectives.some(d => isSimilar(d.summary, directive.summary) && (now - d.timestamp) < 300000); // 5 minute window

                    if (isDuplicate) {
                        console.error("[Director] 🛑 Council repeated similar directive (Loop Detected). Sleeping.");
                        // Only reply if we haven't replied recently
                        const lastReply = this.recentDirectives[this.recentDirectives.length - 1];

                        // SILENCE FOR STANDBY: Do not spam chat if it's just 'Abstained' or 'Standby'
                        const isStandby = /abstained|standby|no objection/i.test(directive.summary);

                        if (!isStandby && (!lastReply || (now - lastReply.timestamp) > 30000)) {
                            // @ts-ignore
                            if (this.director.getConfig().enableChatPaste !== false) {
                                await this.server.executeTool('chat_reply', { text: `[Director]: 🛑 Ignoring repetitive directive: "${directive.summary}"`, submit: false });
                            }
                        }

                        // Exponential Backoff simulation: Sleep extra
                        await new Promise(r => setTimeout(r, 10000));
                    } else {
                        this.lastDirective = directive.summary;
                        this.recentDirectives.push({ summary: directive.summary, timestamp: now });
                        if (this.recentDirectives.length > 20) this.recentDirectives.shift();

                        // Update Live Feed
                        const liveFeedPath = (await import('path')).join(process.cwd(), 'DIRECTOR_LIVE.md');
                        try { (await import('fs')).appendFileSync(liveFeedPath, `\n### Council Directive\n${directive.summary}\n`); } catch (e) { }

                        // Execute
                        await this.director.executeTask(directive.summary, 10, 'council');

                        // Report Back
                        // @ts-ignore
                        if (this.director.getConfig().enableChatPaste !== false) {
                            // USER REQUEST: Auto-submit Council Directives
                            await this.server.executeTool('chat_reply', { text: `🏛️ [Council]: ${directive.summary}`, submit: true });
                        }
                    }
                }
            } else {
                console.error("[Director] No Council instance found!");
            }

        } catch (e: any) {
            console.error("Council Error:", e);
        } finally {
            // COOLDOWN: Use config (default 10 seconds)
            // @ts-ignore
            const config = this.director.getConfig();
            let cooldown = config.taskCooldownMs || 10000;

            // EMERGENCY BRAKE: If > 5 directives in 2 minutes, sleep for 5 minutes
            const now = Date.now();
            const recentCount = this.recentDirectives.filter(d => (now - d.timestamp) < 120000).length;

            if (recentCount >= 5) {
                console.error("[Director] 🚨 EMERGENCY BRAKE: High activity detected. Sleeping for 5 minutes.");
                // @ts-ignore
                if (this.director.getConfig().enableChatPaste !== false) {
                    await this.server.executeTool('chat_reply', { text: `[Director]: 🚨 Emergency Brake Engaged (High Traffic). Cooling down for 5m.`, submit: false });
                }
                cooldown = 300000; // 5 minutes
            }

            // Heuristic: If we are looping fast, slow down
            if (this.recentDirectives.length >= 2) {
                const last = this.recentDirectives[this.recentDirectives.length - 1];
                const prev = this.recentDirectives[this.recentDirectives.length - 2];
                if (last && prev && (last.timestamp - prev.timestamp) < 30000) {
                    console.log("[Director] 🐢 Slowing down due to high frequency...");
                    cooldown = Math.max(cooldown, 30000); // Enforce 30s minimum if thrashing
                }
            }

            console.error(`[Director] ⏸️ Cooldown: ${cooldown / 1000} seconds before next Council meeting...`);
            await new Promise(r => setTimeout(r, cooldown));
            this.isRunningTask = false;
        }
    }

    private async healFailure(filePath: string, error: string) {
        console.error(`[Director:Healer] Triggering repair task for ${filePath}`);
        // Delegate to main execution loop
        // We use a high autonomy goal to fix the specific error
        await this.director.executeTask(`Fix the failed test in file: ${filePath}. The error was: ${error}. Analyze the code and error, then use 'replace_in_file' or 'write_file' to fix it. Verification: Run the test again to confirm it passes.`, 5);
    }
}
