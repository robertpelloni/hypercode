# Go Backend Parity Matrix

## Purpose
Track the migration from **TypeScript-primary** backend ownership to **Go-primary** backend ownership.

Status values:
- **Native Go** — implemented and intended to become authoritative in Go
- **Bridge-first** — Go route exists and attempts TS first, then falls back natively
- **Bridge-only** — Go surface exists but only proxies to TS
- **Missing** — no meaningful Go backend parity yet
- **TS-only critical** — still materially owned by TS and blocks Go-primary startup parity

---

## 1. Runtime / startup / lifecycle

| Surface | Current status | Notes |
|---|---|---|
| Go HTTP control plane | Native Go | `go/cmd/hypercode serve` works and exposes large `/api/*` surface |
| Lock/status introspection | Native Go | runtime/config/lock endpoints exist |
| Primary launcher ownership | TS-only critical | default startup path still centered on TS CLI/orchestrator |
| Non-destructive occupied-port behavior | TS-only critical | hardened in CLI TS path; equivalent Go-primary launcher path not yet authoritative |
| Go-first default startup | Missing | explicit target, not yet the default repo behavior |

---

## 2. MCP platform

| Surface | Current status | Notes |
|---|---|---|
| MCP inventory snapshot | Bridge-first / partial Native Go | Go inventory reads `mcp.jsonc` + DB cache; bridge semantics preserved where needed |
| Tool listing/search/call | Bridge-first with Native Go fallback | native aggregation and ranking exist |
| Runtime server list/status | Bridge-first | route exists, still aligned to TS semantics |
| Configured server CRUD | Missing / partial | major remaining parity gap |
| Runtime server add/remove/mutation | Bridge-only / partial | some bridge routes exist, not full native ownership |
| Metadata refresh/cache management | Missing / partial | still needs native authority |
| Telemetry/history/write surfaces | Missing / partial | still primarily TS |
| MCP config import/export/client sync | Bridge-only | not yet full native authority |

---

## 3. Providers / model routing / quotas

| Surface | Current status | Notes |
|---|---|---|
| Provider catalog/status summary | Native Go | provider catalog/status/routing summary endpoints exist |
| Native provider execution | Native Go | Anthropic/OpenAI/Google/DeepSeek/OpenRouter implemented |
| Auto-routing fallback | Native Go | provider selection and fallback logic exist |
| Quota-aware backend authority | Partial Native Go | routing exists, but TS still owns some live provider/quota surfaces |
| Billing/task routing admin mutations | Bridge-only / partial | several Go billing routes bridge into TS |
| Background-service LLM execution authority | TS-only critical | many TS services still invoke models directly |

---

## 4. Memory / persistence / SQLite-backed state

| Surface | Current status | Notes |
|---|---|---|
| Sectioned memory status/search | Bridge-first with Native Go fallback | native SQLite fallback exists |
| Memory search endpoints | Bridge-first | truthful fallback semantics restored |
| Imported session storage | Partial Native Go | Go now has a real imported-session store plus a native file-based ingest endpoint with transcript-hash dedup, archived transcript persistence, memory rows, and instruction-doc regeneration; DB-backed special log parser parity is still incomplete |
| Imported session docs/maintenance | Partial Native Go | Go now provides instruction-doc generation/listing and maintenance stats from the native store, though mixed-runtime cleanup is still ongoing |
| Transcript dedup / retention maintenance | Partial Native Go | transcript-hash dedup now exists in the native Go imported-session store, but broader retention/backfill ownership is still incomplete |
| Workspace/config/secret persistence | Mixed | some Go read surfaces, TS still owns many writes |
| Debate history persistence | Partial Native Go | Go now has a native debate-history store plus native council-history read/write fallbacks, but TS config/policy semantics and broader mixed-runtime cleanup are still incomplete |
| Windows/Node SQLite reliability | Go-preferred | major motivation for migration away from TS `better-sqlite3` |

---

## 5. Session lifecycle / supervision / import-export

| Surface | Current status | Notes |
|---|---|---|
| Session summary/discovery | Native Go / Bridge mix | scanner and summary routes exist |
| Session import scan | Partial Native Go | Go scanner/import routes exist |
| Session export | Native Go | native export path implemented |
| Session supervisor lifecycle | Native Go (beta) | create/start/stop/status/list native endpoints exist |
| Session state/log parity | Partial | not yet equivalent to full TS ecosystem |
| Session CRUD authority | Mixed / bridge-heavy | still not fully Go-owned end-to-end |

