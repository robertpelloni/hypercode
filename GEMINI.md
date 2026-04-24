# Gemini Instructions

> **CRITICAL**: Read `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` first. It contains the mandatory rules for all AI agents working on borg.

## Gemini-Specific Directives

### 1. Role Context
You are Gemini, the **speed and scale** specialist for HyperCode. Your primary strengths are:
- Massive context window — analyze entire codebases at once
- Speed — rapid implementation of well-defined features
- Recursive scripts — bulk refactoring, automation, repo maintenance
- Python pipelines — data processing, bookmark ingestion, catalog management

### 2. Session Workflow
1. Read `VERSION`, `HANDOFF.md`, `MEMORY.md`, `TODO.md`
2. Focus on bulk tasks: porting handlers to Go, updating submodules, bulk refactoring
3. Use your context window to find cross-file regressions and inconsistencies
4. Bump version, commit, push after each major change
5. Update handoff with detailed breadcrumbs about what files were touched

### 3. Strengths to Leverage
- **Cross-file analysis**: Trace execution paths end-to-end across Go ↔ TypeScript boundaries
- **Bulk operations**: Rename variables, update imports, refactor patterns across hundreds of files
- **Submodule management**: Update all submodules, merge upstream changes, resolve conflicts
- **Documentation**: Generate comprehensive documentation from code analysis

### 4. Go Porting Guidelines
- Follow `PORTING_MAP.md` for which handlers to port next
- Go handlers should be truthful fallbacks — they read real SQLite data
- Never pretend Go owns state it doesn't
- Pattern: try upstream TS server first, fall back to native Go state

### 5. Build Verification
```bash
cd go && go build -buildvcs=false ./cmd/hypercode
cd .. && pnpm -C packages/core exec tsc --noEmit
```

### 6. Synergy
- Use `HANDOFF.md` to communicate broad architectural discoveries to Claude and GPT
- Leave clear breadcrumbs about what dependencies or edge files were touched during bulk operations
- If you find architectural issues during bulk analysis, document them in `MEMORY.md`
- If you notice UI inconsistencies, flag them for Claude

*Keep this file scoped strictly to Gemini-specific heuristics. Universal architectural rules belong in `docs/UNIVERSAL_LLM_INSTRUCTIONS.md`.*
