# PROJECT STRUCTURE

## Repository Layout
```
.
├── apps/             # Monorepo applications
│   └── web/          # Next.js Dashboard (Frontend)
├── packages/
│   ├── core/         # Borg Background Service (Backend)
│   ├── ui/           # Shared React Component Library
│   ├── cli/          # Universal Harness CLI
│   └── types/        # Shared TypeScript definitions
├── agents/           # JSON agent definitions & specialized squads
├── multi-agent/      # Multi-agent orchestration frameworks (Reference)
├── cli-harnesses/    # Competing AI coding CLI submodules (Benchmarking)
├── mcp-servers/      # Local MCP server configurations
├── mcp-hubs/         # MCP aggregation and registry submodules
├── mcp-routers/      # MCP proxy and gateway implementations
├── skills/           # Universal skills library (Markdown)
├── prompts/          # System prompts, templates, and tutorials
├── memory/           # Memory plugin implementations & refs
├── external/         # Categorized external research & plugins
├── submodules/       # Active core infrastructure submodules
└── docs/             # Technical specifications and audits
```

## Module Interactions
1.  **Harness Flow:** User input -> `ArchitectMode` -> `RepoMapService` -> Reasoning Model -> `EditPlan` -> Implementation Model -> `applyDiffs` -> `LspManager` (Verification).
2.  **MCP Flow:** `HubServer` -> `McpProxyManager` -> `TrafficInspectionService` -> `McpRouter` -> Local/Remote MCP Server.
3.  **Governance Flow:** `SecretManager` + `ToolInventoryService` -> `CoreService` -> Dashboard UI.
