# Borg TODO

_Last updated: 2026-03-20_

## Active sprint (authoritative)

- [x] ~~Implement published-catalog persistence primitives (schema/types/repos)~~ — done in 0.9.4
- [x] ~~Add ingestion adapter contract with provenance + dedupe identity fields~~ — done in 0.9.4
- [x] ~~Add validation-run state model~~ — done in 0.9.4
- [x] ~~Wire first operator flow: discover -> preview recipe -> validate -> persist~~ — done in 0.9.4
- [x] ~~Keep startup/session/provider truthfulness checks green~~ — done in 0.9.2/0.9.3
- [x] ~~Add focused tests for ranking/normalization/validation transitions~~ — done in 0.9.9

This TODO list reflects the current codebase state after comparing the archive plans against what is actually implemented now.

## P0 — MCP ecosystem intelligence

### 1) Model published MCP servers as first-class database records
- [x] ~~Add a **published server catalog** table separate from installed/local `mcp_servers`~~ — done in 0.9.4
- [x] ~~Store canonical identity, source registry, provenance URL, source confidence, and dedupe fingerprints~~ — done in 0.9.4
- [x] ~~Track transport type, install method, required env/headers/auth model, and platform compatibility~~ — done in 0.9.4
- [x] ~~Add validation state fields: `discovered`, `normalized`, `probeable`, `validated`, `certified`, `broken`~~ — done in 0.9.4
- [x] ~~Track `last_seen_at`, `last_verified_at`, `verification_confidence`, and `failure_reason`~~ — done in 0.9.4

### 2) Build registry ingestion adapters
- [x] ~~Ingest from official/community MCP registries and normalize their formats (Glama.ai, Smithery.ai, mcp.run)~~ — done in 0.9.4
- [x] ~~Preserve raw source payloads for audit/debugging~~ — done in 0.9.4
- [x] ~~Deduplicate servers appearing in multiple registries~~ — done in 0.9.4
- [x] ~~Add scheduled refresh/sync jobs~~ — done in 0.9.7
- [x] ~~Replace heuristic-only snapshot extraction with richer source adapters (npm, GitHub topic search)~~ — done in 0.9.6/0.9.7

### 3) Build intelligent configuration generation
- [x] ~~Derive Borg-safe config recipes from published metadata~~ — done in 0.9.4
- [x] ~~Infer install path and transport type~~ — done in 0.9.4
- [x] ~~Extract required secrets, headers, env vars, and placeholders~~ — done in 0.9.4
- [x] ~~Add confidence scoring for generated recipes~~ — done in 0.9.4
- [ ] Improve recipe generation quality: version-pinned commands, better env inference

### 4) Build a real MCP validation harness
- [x] ~~Run transport reachability tests for published servers~~ — done in 0.9.4
- [x] ~~Run `tools/list` validation automatically where safe (SSE/HTTP)~~ — done in 0.9.4
- [x] ~~Distinguish auth/config/network/runtime/schema failures~~ — done in 0.9.4
- [x] ~~Persist validation runs and result history in the database~~ — done in 0.9.4
- [x] ~~Support retry/revalidation workflows~~ — done in 0.9.5 (triggerBatchValidation)
- [ ] STDIO validation with safe sandbox isolation (currently skipped)
- [ ] Optional sample `tools/call` smoke probes for low-risk servers

### 5) Build the operator workflow end-to-end
- [x] ~~Discover published server in dashboard~~ — done in 0.9.4
- [x] ~~Preview normalized config recipe~~ — done in 0.9.5 (server detail page)
- [x] ~~Fill secrets / required parameters~~ — done in 0.9.4
- [x] ~~Run validation before install~~ — validate button on all rows
- [x] ~~Save to published catalog + installed server DB~~ — done in 0.9.4
- [x] ~~Enable/disable locally after successful probe~~ — install button wired
- [x] ~~Show verification badge, last tested date~~ — done in 0.9.5 (detail page)
- [ ] Show known blockers with operator-readable explanations

## P1 — Harden the existing MCP surfaces

### 6) Make the registry page truthful and DB-backed
- [x] ~~Published catalog browser with real DB data~~ — done in 0.9.4
- [x] ~~Show provenance, last verification, and confidence level~~ — done in 0.9.5 (detail page)
- [x] ~~Distinguish "listed in registry" from "installable" from "validated" from "installed"~~ — status state machine in 0.9.4
- [x] ~~Show required secrets and supported platforms in the UI~~ — done in 0.9.5 (detail page recipe section)
- [ ] Server detail validation history (history list) — partially done, needs more polish

### 7) Connect the legacy/parallel registry work to the canonical stack
- [ ] Decide whether `cli/mcp-router-cli/**` registry/database services are canonical, migratable, or archival
- [ ] Port useful logic into the modern `packages/core` / `apps/web` stack

