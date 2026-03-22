# Borg TODO List

_Short-term tasks, bug fixes, and feature implementations. For long-term goals, see ROADMAP.md._

## UI & Dashboard (apps/web)
- [x] Implement Dashboard page/panel listing submodules, versions, dates, and exact repository locations.
- [x] Add explicit explanations of the project directory structure layout directly in the UI with a live workspace inventory.
- [x] Polish the Roundtable/Council UI enough to render live sessions, history, and Smart Pilot compatibility against the migrated council API.
- [x] Wire a non-destructive "Add Borg as MCP server" action into the Integration Hub for detected MCP client targets.
- [x] Add a `borg start --dashboard` / auto-launch dashboard flow so startup matches the intended operator experience.
- [x] Make `borg-orchestrator` (opencode-autopilot) a first-class feature and half of the dashboard grid.
- [x] Integrate Orchestrator server into the standard `pnpm dev` stack with health-check validation.
- [x] Ensure all features are thoroughly documented within the UI (tooltips, labels, descriptions).
- [x] Implement "Code Mode" escape hatch interface in the dashboard.
- [x] Create detailed usage/billing subpanels tracking credit balances per provider.

## Orchestration & Models
- [x] Implement robust model fallback logic: when quota limit errors occur, automatically switch to the next appropriate model/provider (e.g., Gemini 3 Pro -> Codex 5.3 -> Opus 4.6).
- [x] Ensure auto-start/restart logic can handle opencode, superai-cli, codebuff, codemachine, factory droid, codex, claude code, and gemini CLI instances.
- [x] Implement OAuth logic for subscribing to premium models (Copilot Premium Plus, ChatGPT Plus, Claude Pro, Google AI Plus).
- [x] Fully wire up the Council debate to the `SmartPilot` trigger so sessions can autonomously self-correct based on consensus.

## MCP Substrate & Proxies
- [x] Improve MCP router startup: load last-known-good configuration to report immediately, regardless of whether the core is fully ready.
- [x] Build the universal integrated MCP directory so installed servers, published catalog entries, BobbyBookmarks backlog links, and future feature-group assets resolve through one operator-facing directory surface.
- [x] Implement dynamic progressive tool disclosure (show only 5-6 permanent meta tools initially, auto-load others on high confidence).
- [x] Add explicit tool semantic search / tool RAG.
- [x] Implement TOON format parsing and MCP traffic inspection panels.
- [x] Build environment variable and secrets management tool inside the dashboard.

## Memory & RAG
- [x] Integrate `github.com/robertpelloni/bobbybookmarks` as the canonical link backlog datasource with sync, dedupe, research-status, and clustering visibility in Borg.
- [x] Connect the memory subsystem to Google Docs, Gmail, and Google Drive for seamless RAG.
- [x] Implement memory browser extension endpoints (saving web memories, parsing DOM).
- [x] Integrate NotebookLM-style features for source-grounded, citation-backed answers.

## Automation & Scripts
- [x] Create automated script to check versions of all submodules, update them, and generate the UI data feed for the submodule dashboard.
- [x] Harden workspace build startup by clearing stale Next.js web build locks when no active `next build` process exists.
- [x] Standardize and document the 7-step merge protocol for handling upstream forks.

## Documentation
- [x] Create/Update `MEMORY.md` with ongoing observations.
- [x] Create/Update `DEPLOY.md` with explicit deployment/startup instructions.
- [x] Update `CHANGELOG.md` for this sprint.
- [x] Refine `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`, `GPT.md` to reference the Universal LLM Instructions and the new rigorous documentation protocols.
