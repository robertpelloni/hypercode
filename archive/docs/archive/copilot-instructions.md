# Copilot Instructions — Hypercode Project

> **NOTICE**: Primary instructions are in [`docs/UNIVERSAL_LLM_INSTRUCTIONS.md`](../../docs/UNIVERSAL_LLM_INSTRUCTIONS.md). This file is optimized for GitHub Copilot in VS Code.

## Context
- **Project**: Hypercode — The Neural Operating System
- **Language**: TypeScript (Node.js ESM, strict mode)
- **Build**: pnpm + Turborepo monorepo
- **Test**: Vitest
- **Validation**: Zod schemas for all inputs
- **Architecture**: MCP Server + tRPC + Express + WebSocket

## Code Generation Guidelines
- Write strictly typed TypeScript. Avoid `any`.
- Prefer `zod` for runtime validation.
- Use ESM imports with `.js` extensions.
- Follow the `getMcpServer()` pattern in tRPC routers.
- Place new routers in `packages/core/src/routers/`.
- Place new services in `packages/core/src/services/`.
- Use `publicProcedure` for read operations, `adminProcedure` for mutations.

## Key Files to Reference
- `packages/core/src/MCPServer.ts` — Central orchestrator (2764 lines).
- `packages/core/src/trpc.ts` — tRPC app router (784 lines).
- `packages/core/src/lib/trpc-core.js` — tRPC base definitions.
- `apps/web/src/app/dashboard/` — Dashboard pages (31+ pages).

## Testing
- Run `npx tsc --noEmit` in `packages/core` to verify TypeScript.
- Run `pnpm run build` for full monorepo build.

## Documentation & Versioning
- **CRITICAL MANDATE**: Refer to `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` as the absolute single source of truth for overarching guidelines, especially submodules and Version bumping. EVERY code addition MUST result in a version increment and Changelog update.
