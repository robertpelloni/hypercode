# Design Document: Phase 2 - Advanced Hypercode Coordination

**Date**: 2026-03-23
**Status**: Draft
**Design Depth**: Standard
**Task Complexity**: Medium

## 1. Problem Statement

With the core Hypercode protocol assimilation complete (Phase 1), Maestro now has a robust state layer. However, several "Advanced Coordination" features are still missing to make the integration truly seamless for power users:

1. **Tooling Visibility**: No dedicated command group exists to inspect Hypercode Core health or force-sync the local cache.
2. **Execution Gaps**: Individual CLI commands (like `maestro send`) are not yet committing handoffs to the Hypercode protocol.
3. **Sandbox Awareness**: The system does not yet detect if it is running inside a Hypercode-managed sandbox, which is critical for future security hardening.

## 2. Requirements

- **REQ-2.1: Hypercode Command Group** — Add `maestro hypercode` commands for status and synchronization.
- **REQ-2.2: Universal CLI Handoffs** — Ensure `maestro send` commits a valid Hypercode handoff after agent execution.
- **REQ-2.3: Environment Detection** — Implement a utility to detect Hypercode Sandbox environments via `.hypercode/sandbox` metadata.

## 3. Approach

We will extend the existing TypeScript provider model to support these advanced features.

### Approach: Integrated Coordination

- **CLI Extension**: Add a new `hypercode` command group to `src/cli/index.ts` using lazy-loading patterns.
- **Provider Injection**: Wire `HypercodeLiveProvider` into the `send` command handler.
- **Metadata Discovery**: Implement a `HypercodeEnvironment` service that reads from `.hypercode/sandbox/` to verify isolation status.

## 4. Architecture Extensions

- **HypercodeStatus (CLI)**: A new command that queries both the Live Core and the Local Cache Manager to report on "Sync Skew."
- **HypercodeEnvironment (Service)**: A static utility class for environment detection.

## 5. Agent Team

- **api_designer**: Define the CLI command structure and any new local metadata schemas.
- **coder**: Implement the command handlers and the `maestro send` refactor.
- **tester**: Verify CLI handoff integrity.

## 6. Risk Assessment

- **Risk**: Increased CLI complexity for users who don't use Hypercode.
- **Mitigation**: All `hypercode` commands will be grouped under a single namespace and will gracefully handle the absence of a Hypercode Core.

## 7. Success Criteria

1. `maestro hypercode status` correctly reports connectivity and cache state.
2. `maestro send` produces a new handoff file in `.hypercode/handoffs/`.
3. System logs indicate whether execution is "Sandboxed" vs "Local."
