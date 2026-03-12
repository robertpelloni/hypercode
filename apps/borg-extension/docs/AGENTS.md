# Universal Agent Instructions

**Project**: Borg Extension
**Repository**: `robertpelloni/borg-extension` (fork of `srbhptl39/Borg-Extension`)
**Version**: `0.7.1`
**Goal**: Create the ultimate browser-based AI operating system via MCP.

> [!IMPORTANT]
> **All LLM agents must read this file before making any changes.**
> Model-specific addenda are in `CLAUDE.md`, `GEMINI.md`, and `GPT.md` — they reference this document as their base.
> **Codex 5.3**: Also read `GPT.md` — same family addenda apply.

---

## 1. Project Overview

Borg Extension is a Chrome/Edge/Firefox extension that bridges the **Model Context Protocol (MCP)** with web-based AI platforms (ChatGPT, Gemini, Perplexity, Grok, DeepSeek, OpenRouter, T3 Chat, GitHub Copilot, Mistral, Kimi, Qwen, Z Chat, and more). It injects a sidebar UI into these platforms, enabling tool discovery, execution, and result insertion — all powered by a local proxy server.

### Architecture

```
AI Website ↔ Chrome Extension (Content Script) ↔ SSE/WS/HTTP Proxy ↔ MCP Servers
```

- **`chrome-extension/`**: Manifest V3 config, background service workers, popup UI.
- **`pages/content/`**: Core React app injected into web pages (Sidebar, Tools, MCP Client).
  - `src/components/sidebar/`: 14 sidebar tab components (Dashboard, AvailableTools, Activity, Settings, Help, Instructions, Macros, ContextManager, CommandPalette, ServerStatus, Onboarding, System, InputArea).
  - `src/hooks/`: React hooks for stores, events, adapters, keyboard shortcuts.
  - `src/stores/`: Zustand stores (app, ui, tool, connection, activity, toast, config, profile, adapter).
  - `src/plugins/adapters/`: 16 per-site adapters (ChatGPT, Gemini, AI Studio, Perplexity, Grok, DeepSeek, OpenRouter, T3 Chat, GitHub Copilot, Mistral, Kimi, Qwen, Z Chat + base/default/example).
  - `src/services/`: Business logic (automation).
  - `src/types/`: TypeScript interfaces.
  - `src/render_prescript/`: DOM rendering and tool detection (functionBlock parser).
- **`packages/`**: Shared internal libraries (`ui`, `shared`, `storage`, `env`, etc.).
- **`docs/`**: Documentation — single source of truth.
- **`scripts/`** and **`bash-scripts/`**: Build and maintenance utilities.

---

## 2. Versioning Protocol

### Single Source of Truth
The canonical version lives in the **`VERSION`** file at the project root. All other version references must match.

### Rules
1. Read the current version from `VERSION`.
2. If you make *any* change, **increment the version**:
   - **Patch** (`0.7.1` → `0.7.2`): Bug fixes, typos, minor tweaks.
   - **Minor** (`0.7.1` → `0.8.0`): New features, UI additions.
   - **Major** (`0.7.1` → `1.0.0`): Breaking changes, architecture overhauls.
