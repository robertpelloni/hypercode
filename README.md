# superai
# borg

**The local-first control plane for AI operations.**

> Status: **Pre-1.0 convergence**  
> Focus: **stability, truthfulness, and operator trust**

borg helps operators run a fragmented AI tool stack from one local control plane. It is designed for people who already use multiple MCP servers, multiple model providers, and multiple coding or session workflows—and want one place to inspect, route, recover, and understand them.

## What borg is

<<<<<<< HEAD
borg is primarily four things:

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

borg exists to reduce that fragmentation without requiring a hosted backend.

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
- borg assimilation via `submodules/borg` plus primary borg CLI harness registration
- Council or debate workflows
- Broader autonomous workflow layers
- Mobile and desktop parity layers
- Mesh and marketplace concepts

### Vision
- A definitive internal library of MCP servers and tool metadata aggregated from public lists and operator-added sources
- Continuous normalization, deduplication, and refresh of that MCP library inside borg
- Eventual operator-controlled access to any relevant MCP tool through one local control plane
- Operator-owned discovery, benchmarking, and ranking of the MCP ecosystem so borg knows what tools exist, how well they work, and when to trust them
- A universal model-facing substrate where any model, any provider, any session, and any relevant MCP tool can be coordinated through borg

## What borg is not yet

borg is **not yet** a fully hardened universal “AI operating system.” The most honest current description is:

> borg is an ambitious, local-first AI control plane with real implementation across MCP routing, provider management, sessions, and memory—plus a broader experimental layer around orchestration and automation.

## Current focus

The current release track centers on:
- core MCP reliability,
- provider routing correctness,
- practical memory usefulness,
- session continuity,
- and honest dashboard or operator UX.

Longer-term, borg should become the place where operators maintain a definitive internal MCP server library, benchmark the live tool ecosystem, and expose universal tool reach through one operator-owned control plane. That ambition is intentionally large, but it is still **Vision** work until the current control plane is more reliable.

## Orchestrator identities

borg currently presents three operator-facing orchestrator identities:

- `packages/cli` is the **cli-orchestrator** lane.
- `apps/maestro` is the desktop **electron-orchestrator** lane.
- `apps/cloud-orchestrator` is the web **cloud-orchestrator** lane.

The experimental Go workspace under `go/` is a sidecar **cli-orchestrator** coexistence port for read-parity and feasibility work, not a replacement fork and not yet the primary control-plane implementation.

Today, `electron-orchestrator` and `cli-orchestrator` do **not** yet have 100% feature parity. The desktop lane currently exposes the broader operator UX, while the Node-based CLI lane remains the cleaner control-plane foundation. borg should not drop either surface until parity gaps and operator workflows are intentionally closed. The Go lane should currently be described as **Experimental** read-only bridge replacement work, not as a completed daemon extraction.
=======
This repository is in an active cleanup and stabilization phase.

- Root `pnpm install` was verified successfully on Windows in this repo state.
- `docker compose up -d --build` was verified successfully on Windows with Docker Desktop running.
- Dockerized dashboard access was verified at `http://localhost:3001`.
- Root `pnpm run dev` now uses Borg's readiness launcher and may place the dashboard on a fallback web port if `3000` is already occupied; the core bridge remains on `http://127.0.0.1:3001`.
- The web app root redirects from `/` to `/dashboard`.
>>>>>>> origin/rewrite/main-sanitized

## Quick start

### Requirements
- Node.js 22+
- pnpm 10+

### Local development
```bash
pnpm install
pnpm run dev
```

### borg harness lane
```bash
borg session harnesses
borg session start ./my-app --harness borg
borg mesh status
```

`borg` is now borg's primary CLI harness identity, backed by the `submodules/borg` upstream. The upstream now exposes a Go/Cobra CLI with a default TUI REPL plus a `pipe` command, and borg now surfaces borg's source-backed tool inventory from `submodules/borg/tools/*.go` via `borg session harnesses` and the Go sidecar harness registry. borg's harness catalogs now also track the broader known external identities it already references elsewhere in the repo, including `aider`, `cursor`, `copilot`, `qwen`, `superai-cli`, `codebuff`, `codemachine`, and `factory-droid`, but those still expose install/runtime metadata only until borg has equally source-backed bridge contracts for them. borg's maturity remains **Experimental** while the cross-runtime adapter contract is still shallow.

The CLI mesh surface is now operator-visible through `borg mesh status`, `borg mesh peers`, `borg mesh capabilities [nodeId]`, and `borg mesh find --capability <name>`. These commands query the live local control plane through `BORG_TRPC_UPSTREAM` or the borg startup lock, so they report real mesh visibility instead of placeholder CLI output.

### Docker
```bash
docker compose up --build
```

<<<<<<< HEAD
## Repository shape

