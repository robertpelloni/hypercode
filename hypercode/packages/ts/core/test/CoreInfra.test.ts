import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MCPServer } from '../src/MCPServer.js';
import path from 'path';

// Mock external packages to prevent deep imports from failing
vi.mock('@hypercode/ai', () => ({
    ModelSelector: class { constructor() { } },
    LLMService: class { constructor() { } }
}));

vi.mock('@hypercode/agents', () => ({
    Director: class {
        constructor() {
            // @ts-ignore
            this.startAutoDrive = async () => { };
        }
    },
    CouncilRole: { CRITIC: 'CRITIC', ARCHITECT: 'ARCHITECT', META_ARCHITECT: 'META_ARCHITECT' }
}));

vi.mock('../src/services/MetricsService.js', () => ({
    MetricsService: class { constructor() { } startMonitoring() { } }
}));

vi.mock('@hypercode/tools', () => ({
    TerminalService: class { constructor() { this.getTools = () => []; } }, // Must return array
    PermissionManager: class { constructor() { } checkPermission() { return true; } },
    AuditService: class { constructor() { } log() { } },
    MetricsService: class { constructor() { } startMonitoring() { } },
    ShellService: class { constructor() { } },
    ProcessRegistry: class { constructor() { } },
    InputTools: class { constructor() { } },
    SystemStatusTool: class { constructor() { } },
    ChainExecutor: class { constructor() { } },
    FileSystemTools: [],
    MemoryTools: [],
    TunnelTools: [],
    ConfigTools: [],
    LogTools: [],
    SearchTools: [],
    ReaderTools: [],
    WorktreeTools: [],
    MetaTools: [],
    TerminalTools: [], // Added missing export suspected to be cause
    McpmInstaller: class { constructor() { } }
}));

// Mock local services to avoid side effects
vi.mock('../src/services/LSPService.js', () => ({
    LSPService: class {
        constructor() { }
        searchSymbols(query) { return [{ name: 'TestSymbol', kind: 1, location: { uri: 'file://test.ts', range: {} } }]; }
        async goToDefinition(file, line, char) { return { uri: 'file://def.ts', range: {} }; }
        async findReferences(file, line, char) { return [{ uri: 'file://ref.ts', range: {} }]; }
    }
}));

vi.mock('../src/services/CodeModeService.js', () => ({
    CodeModeService: class {
        constructor() { }
        async executeCode(code) { return { success: true, result: 'Executed', output: 'Log output' }; }
    }
}));

vi.mock('../src/services/PlanService.js', () => ({
    PlanService: class {
        constructor() { }
        enterPlanMode() { }
        enterBuildMode() { }
        proposeChange(file, content) { return { id: 'diff_123' }; }
        getStatus() { return 'Mode: PLAN\nDiff Sandbox Summary:'; }
    }
}));

vi.mock('../src/security/PolicyService.js', () => ({
    PolicyService: class {
        check() { return { allowed: true }; }
    }
}));

vi.mock('../src/skills/SkillRegistry.js', () => ({
    SkillRegistry: class {
        constructor() { }
        setMasterIndexPath() { }
    }
}));

vi.mock('../src/skills/SkillAssimilationService.js', () => ({
    SkillAssimilationService: class { constructor() { } }
}));

vi.mock('../src/orchestrator/WorkflowEngine.js', () => ({
    WorkflowEngine: class { constructor() { } }
}));

