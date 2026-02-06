
console.log("[MCPServer] Starting imports...");
import './debug_marker.js';

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
console.log("[MCPServer] ✓ @modelcontextprotocol/sdk");

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
console.log("[MCPServer] ✓ path/url/fs");

import { Router } from "./Router.js";
console.log("[MCPServer] ✓ Router");

import { ModelSelector, LLMService } from "@borg/ai";
console.log("[MCPServer] ✓ ModelSelector");

import { WebSocketServer } from 'ws';
import { WebSocketServerTransport } from './transports/WebSocketServerTransport.js';
import http from 'http';
console.log("[MCPServer] ✓ ws/http");

import { McpmInstaller } from "./skills/McpmInstaller.js";
import { Director } from "@borg/agents";
import { Council, CouncilRole } from "@borg/agents";
import { GeminiAgent } from "./agents/GeminiAgent.js";
import { ClaudeAgent } from "./agents/ClaudeAgent.js";
import { MetaArchitectAgent } from "./agents/MetaArchitectAgent.js";
import { ConfigManager } from "./config/ConfigManager.js";
import { AutoTestService } from "./services/AutoTestService.js";
import { ShellService } from "./services/ShellService.js";
import { SandboxService } from "./security/SandboxService.js";
import { SquadService } from "./orchestrator/SquadService.js";
import { GitWorktreeManager } from "./orchestrator/GitWorktreeManager.js";
import { AuditService } from "./security/AuditService.js";
import { GitService } from "./services/GitService.js";
import { SkillRegistry } from "./skills/SkillRegistry.js";
import { SuggestionService } from "./suggestions/SuggestionService.js";
import { ResearchService } from "./services/ResearchService.js";
import { HealerService } from "./services/HealerService.js";
import { MetricsService } from "./services/MetricsService.js";
import { PolicyService } from "./security/PolicyService.js";
import { PromptRegistry } from "./prompts/PromptRegistry.js";
import { WebSearchTool } from "./tools/WebSearchTool.js";
import { DiagnosticTools } from "./tools/DiagnosticTools.js";
import { LSPTools } from "./tools/LSPTools.js";
import { LSPService } from "./services/LSPService.js";
import { PlanService } from "./services/PlanService.js";
import { CodeModeService } from "./services/CodeModeService.js";
import { WorkflowEngine } from "./orchestrator/WorkflowEngine.js";
import { AgentMemoryService } from "./services/AgentMemoryService.js";
console.log("[MCPServer] ✓ Phase 51/53 Infrastructure");
import { SkillAssimilationService } from "./skills/SkillAssimilationService.js";
import { registerSystemWorkflows } from "./orchestrator/SystemWorkflows.js";
import { MCPAggregator } from "./mcp/MCPAggregator.js";
import { SubmoduleManager } from "./mcp/SubmoduleManager.js";
console.log("[MCPServer] ✓ SkillRegistry");

import { SpawnerService } from "./agents/SpawnerService.js";
console.log("[MCPServer] ✓ SpawnerService");

import {
    FileSystemTools,
    TerminalService, /// New class
    ProcessRegistry, /// New class
    MemoryTools,
    TunnelTools,
    ConfigTools,
    LogTools,
    SearchTools,
    ReaderTools,
    InputTools,
    WorktreeTools,
    MetaTools,
    SystemStatusTool,
    ChainExecutor,
    type ChainRequest
} from "@borg/tools";
console.log("[MCPServer] ✓ All Tools & ChainExecutor");

console.log("[MCPServer] ✓ All Tools & ChainExecutor");

// Council and Director already imported above
console.log("[MCPServer] ✓ Council");

import { CommandRegistry } from "./commands/CommandRegistry.js";
import { GitCommand } from "./commands/lib/GitCommands.js";
import { HelpCommand, VersionCommand, DirectorCommand } from "./commands/lib/SystemCommands.js";
import { ContextCommand } from "./commands/lib/ContextCommands.js";
import { UndoCommand, DiffCommand, StashCommand, FixCommand } from "./commands/lib/WorkflowCommands.js";
console.log("[MCPServer] ✓ Commands");

import { ContextManager } from "./context/ContextManager.js";
import { SymbolPinService } from "./services/SymbolPinService.js";
import { AutoDevService } from "./services/AutoDevService.js";
import { MemoryManager } from "./services/MemoryManager.js";
import { KnowledgeService } from './services/KnowledgeService.js';
import { EventBus } from './services/EventBus.js';
import { DeepResearchService } from './services/DeepResearchService.js';


import { PermissionManager, AutonomyLevel } from "./security/PermissionManager.js";
import { BrowserTool } from "@borg/tools";
import { SearchService } from "@borg/search";
console.log("[MCPServer] ✓ PermissionManager");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// LAZY: VectorStore and Indexer are imported dynamically when needed
// import { VectorStore } from './memory/VectorStore.js';
// import { ShellService } from "./services/ShellService.js";
import { AgentAdapter } from "./orchestrator/AgentAdapter.js";
import { ClaudeAdapter } from "./orchestrator/adapters/ClaudeAdapter.js";
import { GeminiAdapter } from "./orchestrator/adapters/GeminiAdapter.js";

interface ToolRequest {
    params: {
        name: string;
        arguments: Record<string, any>;
    };
}

console.log("[MCPServer] All imports complete!");

export class MCPServer {
    private server: Server; // Stdio Server
    private wsServer: Server | null; // WebSocket Server
    private router: Router;
    public modelSelector: ModelSelector;
    public llmService: LLMService;
    private skillRegistry: SkillRegistry;
    private director: Director;
    public permissionManager: PermissionManager;
    public auditService: AuditService;
    public shellService: ShellService;
    public memoryManager: MemoryManager; // Centralized Memory Service
    // public vectorStore: any; // DEPRECATED
    // private indexer: any; // DEPRECATED
    private memoryInitialized: boolean = false;
    private pendingRequests: Map<string, (response: any) => void> = new Map();
    public suggestionService: SuggestionService;
    private chainExecutor: ChainExecutor;
    public wssInstance: any; // WebSocket.Server
    private inputTools: InputTools;
    public lastUserActivityTime: number = Date.now(); // Start with grace period
    private systemStatusTool: SystemStatusTool;
    private terminalService: TerminalService;
    private processRegistry: ProcessRegistry;
    private mcpmInstaller: McpmInstaller;
    private configManager: ConfigManager;
    public autoTestService: AutoTestService;
    public sandboxService: SandboxService;
    public spawnerService: SpawnerService;
    public squadService: SquadService;
    public gitWorktreeManager: GitWorktreeManager;
    public commandRegistry: CommandRegistry;
    public contextManager: ContextManager;
    public symbolPinService: SymbolPinService;
    public autoDevService: AutoDevService;
    public researchService: ResearchService;
    public gitService: GitService; // Phase 30
    public metricsService: MetricsService; // Phase 31
    public policyService: PolicyService; // Phase 32
    private knowledgeService: KnowledgeService; // Knowledge Graph Service
    private healerService: HealerService;
    public promptRegistry: PromptRegistry;
    public skillAssimilationService: SkillAssimilationService;
    private mcpAggregator: MCPAggregator;
    private submoduleManager: SubmoduleManager;
    public eventBus: EventBus;
    public deepResearchService: DeepResearchService;

    // Phase 51: Core Infrastructure
    public lspService: LSPService;
    public planService: PlanService;
    public codeModeService: CodeModeService;
    public workflowEngine: WorkflowEngine;
    public lspTools: LSPTools;
    public agentMemoryService: AgentMemoryService;

    // Core Integrations (Phase 5 & 6)
    public browserTool: BrowserTool;
    public searchService: SearchService;

    // Core Agents
    public geminiAgent: GeminiAgent;
    public claudeAgent: ClaudeAgent;
    public metaArchitectAgent: MetaArchitectAgent;
    public council: Council;

    private activeAgents: Map<string, AgentAdapter> = new Map();
    public directorConfig = {
        taskCooldownMs: 10000,
        heartbeatIntervalMs: 30000,
        periodicSummaryMs: 120000,
        pasteToSubmitDelayMs: 1000,
        acceptDetectionMode: 'polling' as const, // Polling is robust!
        pollingIntervalMs: 30000,
        council: {
            personas: ['Architect', 'Product', 'Critic'],
            contextFiles: ['README.md', 'docs/ROADMAP.md'],
            prompts: {
                Architect: "You are The Architect. Focus on system design, code patterns, and maintainability. Be strict.",
                Product: "You are the Product Manager. Focus on user value, roadmap alignment, and core problem solving.",
                Critic: "You are The Critic. Focus on security, edge cases, bugs, and potential risks. Be pessimistic."
            }
        }
    };

