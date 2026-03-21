# Borg TODO List

_Short-term tasks, bug fixes, and feature implementations. For long-term goals, see ROADMAP.md._

## UI & Dashboard (apps/web)
- [x] Implement Dashboard page/panel listing submodules, versions, dates, and exact repository locations.
- [x] Add explicit explanations of the project directory structure layout directly in the UI with a live workspace inventory.
- [x] Polish the Roundtable/Council UI enough to render live sessions, history, and Smart Pilot compatibility against the migrated council API.
- [x] Wire a non-destructive "Add Borg as MCP server" action into the Integration Hub for detected MCP client targets.
- [x] Add a `borg start --dashboard` / auto-launch dashboard flow so startup matches the intended operator experience.
- [ ] Ensure all features are thoroughly documented within the UI (tooltips, labels, descriptions).
- [ ] Implement "Code Mode" escape hatch interface in the dashboard.
- [ ] Create detailed usage/billing subpanels tracking credit balances per provider.

## Orchestration & Models
- [ ] Implement robust model fallback logic: when quota limit errors occur, automatically switch to the next appropriate model/provider (e.g., Gemini 3 Pro -> Codex 5.3 -> Opus 4.6).
- [ ] Ensure auto-start/restart logic can handle opencode, superai-cli, codebuff, codemachine, factory droid, codex, claude code, and gemini CLI instances.
- [ ] Implement OAuth logic for subscribing to premium models (Copilot Premium Plus, ChatGPT Plus, Claude Pro, Google AI Plus).
- [ ] Fully wire up the Council debate to the `SmartPilot` trigger so sessions can autonomously self-correct based on consensus.

## MCP Substrate & Proxies
- [ ] Improve MCP router startup: load last-known-good configuration to report immediately, regardless of whether the core is fully ready.
- [ ] Implement dynamic progressive tool disclosure (show only 5-6 permanent meta tools initially, auto-load others on high confidence).
- [ ] Add explicit tool semantic search / tool RAG.
- [ ] Implement TOON format parsing and MCP traffic inspection panels.
- [ ] Build environment variable and secrets management tool inside the dashboard.

## Memory & RAG
- [ ] Connect the memory subsystem to Google Docs, Gmail, and Google Drive for seamless RAG.
- [ ] Implement memory browser extension endpoints (saving web memories, parsing DOM).
- [ ] Integrate NotebookLM-style features for source-grounded, citation-backed answers.

## Automation & Scripts
- [ ] Create automated script to check versions of all submodules, update them, and generate the UI data feed for the submodule dashboard.
- [x] Harden workspace build startup by clearing stale Next.js web build locks when no active `next build` process exists.
- [ ] Standardize and document the 7-step merge protocol for handling upstream forks.

## Documentation
- [ ] Create/Update `MEMORY.md` with ongoing observations.
- [ ] Create/Update `DEPLOY.md` with explicit deployment/startup instructions.
- [ ] Update `CHANGELOG.md` for this sprint.
- [ ] Refine `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`, `GPT.md` to reference the Universal LLM Instructions and the new rigorous documentation protocols.
