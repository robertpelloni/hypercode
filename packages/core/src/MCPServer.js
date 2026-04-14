"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPServer = void 0;
console.log("[MCPServer] Starting imports...");
require("./debug_marker.js");
var index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
var stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
console.log("[MCPServer] ✓ @modelcontextprotocol/sdk");
var url_1 = require("url");
var path_1 = require("path");
var fs_1 = require("fs");
console.log("[MCPServer] ✓ path/url/fs");
var Router_js_1 = require("./Router.js");
console.log("[MCPServer] ✓ Router");
    console.error("[MCPServer] Starting imports...");
console.log("[MCPServer] ✓ ModelSelector");
    console.error("[MCPServer] ✓ @modelcontextprotocol/sdk");
var WebSocketServerTransport_js_1 = require("./transports/WebSocketServerTransport.js");
    console.error("[MCPServer] ✓ path/url/fs");
console.log("[MCPServer] ✓ ws/http");
    console.error("[MCPServer] ✓ Router");
var agents_1 = require("@hypercode/agents");
    console.error("[MCPServer] ✓ ModelSelector");
var GeminiAgent_js_1 = require("./agents/GeminiAgent.js");
    console.error("[MCPServer] ✓ ws/http");
var MetaArchitectAgent_js_1 = require("./agents/MetaArchitectAgent.js");
    console.error("[MCPServer] ✓ Phase 51/53 Infrastructure");
var ResearcherAgent_js_1 = require("./agents/ResearcherAgent.js");
    console.error("[MCPServer] ✓ SkillRegistry");
var MeshCoderAgent_js_1 = require("./agents/MeshCoderAgent.js");
    console.error("[MCPServer] ✓ SpawnerService");
var ConfigManager_js_1 = require("./config/ConfigManager.js");
    console.error("[MCPServer] ✓ All Tools & ChainExecutor");
var ShellService_js_1 = require("./services/ShellService.js");
    console.error("[MCPServer] ✓ All Tools & ChainExecutor");
var SquadService_js_1 = require("./orchestrator/SquadService.js");
    console.error("[MCPServer] ✓ Council");
var GitWorktreeManager_js_1 = require("./orchestrator/GitWorktreeManager.js");
    console.error("[MCPServer] ✓ Commands");
var GitService_js_1 = require("./services/GitService.js");
    console.error("[MCPServer] ✓ PermissionManager");
var SkillRegistry_js_1 = require("./skills/SkillRegistry.js");
    console.error("[MCPServer] All imports complete!");
        console.error("[MCPServer] Loaded persistent config.");
        console.error("[MCPServer] Lazy-loading memory system (MemoryManager)...");
            console.error("[MCPServer] Triggering Recursive Research: ".concat(topic));
            console.error("[MCPServer] No Browser Extension. Falling back to Native Reader...");
                console.error("[MCPServer] Browser Timed Out. Falling back to Native Reader...");
            console.error("[MCPServer] Delegating tool handling to MetaMCPController...");
            console.error("[MCPServer] Loading Skills...");
            console.error("[MCPServer] 🚀 HyperCode Core ready.");
            console.error("[MCPServer] Connecting Stdio...");
                console.error("[MCPServer] Starting WebSocket Server...");
                console.error("[MCPServer] Skipping WebSocket (No wsServer instance).");
            console.error("[MCPServer] Connecting to Supervisor...");
            console.error("[MCPServer] DEBUG __dirname: ".concat(__dirname));
            console.error("[MCPServer] DEBUG rootDir: ".concat(rootDir));
            console.error("[MCPServer] Supervisor Path Resolved: ".concat(supervisorPath));
            console.error("[MCPServer] Google Workspace Server Path: ".concat(workspacePath));
            console.error("[MCPServer] Connecting internal WS transport...");
            console.error("[MCPServer] Start Complete.");
