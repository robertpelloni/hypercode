# Borg Roadmap

_Last updated: 2026-03-20_

## Canonical now/next (authoritative)

This short block is the source of truth for current execution.

### Current objective
Deliver **MCP Registry Intelligence P0** end-to-end so Borg can ingest published MCP servers, generate safe config recipes, validate them, and persist trustworthy results.

### Next implementation slice (active)
1. Published catalog schema + persistence model
2. Ingestion adapter contract + provenance fields
3. Validation run model + status state machine
4. Operator workflow wiring (`discover -> configure -> test -> save`)

### Guardrails
- No parity/marketing claims without version-locked validation evidence.
- Distinguish clearly between `published`, `installed`, and `validated` states in all surfaces.
- Keep startup/session/provider truthfulness at 1.0 quality while implementing catalog P0.

This roadmap reconciles the **archive vision** with the **current repository reality**.

The archive documents describe Borg as a broad cognitive control plane with memory, orchestration, dashboards, bridges, parity work, and ecosystem assimilation. The current repo already ships meaningful parts of that story — especially MCP routing, operator dashboards, provider fallback, session supervision, import flows, and evidence-lock documentation.

But the most important missing strategic capability is now clear:

> **Borg does not yet have a trustworthy, scalable system to discover, configure, test, verify, and persist every published MCP server into a first-class database-backed catalog.**

That is the next major frontier.

## Current reality vs archive intent

### Shipped foundations

These areas are clearly real in the current project:

- **MCP router + dashboard surfaces** exist and are substantial.
- **Installed MCP server persistence** exists via database-backed server records and admin routes.
- **Bulk MCP import** exists for user-supplied `mcpServers` JSON.
- **Registry browsing** exists in the web dashboard.
- **Server probing/testing UI** exists for router-level and direct server probing.
- **Provider routing** exists with fallback chains, quota tracking, and auth/quota truthfulness improvements.
- **Session supervision** exists with persistence, restart semantics, and attach-readiness truthfulness.
- **Evidence-lock / tool-parity research** exists and is actively maintained.

### Partial or immature areas

These are present, but not yet trustworthy enough to claim the full archive story:

- **Published MCP registry ingestion** is only partially implemented.
- **Registry normalization** is heuristic-heavy and incomplete.
- **Installed server DB** is real, but a **global published-server database** is not.
- **Registry package** exists, but is tiny and static compared with the archive ambition.
- **Testing/probing** exists, but not at the scale of validating the entire published MCP ecosystem.
- **Config generation** is mostly manual or templated, not intelligent.
- **Version/provenance/verification state** is not modeled deeply enough for published servers.
- **Many dashboard pages exist**, but some still function more as control-plane wrappers than deeply verified product surfaces.
- **Memory / suggestion / graph** ambitions remain partly implemented and not yet fully productized.
- **Browser / IDE / extension ecosystem** is broad but still uneven in maturity.

## Highest-priority missing capability

### The MCP Registry Intelligence Program

Your stated end goal is now the clearest product direction:

> **Intelligently configure and test every published MCP server and add it to Borg’s database.**

That expands Borg from “an MCP router with UI” into **the operational intelligence layer for the MCP ecosystem**.

This requires six missing capabilities that do not yet exist end-to-end:

1. **Published-server ingestion pipeline**
   - Pull from official and community registries.
   - Deduplicate across registries.
   - Preserve provenance, source confidence, and canonical IDs.

2. **Config intelligence**
   - Infer transport (`STDIO`, `SSE`, `STREAMABLE_HTTP`).
   - Infer installation path (`npm`, `uvx`, `docker`, `git`, hosted URL).
   - Extract env requirements, headers, auth style, and placeholder templates.
   - Produce a Borg-safe normalized config recipe.

3. **Validation lab**
   - Automatically install or simulate setup.
   - Probe `tools/list`, sample `tools/call`, and transport reachability.
   - Distinguish “unconfigured”, “misconfigured”, “broken upstream”, and “validated”.

4. **Published-server database model**
   - Separate **published catalog records** from **installed local servers**.
   - Track version, provenance, last verified date, validation results, config recipe confidence, required secrets, platform support, and operator notes.