### 8) Improve installed-server truthfulness
- [ ] Expand installed server records with richer metadata and verification state
- [ ] Record whether metadata came from binary introspection, cache, or source registry
- [ ] Make installed vs published vs validated states explicit across dashboard surfaces

### 9) Expand testing
- [ ] Add repository tests for normalization/dedupe/provenance logic
- [ ] Add regression tests for config recipe generation  
- [ ] Add DB tests for published catalog lifecycle
- [ ] Add smoke tests for dashboard flows around discover/configure/test/install

## P1 — Keep 1.0 control-plane trust intact

### 10) Startup/readiness truthfulness
- [x] ~~Keep launcher, dashboard, and runtime readiness semantics aligned~~ — done in 0.9.2

### 11) Session supervisor reliability
- [x] ~~Keep worktree behavior explicit and dependable in runtime~~ — done in 0.9.2
- [ ] Improve operator-visible recovery UX

### 12) Provider routing truthfulness
- [x] ~~Auth/quota truthfulness: authTruth, quotaConfidence, quotaRefreshedAt~~ — done in 0.9.3
- [x] ~~revoked/expired/not_configured auth states~~ — done in 0.9.3
- [ ] Continue tightening for additional provider types

### 13) Dashboard honesty
- [ ] Audit wrapper/parity pages and mark them clearly as shipped/beta/experimental
- [ ] Prevent surface breadth from outrunning backend truth

## P2 — Important but no longer the immediate frontier

### 14) Memory productization
- [ ] Unify Borg-native memory UX across facts, observations, prompts, and provenance
- [ ] Improve graph/entity linking beyond today's flatter relationships
- [ ] Add better capture/replay flows tied to sessions and browser/IDE context

### 15) Suggestion/autonomy hardening
- [ ] Move suggestion engine from UI-only hints toward trustworthy prompt-time assistance
- [ ] Add stronger debounce/noise filtering to memory harvesting and background cognition

### 16) Sandboxing and security
- [ ] Add safer execution isolation for shell/code paths
- [ ] Distinguish validation-safe server probes from risky probes
- [ ] Add stronger secret handling for generated MCP config recipes

## P3 — Deferred until validated infrastructure is real

### 17) Swarm/council productization
- [ ] Only expand multi-agent orchestration once validated MCP infrastructure exists

### 18) Broad parity and ecosystem assimilation
- [ ] Continue evidence-lock work for built-in tool parity
- [ ] Treat archive assimilation as optional unless directly improving validated MCP mission


## P0 — MCP ecosystem intelligence (new top priority)

### 1) Model published MCP servers as first-class database records
- [ ] Add a **published server catalog** table separate from installed/local `mcp_servers`
- [ ] Store canonical identity, source registry, provenance URL, source confidence, and dedupe fingerprints
- [ ] Track transport type, install method, required env/headers/auth model, and platform compatibility
- [ ] Add validation state fields: `discovered`, `normalized`, `probeable`, `validated`, `certified`, `broken`
- [ ] Track `last_seen_at`, `last_verified_at`, `verification_confidence`, and `failure_reason`

### 2) Build registry ingestion adapters
- [ ] Replace heuristic-only snapshot extraction with real source adapters
- [ ] Ingest from official/community MCP registries and normalize their formats
- [ ] Preserve raw source payloads for audit/debugging
- [ ] Deduplicate servers appearing in multiple registries
- [ ] Add scheduled refresh/sync jobs

### 3) Build intelligent configuration generation
- [ ] Derive Borg-safe config recipes from published metadata
- [ ] Infer install path: `npm`, `uvx`, `docker`, `git`, hosted URL, or manual-only
- [ ] Infer transport: `STDIO`, `SSE`, `STREAMABLE_HTTP`
- [ ] Extract required secrets, headers, env vars, and placeholders
- [ ] Add confidence scoring for generated recipes
- [ ] Produce operator-readable setup explanations and failure hints

### 4) Build a real MCP validation harness
- [ ] Run transport reachability tests for published servers
- [ ] Run `tools/list` validation automatically where safe
- [ ] Add optional sample `tools/call` probes for low-risk servers
- [ ] Distinguish auth/config/network/runtime/schema failures
- [ ] Persist validation runs and result history in the database
- [ ] Support retry/revalidation workflows and drift detection

### 5) Build the operator workflow end-to-end
- [ ] Discover published server in dashboard
- [ ] Preview normalized config recipe
- [ ] Fill secrets / required parameters
- [ ] Run validation before install
- [ ] Save to published catalog + installed server DB
- [ ] Enable/disable locally after successful probe
- [ ] Show verification badge, last tested date, and known blockers

