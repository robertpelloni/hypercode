
import { LLMService, IAgent } from "@hypercode/ai";
import { PromptRegistry } from "../prompts/PromptRegistry.js";
import { EventEmitter } from 'events';
import { A2AMessage, A2AMessageType, IA2AClient, A2ATask } from "@hypercode/adk";
import { a2aBroker } from "@hypercode/agents";

interface AgentState {
    history: { role: 'user' | 'model', parts: any[] }[];
    status: 'idle' | 'thinking' | 'acting' | 'error';
    lastError?: string;
}

export class ClaudeAgent extends EventEmitter implements IAgent, IA2AClient {
    private llmService: LLMService;
    private promptRegistry: PromptRegistry;
    private state: AgentState;
    // Anthropic provider — using the latest Claude 3.5 Sonnet model
    private model: string = 'claude-3-5-sonnet-20241022';
    private onMessageCallback?: (message: A2AMessage) => void;

    constructor(llmService: LLMService, promptRegistry: PromptRegistry) {
        super();
        this.llmService = llmService;
        this.promptRegistry = promptRegistry;
        this.state = {
            history: [],
            status: 'idle'
        };

        // Register with A2A Broker
        a2aBroker.registerAgent('claude', this);
        this.startA2AHeartbeat();
    }

    private startA2AHeartbeat() {
        setInterval(() => {
            a2aBroker.routeMessage({
                id: `heartbeat-claude-${Date.now()}`,
                timestamp: Date.now(),
                sender: 'claude',
                type: A2AMessageType.HEARTBEAT,
                payload: {}
            });
        }, 15000);
    }

    // A2A Implementation
    async sendMessage(message: A2AMessage): Promise<void> {
        console.log(`[ClaudeAgent] Received A2A message of type: ${message.type}`);

        if (message.type === A2AMessageType.TASK_NEGOTIATION) {
            await a2aBroker.routeMessage({
                id: `a2a-bid-${Date.now()}`,
                timestamp: Date.now(),
                sender: 'claude',
                recipient: message.sender,
                type: A2AMessageType.CAPABILITY_REPORT,
                payload: {
                    agentId: 'claude',
                    capabilities: ['reasoning', 'coding', 'architecture'],
                    canHandle: true,
                    estimatedLatencyMs: 3000,
                    reasoning: 'Ready to assist with architecture and complex coding.'
                },
                replyTo: message.id
            });
            return;
        }

        if (message.type === A2AMessageType.TASK_REQUEST) {
            const response = await this.send(message.payload.task, message.payload.metadata);
            await a2aBroker.routeMessage({
                id: `a2a-${Date.now()}`,
                timestamp: Date.now(),
                sender: 'claude',
                recipient: message.sender,
                type: A2AMessageType.TASK_RESPONSE,
                payload: { result: response },
                replyTo: message.id
            });
        } else if (message.type === A2AMessageType.STATE_UPDATE && message.payload.action === 'REPORT_CAPABILITIES') {
            await a2aBroker.routeMessage({
                id: `a2a-cap-${Date.now()}`,
                timestamp: Date.now(),
                sender: 'claude',
                type: A2AMessageType.STATE_UPDATE,
                payload: { 
                    capabilities: ['reasoning', 'coding', 'architecture', 'refactoring'],
                    role: 'Frontier Architect'
                }
            });
        }
    }

    onMessage(callback: (message: A2AMessage) => void): void {
        this.onMessageCallback = callback;
    }

    async delegateTask(task: A2ATask, recipient: string): Promise<A2ATask> {
        await a2aBroker.routeMessage({
            id: `a2a-task-${task.id}`,
            timestamp: Date.now(),
            sender: 'claude',
            recipient: recipient,
            type: A2AMessageType.TASK_REQUEST,
            payload: { task: task.description, metadata: { taskId: task.id, priority: task.priority } }
        });
        task.status = 'in_progress';
        return task;
    }

    async start() {
        console.log("[ClaudeAgent] Starting...");
        await this.promptRegistry.initialize();
        this.emit('ready');
    }

    async send(message: string, context?: any): Promise<string> {
        this.state.status = 'thinking';
        this.emit('state', this.state);

        try {
            // 1. Get System Prompt
            let systemPrompt = "You are Claude, a helpful AI assistant.";
            const template = this.promptRegistry.get('claude_core');
            if (template) {
                systemPrompt = this.promptRegistry.render('claude_core', context || {});
            }

            // 2. Add to history
            this.state.history.push({ role: 'user', parts: [{ text: message }] });

            // 3. Generate via Anthropic provider with conversation history
            const response = await this.llmService.generateText(
                'anthropic',
                this.model,
                systemPrompt,
                message,
                {
                    history: this.state.history.map(h => ({
                        role: h.role === 'model' ? 'assistant' : h.role,
                        content: h.parts.map((p: any) => p.text).join('\n')
                    }))
                }
            );

            const reply = response.content;

            this.state.history.push({ role: 'model', parts: [{ text: reply }] });
            this.state.status = 'idle';
            this.emit('output', reply);
            this.emit('state', this.state);

            return reply;

        } catch (e: any) {
            this.state.status = 'error';
            this.state.lastError = e.message;
            this.emit('error', e);
            throw e;
        }
    }

    isActive(): boolean {
        return this.state.status !== 'error';
    }

    reset() {
        this.state.history = [];
        this.state.status = 'idle';
        this.emit('state', this.state);
    }
}
