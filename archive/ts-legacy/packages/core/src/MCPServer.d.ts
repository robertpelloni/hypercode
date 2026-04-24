import './debug_marker.js';
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/MCPServer.d.ts
import { ModelSelector } from "@hypercode/ai";
=======
import { ModelSelector } from "@borg/ai";
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/MCPServer.d.ts
import { PermissionManager } from "./security/PermissionManager.js";
export declare class MCPServer {
    private server;
    private wsServer;
    private router;
    modelSelector: ModelSelector;
    private skillRegistry;
    private director;
    private council;
    permissionManager: PermissionManager;
    private vectorStore;
    private indexer;
    private memoryInitialized;
    private pendingRequests;
    private chainExecutor;
    wssInstance: any;
    private inputTools;
    lastUserActivityTime: number;
    directorConfig: {
        taskCooldownMs: number;
        heartbeatIntervalMs: number;
        periodicSummaryMs: number;
        pasteToSubmitDelayMs: number;
        acceptDetectionMode: "polling";
        pollingIntervalMs: number;
        council: {
            personas: string[];
            contextFiles: string[];
        };
    };
    constructor(options?: {
        skipWebsocket?: boolean;
    });
    /**
     * Lazy initialization of memory system (VectorStore + Indexer)
     * Only loaded when memory tools are first used to speed up startup
     */
    private initializeMemorySystem;
    private createServerInstance;
    private broadcastRequestAndAwait;
    executeTool(name: string, args: any): Promise<any>;
    private setupHandlers;
    start(): Promise<void>;
    private findMonorepoRoot;
}
//# sourceMappingURL=MCPServer.d.ts.map