// Mock ALL other services to prevent instantiation errors
vi.mock('../src/context/ContextManager.js', () => ({ ContextManager: class { constructor() { } } }));
vi.mock('../src/services/SymbolPinService.js', () => ({ SymbolPinService: class { constructor() { } } }));
vi.mock('../src/services/AutoDevService.js', () => ({ AutoDevService: class { constructor() { } } }));
vi.mock('../src/services/MemoryManager.js', () => ({ MemoryManager: class { constructor() { } } }));
vi.mock('../src/suggestions/SuggestionService.js', () => ({ SuggestionService: class { constructor() { } } }));
vi.mock('../src/prompts/PromptRegistry.js', () => ({ PromptRegistry: class { constructor() { } } }));
vi.mock('../src/tools/WebSearchTool.js', () => ({ WebSearchTool: class { constructor() { } } }));
vi.mock('../src/tools/DiagnosticTools.js', () => ({ DiagnosticTools: class { constructor() { } } }));
vi.mock('../src/tools/LSPTools.js', () => ({ LSPTools: class { constructor() { } } }));
vi.mock('../src/agents/GeminiAgent.js', () => ({ GeminiAgent: class { constructor() { } } }));
vi.mock('../src/agents/ClaudeAgent.js', () => ({ ClaudeAgent: class { constructor() { } } }));
vi.mock('../src/agents/MetaArchitectAgent.js', () => ({ MetaArchitectAgent: class { constructor() { } } }));
vi.mock('../src/config/ConfigManager.js', () => ({ ConfigManager: class { constructor() { this.loadConfig = () => ({}); this.saveConfig = () => { }; } } }));
vi.mock('../src/services/AutoTestService.js', () => ({ AutoTestService: class { constructor() { } } }));
vi.mock('../src/services/ShellService.js', () => ({ ShellService: class { constructor() { } } }));
vi.mock('../src/security/SandboxService.js', () => ({ SandboxService: class { constructor() { } } }));
vi.mock('../src/orchestrator/SquadService.js', () => ({ SquadService: class { constructor() { } } }));
vi.mock('../src/orchestrator/GitWorktreeManager.js', () => ({ GitWorktreeManager: class { constructor() { } } }));
vi.mock('../src/security/AuditService.js', () => ({ AuditService: class { constructor() { this.log = () => { }; } } }));
vi.mock('../src/services/GitService.js', () => ({ GitService: class { constructor() { } } }));
vi.mock('../src/services/ResearchService.js', () => ({ ResearchService: class { constructor() { } } }));
vi.mock('../src/services/HealerService.js', () => ({ HealerService: class { constructor() { } } }));
vi.mock('../src/services/MetricsService.js', () => ({ MetricsService: class { constructor() { } } }));
vi.mock('../src/services/AgentMemoryService.js', () => ({ AgentMemoryService: class { constructor() { } } }));
vi.mock('../src/agents/SpawnerService.js', () => ({ SpawnerService: class { constructor() { } } }));
vi.mock('../src/commands/CommandRegistry.js', () => ({ CommandRegistry: class { constructor() { this.register = () => { }; } } }));
vi.mock('../src/commands/lib/GitCommands.js', () => ({ GitCommand: class { constructor() { } } }));
vi.mock('../src/commands/lib/SystemCommands.js', () => ({ HelpCommand: class { constructor() { } }, VersionCommand: class { constructor() { } }, DirectorCommand: class { constructor() { } } }));
vi.mock('../src/commands/lib/ContextCommands.js', () => ({ ContextCommand: class { constructor() { } } }));
vi.mock('../src/commands/lib/WorkflowCommands.js', () => ({ UndoCommand: class { constructor() { } }, DiffCommand: class { constructor() { } }, StashCommand: class { constructor() { } }, FixCommand: class { constructor() { } } }));
vi.mock('../src/services/KnowledgeService.js', () => ({ KnowledgeService: class { constructor() { } } }));
vi.mock('../src/skills/McpmInstaller.js', () => ({ McpmInstaller: class { constructor() { } } }));
vi.mock('../src/orchestrator/SystemWorkflows.js', () => ({
    registerSystemWorkflows: () => { }
}));

describe('Core Infrastructure Tools (Phase 20)', () => {
    let server: MCPServer;

    beforeEach(() => {
        // Reset mocks if needed, but vi.mock handles instantiation fresh usually or we rely on class references
        server = new MCPServer({ skipWebsocket: true, skipAutoDrive: true });

        // Manually enable permission for testing
        // @ts-ignore
        server.permissionManager = {
            checkPermission: () => 'ALLOWED',
            autonomyLevel: 'high'
        };
    });

    it('should execute lsp_symbol_search', async () => {
        const result = await server.executeTool('lsp_symbol_search', { query: 'Test' });
        const content = JSON.parse(result.content[0].text);
        expect(content[0].name).toBe('TestSymbol');
    });

    it('should execute lsp_definition', async () => {
        const result = await server.executeTool('lsp_definition', { file: 'test.ts', line: 10, char: 5 });
        const content = JSON.parse(result.content[0].text);
        expect(content.uri).toBe('file://def.ts');
    });

    it('should execute code_mode_execute', async () => {
        const result = await server.executeTool('code_mode_execute', { code: 'console.log("Hello")' });
        const content = JSON.parse(result.content[0].text);
        expect(content.success).toBe(true);
        expect(content.result).toBe('Executed');
    });

    it('should execute plan_mode_switch', async () => {
        const result = await server.executeTool('plan_mode_switch', { mode: 'BUILD' });
        expect(result.content[0].text).toContain('Switched to BUILD mode');
    });

    it('should execute plan_mode_stage', async () => {
        const result = await server.executeTool('plan_mode_stage', { file: 'src/index.ts', content: 'new content' });
        expect(result.content[0].text).toContain('Staged changes for src/index.ts');
    });

    it('should execute plan_mode_status', async () => {
        const result = await server.executeTool('plan_mode_status', {});
        expect(result.content[0].text).toContain('Mode: PLAN');
    });
});
