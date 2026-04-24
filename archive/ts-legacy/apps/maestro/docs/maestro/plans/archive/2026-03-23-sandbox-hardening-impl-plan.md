# Implementation Plan: Phase 3 - Sandbox Hardening & Security

**Date**: 2026-03-23
**Task Complexity**: Medium
**Design Document**: docs/maestro/plans/2026-03-23-sandbox-hardening-design.md

## 1. Plan Overview

This phase introduces the `HypercodeGuard` service to enforce security policies when Maestro is running in a Hypercode-managed sandbox. It focuses on path validation and execution control.

## 2. Execution Strategy

| Phase | Task                                     | Agent             | Mode       |
| ----- | ---------------------------------------- | ----------------- | ---------- |
| 1     | Policy Definition & Guard Implementation | security_engineer | Sequential |
| 2     | ProcessManager Integration               | coder             | Sequential |
| 3     | Security Validation & Bypass Testing     | tester            | Sequential |

## 3. Phase Details

### Phase 1: Policy Definition & Guard Implementation

- **Objective**: Create the `HypercodeGuard` service with path validation logic.
- **Files to Create**: `src/main/services/HypercodeGuard.ts`.
- **Deliverables**: A service that returns `policyResult: { allowed: boolean, reason?: string }` based on environment context.

### Phase 2: ProcessManager Integration

- **Objective**: Hook `HypercodeGuard` into the `spawn` lifecycle.
- **Files to Modify**: `src/main/process-manager/ProcessManager.ts`.
- **Deliverables**: Modified `spawn()` method that errors early if `HypercodeGuard` blocks the configuration.

### Phase 3: Security Validation & Bypass Testing

- **Objective**: Verify that sandbox escapes are blocked.
- **Files to Create**: `src/__tests__/integration/HypercodeGuard.test.ts`.
- **Validation**: Ensure `spawn` fails when `cwd` is outside the detected workspace in sandboxed mode.

## 4. Cost Summary

| Phase     | Agent             | Est. Input | Est. Output | Est. Cost |
| --------- | ----------------- | ---------- | ----------- | --------- |
| 1         | security_engineer | 5K         | 3K          | $0.17     |
| 2         | coder             | 8K         | 2K          | $0.16     |
| 3         | tester            | 5K         | 2K          | $0.13     |
| **Total** |                   |            |             | **$0.46** |
