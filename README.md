# Borg

**The local-first control plane for AI operations.**

> Status: **Pre-1.0 convergence**  
> Focus: **stability, truthfulness, and operator trust**

Borg helps operators run a fragmented AI tool stack from one local control plane. It is designed for people who already use multiple MCP servers, multiple model providers, and multiple coding or session workflows—and want one place to inspect, route, recover, and understand them.

## What Borg is

Borg is primarily four things:

1. **MCP control plane** — manage and inspect MCP servers and tool inventories from one local service.
2. **Provider routing layer** — handle quota-aware fallback across model providers.
3. **Session and memory substrate** — preserve continuity across work sessions.
4. **Operator dashboard** — make runtime state visible and diagnosable.

## Why this project exists

Modern AI work is messy:
- too many MCP servers,
- too many providers and quotas,
- too many half-connected tools,
- too little context continuity,
- and weak observability when something breaks.

Borg exists to reduce that fragmentation without requiring a hosted backend.

## What is real today

### Stable
- Local control-plane foundations
- MCP aggregation and management primitives
- Provider fallback infrastructure
- Core dashboard architecture
- Build, test, and typecheck workflows

### Beta
- Session supervision workflows
- Memory retrieval and inspection UX
- Discovered external session import from supported tools, including Copilot CLI, VS Code Copilot Chat, Simon Willison `llm` CLI logs, OpenAI or ChatGPT export roots, and Prism local SQLite histories plus behavioral metadata, with derived memories and generated instruction docs; Antigravity local `~/.gemini/antigravity/brain` discovery is now available as an explicitly **Experimental**, reverse-engineered import lane
- MCP traffic inspection and tool search UX
- Billing and routing visibility
- Browser and IDE bridge integration surfaces

### Experimental
- HyperCode assimilation via `submodules/hypercode` plus primary Borg CLI harness registration
- Council or debate workflows
- Broader autonomous workflow layers
- Mobile and desktop parity layers
- Mesh and marketplace concepts

### Vision
- A definitive internal library of MCP servers and tool metadata aggregated from public lists and operator-added sources
- Continuous normalization, deduplication, and refresh of that MCP library inside Borg
- Eventual operator-controlled access to any relevant MCP tool through one local control plane
- Operator-owned discovery, benchmarking, and ranking of the MCP ecosystem so Borg knows what tools exist, how well they work, and when to trust them
- A universal model-facing substrate where any model, any provider, any session, and any relevant MCP tool can be coordinated through Borg

## What Borg is not yet

Borg is **not yet** a fully hardened universal “AI operating system.” The most honest current description is:

> Borg is an ambitious, local-first AI control plane with real implementation across MCP routing, provider management, sessions, and memory—plus a broader experimental layer around orchestration and automation.

## Current focus

The current release track centers on:
- core MCP reliability,
- provider routing correctness,
- practical memory usefulness,
- session continuity,
- and honest dashboard or operator UX.

Longer-term, Borg should become the place where operators maintain a definitive internal MCP server library, benchmark the live tool ecosystem, and expose universal tool reach through one operator-owned control plane. That ambition is intentionally large, but it is still **Vision** work until the current control plane is more reliable.

## Orchestrator identities

Borg currently presents three operator-facing orchestrator identities:

- `packages/cli` is the **cli-orchestrator** lane.
- `apps/maestro` is the desktop **electron-orchestrator** lane.
- `apps/cloud-orchestrator` is the web **cloud-orchestrator** lane.

The experimental Go workspace under `go/` is a sidecar **cli-orchestrator** port for coexistence and feasibility work, not a replacement fork.

Today, `electron-orchestrator` and `cli-orchestrator` do **not** yet have 100% feature parity. The desktop lane currently exposes the broader operator UX, while the CLI lane remains the cleaner control-plane foundation. Borg should not drop either surface until parity gaps and operator workflows are intentionally closed.

## Quick start

### Requirements
- Node.js 22+
- pnpm 10+

### Local development
```bash
pnpm install
pnpm run dev
```

### HyperCode harness lane
```bash
borg session harnesses
borg session start ./my-app --harness hypercode
```