    constructor(options: { skipWebsocket?: boolean, skipAutoDrive?: boolean, inputTools?: InputTools, systemStatusTool?: SystemStatusTool, processRegistry?: ProcessRegistry } = {}) {
        this.router = new Router();
        this.modelSelector = new ModelSelector();
        this.llmService = new LLMService(this.modelSelector);
        this.skillRegistry = new SkillRegistry([
            path.join(process.cwd(), '.borg', 'skills'),
            path.join(process.env.HOME || process.env.USERPROFILE || '', '.borg', 'skills')
        ]);
        this.skillRegistry.setMasterIndexPath(path.join(process.cwd(), 'BORG_MASTER_INDEX.jsonc'));
        this.director = new Director(this);
        this.council = new Council(this.modelSelector);
        this.permissionManager = new PermissionManager('high'); // Default to HIGH AUTONOMY as requested
        this.auditService = new AuditService(process.cwd());
        this.shellService = new ShellService();
        this.gitService = new GitService(process.cwd()); // Phase 30
        this.gitWorktreeManager = new GitWorktreeManager(process.cwd());
        this.metricsService = new MetricsService(); // Phase 31
        this.metricsService.startMonitoring();
        this.policyService = new PolicyService(process.cwd()); // Phase 32
        this.chainExecutor = new ChainExecutor(this);
        this.inputTools = options.inputTools || new InputTools();
        this.systemStatusTool = options.systemStatusTool || new SystemStatusTool();
        this.processRegistry = options.processRegistry || new ProcessRegistry();
        this.terminalService = new TerminalService(this.processRegistry);
        this.mcpmInstaller = new McpmInstaller(path.join(process.cwd(), '.borg', 'skills'));
        this.spawnerService = SpawnerService.getInstance();
        this.spawnerService.setServer(this);
        this.configManager = new ConfigManager();
        this.autoTestService = new AutoTestService(process.cwd());
        this.sandboxService = new SandboxService();
        this.healerService = new HealerService(this.llmService, this);
        this.promptRegistry = new PromptRegistry();
        this.skillAssimilationService = new SkillAssimilationService(
            this.skillRegistry,
            this.llmService,
            path.join(process.cwd(), '.borg', 'skills')
        );

        this.mcpAggregator = new MCPAggregator();
        this.submoduleManager = new SubmoduleManager(process.cwd());
        this.eventBus = new EventBus();

        // Phase 51: Core Infrastructure Services
        this.lspService = new LSPService(process.cwd());
        this.planService = new PlanService({ rootPath: process.cwd() });
        this.codeModeService = new CodeModeService({ timeout: 30000, allowAsync: true });
        this.workflowEngine = new WorkflowEngine({ persistDir: path.join(process.cwd(), '.borg', 'workflows') });
        registerSystemWorkflows(this.workflowEngine, this);
        this.lspTools = new LSPTools(process.cwd());
        this.agentMemoryService = new AgentMemoryService({ persistDir: path.join(process.cwd(), '.borg', 'agent_memory') });

        // Phase 5 & 6 Init
        this.browserTool = new BrowserTool();
        this.searchService = new SearchService();

        // Initialize Core Agents
        this.geminiAgent = new GeminiAgent(this.llmService, this.promptRegistry);
        this.claudeAgent = new ClaudeAgent(this.llmService, this.promptRegistry);
        this.metaArchitectAgent = new MetaArchitectAgent(this.llmService, this.promptRegistry);

        // Initialize Council with Agents
        // @ts-ignore
        this.council = new Council(this.modelSelector);
        this.council.setServer(this);
        this.council.registerAgent(CouncilRole.CRITIC, this.geminiAgent);
        this.council.registerAgent(CouncilRole.ARCHITECT, this.claudeAgent);
        this.council.registerAgent(CouncilRole.META_ARCHITECT, this.metaArchitectAgent);

        // Load persistent config
        const savedConfig = this.configManager.loadConfig();
        if (savedConfig) {
            console.log("[MCPServer] Loaded persistent config.");
            this.directorConfig = { ...this.directorConfig, ...savedConfig };
            // Ensure nested merge for council
            if (savedConfig.council) {
                this.directorConfig.council = { ...this.directorConfig.council, ...savedConfig.council };
            }
        }

        this.suggestionService = new SuggestionService(undefined, this.director);

        // Context Manager
        this.contextManager = new ContextManager();
        this.symbolPinService = new SymbolPinService();
        this.autoDevService = new AutoDevService(process.cwd(), this.director);
        this.shellService = new ShellService(); // Added this line
        this.commandRegistry = new CommandRegistry(); // Corrected typo from instruction
        this.commandRegistry.register(new GitCommand());
        this.commandRegistry.register(new HelpCommand(this.commandRegistry));
        this.commandRegistry.register(new VersionCommand());
        this.commandRegistry.register(new DirectorCommand(() => this.director));
        this.commandRegistry.register(new ContextCommand(this.contextManager));
        this.commandRegistry.register(new UndoCommand());
        this.commandRegistry.register(new DiffCommand());
        this.commandRegistry.register(new StashCommand());
        this.commandRegistry.register(new FixCommand(() => this.autoDevService));

        // Memory System
        this.memoryManager = new MemoryManager(process.cwd());
        this.researchService = new ResearchService(this, this.memoryManager); // Initialized AFTER memoryManager
        this.knowledgeService = new KnowledgeService(this.memoryManager); // Added
        this.deepResearchService = new DeepResearchService(this.llmService, this.searchService, this.memoryManager);

        this.squadService = new SquadService(this);
        this.gitWorktreeManager = new GitWorktreeManager(process.cwd());

        // @ts-ignore
        global.mcpServerInstance = this;

        // Standard Server (Stdio)
        this.server = this.createServerInstance();

        // BOOTSTRAP: Start Auto-Drive immediately for true autonomy
        if (!options.skipAutoDrive) {
            console.error("[MCPServer] 🕒 Scheduling Auto-Drive Start in 5s..."); // DEBUG
            setTimeout(async () => {
                console.error("[MCPServer] 🚀 Bootstrapping Auto-Drive NOW... BEEP!");
                import('fs').then(fs => fs.writeFileSync('.borg_boot_check', 'BOOTED ' + Date.now())).catch(() => { }); // FS Marker
                try {
                    // @ts-ignore
                    const { exec } = await import('child_process');
                    exec('powershell -c [console]::beep(1000, 500)');
                } catch (e) { }
                this.director.startAutoDrive().catch(e => console.error("Auto-Drive Boot Failed:", e));
            }, 5000); // Wait 5s for connections to settle
        }

        // WebSocket Server (Extension Bridge)
        if (!options.skipWebsocket) {
            this.wsServer = this.createServerInstance();

            const PORT = 3001;
            console.log(`[MCPServer] Starting WebSocket Server on port ${PORT}...`);
            this.wssInstance = new WebSocketServer({ port: PORT });

            const transport = new WebSocketServerTransport(this.wssInstance);
            this.wsServer.connect(transport);

            console.log(`[MCPServer] 🔌 WebSocket Bridge active on port ${PORT}`);
        } else {
            // @ts-ignore
            this.wsServer = null;
            this.wssInstance = null;
        }
    }

    /**
     * Lazy initialization of memory system (VectorStore + Indexer)
     * Only loaded when memory tools are first used to speed up startup
     */
    public async initializeMemorySystem() {
        if (this.memoryInitialized) return;

        console.log("[MCPServer] Lazy-loading memory system (MemoryManager)...");
        // this.memoryManager is instantiated in constructor but lazily initialized internally
        // Actually, we should instantiate it here or in constructor?
        // Let's rely on internal lazy loading of MemoryManager, but trigger it here to be safe
        // Or just let tool calls trigger it.
        // For parity with old logic, let's just make sure it's ready.
        // await this.memoryManager.initialize(); // private method, called via public methods

        // Actually, let's just mark initialized true
        this.memoryInitialized = true;
    }

    private createServerInstance(): Server {
        const s = new Server(
            { name: "borg-core", version: "0.1.0" },
            { capabilities: { tools: {} } }
        );
        this.setupHandlers(s);
        return s;
    }