```text
apps/
  web/              Next.js dashboard
  borg-extension/   Browser extension surfaces (compatibility path)
  maestro/          electron-orchestrator desktop shell work (legacy path)
  vscode/           VS Code integration

packages/
  core/             Main control plane backend
  ai/               Provider/model routing
  cli/              cli-orchestrator entrypoints
  ui/               Shared UI package
  types/            Shared types

submodules/
  borg/        External borg harness upstream (experimental assimilation track)

go/
  cmd/borg/         Experimental sidecar Go cli-orchestrator port workspace

The Go port is intentionally isolated from the main Node/Next fork. It uses its own `.borg-go` config directory and can observe the primary borg lock state via `/api/runtime/locks`, summarize its interop visibility via `/api/runtime/status` including compact lock visibility/running counts, config-path health, total and available CLI tool/harness counts, provider totals plus configured/authenticated/executable counts and auth/task buckets, memory availability plus default-section and per-section entry breakdowns, discovered-session counts plus session-type, task, model-hint, and TypeScript supervisor-bridge visibility, and import-root plus import-source health including valid/invalid counts, aggregate estimated size, and compact source-type, model-hint, and error buckets, expose a self-describing route index via `/api/index`, inspect effective path wiring via `/api/config/status` including repo-level `borg.config.json` and `mcp.jsonc` presence, expose read-only provider credential visibility via `/api/providers/status`, expose provider catalog metadata via `/api/providers/catalog`, expose compact provider rollups via `/api/providers/summary`, preview intended task-type routing order via `/api/providers/routing-summary`, read the main fork's generated imported-instructions artifact via `/api/runtime/imported-instructions`, expose discovered session artifacts through `/api/sessions` and `/api/sessions/summary`, and bridge or selectively replace TypeScript read routes across `/api/sessions/supervisor/*`, `/api/sessions/imported/*`, `/api/mcp/*`, `/api/memory/*`, `/api/agent-memory/*`, `/api/graph/*`, `/api/context/*`, `/api/git/*`, `/api/tests/*`, `/api/metrics/*`, `/api/logs/*`, `/api/server-health/*`, `/api/settings/*`, `/api/tools/*`, `/api/tool-sets/*`, `/api/project/*`, `/api/shell/*`, `/api/agent/*`, `/api/commands/*`, `/api/skills/*`, `/api/workflows/*`, `/api/symbols/*`, `/api/lsp/*`, `/api/api-keys/*`, `/api/audit/*`, `/api/scripts/*`, `/api/links-backlog/*`, `/api/infrastructure/*`, `/api/expert/*`, `/api/policies/*`, `/api/secrets/*`, `/api/marketplace/*`, `/api/catalog/*`, `/api/oauth/*`, `/api/research/*`, `/api/pulse/*`, `/api/session-export/*`, `/api/browser-extension/*`, `/api/open-webui/*`, `/api/code-mode/*`, `/api/submodules/*`, `/api/suggestions/*`, and `/api/plan/*`. Some of those reads now have truthful local Go fallbacks backed by the same SQLite database, local config files, or deterministic local defaults, but many orchestration-heavy routes remain bridge-only by design. Its current role is to validate a Go-native cli-orchestrator path, grow honest read-only local truth where practical, and avoid overstating daemon-extraction maturity before the underlying contracts are stable.
```

## Recommended binary-to-package evolution

The repo does **not** yet ship the full recommended borg binary family, but the current workspace already suggests the right extraction seams.
=======
Expected URLs once the stack is up:

- Dashboard: `http://localhost:3001`
- Core API: `http://localhost:3000`

Notes:

- Opening `http://localhost:3001/` redirects to `http://localhost:3001/dashboard`.
- The MCP operator surface lives at `http://localhost:3001/dashboard/mcp`.
- The first image build can take several minutes because it builds the core packages and the Next.js dashboard inside Docker.

### 3) Start local development

```bash
pnpm run dev
```

What the launcher does:

- starts or reuses the Borg core bridge on `http://127.0.0.1:3001`
- waits for the authoritative `startupStatus` contract before reporting success
- builds missing official browser-extension artifacts when needed
- opens the dashboard after the web surface is actually ready

The dashboard usually starts on `http://127.0.0.1:3000/dashboard`, but it may move to a fallback port if `3000` is already taken. To confirm the active URLs after startup, run:

```bash
node scripts/verify_dev_readiness.mjs
```

Useful local probes:

- Core bridge / HTTP probe: `http://127.0.0.1:3001`
- Startup status: `http://127.0.0.1:3001/api/trpc/startupStatus?input=%7B%7D`
- MCP status: `http://127.0.0.1:3001/api/trpc/mcp.getStatus?input=%7B%7D`

### Windows note

If Docker reports an error like:

- `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`

that usually means Docker Desktop is not running yet. Start Docker Desktop, wait for the engine to come up, then rerun:

```bash
docker compose up --build
```

## What Borg is

Borg is an **orchestrator**, not a clone of every AI tool.

It is intended to:

- route MCP tools cleanly and safely
- supervise external agent and CLI sessions
- manage provider and model selection with fallback
- expose system state through a practical dashboard

## Borg 1.0 focus

The repository still contains legacy and experimental surfaces, but the current product focus is intentionally narrow:

- **MCP Master Router**
- **Model Fallback & Provider Routing**
- **Session Supervisor**
- **Web Dashboard**

If a change does not make those workflows more reliable, more testable, or easier for a new user to run in five minutes, it is probably not a Borg 1.0 priority.

## Repository layout

```text
borg/
├── apps/web/              # Dashboard
├── apps/borg-extension/   # Official browser extension (Chrome/Edge + Firefox builds)
├── apps/extension/        # Legacy/compat browser extension surface
├── packages/core/         # MCP routing, orchestration, services
├── packages/cli/          # CLI entrypoint
├── packages/types/        # Shared types/schemas
├── tasks/                 # Active, backlog, completed task briefs
├── docs/                  # Architecture docs plus archived planning material
└── docker-compose.yml     # Containerized local stack
```

## Canonical docs

These are the root-level documents contributors should trust first:

- `AGENTS.md` — active repo operating directive
- `ARCHITECTURE.md` — high-level system design
- `ROADMAP.md` — current 1.0 / 1.5 / 2.0 milestones
- `CHANGELOG.md` — notable repo changes
- `tasks/active/` — current implementation work

Archive and compatibility material still exists for reference, but it is **not** the source of truth. Treat anything under `docs/archive/` as archive-only.
>>>>>>> origin/rewrite/main-sanitized

### Control plane

<<<<<<< HEAD
- Future binaries: `borg`, `borgd`
- Current likely sources:
  - `packages/cli`
  - `packages/core`
  - `packages/ai`
  - `packages/types`
  - `packages/tools`
  - `go/cmd/borg`
  - `go/internal/controlplane`, `go/internal/httpapi`, `go/internal/providers`

### MCP layer

- Future binaries: `borgmcpd`, `hypermcp-indexer`
- Current likely sources:
  - `packages/mcp-client`
  - `packages/mcp-registry`
  - `packages/mcp-router-cli`
  - MCP-related surfaces inside `packages/core`
  - `go/internal/httpapi` and future Go MCP-specific packages as extraction work continues

### Memory and ingestion layer

- Future binaries: `borgmemd`, `borgingest`
- Current likely sources:
  - `packages/memory`
  - `packages/claude-mem`
  - session and import flows inside `packages/core`
  - `go/internal/memorystore`
  - `go/internal/sessionimport`

### Harness layer

- Future binaries: `borgharnessborgharness`, `borgharnessborgharnessd`
- Current likely sources:
  - `packages/agents`
  - `packages/adk`
  - `packages/borg-supervisor`
  - `packages/browser`
  - `packages/search`
  - harness registration and supervisor flows in `packages/core`
  - `go/internal/harnesses`

### Client surfaces

- Future apps/binaries: `borg-web`, `borg-native`
- Current likely sources:
  - `apps/web`
  - `apps/maestro`
  - `apps/maestro-go`
  - `apps/mobile`
  - `packages/ui`

### Extraction rule

Keep shared contracts, config, auth, logging, and transport schemas in reusable packages first. Extract a new binary only after the package seam is clear enough that process separation improves reliability or operator clarity instead of just adding more moving parts.

### First extraction seams to prefer

If work proceeds incrementally, the first concrete seams should be:

1. `borgd`
   - pull top-level control-plane routing, operator health/status APIs, lock/config coordination, and provider-routing orchestration toward a cleaner daemon-owned boundary
   - keep CLI, web, and native surfaces as clients of that boundary
2. `borgmcpd`
   - pull MCP registry state, runtime-server lifecycle, working-set state, tool inventory/search/call mediation, and probe/test flows toward a dedicated service boundary
   - keep scrape/probe refresh and offline metadata enrichment as `hypermcp-indexer` worker responsibilities rather than interactive daemon logic

These seams are preferred first because they already have visible operator-facing surfaces, clear uptime concerns, and strong pressure to separate control-plane truth from client UX.

## Design principles

1. **Local first** — default to local state and operator control.
2. **Truth over hype** — label maturity honestly.
3. **Interoperability over reinvention** — unify tools where possible.
4. **Visibility over magic** — make system state inspectable.
5. **Continuity over novelty** — prioritize recovery, routing, and memory.

## Contributing

For now, compatibility paths, package names, and the `borg` CLI command remain unchanged while the visible branding shifts to borg.

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
=======
- Current stabilization work is focused on install, startup, and the core control-plane workflows.
- If you are contributing, prefer `tasks/active/` over older phase-based or parity-based planning artifacts.
- The dashboard landing page is `/dashboard`; use `/dashboard/mcp` when you specifically want the MCP router view.

### Optional startup debug logging

Normal `pnpm run dev` startup is intentionally quiet. If you want verbose Borg core boot/import logging while diagnosing startup issues, enable either of these environment flags before launching dev:

- `BORG_MCP_SERVER_DEBUG=1`
- `DEBUG=borg:mcp-server`

Windows PowerShell examples:

```powershell
$env:BORG_MCP_SERVER_DEBUG='1'; pnpm run dev
```

```powershell
$env:DEBUG='borg:mcp-server'; pnpm run dev
```
>>>>>>> origin/rewrite/main-sanitized

## License

MIT
