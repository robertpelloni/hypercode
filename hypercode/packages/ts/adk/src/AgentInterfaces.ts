
/**
 * Agent Development Kit (ADK) Interfaces
 * Compatible with Google's Agent ecosystem.
 */

export interface Agent {
    id: string;
    name: string;
    capabilities: Capability[];
    execute(task: Task): Promise<Result>;
}

export interface Capability {
    name: string;
    description: string;
    schema: any;
}

export interface Task {
    id: string;
    goal: string;
    context: Record<string, any>;
}

export interface Result {
    success: boolean;
    output: any;
    artifacts: string[];
}

// Internal Interfaces for Breaking Cycles
export interface IModelSelector {
    selectModel(constraints: any): Promise<any>;
}

export interface IPermissionManager {
    checkPermission(tool: string, args: any): string;
    getAutonomyLevel(): string;
    setAutonomyLevel(level: string): void;
}

export interface IMCPServer {
    modelSelector: IModelSelector;
    permissionManager: IPermissionManager;
    directorConfig?: {
        taskCooldownMs: number;
        heartbeatIntervalMs: number;
        periodicSummaryMs: number;
        pasteToSubmitDelayMs: number;
        acceptDetectionMode: 'state' | 'polling';
        pollingIntervalMs: number;
    };
    autoTestService?: any; // Loose typing to avoid cycle with Core
    llmService?: any; // Added for Council fallback (Phase 32)
    executeTool(name: string, args: any): Promise<any>;
    broadcastRequest?(messageType: string, payload: any): Promise<any>;
    councilService?: ICouncilService;
}

export interface IAgentMemoryService {
    search(query: string, options?: { limit?: number, type?: 'short_term' | 'long_term' }): Promise<Array<{ content: string, score?: number }>>;
    addMemory(content: string, type: 'short_term' | 'long_term'): Promise<void>;
    addLongTerm(content: string, metadata?: any): Promise<void>;
}

export interface CouncilSession {
    id: string;
    topic: string;
    status: 'active' | 'concluded';
    round: number;
    opinions: any[];
    votes: any[];
    createdAt: number;
}

export interface ICouncilService {
    registerAgent(role: string, agent: any): void;
    startSession(topic: string): CouncilSession;
    submitOpinion(sessionId: string, agentId: string, content: string): void;
    castVote(sessionId: string, agentId: string, choice: string, reason: string): void;
    concludeSession(sessionId: string): void;
}