var MCPAggregator_js_1 = require("./mcp/MCPAggregator.js");
var SubmoduleManager_js_1 = require("./mcp/SubmoduleManager.js");
var SubmoduleService_js_1 = require("./services/SubmoduleService.js");
var FileSensor_js_1 = require("./sensors/FileSensor.js");
var TerminalSensor_js_1 = require("./sensors/TerminalSensor.js");
var AutoTestReactor_js_1 = require("./reactors/AutoTestReactor.js");
var HealerReactor_js_1 = require("./reactors/HealerReactor.js");
var SessionManager_js_1 = require("./services/SessionManager.js");
var ProjectTracker_js_1 = require("./services/ProjectTracker.js");
var MissionService_js_1 = require("./services/MissionService.js");
console.log("[MCPServer] ✓ SkillRegistry");
var SpawnerService_js_1 = require("./agents/SpawnerService.js");
console.log("[MCPServer] ✓ SpawnerService");
var tools_1 = require("@hypercode/tools");
console.log("[MCPServer] ✓ All Tools & ChainExecutor");
console.log("[MCPServer] ✓ All Tools & ChainExecutor");
// Council and Director already imported above
console.log("[MCPServer] ✓ Council");
var CommandRegistry_js_1 = require("./commands/CommandRegistry.js");
var GitCommands_js_1 = require("./commands/lib/GitCommands.js");
var SystemCommands_js_1 = require("./commands/lib/SystemCommands.js");
var ContextCommands_js_1 = require("./commands/lib/ContextCommands.js");
var WorkflowCommands_js_1 = require("./commands/lib/WorkflowCommands.js");
console.log("[MCPServer] ✓ Commands");
var ContextManager_js_1 = require("./context/ContextManager.js");
var SymbolPinService_js_1 = require("./services/SymbolPinService.js");
var AutoDevService_js_1 = require("./services/AutoDevService.js");
var KnowledgeService_js_1 = require("./services/KnowledgeService.js");
var EventBus_js_1 = require("./services/EventBus.js");
var DeepResearchService_js_1 = require("./services/DeepResearchService.js");
var McpConfigService_js_1 = require("./services/McpConfigService.js");
var PermissionManager_js_1 = require("./security/PermissionManager.js");
var tools_2 = require("@hypercode/tools");
var search_1 = require("@hypercode/search");
var CouncilService_js_1 = require("./services/CouncilService.js");
var BrowserService_js_1 = require("./services/BrowserService.js");
console.log("[MCPServer] ✓ PermissionManager");
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path_1.default.dirname(__filename);
var ClaudeAdapter_js_1 = require("./orchestrator/adapters/ClaudeAdapter.js");
var GeminiAdapter_js_1 = require("./orchestrator/adapters/GeminiAdapter.js");
var MetaMCPController_js_1 = require("./services/MetaMCPController.js");
var metamcp_proxy_service_js_1 = require("./services/metamcp-proxy.service.js");
console.log("[MCPServer] All imports complete!");
var MCPServer = /** @class */ (function () {
    function MCPServer(options) {
        if (options === void 0) { options = {}; }
        var _this = this;
        this.wsServer = null; // WebSocket Server
        // public vectorStore: any; // DEPRECATED
        // private indexer: any; // DEPRECATED
        this.memoryInitialized = false;
        this.pendingRequests = new Map();
        this.wssInstance = null; // WebSocket.Server
        this.lastUserActivityTime = Date.now(); // Start with grace period
        this.activeAgents = new Map();
        this.directorConfig = {
            taskCooldownMs: 10000,
            heartbeatIntervalMs: 30000,
            periodicSummaryMs: 120000,
            pasteToSubmitDelayMs: 1000,
            acceptDetectionMode: 'polling', // Polling is robust!
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
        this.router = new Router_js_1.Router();
        this.modelSelector = new ai_1.ModelSelector();
        this.llmService = new ai_1.LLMService(this.modelSelector);
        // SkillRegistry initialized later with correct paths
        this.sessionManager = new SessionManager_js_1.SessionManager(process.cwd()); // Phase 57: State Persistence
        this.projectTracker = new ProjectTracker_js_1.ProjectTracker(process.cwd()); // Phase 59: Autonomous Loop
        this.missionService = new MissionService_js_1.MissionService(process.cwd()); // Phase 80: Swarm Persistence
        this.director = new agents_1.Director(this);
        this.council = new agents_2.Council(this.modelSelector);
        this.permissionManager = new PermissionManager_js_1.PermissionManager('high'); // Default to HIGH AUTONOMY as requested
        this.auditService = new AuditService_js_1.AuditService(process.cwd());
        this.shellService = new ShellService_js_1.ShellService();
        this.gitService = new GitService_js_1.GitService(process.cwd()); // Phase 30
        this.gitWorktreeManager = new GitWorktreeManager_js_1.GitWorktreeManager(process.cwd());
        this.metricsService = new MetricsService_js_1.MetricsService(); // Phase 31
        this.metricsService.startMonitoring();
        this.policyService = new PolicyService_js_1.PolicyService(process.cwd()); // Phase 32
        this.chainExecutor = new tools_1.ChainExecutor(this);
        this.inputTools = options.inputTools || new tools_1.InputTools();
        this.systemStatusTool = options.systemStatusTool || new tools_1.SystemStatusTool();
        this.processRegistry = options.processRegistry || new tools_1.ProcessRegistry();
        this.terminalService = new tools_1.TerminalService(this.processRegistry);
        this.mcpmInstaller = new McpmInstaller_js_1.McpmInstaller(path_1.default.join(process.cwd(), '.hypercode', 'skills'));
        this.spawnerService = SpawnerService_js_1.SpawnerService.getInstance();
        this.configManager = new ConfigManager_js_1.ConfigManager();
        this.mcpConfigService = new McpConfigService_js_1.McpConfigService();
        // Fire and forget config sync
        this.mcpConfigService.syncWithDatabase().catch(function (err) { return console.error("[MCPServer] Config Sync Failed:", err); });
        this.autoTestService = new AutoTestService_js_1.AutoTestService(process.cwd());
        this.sandboxService = new SandboxService_js_1.SandboxService();
        this.healerService = new HealerService_js_1.HealerService(this.llmService, this);
        this.promptRegistry = new PromptRegistry_js_1.PromptRegistry();
        this.skillRegistry = new SkillRegistry_js_1.SkillRegistry([
            path_1.default.join(process.cwd(), 'packages', 'core', 'src', 'skills'),
            path_1.default.join(process.cwd(), '.hypercode', 'skills')
        ]);
        // SearchService is needed for DeepResearchService types
        var searchService = new search_1.SearchService();
        this.memoryManager = new MemoryManager_js_1.MemoryManager(process.cwd());
        this.deepResearchService = new DeepResearchService_js_1.DeepResearchService(this, this.llmService, searchService, this.memoryManager); // Initialize FIRST
        this.skillAssimilationService = new SkillAssimilationService_js_1.SkillAssimilationService(this.skillRegistry, this.llmService, this.deepResearchService);
        this.darwinService = new DarwinService_js_1.DarwinService(this.llmService, this);
        this.supervisor = new agents_3.Supervisor(this);
        this.lspService = new LSPService_js_1.LSPService(process.cwd());
        this.mcpAggregator = new MCPAggregator_js_1.MCPAggregator();
        this.submoduleManager = new SubmoduleManager_js_1.SubmoduleManager(process.cwd());
        this.submoduleService = new SubmoduleService_js_1.SubmoduleService(process.cwd(), this.mcpAggregator);
        this.eventBus = new EventBus_js_1.EventBus();
        // Initialize Sensors
        this.fileSensor = new FileSensor_js_1.FileSensor(this.eventBus, process.cwd());
        this.terminalSensor = new TerminalSensor_js_1.TerminalSensor(this.eventBus);
        // Start Sensors (Non-blocking)
        this.fileSensor.start();
        this.terminalSensor.start();
        // Initialize Reactors
        this.autoTestReactor = new AutoTestReactor_js_1.AutoTestReactor(this.eventBus, this.autoTestService);
        this.autoTestReactor.start();
        this.healerReactor = new HealerReactor_js_1.HealerReactor(this.eventBus, this.healerService);
        this.healerReactor.start();
        // Phase 51: Core Infrastructure Services
        this.lspService = new LSPService_js_1.LSPService(process.cwd());
        this.planService = new PlanService_js_1.PlanService({ rootPath: process.cwd() });
        this.codeModeService = new CodeModeService_js_1.CodeModeService({ timeout: 30000, allowAsync: true });
        this.workflowEngine = new WorkflowEngine_js_1.WorkflowEngine({ persistDir: path_1.default.join(process.cwd(), '.hypercode', 'workflows') });
        this.lspTools = new LSPTools_js_1.LSPTools(process.cwd());
        // MemoryManager initialized early
        this.agentMemoryService = new AgentMemoryService_js_1.AgentMemoryService({ persistDir: path_1.default.join(process.cwd(), '.hypercode', 'agent_memory') }, this.memoryManager);
        // Phase 5 & 6 Init
        this.browserTool = new tools_2.BrowserTool();
        this.searchService = new search_1.SearchService();
        // Initialize Core Agents
        this.geminiAgent = new GeminiAgent_js_1.GeminiAgent(this.llmService, this.promptRegistry);
        this.claudeAgent = new ClaudeAgent_js_1.ClaudeAgent(this.llmService, this.promptRegistry);
        this.metaArchitectAgent = new MetaArchitectAgent_js_1.MetaArchitectAgent(this.llmService, this.promptRegistry);
        // Initialize Specialized Agents
        this.coderAgent = new CoderAgent_js_1.CoderAgent(this.llmService);
        this.researcherAgent = new ResearcherAgent_js_1.ResearcherAgent(this.deepResearchService);
        this.mcpWorkerAgent = new McpWorkerAgent_js_1.McpWorkerAgent(this.llmService, this);
        // Initialize Council with Agents
        this.council = new agents_2.Council(this.modelSelector);
        this.council.setServer(this);
        this.council.registerAgent(agents_2.CouncilRole.CRITIC, this.geminiAgent);
        this.council.registerAgent(agents_2.CouncilRole.ARCHITECT, this.claudeAgent);
        this.council.registerAgent(agents_2.CouncilRole.META_ARCHITECT, this.metaArchitectAgent);
        // Load persistent config
        var savedConfig = this.configManager.loadConfig();
        if (savedConfig) {
            console.log("[MCPServer] Loaded persistent config.");
            this.directorConfig = __assign(__assign({}, this.directorConfig), savedConfig);
            // Ensure nested merge for council
            if (savedConfig.council) {
                this.directorConfig.council = __assign(__assign({}, this.directorConfig.council), savedConfig.council);
            }
        }
        this.suggestionService = new SuggestionService_js_1.SuggestionService(undefined, this.director);
        // Context Manager
        this.contextManager = new ContextManager_js_1.ContextManager();
        this.symbolPinService = new SymbolPinService_js_1.SymbolPinService();
        this.autoDevService = new AutoDevService_js_1.AutoDevService(process.cwd(), this.director);
        this.shellService = new ShellService_js_1.ShellService(); // Added this line
        this.commandRegistry = new CommandRegistry_js_1.CommandRegistry(); // Corrected typo from instruction
        this.commandRegistry.register(new GitCommands_js_1.GitCommand());
        this.commandRegistry.register(new SystemCommands_js_1.HelpCommand(this.commandRegistry));
        this.commandRegistry.register(new SystemCommands_js_1.VersionCommand());
        this.commandRegistry.register(new SystemCommands_js_1.DirectorCommand(function () { return _this.director; }));
        this.commandRegistry.register(new ContextCommands_js_1.ContextCommand(this.contextManager));
        this.commandRegistry.register(new WorkflowCommands_js_1.UndoCommand());
        this.commandRegistry.register(new WorkflowCommands_js_1.DiffCommand());
        this.commandRegistry.register(new WorkflowCommands_js_1.StashCommand());
        this.commandRegistry.register(new WorkflowCommands_js_1.FixCommand(function () { return _this.autoDevService; }));
        // Memory System - Already initialized above
        this.researchService = new ResearchService_js_1.ResearchService(this, this.memoryManager); // Initialized AFTER memoryManager
        this.knowledgeService = new KnowledgeService_js_1.KnowledgeService(this.memoryManager); // Added
        // DeepResearchService initialized earlier (line 276)
        this.councilService = new CouncilService_js_1.CouncilService();
        this.browserService = new BrowserService_js_1.BrowserService();
        this.squadService = new SquadService_js_1.SquadService(this);
        this.gitWorktreeManager = new GitWorktreeManager_js_1.GitWorktreeManager(process.cwd());
        // Phase 60: Mesh Service
        if (!options.skipMesh) {
            this.meshService = new MeshService_js_1.MeshService();
            // Phase 93: P2P Artifact Federation (Serving Artifacts)
            this.meshService.on('message', function (msg) { return __awaiter(_this, void 0, void 0, function () {
                var req, content, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(msg.type === MeshService_js_1.SwarmMessageType.ARTIFACT_READ_REQUEST)) return [3 /*break*/, 4];
                            req = msg.payload;
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, fs_1.default.promises.readFile(req.path, "utf-8")];
                        case 2:
                            content = _a.sent();
                            // If we have it, send response directly to requester
                            this.meshService.sendResponse(msg, MeshService_js_1.SwarmMessageType.ARTIFACT_READ_RESPONSE, {
                                path: req.path,
                                content: content
                            });
                            console.log("[Mesh Artifact] Served ".concat(req.path, " to node ").concat(msg.sender));
                            return [3 /*break*/, 4];
                        case 3:
                            err_1 = _a.sent();
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            // Phase 94: Sub-Agent Task Routing
            // Attach specialized sub-agents to the mesh bus so they can bid on classified tasks
            this.meshCoderAgent = new MeshCoderAgent_js_1.MeshCoderAgent(this);
            this.meshResearcherAgent = new MeshResearcherAgent_js_1.MeshResearcherAgent(this);
        }
        // Phase 65: Marketplace (Depends on Mesh)
        this.marketplaceService = new MarketplaceService_js_1.MarketplaceService(path_1.default.join(process.cwd(), '.hypercode', 'skills'), undefined // this.meshService
        );
        global.mcpServerInstance = this;
        // Standard Server (Stdio)
        var primaryServer = this.createServerInstance();
        this.server = primaryServer.server;
        this.serverSetupPromise = primaryServer.ready;
        // Phase 55: MetaMCP Controller Initialization
        // This attaches the proxy middleware to the server instance
        // Native tools are passed to be wrapped/exposed
        // Note: We use a placeholder handler because native tools are handled by the SDK's own addTool logic.
        // MetaMCP might want to wrap them. attachTo expects a handler.
        // Fitting into the existing pattern.
        // Define native tools array (this needs to be populated from the registered tools)
        // MCPServer registers tools via `this.server.tool(...)` later in `registerTools`.
        // We might need to hook into that or pass a reference.
        // For the purpose of this refactor, we just ensure the controller is up.
        Promise.resolve().then(function () { return require('./services/MetaMCPController.js'); }).then(function (_a) {
            var MetaMCPController = _a.MetaMCPController;
            MetaMCPController.getInstance().initialize(_this.server, [], // TODO: Pass native tools if needed
            function (name, args) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, { content: [] }];
            }); }); } // Placeholder handler
            ).catch(function (e) { return console.error("MetaMCP Init Failed:", e); });
        });
        if (!options.skipWebsocket) {
            var PORT_1 = 3001;
            console.log("[MCPServer] Starting WebSocket/HTTP Server on port ".concat(PORT_1, "..."));
            // Create an explicit HTTP server so we can handle SSE routes alongside WebSockets
            var httpServer = http_1.default.createServer(function (req, res) {
                // SSE Endpoint for Mesh Visualization
                if (req.method === 'GET' && req.url === '/api/mesh/stream') {
                    res.writeHead(200, {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.write('data: {"type":"CONNECTED"}\n\n');
                    // Dynamically import the emitter to avoid circular deps during boot
                    Promise.resolve().then(function () { return require('./mesh/MeshService.js'); }).then(function (module) {
                        // Normally this is not exported, we need a way to hook into globalMeshBus
                        // Wait, we need to export globalMeshBus or use the EventBus. 
                        // Actually, I should use this.eventBus and forward mesh messages there inside MeshService.ts.
                        // For now, let's just create a generic eventBus hook "mesh_stream"
                    });
                    var safeSend_1 = function (data) {
                        try {
                            res.write("data: ".concat(JSON.stringify(data), "\n\n"));
                        }
                        catch (e) {
                            // client disconnected
                        }
                    };
                    var handleMeshMessage_1 = function (msg) { return safeSend_1(msg); };
                    _this.eventBus.on('mesh:traffic', handleMeshMessage_1);
                    req.on('close', function () {
                        _this.eventBus.off('mesh:traffic', handleMeshMessage_1);
                    });
                    return;
                }
                // 404 for any other HTTP hit
                res.writeHead(404);
                res.end();
            });
            this.wssInstance = new ws_1.WebSocketServer({ server: httpServer });
            this.wsServerSetupPromise = Promise.resolve();
            var transport = new WebSocketServerTransport_js_1.WebSocketServerTransport(this.wssInstance);
            this.wsServer.connect(transport);
            httpServer.listen(PORT_1, function () {
                console.log("[MCPServer] \uD83D\uDD0C WebSocket & SSE Bridge active on port ".concat(PORT_1));
            });
        }
        else {
            this.wsServer = null;
            this.wssInstance = null;
            this.wsServerSetupPromise = null;
        }
    }
    Object.defineProperty(MCPServer.prototype, "activeAgentsMap", {
        get: function () {
            return this.activeAgents;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MCPServer.prototype, "isMemoryInitialized", {
        get: function () {
            return this.memoryInitialized;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Reason: tool definitions originate from mixed internal/external registries with loose typing.
     * What: runtime guard for tool objects that expose an executable `handler(args)` function.
     * Why: enables safe invocation without broad casts across tool arrays.
     */
    MCPServer.prototype.isToolWithHandler = function (value) {
        if (!value || typeof value !== 'object') {
            return false;
        }
        var handler = Reflect.get(value, 'handler');
        var name = Reflect.get(value, 'name');
        return typeof name === 'string' && typeof handler === 'function';
    };
    /**
     * Reason: multiple execution branches return heterogeneous payloads, but suggestion analysis needs text content.
     * What: safely extracts first text block from MCP-style `{ content: [{ text }] }` envelopes.
     * Why: preserves engagement trigger behavior while removing broad result casting.
     */
    MCPServer.prototype.getFirstTextContent = function (result) {
        var _a;
        if (!result || typeof result !== 'object') {
            return null;
        }
        var envelope = result;
        var first = (_a = envelope.content) === null || _a === void 0 ? void 0 : _a[0];
        return typeof (first === null || first === void 0 ? void 0 : first.text) === 'string' ? first.text : null;
    };
    /**
     * Lazy initialization of memory system (VectorStore + Indexer)
     * Only loaded when memory tools are first used to speed up startup
     */
    MCPServer.prototype.initializeMemorySystem = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.memoryInitialized)
                    return [2 /*return*/];
                console.log("[MCPServer] Lazy-loading memory system (MemoryManager)...");
                // this.memoryManager is instantiated in constructor but lazily initialized internally
                // Actually, we should instantiate it here or in constructor?
                // Let's rely on internal lazy loading of MemoryManager, but trigger it here to be safe
                // Or just let tool calls trigger it.
                // For parity with old logic, let's just make sure it's ready.
                // await this.memoryManager.initialize(); // private method, called via public methods
                // Actually, let's just mark initialized true
                this.memoryInitialized = true;
                return [2 /*return*/];
            });
        });
    };
    MCPServer.prototype.createServerInstance = function () {
        var s = new index_js_1.Server({ name: "hypercode-core", version: "0.1.0" }, { capabilities: { tools: {} } });
        var ready = this.setupHandlers(s);
        return { server: s, ready: ready };
    };
    MCPServer.prototype.broadcastRequestAndAwait = function (messageType, payload) {
        var _this = this;
        if (payload === void 0) { payload = {}; }
        if (!this.wssInstance || this.wssInstance.clients.size === 0) {
            return Promise.resolve({ content: [{ type: "text", text: "Error: No Native Extension connected." }] });
        }
        return new Promise(function (resolve) {
            var requestId = "req_".concat(Date.now(), "_").concat(Math.random());
            var timeout = setTimeout(function () {
                _this.pendingRequests.delete(requestId);
                resolve({ content: [{ type: "text", text: "Error: Extension timed out." }] });
            }, 3000);
            _this.pendingRequests.set(requestId, function (data) {
                clearTimeout(timeout);
                // Handle text vs object response
                var text = typeof data.content === 'string' ? data.content : JSON.stringify(data.content);
                resolve({ content: [{ type: "text", text: text || "No content." }] });
            });
            _this.wssInstance.clients.forEach(function (client) {
                if (client.readyState === 1) {
                    client.send(JSON.stringify(__assign({ type: messageType, requestId: requestId }, payload)));
                }
            });
        });
    };
    MCPServer.prototype.updateDirectorConfig = function (newConfig) {
        this.directorConfig = newConfig;
        this.configManager.saveConfig(newConfig);
    };
    MCPServer.prototype.captureScreenshotFromBrowser = function () {
        var _this = this;
        if (!this.wssInstance || this.wssInstance.clients.size === 0) {
            throw new Error("No Browser Extension connected.");
        }
        return new Promise(function (resolve, reject) {
            var requestId = "req_".concat(Date.now(), "_").concat(Math.random());
            var timeout = setTimeout(function () {
                _this.pendingRequests.delete(requestId);
                reject(new Error("Browser screenshot timed out."));
            }, 5000);
            _this.pendingRequests.set(requestId, function (data) {
                clearTimeout(timeout);
                // data is the screenshot data URL
                resolve(data);
            });
            _this.wssInstance.clients.forEach(function (client) {
                if (client.readyState === 1) {
                    client.send(JSON.stringify({
                        jsonrpc: "2.0",
                        method: 'browser_screenshot',
                        id: requestId
                    }));
                }
            });
        });
    };
    MCPServer.prototype.executeTool = function (name, args) {
        return __awaiter(this, void 0, void 0, function () {
            var callId, startTime, policyDecision, permission, debate, result_1, level, text_1, submit_1, status_1, e_1, target_1, x_1, y_1, url_2, dataUrl, url, res, pageId, selector, pageId, selector, text, pageId, content, status_2, keys, targetWindow, forceFocus, toolStartTime, status_3, toolDuration, e_2, command_1, cmdArgs_1, branch, goal, res, members, branch, res, worktreePath, branch, cwd, cmd, out, e_3, worktreePath, force, cwd, cmd, out, e_4, cwd, cmd, out, e_5, query, symbols, file, line, char, def, file, line, char, refs, code, res, mode, file, content, diff, indexRoot, count, query, limit, res, topic, depth, breadth, res, error, context, diagnosis, error, context, success, prompt_1, goal, mutation, mutationId, task, experiment, goal, maxSteps, resultStr, task, query, root, e_6, id, agents, success, agent, nativeReader, agentName, prompt_2, agent_1, responsePromise, output, data, e_7, prompt_3, data, base64, mimeType, response, e_8, _a, _b, msg, srvName, repoUrl, cloneMsg, branch, goal, msg, squads, branch, msg, MergeService, merger, branch, res, _c, _d, branch, path_2, finalPath, pathOrBranch, force, filePath, lang, code, _e, _f, dir, count, query, matches, text_2, status_4, assimilationRequest, response, _g, _h, topic, depth, report, output, output, output, output, output, output, diff, pending_1, summary, success, applied, status_5, checkpoint, success, type, namespace, memory, memories, formatted, memories, formatted, stats, formatted, workflowId, input, runResult, e_9, executions, formatted, runId, execution, runId, approved, e_10, code, execResult, e_11, enabled, registry, toolCount, reduction, registry, tools, formatted, terminalTools, standardTool, timeoutMs_1, reqPath_1, federatedContent, e_12, proxyErr_1, e_13, aggErr_1, e_14, contentText, filePath, e_15;
            var _j, _k, _l, _m, _o, _p, _q, _r;
            var _this = this;
            var _s, _t, _u, _v, _w, _x, _y, _z, _0, _1;
            return __generator(this, function (_2) {
                switch (_2.label) {
                    case 0:
                        console.log("[DEBUG] executeTool called with: '".concat(name, "' (len: ").concat(name.length, ")"));
                        callId = Math.random().toString(36).substring(7);
                        startTime = Date.now();
                        // Broadcast Start
                        if (this.wssInstance) {
                            this.wssInstance.clients.forEach(function (c) {
                                if (c.readyState === 1)
                                    c.send(JSON.stringify({
                                        type: 'TOOL_CALL_START',
                                        id: callId,
                                        tool: name,
                                        args: args
                                    }));
                            });
                        }
                        // Emit Pulse Event
                        this.eventBus.emitEvent('tool:call', 'MCPServer', { tool: name, args: args, callId: callId });
                        // Audit Start
                        try {
                            this.auditService.log('TOOL_START', { tool: name, args: args }, 'INFO');
                        }
                        catch (e) {
                            console.error("Audit Fail", e);
                        }
                        _2.label = 1;
                    case 1:
                        _2.trys.push([1, 279, , 280]);
                        policyDecision = this.policyService.check(name, args);
                        if (!policyDecision.allowed) {
                            this.auditService.log('TOOL_DENIED', { tool: name, args: args, reason: policyDecision.reason || 'Policy Deny' }, 'WARN');
                            throw new Error("Policy VIOLATION: Execution of tool '".concat(name, "' is DENIED by active policy. Reason: ").concat(policyDecision.reason));
                        }
                        permission = this.permissionManager.checkPermission(name, args);
                        if (permission === 'DENIED') {
                            this.auditService.log('TOOL_DENIED', { tool: name, args: args, reason: 'Policy/Permission' }, 'WARN');
                            throw new Error("Permission Denied for tool '".concat(name, "' (Risk Level High). Autonomy Level is '").concat(this.permissionManager.autonomyLevel, "'."));
                        }
                        if (!(permission === 'NEEDS_CONSULTATION')) return [3 /*break*/, 3];
                        console.log("[HyperCode Core] Consulting Council for: ".concat(name));
                        this.auditService.log('TOOL_CONSULTATION', { tool: name, args: args }, 'WARN');
                        return [4 /*yield*/, this.council.runConsensusSession("Execute tool '".concat(name, "' with args: ").concat(JSON.stringify(args)))];
                    case 2:
                        debate = _2.sent();
                        if (!debate.approved) {
                            throw new Error("Council Denied Execution: ".concat(debate.summary));
                        }
                        console.log("[HyperCode Core] Council Approved: ".concat(debate.summary));
                        _2.label = 3;
                    case 3:
                        if (!(name === "router_status")) return [3 /*break*/, 4];
                        result_1 = {
                            content: [{ type: "text", text: "HyperCode Router is active." }],
                        };
                        return [3 /*break*/, 40];
                    case 4:
                        if (!(name === "set_autonomy")) return [3 /*break*/, 5];
                        level = args === null || args === void 0 ? void 0 : args.level;
                        this.permissionManager.setAutonomyLevel(level);
                        result_1 = {
                            content: [{ type: "text", text: "Autonomy Level set to: ".concat(level) }]
                        };
                        return [3 /*break*/, 40];
                    case 5:
                        if (!(name === "chat_reply")) return [3 /*break*/, 6];
                        text_1 = args === null || args === void 0 ? void 0 : args.text;
                        submit_1 = (_s = args === null || args === void 0 ? void 0 : args.submit) !== null && _s !== void 0 ? _s : false;
                        console.log("[HyperCode Core] Chat Reply Requested: ".concat(text_1, " (submit: ").concat(submit_1, ")"));
                        if (this.wssInstance) {
                            this.wssInstance.clients.forEach(function (client) {
                                if (client.readyState === 1) { // OPEN
                                    client.send(JSON.stringify({
                                        type: 'PASTE_INTO_CHAT',
                                        text: text_1,
                                        submit: submit_1 // Include submit flag for atomic paste+submit
                                    }));
                                }
                            });
                            result_1 = {
                                content: [{ type: "text", text: "Sent to browser/IDE: \"".concat(text_1, "\" (submit: ").concat(submit_1, ")") }]
                            };
                        }
                        else {
                            result_1 = {
                                content: [{ type: "text", text: "Error: No WebSocket server active to forward reply." }]
                            };
                        }
                        return [3 /*break*/, 40];
                    case 6:
                        if (!(name === "chat_submit")) return [3 /*break*/, 12];
                        if (!(this.wssInstance && this.wssInstance.clients.size > 0)) return [3 /*break*/, 7];
                        this.wssInstance.clients.forEach(function (client) {
                            if (client.readyState === 1)
                                client.send(JSON.stringify({ type: 'SUBMIT_CHAT' }));
                        });
                        result_1 = { content: [{ type: "text", text: "Sent SUBMIT_CHAT signal." }] };
                        return [3 /*break*/, 11];
                    case 7:
                        // FALLBACK: Use Native Input for Alt-Enter
                        console.error("[MCPServer] No Extension bridge. Falling back to Native Input for Alt-Enter.");
                        _2.label = 8;
                    case 8:
                        _2.trys.push([8, 10, , 11]);
                        return [4 /*yield*/, this.inputTools.sendKeys('alt+enter')];
                    case 9:
                        status_1 = _2.sent();
                        result_1 = { content: [{ type: "text", text: "Fallback: ".concat(status_1) }] };
                        return [3 /*break*/, 11];
                    case 10:
                        e_1 = _2.sent();
                        result_1 = { content: [{ type: "text", text: "Error: No extension AND native input failed: ".concat(e_1.message) }] };
                        return [3 /*break*/, 11];
                    case 11: return [3 /*break*/, 40];
                    case 12:
                        if (!(name === "click_element")) return [3 /*break*/, 13];
                        target_1 = args === null || args === void 0 ? void 0 : args.target;
                        if (this.wssInstance) {
                            this.wssInstance.clients.forEach(function (client) {
                                if (client.readyState === 1)
                                    client.send(JSON.stringify({
                                        method: 'click_element',
                                        params: { target: target_1 }
                                    }));
                            });
                            result_1 = { content: [{ type: "text", text: "Sent CLICK_ELEMENT signal for \"".concat(target_1, "\".") }] };
                        }
                        else {
                            result_1 = { content: [{ type: "text", text: "Error: No WebSocket server." }] };
                        }
                        return [3 /*break*/, 40];
                    case 13:
                        if (!(name === "click_at")) return [3 /*break*/, 14];
                        x_1 = args === null || args === void 0 ? void 0 : args.x;
                        y_1 = args === null || args === void 0 ? void 0 : args.y;
                        if (this.wssInstance) {
                            this.wssInstance.clients.forEach(function (client) {
                                if (client.readyState === 1)
                                    client.send(JSON.stringify({
                                        method: 'click_at',
                                        params: { x: x_1, y: y_1 }
                                    }));
                            });
                            result_1 = { content: [{ type: "text", text: "Sent CLICK_AT signal for (".concat(x_1, ",").concat(y_1, ").") }] };
                        }
                        else {
                            result_1 = { content: [{ type: "text", text: "Error: No WebSocket server." }] };
                        }
                        return [3 /*break*/, 40];
                    case 14:
                        if (!(name === "navigate")) return [3 /*break*/, 18];
                        url_2 = args === null || args === void 0 ? void 0 : args.url;
                        if (!this.wssInstance) return [3 /*break*/, 16];
                        this.wssInstance.clients.forEach(function (client) {
                            if (client.readyState === 1)
                                client.send(JSON.stringify({
                                    method: 'browser_navigate',
                                    params: { url: url_2 }
                                }));
                        });
                        // Wait for navigation
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 2000); })];
                    case 15:
                        // Wait for navigation
                        _2.sent();
                        result_1 = { content: [{ type: "text", text: "Navigated to ".concat(url_2) }] };
                        return [3 /*break*/, 17];
                    case 16:
                        result_1 = { content: [{ type: "text", text: "Error: No WebSocket server." }] };
                        _2.label = 17;
                    case 17: return [3 /*break*/, 40];
                    case 18:
                        if (!(name === "browser_screenshot")) return [3 /*break*/, 22];
                        if (!(this.wssInstance && this.wssInstance.clients.size > 0)) return [3 /*break*/, 20];
                        return [4 /*yield*/, this.captureScreenshotFromBrowser()];
                    case 19:
                        dataUrl = _2.sent();
                        result_1 = {
                            content: [
                                { type: "text", text: "Screenshot captured (Client)." },
                                { type: "image", data: dataUrl.split(',')[1], mimeType: "image/png" }
                            ]
                        };
                        return [3 /*break*/, 21];
                    case 20:
                        // Fallback to Puppeteer Navigator
                        // Note: Default screenshot of active page? Or require pageId?
                        // For now, let's assume we want to screenshot the active Puppeteer page if available.
                        // But BrowserService manages multiple pages.
                        // Let's defer to specific `navigator_screenshot` or update this logic later.
                        result_1 = { content: [{ type: "text", text: "Error: No Client Extension. For backend browsing, use 'navigator_navigate'." }] };
                        _2.label = 21;
                    case 21: return [3 /*break*/, 40];
                    case 22:
                        if (!(name === "browser_navigate")) return [3 /*break*/, 24];
                        url = args === null || args === void 0 ? void 0 : args.url;
                        if (!url)
                            throw new Error("Missing 'url'");
                        return [4 /*yield*/, this.browserService.navigate(url)];
                    case 23:
                        res = _2.sent();
                        result_1 = {
                            content: [{ type: "text", text: "Navigated to \"".concat(res.title, "\" (ID: ").concat(res.id, ")\n\nContent Preview:\n").concat(res.content) }]
                        };
                        return [3 /*break*/, 40];
                    case 24:
                        if (!(name === "browser_click")) return [3 /*break*/, 26];
                        pageId = args === null || args === void 0 ? void 0 : args.pageId;
                        selector = args === null || args === void 0 ? void 0 : args.selector;
                        if (!pageId || !selector)
                            throw new Error("Missing params: pageId, selector");
                        return [4 /*yield*/, this.browserService.click(pageId, selector)];
                    case 25:
                        _2.sent();
                        result_1 = { content: [{ type: "text", text: "Clicked '".concat(selector, "' on page ").concat(pageId) }] };
                        return [3 /*break*/, 40];
                    case 26:
                        if (!(name === "browser_type")) return [3 /*break*/, 28];
                        pageId = args === null || args === void 0 ? void 0 : args.pageId;
                        selector = args === null || args === void 0 ? void 0 : args.selector;
                        text = args === null || args === void 0 ? void 0 : args.text;
                        if (!pageId || !selector || !text)
                            throw new Error("Missing params");
                        return [4 /*yield*/, this.browserService.type(pageId, selector, text)];
                    case 27:
                        _2.sent();
                        result_1 = { content: [{ type: "text", text: "Typed into '".concat(selector, "' on page ").concat(pageId) }] };
                        return [3 /*break*/, 40];
                    case 28:
                        if (!(name === "browser_extract")) return [3 /*break*/, 30];
                        pageId = args === null || args === void 0 ? void 0 : args.pageId;
                        if (!pageId)
                            throw new Error("Missing 'pageId'");
                        return [4 /*yield*/, this.browserService.extract(pageId)];
                    case 29:
                        content = _2.sent();
                        result_1 = { content: [{ type: "text", text: content.substring(0, 5000) }] }; // Limit response size
                        return [3 /*break*/, 40];
                    case 30:
                        if (!(name === "get_knowledge_graph")) return [3 /*break*/, 32];
                        return [4 /*yield*/, this.knowledgeService.getGraph(args === null || args === void 0 ? void 0 : args.query, args === null || args === void 0 ? void 0 : args.depth)];
                    case 31:
                        result_1 = _2.sent();
                        return [3 /*break*/, 40];
                    case 32:
                        if (!(name === "system_diagnostics")) return [3 /*break*/, 34];
                        return [4 /*yield*/, DiagnosticTools_js_1.DiagnosticTools.checkHealth()];
                    case 33:
                        status_2 = _2.sent();
                        result_1 = { content: [{ type: "text", text: DiagnosticTools_js_1.DiagnosticTools.getDiagnosticsMarkup(status_2) }] };
                        return [3 /*break*/, 40];
                    case 34:
                        if (!(name === "native_input")) return [3 /*break*/, 39];
                        keys = args === null || args === void 0 ? void 0 : args.keys;
                        targetWindow = args === null || args === void 0 ? void 0 : args.targetWindow;
                        forceFocus = (_t = args === null || args === void 0 ? void 0 : args.forceFocus) !== null && _t !== void 0 ? _t : false;
                        _2.label = 35;
                    case 35:
                        _2.trys.push([35, 37, , 38]);
                        toolStartTime = Date.now();
                        return [4 /*yield*/, this.inputTools.sendKeys(keys, forceFocus, targetWindow)];
                    case 36:
                        status_3 = _2.sent();
                        toolDuration = Date.now() - toolStartTime;
                        this.metricsService.track('tool_call', 1, { tool: name, success: 'true' });
                        this.metricsService.trackDuration('tool_execution', toolDuration, { tool: name });
                        result_1 = { content: [{ type: "text", text: status_3 }] };
                        return [3 /*break*/, 38];
                    case 37:
                        e_2 = _2.sent();
                        this.metricsService.track('tool_call', 1, { tool: name, success: 'false' });
                        this.metricsService.track('tool_error', 1, { tool: name });
                        result_1 = { content: [{ type: "text", text: "Error executing native_input: ".concat(e_2.message) }] };
                        return [3 /*break*/, 38];
                    case 38: return [3 /*break*/, 40];
                    case 39:
                        if (name === "vscode_execute_command") {
                            command_1 = args === null || args === void 0 ? void 0 : args.command;
                            cmdArgs_1 = Array.isArray(args === null || args === void 0 ? void 0 : args.args) ? args.args : [];
                            if (this.wssInstance) {
                                this.wssInstance.clients.forEach(function (client) {
                                    if (client.readyState === 1) {
                                        client.send(JSON.stringify({
                                            type: 'VSCODE_COMMAND',
                                            command: command_1,
                                            args: cmdArgs_1
                                        }));
                                    }
                                });
                                result_1 = { content: [{ type: "text", text: "Sent VSCODE_COMMAND: ".concat(command_1) }] };
                            }
                            else {
                                result_1 = { content: [{ type: "text", text: "Error: No WebSocket server (Extension bridge) active." }] };
                            }
                        }
                        else if (name === "get_chrome_devtools_mcp_url") {
                            // Hardcoded fallback response to stabilize specific routing issue
                            result_1 = { content: [{ type: "text", text: "ws://localhost:9222" }] };
                        }
                        _2.label = 40;
                    case 40:
                        // Log flow
                        console.log("[DEBUG] Flow check: name='".concat(name, "'"));
                        if (!(name === "start_squad")) return [3 /*break*/, 42];
                        console.log("[DEBUG] ENTERED start_squad BLOCK");
                        branch = args === null || args === void 0 ? void 0 : args.branch;
                        goal = args === null || args === void 0 ? void 0 : args.goal;
                        if (!branch || !goal)
                            throw new Error("Missing params: branch, goal");
                        return [4 /*yield*/, this.squadService.spawnMember(branch, goal)];
                    case 41:
                        res = _2.sent();
                        result_1 = { content: [{ type: "text", text: res }] };
                        return [3 /*break*/, 186];
                    case 42:
                        if (!(name === "list_squads")) return [3 /*break*/, 43];
                        members = this.squadService.listMembers();
                        result_1 = { content: [{ type: "text", text: JSON.stringify(members, null, 2) }] };
                        return [3 /*break*/, 186];
                    case 43:
                        if (!(name === "kill_squad")) return [3 /*break*/, 45];
                        branch = args === null || args === void 0 ? void 0 : args.branch;
                        if (!branch)
                            throw new Error("Missing param: branch");
                        return [4 /*yield*/, this.squadService.killMember(branch)];
                    case 44:
                        res = _2.sent();
                        result_1 = { content: [{ type: "text", text: res }] };
                        return [3 /*break*/, 186];
                    case 45:
                        if (!(name === "git_worktree_add")) return [3 /*break*/, 50];
                        worktreePath = args === null || args === void 0 ? void 0 : args.path;
                        branch = args === null || args === void 0 ? void 0 : args.branch;
                        cwd = (args === null || args === void 0 ? void 0 : args.cwd) || process.cwd();
                        cmd = "git worktree add -b ".concat(branch, " \"").concat(worktreePath, "\"");
                        console.log("[GitWorktree] Adding worktree: ".concat(cmd));
                        _2.label = 46;
                    case 46:
                        _2.trys.push([46, 48, , 49]);
                        return [4 /*yield*/, this.shellService.execute(cmd, cwd)];
                    case 47:
                        out = _2.sent();
                        result_1 = { content: [{ type: "text", text: out }] };
                        return [3 /*break*/, 49];
                    case 48:
                        e_3 = _2.sent();
                        throw new Error("Git worktree add failed: ".concat(e_3.message));
                    case 49: return [3 /*break*/, 186];
                    case 50:
                        if (!(name === "git_worktree_remove")) return [3 /*break*/, 55];
                        worktreePath = args === null || args === void 0 ? void 0 : args.path;
                        force = args === null || args === void 0 ? void 0 : args.force;
                        cwd = (args === null || args === void 0 ? void 0 : args.cwd) || process.cwd();
                        cmd = "git worktree remove ".concat(force ? '--force' : '', " \"").concat(worktreePath, "\"");
                        _2.label = 51;
                    case 51:
                        _2.trys.push([51, 53, , 54]);
                        return [4 /*yield*/, this.shellService.execute(cmd, cwd)];
                    case 52:
                        out = _2.sent();
                        result_1 = { content: [{ type: "text", text: out }] };
                        return [3 /*break*/, 54];
                    case 53:
                        e_4 = _2.sent();
                        // Start_squad might fail if dir doesn't exist, but remove implies cleanup.
                        // If fail, maybe manual rm -rf?
                        throw new Error("Git worktree remove failed: ".concat(e_4.message));
                    case 54: return [3 /*break*/, 186];
                    case 55:
                        if (!(name === "git_worktree_list")) return [3 /*break*/, 60];
                        cwd = (args === null || args === void 0 ? void 0 : args.cwd) || process.cwd();
                        cmd = "git worktree list";
                        _2.label = 56;
                    case 56:
                        _2.trys.push([56, 58, , 59]);
                        return [4 /*yield*/, this.shellService.execute(cmd, cwd)];
                    case 57:
                        out = _2.sent();
                        result_1 = { content: [{ type: "text", text: out }] };
                        return [3 /*break*/, 59];
                    case 58:
                        e_5 = _2.sent();
                        throw new Error("Git worktree list failed: ".concat(e_5.message));
                    case 59: return [3 /*break*/, 186];
                    case 60:
                        if (!(name === "vscode_get_status")) return [3 /*break*/, 64];
                        if (!(!this.wssInstance || this.wssInstance.clients.size === 0)) return [3 /*break*/, 61];
                        result_1 = { content: [{ type: "text", text: "Error: No Native Extension connected." }] };
                        return [3 /*break*/, 63];
                    case 61: return [4 /*yield*/, new Promise(function (resolve) {
                            var requestId = "req_".concat(Date.now(), "_").concat(Math.random());
                            var timeout = setTimeout(function () {
                                _this.pendingRequests.delete(requestId);
                                resolve({ content: [{ type: "text", text: "Error: Extension timed out." }] });
                            }, 3000);
                            _this.pendingRequests.set(requestId, function (status) {
                                clearTimeout(timeout);
                                resolve({ content: [{ type: "text", text: JSON.stringify(status, null, 2) }] });
                            });
                            _this.wssInstance.clients.forEach(function (client) {
                                if (client.readyState === 1) {
                                    client.send(JSON.stringify({ type: 'GET_STATUS', requestId: requestId }));
                                }
                            });
                        })];
                    case 62:
                        result_1 = _2.sent();
                        _2.label = 63;
                    case 63: return [3 /*break*/, 186];
                    case 64:
                        if (!(name === "lsp_symbol_search")) return [3 /*break*/, 65];
                        query = args === null || args === void 0 ? void 0 : args.query;
                        if (!query)
                            throw new Error("Missing 'query' parameter");
                        symbols = this.lspService.searchSymbols(query);
                        result_1 = { content: [{ type: "text", text: JSON.stringify(symbols.slice(0, 50), null, 2) }] };
                        return [3 /*break*/, 186];
                    case 65:
                        if (!(name === "lsp_definition")) return [3 /*break*/, 67];
                        file = args === null || args === void 0 ? void 0 : args.file;
                        line = args === null || args === void 0 ? void 0 : args.line;
                        char = args === null || args === void 0 ? void 0 : args.char;
                        if (!file || line === undefined || char === undefined)
                            throw new Error("Missing params: file, line, char");
                        return [4 /*yield*/, this.lspService.goToDefinition(file, line, char)];
                    case 66:
                        def = _2.sent();
                        result_1 = { content: [{ type: "text", text: JSON.stringify(def, null, 2) }] };
                        return [3 /*break*/, 186];
                    case 67:
                        if (!(name === "lsp_references")) return [3 /*break*/, 69];
                        file = args === null || args === void 0 ? void 0 : args.file;
                        line = args === null || args === void 0 ? void 0 : args.line;
                        char = args === null || args === void 0 ? void 0 : args.char;
                        if (!file || line === undefined || char === undefined)
                            throw new Error("Missing params: file, line, char");
                        return [4 /*yield*/, this.lspService.findReferences(file, line, char)];
                    case 68:
                        refs = _2.sent();
                        result_1 = { content: [{ type: "text", text: JSON.stringify(refs, null, 2) }] };
                        return [3 /*break*/, 186];
                    case 69:
                        if (!(name === "code_mode_execute")) return [3 /*break*/, 71];
                        code = args === null || args === void 0 ? void 0 : args.code;
                        if (!code)
                            throw new Error("Missing 'code' parameter");
                        return [4 /*yield*/, this.codeModeService.executeCode(code)];
                    case 70:
                        res = _2.sent();
                        result_1 = { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
                        return [3 /*break*/, 186];
                    case 71:
                        if (!(name === "plan_mode_switch")) return [3 /*break*/, 72];
                        mode = args === null || args === void 0 ? void 0 : args.mode;
                        if (mode === 'PLAN')
                            this.planService.enterPlanMode();
                        else if (mode === 'BUILD')
                            this.planService.enterBuildMode();
                        else
                            throw new Error("Invalid mode. Use 'PLAN' or 'BUILD'");
                        result_1 = { content: [{ type: "text", text: "Switched to ".concat(mode, " mode.") }] };
                        return [3 /*break*/, 186];
                    case 72:
                        if (!(name === "plan_mode_stage")) return [3 /*break*/, 73];
                        file = args === null || args === void 0 ? void 0 : args.file;
                        content = args === null || args === void 0 ? void 0 : args.content;
                        if (!file || !content)
                            throw new Error("Missing params: file, content");
                        diff = this.planService.proposeChange(file, content, "Staged via tool");
                        result_1 = { content: [{ type: "text", text: "Staged changes for ".concat(file, " (ID: ").concat(diff.id, ")") }] };
                        return [3 /*break*/, 186];
                    case 73:
                        if (!(name === "plan_mode_status")) return [3 /*break*/, 74];
                        result_1 = { content: [{ type: "text", text: this.planService.getStatus() }] };
                        return [3 /*break*/, 186];
                    case 74:
                        if (!(name === "memory_index_codebase")) return [3 /*break*/, 77];
                        indexRoot = (args === null || args === void 0 ? void 0 : args.path) || process.cwd();
                        return [4 /*yield*/, this.initializeMemorySystem()];
                    case 75:
                        _2.sent();
                        return [4 /*yield*/, this.memoryManager.indexCodebase(indexRoot)];
                    case 76:
                        count = _2.sent();
                        result_1 = { content: [{ type: "text", text: "Indexed ".concat(count, " chunks in ").concat(indexRoot) }] };
                        return [3 /*break*/, 186];
                    case 77:
                        if (!(name === "memory_search")) return [3 /*break*/, 80];
                        query = args === null || args === void 0 ? void 0 : args.query;
                        limit = (args === null || args === void 0 ? void 0 : args.limit) || 5;
                        if (!query)
                            throw new Error("Missing 'query'");
                        return [4 /*yield*/, this.initializeMemorySystem()];
                    case 78:
                        _2.sent();
                        return [4 /*yield*/, this.memoryManager.search(query, limit)];
                    case 79:
                        res = _2.sent();
                        result_1 = { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
                        return [3 /*break*/, 186];
                    case 80:
                        if (!(name === "research_topic")) return [3 /*break*/, 82];
                        topic = args === null || args === void 0 ? void 0 : args.topic;
                        depth = (args === null || args === void 0 ? void 0 : args.depth) || 2;
                        breadth = (args === null || args === void 0 ? void 0 : args.breadth) || 2;
                        if (!topic)
                            throw new Error("Missing 'topic'");
                        console.log("[MCPServer] Triggering Recursive Research: ".concat(topic));
                        return [4 /*yield*/, this.deepResearchService.recursiveResearch(topic, depth, breadth)];
                    case 81:
                        res = _2.sent();
                        result_1 = { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
                        return [3 /*break*/, 186];
                    case 82:
                        if (!(name === "vscode_read_selection")) return [3 /*break*/, 86];
                        if (!(!this.wssInstance || this.wssInstance.clients.size === 0)) return [3 /*break*/, 83];
                        result_1 = { content: [{ type: "text", text: "Error: No Native Extension connected." }] };
                        return [3 /*break*/, 85];
                    case 83: return [4 /*yield*/, new Promise(function (resolve) {
                            var requestId = "req_".concat(Date.now(), "_").concat(Math.random());
                            var timeout = setTimeout(function () {
                                _this.pendingRequests.delete(requestId);
                                resolve({ content: [{ type: "text", text: "Error: Extension timed out." }] });
                            }, 3000);
                            _this.pendingRequests.set(requestId, function (data) {
                                clearTimeout(timeout);
                                resolve({ content: [{ type: "text", text: data.content || "No content." }] });
                            });
                            _this.wssInstance.clients.forEach(function (client) {
                                if (client.readyState === 1) {
                                    client.send(JSON.stringify({ type: 'GET_SELECTION', requestId: requestId }));
                                }
                            });
                        })];
                    case 84:
                        result_1 = _2.sent();
                        _2.label = 85;
                    case 85: return [3 /*break*/, 186];
                    case 86:
                        if (!(name === "vscode_read_terminal")) return [3 /*break*/, 90];
                        if (!(!this.wssInstance || this.wssInstance.clients.size === 0)) return [3 /*break*/, 87];
                        result_1 = { content: [{ type: "text", text: "Error: No Native Extension connected." }] };
                        return [3 /*break*/, 89];
                    case 87: return [4 /*yield*/, new Promise(function (resolve) {
                            var requestId = "req_".concat(Date.now(), "_").concat(Math.random());
                            var timeout = setTimeout(function () {
                                _this.pendingRequests.delete(requestId);
                                resolve({ content: [{ type: "text", text: "Error: Extension timed out." }] });
                            }, 3000);
                            _this.pendingRequests.set(requestId, function (data) {
                                clearTimeout(timeout);
                                resolve({ content: [{ type: "text", text: data.content || "No content." }] });
                            });
                            _this.wssInstance.clients.forEach(function (client) {
                                if (client.readyState === 1) {
                                    client.send(JSON.stringify({ type: 'GET_TERMINAL', requestId: requestId }));
                                }
                            });
                        })];
                    case 88:
                        result_1 = _2.sent();
                        _2.label = 89;
                    case 89: return [3 /*break*/, 186];
                    case 90:
                        if (!(name === "healer_diagnose")) return [3 /*break*/, 92];
                        error = args === null || args === void 0 ? void 0 : args.error;
                        context = args === null || args === void 0 ? void 0 : args.context;
                        if (!error)
                            throw new Error("Missing 'error' parameter");
                        return [4 /*yield*/, this.healerService.analyzeError(error, context)];
                    case 91:
                        diagnosis = _2.sent();
                        result_1 = { content: [{ type: "text", text: JSON.stringify(diagnosis, null, 2) }] };
                        return [3 /*break*/, 186];
                    case 92:
                        if (!(name === "healer_heal")) return [3 /*break*/, 94];
                        error = args === null || args === void 0 ? void 0 : args.error;
                        context = args === null || args === void 0 ? void 0 : args.context;
                        if (!error)
                            throw new Error("Missing 'error' parameter");
                        return [4 /*yield*/, this.healerService.heal(error, context)];
                    case 93:
                        success = _2.sent();
                        result_1 = { content: [{ type: "text", text: success ? "Healer successfully applied fix." : "Healer could not fix this error." }] };
                        return [3 /*break*/, 186];
                    case 94:
                        if (!(name === "darwin_evolve")) return [3 /*break*/, 96];
                        prompt_1 = args === null || args === void 0 ? void 0 : args.prompt;
                        goal = args === null || args === void 0 ? void 0 : args.goal;
                        return [4 /*yield*/, this.darwinService.proposeMutation(prompt_1, goal)];
                    case 95:
                        mutation = _2.sent();
                        result_1 = { content: [{ type: "text", text: JSON.stringify(mutation, null, 2) }] };
                        return [3 /*break*/, 186];
                    case 96:
                        if (!(name === "darwin_experiment")) return [3 /*break*/, 98];
                        mutationId = args === null || args === void 0 ? void 0 : args.mutationId;
                        task = args === null || args === void 0 ? void 0 : args.task;
                        return [4 /*yield*/, this.darwinService.startExperiment(mutationId, task)];
                    case 97:
                        experiment = _2.sent();
                        result_1 = { content: [{ type: "text", text: "Experiment ".concat(experiment.id, " started.") }] };
                        return [3 /*break*/, 186];
                    case 98:
                        if (!(name === "get_chat_history")) return [3 /*break*/, 102];
                        if (!(!this.wssInstance || this.wssInstance.clients.size === 0)) return [3 /*break*/, 99];
                        result_1 = { content: [{ type: "text", text: "Error: No Extension connected." }] };
                        return [3 /*break*/, 101];
                    case 99: return [4 /*yield*/, new Promise(function (resolve) {
                            var requestId = "req_chat_".concat(Date.now());
                            var timeout = setTimeout(function () {
                                _this.pendingRequests.delete(requestId);
                                resolve({ content: [{ type: "text", text: "Error: Chat scrape timed out." }] });
                            }, 5000);
                            _this.pendingRequests.set(requestId, function (data) {
                                clearTimeout(timeout);
                                var history = data.history || [];
                                resolve({ content: [{ type: "text", text: history.join('\n') }] });
                            });
                            _this.wssInstance.clients.forEach(function (client) {
                                if (client.readyState === 1) {
                                    client.send(JSON.stringify({ type: 'GET_CHAT_HISTORY', requestId: requestId }));
                                }
                            });
                        })];
                    case 100:
                        result_1 = _2.sent();
                        _2.label = 101;
                    case 101: return [3 /*break*/, 186];
                    case 102:
                        if (!(name === "vscode_get_notifications")) return [3 /*break*/, 104];
                        return [4 /*yield*/, this.broadcastRequestAndAwait('GET_NOTIFICATIONS')];
                    case 103:
                        result_1 = _2.sent();
                        return [3 /*break*/, 186];
                    case 104:
                        if (!(name === "vscode_submit_chat")) return [3 /*break*/, 105];
                        if (this.wssInstance) {
                            this.wssInstance.clients.forEach(function (client) {
                                if (client.readyState === 1)
                                    client.send(JSON.stringify({ type: 'SUBMIT_CHAT_HOOK' }));
                            });
                            result_1 = { content: [{ type: "text", text: "Sent SUBMIT_CHAT_HOOK." }] };
                        }
                        else {
                            result_1 = { content: [{ type: "text", text: "Error: No WebSocket server." }] };
                        }
                        return [3 /*break*/, 186];
                    case 105:
                        if (!(name === "start_task")) return [3 /*break*/, 107];
                        goal = args === null || args === void 0 ? void 0 : args.goal;
                        maxSteps = (args === null || args === void 0 ? void 0 : args.maxSteps) || 10;
                        return [4 /*yield*/, this.director.executeTask(goal, maxSteps)];
                    case 106:
                        resultStr = _2.sent();
                        result_1 = {
                            content: [{ type: "text", text: resultStr }]
                        };
                        return [3 /*break*/, 186];
                    case 107:
                        if (!(name === "browser_get_history")) return [3 /*break*/, 111];
                        if (!(!this.wssInstance || this.wssInstance.clients.size === 0)) return [3 /*break*/, 108];
                        result_1 = { content: [{ type: "text", text: "Error: No Browser Extension connected." }] };
                        return [3 /*break*/, 110];
                    case 108: return [4 /*yield*/, new Promise(function (resolve) {
                            var requestId = "req_".concat(Date.now(), "_").concat(Math.random());
                            var timeout = setTimeout(function () {
                                _this.pendingRequests.delete(requestId);
                                resolve({ content: [{ type: "text", text: "Error: Browser timed out." }] });
                            }, 5000);
                            _this.pendingRequests.set(requestId, function (data) {
                                clearTimeout(timeout);
                                if (Array.isArray(data)) {
                                    var historyText = data.map(function (item) { return "- [".concat(item.title || 'Untitled', "](").concat(item.url, ") (Visits: ").concat(item.visitCount, ")"); }).join('\n');
                                    resolve({ content: [{ type: "text", text: historyText || "No history found for this query." }] });
                                }
                                else {
                                    resolve({ content: [{ type: "text", text: "Error: Unexpected data format from browser." }] });
                                }
                            });
                            _this.wssInstance.clients.forEach(function (client) {
                                if (client.readyState === 1) {
                                    client.send(JSON.stringify({
                                        jsonrpc: "2.0",
                                        method: 'browser_get_history',
                                        params: { query: args.query, maxResults: args.maxResults },
                                        id: requestId
                                    }));
                                }
                            });
                        })];
                    case 109:
                        result_1 = _2.sent();
                        _2.label = 110;
                    case 110: return [3 /*break*/, 186];
                    case 111:
                        if (!(name === "browser_debug")) return [3 /*break*/, 115];
                        if (!(!this.wssInstance || this.wssInstance.clients.size === 0)) return [3 /*break*/, 112];
                        result_1 = { content: [{ type: "text", text: "Error: No Browser Extension connected." }] };
                        return [3 /*break*/, 114];
                    case 112: return [4 /*yield*/, new Promise(function (resolve) {
                            var requestId = "req_".concat(Date.now(), "_").concat(Math.random());
                            var timeout = setTimeout(function () {
                                _this.pendingRequests.delete(requestId);
                                resolve({ content: [{ type: "text", text: "Error: Browser timed out." }] });
                            }, 10000);
                            _this.pendingRequests.set(requestId, function (data) {
                                clearTimeout(timeout);
                                resolve({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
                            });
                            _this.wssInstance.clients.forEach(function (client) {
                                if (client.readyState === 1) {
                                    client.send(JSON.stringify({
                                        jsonrpc: "2.0",
                                        method: 'browser_debug',
                                        params: args,
                                        id: requestId
                                    }));
                                }
                            });
                        })];
                    case 113:
                        result_1 = _2.sent();
                        _2.label = 114;
                    case 114: return [3 /*break*/, 186];
                    case 115:
                        if (!(name === "browser_proxy_fetch")) return [3 /*break*/, 119];
                        if (!(!this.wssInstance || this.wssInstance.clients.size === 0)) return [3 /*break*/, 116];
                        result_1 = { content: [{ type: "text", text: "Error: No Browser Extension connected." }] };
                        return [3 /*break*/, 118];
                    case 116: return [4 /*yield*/, new Promise(function (resolve) {
                            var requestId = "req_".concat(Date.now(), "_").concat(Math.random());
                            var timeout = setTimeout(function () {
                                _this.pendingRequests.delete(requestId);
                                resolve({ content: [{ type: "text", text: "Error: Browser timed out." }] });
                            }, 15000);
                            _this.pendingRequests.set(requestId, function (data) {
                                clearTimeout(timeout);
                                resolve({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
                            });
                            _this.wssInstance.clients.forEach(function (client) {
                                if (client.readyState === 1) {
                                    client.send(JSON.stringify({
                                        jsonrpc: "2.0",
                                        method: 'browser_proxy_fetch',
                                        params: args,
                                        id: requestId
                                    }));
                                }
                            });
                        })];
                    case 117:
                        result_1 = _2.sent();
                        _2.label = 118;
                    case 118: return [3 /*break*/, 186];
                    case 119:
                        if (!(name === "agent_browse")) return [3 /*break*/, 121];
                        task = args === null || args === void 0 ? void 0 : args.task;
                        if (!task)
                            throw new Error("Missing 'task' argument for agent_browse");
                        return [4 /*yield*/, this.browserTool.executeTask(task, true)];
                    case 120:
                        result_1 = _2.sent();
                        return [3 /*break*/, 186];
                    case 121:
                        if (!(name === "agent_search")) return [3 /*break*/, 127];
                        query = args === null || args === void 0 ? void 0 : args.query;
                        root = (args === null || args === void 0 ? void 0 : args.path) || process.cwd();
                        if (!query)
                            throw new Error("Missing 'query' argument for agent_search");
                        _2.label = 122;
                    case 122:
                        _2.trys.push([122, 124, , 125]);
                        return [4 /*yield*/, this.searchService.loadIndex()];
                    case 123:
                        _2.sent();
                        return [3 /*break*/, 125];
                    case 124:
                        e_6 = _2.sent();
                        return [3 /*break*/, 125];
                    case 125: return [4 /*yield*/, this.searchService.search(query, root)];
                    case 126:
                        result_1 = _2.sent();
                        return [3 /*break*/, 186];
                    case 127:
                        if (!(name === "spawn_agent")) return [3 /*break*/, 128];
                        id = this.spawnerService.spawn(args.type, args.task);
                        result_1 = { content: [{ type: "text", text: "Agent spawned successfully. ID: ".concat(id) }] };
                        return [3 /*break*/, 186];
                    case 128:
                        if (!(name === "list_agents")) return [3 /*break*/, 129];
                        agents = this.spawnerService.listAgents();
                        result_1 = { content: [{ type: "text", text: JSON.stringify(agents, null, 2) }] };
                        return [3 /*break*/, 186];
                    case 129:
                        if (!(name === "kill_agent")) return [3 /*break*/, 130];
                        success = this.spawnerService.killAgent(args.agentId);
                        result_1 = { content: [{ type: "text", text: success ? "Agent terminated." : "Failed to terminate agent (might not be running)." }] };
                        return [3 /*break*/, 186];
                    case 130:
                        if (!(name === "get_agent_result")) return [3 /*break*/, 131];
                        agent = this.spawnerService.getAgent(args.agentId);
                        if (!agent) {
                            result_1 = { content: [{ type: "text", text: "Error: Agent not found." }] };
                        }
                        else {
                            result_1 = { content: [{ type: "text", text: JSON.stringify(agent.result || { status: agent.status }, null, 2) }] };
                        }
                        return [3 /*break*/, 186];
                    case 131:
                        if (!(name === "read_page")) return [3 /*break*/, 138];
                        if (!(!this.wssInstance || this.wssInstance.clients.size === 0)) return [3 /*break*/, 135];
                        // FALLBACK: Use Native Reader (ReaderTools)
                        console.log("[MCPServer] No Browser Extension. Falling back to Native Reader...");
                        nativeReader = tools_1.ReaderTools.find(function (t) { return t.name === "read_page"; });
                        if (!(nativeReader && this.isToolWithHandler(nativeReader))) return [3 /*break*/, 133];
                        return [4 /*yield*/, nativeReader.handler(args)];
                    case 132:
                        result_1 = _2.sent();
                        return [3 /*break*/, 134];
                    case 133:
                        result_1 = { content: [{ type: "text", text: "Error: No Native Reader available." }] };
                        _2.label = 134;
                    case 134: return [3 /*break*/, 137];
                    case 135: return [4 /*yield*/, new Promise(function (resolve) {
                            var requestId = "req_".concat(Date.now(), "_").concat(Math.random());
                            var timeout = setTimeout(function () {
                                _this.pendingRequests.delete(requestId);
                                // TIMEOUT FALLBACK to Native Reader
                                console.log("[MCPServer] Browser Timed Out. Falling back to Native Reader...");
                                var nativeReader = tools_1.ReaderTools.find(function (t) { return t.name === "read_page"; });
                                if (nativeReader && _this.isToolWithHandler(nativeReader)) {
                                    Promise.resolve(nativeReader.handler(args))
                                        .then(resolve)
                                        .catch(function (e) { return resolve({ content: [{ type: "text", text: "Error: ".concat(e.message) }] }); });
                                }
                                else {
                                    resolve({ content: [{ type: "text", text: "Error: Browser timed out and no native reader." }] });
                                }
                            }, 5000);
                            _this.pendingRequests.set(requestId, function (data) {
                                clearTimeout(timeout);
                                // Expect data to have { url, title, content }
                                var text = "URL: ".concat(data.url, "\nTitle: ").concat(data.title, "\n\n").concat(data.content.substring(0, 5000), "...");
                                resolve({ content: [{ type: "text", text: text }] });
                            });
                            _this.wssInstance.clients.forEach(function (client) {
                                if (client.readyState === 1) {
                                    // Send JSON-RPC 2.0 request
                                    client.send(JSON.stringify({
                                        jsonrpc: "2.0",
                                        method: 'browser_scrape',
                                        id: requestId
                                    }));
                                }
                            });
                        })];
                    case 136:
                        result_1 = _2.sent();
                        _2.label = 137;
                    case 137: return [3 /*break*/, 186];
                    case 138:
                        if (!(name === "memorize_page")) return [3 /*break*/, 142];
                        if (!(!this.wssInstance || this.wssInstance.clients.size === 0)) return [3 /*break*/, 139];
                        result_1 = { content: [{ type: "text", text: "Error: No Browser Extension connected." }] };
                        return [3 /*break*/, 141];
                    case 139: return [4 /*yield*/, new Promise(function (resolve) {
                            var requestId = "req_".concat(Date.now(), "_").concat(Math.random());
                            var timeout = setTimeout(function () {
                                _this.pendingRequests.delete(requestId);
                                resolve({ content: [{ type: "text", text: "Error: Browser timed out." }] });
                            }, 8000); // 8s timeout for memorization
                            _this.pendingRequests.set(requestId, function (data) { return __awaiter(_this, void 0, void 0, function () {
                                var ctxId, e_16;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            clearTimeout(timeout);
                                            // Data: { url, title, content }
                                            if (!data.content) {
                                                resolve({ content: [{ type: "text", text: "Error: No content received from browser." }] });
                                                return [2 /*return*/];
                                            }
                                            _a.label = 1;
                                        case 1:
                                            _a.trys.push([1, 3, , 4]);
                                            return [4 /*yield*/, this.memoryManager.saveContext("URL: ".concat(data.url, "\n\n").concat(data.content), // Content
                                                {
                                                    title: data.title || "Web Page",
                                                    source: data.url || "browser"
                                                })];
                                        case 2:
                                            ctxId = _a.sent();
                                            resolve({ content: [{ type: "text", text: "\u2705 Memorized page: \"".concat(data.title, "\" (ID: ").concat(ctxId, ")") }] });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            e_16 = _a.sent();
                                            resolve({ content: [{ type: "text", text: "Error saving context: ".concat(e_16.message) }] });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            _this.wssInstance.clients.forEach(function (client) {
                                if (client.readyState === 1) {
                                    // Reuse 'browser_scrape' method
                                    client.send(JSON.stringify({
                                        jsonrpc: "2.0",
                                        method: 'browser_scrape',
                                        id: requestId
                                    }));
                                }
                            });
                        })];
                    case 140:
                        result_1 = _2.sent();
                        _2.label = 141;
                    case 141: return [3 /*break*/, 186];
                    case 142:
                        if (!(name === "use_agent")) return [3 /*break*/, 148];
                        agentName = args.name;
                        prompt_2 = args.prompt;
                        agent_1 = this.activeAgents.get(agentName);
                        if (!!agent_1) return [3 /*break*/, 144];
                        if (agentName === 'claude')
                            agent_1 = new ClaudeAdapter_js_1.ClaudeAdapter();
                        else if (agentName === 'gemini')
                            agent_1 = new GeminiAdapter_js_1.GeminiAdapter();
                        else
                            return [2 /*return*/, { content: [{ type: "text", text: "Unknown agent: ".concat(agentName) }] }];
                        return [4 /*yield*/, agent_1.start()];
                    case 143:
                        _2.sent();
                        this.activeAgents.set(agentName, agent_1);
                        _2.label = 144;
                    case 144:
                        if (!!agent_1.isActive()) return [3 /*break*/, 146];
                        return [4 /*yield*/, agent_1.start()];
                    case 145:
                        _2.sent();
                        _2.label = 146;
                    case 146:
                        responsePromise = new Promise(function (resolve) {
                            var buffer = '';
                            var timer;
                            var onData = function (data) {
                                buffer += data;
                                clearTimeout(timer);
                                // Debounce: Wait 2s for more data, else assume done
                                timer = setTimeout(function () {
                                    cleanup();
                                    resolve(buffer);
                                }, 2000);
                            };
                            var cleanup = function () {
                                agent_1.removeListener('output', onData);
                            };
                            agent_1.on('output', onData);
                            agent_1.send(prompt_2).catch(function (err) {
                                cleanup();
                                resolve("Error sending to agent: ".concat(err.message));
                            });
                        });
                        return [4 /*yield*/, responsePromise];
                    case 147:
                        output = _2.sent();
                        result_1 = { content: [{ type: "text", text: output }] };
                        return [3 /*break*/, 186];
                    case 148:
                        if (!(name === "take_screenshot")) return [3 /*break*/, 153];
                        _2.label = 149;
                    case 149:
                        _2.trys.push([149, 151, , 152]);
                        return [4 /*yield*/, this.captureScreenshotFromBrowser()];
                    case 150:
                        data = _2.sent();
                        result_1 = {
                            content: [
                                { type: "text", text: "Screenshot captured." },
                                { type: "image", data: data.split(',')[1], mimeType: "image/jpeg" }
                            ]
                        };
                        return [3 /*break*/, 152];
                    case 151:
                        e_7 = _2.sent();
                        result_1 = { content: [{ type: "text", text: "Error: ".concat(e_7.message) }] };
                        return [3 /*break*/, 152];
                    case 152: return [3 /*break*/, 186];
                    case 153:
                        if (!(name === "analyze_screenshot")) return [3 /*break*/, 159];
                        prompt_3 = args.prompt;
                        _2.label = 154;
                    case 154:
                        _2.trys.push([154, 157, , 158]);
                        console.log("[HyperCode Core] \uD83D\uDC41\uFE0F Analyzing screenshot with prompt: \"".concat(prompt_3, "\"..."));
                        return [4 /*yield*/, this.captureScreenshotFromBrowser()];
                    case 155:
                        data = _2.sent();
                        base64 = data.split(',')[1];
                        mimeType = "image/jpeg";
                        return [4 /*yield*/, this.llmService.generateText('google', 'gemini-1.5-pro', "You are a web automation assistant. Analyze the screenshot.", prompt_3, {
                                images: [{ base64: base64, mimeType: mimeType }],
                                taskComplexity: 'high'
                            })];
                    case 156:
                        response = _2.sent();
                        result_1 = {
                            content: [
                                { type: "text", text: response.content }
                            ]
                        };
                        return [3 /*break*/, 158];
                    case 157:
                        e_8 = _2.sent();
                        result_1 = { content: [{ type: "text", text: "Error analyzing screenshot: ".concat(e_8.message) }] };
                        return [3 /*break*/, 158];
                    case 158: return [3 /*break*/, 186];
                    case 159:
                        if (!(name === "start_auto_drive")) return [3 /*break*/, 160];
                        this.director.startAutoDrive();
                        result_1 = {
                            content: [{ type: "text", text: "Auto-Drive started. The Director will now proactively drive the development loop." }]
                        };
                        return [3 /*break*/, 186];
                    case 160:
                        if (!(name === "stop_auto_drive")) return [3 /*break*/, 161];
                        this.director.stopAutoDrive();
                        result_1 = {
                            content: [{ type: "text", text: "Auto-Drive Stopped." }]
                        };
                        return [3 /*break*/, 186];
                    case 161:
                        if (!(name === "list_skills")) return [3 /*break*/, 162];
                        result_1 = this.skillRegistry.listSkills();
                        return [3 /*break*/, 186];
                    case 162:
                        if (!(name === "read_skill")) return [3 /*break*/, 163];
                        result_1 = this.skillRegistry.readSkill(args === null || args === void 0 ? void 0 : args.skillName);
                        return [3 /*break*/, 186];
                    case 163:
                        if (!(name === "mcpm_search")) return [3 /*break*/, 165];
                        _j = {};
                        _k = { type: "text" };
                        _b = (_a = JSON).stringify;
                        return [4 /*yield*/, this.mcpmInstaller.search(args === null || args === void 0 ? void 0 : args.query)];
                    case 164:
                        result_1 = (_j.content = [(_k.text = _b.apply(_a, [_2.sent(), null, 2]), _k)],
                            _j);
                        return [3 /*break*/, 186];
                    case 165:
                        if (!(name === "mcpm_install")) return [3 /*break*/, 167];
                        return [4 /*yield*/, this.mcpmInstaller.install(args === null || args === void 0 ? void 0 : args.name)];
                    case 166:
                        msg = _2.sent();
                        result_1 = {
                            content: [{ type: "text", text: msg }]
                        };
                        return [3 /*break*/, 186];
                    case 167:
                        if (!(name === "mcp_add_server")) return [3 /*break*/, 170];
                        srvName = args.name;
                        repoUrl = args.repoUrl;
                        return [4 /*yield*/, this.submoduleManager.addSubmodule(srvName, repoUrl)];
                    case 168:
                        cloneMsg = _2.sent();
                        // 2. Add to Aggregator Config
                        return [4 /*yield*/, this.mcpAggregator.addServerConfig(srvName, {
                                command: args.command,
                                args: args.args,
                                enabled: true,
                                env: args.env
                            })];
                    case 169:
                        // 2. Add to Aggregator Config
                        _2.sent();
                        result_1 = {
                            content: [{ type: "text", text: "".concat(cloneMsg, "\nAdded server '").concat(srvName, "' to configuration and connected.") }]
                        };
                        return [3 /*break*/, 186];
                    case 170:
                        if (!(name === "start_autotest")) return [3 /*break*/, 171];
                        this.autoTestService.start();
                        result_1 = { content: [{ type: "text", text: "Auto-Test Watcher Started." }] };
                        return [3 /*break*/, 186];
                    case 171:
                        if (!(name === "stop_autotest")) return [3 /*break*/, 172];
                        this.autoTestService.stop();
                        result_1 = { content: [{ type: "text", text: "Auto-Test Watcher Stopped." }] };
                        return [3 /*break*/, 186];
                    case 172:
                        if (!(name === "start_squad")) return [3 /*break*/, 174];
                        branch = args === null || args === void 0 ? void 0 : args.branch;
                        goal = args === null || args === void 0 ? void 0 : args.goal;
                        return [4 /*yield*/, this.squadService.spawnMember(branch, goal)];
                    case 173:
                        msg = _2.sent();
                        result_1 = { content: [{ type: "text", text: msg }] };
                        return [3 /*break*/, 186];
                    case 174:
                        if (!(name === "list_squads")) return [3 /*break*/, 175];
                        squads = this.squadService.listMembers();
                        result_1 = { content: [{ type: "text", text: JSON.stringify(squads, null, 2) }] };
                        return [3 /*break*/, 186];
                    case 175:
                        if (!(name === "kill_squad")) return [3 /*break*/, 177];
                        branch = args === null || args === void 0 ? void 0 : args.branch;
                        return [4 /*yield*/, this.squadService.killMember(branch)];
                    case 176:
                        msg = _2.sent();
                        result_1 = { content: [{ type: "text", text: msg }] };
                        return [3 /*break*/, 186];
                    case 177:
                        if (!(name === "merge_squad")) return [3 /*break*/, 180];
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('./orchestrator/MergeService.js'); })];
                    case 178:
                        MergeService = (_2.sent()).MergeService;
                        merger = new MergeService(process.cwd());
                        branch = args === null || args === void 0 ? void 0 : args.branch;
                        return [4 /*yield*/, merger.mergeBranch(branch)];
                    case 179:
                        res = _2.sent();
                        result_1 = { content: [{ type: "text", text: JSON.stringify(res) }] };
                        return [3 /*break*/, 186];
                    case 180:
                        if (!(name === "git_worktree_list")) return [3 /*break*/, 182];
                        _l = {};
                        _m = { type: "text" };
                        _d = (_c = JSON).stringify;
                        return [4 /*yield*/, this.gitWorktreeManager.listWorktrees()];
                    case 181:
                        result_1 = (_l.content = [(_m.text = _d.apply(_c, [_2.sent(), null, 2]), _m)],
                            _l);
                        return [3 /*break*/, 186];
                    case 182:
                        if (!(name === "git_worktree_add")) return [3 /*break*/, 184];
                        branch = args === null || args === void 0 ? void 0 : args.branch;
                        path_2 = args === null || args === void 0 ? void 0 : args.path;
                        return [4 /*yield*/, this.gitWorktreeManager.addWorktree(branch, path_2)];
                    case 183:
                        finalPath = _2.sent();
                        result_1 = { content: [{ type: "text", text: "Worktree added at: ".concat(finalPath) }] };
                        return [3 /*break*/, 186];
                    case 184:
                        if (!(name === "git_worktree_remove")) return [3 /*break*/, 186];
                        pathOrBranch = (args === null || args === void 0 ? void 0 : args.path) || (args === null || args === void 0 ? void 0 : args.branch);
                        force = args === null || args === void 0 ? void 0 : args.force;
                        return [4 /*yield*/, this.gitWorktreeManager.removeWorktree(pathOrBranch, force)];
                    case 185:
                        _2.sent();
                        result_1 = { content: [{ type: "text", text: "Worktree removed: ".concat(pathOrBranch) }] };
                        _2.label = 186;
                    case 186:
                        // 2. Intercept File Reading for Suggestions (Engagement Module)
                        if (name === "read_file" || name === "view_file") {
                            filePath = args.path || args.AbsolutePath;
                            if (!filePath) {
                                // Fallthrough to standard handler which will likely error
                            }
                            else {
                                // Fire and forget suggestion analysis
                                // We don't read content here to avoid double-read cost; 
                                // ideally we'd tap into the result, but that requires waiting for the real tool.
                                // For now, let's just log intent or trigger analysis if we can get content cheaply later.
                                // Actually, let's tap the result AFTER execution.
                            }
                        }
                        if (!(name === "execute_sandbox")) return [3 /*break*/, 188];
                        lang = args === null || args === void 0 ? void 0 : args.language;
                        code = args === null || args === void 0 ? void 0 : args.code;
                        _o = {};
                        _p = { type: "text" };
                        _f = (_e = JSON).stringify;
                        return [4 /*yield*/, this.sandboxService.execute(lang, code)];
                    case 187:
                        result_1 = (_o.content = [(_p.text = _f.apply(_e, [_2.sent(), null, 2]), _p)],
                            _o);
                        return [3 /*break*/, 278];
                    case 188:
                        if (!(name === "index_codebase")) return [3 /*break*/, 190];
                        dir = (args === null || args === void 0 ? void 0 : args.path) || process.cwd();
                        console.log("[HyperCode Core] Indexing codebase at ".concat(dir, "..."));
                        return [4 /*yield*/, this.memoryManager.indexCodebase(dir)];
                    case 189:
                        count = _2.sent();
                        result_1 = {
                            content: [{ type: "text", text: "Indexed ".concat(count, " documents/chunks from ").concat(dir, ".") }]
                        };
                        return [3 /*break*/, 278];
                    case 190:
                        if (!(name === "search_codebase")) return [3 /*break*/, 192];
                        query = args === null || args === void 0 ? void 0 : args.query;
                        console.log("[HyperCode Core] Semantic Searching for: ".concat(query));
                        return [4 /*yield*/, this.memoryManager.search(query)];
                    case 191:
                        matches = _2.sent();
                        text_2 = "Searching for: \"".concat(query, "\"\n\n");
                        matches.forEach(function (m, i) {
                            var _a;
                            var filePath = ((_a = m.metadata) === null || _a === void 0 ? void 0 : _a.file_path) || m.id;
                            text_2 += "".concat(i + 1, ". [").concat(filePath, "]\n").concat(m.content.substring(0, 200), "...\n\n");
                        });
                        result_1 = {
                            content: [{ type: "text", text: text_2 }]
                        };
                        return [3 /*break*/, 278];
                    case 192:
                        if (!(name === "system_diagnostics")) return [3 /*break*/, 194];
                        return [4 /*yield*/, DiagnosticTools_js_1.DiagnosticTools.checkHealth()];
                    case 193:
                        status_4 = _2.sent();
                        result_1 = {
                            content: [{ type: "text", text: JSON.stringify(status_4, null, 2) }]
                        };
                        return [3 /*break*/, 278];
                    case 194:
                        if (!(name === "assimilate_skill")) return [3 /*break*/, 196];
                        assimilationRequest = {
                            topic: String((_v = (_u = args === null || args === void 0 ? void 0 : args.topic) !== null && _u !== void 0 ? _u : args === null || args === void 0 ? void 0 : args.name) !== null && _v !== void 0 ? _v : ''),
                            docsUrl: typeof (args === null || args === void 0 ? void 0 : args.docsUrl) === 'string' ? args.docsUrl : undefined,
                            autoInstall: typeof (args === null || args === void 0 ? void 0 : args.autoInstall) === 'boolean' ? args.autoInstall : undefined,
                        };
                        if (!assimilationRequest.topic) {
                            throw new Error("Missing required assimilation topic/name.");
                        }
                        return [4 /*yield*/, this.skillAssimilationService.assimilate(assimilationRequest)];
                    case 195:
                        response = _2.sent();
                        result_1 = {
                            content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
                        };
                        return [3 /*break*/, 278];
                    case 196:
                        if (!(name === "get_status")) return [3 /*break*/, 198];
                        _q = {};
                        _r = { type: "text" };
                        _h = (_g = JSON).stringify;
                        return [4 /*yield*/, this.chainExecutor.executeChain(args)];
                    case 197:
                        result_1 = (_q.content = [(_r.text = _h.apply(_g, [_2.sent(), null, 2]), _r)],
                            _q);
                        return [3 /*break*/, 278];
                    case 198:
                        if (!(name === "research")) return [3 /*break*/, 200];
                        topic = args === null || args === void 0 ? void 0 : args.topic;
                        depth = (args === null || args === void 0 ? void 0 : args.depth) || 3;
                        return [4 /*yield*/, this.researchService.research(topic, depth)];
                    case 199:
                        report = _2.sent();
                        result_1 = {
                            content: [{ type: "text", text: report }]
                        };
                        return [3 /*break*/, 278];
                    case 200:
                        if (!(name === "find_symbol")) return [3 /*break*/, 202];
                        return [4 /*yield*/, this.lspTools.findSymbol(args)];
                    case 201:
                        output = _2.sent();
                        result_1 = { content: [{ type: "text", text: output }] };
                        return [3 /*break*/, 278];
                    case 202:
                        if (!(name === "find_references")) return [3 /*break*/, 204];
                        return [4 /*yield*/, this.lspTools.findReferences(args)];
                    case 203:
                        output = _2.sent();
                        result_1 = { content: [{ type: "text", text: output }] };
                        return [3 /*break*/, 278];
                    case 204:
                        if (!(name === "go_to_definition")) return [3 /*break*/, 206];
                        return [4 /*yield*/, this.lspTools.goToDefinition(args)];
                    case 205:
                        output = _2.sent();
                        result_1 = { content: [{ type: "text", text: output }] };
                        return [3 /*break*/, 278];
                    case 206:
                        if (!(name === "get_symbols")) return [3 /*break*/, 208];
                        return [4 /*yield*/, this.lspTools.getSymbols(args)];
                    case 207:
                        output = _2.sent();
                        result_1 = { content: [{ type: "text", text: output }] };
                        return [3 /*break*/, 278];
                    case 208:
                        if (!(name === "rename_symbol")) return [3 /*break*/, 210];
                        return [4 /*yield*/, this.lspTools.renameSymbol(args)];
                    case 209:
                        output = _2.sent();
                        result_1 = { content: [{ type: "text", text: output }] };
                        return [3 /*break*/, 278];
                    case 210:
                        if (!(name === "search_symbols")) return [3 /*break*/, 212];
                        return [4 /*yield*/, this.lspTools.searchSymbols(args)];
                    case 211:
                        output = _2.sent();
                        result_1 = { content: [{ type: "text", text: output }] };
                        return [3 /*break*/, 278];
                    case 212:
                        if (!(name === "plan_mode")) return [3 /*break*/, 213];
                        this.planService.enterPlanMode();
                        result_1 = { content: [{ type: "text", text: "Switched to PLAN mode. Changes will be staged but not applied." }] };
                        return [3 /*break*/, 278];
                    case 213:
                        if (!(name === "build_mode")) return [3 /*break*/, 214];
                        this.planService.enterBuildMode();
                        result_1 = { content: [{ type: "text", text: "Switched to BUILD mode. Approved changes can now be applied." }] };
                        return [3 /*break*/, 278];
                    case 214:
                        if (!(name === "propose_change")) return [3 /*break*/, 215];
                        diff = this.planService.proposeChange(args.file_path, args.content, args.description);
                        result_1 = { content: [{ type: "text", text: "Proposed change for ".concat(args.file_path, " (diff ID: ").concat(diff.id, ")") }] };
                        return [3 /*break*/, 278];
                    case 215:
                        if (!(name === "review_changes")) return [3 /*break*/, 216];
                        pending_1 = this.planService.getPendingChanges();
                        summary = pending_1.map(function (d) { return "[".concat(d.id, "] ").concat(d.filePath, " - ").concat(d.status); }).join('\n');
                        result_1 = { content: [{ type: "text", text: pending_1.length === 0 ? 'No pending changes.' : "Pending changes:\n".concat(summary) }] };
                        return [3 /*break*/, 278];
                    case 216:
                        if (!(name === "approve_change")) return [3 /*break*/, 217];
                        success = this.planService.approveDiff(args.diff_id);
                        result_1 = { content: [{ type: "text", text: success ? "Approved diff ".concat(args.diff_id) : "Failed to approve diff ".concat(args.diff_id) }] };
                        return [3 /*break*/, 278];
                    case 217:
                        if (!(name === "apply_changes")) return [3 /*break*/, 218];
                        applied = this.planService.applyApprovedChanges();
                        if (!applied) {
                            result_1 = { content: [{ type: "text", text: "Cannot apply changes. Switch to BUILD mode first." }] };
                        }
                        else {
                            result_1 = { content: [{ type: "text", text: "Applied ".concat(applied.applied.length, " changes. Failed: ").concat(applied.failed.length) }] };
                        }
                        return [3 /*break*/, 278];
                    case 218:
                        if (!(name === "plan_status")) return [3 /*break*/, 219];
                        status_5 = this.planService.getStatus();
                        result_1 = { content: [{ type: "text", text: status_5 }] };
                        return [3 /*break*/, 278];
                    case 219:
                        if (!(name === "create_checkpoint")) return [3 /*break*/, 220];
                        checkpoint = this.planService.createCheckpoint(args.name, args.description);
                        result_1 = { content: [{ type: "text", text: "Created checkpoint: ".concat(checkpoint.name, " (").concat(checkpoint.id, ")") }] };
                        return [3 /*break*/, 278];
                    case 220:
                        if (!(name === "rollback")) return [3 /*break*/, 221];
                        success = this.planService.rollback(args.checkpoint_id);
                        result_1 = { content: [{ type: "text", text: success ? "Rolled back to checkpoint ".concat(args.checkpoint_id) : 'Rollback failed' }] };
                        return [3 /*break*/, 278];
                    case 221:
                        if (!(name === "add_memory")) return [3 /*break*/, 223];
                        type = args.type || 'working';
                        namespace = args.namespace || 'project';
                        return [4 /*yield*/, this.agentMemoryService.add(args.content, type, namespace, {
                                source: args.source || 'tool',
                                tags: args.tags || [],
                            })];
                    case 222:
                        memory = _2.sent();
                        result_1 = { content: [{ type: "text", text: "Added ".concat(type, " memory: ").concat(memory.id) }] };
                        return [3 /*break*/, 278];
                    case 223:
                        if (!(name === "search_memory")) return [3 /*break*/, 225];
                        return [4 /*yield*/, this.agentMemoryService.search(args.query, {
                                type: args.type,
                                namespace: args.namespace,
                                limit: args.limit || 10,
                            })];
                    case 224:
                        memories = _2.sent();
                        if (memories.length === 0) {
                            result_1 = { content: [{ type: "text", text: "No memories found matching \"".concat(args.query, "\"") }] };
                        }
                        else {
                            formatted = memories.map(function (m) { var _a; return "[".concat(m.type, "/").concat(m.namespace, "] ").concat(m.content.substring(0, 100)).concat(m.content.length > 100 ? '...' : '', " (score: ").concat(((_a = m.score) !== null && _a !== void 0 ? _a : 0).toFixed(2), ")"); }).join('\n');
                            result_1 = { content: [{ type: "text", text: "Found ".concat(memories.length, " memories:\n").concat(formatted) }] };
                        }
                        return [3 /*break*/, 278];
                    case 225:
                        if (!(name === "get_recent_memories")) return [3 /*break*/, 227];
                        return [4 /*yield*/, this.agentMemoryService.getRecent(args.limit || 10, {
                                type: args.type,
                                namespace: args.namespace,
                            })];
                    case 226:
                        memories = _2.sent();
                        if (memories.length === 0) {
                            result_1 = { content: [{ type: "text", text: 'No recent memories.' }] };
                        }
                        else {
                            formatted = memories.map(function (m) {
                                return "[".concat(m.type, "/").concat(m.namespace, "] ").concat(m.content.substring(0, 100)).concat(m.content.length > 100 ? '...' : '');
                            }).join('\n');
                            result_1 = { content: [{ type: "text", text: "Recent memories:\n".concat(formatted) }] };
                        }
                        return [3 /*break*/, 278];
                    case 227:
                        if (!(name === "memory_stats")) return [3 /*break*/, 228];
                        stats = this.agentMemoryService.getStats();
                        formatted = Object.entries(stats).map(function (_a) {
                            var k = _a[0], v = _a[1];
                            return "".concat(k, ": ").concat(v);
                        }).join('\n');
                        result_1 = { content: [{ type: "text", text: "Memory Statistics:\n".concat(formatted) }] };
                        return [3 /*break*/, 278];
                    case 228:
                        if (!(name === "clear_session_memory")) return [3 /*break*/, 229];
                        this.agentMemoryService.clearSession();
                        result_1 = { content: [{ type: "text", text: 'Cleared all session memories.' }] };
                        return [3 /*break*/, 278];
                    case 229:
                        if (!(name === "run_workflow")) return [3 /*break*/, 234];
                        workflowId = args.workflow_id;
                        input = args.input || {};
                        _2.label = 230;
                    case 230:
                        _2.trys.push([230, 232, , 233]);
                        return [4 /*yield*/, this.workflowEngine.start(workflowId, { input: input })];
                    case 231:
                        runResult = _2.sent();
                        result_1 = {
                            content: [{
                                    type: "text",
                                    text: "Workflow ".concat(workflowId, " completed.\nRun ID: ").concat(runResult.id, "\nStatus: ").concat(runResult.status, "\nNode: ").concat(runResult.currentNode, "\nOutput: ").concat(JSON.stringify((_x = (_w = runResult.state) === null || _w === void 0 ? void 0 : _w.output) !== null && _x !== void 0 ? _x : runResult.state, null, 2).substring(0, 500))
                                }]
                        };
                        return [3 /*break*/, 233];
                    case 232:
                        e_9 = _2.sent();
                        result_1 = { content: [{ type: "text", text: "Workflow error: ".concat(e_9.message) }] };
                        return [3 /*break*/, 233];
                    case 233: return [3 /*break*/, 278];
                    case 234:
                        if (!(name === "list_workflows")) return [3 /*break*/, 235];
                        executions = this.workflowEngine.listExecutions();
                        if (executions.length === 0) {
                            result_1 = { content: [{ type: "text", text: 'No workflow executions. Use run_workflow to start a workflow.' }] };
                        }
                        else {
                            formatted = executions.map(function (e) { return "- ".concat(e.id, ": ").concat(e.workflowId, " [").concat(e.status, "] at ").concat(e.currentNode); }).join('\n');
                            result_1 = { content: [{ type: "text", text: "Workflow executions:\n".concat(formatted) }] };
                        }
                        return [3 /*break*/, 278];
                    case 235:
                        if (!(name === "workflow_status")) return [3 /*break*/, 236];
                        runId = args.run_id;
                        execution = this.workflowEngine.getExecution(runId);
                        if (!execution) {
                            result_1 = { content: [{ type: "text", text: "No workflow run found with ID: ".concat(runId) }] };
                        }
                        else {
                            result_1 = {
                                content: [{
                                        type: "text",
                                        text: "Workflow Run: ".concat(runId, "\nWorkflow: ").concat(execution.workflowId, "\nStatus: ").concat(execution.status, "\nCurrent Node: ").concat(execution.currentNode, "\nLast Updated: ").concat(execution.updatedAt)
                                    }]
                            };
                        }
                        return [3 /*break*/, 278];
                    case 236:
                        if (!(name === "approve_workflow")) return [3 /*break*/, 243];
                        runId = args.run_id;
                        approved = (_y = args.approved) !== null && _y !== void 0 ? _y : true;
                        _2.label = 237;
                    case 237:
                        _2.trys.push([237, 241, , 242]);
                        if (!approved) return [3 /*break*/, 239];
                        return [4 /*yield*/, this.workflowEngine.approve(runId)];
                    case 238:
                        _2.sent();
                        return [3 /*break*/, 240];
                    case 239:
                        this.workflowEngine.reject(runId, 'Rejected via approve_workflow tool');
                        _2.label = 240;
                    case 240:
                        result_1 = { content: [{ type: "text", text: approved ? "Approved workflow ".concat(runId) : "Rejected workflow ".concat(runId) }] };
                        return [3 /*break*/, 242];
                    case 241:
                        e_10 = _2.sent();
                        result_1 = { content: [{ type: "text", text: "Approval error: ".concat(e_10.message) }] };
                        return [3 /*break*/, 242];
                    case 242: return [3 /*break*/, 278];
                    case 243:
                        if (!(name === "execute_code")) return [3 /*break*/, 248];
                        code = args.code;
                        if (!!this.codeModeService.isEnabled()) return [3 /*break*/, 244];
                        result_1 = { content: [{ type: "text", text: 'Code Mode is disabled. Use enable_code_mode first.' }] };
                        return [3 /*break*/, 247];
                    case 244:
                        _2.trys.push([244, 246, , 247]);
                        return [4 /*yield*/, this.codeModeService.executeCode(code, args.context || {})];
                    case 245:
                        execResult = _2.sent();
                        if (execResult.success) {
                            result_1 = {
                                content: [{
                                        type: "text",
                                        text: "Execution successful (".concat(execResult.executionTime, "ms)\nTools called: ").concat(execResult.toolsCalled.join(', ') || 'none', "\nOutput:\n").concat(execResult.output || execResult.result || 'No output')
                                    }]
                            };
                        }
                        else {
                            result_1 = { content: [{ type: "text", text: "Execution failed: ".concat(execResult.error, "\nOutput: ").concat(execResult.output || 'none') }] };
                        }
                        return [3 /*break*/, 247];
                    case 246:
                        e_11 = _2.sent();
                        result_1 = { content: [{ type: "text", text: "Code execution error: ".concat(e_11.message) }] };
                        return [3 /*break*/, 247];
                    case 247: return [3 /*break*/, 278];
                    case 248:
                        if (!(name === "enable_code_mode")) return [3 /*break*/, 249];
                        this.codeModeService.enable();
                        result_1 = { content: [{ type: "text", text: 'Code Mode enabled. You can now execute code via execute_code.' }] };
                        return [3 /*break*/, 278];
                    case 249:
                        if (!(name === "disable_code_mode")) return [3 /*break*/, 250];
                        this.codeModeService.disable();
                        result_1 = { content: [{ type: "text", text: 'Code Mode disabled.' }] };
                        return [3 /*break*/, 278];
                    case 250:
                        if (!(name === "code_mode_status")) return [3 /*break*/, 251];
                        enabled = this.codeModeService.isEnabled();
                        registry = this.codeModeService.getRegistry();
                        toolCount = registry.getNames().length;
                        reduction = this.codeModeService.calculateContextReduction();
                        result_1 = {
                            content: [{
                                    type: "text",
                                    text: "Code Mode Status:\n- Enabled: ".concat(enabled, "\n- Registered tools: ").concat(toolCount, "\n- Context reduction: ").concat(reduction.reduction, "% (").concat(reduction.traditional, " \u2192 ").concat(reduction.codeMode, " chars)")
                                }]
                        };
                        return [3 /*break*/, 278];
                    case 251:
                        if (!(name === "list_code_tools")) return [3 /*break*/, 252];
                        registry = this.codeModeService.getRegistry();
                        tools = registry.getAll();
                        if (tools.length === 0) {
                            result_1 = { content: [{ type: "text", text: 'No tools registered in Code Mode.' }] };
                        }
                        else {
                            formatted = tools.map(function (t) { return "- ".concat(t.name, ": ").concat(t.description); }).join('\n');
                            result_1 = { content: [{ type: "text", text: "Code Mode Tools:\n".concat(formatted) }] };
                        }
                        return [3 /*break*/, 278];
                    case 252:
                        terminalTools = this.terminalService.getTools();
                        standardTool = __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], tools_1.FileSystemTools, true), terminalTools, true), tools_1.MemoryTools, true), tools_1.TunnelTools, true), tools_1.LogTools, true), tools_1.ConfigTools, true), tools_1.SearchTools, true), tools_1.ReaderTools, true), tools_1.WorktreeTools, true), tools_1.MetaTools, true), [WebSearchTool_js_1.WebSearchTool], false).find(function (t) { return t.name === name; });
                        if (!(standardTool && this.isToolWithHandler(standardTool))) return [3 /*break*/, 258];
                        return [4 /*yield*/, standardTool.handler(args)];
                    case 253:
                        result_1 = _2.sent();
                        if (!(name === 'read_file' && this.meshService && ((_1 = (_0 = (_z = result_1 === null || result_1 === void 0 ? void 0 : result_1.content) === null || _z === void 0 ? void 0 : _z[0]) === null || _0 === void 0 ? void 0 : _0.text) === null || _1 === void 0 ? void 0 : _1.includes('ENOENT')))) return [3 /*break*/, 257];
                        console.log("[Mesh Artifact] Local read missed for ".concat(args.path, ". Querying Swarm..."));
                        timeoutMs_1 = 2000;
                        reqPath_1 = args.path;
                        _2.label = 254;
                    case 254:
                        _2.trys.push([254, 256, , 257]);
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                var timeout = setTimeout(function () { return reject(new Error('Swarm Artifact Read Timeout')); }, timeoutMs_1);
                                var onMeshResponse = function (msg) {
                                    if (msg.type === MeshService_js_1.SwarmMessageType.ARTIFACT_READ_RESPONSE) {
                                        var res = msg.payload;
                                        if (res.path === reqPath_1) {
                                            clearTimeout(timeout);
                                            _this.meshService.removeListener('message', onMeshResponse);
                                            resolve(res.content);
                                        }
                                    }
                                };
                                _this.meshService.on('message', onMeshResponse);
                                _this.meshService.broadcast(MeshService_js_1.SwarmMessageType.ARTIFACT_READ_REQUEST, { path: reqPath_1 });
                            })];
                    case 255:
                        federatedContent = _2.sent();
                        // Successfully fetched from Swarm
                        result_1 = { content: [{ type: "text", text: federatedContent }] };
                        console.log("[Mesh Artifact] Successfully federated ".concat(reqPath_1, " from Swarm."));
                        return [3 /*break*/, 257];
                    case 256:
                        e_12 = _2.sent();
                        // Timeout or failure, keep original ENOENT result
                        console.log("[Mesh Artifact] Federation failed for ".concat(reqPath_1, ": ").concat(e_12.message));
                        return [3 /*break*/, 257];
                    case 257: return [3 /*break*/, 278];
                    case 258:
                        if (!metamcp_proxy_service_js_1.executeProxiedTool) return [3 /*break*/, 269];
                        _2.label = 259;
                    case 259:
                        _2.trys.push([259, 261, , 268]);
                        return [4 /*yield*/, (0, metamcp_proxy_service_js_1.executeProxiedTool)(name, args)];
                    case 260:
                        result_1 = _2.sent();
                        return [3 /*break*/, 268];
                    case 261:
                        proxyErr_1 = _2.sent();
                        if (!proxyErr_1.message.includes('Unknown tool')) return [3 /*break*/, 266];
                        _2.label = 262;
                    case 262:
                        _2.trys.push([262, 264, , 265]);
                        return [4 /*yield*/, this.router.callTool(name, args)];
                    case 263:
                        result_1 = _2.sent();
                        return [3 /*break*/, 265];
                    case 264:
                        e_13 = _2.sent();
                        throw new Error("MetaMCP Proxy tool '".concat(name, "' not found, and fallback router failed: ").concat(e_13.message));
                    case 265: return [3 /*break*/, 267];
                    case 266: throw new Error("MetaMCP Proxy execution failed: ".concat(proxyErr_1.message));
                    case 267: return [3 /*break*/, 268];
                    case 268: return [3 /*break*/, 278];
                    case 269:
                        _2.trys.push([269, 271, , 278]);
                        return [4 /*yield*/, this.mcpAggregator.executeTool(name, args)];
                    case 270:
                        result_1 = _2.sent();
                        return [3 /*break*/, 278];
                    case 271:
                        aggErr_1 = _2.sent();
                        if (!aggErr_1.message.includes('No provider found')) return [3 /*break*/, 276];
                        _2.label = 272;
                    case 272:
                        _2.trys.push([272, 274, , 275]);
                        return [4 /*yield*/, this.router.callTool(name, args)];
                    case 273:
                        result_1 = _2.sent();
                        return [3 /*break*/, 275];
                    case 274:
                        e_14 = _2.sent();
                        throw new Error("Tool execution failed: ".concat(e_14.message));
                    case 275: return [3 /*break*/, 277];
                    case 276: throw aggErr_1;
                    case 277: return [3 /*break*/, 278];
                    case 278:
                        // Broadcast Success
                        try {
                            this.auditService.log('TOOL_END', { tool: name, result: JSON.stringify(result_1).substring(0, 500), duration: Date.now() - startTime }, 'INFO');
                        }
                        catch (e) {
                            console.error("Audit Fail", e);
                        }
                        if (this.wssInstance) {
                            this.wssInstance.clients.forEach(function (c) {
                                if (c.readyState === 1)
                                    c.send(JSON.stringify({
                                        type: 'TOOL_CALL_END',
                                        id: callId,
                                        tool: name,
                                        success: true,
                                        duration: Date.now() - startTime,
                                        result: JSON.stringify(result_1).substring(0, 200) // Summarize
                                    }));
                            });
                        }
                        // ENGAGEMENT MODULE: Suggestion Trigger
                        if ((name === "read_file" || name === "view_file") && result_1) {
                            contentText = this.getFirstTextContent(result_1);
                            if (contentText) {
                                filePath = args.path || args.AbsolutePath;
                                this.suggestionService.processContext({
                                    type: 'file_read',
                                    path: filePath,
                                    content: contentText
                                }).catch(function (e) { return console.error("[SuggestionService] Trigger failed:", e); });
                            }
                        }
                        return [2 /*return*/, result_1];
                    case 279:
                        e_15 = _2.sent();
                        // Audit Error
                        try {
                            this.auditService.log('TOOL_END', { tool: name, error: e_15.message, duration: Date.now() - startTime }, 'ERROR');
                        }
                        catch (auditErr) {
                            console.error("Audit Fail", auditErr);
                        }
                        // Broadcast Error
                        if (this.wssInstance) {
                            this.wssInstance.clients.forEach(function (c) {
                                if (c.readyState === 1)
                                    c.send(JSON.stringify({
                                        type: 'TOOL_CALL_END',
                                        id: callId,
                                        tool: name,
                                        success: false,
                                        duration: Date.now() - startTime,
                                        result: e_15.message
                                    }));
                            });
                        }
                        // Return Error as Content (Don't throw, it kills the MCP stream)
                        return [2 /*return*/, {
                                isError: true,
                                content: [{ type: "text", text: "Error: ".concat(e_15.message) }]
                            }];
                    case 280: return [2 /*return*/];
                }
            });
        });
    };
    MCPServer.prototype.getNativeTools = function () {
        return __awaiter(this, void 0, void 0, function () {
            var internalTools, terminalTools, standardTools, skillTools, externalTools, aggregatedTools;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        internalTools = [
                            {
                                name: "router_status",
                                description: "Check the status of the HyperCode Router",
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
                                description: "Convert a research item into a functional HyperCode Skill (runbook)",
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
                                    type: "object",
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
                                name: "research_recursively",
                                description: "Perform deep, recursive research on a topic using sub-agents/sub-tasks.",
                                inputSchema: {
                                    type: "object",
                                    properties: {
                                        topic: { type: "string", description: "The main topic to research" },
                                        depth: { type: "number", description: "Depth of recursion (def: 2)" },
                                        breadth: { type: "number", description: "Breadth of related topics (def: 3)" }
                                    },
                                    required: ["topic"]
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
                            },
                            /*
                            // Phase 60: The Mesh tools
                            {
                                name: "swarm_broadcast",
                                description: "Broadcast a message to the HyperCode P2P Swarm",
                                inputSchema: {
                                    type: "object",
                                    properties: {
                                        type: { type: "string", description: "Message Type (TASK_OFFER, etc.)" },
                                        payload: { type: "object", description: "Payload data" }
                                    },
                                    required: ["type"]
                                }
                            }
                            */
                        ];
                        terminalTools = this.terminalService.getTools();
                        standardTools = __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], tools_1.FileSystemTools, true), terminalTools, true), tools_1.MemoryTools, true), tools_1.TunnelTools, true), tools_1.LogTools, true), tools_1.ConfigTools, true), tools_1.SearchTools, true), tools_1.ReaderTools, true), tools_1.WorktreeTools, true).map(function (t) { return ({
                            name: t.name,
                            description: t.description,
                            inputSchema: t.inputSchema
                        }); });
                        skillTools = this.skillRegistry.getSkillTools();
                        return [4 /*yield*/, this.router.listTools()];
                    case 1:
                        externalTools = _a.sent();
                        return [4 /*yield*/, this.mcpAggregator.listAggregatedTools()];
                    case 2:
                        aggregatedTools = _a.sent();
                        return [2 /*return*/, __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], internalTools, true), standardTools, true), skillTools, true), externalTools, true), aggregatedTools, true)];
                }
            });
        });
    };
    MCPServer.prototype.setupHandlers = function (serverInstance) {
        return __awaiter(this, void 0, void 0, function () {
            var nativeTools;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Initialize MetaMCP Controller which wraps the server
                        console.log("[MCPServer] Delegating tool handling to MetaMCPController...");
                        return [4 /*yield*/, this.getNativeTools()];
                    case 1:
                        nativeTools = _a.sent();
                        return [4 /*yield*/, MetaMCPController_js_1.MetaMCPController.getInstance().initialize(serverInstance, nativeTools, function (name, args) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.lastUserActivityTime = Date.now();
                                            return [4 /*yield*/, this.executeTool(name, args)];
                                        case 1: return [2 /*return*/, _a.sent()];
                                    }
                                });
                            }); })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MCPServer.prototype.start = async function () {
        console.error("[MCPServer] Loading Skills...");
        this.mcpAggregator.initialize().catch(function (e) { return console.error("[MCPServer] Aggregator Init Failed:", e); });
        this.autoTestService.repoGraph.buildGraph().catch(function (e) { return console.error("Graph build failed", e); });

        console.error("[MCPServer] 🚀 HyperCode Core ready.");
        console.error("[MCPServer] Preparing request handlers...");
        await this.serverSetupPromise;

        console.error("[MCPServer] Connecting Stdio...");
        var stdioTransport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(stdioTransport);
        console.error("HyperCode Core: Stdio Transport Active");

        if (this.wsServer && !this.wssInstance) {
            console.error("[MCPServer] Starting WebSocket Server...");
            var PORT_2 = 3001;
            var _this = this;
            var httpServer = http_1.default.createServer(async function (req, res) {
                if (req.url === '/health') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        status: 'online',
                        uptime: process.uptime(),
                        timestamp: Date.now(),
                        version: '0.1.0'
                    }));
                    return;
                }

                if (req.url === '/mcp/servers') {
                    var servers = await _this.mcpAggregator.listServers();
                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(JSON.stringify(servers));
                    return;
                }

                if (req.method === 'POST') {
                    var body_1 = '';
                    req.on('data', function (chunk) { return body_1 += chunk; });
                    req.on('end', async function () {
                        try {
                            var data = JSON.parse(body_1);
                            res.writeHead(200, {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            });

                            if (req.url === '/director.chat') {
                                var result = await _this.director.executeTask(data.message);
                                res.end(JSON.stringify({ result: { data: result } }));
                                return;
                            }

                            if (req.url === '/tool/execute') {
                                var toolResult = await _this.executeTool(data.name, data.args);
                                res.end(JSON.stringify({ result: { data: toolResult } }));
                                return;
                            }

                            res.writeHead(404);
                            res.end(JSON.stringify({ error: 'Endpoint not found' }));
                        }
                        catch (e) {
                            res.writeHead(500, {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            });
                            res.end(JSON.stringify({ error: e.message }));
                        }
                    });
                    return;
                }

                res.writeHead(404);
                res.end();
            });

            var wss_1 = new ws_1.WebSocketServer({ server: httpServer });
            this.wssInstance = wss_1;

            httpServer.on('error', function (err) {
                console.error("[HyperCode Core] ❌ WebSocket Server Error (Port ".concat(PORT_2, "):"), err.message);
            });

            httpServer.listen(PORT_2, function () {
                console.error("HyperCode Core: WebSocket Transport Active on ws://localhost:".concat(PORT_2));
            });

            wss_1.on('connection', function (ws) {
                ws.on('message', function (data) {
                    try {
                        var msg = JSON.parse(data.toString());
                        if (msg.requestId && _this.pendingRequests.has(msg.requestId)) {
                            var resolve = _this.pendingRequests.get(msg.requestId);
                            if (resolve) {
                                resolve(msg.type === 'STATUS_UPDATE' ? msg.status : msg);
                                _this.pendingRequests.delete(msg.requestId);
                            }
                        }
                    }
                    catch (_a) {
                    }
                });
            });
        }
        else {
            console.error("[MCPServer] Skipping WebSocket (No wsServer instance).");
        }

        console.error("[MCPServer] Connecting to Supervisor...");
        try {
            console.error("[MCPServer] DEBUG __dirname: ".concat(__dirname));
            var rootDir = this.findMonorepoRoot(__dirname);
            console.error("[MCPServer] DEBUG rootDir: ".concat(rootDir));
            if (rootDir) {
                var supervisorPath = path_1.default.join(rootDir, 'packages', 'hypercode-supervisor', 'dist', 'index.js');
                console.error("[MCPServer] Supervisor Path Resolved: ".concat(supervisorPath));
                await this.router.connectToServer('hypercode-supervisor', 'node', [supervisorPath]);
                console.error("HyperCode Core: Connected to Supervisor at ".concat(supervisorPath));

                var workspacePath = path_1.default.join(rootDir, 'external', 'mcp-servers', 'workspace', 'workspace-server', 'dist', 'index.js');
                console.error("[MCPServer] Google Workspace Server Path: ".concat(workspacePath));
                if (fs_1.default.existsSync(workspacePath)) {
                    await this.router.connectToServer('google-workspace', 'node', [workspacePath]);
                    console.error("HyperCode Core: Connected to Google Workspace Server (GMail/Calendar)");
                }
            }
            else {
                console.error("[MCPServer] Failed to locate Monorepo Root. Skipping Supervisor.");
            }
        }
        catch (e) {
            console.error("HyperCode Core: Failed to connect to Supervisor. Native automation disabled.", e.message);
        }

        if (this.wsServer && this.wssInstance) {
            console.error("[MCPServer] Connecting internal WS transport...");
            if (this.wsServerSetupPromise) {
                await this.wsServerSetupPromise;
            }
            var wsTransport = new WebSocketServerTransport_js_1.WebSocketServerTransport(this.wssInstance);
            await this.wsServer.connect(wsTransport);
        }

        console.error("[MCPServer] Start Complete.");
    };
    MCPServer.prototype.findMonorepoRoot = function (startDir) {
        var current = startDir;
        var root = path_1.default.parse(current).root;
        while (current !== root) {
            if (fs_1.default.existsSync(path_1.default.join(current, 'turbo.json'))) {
                return current;
            }
            current = path_1.default.dirname(current);
        }
        return null;
    };
    return MCPServer;
}());
exports.MCPServer = MCPServer;
