# Version

0.9.10

## Maintenance Guide: Where to Update
When bumping the version of Borg, the following locations must be synchronized to ensure consistency across the CLI, Web Dashboard, and internal packages:

### 1. Root Identity Files
- `VERSION` (Plain text version string)
- `VERSION.md` (This file)

### 2. Core Package Files
- `package.json` (Root)
- `apps/web/package.json`
- `apps/borg-extension/package.json`
- `packages/core/package.json`
- `packages/cli/package.json`
- `packages/ai/package.json`
- `packages/memory/package.json`
- `packages/types/package.json`
- `packages/ui/package.json`
- `packages/mcp-client/package.json`
- `packages/mcp-registry/package.json`
- `packages/mcp-router-cli/package.json`
- `packages/supervisor-plugin/package.json`
- `packages/tools/package.json`
- `packages/tsconfig/package.json`

### 3. UI Fallback & Branding
- `apps/web/src/components/Navigation.tsx` (Default `versionLabel` fallback)
- `apps/web/src/app/dashboard/dashboard-home-view.tsx` (Branding badge version)
- `apps/web/src/components/mcp/nav-config.ts` (Sidebar section title)
- `apps/web/src/components/ContextHealthWidget.tsx` (Header badge)

### 4. CLI & Startup
- `packages/cli/src/version.ts` (Fallback string in `readCanonicalVersion`)
- `packages/core/src/MCPServer.ts` (Version reported in `initializeServer`)
- `packages/core/src/services/AgentMemoryService.ts` (Version in `handoffSession` artifacts)