5. **Promotion workflow**
   - Unknown → discovered → normalized → probeable → validated → certified.
   - Support human review for risky or auth-heavy servers.

6. **Operator UI for scale**
   - Browse all published servers.
   - Filter by validation status, required secrets, transport, source confidence, category, and platform support.
   - One-click: preview config → fill secrets → test → save to DB → optionally install locally.

## Roadmap phases

## Phase A — Borg 1.0: trustworthy control plane

This remains necessary because the MCP catalog work depends on it.

### 1.0 goals

- Stable MCP dashboard runtime
- Truthful provider routing surfaces
- Truthful session supervisor surfaces
- Honest distinction between shipped and experimental pages
- Repeatable startup and release confidence

### 1.0 remaining gaps

- Startup / readiness truth must stay aligned across launcher, dashboard, and runtime
- MCP dashboard import/edit/test flows still need ongoing hardening
- Many dashboard pages need stronger “truthfulness” labeling
- CI and release-gate discipline still need to become default, not aspirational

## Phase B — Borg 1.1: published MCP catalog foundation

### Target outcome

Borg can ingest public MCP server sources into a normalized **published-server catalog** with provenance and dedupe.

### Deliverables

- Published-server schema and DB tables
- Registry source adapters
- Deduplication + canonical identity rules
- Normalized categories, transports, install methods, auth needs
- Import job + refresh job
- Dashboard catalog page backed by DB, not fallback templates / heuristics

### Missing today

- No first-class published-server table
- No canonical published-server identity model
- No provenance/confidence model
- Current registry snapshot is derived from `BORG_MASTER_INDEX.jsonc`, not a purpose-built catalog
- `packages/mcp-registry` is too small/static for this role
- legacy-style registry services under `cli/mcp-router-cli` are not the canonical modern Borg implementation

## Phase C — Borg 1.2: intelligent configuration

### Target outcome

Borg can generate and explain a working config recipe for each published server.

### Deliverables

- Secret requirement extraction
- Config recipe templates per server
- Validation of required env/header/url fields
- Platform-specific install recipes (Windows/macOS/Linux)
- Hosted vs local-runtime distinction
- Confidence score for generated config

### Missing today

- No central recipe engine
- No confidence scoring for generated config
- Placeholder-heavy server configs are hand-authored, not normalized from source metadata
- No operator flow that turns a public listing into a ready-to-test config with explanations

## Phase D — Borg 1.3: validation lab

### Target outcome

Borg can test published MCP servers at scale and record validation outcomes in the database.

### Deliverables

- Automated `tools/list` and transport reachability tests
- Optional safe sample `tools/call` probes
- Failure classification (network, auth, config, runtime, schema, upstream)
- Re-test scheduling and drift detection
- Last-known-good snapshots
- Validation badges in dashboard

### Missing today

- Probe UI exists, but not a registry-scale validation workflow
- No scheduled validation pipeline for the public catalog
- No durable per-server validation history for published catalog entries
- No certification level (unknown / probeable / validated / certified)

## Phase E — Borg 1.4: database-backed MCP ecosystem operations

### Target outcome

Every published MCP server Borg knows about is represented in the database, with normalized metadata, validation state, and operator-install path.

### Deliverables

- Distinct models for published servers, local installs, validation runs, and config recipes
- Dashboard workflows for import, configure, test, install, enable, disable, and refresh
- Audit trail for server state transitions
- Search/ranking across published and locally installed servers

### Missing today

- Local installed-server persistence exists; ecosystem-wide published-server persistence does not
- No validation run history model for public catalog records
- No ranking based on installability, verification confidence, or observed health

## Phase F — Borg 1.5: memory and context productization

This remains important, but it should no longer outrank the MCP catalog/validation mission.

### Continue, but after the catalog foundation

- Unified Borg-native memory UX
- Ingestion provenance and replayability
- Better graph reasoning and entity linking
- Browser/IDE capture tied to sessions and memory

## Phase G — Borg 2.0: orchestration on verified infrastructure

The archive vision of councils, swarms, and higher-order orchestration becomes far more credible once Borg operates over a validated MCP ecosystem.