`hypercode` is now Borg's primary CLI harness identity, backed by the `submodules/hypercode` upstream. The upstream now exposes a Go/Cobra CLI with a default TUI REPL plus a `pipe` command, and Borg now surfaces HyperCode's source-backed tool inventory from `submodules/hypercode/tools/*.go` via `borg session harnesses` and the Go sidecar harness registry. Borg's harness catalogs now also track the broader known external identities it already references elsewhere in the repo, including `aider`, `cursor`, `copilot`, `qwen`, `superai-cli`, `codebuff`, `codemachine`, and `factory-droid`, but those still expose install/runtime metadata only until Borg has equally source-backed bridge contracts for them. HyperCode's maturity remains **Experimental** while the cross-runtime adapter contract is still shallow.

### Docker
```bash
docker compose up --build
```

## Repository shape

```text
apps/
  web/              Next.js dashboard
  borg-extension/   Browser extension surfaces
  maestro/          electron-orchestrator desktop shell work (legacy path)
  vscode/           VS Code integration

packages/
  core/             Main control plane backend
  ai/               Provider/model routing
  cli/              cli-orchestrator entrypoints
  ui/               Shared UI package
  types/            Shared types

submodules/
  hypercode/        External HyperCode harness upstream (experimental assimilation track)

go/
  cmd/borg/         Experimental sidecar Go cli-orchestrator port workspace

The Go port is intentionally isolated from the main Node/Next fork. It uses its own `.borg-go` config directory and can observe the primary Borg lock state via `/api/runtime/locks`, summarize its interop visibility via `/api/runtime/status` including compact lock visibility/running counts, config-path health, total and available CLI tool/harness counts, provider totals plus configured/authenticated/executable counts and auth/task buckets, memory availability plus default-section and per-section entry breakdowns, discovered-session counts plus session-type, task, model-hint, and TypeScript supervisor-bridge visibility, and import-root plus import-source health including valid/invalid counts, aggregate estimated size, and compact source-type, model-hint, and error buckets, expose a self-describing route index via `/api/index`, inspect effective path wiring via `/api/config/status` including repo-level `borg.config.json` and `mcp.jsonc` presence, expose read-only provider credential visibility via `/api/providers/status`, expose provider catalog metadata via `/api/providers/catalog`, expose compact provider rollups via `/api/providers/summary`, preview intended task-type routing order via `/api/providers/routing-summary`, read the main fork's generated imported-instructions artifact via `/api/runtime/imported-instructions`, expose discovered session artifacts through `/api/sessions` and `/api/sessions/summary`, bridge TypeScript session-supervisor catalog/list/get/create/start/stop/restart through `/api/sessions/supervisor/*`, bridge TypeScript MCP runtime/configured-server/tool/preference/working-set surfaces through `/api/mcp/*`, expose explicit import discovery roots via `/api/import/roots`, scan explicit session-source roots via `/api/import/sources` across workspace and home OpenAI/ChatGPT export locations, validate and export structured import candidates via `/api/import/validate`, `/api/import/candidates`, `/api/import/manifest`, and `/api/import/summary` including source, format, model-hint, and validation-error buckets, expose read-only CLI tool and harness summaries via `/api/cli/summary` and `/api/cli/harnesses`, and expose a read-only sectioned-memory summary via `/api/memory/borg-memory/status` for coexistence testing. Its current role is to validate a Go-native cli-orchestrator path without breaking the main fork.
```

## Design principles

1. **Local first** — default to local state and operator control.
2. **Truth over hype** — label maturity honestly.
3. **Interoperability over reinvention** — unify tools where possible.
4. **Visibility over magic** — make system state inspectable.
5. **Continuity over novelty** — prioritize recovery, routing, and memory.

## Contributing

Use `pnpm` v10 and verify changes before claiming success:

```bash
pnpm -C packages/core exec tsc --noEmit
pnpm -C apps/web exec tsc --noEmit --pretty false
pnpm run test
```

Also review:
- `AGENTS.md`
- `ROADMAP.md`
- `TODO.md`
- `VISION.md`

## Documentation map

- `VISION.md` — long-term direction
- `ROADMAP.md` — now/next/later
- `TODO.md` — active worklist
- `AGENTS.md` — contributor and agent rules
- `CHANGELOG.md` — release history

## License

MIT
