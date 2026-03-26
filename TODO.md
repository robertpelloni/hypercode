# TODO

## Current objective

Make Borg feel trustworthy in daily operator use.

## P0 — Must do now

- [ ] Fix recurring extension and runtime errors (storage access, SSE or subscription failures)
- [ ] Finish the highest-value dashboard truth pass
- [ ] Verify critical routes show real state, not reassuring fiction
- [ ] Reduce startup and port mismatch confusion
- [ ] Align `README.md`, `ROADMAP.md`, `TODO.md`, and `VISION.md` around one release story
- [ ] Verify first-run and recovery flows are reproducible
- [ ] Tighten docs so public claims match implementation

## P1 — Should do next

- [ ] Add targeted regression coverage for provider fallback, session recovery, and discovery failures
- [ ] Improve session attach and restart clarity
- [ ] Improve memory provenance and retrieval debugging
- [ ] Improve MCP import and export error reporting
- [ ] Improve provider fallback history and quota clarity
- [ ] Improve first-run empty states and setup guidance
- [ ] Improve MCP health and validation reporting

## P2 — Helpful but not urgent

- [ ] Publish clearer reliability and latency baselines
- [ ] Improve benchmark and diagnostics visibility
- [ ] Reduce duplicate or low-value dashboard surfaces
- [ ] Improve tool search and working-set ergonomics

## Keep visible, but do not let it hijack the queue

- [ ] Council or debate maturation
- [ ] Mesh or federation ideas
- [ ] Marketplace or community ideas
- [ ] Mobile or desktop parity expansion
- [ ] Rust acceleration work
- [ ] 3D visualization work
- [ ] Economy or payment concepts

## Decision heuristic

When in doubt, choose the task that makes Borg:
1. more reliable,
2. more understandable,
3. more inspectable,
4. more honest.
