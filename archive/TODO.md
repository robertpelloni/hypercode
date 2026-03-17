# Borg TODO

_Last updated: 2026-03-18_

Canonical execution queue for the current repository state.

## P0 — Borg 1.0 release blockers

### 1) Startup orchestration truthfulness
- [ ] Keep `pnpm run dev`, dashboard startup panels, and `startupStatus` semantics fully aligned.
- [ ] Re-verify clean-start behavior on Windows for fresh installs and zero-MCP-server scenarios.
- [ ] Maintain focused startup regression tests whenever readiness logic changes.

### 2) MCP dashboard/runtime stability
- [ ] Run clean root-level smoke verification and confirm no recurring MCP polling/import regressions.
- [ ] Keep route compatibility and request-shape tests aligned with live dashboard behavior.
- [ ] Validate realistic operator `mcpServers` import samples (not only minimal payloads).

### 3) Session supervisor operator reliability
- [ ] Make worktree behavior unambiguous and reliable in runtime, not only tests.
- [ ] Define and ship a clear attach/interaction path (or explicit non-goal) for supervised sessions.
- [ ] Improve failure/recovery UX with operator-visible restart semantics.

### 4) Provider routing trustworthiness
- [ ] Tighten provider auth state, quota windows, and fallback rationale fidelity.
- [ ] Ensure billing/operator surfaces do not overstate data confidence.
- [ ] Keep fallback reasoning explainable from visible dashboard data.

### 5) Dashboard honesty and scope discipline
- [ ] Keep shipped/beta/experimental boundaries explicit in navigation and page headers.
- [ ] Demote or clearly label wrapper/parity-only pages from primary 1.0 flow.
- [ ] Prevent UI breadth from outpacing backend truth.

### 6) Task workflow discipline
- [ ] Keep `tasks/active/` populated with the next 1–3 concrete execution slices.
- [ ] Keep `tasks/backlog/` ordered and mapped to roadmap milestones.

## P1 — Productization after blockers

### 7) Expose high-value backend surfaces coherently
- [ ] Maintain strong operator surfaces for health, logs, audit, tests, and system status.
- [ ] Clearly mark internal-only routers/services that are not product surfaces.

### 8) Memory story consolidation
- [ ] Keep one coherent Borg-native memory model across facts, observations, prompts, summaries, and provenance.
- [ ] Treat external memory ecosystems as adapters unless parity is actually delivered.

### 9) Bridge and extension reliability
- [ ] Keep browser/IDE bridge status tied to real capabilities and live registration.
- [ ] Ensure at least one dependable browser workflow and one dependable IDE workflow end-to-end.

## P2 — Documentation and maintenance hygiene

### 10) Canonical documentation coherence
- [ ] Keep `README.md`, `ROADMAP.md`, `TODO.md`, `HANDOFF.md`, and `CHANGELOG.md` mutually consistent.
- [ ] Keep archive/historical material out of canonical root docs.

### 11) Stub and compatibility debt reduction
- [ ] Remove or clearly document remaining compatibility stubs.
- [ ] Avoid silently relying on stubs for pages presented as production-ready.
