# L3 Promotion Strategy

## Overview

This document outlines the systematic path from L2 (first-party docs captured) to L3 (fully locked with version pins and response payload fixtures).

## L3 Blocking Gaps (per platform)

### 1. GitHub Copilot CLI → L3

**Requirement 1: Runtime Version Pin**
```bash
# Capture command
copilot version --json
# Expected output format
{
  "version": "1.x.y",
  "buildDate": "2026-XX-XX",
  "commit": "xxxxxxxx"
}
```

**Requirement 2: Response Payload Fixture Set**
- [ ] `bash` tool call response (success + error variants)
- [ ] `edit` tool response (conflict detection)
- [ ] `view` tool response (file encoding handling)
- [ ] `powershell` tool response (exit code mapping)
- [ ] Hook decision contract (preToolUse)

**Requirement 3: CI Validation Script**
- Verify `copilot version` is pinned in lock document
- Validate hook contract structure against schema
- Check permission pattern syntax matches documented rules

---

### 2. Codex CLI → L3

**Requirement 1: Runtime Version Pin**
```bash
# Capture command
codex features --json
# Expected: version in features list response
```

**Requirement 2: Response Payload Fixture Set**
- [ ] Sandbox transition response (read-only → workspace-write)
- [ ] Approval JSON contract (`{ permissionDecision, approvalReason }`)
- [ ] Tool execution response with exit code semantics
- [ ] `/permissions` interactive command response contract

**Requirement 3: CI Validation**
- Verify `--ask-for-approval` behavior matches documented modes
- Validate sandbox preset combinations are exhaustive
- Check JSON output formats match spec

---

### 3. Claude Code → L3

**Requirement 1: Release Pin**
```json
{
  "platform": "Claude Code",
  "versionSource": "claudeCode.extensionVersion",
  "lastVerified": "2026-03-19",
  "capturedVersion": "x.y.z"
}
```

**Requirement 2: Response Payload Fixture Set**
- [ ] PreToolUse hook decision contract
- [ ] Permission rule evaluation result
- [ ] Bash execution response with exit code
- [ ] MCP tool invocation response

**Requirement 3: CI Validation**
- Verify hook exit code map (0=allow, 2=deny)
- Validate tool name matchers exhaustive (Shell, Read, Write, etc.)
- Check permission rule precedence (deny > ask > allow)

---

### 4. Cursor → L3

**Requirement 1: Version Pin**
```bash
# Capture from cursor CLI or extension version
# Store in fixture alongside hook schema version
```

**Requirement 2: Response Payload Fixture Set**
- [ ] Hook event payload (all categories: Shell, Read, Write, Grep, Delete, Task, MCP)
- [ ] Permission decision response
- [ ] Tool execution result (exit code semantics)

**Requirement 3: CI Validation**
- Verify hook matchers match documented categories
- Validate decision responses align with Cursor behavior
- Check MCP tool invocation patterns

---

### 5. Gemini CLI → L3

**Requirement 1: Version Pin**
```bash
# Capture from CLI version output
gemini --version
```

**Requirement 2: Response Payload Fixture Set**
- [ ] Slash command response contracts
- [ ] Built-in tool mutation confirmation semantics
- [ ] Context switching response
- [ ] Tool execution output format

**Requirement 3: CI Validation**
- Verify slash command inventory completeness
- Validate safety confirmation fields present on mutations
- Check MCP integration contract

---

### 6. Kiro → L3

**Requirement 1: Version Pin**
```bash
# Capture from hooks.json schema version or CLI
kiro --version
```

**Requirement 2: Response Payload Fixture Set**
- [ ] Hook event contracts (all event types)
- [ ] Tool execution response
- [ ] MCP server response format
- [ ] Permission decision semantics

**Requirement 3: CI Validation**
- Verify hook event types completeness
- Validate MCP response structure
- Check version pin strategy doc

---

## Implementation Timeline

### Phase 1: Version Pinning Infrastructure ⏭️ NOW
1. Create `docs/fixtures/VERSION_PINS.jsonc` with structure for all L2 platforms
2. Document how to capture versions for each platform (CLI command or config file location)
3. Add GitHub Actions workflow to validate version pins on CI

### Phase 2: Golden Fixtures (Response Payloads) ⏭️ NEXT
1. Create `docs/fixtures/{platform}-tool-responses.yaml` for each platform
2. Populate with concrete I/O examples from captured docs
3. Add JSON Schema validation for each fixture

### Phase 3: Tool Equivalence Mapping
1. Create `docs/fixtures/TOOL_EQUIVALENCE_MATRIX.md`
2. Map semantic tool call equivalence across platforms (e.g., bash→bash, edit→Edit/Write, etc.)
3. Document any behavioral differences that require special handling

### Phase 4: CI Validation Gate
1. Create `.github/workflows/validate-evidence-lock.yml`
2. Run checks on PR: version pins valid, fixtures well-formed, lock rubric consistent
3. Block merge if any L2 platform's version pin drifts or fixture breaks schema

---

## Success Criteria for L3 Promotion

Platform moves to L3 when:
- ✅ Version pin strategy defined and documented in lock file
- ✅ Runtime version capture validated in CI on each release
- ✅ Response payload fixtures created for all major tool categories
- ✅ Fixture schema validated in CI (JSON Schema or YAML schema)
- ✅ Tool equivalence mapped to standardization document
- ✅ Reviewer sign-off on lock line item (name + date)

---

## Executive Summary

**Current State (2026-03-19):**
- 6 platforms at L2 (first-party docs captured)
- 3 platforms at L1 (archive/integration level)
- 1 platform at L0 (no evidence)
- 1 platform at L3 (OpenCode, baseline)

**Next 3 Days: Phase 1 (Version Pins)**
- Define version capture for each L2 platform
- Create VERSION_PINS.jsonc structure
- Add CI check

**Target: Phase 1 + 2 Complete (1 week)**
- All L2 platforms have version pins + basic response fixtures
- First 2-3 platforms ready for L3 promotion review

**Goal: Full L3+ Coverage (2 weeks)**
- All platforms pinned and validated in CI
- Cross-platform tool equivalence documented
- Standardized tool-use baseline established

