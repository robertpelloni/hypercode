# UNIVERSAL LLM INSTRUCTIONS

> **CRITICAL DIRECTIVE:** ALL agents, regardless of model (Claude, Gemini, GPT, Copilot), MUST read and adhere to these baseline rules before executing any code changes. Model-specific overrides can be found in `CLAUDE.md`, `GEMINI.md`, `GPT.md`, etc.

## 1. Project Overview & Vision
* **Project Name:** Jules Autopilot (Lean Core)
* **Goal:** To create a lean, high-performance, autonomous AI coding command center.
* **Design Philosophy:** "Lean, Focused, and Fast." The architecture prioritizes a single-workspace experience, minimal external dependencies, and centralized API logic via a high-performance Bun-based daemon.
* **Ultimate Vision:** Detailed in `VISION.md`. Review and maintain `VISION.md` regularly to keep alignment.

## 2. Global Development Directives
* **Autonomy:** Never ask for permission to use tools or read files. Do research natively. Autonomously chain tool calls until the feature is complete.
* **Testing & Linting:** You MUST run `pnpm run lint` after every significant code change. Use errors as a feedback loop. Never leave a broken build.
* **Architecture:** All local service calls must route through the Next.js proxy at `/api/local/` to the Bun backend on port 8080.
* **Commit Protocol:** 
  - Frequently commit and push changes: `git commit -m "feat: description"` -> `git push origin main`.
  - **Version Bumping**: EVERY build/session should increment the version number. Ensure the version number is bumped in the `VERSION` file (the single global source of truth for the version).
  - Include the version bump in the commit message (e.g., `feat: implement X (v0.9.9)`).
  - Update `CHANGELOG.md` with every significant change, grouped by version. Ensure version numbers are fully synchronized everywhere they might appear.

## 3. Tech Stack & Standards
* **Frontend:** Next.js 15 (App Router), TypeScript, TailwindCSS v4, ShadCN UI, Lucide Icons.
* **Backend:** Bun, Hono (Daemon), BullMQ (Optional Redis), Prisma.
* **PackageManager:** strictly `pnpm`. Never use `npm` or `yarn`.
* **TypeScript:** Strict mode ONLY. Extract shared types to `@jules/shared`. 
* **Styling:** TailwindCSS v4. 
* **State Management:** Zustand for global state, Context for local provider patterns.
* **Database:** Prisma ORM with SQLite for local dev.

## 4. Operational Mandates
* **No "Enterprise" Bloat:** Avoid adding swarms, complex submodule synchronization, or heavy cloud-only telemetry. Keep the core lean.
* **Mock-First Development:** Maintain mock data fallbacks in the daemon to ensure the UI remains functional without live API keys.
* **Process Safety:** Never use broad `taskkill` commands. Only terminate specific PIDs started by you.
* **Documentation Maintenance:** Continually update and maintain `ROADMAP.md`, `TODO.md`, `MEMORY.md`, and `IDEAS.md`. Comment code in-depth (what, why, alternative methods explored) if it's complex, but avoid redundant commenting for self-explanatory code.

## 5. Artifacts and Handoffs
* For massive codebase changes, aggressively document findings in `HANDOFF.md` before ending a session.
* Continually update `ROADMAP.md` and `TODO.md` to reflect the exact state of what is finished vs. what is remaining.
* Document input information in comprehensive, thorough, full extreme detail. If you summarize, do not lose granular details from the user.
* All AI models (Gemini, Claude, GPT, Copilot) MUST follow these unified instructions and cross-reference them.
