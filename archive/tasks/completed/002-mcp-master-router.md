# Task 002: MCP Master Router

## Context
The router is Borg's sharpest differentiator for v1.0. It must aggregate multiple MCP servers behind one endpoint with clear namespaces and operational visibility.

## Scope
- Files: `packages/core/mcp/**`, related shared types, router wiring, and dashboard surfaces strictly required for the acceptance tests
- Tests: `packages/core/mcp/__tests__/aggregator.test.ts`, `lifecycle.test.ts`, `crash-isolation.test.ts`, `traffic-inspector.test.ts`, `namespace.test.ts`, `tool-search.test.ts`

## Requirements
1. Aggregate multiple MCP servers through one Borg endpoint.
2. Prevent tool collisions through namespace isolation.
3. Restart a crashed child server without disturbing healthy peers.
4. Emit traffic-inspector events showing JSON-RPC method, params summary, and latency.
5. Support config sync for supported desktop/editor clients.

## Acceptance Criteria
- [x] Multiple MCP servers are reachable through one Borg endpoint
- [x] Namespaces prevent tool collisions deterministically
- [x] Crash isolation and restart behavior are covered by tests
- [x] Traffic inspector data is available to the dashboard/backend contract
- [x] All listed test files exist and pass
- [x] No `@ts-ignore` added
- [x] `CHANGELOG.md` updated

## Out of Scope
- Rebuilding every third-party MCP project inside Borg
- Recursive scraping or ecosystem indexing work
- Do not create new task files
- STOP when criteria are met
