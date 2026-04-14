# TODO

## Current objective

Make borg feel trustworthy in daily operator use.

## P0 — Must do now

- [ ] Fix recurring extension and runtime errors (storage access, SSE or subscription failures)
- [ ] Finish the highest-value dashboard truth pass
- [ ] Verify critical routes show real state, not reassuring fiction
- [ ] Reduce startup and port mismatch confusion
- [ ] Harden published MCP catalog ingestion against stale registry endpoints and misleading error handling
- [ ] Align `README.md`, `ROADMAP.md`, `TODO.md`, and `VISION.md` around one release story
- [ ] Verify first-run and recovery flows are reproducible
- [ ] Tighten docs so public claims match implementation

## P1 — Should do next

<<<<<<< HEAD
- [ ] Add targeted regression coverage for provider fallback, session recovery, and discovery failures
- [ ] Improve session attach and restart clarity
- [ ] Deepen `borg` assimilation beyond harness registration once the upstream submodule exposes real runtime entrypoints
- [ ] Improve memory provenance and retrieval debugging
- [ ] Improve MCP import and export error reporting
- [ ] Improve provider fallback history and quota clarity
- [ ] Improve first-run empty states and setup guidance
- [ ] Improve MCP health and validation reporting
- [ ] Define package seams for `borgd`, `hypermcpd`, `hypermemd`, `hyperingest`, and `hyperharnessd` before extracting binaries
- [ ] Reduce duplicated orchestration logic across CLI, web, desktop, and sidecar surfaces so daemon ownership is clearer
- [ ] Continue Go truth-parity work only where the sidecar can read the same SQLite tables, config files, session artifacts, or deterministic local defaults without pretending to own live orchestration state
- [ ] Keep documenting which Go routes are truthful local fallbacks versus bridge-only passthroughs so operator expectations stay honest
=======
- [x] Add targeted regression coverage for provider fallback, session recovery, and discovery failures
- [x] Improve session attach and restart clarity
- [ ] Deepen `hypercode` assimilation beyond harness registration once the upstream submodule exposes real runtime entrypoints
- [x] Improve memory provenance and retrieval debugging
- [x] Improve MCP import and export error reporting
- [x] Improve provider fallback history and quota clarity
- [x] Improve first-run empty states and setup guidance
- [x] Improve MCP health and validation reporting
- [x] Define package seams for `hypercoded`, `hypermcpd`, `hypermemd`, `hyperingest`, and `hyperharnessd` before extracting binaries
- [x] Reduce duplicated orchestration logic across CLI, web, desktop, and sidecar surfaces so daemon ownership is clearer
- [x] Continue Go truth-parity work only where the sidecar can read the same SQLite tables, config files, session artifacts, or deterministic local defaults without pretending to own live orchestration state
- [x] Keep documenting which Go routes are truthful local fallbacks versus bridge-only passthroughs so operator expectations stay honest
>>>>>>> main

## P2 — Helpful but not urgent

- [x] Publish clearer reliability and latency baselines
- [x] Improve benchmark and diagnostics visibility
- [ ] Reduce duplicate or low-value dashboard surfaces
- [ ] Improve tool search and working-set ergonomics
<<<<<<< HEAD
- [ ] Design the internal MCP server library pipeline: ingestion from public lists, dedupe, provenance, and refresh rules
- [ ] Design how borg benchmarks and ranks overlapping MCP servers and tools over time
=======
- [x] Design the internal MCP server library pipeline: ingestion from public lists, dedupe, provenance, and refresh rules
- [ ] Design how HyperCode benchmarks and ranks overlapping MCP servers and tools over time
>>>>>>> main
- [ ] Promote the most justified package seams into standalone binaries only after contracts and ownership are stable

## Keep visible, but do not let it hijack the queue

- [ ] Build toward a definitive internal library of MCP servers so the model can eventually reach any relevant MCP tool through borg
- [ ] Build toward a universal operator-owned control plane spanning any model, any provider, any session, and any relevant tool
- [ ] Council or debate maturation
- [ ] Mesh or federation ideas
- [ ] Marketplace or community ideas
- [ ] Mobile or desktop parity expansion
- [ ] Rust acceleration work
- [ ] 3D visualization work
- [ ] Economy or payment concepts

## Decision heuristic

When in doubt, choose the task that makes borg:
1. more reliable,
2. more understandable,
3. more inspectable,
4. more honest.