---

## 6. Workflows / orchestration / councils

| Surface | Current status | Notes |
|---|---|---|
| Native workflow engine | Native Go | DAG engine + built-ins implemented |
| Workflow API parity | Partial Native Go | native endpoints exist, not yet full TS parity |
| Council debate endpoint | Bridge-first with Native Go fallback | native Go council fallback exists and now persists native fallback debates into the Go debate-history store |
| Council history/persistence | Partial Native Go | Go history status/stats/list/get/delete/supervisor/clear/initialize fallbacks now use native persisted debate history when TS is unavailable |
| Swarm/squad/autodev/darwin | Bridge-only / partial | many Go routes exist but still proxy to TS |
| Director config/status | Bridge-only / partial | visibility exists, not full native ownership |

---

## 7. Background workers / ingestion

| Surface | Current status | Notes |
|---|---|---|
| BobbyBookmarks sync | Native Go exists + TS worker still present | Go sync implemented; TS worker still exists |
| Link backlog crawl/tag enrichment | Partial Native Go | native Go crawler utility, HTTP endpoint, and Go server-owned background worker lifecycle now exist; TS worker still remains in the mixed-runtime world |
| Session auto-import worker | TS-only critical / partially hardened | still TS-owned though startup failure modes reduced |
| Transcript maintenance jobs | TS-only critical | still TS-owned |
| Background ingestion ownership | Mixed | key migration target area |

---

## 8. Git / repo / submodules / system

| Surface | Current status | Notes |
|---|---|---|
| Submodule listing/update | Native Go | native fallback implemented and tested |
| Runtime/system/submodule summary | Native Go | cloud/system routes exist |
| Git/system bridge coverage | Partial | some surfaces still bridge or remain TS-owned |

---

## 9. Streaming / extensions / operator APIs

| Surface | Current status | Notes |
|---|---|---|
| SSE broker | Native Go | implemented for extension parity |
| Browser extension support APIs | Partial Native Go / bridge mix | some parity exists, not complete |
| Dashboard backend contract | TS-only critical | web app still materially depends on TS-oriented surfaces/contracts |
| Native client/operator APIs | Growing Native Go | good progress, but not enough for full backend replacement |

---

## Highest-priority blockers to true Go-primary status

1. **Primary launcher still TS-centered**
   - Go is available, but not yet the default authoritative startup path.
2. **TS SQLite-backed startup services still matter**
   - imported-session maintenance
   - transcript dedup
   - debate history persistence
   - link crawler / HyperIngest ownership
3. **MCP write/config parity is incomplete in Go**
   - CRUD/mutation/cache/telemetry surfaces still lag.
4. **Dashboard still depends heavily on TS-era backend contracts**
   - Go can serve many operator APIs, but not yet the full authoritative backend contract the UI expects.
5. **Background-service LLM execution is still partly TS-owned**
   - despite OpenRouter-free default migration, execution ownership is not fully in Go.

---

## Recommended migration order

### Phase 1 — Control-plane authority
- implement Go-primary launcher/runtime selection
- make Go the default owner of the primary control-plane port
- keep TS as explicit compatibility supplement only

### Phase 2 — Stateful/startup-critical migrations
- port remaining SQLite-backed startup services to Go
- remove startup dependence on TS `better-sqlite3`
- move HyperIngest/link-crawl ownership to Go

### Phase 3 — MCP backend completion
- finish native Go CRUD/mutation/config/telemetry surfaces
- retire TS ownership of MCP backend state

### Phase 4 — Orchestration parity
- finish session/council/workflow/supervisor persistence and control parity
- reduce bridge-first behavior where Go implementations are stable

### Phase 5 — UI/backend contract migration
- point dashboard/native clients at Go-owned APIs
- demote TS backend to compatibility only

---

## Definition of done
Go is the primary version when:
- the default startup path is Go-first
- all major backend surfaces above are **Native Go**
- TS backend ownership is no longer required for normal operator workflows
- remaining TS code is limited to crucial UI/client compatibility roles
