"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminProcedure = exports.publicProcedure = exports.t = void 0;
exports.getMcpServer = getMcpServer;
exports.getWorkflowEngine = getWorkflowEngine;
exports.getWorkflowDefinitions = getWorkflowDefinitions;
exports.getAutoTestService = getAutoTestService;
exports.getHealerService = getHealerService;
exports.getGitService = getGitService;
exports.getPermissionManager = getPermissionManager;
exports.getDirectorRuntime = getDirectorRuntime;
exports.getAuditService = getAuditService;
exports.getDarwinService = getDarwinService;
exports.getCouncilOrchestrator = getCouncilOrchestrator;
exports.getCouncilService = getCouncilService;
exports.getMemoryManager = getMemoryManager;
exports.getAgentMemoryService = getAgentMemoryService;
exports.getSymbolPinService = getSymbolPinService;
exports.getConfigManager = getConfigManager;
exports.getCommandRegistry = getCommandRegistry;
exports.getContextManager = getContextManager;
exports.getAutoDevService = getAutoDevService;
exports.getShellService = getShellService;
exports.getEventBus = getEventBus;
exports.getSuggestionService = getSuggestionService;
exports.getSquadService = getSquadService;
exports.getSessionManager = getSessionManager;
exports.getLLMService = getLLMService;
exports.getKnowledgeService = getKnowledgeService;
exports.getDeepResearchService = getDeepResearchService;
exports.getResearchService = getResearchService;
exports.getProjectTracker = getProjectTracker;
exports.getLspService = getLspService;
exports.getMcpAggregator = getMcpAggregator;
exports.getSubmoduleService = getSubmoduleService;
exports.getSkillRegistry = getSkillRegistry;
exports.getSkillAssimilationService = getSkillAssimilationService;
exports.getBrowserService = getBrowserService;
exports.getMarketplaceService = getMarketplaceService;
var server_1 = require("@trpc/server");
exports.t = server_1.initTRPC.create();
/**
 * Reason: strict catch variables are `unknown`, so direct `.message` access is unsafe.
 * What: narrows unknown error values into a stable string message.
 * Why: preserves existing authorization branching while removing broad catch typing.
 */
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return '';
}
// Mock RBAC Middleware
var isAdmin = exports.t.middleware(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var config, message;
    var next = _b.next, ctx = _b.ctx;
    return __generator(this, function (_c) {
        // In a real app, check ctx.user.role via JWT/Session
        // For local desktop app, we default to ADMIN unless config says 'demo_mode'
        try {
            config = getMcpServer().directorConfig;
            if (config === null || config === void 0 ? void 0 : config.demo_mode) {
                throw new Error("UNAUTHORIZED: Demo Mode enabled. Action restricted.");
            }
        }
        catch (error) {
            message = getErrorMessage(error);
            if (message.startsWith("UNAUTHORIZED"))
                throw error;
            // Else ignore (server missing)
        }
        return [2 /*return*/, next()];
    });
}); });
exports.publicProcedure = exports.t.procedure;
exports.adminProcedure = exports.t.procedure.use(isAdmin);
/**
 * Typed accessor for the global MCPServer instance.
 * Uses the global declaration from MCPServer.ts.
 */
function getMcpServer() {
    var server = global.mcpServerInstance;
    if (!server)
        throw new Error("MCPServer instance not found");
    return server;
}
function getWorkflowEngine() {
    var engine = getMcpServer().workflowEngine;
    return (engine !== null && engine !== void 0 ? engine : null);
}
function getWorkflowDefinitions(engine) {
    var maybeMap = engine.workflows;
    if (!maybeMap)
        return [];
    return Array.from(maybeMap.values());
}
function getAutoTestService() {
    return getMcpServer().autoTestService;
}
function getHealerService() {
    return getMcpServer().healerService;
}
function getGitService() {
    return getMcpServer().gitService;
}
function getPermissionManager() {
    return getMcpServer().permissionManager;
}
function getDirectorRuntime() {
    return getMcpServer().director;
}
function getAuditService() {
    return getMcpServer().auditService;
}
function getDarwinService() {
    return getMcpServer().darwinService;
}
function getCouncilOrchestrator() {
    return getMcpServer().council;
}
function getCouncilService() {
    return getMcpServer().councilService;
}
function getMemoryManager() {
    return getMcpServer().memoryManager;
}
function getAgentMemoryService() {
    return getMcpServer().agentMemoryService;
}
function getSymbolPinService() {
    return getMcpServer().symbolPinService;
}
function getConfigManager() {
    return getMcpServer().configManager;
}
function getCommandRegistry() {
    return getMcpServer().commandRegistry;
}
function getContextManager() {
    return getMcpServer().contextManager;
}
function getAutoDevService() {
    return getMcpServer().autoDevService;
}
function getShellService() {
    return getMcpServer().shellService;
}
function getEventBus() {
    return getMcpServer().eventBus;
}
function getSuggestionService() {
    return getMcpServer().suggestionService;
}
function getSquadService() {
    return getMcpServer().squadService;
}
function getSessionManager() {
    return getMcpServer().sessionManager;
}
function getLLMService() {
    return getMcpServer().llmService;
}
function getKnowledgeService() {
    return getMcpServer().knowledgeService;
}
function getDeepResearchService() {
    return getMcpServer().deepResearchService;
}
function getResearchService() {
    return getMcpServer().researchService;
}
function getProjectTracker() {
    return getMcpServer().projectTracker;
}
function getLspService() {
    return getMcpServer().lspService;
}
function getMcpAggregator() {
    return getMcpServer().mcpAggregator;
}
function getSubmoduleService() {
    return getMcpServer().submoduleService;
}
function getSkillRegistry() {
    return getMcpServer().skillRegistry;
}
function getSkillAssimilationService() {
    return getMcpServer().skillAssimilationService;
}
function getBrowserService() {
    return getMcpServer().browserService;
}
/*
export function getMeshService(): MeshServiceRuntime | undefined {
    return getMcpServer().meshService as MeshServiceRuntime | undefined;
}
*/
function getMarketplaceService() {
    return getMcpServer().marketplaceService;
}
