# Hypercode OS: Frontend-Backend Feature Gap Analysis — 2026-02-24

## ⚠️ Executive Summary
A cross-referencing of `packages/core/src/routers/*.ts` against `apps/web/src/app/dashboard/` has identified several critical backend services that lack user interface representation. These "dark features" are functional but inaccessible to the end-user via the dashboard.

## 📊 Identified Gaps (High Priority)

### 1. Semantic Browser Interface (`browserRouter.ts`)
- **Status**: Backend ready.
- **Missing UI**: No dashboard page for controlling or monitoring headless browser sessions.
- **Impact**: "Computer Use" capabilities are limited to terminal-driven macros.
- **Update (2026-02-24)**: ✅ **IMPLEMENTED** at `/dashboard/browser`. Provides real-time page monitoring and lifecycle control.

### 3. Symbol Explorer (`symbolsRouter.ts`)
- **Status**: Backend ready.
- **Missing UI**: No interface to manage pinned code symbols or architectural focus points.
- **Update (2026-02-24)**: ✅ **IMPLEMENTED** at `/dashboard/symbols`. Allows pinning, priority management, and note-taking for critical codebase symbols.

## 📉 Secondary Gaps (Refinement Needed)
- **Audit**: Dashboard exists at `/dashboard/mcp/audit` but lacks search/filter integration with the `log` query endpoint.
- **Policies**: Dashboard exists at `/dashboard/mcp/policies`. Verified baseline parity.
- **LSP**: Integrated into `/dashboard/code`. Verified.
- **Namespaces**: Integrated into MetaMCP sub-dashboard. Verified.