3. Update `CHANGELOG.md` with a new entry under the new version, following [Keep a Changelog](https://keepachangelog.com/) format.
4. Run `pnpm run update-version <new_version>` to propagate version to all `package.json` files and the `VERSION` file.
5. **Commit message must reference the version bump**: e.g., `feat: Add Dashboard shortcuts (v0.7.1)`.

### Files That Contain Version
- `VERSION` (canonical)
- `package.json` (root)
- `chrome-extension/package.json`
- `docs/DASHBOARD.md`
- `pages/content/src/components/sidebar/Dashboard/Dashboard.tsx` (`APP_VERSION` constant)
- `pages/content/src/components/sidebar/Settings/Settings.tsx` (export data version)

---

## 3. Changelog Protocol

Update `CHANGELOG.md` **before committing**. Use these categories:
- **Added**: New features or capabilities.
- **Changed**: Modifications to existing features.
- **Fixed**: Bug fixes.
- **Removed**: Deprecated or deleted features.
- **Security**: Vulnerability fixes.

---

## 4. Git Protocol

1. **Branch naming**: `feature/<description>` or `fix/<issue>`.
2. **Commit messages**: [Conventional Commits](https://www.conventionalcommits.org/) — `feat: ...`, `fix: ...`, `chore: ...`, `docs: ...`.
3. **Always merge feature branches into `main`** after completion.
4. **Upstream sync**: Regularly fetch from `upstream` (`srbhptl39/Borg-Extension`) and merge into `main`.
5. **Submodule hygiene**: If submodules are added, update and push them before the parent commit.
6. **Conflict resolution**: When merging, preserve all features from both sides. Never silently drop functionality.
7. **Push after each feature**: Commit, push, then continue to the next task.
8. **Feature branch catch-up**: If feature branches fall behind `main`, merge `main` into them so they can be easily merged later.

---

## 5. Coding Standards

### TypeScript
- **Strict types**: Avoid `any` where possible. Use `unknown` + type guards.
- **React**: Functional components with Hooks. No class components.
- **Icons**: Use `lucide-react`.
- **UI Components**: Use `shadcn/ui` where possible (components in `packages/ui`).
- **State Management**: Zustand stores in `src/stores/`.
- **Styling**: Tailwind CSS (configured in `tailwind.config.ts`).
- **Imports**: Use `@src/` path alias for content script imports; `@extension/` for shared packages.

### Code Comments
- Comment in depth: what it's doing, why it's there, why it's the way it is.
- Document side effects, bugs, optimizations, and alternate methods.
- If code is self-explanatory, leave it bare — don't comment for the sake of commenting.
- Comment existing uncommented code if you encounter it and it needs explanation.

### Quality Checks
Always run before committing:
```bash
pnpm build      # Must pass 12/12 tasks
pnpm type-check # TypeScript compilation
```

---

## 6. Documentation Protocol

### Core Documents
- **VISION.md**: The "why" — project philosophy and ultimate goals.
- **ROADMAP.md**: The "what" — phased feature checklist with status (long-term structural plans).
- **TODO.md**: The "now" — fine-grained tasks, bug fixes, and short-term items.
- **DASHBOARD.md**: Package versions, directory structure, build info.
- **DEEP_ANALYSIS.md**: Technical architecture deep dive.
- **PROJECT_STRUCTURE.md**: Monorepo structure and dependencies.
- **MANUAL.md**: User-facing documentation (setup, features, troubleshooting).
- **CHANGELOG.md**: Version history (developer-facing).
- **DEPLOY.md**: Build, deployment, and publishing instructions.
- **MEMORY.md**: Ongoing observations about the codebase and design preferences.
- **HANDOFF.md**: Agent handoff protocol — what was done, what's next.
- **IDEAS.md**: Brainstorming dump for future innovations.
- **AGENTS.md** (this file): Universal instructions for all LLM agents.
- **CLAUDE.md / GEMINI.md / GPT.md**: Model-specific addenda (Codex 5.3 uses GPT.md).

### Update Rules
- Update the relevant docs whenever you change features, architecture, or configuration.
- Keep `TODO.md` current — check off items as they're completed.
- Update `MEMORY.md` when you discover new patterns or gotchas.
- Update `HANDOFF.md` at the end of each session.

---

## 7. Testing

> No test suite is currently configured. When tests are added, they should go in:
> - `chrome-extension/` → Vitest (already has `vitest run` script).
> - `pages/content/` → Consider Vitest or Playwright for e2e.

---

## 8. Build & Run

```bash
# Install dependencies
pnpm install

# Development (watch mode)
pnpm dev

# Production build (Chrome/Edge)
pnpm build

# Firefox build
pnpm build:firefox

# Package as ZIP
pnpm zip
```

The built extension is output to `dist/`. Load via:
- **Chrome**: `chrome://extensions` → Developer Mode → Load Unpacked → select `dist/`
- **Edge**: `edge://extensions` → Developer Mode → Load Unpacked → select `dist/`
- **Firefox**: `about:debugging` → This Firefox → Load Temporary Add-on → select `dist/manifest.json`

---

## 9. General User Directives

The following directives were provided by the project maintainer and apply to **all sessions**:

1. **Document everything**: All findings, changes, and decisions should be reflected in documentation.
2. **Update version on every build**: Every change warrants a version bump.
3. **Keep changelogs detailed**: Include what changed, why, and what it affects.
4. **Autonomous operation**: Commit, push, and continue to the next task without pausing when possible.
5. **Error correction**: Fix errors encountered during development and document them.
6. **Submodule documentation**: All referenced projects/packages must be documented in `DASHBOARD.md`.
7. **UI completeness**: Every implemented feature must be fully represented in the UI with labels, descriptions, and tooltips.
8. **Handoff readiness**: Leave the project in a state where another agent can pick up seamlessly.
9. **Code comments**: Comment existing code if you see it and it needs explanation.
10. **Git hygiene**: Pull, commit, push regularly between features. Merge feature branches into main. Sync upstream.
11. **Cross-model verification**: Work may be checked by Opus 4.6, Gemini 3 Pro, or Codex 5.3. Document thoroughly.
