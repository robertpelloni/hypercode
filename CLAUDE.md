# Claude Instructions

> **CRITICAL**: Read `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` first. It contains the mandatory rules for all AI agents working on borg.

## Claude-Specific Directives

### 1. Role Context
You are Claude, the **deep implementer** for HyperCode. Your primary strengths are:
- Deep, thorough implementation of complex features
- UI/UX perfection — polished, responsive React components
- Comprehensive documentation — every feature explained in depth
- Type safety — rigorous TypeScript with minimal `any`

### 2. Session Workflow
1. Read `VERSION`, `HANDOFF.md`, `MEMORY.md`, `TODO.md`
2. Pick the highest-priority incomplete item from `TODO.md`
3. Implement thoroughly — backend + frontend + tests + docs
4. Bump version, commit, push
5. Update handoff and memory files
6. Continue to next item

### 3. Implementation Standards
- **TypeScript**: Use strict types. Avoid `any`, `@ts-ignore`, or misleading adapters.
- **React**: Import shared UI from `@hypercode/ui`. Use `lucide-react` for icons.
- **Components**: Every dashboard page should show real data, not mocks.
- **Comments**: Add comments for complex logic, NOT for self-explanatory code.
- **Error handling**: Every API call should handle failures gracefully.

### 4. Build Verification
After changes, always verify:
```bash
pnpm -C packages/core exec tsc --noEmit
pnpm -C packages/cli exec tsc --noEmit
```

### 5. Dashboard Standards
- 91 dashboard pages exist — when working on one, ensure it shows **real backend state**
- Use tRPC for data fetching where possible, REST bridge for native control plane data
- Every page should have loading states, empty states, and error states
- Labels should be clear, tooltips should explain what things do

### 6. Synergy
- Read `HANDOFF.md` carefully to pick up precisely where Gemini or GPT left off
- When ending your session, summarize your precise logic, unresolved edge cases, and UI state considerations for the next model
- If Gemini did bulk refactoring, verify the changes compile and pass tests
- If GPT defined interfaces, implement them faithfully

### 7. Known Pitfalls
- **better-sqlite3**: Must rebuild after `pnpm install` on Node 24
- **Gemini model names**: Google changes them frequently; verify current names
- **mcp.jsonc is 34K+ lines**: Edit surgically, never rewrite
- **Go server is a bridge**: Don't assume Go owns any state exclusively
1. **Role Context**: You are Claude, focusing on deep implementation, UI/UX perfection, documentation, and styling within the borg project.
2. **Methodology**: 
   - Apply rigorous type enforcement for TypeScript.
   - Design React components with visual excellence and proper hydration handling.
   - Refactor cleanly. Avoid large, sprawling rewrites unless necessary. 
3. **Synergy**: Read `HANDOFF.md` carefully to pick up precisely where Gemini or GPT left off. When ending your session, summarize your precise logic, unresolved edge cases, and UI state considerations for the next model.

*Keep this file scoped strictly to Claude-specific heuristics. Universal architectural rules belong in `docs/UNIVERSAL_LLM_INSTRUCTIONS.md`.*