## P1 — Harden the existing MCP surfaces

### 6) Make the registry page truthful and DB-backed
- [ ] Replace fallback template behavior with real catalog-backed results
- [ ] Show provenance, last sync, last verification, and confidence level
- [ ] Distinguish “listed in registry” from “installable” from “validated” from “installed”
- [ ] Show required secrets and supported platforms in the UI

### 7) Connect the legacy/parallel registry work to the canonical stack
- [ ] Decide whether `cli/mcp-router-cli/**` registry/database services are canonical, migratable, or archival
- [ ] Port useful logic into the modern `packages/core` / `apps/web` stack
- [ ] Avoid maintaining two divergent MCP registry implementations

### 8) Improve installed-server truthfulness
- [ ] Expand installed server records with richer metadata and verification state
- [ ] Record whether metadata came from binary introspection, cache, or source registry
- [ ] Make installed vs published vs validated states explicit across dashboard surfaces

### 9) Expand testing beyond the current probe UI
- [ ] Add repository tests for normalization/dedupe/provenance logic
- [ ] Add regression tests for config recipe generation
- [ ] Add DB tests for published catalog lifecycle
- [ ] Add smoke tests for dashboard flows around discover/configure/test/install

## P1 — Keep 1.0 control-plane trust intact

### 10) Startup/readiness truthfulness
- [ ] Keep launcher, dashboard, and runtime readiness semantics aligned
- [ ] Re-verify clean-start behavior on Windows and Docker
- [ ] Maintain focused startup regression tests

### 11) Session supervisor reliability
- [ ] Keep worktree behavior explicit and dependable in runtime
- [ ] Preserve attach/recovery truthfulness under restart/error conditions
- [ ] Improve operator-visible recovery UX

### 12) Provider routing truthfulness
- [ ] Continue tightening auth/quota/fallback reasoning surfaces
- [ ] Preserve confidence labeling as billing/provider support expands

### 13) Dashboard honesty
- [ ] Audit wrapper/parity pages and mark them clearly as shipped/beta/experimental
- [ ] Prevent surface breadth from outrunning backend truth

## P2 — Important but no longer the immediate frontier

### 14) Memory productization
- [ ] Unify Borg-native memory UX across facts, observations, prompts, and provenance
- [ ] Improve graph/entity linking beyond today’s flatter relationships
- [ ] Add better capture/replay flows tied to sessions and browser/IDE context

### 15) Suggestion/autonomy hardening
- [ ] Move suggestion engine from UI-only hints toward trustworthy prompt-time assistance
- [ ] Add stronger debounce/noise filtering to memory harvesting and background cognition
- [ ] Keep healing/recovery bounded by operator trust and explicit permission policy

### 16) Sandboxing and security
- [ ] Add safer execution isolation for shell/code paths
- [ ] Distinguish validation-safe server probes from risky probes
- [ ] Add stronger secret handling for generated MCP config recipes

## P3 — Deferred until validated infrastructure is real

### 17) Swarm/council productization
- [ ] Only expand multi-agent orchestration once validated MCP infrastructure exists
- [ ] Keep council/debate flows subordinate to operator value, not demo breadth

### 18) Broad parity and ecosystem assimilation
- [ ] Continue evidence-lock work for built-in tool parity
- [ ] Do not claim parity complete until version pins, fixtures, and CI gates are in place
- [ ] Treat archive assimilation ideas as optional unless they directly improve the validated MCP ecosystem mission

## Definition of done for the new north star

Borg is ready for this mission when it can reliably:

- ingest public MCP server listings,
- deduplicate and normalize them,
- generate a realistic config recipe,
- test the recipe,
- classify the result,
- save the outcome to the database,
- and expose the full truth in the dashboard.