### 2.0 reframed outcome

Borg becomes:

- a **verified MCP ecosystem control plane**,
- a **truthful operator dashboard**,
- and eventually a **multi-agent orchestrator over known-good infrastructure**.

## Phase H — Assimilation of Auto-Orchestrator (OpenCode Autopilot)

### Target outcome
Integrate the multi-model council supervision system from `opencode-autopilot` into Borg.

### Deliverables
- `@borg/auto-orchestrator` package
- Council debate UI in Borg Dashboard
- Integration with Borg's Provider Truth and Session Supervisor
- Migration of Hono/Bun logic to Express/Node

## Top missing features to carry forward


1. **Published MCP server database** distinct from installed-server records
2. **Registry ingestion jobs** from official/community sources with provenance
3. **Canonical dedupe / identity model** for public MCP servers
4. **Intelligent config recipe generation** with secret/auth extraction
5. **Automated validation harness** for `tools/list` and safe `tools/call`
6. **Validation status model and history** stored per published server
7. **Dashboard workflow for discover → configure → test → save → install**
8. **Certification / confidence scoring** for published servers
9. **Scheduled refresh + drift detection** for versions, metadata, and health
10. **Clear boundary between experimental archive ambition and currently shipped product**

## Non-goals for now

To avoid repeating archive-era sprawl, Borg should **not** prioritize the following ahead of the MCP catalog intelligence program:

- building dozens more wrapper pages without deeper backend truth
- claiming feature parity with every external ecosystem before version-locked evidence exists
- broad swarm/council scope expansion without validated infrastructure beneath it
- expanding plugin/extension breadth faster than install/test/verification maturity

## Success definition

Borg will have crossed the next real threshold when an operator can:

1. discover a published MCP server,
2. see where its metadata came from,
3. generate a Borg-safe config recipe,
4. fill in required secrets,
5. run a reproducible validation,
6. store the result in the database,
7. install or enable it locally,
8. and trust the dashboard’s claim about whether that server is actually ready.


# Borg Roadmap

## Phase A – Foundation (Completed)
- 1.0 Control plane and session supervisor
- Basic provider routing and transport abstraction
- Initial CLI experience
- Memory subsystem (foundational, not yet productized)

## Phase B – MCP Registry Intelligence (Current – 1.1)

**Goal:** Become the trustworthy intelligence layer for the entire published MCP ecosystem.

**Key Deliverables:**
- Database-backed published MCP server catalog with full provenance
- Automated ingestion from all major public sources
- Config intelligence engine with confidence scoring
- Safe automated validation harness
- Operator dashboard with truthful workflows
- Clear separation between discovered/published vs. installed servers

**Success Criteria:**
- At least 200 published MCP servers ingested and validated
- >90% of catalog entries have high-confidence config recipes
- Validation harness correctly classifies capabilities and failure modes
- Dashboard shows verifiable provenance instead of marketing claims
- Legacy registry code fully migrated or deprecated

**Target:** Q2 2026

## Phase C – Memory & Context Productization
- Persistent memory and graph capabilities
- Suggestion engine / healer daemon
- Context graph indexing over the published catalog
- Memory-aware session management

## Phase D – Swarm & Multi-Agent Coordination
- Swarm primitives
- Council decision layer
- Collaborative agent orchestration patterns
- Cross-server capability composition

## Phase E – Ecosystem Leadership
- Broad verified MCP ecosystem coverage
- Open standards contributions
- Public validation and trust metrics
- Self-improving catalog intelligence

## Strategic Rule

**No feature from a later phase may compromise the integrity, truthfulness, or completion speed of earlier phases.**

The catalog must exist and be trustworthy before we expand into advanced orchestration or memory features.


# Project Borg: Technical Roadmap

## Vision Alignment
All milestones support our core tenets:
- **Truthfulness**: Verifiable provenance for every context token
- **Local-first**: Operate fully disconnected when needed
- **Efficiency**: Minimize redundant work through intelligence
- **Safety**: Isolate experimentation without friction

## Timeline

