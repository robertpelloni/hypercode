# Design Document: Phase 3 - Sandbox Hardening & Security

**Date**: 2026-03-23
**Status**: Draft
**Design Depth**: Standard
**Task Complexity**: Medium

## 1. Problem Statement

Maestro now detects whether it is running inside a Hypercode-managed sandbox (via `HypercodeEnvironment`). However, detection is only the first step. To ensure the security of the host system, Maestro must actively enforce constraints when sandboxing is detected:

1. **Unconstrained Execution**: Agents currently spawn processes with full local privileges.
2. **Path Leakage**: Agents may attempt to access files outside the workspace root if not properly restricted.
3. **Implicit Trust**: The system assumes the environment is safe unless explicitly told otherwise.

## 2. Requirements

- **REQ-3.1: Execution Interception** — Intercept all `spawn` calls in `ProcessManager` to check for sandbox constraints.
- **REQ-3.2: Path Enforcement** — When `isSandboxed` is true, validate that the execution `cwd` is within the workspace boundaries.
- **REQ-3.3: Security Logging** — Log all "Escape Attempts" (attempts to run commands or access paths outside the sandbox) to the Hypercode Core.

## 3. Approach

We will implement a middleware-style "Constraint Engine" within the `ProcessManager`.

### Approach: Guarded Spawning

- **HypercodeGuard (Service)**: A new service that evaluates a `ProcessConfig` against the current `HypercodeEnvInfo`.
- **Validation Hook**: Inject `HypercodeGuard.validate(config)` into the start of the `spawn()` method in `ProcessManager`.
- **Handoff Enrichment**: Add security violation markers to the `maestro` metadata in Hypercode handoffs.

## 4. Architecture Extensions

- **HypercodeGuard** (`src/main/services/HypercodeGuard.ts`): Responsible for security policy enforcement.
- **Enhanced ProcessManager**: Modified to consult `HypercodeGuard` before delegating to spawners.

## 5. Agent Team

- **security_engineer**: Define the security policies and validation logic.
- **coder**: Refactor `ProcessManager` and implement `HypercodeGuard`.
- **tester**: Create "Escape Room" tests that attempt to bypass the sandbox.

## 6. Risk Assessment

- **Risk**: Overly strict constraints might break legitimate agent workflows (e.g., accessing globally installed compilers).
- **Mitigation**: Implement an "Audit Mode" that logs violations without blocking them, allowing for policy refinement.

## 7. Success Criteria

1. `ProcessManager` successfully blocks execution if the `cwd` is outside the workspace in a sandboxed environment.
2. Security violations appear in the `maestro` section of the Hypercode handoff.
3. No existing "Local" (non-sandboxed) workflows are affected.
