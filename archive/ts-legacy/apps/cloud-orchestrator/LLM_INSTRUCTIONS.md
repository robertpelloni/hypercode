# Universal LLM Instructions

**Version**: 3.0.0
**Last Updated**: 2026-02-26

This document is the **single source of truth** for all AI agents (Claude, Gemini, GPT, Copilot, Antigravity, Jules, etc.) working on the Jules Autopilot project.

## 🚨 Critical Protocols

1.  **Safety First**: NEVER run destructive commands (`rm -rf`, `DROP TABLE`) without explicit confirmation.
2.  **Git Workflow**:
    *   **Submodules**: Always run `git submodule update --init --recursive` when starting a new session.
    *   **Commits**: Use semantic commit messages (e.g., `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
    *   **Versioning**: `VERSION.md` is the **single canonical version source**. After updating it, run `node scripts/update-version.js` to propagate to `package.json` and `lib/version.ts`. Every build/feature should bump the version.
    *   **Feature Branches**: Merge local feature branches (especially those created by Jules or other AI tools) into `main` regularly. Resolve conflicts intelligently — never lose features or cause regressions.
    *   **Push Regularly**: Commit and push after each major step. Do not accumulate large diffs.
3.  **No Hallucinations**: Do not invent APIs, endpoints, or functions. Check `lib/`, `types/`, and `app/api/` for existing code before creating new abstractions.
4.  **Autonomy**:
    *   Proceed with tasks autonomously. Do not pause for confirmation unless facing a destructive or ambiguous decision.
    *   Commit and push after each major milestone.
    *   Run `pnpm lint` and `pnpm run typecheck` after changes. Fix all errors before committing.
5.  **Documentation**:
    *   Keep `ROADMAP.md`, `TODO.md`, and `CHANGELOG.md` updated after every feature.
    *   Document all submodules in `docs/SUBMODULES.md`.
    *   Update `HANDOFF.md` at the end of each session with a summary of what was done and what remains.
    *   Comment code in depth: what it does, why it's there, why it's designed that way, relevant findings, side effects, bugs, optimizations, and alternate approaches. If code is self-explanatory, leave it bare.
6.  **Changelog & Version Protocol**:
    1.  Read `VERSION.md`.
    2.  Increment: Patch for bugs, Minor for features, Major for breaking changes.
    3.  Update `VERSION.md` with the new version string.
    4.  Run `node scripts/update-version.js` to sync across `package.json` and `lib/version.ts`.
    5.  Add a dated entry to `CHANGELOG.md` with `### Added`, `### Changed`, `### Fixed` sections.
    6.  Commit with message: `chore: bump version to X.Y.Z`.
7.  **Testing**: Run `pnpm run test` after code changes. All tests must pass before committing.

## 📂 Project Structure

```
jules-autopilot/
├── app/                    # Next.js App Router (Pages & API Routes)
│   ├── api/                # Backend API endpoints
│   │   ├── auth/           # NextAuth OAuth handlers
│   │   ├── debate/         # Council Debate orchestration
│   │   ├── jules/          # Jules AI agent communication
│   │   ├── plugins/        # Plugin marketplace, execution, ingestion
│   │   ├── review/         # Code review orchestration
│   │   ├── routing/        # Intelligent provider routing & simulation
│   │   ├── settings/       # Session keeper configuration
│   │   ├── supervisor/     # Supervisor LLM endpoint
│   │   ├── system/         # System status & submodule introspection
│   │   ├── templates/      # Prompt template CRUD
│   │   └── transfers/      # Cross-provider session transfers
│   ├── dashboard/          # Dashboard pages (debates, providers, submodules)
│   ├── login/              # Authentication page
│   ├── plugins/            # Plugin marketplace UI
│   ├── settings/           # Settings pages (account, general)
│   ├── system/             # System internals & submodule detail pages
│   ├── templates/          # Template management UI
│   └── terminal-demo/      # Integrated terminal demo
├── apps/                   # Monorepo workspace apps
│   └── cli/                # @jules/cli package
├── components/             # React components (ShadCN UI + custom)
│   ├── submodules/         # Submodule dashboard components
│   └── ui/                 # ShadCN UI primitives
├── external/               # Git submodules (reference implementations)
├── hooks/                  # React custom hooks
├── jules-sdk-reference/    # Python SDK reference submodule
├── lib/                    # Core business logic
│   ├── api/                # API utilities (error handling)
│   ├── crypto/             # Cryptographic utilities (Ed25519 signing)
│   ├── jules/              # Jules API client
│   ├── routing/            # Intelligent provider routing engine & telemetry
│   ├── schemas/            # Zod validation schemas
│   └── stores/             # Zustand state stores
├── packages/               # Monorepo workspace packages
│   └── shared/             # @jules/shared (shared types & orchestration)
├── prisma/                 # Database schema & migrations
├── public/                 # Static assets
├── scripts/                # Build & maintenance scripts
├── server/                 # Session Keeper Daemon (Bun/Hono)
├── terminal-server/        # Terminal WebSocket server (node-pty)
├── tests/                  # Additional test files
└── types/                  # Global TypeScript type definitions
```

## 📦 Submodules

| Name | Path | Source | Description |
| :--- | :--- | :--- | :--- |
| **Jules SDK Reference** | `jules-sdk-reference` | AsyncFuncAI/jules-agent-sdk-python | Python SDK for Jules agent interactions |
| **Jules Awesome List** | `external/jules-awesome-list` | google-labs-code/jules-awesome-list | Curated list of Jules resources |
| **Jules MCP Server** | `external/jules-mcp-server` | CodeAgentBridge/jules-mcp-server | MCP server for Jules integration |
| **Jules MCP (Alt)** | `external/jules_mcp` | GatienBoquet/jules_mcp | Alternative MCP implementation |
| **Google Jules MCP** | `external/google-jules-mcp` | samihalawa/google-jules-mcp | Google-specific MCP integration |
| **Gemini CLI Jules** | `external/gemini-cli-jules` | gemini-cli-extensions/jules | Gemini CLI extension for Jules |
| **Orchestration** | `external/antigravity-jules-orchestration` | Scarmonit/antigravity-jules-orchestration | Multi-agent orchestration system |
| **Jules Action** | `external/jules-action` | google-labs-code/jules-action | GitHub Action for Jules automation |
| **Jules Task Queue** | `external/jules-task-queue` | iHildy/jules-task-queue | Task queue management for Jules |
| **Jules System Prompt** | `external/jules-system-prompt` | DiaAviLinden/Jules-system-prompt | Reference system prompts |

**Rule**: Check submodule versions via `git submodule status`.

## 🛠️ Development Standards

*   **Stack**: Next.js 16, React 19, TypeScript (strict), Tailwind CSS v3, Prisma (SQLite/LibSQL), ShadCN UI.
*   **Package Manager**: **pnpm** (never `npm`). Use `pnpm dlx` instead of `npx` for one-off scripts.
*   **State Management**: Zustand (`lib/stores`) for client-side state.
*   **API Layer**: Next.js Route Handlers (`app/api`). Validate all inputs with Zod.
*   **Backend Daemon**: Bun + Hono (`server/`) for the Session Keeper background process.
*   **Auth**: NextAuth v5 (OAuth via GitHub). JWT session strategy with workspace isolation.
*   **Database**: Prisma ORM with SQLite. Schema changes via `npx prisma db push`.
*   **Styling**: Mobile-first, dark mode default. Use Tailwind utility classes primarily.
*   **Testing**: Jest for unit/integration tests. Playwright for E2E. Tests live beside source files.
*   **Linting**: ESLint. Run `pnpm lint` before every commit.
*   **Build Verification**: Run `pnpm lint; pnpm run typecheck; pnpm run test` as the feedback loop.

## 🤖 Agent-Specific Overrides

Each model has its own `<MODEL>.md` file in the project root that references this document and adds model-specific guidance. See: `CLAUDE.md`, `GEMINI.md`, `GPT.md`, `AGENTS.md`, `copilot-instructions.md`.
