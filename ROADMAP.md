# Roadmap

_Last updated: 2026-04-02_

## Status legend

- **Stable** — production-intended, tested, maintained
- **Beta** — usable, still evolving
- **Experimental** — active R&D, not dependable
- **Vision** — directional only

## Framing

HyperCode has two jobs at once:
1. ship a reliable local control plane,
2. preserve a credible long-term vision for richer AI orchestration.

This roadmap keeps those jobs separate.

## Completed (v1.0.0-alpha.1)

Deliverables officially achieved and stabilized in the `1.0.0-alpha.1` milestone:

### 1. Stabilize the core wedge
- **MCP control plane**: Resolved the split-brain config cache, guaranteeing native tools and manual JSON configs synchronize without destructive DB wipes.
- **Provider routing and billing visibility**: Deployed fully functional `CoreModelSelector` fallback logic (handling `EMERGENCY_FALLBACK` and `budget_forced_local` states), seamlessly wired to the TRPC router and the active dashboard.
- **Session supervision**: Confirmed `SessionSupervisor` auto-restart functionality via active regression testing, validating isolated PTY recovery.
- **Memory inspection and continuity**: Deployed Vector Memory manipulation across `search_memory` and `add_memory` MCP tools, connecting universal memory directly to LLMs.
- **System observability**: Deployed robust `McpTrafficInspector` memory ring buffers, actively parsing latency thresholds.

### 2. Dashboard convergence
- completed high-value data-binding work for MCP Server Health, Integrations, and Traffic inspection.
- removed or clearly labeled misleading states (e.g. `hypercode mcp import` now gracefully errors on missing files instead of printing fake success messages).
- improved empty states and setup guidance (e.g. "Welcome to HyperCode! Let's get started" first-run banners now guide operators correctly).

### 3. Extension and runtime reliability
- fixed storage access failures across the SQLite database connections.
- reduced workspace build failures (re-aligned `pnpm-workspace.yaml` boundaries for proper transitive closure calculation).
- formalized internal daemon architecture (`hypercoded`, `hypermcpd`, `hyperingest`, `hyperharnessd`) and placed boundaries in `packages/core/src/daemons/`.
- successfully assimilated `bobbybookmarks` deduplication engines, absorbing 12,000+ validated external URLs and 900+ verified MCP catalogs into the robust internal `.hypercode` store.

### 4. Release discipline
- unified version story across all packages, dashboards, and CLIs (`1.0.0-alpha.1`).
- synchronized LLM instructions (merged all `CLAUDE.md`, `GEMINI.md`, etc., to point to `docs/UNIVERSAL_LLM_INSTRUCTIONS.md`).
- improved documentation accuracy (`GO_SIDECAR_API.md` explicitly defines what Go natively executes vs proxies).

## Next

### A. MCP operator improvements
- better tool grouping and search
- stronger import/export clarity
- better working-set management
- groundwork for benchmarking, ranking, and operator review loops across discovered MCP servers
- keep registry-source adapters truthful about source drift, partial availability, and non-fatal ingestion failures instead of treating stale registries as healthy empty catalogs

### B. Memory quality
- better retrieval tuning
- stronger import/export ergonomics

### C. Session workflow quality
- cleaner create/edit flows
- clearer isolation behavior
- converge primary CLI harness support around first-class HyperCode identities, starting with `hypercode`

### D. Provider routing polish
- clearer fallback history
- stronger quota truthfulness
- more actionable auth-state and routing config

### E. Architecture convergence
- converge the repo toward the recommended HyperCode binary family without splitting everything at once
- turn current packages into clearer extraction seams for `hypercoded`, `hypermcpd`, `hypermemd`, `hyperingest`, and `hyperharnessd`
- keep CLIs and GUIs as clients of daemon-owned state
- keep shared contracts and config stable before promoting them into cross-process APIs
- treat the current Go workspace as an **Experimental** coexistence lane for truthful read-parity and bridge-first replacement work, not as proof that the daemon boundaries are already extracted
- use the Go lane to validate which reads can be backed by the same SQLite/file/config truth sources before promoting any service boundary claims

## Later

- mobile and desktop companion polish after core stabilization
- safer public tool ingestion and sandboxing
- richer operator automation with guardrails
- deeper benchmark and latency reporting
- graduate selected daemon boundaries into real standalone binaries once uptime, isolation, or deployment needs justify them

## Vision

These remain exploratory until the control plane is stronger:
- advanced council or debate systems
- a definitive internal library of MCP servers aggregated from public lists and kept refreshed inside HyperCode
- benchmarking and comparative ranking across competing MCP server implementations
- eventual model reach to any relevant MCP tool through one operator-controlled control plane
- an operator-owned substrate spanning any model, any provider, any session, and any relevant tool
- multi-node federation or mesh-style coordination
- marketplace or community distribution systems
- performance-critical Rust components
- richer graph or 3D cognition visualizations

## Proposed `v1.0.0` bar

A credible `v1.0.0` should mean:
- reliable start and core workflow execution
- honest operator pages with real backend state
- dependable MCP inspection and config flows
- useful provider fallback visibility
- meaningful session and memory continuity
- documentation that does not overclaim

## Explicit de-scope until v1 ships

Do not prioritize these ahead of core convergence:
- economy or payment ideas
- broad P2P claims
- major rewrites without measured need
- large net-new surfaces while core ones remain rough
