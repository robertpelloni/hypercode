# Submodule Dashboard — Governance View

> **Version Context**: 2.7.56  
> **Canonical Inventory Source**: `SUBMODULES.md` (auto-generated)  
> **Purpose**: Operator-facing map for triage, ownership, and synchronization policy.

---

## 1) Source of truth and update contract

- `SUBMODULES.md` is the authoritative inventory for path/name/commit/description and category rollups.
- `docs/SUBMODULE_DASHBOARD.md` is intentionally concise and governance-oriented (this file).
- Any bulk changes to submodules should regenerate/refresh `SUBMODULES.md` first, then update this dashboard only if governance structure changes.

## 2) Current inventory posture

Based on the latest generated inventory:

- **Total tracked modules**: 786+
- **Coverage includes**: MCP servers, memory systems, CLI harnesses, orchestration frameworks, search/indexing stacks, financial tools, and unsorted ecosystem references.
- **Primary ingestion zones**:
	- `mcp-servers/`
	- `memory/`
	- `external/`
	- `cli-harnesses/`
	- `multi-agent/`

### Tier A — Runtime-Critical Submodules (Phase 69)

| Submodule | Path | Integration | Status |
|-----------|------|-------------|--------|
| MetaMCP | `external/MetaMCP` | Proxy routing via `executeProxiedTool` in `MCPServer.ts` | ✅ Active |
| MCP-SuperAssistant | `packages/MCP-SuperAssistant` | Official browser extension with Borg WebSocket bridge | ✅ Active |
| claude-mem | `packages/claude-mem` | `ClaudeMemAdapter` + `RedundantMemoryManager` | ✅ Active |
| jules-autopilot | `external/jules-autopilot` | `cloudDevRouter` + `/dashboard/cloud-dev` | ✅ Active |
| deer-flow | `external/deer-flow` | `DeerFlowBridgeService` + `/dashboard/deer-flow` | ✅ Active |

## 3) Governance tiers

| Tier | Definition | Expected Action |
|---|---|---|
| **Tier A — Runtime-Critical** | Directly used by Borg runtime, dashboard paths, or production workflows | Keep pinned, health-checked, and documented in release notes |
| **Tier B — Strategic Reference** | Frequently consulted implementation references with active parity goals | Keep categorized, periodically re-sync metadata |
| **Tier C — Archive/Exploration** | Long-tail experiments and ecosystem mirrors | Track only; defer active maintenance unless promoted |

## 4) Operational workflow

1. **Discover/ingest** new sources via resource lists and submodule updates.  
2. **Regenerate canonical inventory** (`SUBMODULES.md`).  
3. **Classify critical entries** (Tier A/B/C) for roadmap impact.  
4. **Reflect deltas** in `ROADMAP.md`, `TODO.md`, and `HANDOFF.md` when priorities change.  
5. **Capture release impact** in `CHANGELOG.md` for major category shifts.

## 5) Known gaps to close

- Add explicit Tier A/B/C tagging metadata into the generator pipeline (currently implicit/manual).
- Add freshness metadata (`last synced`) per major top-level category.
- Add dashboard/UI surface for high-priority submodule drift (commit lag and health status).

---

For full inventory tables (all modules, paths, commits, descriptions), use `SUBMODULES.md`.