    private broadcastRequestAndAwait(messageType: string, payload: any = {}): Promise<any> {
        if (!this.wssInstance || this.wssInstance.clients.size === 0) {
            return Promise.resolve({ content: [{ type: "text", text: "Error: No Native Extension connected." }] });
        }

        return new Promise((resolve) => {
            const requestId = `req_${Date.now()}_${Math.random()}`;
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                resolve({ content: [{ type: "text", text: "Error: Extension timed out." }] });
            }, 3000);

            this.pendingRequests.set(requestId, (data: any) => {
                clearTimeout(timeout);
                // Handle text vs object response
                const text = typeof data.content === 'string' ? data.content : JSON.stringify(data.content);
                resolve({ content: [{ type: "text", text: text || "No content." }] });
            });

            this.wssInstance.clients.forEach((client: any) => {
                if (client.readyState === 1) {
                    client.send(JSON.stringify({ type: messageType, requestId, ...payload }));
                }
            });
        });
    }

    public updateDirectorConfig(newConfig: any) {
        this.directorConfig = newConfig;
        this.configManager.saveConfig(newConfig);
    }

    public captureScreenshotFromBrowser(): Promise<string> {
        if (!this.wssInstance || this.wssInstance.clients.size === 0) {
            throw new Error("No Browser Extension connected.");
        }

        return new Promise((resolve, reject) => {
            const requestId = `req_${Date.now()}_${Math.random()}`;
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error("Browser screenshot timed out."));
            }, 5000);

            this.pendingRequests.set(requestId, (data: any) => {
                clearTimeout(timeout);
                // data is the screenshot data URL
                resolve(data);
            });

            this.wssInstance.clients.forEach((client: any) => {
                if (client.readyState === 1) {
                    client.send(JSON.stringify({
                        jsonrpc: "2.0",
                        method: 'browser_screenshot',
                        id: requestId
                    }));
                }
            });
        });
    }

    public async executeTool(name: string, args: any): Promise<any> {
        console.log(`[DEBUG] executeTool called with: ${name}`);
        const callId = Math.random().toString(36).substring(7);
        const startTime = Date.now();

        // Broadcast Start
        if (this.wssInstance) {
            this.wssInstance.clients.forEach((c: any) => {
                if (c.readyState === 1) c.send(JSON.stringify({
                    type: 'TOOL_CALL_START',
                    id: callId,
                    tool: name,
                    args: args
                }));
            });
        }

        // Emit Pulse Event
        this.eventBus.emitEvent('tool:call', 'MCPServer', { tool: name, args, callId });

        // Audit Start
        try {
            this.auditService.log('TOOL_START', { tool: name, args }, 'INFO');
        } catch (e) { console.error("Audit Fail", e); }

        try {
            // 0. Permission Check
            // A. Policy Service (Fine-grained)
            // A. Policy Service (Fine-grained)
            const policyDecision = this.policyService.check(name, args);
            if (!policyDecision.allowed) {
                this.auditService.log('TOOL_DENIED', { tool: name, args, reason: policyDecision.reason || 'Policy Deny' }, 'WARN');
                throw new Error(`Policy VIOLATION: Execution of tool '${name}' is DENIED by active policy. Reason: ${policyDecision.reason}`);
            }

            // B. Permission Manager (High-level Autonomy)
            const permission = this.permissionManager.checkPermission(name, args);

            if (permission === 'DENIED') {
                this.auditService.log('TOOL_DENIED', { tool: name, args, reason: 'Policy/Permission' }, 'WARN');
                throw new Error(`Permission Denied for tool '${name}' (Risk Level High). Autonomy Level is '${this.permissionManager.autonomyLevel}'.`);
            }

            if (permission === 'NEEDS_CONSULTATION') {
                console.log(`[Borg Core] Consulting Council for: ${name}`);
                this.auditService.log('TOOL_CONSULTATION', { tool: name, args }, 'WARN');
                const debate = await this.council.runConsensusSession(`Execute tool '${name}' with args: ${JSON.stringify(args)}`);

                if (!debate.approved) {
                    throw new Error(`Council Denied Execution: ${debate.summary}`);
                }
                console.log(`[Borg Core] Council Approved: ${debate.summary}`);
            }

            // 1. Internal Status / Config Tools
            let result;
            if (name === "router_status") {
                result = {
                    content: [{ type: "text", text: "Borg Router is active." }],
                };
            }
            else if (name === "set_autonomy") {
                const level = args?.level as AutonomyLevel;
                this.permissionManager.setAutonomyLevel(level);
                result = {
                    content: [{ type: "text", text: `Autonomy Level set to: ${level}` }]
                };
            }
            else if (name === "chat_reply") {
                const text = args?.text as string;
                // SAFETY: Default to false to prevent feedback loops. Explicitly set true if needed.
                const submit = args?.submit as boolean ?? false;
                console.log(`[Borg Core] Chat Reply Requested: ${text} (submit: ${submit})`);

                if (this.wssInstance) {
                    this.wssInstance.clients.forEach((client: any) => {
                        if (client.readyState === 1) { // OPEN
                            client.send(JSON.stringify({
                                type: 'PASTE_INTO_CHAT',
                                text: text,
                                submit: submit // Include submit flag for atomic paste+submit
                            }));
                        }
                    });
                    result = {
                        content: [{ type: "text", text: `Sent to browser/IDE: "${text}" (submit: ${submit})` }]
                    };
                } else {
                    result = {
                        content: [{ type: "text", text: "Error: No WebSocket server active to forward reply." }]
                    };
                }
            }
            else if (name === "chat_submit") {
                if (this.wssInstance && this.wssInstance.clients.size > 0) {
                    this.wssInstance.clients.forEach((client: any) => {
                        if (client.readyState === 1) client.send(JSON.stringify({ type: 'SUBMIT_CHAT' }));
                    });
                    result = { content: [{ type: "text", text: "Sent SUBMIT_CHAT signal." }] };
                } else {
                    // FALLBACK: Use Native Input for Alt-Enter
                    console.error("[MCPServer] No Extension bridge. Falling back to Native Input for Alt-Enter.");
                    try {
                        const status = await this.inputTools.sendKeys('alt+enter');
                        result = { content: [{ type: "text", text: `Fallback: ${status}` }] };
                    } catch (e: any) {
                        result = { content: [{ type: "text", text: `Error: No extension AND native input failed: ${e.message}` }] };
                    }
                }
            }
            else if (name === "click_element") {
                const target = args?.target as string;
                if (this.wssInstance) {
                    this.wssInstance.clients.forEach((client: any) => {
                        if (client.readyState === 1) client.send(JSON.stringify({
                            method: 'click_element',
                            params: { target }
                        }));
                    });
                    result = { content: [{ type: "text", text: `Sent CLICK_ELEMENT signal for "${target}".` }] };
                } else {
                    result = { content: [{ type: "text", text: "Error: No WebSocket server." }] };
                }
            }
            else if (name === "click_at") {
                const x = args?.x as number;
                const y = args?.y as number;
                if (this.wssInstance) {
                    this.wssInstance.clients.forEach((client: any) => {
                        if (client.readyState === 1) client.send(JSON.stringify({
                            method: 'click_at',
                            params: { x, y }
                        }));
                    });
                    result = { content: [{ type: "text", text: `Sent CLICK_AT signal for (${x},${y}).` }] };
                } else {
                    result = { content: [{ type: "text", text: "Error: No WebSocket server." }] };
                }
            }
            else if (name === "navigate") {
                const url = args?.url as string;
                if (this.wssInstance) {
                    this.wssInstance.clients.forEach((client: any) => {
                        if (client.readyState === 1) client.send(JSON.stringify({
                            method: 'browser_navigate',
                            params: { url }
                        }));
                    });
                    // Wait for navigation
                    await new Promise(r => setTimeout(r, 2000));
                    result = { content: [{ type: "text", text: `Navigated to ${url}` }] };
                } else {
                    result = { content: [{ type: "text", text: "Error: No WebSocket server." }] };
                }
            }
            else if (name === "browser_screenshot") {
                const dataUrl = await this.captureScreenshotFromBrowser();
                // Return generic 'image' content type if MCP supports it, or text with data URL
                result = {
                    content: [
                        { type: "text", text: "Screenshot captured." },
                        { type: "image", data: dataUrl.split(',')[1], mimeType: "image/png" }
                    ]
                };
            }
            else if (name === "get_knowledge_graph") {
                result = await this.knowledgeService.getGraph(args?.query, args?.depth);
            }
            else if (name === "system_diagnostics") {
                const status = await DiagnosticTools.checkHealth();
                result = { content: [{ type: "text", text: DiagnosticTools.getDiagnosticsMarkup(status) }] };
            }
            else if (name === "native_input") {
                const keys = args?.keys as string;
                const targetWindow = args?.targetWindow as string | undefined;
                const forceFocus = args?.forceFocus as boolean ?? false;
                // Use Direct InputTools with optional window targeting
                try {
                    const toolStartTime = Date.now();
                    const status = await this.inputTools.sendKeys(keys, forceFocus, targetWindow);
                    const toolDuration = Date.now() - toolStartTime;

                    this.metricsService.track('tool_call', 1, { tool: name, success: 'true' });
                    this.metricsService.trackDuration('tool_execution', toolDuration, { tool: name });

                    result = { content: [{ type: "text", text: status }] };
                } catch (e: any) {
                    this.metricsService.track('tool_call', 1, { tool: name, success: 'false' });
                    this.metricsService.track('tool_error', 1, { tool: name });
                    result = { content: [{ type: "text", text: `Error executing native_input: ${e.message}` }] };
                }
            }
            else if (name === "vscode_execute_command") {
                const command = args?.command as string;
                const cmdArgs = args?.args as any[] || [];

                if (this.wssInstance) {
                    this.wssInstance.clients.forEach((client: any) => {
                        if (client.readyState === 1) {
                            // VSCode might expect different format, but assuming legacy type is ok for VSCode extension
                            // Wait, if this shares the same websocket, it needs to match protocols.
                            // But VSCode extension might be different than Browser Extension.
                            // Assuming VSCode extension handles 'type'.
                            client.send(JSON.stringify({
                                type: 'VSCODE_COMMAND',
                                command,
                                args: cmdArgs
                            }));
                        }
                    });
                    result = { content: [{ type: "text", text: `Sent VSCODE_COMMAND: ${command}` }] };
                } else {
                    result = { content: [{ type: "text", text: "Error: No WebSocket server (Extension bridge) active." }] };
                }
            }
            else if (name === "vscode_get_status") {
                if (!this.wssInstance || this.wssInstance.clients.size === 0) {
                    result = { content: [{ type: "text", text: "Error: No Native Extension connected." }] };
                } else {
                    result = await new Promise((resolve) => {
                        const requestId = `req_${Date.now()}_${Math.random()}`;
                        const timeout = setTimeout(() => {
                            this.pendingRequests.delete(requestId);
                            resolve({ content: [{ type: "text", text: "Error: Extension timed out." }] });
                        }, 3000);

                        this.pendingRequests.set(requestId, (status: any) => {
                            clearTimeout(timeout);
                            resolve({ content: [{ type: "text", text: JSON.stringify(status, null, 2) }] });
                        });

                        this.wssInstance.clients.forEach((client: any) => {
                            if (client.readyState === 1) {
                                client.send(JSON.stringify({ type: 'GET_STATUS', requestId }));
                            }
                        });
                    });
                }
            }
            // --- CORE INFRASTRUCTURE TOOLS (Phase 20) ---
            else if (name === "lsp_symbol_search") {
                const query = args?.query as string;
                if (!query) throw new Error("Missing 'query' parameter");
                const symbols = this.lspService.searchSymbols(query);
                result = { content: [{ type: "text", text: JSON.stringify(symbols.slice(0, 50), null, 2) }] };
            }
            else if (name === "lsp_definition") {
                const file = args?.file as string;
                const line = args?.line as number;
                const char = args?.char as number;
                if (!file || line === undefined || char === undefined) throw new Error("Missing params: file, line, char");
                const def = await this.lspService.goToDefinition(file, line, char);
                result = { content: [{ type: "text", text: JSON.stringify(def, null, 2) }] };
            }
            else if (name === "lsp_references") {
                const file = args?.file as string;
                const line = args?.line as number;
                const char = args?.char as number;
                if (!file || line === undefined || char === undefined) throw new Error("Missing params: file, line, char");
                const refs = await this.lspService.findReferences(file, line, char);
                result = { content: [{ type: "text", text: JSON.stringify(refs, null, 2) }] };
            }
            else if (name === "code_mode_execute") {
                const code = args?.code as string;
                if (!code) throw new Error("Missing 'code' parameter");
                const res = await this.codeModeService.executeCode(code);
                result = { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
            }
            else if (name === "plan_mode_switch") {
                const mode = args?.mode as string;
                if (mode === 'PLAN') this.planService.enterPlanMode();
                else if (mode === 'BUILD') this.planService.enterBuildMode();
                else throw new Error("Invalid mode. Use 'PLAN' or 'BUILD'");
                result = { content: [{ type: "text", text: `Switched to ${mode} mode.` }] };
            }
            else if (name === "plan_mode_stage") {
                const file = args?.file as string;
                const content = args?.content as string;
                if (!file || !content) throw new Error("Missing params: file, content");
                const diff = this.planService.proposeChange(file, content, "Staged via tool");
                result = { content: [{ type: "text", text: `Staged changes for ${file} (ID: ${diff.id})` }] };
            }
            else if (name === "plan_mode_status") {
                result = { content: [{ type: "text", text: this.planService.getStatus() }] };
            }
            // --- MEMORY / SEARCH TOOLS (Phase 23) ---
            else if (name === "memory_index_codebase") {
                const indexRoot = (args?.path as string) || process.cwd();
                await this.initializeMemorySystem();
                const count = await this.memoryManager.indexCodebase(indexRoot);
                result = { content: [{ type: "text", text: `Indexed ${count} chunks in ${indexRoot}` }] };
            }
            else if (name === "memory_search") {
                const query = args?.query as string;
                const limit = args?.limit as number || 5;
                if (!query) throw new Error("Missing 'query'");
                await this.initializeMemorySystem();
                const res = await this.memoryManager.search(query, limit);
                result = { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
            }
            // --- DEEP RESEARCH (Phase 31) ---
            else if (name === "research_topic") {
                const topic = args?.topic as string;
                const depth = args?.depth as number || 2;
                if (!topic) throw new Error("Missing 'topic'");
                const res = await this.deepResearchService.researchTopic(topic, depth);
                result = { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
            }
            else if (name === "vscode_read_selection") {
                if (!this.wssInstance || this.wssInstance.clients.size === 0) {
                    result = { content: [{ type: "text", text: "Error: No Native Extension connected." }] };
                } else {
                    result = await new Promise((resolve) => {
                        const requestId = `req_${Date.now()}_${Math.random()}`;
                        const timeout = setTimeout(() => {
                            this.pendingRequests.delete(requestId);
                            resolve({ content: [{ type: "text", text: "Error: Extension timed out." }] });
                        }, 3000);

                        this.pendingRequests.set(requestId, (data: any) => {
                            clearTimeout(timeout);
                            resolve({ content: [{ type: "text", text: data.content || "No content." }] });
                        });

                        this.wssInstance.clients.forEach((client: any) => {
                            if (client.readyState === 1) {
                                client.send(JSON.stringify({ type: 'GET_SELECTION', requestId }));
                            }
                        });
                    });
                }
            }
            else if (name === "vscode_read_terminal") {
                if (!this.wssInstance || this.wssInstance.clients.size === 0) {
                    result = { content: [{ type: "text", text: "Error: No Native Extension connected." }] };
                } else {
                    result = await new Promise((resolve) => {
                        const requestId = `req_${Date.now()}_${Math.random()}`;
                        const timeout = setTimeout(() => {
                            this.pendingRequests.delete(requestId);
                            resolve({ content: [{ type: "text", text: "Error: Extension timed out." }] });
                        }, 5000); // Higher timeout for UI interactions

                        this.pendingRequests.set(requestId, (data: any) => {
                            clearTimeout(timeout);
                            resolve({ content: [{ type: "text", text: data.content || "No content." }] });
                        });

                        this.wssInstance.clients.forEach((client: any) => {
                            if (client.readyState === 1) {
                                client.send(JSON.stringify({ type: 'GET_TERMINAL', requestId }));
                            }
                        });
                    });
                }
            }
            else if (name === "get_chat_history") {
                if (!this.wssInstance || this.wssInstance.clients.size === 0) {
                    result = { content: [{ type: "text", text: "Error: No Extension connected." }] };
                } else {
                    result = await new Promise((resolve) => {
                        const requestId = `req_chat_${Date.now()}`;
                        const timeout = setTimeout(() => {
                            this.pendingRequests.delete(requestId);
                            resolve({ content: [{ type: "text", text: "Error: Chat scrape timed out." }] });
                        }, 5000);

                        this.pendingRequests.set(requestId, (data: any) => {
                            clearTimeout(timeout);
                            const history = data.history || [];
                            resolve({ content: [{ type: "text", text: history.join('\n') }] });
                        });

                        this.wssInstance.clients.forEach((client: any) => {
                            if (client.readyState === 1) {
                                client.send(JSON.stringify({ type: 'GET_CHAT_HISTORY', requestId }));
                            }
                        });
                    });
                }
            }
            else if (name === "vscode_get_notifications") {
                result = await this.broadcastRequestAndAwait('GET_NOTIFICATIONS');
            }
            else if (name === "vscode_submit_chat") {
                if (this.wssInstance) {
                    this.wssInstance.clients.forEach((client: any) => {
                        if (client.readyState === 1) client.send(JSON.stringify({ type: 'SUBMIT_CHAT_HOOK' }));
                    });
                    result = { content: [{ type: "text", text: "Sent SUBMIT_CHAT_HOOK." }] };
                } else {
                    result = { content: [{ type: "text", text: "Error: No WebSocket server." }] };
                }
            }
            else if (name === "start_task") {
                const goal = args?.goal as string;
                const maxSteps = args?.maxSteps as number || 10;
                const resultStr = await this.director.executeTask(goal, maxSteps);
                result = {
                    content: [{ type: "text", text: resultStr }]
                };
            }
            else if (name === "browser_get_history") {
                if (!this.wssInstance || this.wssInstance.clients.size === 0) {
                    result = { content: [{ type: "text", text: "Error: No Browser Extension connected." }] };
                } else {
                    result = await new Promise((resolve) => {
                        const requestId = `req_${Date.now()}_${Math.random()}`;
                        const timeout = setTimeout(() => {
                            this.pendingRequests.delete(requestId);
                            resolve({ content: [{ type: "text", text: "Error: Browser timed out." }] });
                        }, 5000);

                        this.pendingRequests.set(requestId, (data: any) => {
                            clearTimeout(timeout);
                            if (Array.isArray(data)) {
                                const historyText = data.map((item: any) => `- [${item.title || 'Untitled'}](${item.url}) (Visits: ${item.visitCount})`).join('\n');
                                resolve({ content: [{ type: "text", text: historyText || "No history found for this query." }] });
                            } else {
                                resolve({ content: [{ type: "text", text: "Error: Unexpected data format from browser." }] });
                            }
                        });

                        this.wssInstance.clients.forEach((client: any) => {
                            if (client.readyState === 1) {
                                client.send(JSON.stringify({
                                    jsonrpc: "2.0",
                                    method: 'browser_get_history',
                                    params: { query: args.query, maxResults: args.maxResults },
                                    id: requestId
                                }));
                            }
                        });
                    });
                }
            }
            else if (name === "browser_debug") {
                if (!this.wssInstance || this.wssInstance.clients.size === 0) {
                    result = { content: [{ type: "text", text: "Error: No Browser Extension connected." }] };
                } else {
                    result = await new Promise((resolve) => {
                        const requestId = `req_${Date.now()}_${Math.random()}`;
                        const timeout = setTimeout(() => {
                            this.pendingRequests.delete(requestId);
                            resolve({ content: [{ type: "text", text: "Error: Browser timed out." }] });
                        }, 10000);

                        this.pendingRequests.set(requestId, (data: any) => {
                            clearTimeout(timeout);
                            resolve({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
                        });

                        this.wssInstance.clients.forEach((client: any) => {
                            if (client.readyState === 1) {
                                client.send(JSON.stringify({
                                    jsonrpc: "2.0",
                                    method: 'browser_debug',
                                    params: args,
                                    id: requestId
                                }));
                            }
                        });
                    });
                }
            }
            else if (name === "browser_proxy_fetch") {
                if (!this.wssInstance || this.wssInstance.clients.size === 0) {
                    result = { content: [{ type: "text", text: "Error: No Browser Extension connected." }] };
                } else {
                    result = await new Promise((resolve) => {
                        const requestId = `req_${Date.now()}_${Math.random()}`;
                        const timeout = setTimeout(() => {
                            this.pendingRequests.delete(requestId);
                            resolve({ content: [{ type: "text", text: "Error: Browser timed out." }] });
                        }, 15000);

                        this.pendingRequests.set(requestId, (data: any) => {
                            clearTimeout(timeout);
                            resolve({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
                        });

                        this.wssInstance.clients.forEach((client: any) => {
                            if (client.readyState === 1) {
                                client.send(JSON.stringify({
                                    jsonrpc: "2.0",
                                    method: 'browser_proxy_fetch',
                                    params: args,
                                    id: requestId
                                }));
                            }
                        });
                    });
                }
            }
            // Phase 5: Browser Tool Direct
            else if (name === "agent_browse") {
                const task = args?.task as string;
                if (!task) throw new Error("Missing 'task' argument for agent_browse");
                result = await this.browserTool.executeTask(task, true);
            }
            // Phase 6: Semantic Search Direct
            else if (name === "agent_search") {
                const query = args?.query as string;
                const root = args?.path || process.cwd();
                if (!query) throw new Error("Missing 'query' argument for agent_search");

                // Lazy load index if needed
                try { await this.searchService.loadIndex(); } catch (e) { }

                result = await this.searchService.search(query, root);
            }

            // Swarm Tools
            else if (name === "spawn_agent") {
                const id = this.spawnerService.spawn(args.type, args.task);
                result = { content: [{ type: "text", text: `Agent spawned successfully. ID: ${id}` }] };
            }
            else if (name === "list_agents") {
                const agents = this.spawnerService.listAgents();
                result = { content: [{ type: "text", text: JSON.stringify(agents, null, 2) }] };
            }
            else if (name === "kill_agent") {
                const success = this.spawnerService.killAgent(args.agentId);
                result = { content: [{ type: "text", text: success ? "Agent terminated." : "Failed to terminate agent (might not be running)." }] };
            }
            else if (name === "get_agent_result") {
                const agent = this.spawnerService.getAgent(args.agentId);
                if (!agent) {
                    result = { content: [{ type: "text", text: "Error: Agent not found." }] };
                } else {
                    result = { content: [{ type: "text", text: JSON.stringify(agent.result || { status: agent.status }, null, 2) }] };
                }
            }
            else if (name === "read_page") {
                if (!this.wssInstance || this.wssInstance.clients.size === 0) {
                    // FALLBACK: Use Native Reader (ReaderTools)
                    console.log("[MCPServer] No Browser Extension. Falling back to Native Reader...");
                    const nativeReader = ReaderTools.find(t => t.name === "read_page");
                    if (nativeReader) {
                        // @ts-ignore
                        result = await nativeReader.handler(args);
                    } else {
                        result = { content: [{ type: "text", text: "Error: No Native Reader available." }] };
                    }
                } else {
                    result = await new Promise((resolve) => {
                        const requestId = `req_${Date.now()}_${Math.random()}`;
                        const timeout = setTimeout(() => {
                            this.pendingRequests.delete(requestId);
                            // TIMEOUT FALLBACK to Native Reader
                            console.log("[MCPServer] Browser Timed Out. Falling back to Native Reader...");
                            const nativeReader = ReaderTools.find(t => t.name === "read_page");
                            if (nativeReader) {
                                // @ts-ignore
                                nativeReader.handler(args).then(resolve).catch((e: any) => resolve({ content: [{ type: "text", text: `Error: ${e.message}` }] }));
                            } else {
                                resolve({ content: [{ type: "text", text: "Error: Browser timed out and no native reader." }] });
                            }
                        }, 5000);

                        this.pendingRequests.set(requestId, (data: any) => {
                            clearTimeout(timeout);
                            // Expect data to have { url, title, content }
                            const text = `URL: ${data.url}\nTitle: ${data.title}\n\n${data.content.substring(0, 5000)}...`;
                            resolve({ content: [{ type: "text", text: text }] });
                        });

                        this.wssInstance.clients.forEach((client: any) => {
                            if (client.readyState === 1) {
                                // Send JSON-RPC 2.0 request
                                client.send(JSON.stringify({
                                    jsonrpc: "2.0",
                                    method: 'browser_scrape',
                                    id: requestId
                                }));
                            }
                        });
                    });
                }
            }
            else if (name === "memorize_page") {
                if (!this.wssInstance || this.wssInstance.clients.size === 0) {
                    result = { content: [{ type: "text", text: "Error: No Browser Extension connected." }] };
                } else {
                    result = await new Promise((resolve) => {
                        const requestId = `req_${Date.now()}_${Math.random()}`;
                        const timeout = setTimeout(() => {
                            this.pendingRequests.delete(requestId);
                            resolve({ content: [{ type: "text", text: "Error: Browser timed out." }] });
                        }, 8000); // 8s timeout for memorization

                        this.pendingRequests.set(requestId, async (data: any) => {
                            clearTimeout(timeout);
                            // Data: { url, title, content }
                            if (!data.content) {
                                resolve({ content: [{ type: "text", text: "Error: No content received from browser." }] });
                                return;
                            }

                            try {
                                const ctxId = await this.memoryManager.saveContext(
                                    `URL: ${data.url}\n\n${data.content}`, // Content
                                    { // Metadata
                                        title: data.title || "Web Page",
                                        source: data.url || "browser"
                                    }
                                );
                                resolve({ content: [{ type: "text", text: `✅ Memorized page: "${data.title}" (ID: ${ctxId})` }] });
                            } catch (e: any) {
                                resolve({ content: [{ type: "text", text: `Error saving context: ${e.message}` }] });
                            }
                        });

                        this.wssInstance.clients.forEach((client: any) => {
                            if (client.readyState === 1) {
                                // Reuse 'browser_scrape' method
                                client.send(JSON.stringify({
                                    jsonrpc: "2.0",
                                    method: 'browser_scrape',
                                    id: requestId
                                }));
                            }
                        });
                    });
                }
            }
            else if (name === "use_agent") {
                const agentName = args.name as string;
                const prompt = args.prompt as string;
                let agent = this.activeAgents.get(agentName);

                if (!agent) {
                    if (agentName === 'claude') agent = new ClaudeAdapter();
                    else if (agentName === 'gemini') agent = new GeminiAdapter();
                    else return { content: [{ type: "text", text: `Unknown agent: ${agentName}` }] };

                    await agent.start();
                    this.activeAgents.set(agentName, agent);
                }

                if (!agent.isActive()) {
                    await agent.start();
                }

                // Send prompt and wait for response (simple timeout-based aggregation)
                const responsePromise = new Promise<string>((resolve) => {
                    let buffer = '';
                    let timer: any;

                    const onData = (data: string) => {
                        buffer += data;
                        clearTimeout(timer);
                        // Debounce: Wait 2s for more data, else assume done
                        timer = setTimeout(() => {
                            cleanup();
                            resolve(buffer);
                        }, 2000);
                    };

                    const cleanup = () => {
                        agent!.removeListener('output', onData);
                    };

                    agent!.on('output', onData);
                    agent!.send(prompt).catch((err: any) => {
                        cleanup();
                        resolve(`Error sending to agent: ${err.message}`);
                    });
                });

                const output = await responsePromise;
                result = { content: [{ type: "text", text: output }] };
            }
            else if (name === "take_screenshot") {
                try {
                    const data = await this.captureScreenshotFromBrowser();
                    result = {
                        content: [
                            { type: "text", text: "Screenshot captured." },
                            { type: "image", data: data.split(',')[1], mimeType: "image/jpeg" }
                        ]
                    };
                } catch (e: any) {
                    result = { content: [{ type: "text", text: `Error: ${e.message}` }] };
                }
            }
            else if (name === "analyze_screenshot") {
                const prompt = args.prompt as string;
                try {
                    console.log(`[Borg Core] 👁️ Analyzing screenshot with prompt: "${prompt}"...`);
                    const data = await this.captureScreenshotFromBrowser();
                    const base64 = data.split(',')[1];
                    const mimeType = "image/jpeg";

                    const response = await this.llmService.generateText(
                        'google',
                        'gemini-1.5-pro',
                        "You are a web automation assistant. Analyze the screenshot.",
                        prompt,
                        {
                            images: [{ base64, mimeType }],
                            taskComplexity: 'high'
                        }
                    );

                    result = {
                        content: [
                            { type: "text", text: response.content }
                        ]
                    };
                } catch (e: any) {
                    result = { content: [{ type: "text", text: `Error analyzing screenshot: ${e.message}` }] };
                }
            }
            // Removed obsolete start_watchdog and start_chat_daemon handlers
            else if (name === "start_auto_drive") {
                this.director.startAutoDrive();
                result = {
                    content: [{ type: "text", text: "Auto-Drive started. The Director will now proactively drive the development loop." }]
                };
            }
            else if (name === "stop_auto_drive") {
                this.director.stopAutoDrive();
                result = {
                    content: [{ type: "text", text: "Auto-Drive Stopped." }]
                };
            }
            else if (name === "list_skills") {
                result = this.skillRegistry.listSkills();
            }
            else if (name === "read_skill") {
                result = this.skillRegistry.readSkill(args?.skillName as string);
            }
            else if (name === "mcpm_search") {
                result = {
                    content: [{ type: "text", text: JSON.stringify(await this.mcpmInstaller.search(args?.query as string), null, 2) }]
                };
            }
            else if (name === "mcpm_install") {
                const msg = await this.mcpmInstaller.install(args?.name as string);
                result = {
                    content: [{ type: "text", text: msg }]
                };
            }
            else if (name === "mcp_add_server") {
                const srvName = args.name as string;
                const repoUrl = args.repoUrl as string;

                // 1. Clone Repo
                const cloneMsg = await this.submoduleManager.addSubmodule(srvName, repoUrl);

                // 2. Add to Aggregator Config
                await this.mcpAggregator.addServerConfig(srvName, {
                    command: args.command,
                    args: args.args,
                    enabled: true,
                    env: args.env
                });

                result = {
                    content: [{ type: "text", text: `${cloneMsg}\nAdded server '${srvName}' to configuration and connected.` }]
                };
            }
            else if (name === "start_autotest") {
                this.autoTestService.start();
                result = { content: [{ type: "text", text: "Auto-Test Watcher Started." }] };
            }
            else if (name === "stop_autotest") {
                this.autoTestService.stop();
                result = { content: [{ type: "text", text: "Auto-Test Watcher Stopped." }] };
            }
            else if (name === "start_squad") {
                const branch = args?.branch as string;
                const goal = args?.goal as string;
                const msg = await this.squadService.spawnMember(branch, goal);
                result = { content: [{ type: "text", text: msg }] };
            }
            else if (name === "list_squads") {
                const squads = this.squadService.listMembers();
                result = { content: [{ type: "text", text: JSON.stringify(squads, null, 2) }] };
            }
            else if (name === "kill_squad") {
                const branch = args?.branch as string;
                const msg = await this.squadService.killMember(branch);
                result = { content: [{ type: "text", text: msg }] };
            }
            else if (name === "merge_squad") {
                const { MergeService } = await import('./orchestrator/MergeService.js');
                const merger = new MergeService(process.cwd());
                const branch = args?.branch as string;
                const res = await merger.mergeBranch(branch);
                result = { content: [{ type: "text", text: JSON.stringify(res) }] };
            }
            else if (name === "git_worktree_list") {
                result = {
                    content: [{ type: "text", text: JSON.stringify(await this.gitWorktreeManager.listWorktrees(), null, 2) }]
                };
            }
            else if (name === "git_worktree_add") {
                const branch = args?.branch as string;
                const path = args?.path as string; // Relative or absolute
                // Manager handles it
                const finalPath = await this.gitWorktreeManager.addWorktree(branch, path);
                result = { content: [{ type: "text", text: `Worktree added at: ${finalPath}` }] };
            }
            else if (name === "git_worktree_remove") {
                const pathOrBranch = args?.path || args?.branch as string;
                const force = args?.force as boolean;
                await this.gitWorktreeManager.removeWorktree(pathOrBranch, force);
                result = { content: [{ type: "text", text: `Worktree removed: ${pathOrBranch}` }] };
            }
            // 2. Intercept File Reading for Suggestions (Engagement Module)
            if (name === "read_file" || name === "view_file") {
                const filePath = args.path || args.AbsolutePath;
                if (!filePath) {
                    // Fallthrough to standard handler which will likely error
                } else {
                    // Fire and forget suggestion analysis
                    // We don't read content here to avoid double-read cost; 
                    // ideally we'd tap into the result, but that requires waiting for the real tool.
                    // For now, let's just log intent or trigger analysis if we can get content cheaply later.
                    // Actually, let's tap the result AFTER execution.
                }
            }

            if (name === "execute_sandbox") {
                const lang = args?.language as 'python' | 'node';
                const code = args?.code as string;
                result = {
                    content: [{ type: "text", text: JSON.stringify(await this.sandboxService.execute(lang, code), null, 2) }]
                };
            }
            else if (name === "index_codebase") {
                const dir = args?.path || process.cwd();
                console.log(`[Borg Core] Indexing codebase at ${dir}...`);
                const count = await this.memoryManager.indexCodebase(dir);
                result = {
                    content: [{ type: "text", text: `Indexed ${count} documents/chunks from ${dir}.` }]
                };
            }
            else if (name === "search_codebase") {
                const query = args?.query as string;
                console.log(`[Borg Core] Semantic Searching for: ${query}`);
                const matches = await this.memoryManager.search(query);

                let text = `Searching for: "${query}"\n\n`;
                matches.forEach((m: any, i: number) => {
                    const filePath = m.metadata?.file_path || m.id;
                    text += `${i + 1}. [${filePath}]\n${m.content.substring(0, 200)}...\n\n`;
                });

                result = {
                    content: [{ type: "text", text: text }]
                };
            }
            else if (name === "system_diagnostics") {
                const status = await DiagnosticTools.checkHealth();
                result = {
                    content: [{ type: "text", text: JSON.stringify(status, null, 2) }]
                };
            }
            else if (name === "assimilate_skill") {
                const response = await this.skillAssimilationService.assimilate(args as any);
                result = {
                    content: [{ type: "text", text: response }]
                };
            }
            else if (name === "get_status") {
                result = {
                    content: [{ type: "text", text: JSON.stringify(await this.chainExecutor.executeChain(args as unknown as ChainRequest), null, 2) }]
                };
            }
            else if (name === "research") {
                const topic = args?.topic as string;
                const depth = args?.depth as number || 3;
                const report = await this.researchService.research(topic, depth);
                result = {
                    content: [{ type: "text", text: report }]
                };
            }
            // Phase 51: LSP Tools
            else if (name === "find_symbol") {
                const output = await this.lspTools.findSymbol(args);
                result = { content: [{ type: "text", text: output }] };
            }
            else if (name === "find_references") {
                const output = await this.lspTools.findReferences(args);
                result = { content: [{ type: "text", text: output }] };
            }
            else if (name === "go_to_definition") {
                const output = await this.lspTools.goToDefinition(args);
                result = { content: [{ type: "text", text: output }] };
            }
            else if (name === "get_symbols") {
                const output = await this.lspTools.getSymbols(args);
                result = { content: [{ type: "text", text: output }] };
            }
            else if (name === "rename_symbol") {
                const output = await this.lspTools.renameSymbol(args);
                result = { content: [{ type: "text", text: output }] };
            }
            else if (name === "search_symbols") {
                const output = await this.lspTools.searchSymbols(args);
                result = { content: [{ type: "text", text: output }] };
            }
            // Phase 51: Plan/Build Mode Tools
            else if (name === "plan_mode") {
                this.planService.enterPlanMode();
                result = { content: [{ type: "text", text: `Switched to PLAN mode. Changes will be staged but not applied.` }] };
            }
            else if (name === "build_mode") {
                this.planService.enterBuildMode();
                result = { content: [{ type: "text", text: `Switched to BUILD mode. Approved changes can now be applied.` }] };
            }
            else if (name === "propose_change") {
                const diff = this.planService.proposeChange(args.file_path, args.content, args.description);
                result = { content: [{ type: "text", text: `Proposed change for ${args.file_path} (diff ID: ${diff.id})` }] };
            }
            else if (name === "review_changes") {
                const pending = this.planService.getPendingChanges();
                const summary = pending.map(d => `[${d.id}] ${d.filePath} - ${d.status}`).join('\n');
                result = { content: [{ type: "text", text: pending.length === 0 ? 'No pending changes.' : `Pending changes:\n${summary}` }] };
            }
            else if (name === "approve_change") {
                const success = this.planService.approveDiff(args.diff_id);
                result = { content: [{ type: "text", text: success ? `Approved diff ${args.diff_id}` : `Failed to approve diff ${args.diff_id}` }] };
            }
            else if (name === "apply_changes") {
                const applied = this.planService.applyApprovedChanges();
                if (!applied) {
                    result = { content: [{ type: "text", text: `Cannot apply changes. Switch to BUILD mode first.` }] };
                } else {
                    result = { content: [{ type: "text", text: `Applied ${applied.applied.length} changes. Failed: ${applied.failed.length}` }] };
                }
            }
            else if (name === "plan_status") {
                const status = this.planService.getStatus();
                result = { content: [{ type: "text", text: status }] };
            }
            else if (name === "create_checkpoint") {
                const checkpoint = this.planService.createCheckpoint(args.name, args.description);
                result = { content: [{ type: "text", text: `Created checkpoint: ${checkpoint.name} (${checkpoint.id})` }] };
            }
            else if (name === "rollback") {
                const success = this.planService.rollback(args.checkpoint_id);
                result = { content: [{ type: "text", text: success ? `Rolled back to checkpoint ${args.checkpoint_id}` : 'Rollback failed' }] };
            }
            // Phase 53: Memory Tools
            else if (name === "add_memory") {
                const type = args.type || 'working';
                const namespace = args.namespace || 'project';
                const memory = await this.agentMemoryService.add(args.content, type, namespace, {
                    source: args.source || 'tool',
                    tags: args.tags || [],
                });
                result = { content: [{ type: "text", text: `Added ${type} memory: ${memory.id}` }] };
            }
            else if (name === "search_memory") {
                const memories = await this.agentMemoryService.search(args.query, {
                    type: args.type,
                    namespace: args.namespace,
                    limit: args.limit || 10,
                });
                if (memories.length === 0) {
                    result = { content: [{ type: "text", text: `No memories found matching "${args.query}"` }] };
                } else {
                    const formatted = memories.map(m =>
                        `[${m.type}/${m.namespace}] ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''} (score: ${(m.score ?? 0).toFixed(2)})`
                    ).join('\n');
                    result = { content: [{ type: "text", text: `Found ${memories.length} memories:\n${formatted}` }] };
                }
            }
            else if (name === "get_recent_memories") {
                const memories = await this.agentMemoryService.getRecent(args.limit || 10, {
                    type: args.type,
                    namespace: args.namespace,
                });
                if (memories.length === 0) {
                    result = { content: [{ type: "text", text: 'No recent memories.' }] };
                } else {
                    const formatted = memories.map(m =>
                        `[${m.type}/${m.namespace}] ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`
                    ).join('\n');
                    result = { content: [{ type: "text", text: `Recent memories:\n${formatted}` }] };
                }
            }
            else if (name === "memory_stats") {
                const stats = this.agentMemoryService.getStats();
                const formatted = Object.entries(stats).map(([k, v]) => `${k}: ${v}`).join('\n');
                result = { content: [{ type: "text", text: `Memory Statistics:\n${formatted}` }] };
            }
            else if (name === "clear_session_memory") {
                this.agentMemoryService.clearSession();
                result = { content: [{ type: "text", text: 'Cleared all session memories.' }] };
            }
            // Phase 54: Workflow Tools
            else if (name === "run_workflow") {
                const workflowId = args.workflow_id;
                const input = args.input || {};
                try {
                    const runResult = await this.workflowEngine.start(workflowId, { input });
                    result = {
                        content: [{
                            type: "text",
                            text: `Workflow ${workflowId} completed.\nRun ID: ${runResult.id}\nStatus: ${runResult.status}\nNode: ${runResult.currentNode}\nOutput: ${JSON.stringify(runResult.state?.output ?? runResult.state, null, 2).substring(0, 500)}`
                        }]
                    };
                } catch (e: any) {
                    result = { content: [{ type: "text", text: `Workflow error: ${e.message}` }] };
                }
            }
            else if (name === "list_workflows") {
                const executions = this.workflowEngine.listExecutions();
                if (executions.length === 0) {
                    result = { content: [{ type: "text", text: 'No workflow executions. Use run_workflow to start a workflow.' }] };
                } else {
                    const formatted = executions.map(e => `- ${e.id}: ${e.workflowId} [${e.status}] at ${e.currentNode}`).join('\n');
                    result = { content: [{ type: "text", text: `Workflow executions:\n${formatted}` }] };
                }
            }
            else if (name === "workflow_status") {
                const runId = args.run_id;
                const execution = this.workflowEngine.getExecution(runId);
                if (!execution) {
                    result = { content: [{ type: "text", text: `No workflow run found with ID: ${runId}` }] };
                } else {
                    result = {
                        content: [{
                            type: "text",
                            text: `Workflow Run: ${runId}\nWorkflow: ${execution.workflowId}\nStatus: ${execution.status}\nCurrent Node: ${execution.currentNode}\nLast Updated: ${execution.updatedAt}`
                        }]
                    };
                }
            }
            else if (name === "approve_workflow") {
                const runId = args.run_id;
                const approved = args.approved ?? true;
                try {
                    if (approved) {
                        await this.workflowEngine.approve(runId);
                    } else {
                        this.workflowEngine.reject(runId, 'Rejected via approve_workflow tool');
                    }
                    result = { content: [{ type: "text", text: approved ? `Approved workflow ${runId}` : `Rejected workflow ${runId}` }] };
                } catch (e: any) {
                    result = { content: [{ type: "text", text: `Approval error: ${e.message}` }] };
                }
            }
            // Phase 55: Code Mode Tools
            else if (name === "execute_code") {
                const code = args.code;
                if (!this.codeModeService.isEnabled()) {
                    result = { content: [{ type: "text", text: 'Code Mode is disabled. Use enable_code_mode first.' }] };
                } else {
                    try {
                        const execResult = await this.codeModeService.executeCode(code, args.context || {});
                        if (execResult.success) {
                            result = {
                                content: [{
                                    type: "text",
                                    text: `Execution successful (${execResult.executionTime}ms)\nTools called: ${execResult.toolsCalled.join(', ') || 'none'}\nOutput:\n${execResult.output || execResult.result || 'No output'}`
                                }]
                            };
                        } else {
                            result = { content: [{ type: "text", text: `Execution failed: ${execResult.error}\nOutput: ${execResult.output || 'none'}` }] };
                        }
                    } catch (e: any) {
                        result = { content: [{ type: "text", text: `Code execution error: ${e.message}` }] };
                    }
                }
            }
            else if (name === "enable_code_mode") {
                this.codeModeService.enable();
                result = { content: [{ type: "text", text: 'Code Mode enabled. You can now execute code via execute_code.' }] };
            }
            else if (name === "disable_code_mode") {
                this.codeModeService.disable();
                result = { content: [{ type: "text", text: 'Code Mode disabled.' }] };
            }
            else if (name === "code_mode_status") {
                const enabled = this.codeModeService.isEnabled();
                const registry = this.codeModeService.getRegistry();
                const toolCount = registry.getNames().length;
                const reduction = this.codeModeService.calculateContextReduction();
                result = {
                    content: [{
                        type: "text",
                        text: `Code Mode Status:\n- Enabled: ${enabled}\n- Registered tools: ${toolCount}\n- Context reduction: ${reduction.reduction}% (${reduction.traditional} → ${reduction.codeMode} chars)`
                    }]
                };
            }
            else if (name === "list_code_tools") {
                const registry = this.codeModeService.getRegistry();
                const tools = registry.getAll();
                if (tools.length === 0) {
                    result = { content: [{ type: "text", text: 'No tools registered in Code Mode.' }] };
                } else {
                    const formatted = tools.map(t => `- ${t.name}: ${t.description}`).join('\n');
                    result = { content: [{ type: "text", text: `Code Mode Tools:\n${formatted}` }] };
                }
            }
            else {
                // Check Standard Library
                const terminalTools = this.terminalService.getTools();
                const standardTool = [...FileSystemTools, ...terminalTools, ...MemoryTools, ...TunnelTools, ...LogTools, ...ConfigTools, ...SearchTools, ...ReaderTools, ...WorktreeTools, ...MetaTools, WebSearchTool].find(t => t.name === name);
                if (standardTool) {
                    // @ts-ignore
                    result = await standardTool.handler(args);
                } else {
                    // 1. Try MCPAggregator (Downstream Servers)
                    try {
                        result = await this.mcpAggregator.executeTool(name, args);
                    } catch (aggErr: any) {
                        // 2. Fallback to Router (Legacy Delegation)
                        if (aggErr.message.includes('No provider found')) {
                            try {
                                result = await this.router.callTool(name, args);
                            } catch (e: any) {
                                throw new Error(`Tool execution failed: ${e.message}`);
                            }
                        } else {
                            throw aggErr; // Re-throw actual execution errors from aggregator
                        }
                    }
                }
            }

            // Broadcast Success
            try {
                this.auditService.log('TOOL_END', { tool: name, result: JSON.stringify(result).substring(0, 500), duration: Date.now() - startTime }, 'INFO');
            } catch (e) { console.error("Audit Fail", e); }
            if (this.wssInstance) {
                this.wssInstance.clients.forEach((c: any) => {
                    if (c.readyState === 1) c.send(JSON.stringify({
                        type: 'TOOL_CALL_END',
                        id: callId,
                        tool: name,
                        success: true,
                        duration: Date.now() - startTime,
                        result: JSON.stringify(result).substring(0, 200) // Summarize
                    }));
                });
            }

            // ENGAGEMENT MODULE: Suggestion Trigger
            if ((name === "read_file" || name === "view_file") && result) {
                const resAny = result as any;
                if (resAny.content && resAny.content[0] && resAny.content[0].text) {
                    const filePath = args.path || args.AbsolutePath;
                    this.suggestionService.processContext({
                        type: 'file_read',
                        path: filePath,
                        content: resAny.content[0].text
                    }).catch(e => console.error("[SuggestionService] Trigger failed:", e));
                }
            }

            return result;

        } catch (e: any) {
            // Audit Error
            try {
                this.auditService.log('TOOL_END', { tool: name, error: e.message, duration: Date.now() - startTime }, 'ERROR');
            } catch (auditErr) { console.error("Audit Fail", auditErr); }

            // Broadcast Error
            if (this.wssInstance) {
                this.wssInstance.clients.forEach((c: any) => {
                    if (c.readyState === 1) c.send(JSON.stringify({
                        type: 'TOOL_CALL_END',
                        id: callId,
                        tool: name,
                        success: false,
                        duration: Date.now() - startTime,
                        result: e.message
                    }));
                });
            }
            // Return Error as Content (Don't throw, it kills the MCP stream)
            return {
                isError: true,
                content: [{ type: "text", text: `Error: ${e.message}` }]
            };
        }
    }

    private setupHandlers(serverInstance: Server) {
        serverInstance.setRequestHandler(ListToolsRequestSchema, async () => {
            const internalTools = [
                {
                    name: "router_status",
                    description: "Check the status of the Borg Router",
                    inputSchema: { type: "object", properties: {} },
                },
                {
                    name: "mcpm_search",
                    description: "Search for skills in the module registry",
                    inputSchema: {
                        type: "object",
                        properties: {
                            query: { type: "string" }
                        },
                        required: ["query"]
                    },
                },
                {
                    name: "mcpm_install",
                    description: "Install a skill from the registry (via git)",
                    inputSchema: {
                        type: "object",
                        properties: {
                            name: { type: "string" }
                        },
                        required: ["name"]
                    },
                },
                {
                    name: "mcp_add_server",
                    description: "Add a new downstream MCP server (via git clone + config update)",
                    inputSchema: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            repoUrl: { type: "string" },
                            command: { type: "string", description: "Command to start server (e.g. 'node')" },
                            args: { type: "array", items: { type: "string" }, description: "Args for command (e.g. ['dist/index.js'])" },
                            env: { type: "object", description: "Environment variables" }
                        },
                        required: ["name", "repoUrl", "command", "args"]
                    }
                },
                {
                    name: "system_status",
                    description: "Get current system metrics (CPU, Memory, Uptime)",
                    inputSchema: { type: "object", properties: {} },
                },
                {
                    name: "system_diagnostics",
                    description: "Run advanced health checks on Core, Web UI, and Bridges",
                    inputSchema: { type: "object", properties: {} },
                },
                {
                    name: "assimilate_skill",
                    description: "Convert a research item into a functional Borg Skill (runbook)",
                    inputSchema: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            url: { type: "string" },
                            summary: { type: "string" },
                            relevance: { type: "string" }
                        },
                        required: ["name", "url", "summary", "relevance"]
                    }
                },
                {
                    name: "memorize_page",
                    description: "Save the current browser page content to long-term memory",
                    inputSchema: { type: "object", properties: {} },
                },
                {
                    name: "browser_screenshot",
                    description: "Capture a screenshot of the current browser page",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "memory_index_codebase",
                    description: "Deep Data Search: Index a directory for semantic code search",
                    inputSchema: {
                        type: "object",
                        properties: {
                            path: { type: "string", description: "Absolute path to directory to index (default: cwd)" }
                        }
                    }
                },
                {
                    name: "memory_search",
                    description: "Semantic search across indexed code and memories",
                    inputSchema: {
                        type: "object",
                        properties: {
                            query: { type: "string" },
                            limit: { type: "number" }
                        },
                        required: ["query"]
                    }
                },
                {
                    name: "browser_get_history",
                    description: "Get browser history from the connected browser extension",
                    inputSchema: {
                        properties: {
                            query: { type: "string", description: "Search query for history items" },
                            maxResults: { type: "number", description: "Maximum number of results to return (default 20)" }
                        }
                    }
                },
                {
                    name: "browser_debug",
                    description: "Deep browser debugging via CDP (Chrome DevTools Protocol)",
                    inputSchema: {
                        type: "object",
                        properties: {
                            action: { type: "string", enum: ["attach", "detach", "command"], description: "Action to perform" },
                            method: { type: "string", description: "CDP method to call (e.g. Runtime.evaluate)" },
                            params: { type: "object", description: "CDP parameters" }
                        },
                        required: ["action"]
                    }
                },
                {
                    name: "browser_proxy_fetch",
                    description: "Perform a network fetch through the browser extension (bypasses CORS, reaches local servers)",
                    inputSchema: {
                        type: "object",
                        properties: {
                            url: { type: "string", description: "URL to fetch" },
                            options: { type: "object", description: "Fetch options (method, headers, body)" }
                        },
                        required: ["url"]
                    }
                },
                {
                    name: "spawn_agent",
                    description: "Spawn a specialized sub-agent for a parallel task",
                    inputSchema: {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["research", "code", "custom"], description: "Agent type" },
                            task: { type: "string", description: "Detailed task description for the agent" }
                        },
                        required: ["type", "task"]
                    }
                },
                {
                    name: "list_agents",
                    description: "List all active sub-agents in the swarm",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "kill_agent",
                    description: "Terminate a running sub-agent",
                    inputSchema: {
                        type: "object",
                        properties: {
                            agentId: { type: "string", description: "UUID of the agent to kill" }
                        },
                        required: ["agentId"]
                    }
                },
                {
                    name: "get_agent_result",
                    description: "Retrieve the final result of a completed agent task",
                    inputSchema: {
                        type: "object",
                        properties: {
                            agentId: { type: "string", description: "UUID of the agent" }
                        },
                        required: ["agentId"]
                    }
                },
                {
                    name: "start_task",
                    description: "Start an autonomous task with the Director Agent",
                    inputSchema: {
                        type: "object",
                        properties: {
                            goal: { type: "string" },
                            maxSteps: { type: "number" }
                        },
                        required: ["goal"]
                    }
                },
                {
                    name: "start_autotest",
                    description: "Start the Auto-Test Watcher (runs tests on file save)",
                    inputSchema: { type: "object", properties: {} },
                },
                {
                    name: "stop_autotest",
                    description: "Stop the Auto-Test Watcher",
                    inputSchema: { type: "object", properties: {} },
                },
                {
                    name: "execute_sandbox",
                    description: "Execute code in a secure Docker container (Python/Node)",
                    inputSchema: {
                        type: "object",
                        properties: {
                            language: { type: "string", enum: ["python", "node"] },
                            code: { type: "string" }
                        },
                        required: ["language", "code"]
                    }
                },
                {
                    name: "start_watchdog",
                    description: "Start the Supervisor Watchdog to auto-approve terminal prompts",
                    inputSchema: {
                        type: "object",
                        properties: {
                            maxCycles: { type: "number", description: "Number of 5s cycles to run (default 20)" }
                        }
                    }
                },
                {
                    name: "start_chat_daemon",
                    description: "Start the Director in Chat Daemon mode (Auto-Approves & Reads Selection)",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "start_auto_drive",
                    description: "Start the Autonomous Development Loop (Reads task.md, Drives Chat, Auto-Approves)",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "stop_auto_drive",
                    description: "Stop the Autonomous Development Loop",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "set_autonomy",
                    description: "Set the autonomy level (low, medium, high)",
                    inputSchema: {
                        type: "object",
                        properties: {
                            level: { type: "string", enum: ["low", "medium", "high"] }
                        },
                        required: ["level"]
                    }
                },
                {
                    name: "chat_reply",
                    description: "Insert text into the active browser chat (Web Bridge)",
                    inputSchema: {
                        type: "object",
                        properties: {
                            text: { type: "string" }
                        },
                        required: ["text"]
                    }
                },
                {
                    name: "chat_submit",
                    description: "Simulate pressing Enter in the chat input",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "click_element",
                    description: "Click a button or link on the page by identifying text",
                    inputSchema: {
                        type: "object",
                        properties: {
                            target: { type: "string", description: "Text content of the button/link to click" }
                        },
                        required: ["target"]
                    }
                },
                {
                    name: "click_at",
                    description: "Click at specific X,Y coordinates on the page (for Vision capabilities)",
                    inputSchema: {
                        type: "object",
                        properties: {
                            x: { type: "number" },
                            y: { type: "number" }
                        },
                        required: ["x", "y"]
                    }
                },
                {
                    name: "native_input",
                    description: "Simulate global keyboard input (for Native Apps/IDE)",
                    inputSchema: {
                        type: "object",
                        properties: {
                            keys: { type: "string", description: "Keys: enter, esc, ctrl+r, f5, etc." }
                        },
                        required: ["keys"]
                    }
                },
                {
                    name: "vscode_execute_command",
                    description: "Execute a VS Code command via the installed extension",
                    inputSchema: {
                        type: "object",
                        properties: {
                            command: { type: "string", description: "Command ID (e.g. workbench.action.files.save)" },
                            args: { type: "array", description: "Optional arguments", items: { type: "string" } }
                        },
                        required: ["command"]
                    }
                },
                {
                    name: "read_page",
                    description: "Read the text content of the active browser tab",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "use_agent",
                    description: "Delegate a task to an external AI Agent (Claude, Gemini)",
                    inputSchema: {
                        type: "object",
                        properties: {
                            name: { type: "string", enum: ["claude", "gemini"], description: "Name of the agent to use" },
                            prompt: { type: "string", description: "The task or prompt to send to the agent" }
                        },
                        required: ["name", "prompt"]
                    }
                },
                {
                    name: "take_screenshot",
                    description: "Capture a screenshot of the active browser tab",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "analyze_screenshot",
                    description: "Capture and analyze a screenshot of the active browser tab using Vision AI",
                    inputSchema: {
                        type: "object",
                        properties: {
                            prompt: { type: "string", description: "Question or instruction about the screenshot" }
                        },
                        required: ["prompt"]
                    }
                },
                {
                    name: "vscode_get_status",
                    description: "Get the current status of the VS Code editor (Active File, Terminal, etc.)",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "vscode_read_selection",
                    description: "Read the currently selected text or the entire active document from VS Code",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "vscode_read_terminal",
                    description: "Read the content of the active terminal (Uses Clipboard: SelectAll -> Copy)",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "vscode_get_notifications",
                    description: "Read the latest notification/status message from VS Code",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "vscode_submit_chat",
                    description: "Submit the current text in the chat input (Simulates Enter)",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "index_codebase",
                    description: "Scan code files and populate the semantic memory (vector store)",
                    inputSchema: {
                        type: "object",
                        properties: {
                            path: { type: "string", description: "Root directory to index (defaults to cwd)" }
                        }
                    }
                },
                {
                    name: "search_codebase",
                    description: "Semantically search the codebase for relevant snippets",
                    inputSchema: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "Natural language query (e.g. 'Where is authentication?')" }
                        },
                        required: ["query"]
                    }
                },
                {
                    name: "chain_tools",
                    description: "Execute a sequence of tools where outputs can be piped to inputs. Use {{prev.content[0].text}} for variable substitution.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            tools: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        toolName: { type: "string" },
                                        args: { type: "object" }
                                    },
                                    required: ["toolName"]
                                }
                            }
                        },
                        required: ["tools"]
                    }
                },
                {
                    name: "get_knowledge_graph",
                    description: "Retrieve the interconnected knowledge graph for visualization.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "Optional topic to focus the graph around" },
                            depth: { type: "number", description: "Traversal depth (default: 1)" }
                        }
                    }
                },
                // Phase 51: LSP Tools
                {
                    name: "find_symbol",
                    description: "Find a symbol (function, class, variable) by name in a file",
                    inputSchema: {
                        type: "object",
                        properties: {
                            file_path: { type: "string", description: "Relative path to the file" },
                            symbol_name: { type: "string", description: "Name of the symbol to find" }
                        },
                        required: ["file_path", "symbol_name"]
                    }
                },
                {
                    name: "find_references",
                    description: "Find all references to a symbol at a position",
                    inputSchema: {
                        type: "object",
                        properties: {
                            file_path: { type: "string" },
                            line: { type: "number", description: "Line number (0-indexed)" },
                            character: { type: "number", description: "Character position (0-indexed)" }
                        },
                        required: ["file_path", "line", "character"]
                    }
                },
                {
                    name: "go_to_definition",
                    description: "Navigate to the definition of a symbol at a position",
                    inputSchema: {
                        type: "object",
                        properties: {
                            file_path: { type: "string" },
                            line: { type: "number" },
                            character: { type: "number" }
                        },
                        required: ["file_path", "line", "character"]
                    }
                },
                {
                    name: "get_symbols",
                    description: "Get all symbols (functions, classes, variables) in a file",
                    inputSchema: {
                        type: "object",
                        properties: {
                            file_path: { type: "string", description: "Relative path to the file" }
                        },
                        required: ["file_path"]
                    }
                },
                {
                    name: "rename_symbol",
                    description: "Rename a symbol across the entire project (semantic rename)",
                    inputSchema: {
                        type: "object",
                        properties: {
                            file_path: { type: "string" },
                            line: { type: "number" },
                            character: { type: "number" },
                            new_name: { type: "string", description: "New name for the symbol" }
                        },
                        required: ["file_path", "line", "character", "new_name"]
                    }
                },
                {
                    name: "search_symbols",
                    description: "Search for symbols by name across the entire project",
                    inputSchema: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "Search query for symbol names" }
                        },
                        required: ["query"]
                    }
                },
                // Phase 51: Plan/Build Mode Tools
                {
                    name: "plan_mode",
                    description: "Switch to PLAN mode - explore/propose changes without applying",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "build_mode",
                    description: "Switch to BUILD mode - approved changes can be applied",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "propose_change",
                    description: "Propose a file change (staged in diff sandbox)",
                    inputSchema: {
                        type: "object",
                        properties: {
                            file_path: { type: "string", description: "Path to file to change" },
                            content: { type: "string", description: "New file content" },
                            description: { type: "string", description: "Description of the change" }
                        },
                        required: ["file_path", "content"]
                    }
                },
                {
                    name: "review_changes",
                    description: "View all pending changes in the diff sandbox",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "approve_change",
                    description: "Approve a pending diff by ID",
                    inputSchema: {
                        type: "object",
                        properties: {
                            diff_id: { type: "string", description: "ID of the diff to approve" }
                        },
                        required: ["diff_id"]
                    }
                },
                {
                    name: "apply_changes",
                    description: "Apply all approved changes to filesystem (BUILD mode only)",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "plan_status",
                    description: "Get current mode (PLAN/BUILD) and diff sandbox status",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "create_checkpoint",
                    description: "Create a checkpoint for rollback",
                    inputSchema: {
                        type: "object",
                        properties: {
                            name: { type: "string", description: "Checkpoint name" },
                            description: { type: "string", description: "Optional description" }
                        },
                        required: ["name"]
                    }
                },
                {
                    name: "rollback",
                    description: "Rollback to a previous checkpoint",
                    inputSchema: {
                        type: "object",
                        properties: {
                            checkpoint_id: { type: "string", description: "ID of checkpoint to restore" }
                        },
                        required: ["checkpoint_id"]
                    }
                },
                // Phase 53: Memory Tools
                {
                    name: "add_memory",
                    description: "Add a memory to the agent's knowledge base",
                    inputSchema: {
                        type: "object",
                        properties: {
                            content: { type: "string", description: "Memory content to store" },
                            type: { type: "string", enum: ["session", "working", "long_term"], description: "Memory tier (default: working)" },
                            namespace: { type: "string", enum: ["user", "agent", "project"], description: "Memory namespace (default: project)" },
                            source: { type: "string", description: "Source of the memory" },
                            tags: { type: "array", items: { type: "string" }, description: "Tags for categorization" }
                        },
                        required: ["content"]
                    }
                },
                {
                    name: "search_memory",
                    description: "Search memories by content similarity",
                    inputSchema: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "Search query" },
                            type: { type: "string", enum: ["session", "working", "long_term"], description: "Filter by memory tier" },
                            namespace: { type: "string", enum: ["user", "agent", "project"], description: "Filter by namespace" },
                            limit: { type: "number", description: "Max results (default: 10)" }
                        },
                        required: ["query"]
                    }
                },
                {
                    name: "get_recent_memories",
                    description: "Get most recently accessed memories",
                    inputSchema: {
                        type: "object",
                        properties: {
                            limit: { type: "number", description: "Max results (default: 10)" },
                            type: { type: "string", enum: ["session", "working", "long_term"] },
                            namespace: { type: "string", enum: ["user", "agent", "project"] }
                        }
                    }
                },
                {
                    name: "memory_stats",
                    description: "Get memory system statistics",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "clear_session_memory",
                    description: "Clear all ephemeral session memories",
                    inputSchema: { type: "object", properties: {} }
                },
                // Phase 54: Workflow Tools
                {
                    name: "run_workflow",
                    description: "Run a registered workflow with input",
                    inputSchema: {
                        type: "object",
                        properties: {
                            workflow_id: { type: "string", description: "ID of the workflow to run" },
                            input: { type: "object", description: "Input data for the workflow" }
                        },
                        required: ["workflow_id"]
                    }
                },
                {
                    name: "list_workflows",
                    description: "List all registered workflows",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "workflow_status",
                    description: "Get the status of a workflow run",
                    inputSchema: {
                        type: "object",
                        properties: {
                            run_id: { type: "string", description: "ID of the workflow run" }
                        },
                        required: ["run_id"]
                    }
                },
                {
                    name: "approve_workflow",
                    description: "Approve or reject a workflow waiting for human-in-the-loop",
                    inputSchema: {
                        type: "object",
                        properties: {
                            run_id: { type: "string", description: "ID of the workflow run" },
                            approved: { type: "boolean", description: "Whether to approve (true) or reject (false)" }
                        },
                        required: ["run_id"]
                    }
                },
                // Phase 55: Code Mode Tools
                {
                    name: "execute_code",
                    description: "Execute JavaScript/TypeScript code in a sandboxed environment with tool access",
                    inputSchema: {
                        type: "object",
                        properties: {
                            code: { type: "string", description: "JavaScript/TypeScript code to execute" },
                            context: { type: "object", description: "Additional context variables to inject" }
                        },
                        required: ["code"]
                    }
                },
                {
                    name: "enable_code_mode",
                    description: "Enable Code Mode for efficient tool calling via code execution",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "disable_code_mode",
                    description: "Disable Code Mode",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "code_mode_status",
                    description: "Get Code Mode status, registered tools, and context reduction stats",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "list_code_tools",
                    description: "List tools available in Code Mode",
                    inputSchema: { type: "object", properties: {} }
                }
            ];

            // Standard Library Tools
            const terminalTools = this.terminalService.getTools();
            const standardTools = [...FileSystemTools, ...terminalTools, ...MemoryTools, ...TunnelTools, ...LogTools, ...ConfigTools, ...SearchTools, ...ReaderTools, ...WorktreeTools].map(t => ({
                name: t.name,
                description: t.description,
                inputSchema: t.inputSchema
            }));

            // Skills
            const skillTools = this.skillRegistry.getSkillTools();

            // Aggregation: Fetch tools from all connected sub-MCPs
            const externalTools = await this.router.listTools();
            const aggregatedTools = await this.mcpAggregator.listAggregatedTools();

            return {
                tools: [
                    ...internalTools,
                    ...standardTools,
                    ...skillTools,
                    ...externalTools,
                    ...aggregatedTools
                ],
            };
        });

        serverInstance.setRequestHandler(CallToolRequestSchema, async (request) => {
            this.lastUserActivityTime = Date.now();
            return await this.executeTool(request.params.name, request.params.arguments);
        });
    }

    async start() {
        console.log("[MCPServer] Loading Skills...");
        // Non-blocking initialization of aggregator to prevent stalling Stdio/WS start
        this.mcpAggregator.initialize().catch(e => console.error("[MCPServer] Aggregator Init Failed:", e));

        // Start Services
        // this.director.startChatDaemon(); // Removed, auto-drive handles this

        // Build Graph in Background
        this.autoTestService.repoGraph.buildGraph().catch(e => console.error("Graph build failed", e));

        console.log(`[MCPServer] 🚀 Borg Core ready.`);

        // 1. Start Stdio (for local CLI usage)
        console.log("[MCPServer] Connecting Stdio...");
        const stdioTransport = new StdioServerTransport();
        await this.server.connect(stdioTransport);
        console.error("Borg Core: Stdio Transport Active");

        // 2. Start WebSocket (for Extension/Web usage)
        if (this.wsServer) {
            console.log("[MCPServer] Starting WebSocket Server...");
            const PORT = 3001;
            const httpServer = http.createServer(async (req, res) => {
                if (req.url === '/health') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        status: 'online',
                        uptime: process.uptime(),
                        timestamp: Date.now(),
                        version: '0.1.0'
                    }));
                } else if (req.url === '/mcp/servers') {
                    const servers = await this.mcpAggregator.listServers();
                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*' // Allow Web UI access
                    });
                    res.end(JSON.stringify(servers));
                } else if (req.method === 'POST') {
                    // Handle POST requests (Extension Compatibility)
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', async () => {
                        try {
                            const data = JSON.parse(body);
                            res.writeHead(200, {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            });

                            if (req.url === '/director.chat') {
                                // Direct chat interface
                                const result = await this.director.executeTask(data.message);
                                res.end(JSON.stringify({ result: { data: result } }));
                            } else if (req.url === '/tool/execute') {
                                // Generic tool execution
                                const result = await this.executeTool(data.name, data.args);
                                res.end(JSON.stringify({ result: { data: result } }));
                            } else {
                                // Forward to TRPC-like structure if needed, or 404
                                res.writeHead(404);
                                res.end(JSON.stringify({ error: 'Endpoint not found' }));
                            }
                        } catch (e: any) {
                            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                            res.end(JSON.stringify({ error: e.message }));
                        }
                    });
                } else {
                    res.writeHead(404);
                    res.end();
                }
            });
            const wss = new WebSocketServer({ server: httpServer });
            this.wssInstance = wss;
            const wsTransport = new WebSocketServerTransport(wss);

            httpServer.on('error', (err: any) => {
                console.error(`[Borg Core] ❌ WebSocket Server Error (Port ${PORT}):`, err.message);
            });

            httpServer.listen(PORT, () => {
                console.error(`Borg Core: WebSocket Transport Active on ws://localhost:${PORT}`);
            });

            // 2.5 Setup WS Message Handling mechanism
            wss.on('connection', (ws: any) => {
                ws.on('message', (data: any) => {
                    try {
                        const msg = JSON.parse(data.toString());
                        // Robust Response Handling: Any message with a requestId should resolve a pending promise
                        if (msg.requestId && this.pendingRequests.has(msg.requestId)) {
                            const resolve = this.pendingRequests.get(msg.requestId);
                            if (resolve) {
                                // If it's a STATUS_UPDATE, we unpack .status for legacy parity
                                // Otherwise we pass the whole message so the caller can extract what they need (e.g. .history, .logs)
                                if (msg.type === 'STATUS_UPDATE') {
                                    resolve(msg.status);
                                } else {
                                    resolve(msg);
                                }
                                this.pendingRequests.delete(msg.requestId);
                            }
                        }

                        // Special handling for legacy/specific types if needed (though the above handles most)
                        if (msg.type === 'BROWSER_MIRROR_UPDATE') {
                            // Relay to all other clients (Web UI)
                            wss.clients.forEach((client: any) => {
                                if (client !== ws && client.readyState === 1) {
                                    client.send(data.toString());
                                }
                            });
                        }

                        if (msg.type === 'USER_ACTIVITY') {
                            this.lastUserActivityTime = Math.max(this.lastUserActivityTime, msg.lastActivityTime);
                            if (msg.activeEditor) {
                                this.suggestionService.processContext({
                                    type: 'editor',
                                    path: msg.activeEditor.uri,
                                    content: '' // Could retrieve content if needed
                                });
                            }
                        }

                        if (msg.type === 'BROWSER_LOG') {
                            const icon = msg.level === 'error' ? '🔴' : msg.level === 'warn' ? '🟡' : '🔵';
                            console.log(`[Browser] ${icon} ${msg.content} (${msg.url})`);
                            if (msg.level === 'error') {
                                this.auditService.log('BROWSER_ERROR', { url: msg.url, error: msg.content }, 'ERROR');
                                // TRIGGER HEALER
                                this.healerService.heal({ url: msg.url, error: msg.content, timestamp: msg.timestamp })
                                    .catch(e => console.error("Healer Error:", e));
                            }
                        }
                    } catch (e) {
                        // Ignore non-JSON
                    }
                });
            });
        } else {
            console.log("[MCPServer] Skipping WebSocket (No wsServer instance).");
        }

        // 3. Connect to Supervisor (Native Automation)
        console.log("[MCPServer] Connecting to Supervisor...");

        try {
            console.log(`[MCPServer] DEBUG __dirname: ${__dirname}`);
            const rootDir = this.findMonorepoRoot(__dirname);
            console.log(`[MCPServer] DEBUG rootDir: ${rootDir}`);
            if (rootDir) {
                const supervisorPath = path.join(rootDir, 'packages', 'borg-supervisor', 'dist', 'index.js');
                console.log(`[MCPServer] Supervisor Path Resolved: ${supervisorPath}`);

                await this.router.connectToServer('borg-supervisor', 'node', [supervisorPath]);
                console.error(`Borg Core: Connected to Supervisor at ${supervisorPath}`);

                // Phase 16: Google Workspace Integration
                const workspacePath = path.join(rootDir, 'external', 'mcp-servers', 'workspace', 'workspace-server', 'dist', 'index.js');
                console.log(`[MCPServer] Google Workspace Server Path: ${workspacePath}`);
                if (fs.existsSync(workspacePath)) {
                    await this.router.connectToServer('google-workspace', 'node', [workspacePath]);
                    console.error("Borg Core: Connected to Google Workspace Server (GMail/Calendar)");
                }
            } else {
                console.error("[MCPServer] Failed to locate Monorepo Root. Skipping Supervisor.");
            }
        } catch (e: any) {
            console.error("Borg Core: Failed to connect to Supervisor. Native automation disabled.", e.message);
        }

        if (this.wsServer && this.wssInstance) {
            console.log("[MCPServer] Connecting internal WS transport...");
            const wsTransport = new WebSocketServerTransport(this.wssInstance);
            await this.wsServer.connect(wsTransport);
        }
        console.log("[MCPServer] Start Complete.");
    }

    private findMonorepoRoot(startDir: string): string | null {
        let current = startDir;
        const root = path.parse(current).root;
        while (current !== root) {
            if (fs.existsSync(path.join(current, 'turbo.json'))) {
                return current;
            }
            current = path.dirname(current);
        }
        return null;
    }
}