```markdown
# Borg TODO – 2026-03-19

## P0 – MCP Registry Intelligence (Current Focus)

### Database Layer
- [ ] Design and implement `published_mcp_servers` schema
  - Fields: canonical_id, source_urls, provenance, last_ingested, state (discovered/normalized/configured/validated/certified/failed), confidence_score, validation_history
- [ ] Create tables for config_recipes, validation_runs, transport_probes, secret_requirements
- [ ] Implement deduplication logic (by protocol fingerprint, name+version, transport hash)

### Ingestion Service
- [ ] Registry adapters (GitHub, npm, official MCP registry, community lists)
- [ ] Scheduled refresh jobs + webhook support
- [ ] Metadata normalization and conflict resolution
- [ ] Provenance chain tracking

### Config Intelligence Engine
- [ ] Transport inference (stdio, sse, streamable-http, custom)
- [ ] Automated config recipe generator with confidence scoring
- [ ] Secret and environment variable requirement extraction
- [ ] Recipe templating and safe defaults
- [ ] Human-in-the-loop review workflow for low-confidence recipes

### Validation Harness
- [ ] Safe sandboxed execution environment
- [ ] `tools/list` validation + capability classification
- [ ] Transport health probes
- [ ] Limited `tools/call` smoke tests with clear failure modes
- [ ] Validation state machine and reporting
- [ ] False-positive and safe-failure classification

### Dashboard & Operator Workflow
- [ ] Published catalog browser with filters and provenance view
- [ ] One-click “Install with Verified Config” workflow
- [ ] Validation report and confidence visualization
- [ ] Truthful separation between published vs. installed servers

### Migration & Cleanup
- [ ] Align legacy `cli/mcp-router-cli` registry code with new canonical stack
- [ ] Deprecate fallback template logic in favor of DB-backed truth
- [ ] Ensure installed-server metadata respects published catalog when available

## P1 – Hardening & Trustworthiness
- [ ] Make all registry pages DB-backed by default
- [ ] Improve session supervisor resilience and observability
- [ ] Add audit logging for all catalog modifications
- [ ] Enhance provider routing with validation-aware selection

## P2 – Memory & Intelligence Features
- [ ] Productize memory/graph subsystem
- [ ] Build suggestion engine / healer daemon
- [ ] Implement context graph indexing for discovered servers

## P3 – Swarm / Council Capabilities
- [ ] Design swarm coordination primitives
- [ ] Implement council decision-making layer
- [ ] Multi-agent orchestration patterns

## Non-Goals (Until Catalog is Complete)
- Broad ecosystem parity claims
- Marketing-style capability lists without verification data
- Replacing human oversight for high-stakes server configuration

---

**Current Priority Order:** P0 → P1 → P2 → P3
**Rule:** Nothing in P2 or P3 may block or dilute focus on completing P0.



## TODO.md
```markdown
# Project Borg: Development TODO

## Phase 1: Core Infrastructure (Q3 2024)
- [x] Implement ProviderAuthTruth service with Ed25519 attestations
- [x] Build SessionSupervisor with git-like worktree semantics
- [ ] Complete MCP Router lazy-loader (current: 60% coverage)
  - [ ] Add progressive capability disclosure middleware
  - [ ] Implement cache stampede protection
  - [ ] Add request coalescing for identical fetches
- [ ] Design memory tiering system (hot/warm/cold)
  - [ ] Define access prediction algorithm (LRU-K variant)
  - [ ] Implement persistent warm tier with SQLite FTS5
  - [ ] Add cold tier integration with IPFS/Filecoin

## Phase 2: Agent Ecosystem (Q4 2024)
- [ ] Create official agent SDK (@project-borg/agent-sdk)
  - [ ] TypeScript definitions for MCP 1.0+ spec
  - [ ] Built-in truth verification helpers
  - [ ] Worktree-aware context accessors
- [ ] Publish 5 reference agents:
  - [ ] Weather agent (NOAA API)
  - [ ] Code search agent (local ripgrep integration)
  - [ ] Calendar agent (CalDAV sync)
  - [ ] Documentation agent (local markdown search)
  - [ ] Finance agent (Yahoo Finance wrapper)
- [ ] Implement agent marketplace (local-first, IPFS-pinned)

## Phase 3: Observability & Ops (Q1 2025)
- [ ] Add distributed tracing (OpenTelemetry compatible)
  - [ ] Trace context propagation across worktrees
  - [ ] Measure truth verification latency
- [ ] Build operational dashboard:
  - [ ] Real-time worktree activity
  - [ ] Memory tier hit/miss ratios
  - [ ] Provider authenticity metrics
- [ ] Implement automated worktree garbage collection
  - [ ] Configurable retention policies
  - [ ] Space reclamation with user confirmation

## Phase 4: Advanced Features (Q2 2025+)
- [ ] Cryptographic worktree signing (for team collaboration)
- [ ] Predictive context pre-warming (based on agent behavior)
- [ ] Zero-knowledge proofs for selective context disclosure
- [ ] Federated Borg clusters (with trust boundaries)

## Ongoing Tasks
- [ ] Weekly security audit of truth verification paths
- [ ] Benchmark suite for latency/throughput regressions
- [ ] Documentation examples for common agent patterns
- [ ] MCP spec compliance testing (against reference implementations)

## Bug Triaging
Label priorities:
- `P0`: Truth verification failure / Worktree corruption
- `P1`: Latency regression >20% / Memory leak
- `P2`: UX inconsistency / Documentation gap
- `P3`: Feature request / Enhancement

See [GitHub Issues](https://github.com/project-borg/borg/issues) for current status.