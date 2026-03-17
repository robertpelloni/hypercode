# AI Master Instructions (Borg Protocol v1.4)

## 1. Core Protocol
This repository (`@borg/core`) is the central nervous system for a multi-agent framework.
All AI agents (Claude, Gemini, OpenCode) must adhere to these rules:

1.  **Merge & Sync:** always merge feature branches and sync submodules before starting complex tasks.
2.  **Dashboard First:** Use `/dashboard` to check system status (Billing, Architecture, Traffic) before asking the user.
3.  **Tooling:** Use `mcp_registry.json` (via `McpmRegistry`) to discover tools. Do not hallucinate capabilities.
4.  **Versioning:** Increment `package.json` version and update `CHANGELOG.md` exactly once per session/feature.

## 2. Agent Roles & Architecture
The system is composed of several specialized agents/submodules:

-   **Borg (This Repo):** The Orchestrator and Core Framework. Manages `MCPServer`, `Director`, and `Memory`.
-   **Jules (`external/jules-autopilot`):** Google's Agent Framework (delegated for specific tasks).
-   **OpenCode (`external/opencode-autopilot`):** Code-gen Specialist (delegated for heavy refactoring).
-   **Awesome MCP (`references/awesome-mcp`):** A read-only dataset of available MCP servers.

## 3. Directory Structure
-   `packages/core`: The brain (Node.js/TypeScript).
-   `apps/web`: The visual cortex (Next.js Dashboard).
-   `external/*`: Partner agents (Git Submodules).
-   `references/*`: Datasets and Indexes.

## 4. Working with Submodules
To update submodules:
```bash
git submodule update --init --recursive hiding
git submodule foreach git pull origin main
```

## 5. Skills & Memory
-   **Skills:** Located in `packages/core/src/skills`.
-   **Memory:** `GraphMemory` (Cognee-like) + `VectorStore` (LanceDB).
-   **Registry:** Dynamic tool lookup via `McpmRegistry`.

## 6. Testing & Validation
-   Always run `pnpm build` in `apps/web` to verify UI changes.
-   Use `borg doctor` (or `packages/cli` debug scripts) to verify connectivity.
