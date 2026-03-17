# Submodule Dashboard — Governance View

> **Version Context**: 2.7.56  
> **Canonical Live Registry**: `.gitmodules`  
> **Inventory Snapshot**: `docs/SUBMODULES.md` (generated, refresh after registry changes)  
> **Purpose**: Operator-facing map for triage, ownership, and synchronization policy.

---

## 1) Source of truth and update contract

- `.gitmodules` is the authoritative live registry for tracked submodule paths and remotes.
- `docs/SUBMODULES.md` is the generated inventory snapshot for path/name/commit/description rollups.
- `docs/SUBMODULE_DASHBOARD.md` is intentionally concise and governance-oriented (this file).
- Any bulk changes to submodules should update `.gitmodules` first, then regenerate/refresh `docs/SUBMODULES.md`, then update this dashboard only if governance structure changes.

## 2) Current inventory posture

Based on the latest generated inventory snapshot:

- **Total tracked modules**: 5
- **Coverage includes**: Borg-owned package references, one external MetaMCP bridge, and two approved study-only upstream references under `submodules/`.
- **Primary tracked zones**:
	- `packages/`
	- `external/`
	- `submodules/`

### Tier A — Runtime-Critical Submodules

| Submodule | Path | Integration | Status |
|-----------|------|-------------|--------|
| MetaMCP | `external/MetaMCP` | Active bridge/reference for Borg MCP compatibility behavior | ✅ Active |
| MCP-SuperAssistant | `packages/MCP-SuperAssistant` | Browser-extension-adjacent package tracked in-repo | ✅ Active |
| opencode-autopilot | `packages/opencode-autopilot` | Autopilot/session package tracked in-repo | ✅ Active |

### Tier B — Strategic Reference Submodules

| Submodule | Path | Integration | Status |
|-----------|------|-------------|--------|
| mcpproxy | `submodules/mcpproxy` | Lightweight MCP proxy/disclosure reference for router design | ✅ Added |
| litellm | `submodules/litellm` | Provider routing, fallback, and quota reference for provider design | ✅ Added |

## 3) Governance tiers

| Tier | Definition | Expected Action |
|---|---|---|
| **Tier A — Runtime-Critical** | Directly used by Borg runtime, dashboard paths, or production workflows | Keep pinned, health-checked, and documented in release notes |
| **Tier B — Strategic Reference** | Frequently consulted implementation references with active parity goals | Keep categorized, periodically re-sync metadata |
| **Tier C — Archive/Exploration** | Long-tail experiments and ecosystem mirrors | Track only; defer active maintenance unless promoted |

## 4) Operational workflow

1. **Discover/ingest** new sources via resource lists and submodule updates.  
2. **Regenerate inventory snapshot** (`docs/SUBMODULES.md`) from `.gitmodules`.  
3. **Prune orphaned gitlinks from the index** with `node scripts/prune_orphaned_gitlinks.mjs --apply` before trusting `git submodule status`.  
4. **Classify critical entries** (Tier A/B/C) for roadmap impact.  
5. **Reflect deltas** in `ROADMAP.md`, `TODO.md`, and `HANDOFF.md` when priorities change.  
6. **Capture release impact** in `CHANGELOG.md` for major category shifts.

## 5) Known gaps to close

- Add explicit Tier A/B/C tagging metadata into the generator pipeline (currently implicit/manual).
- Add freshness metadata (`last synced`) per major top-level category.
- Add dashboard/UI surface for high-priority submodule drift (commit lag and health status).
- Finish removing the remaining orphaned on-disk directories after the index cleanup lands.

---

For full inventory tables (all modules, paths, commits, descriptions), use `docs/SUBMODULES.md` after refreshing it from `.gitmodules`.