### Q3 2024: Foundation
| Milestone | Target Date | Key Deliverables | Success Metrics |
|-----------|-------------|------------------|-----------------|
| **Core Control Plane** | Aug 15, 2024 | - ProviderAuthTruth service<br>- SessionSupervisor<br>- Basic MCP Router | - 99.9% attestation verification success<br>- Worktree creation < 50ms<br>- Router p99 latency < 150ms |
| **Memory Tiering Alpha** | Sep 30, 2024 | - Hot/L1 cache (LRU)<br>- Warm tier (SQLite FTS5)<br>- Access predictor stub | - 60% reduction in redundant fetches<br>- Predictor accuracy > 40% baseline |
| **Agent SDK v0.1** | Oct 15, 2024 | - TypeScript SDK<br>- Reference weather agent<br>- Local dev tooling | - 3 community agents built<br>- SDK docs completion rate > 80% |

### Q4 2024: Ecosystem Growth
| Milestone | Target Date | Key Deliverables | Success Metrics |
|-----------|-------------|------------------|-----------------|
| **Router Optimization** | Nov 30, 2024 | - Progressive disclosure middleware<br>- Request coalescing<br>- Adaptive timeout tuning | - p99 latency < 100ms (hot context)<br>- 50% fewer duplicate provider calls |
| **Memory Tiering GA** | Dec 15, 2024 | - ML-based access prediction (Online Random Forest)<br>- Automatic tier promotion/demotion<br>- IPFS cold tier integration | - 75% reduction in redundant fetches<br>- Predictor accuracy > 65% |
| **Reference Agent Suite** | Dec 31, 2024 | - 5 production-ready agents<br>- Agent registry CLI<br>- Basic marketplace UI | - All agents pass truth verification<br>- Marketplace hosts 10+ community agents |

### Q1 2025: Observability & Stability
| Milestone | Target Date | Key Deliverables | Success Metrics |
|-----------|-------------|------------------|-----------------|
| **Observability Stack** | Jan 31, 2025 | - OpenTelemetry integration<br>- Worktree activity dashboard<br>- Authenticity metrics panel | - Mean time to detect (MTTD) < 5min<br>- 95% of anomalies traced to root cause |
| **Operational Tooling** | Feb 28, 2025 | - Automated worktree GC<br>- Backup/restore for context store<br>- Rolling update supervisor | - Zero data loss in tested scenarios<br>- GC reclaims > 30% stale worktrees/month |
| **Security Hardening** | Mar 31, 2025 | - Formal verification of truth paths<br>- Penetration test report<br>- SBOM generation | - No critical truth verification flaws<br>- SBOM covers 100% of dependencies |

### Q2 2025+: Advanced Capabilities
| Milestone | Target Date | Key Deliverables | Success Metrics |
|-----------|-------------|------------------|-----------------|
| **Collaborative Worktrees** | Apr 30, 2025 | - Cryptographic worktree signing<br>- Merge conflict resolution<br>- Trust delegation model | - Secure multi-agent collaboration<br>- Conflict resolution < 2min median |
| **Predictive Loading** | May 31, 2025 | - Agent behavior modeling<br>- Pre-warming based on context patterns<br>- Speculative execution safeguards | - 40% reduction in cold-start latency<br>- Speculative accuracy > 50% |
| **Federated Borg** | Jun 30, 2025 | - Trust boundary definition<br>- Selective context sharing<br>- Cross-cluster truth verification | - Secure inter-cluster operation<br>- Latency < 200ms for verified shares |

## Success Criteria
By EOY 2025, Borg will achieve:
- **Truth Verification**: 99.99% provable context provenance
- **Local Operation**: 100% functionality available offline
- **Efficiency**: < 50ms p95 latency for 90% of context requests
- **Adoption**: 500+ active monthly developers, 50+ production agents

## Risk Mitigation
| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| MCP spec changes | Medium | High | Implement version adapter layer; maintain spec compliance test suite |
| Trust model complexity | High | Medium | Progressive disclosure: start with local-only, add federation opt-in |
| Performance at scale | Medium | High | Benchmark-driven development; tiered caching with escape hatches |
| Agent ecosystem fragmentation | Low | Medium | Strict SDK guidelines; reference implementation quality bar |

*Last updated: $(date +%Y-%m-%d)*