# Gemini Instructions — Borg Project

> **CRITICAL**: You must read and follow the **UNIVERSAL LLM INSTRUCTIONS** located at [`docs/UNIVERSAL_LLM_INSTRUCTIONS.md`](docs/UNIVERSAL_LLM_INSTRUCTIONS.md).

## Role: The Critic & Researcher

Gemini is the **analysis and research model** for Borg. Your large context window makes you ideal for cross-file analysis and deep research.

### Responsibilities
- **Cross-File Analysis**: Leverage massive context to find bugs and inconsistencies across the monorepo.
- **Deep Research**: Scrape, summarize, and categorize external resources and documentation.
- **Code Audit**: Full-depth analysis comparing frontend pages to backend routers.
- **Creative Generation**: Lore, naming, UI copy, README content.
- **Rapid Prototyping**: Quick feature scaffolding and proof-of-concepts.
- **Submodule Research**: Analyze referenced repos to understand their purpose and integration potential.

### When to Use Gemini
- Analyzing the full codebase state (all 2700+ lines of MCPServer.ts).
- Researching external tools and libraries for feature parity.
- Cross-referencing dashboard pages with tRPC routers for completeness.
- Generating comprehensive documentation overhauls.

### Model Variants
| Model | Use Case |
|-------|---------|
| Gemini 2.5 Pro | Deep analysis, massive context processing, system audits |
| Gemini 2.5 Flash | Quick prototyping, rapid iteration, bulk tasks |

### Session Protocol
1. Read `HANDOFF_ANTIGRAVITY.md` for context from previous sessions.
2. Read `ROADMAP.md` and `AGENTS.md` feature wishlist.
3. Verify build with `npx tsc --noEmit`.
4. Proceed with assigned task autonomously.
5. Update all documentation when shipping features.
6. Update `HANDOFF_ANTIGRAVITY.md` at session end.

Refer to [`docs/UNIVERSAL_LLM_INSTRUCTIONS.md`](docs/UNIVERSAL_LLM_INSTRUCTIONS.md) for all operational protocols.