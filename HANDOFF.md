# Handoff

## What was done (v1.0.0-alpha.37 session)

### Milestones achieved
1. **Created 8 `@borg/*` stub packages** — resolved all missing module imports
2. **Zero TypeScript errors across all targets** — core, cli, web, go vet all green
3. **Server starts and serves tRPC** — `http://0.0.0.0:4100/trpc` operational
4. **Cleaned 6 stale gitlink references** — removed broken submodule pointers
5. **Fixed jsdom/parse5 dependency chain** — entities@^6.0.0, tldts, etc.

### `@borg/*` Stub Package Architecture
Created 8 packages under `packages/`:

| Package | Exports | Runtime Type |
|---------|---------|-------------|
| `@borg/types` | 12 zod schemas | Real zod schemas (tRPC `.input()` needs them) |
| `@borg/agents` | 11 (Director, Council, etc.) | `undefined` stubs |
| `@borg/ai` | 9 (LLMService, ModelSelector, etc.) | Real classes (needed for `extends`) |
| `@borg/tools` | 17 (FileSystemTools, etc.) | `undefined` stubs |
| `@borg/adk` | 5 (A2AMessage, etc.) | `undefined` stubs |
| `@borg/memory` | 3 (GraphMemory, etc.) | `undefined` stubs |
| `@borg/search` | 2 (SearchService, etc.) | `undefined` stubs |
| `@borg/mcp-registry` | 1 (Registry) | `undefined` stub |

Each package has:
- `src/index.ts` — TS source stubs (for `tsc --noEmit` type resolution)
- `dist/index.js` — ESM runtime stubs (for Node execution)
- `dist/index.d.ts` — Type declarations (for module resolution)
- `package.json` with `exports` field for `import`/`types` conditions

### Key fixes
- Added `workspace:*` dependencies in `packages/core/package.json`
- Fixed `entities@^6.0.0` for `parse5@8` compatibility
- Removed `.orig` and `.patch` files from `go/`
- Fixed duplicate imports in Go test files
- Added error stack trace to CLI start command
- Removed unused `@ts-expect-error` directives across 30+ files

### Stale gitlinks removed
- `borg/research/maestro`
- `hyperingest/research/OmniRoute`
- `hyperingest/research/litellm`
- `hypermcp/research/mcpproxy`
- `hypermcp/research/prism-mcp`
- `hypermem/research/claude-mem`
- `hyperharness/research/hyperharness`
- `jules-autopilot`

## Build status
- **Go**: `go build ./cmd/borg` ✅, `go vet ./...` ✅
- **TS core**: `pnpm -C packages/core exec tsc --noEmit` ✅ 0 errors
- **TS cli**: `pnpm -C packages/cli exec tsc --noEmit` ✅ 0 errors
- **TS web**: `pnpm -C apps/web exec tsc --noEmit` ✅ 0 errors
- **Server**: Starts and serves tRPC at `http://0.0.0.0:4100/trpc` ✅

## Recommended next steps
1. **Wire up real `@borg/*` implementations** — the stubs are placeholders. Real implementations should be built out progressively as features are needed.
2. **End-to-end first-run flow** — `start.bat` → Go binary → TS server → dashboard loads.
3. **Dashboard shows real data** — most pages currently use stub data from the `@borg/*` stubs.
4. **Investigate 609 Dependabot vulnerabilities** on the default branch.
5. **Resolve submodule dirty state** (cloud-orchestrator, maestro, claude-mem).
6. **Add free-tier providers** to fallback chain (OpenRouter free, Google AI Studio).
7. **Build toward `pnpm run build`** producing working binaries for distribution.
