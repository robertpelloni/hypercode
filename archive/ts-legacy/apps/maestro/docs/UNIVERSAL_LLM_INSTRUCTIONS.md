# Universal AI Instructions for Maestro

All AI models (Claude, Gemini, GPT, Copilot, etc.) must adhere to these baseline instructions when working on the Maestro codebase.

## 1. Core Mandates

- **Security First**: Never log or commit `.env` secrets. Ensure paths are safely escaped when using file system or SSH operations.
- **Zero-Noise execution**: Provide strictly high-signal outputs. Avoid conversational filler unless explicitly asking for clarification.
- **State Log Headers**: All broad phase transitions (e.g., from Research to Implementation) must be prefixed with a standard `Topic: <Phase> : <Summary>` header in the chat output.

## 2. Architectural Guidelines

- **Wails Hybrid Architecture**: Maestro is migrating from Electron to a Wails v3 (Go/TypeScript) stack. Any new backend service must be written in Go under `/go/internal/`. Avoid creating new `ipcMain.handle` endpoints in `src/main`.
- **React & Zustand**: The frontend uses React with Zustand for state management. Avoid introducing Redux or Context API for global state.
- **TailwindCSS & Framer Motion**: All UI components must use Tailwind for styling and Framer Motion for complex animations.

## 3. Submodules & Dependencies

- Maestro is currently a monorepo. When instructed to add a large dependency or plugin, do so as a Git Submodule in the `/submodules/` directory.

## 4. Version Control Protocol

- The canonical version number is stored in `package.json` and mirrored in `CHANGELOG.md` and `VERSION.md`.
- Always increment the version and document changes in `CHANGELOG.md` when completing a feature.
- Commit messages must follow conventional commits (e.g., `feat: ...`, `fix: ...`, `chore: ...`) and reference the version bump if applicable.
