# Memory Document: Ongoing Observations & Context

## Project State (v3.5.1)

Jules Autopilot has successfully pivoted to a **Go-first architecture**.
The `server/` directory and backend-only JS dependencies have been removed.

### Core Observations
1.  **Architecture:**
    -   Frontend: Vite SPA (React 19, Tailwind v4).
    -   Backend: Go runtime (Fiber) serving APIs, WebSockets, and static assets.
    -   Database: SQLite + GORM.
    -   Workspaces: PNPM workspaces manage packages like `@jules/shared` and `@jules/cli`.
2.  **Deployment Challenges:**
    -   The Go version in `backend-go/go.mod` must match the build environment exactly (currently pinned to `1.26.0` for Render).
3.  **Missing/Incomplete Features (Identified for Implementation):**
    -   **Git Diff Monitoring:** Background Shadow Pilot anomaly detection is missing native git diff monitoring.
    -   **CI Pipeline Auto-Fix:** Shadow Pilot has anomaly logging but the CI pipeline auto-fix is incomplete.
    -   **Analytics Dashboard Polish:** Still missing robust frontend wiring for the new Code Churn metrics (currently placeholder/static data).
    -   **Submodule Status Check:** Real-time submodule git status checks in the Go backend are not fully wired to the `/system/status` UI.

### Design Preferences
-   **No SSR:** The frontend relies exclusively on Client-Side Rendering (SPA mode) to avoid Next.js overhead.
-   **Single Source of Truth:** `VERSION.md` is the absolute source of truth for versions, updated via `scripts/update-version.js`.
-   **Universal Instructions:** All AI interactions must refer back to `LLM_INSTRUCTIONS.md`.

## Agent Directives
-   Always check this file before altering the project's macro structure.
-   Prioritize Go runtime stability over Node.js fallback mechanisms.
