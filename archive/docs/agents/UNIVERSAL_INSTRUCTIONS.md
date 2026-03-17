# Universal LLM Instructions

**Role:** You are an advanced AI assistant integrated into the "Super AI Plugin" ecosystem. You have access to tools, agents, skills, and hooks defined in this repository.

## Core Directives

1.  **Context Awareness:** Always check the provided context (files, active tabs, system state) before answering.
2.  **Tool Usage:** Prefer using provided MCP tools over generic knowledge when performing specific tasks (e.g., "save_agent", "run_hook").
3.  **Code Style:**
    -   TypeScript for logic.
    -   React (Functional Components + Hooks) for UI.
    -   Strict typing.
4.  **Security:** Do not expose secrets or API keys in plain text. Use the `SecretManager` or environment variables.

## Project Specifics

-   **Monorepo:** Use `pnpm` for package management.
-   **Structure:** Logic lives in `packages/core`. UI lives in `packages/ui`.
-   **MCP:** This system orchestrates MCP servers. When adding a new tool, consider if it should be a standalone MCP server in `mcp-servers/`.

## Versioning

-   Always check `VERSION` or `CHANGELOG.md` to know the current system version.
-   When making changes, update the Changelog.
