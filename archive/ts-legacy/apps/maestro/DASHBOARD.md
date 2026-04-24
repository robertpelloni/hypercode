# Maestro Dashboard & Submodule Index

## Overview

This dashboard tracks the status of all submodules, packages, and major architectural directories within the Maestro repository.

As of the `v0.15.6` (Go/TypeScript Hybrid Transition) milestone, the repository is structured as a **monorepo**. Currently, there are **no active git submodules** tracked in the `.gitmodules` configuration. All source code is contained within the root repository.

## Directory Layout

- `/src/main`: The legacy Electron Node.js backend (currently being deprecated).
- `/src/renderer`: The active React/TypeScript frontend (powered by Vite).
- `/src/shared`: Shared types and formatting utilities.
- `/go`: The new Wails v3 Go Backend.
  - `/go/internal/app`: The application bridge binding Go methods to TypeScript.
  - `/go/internal/process`: The cross-platform PTY and child-process manager.
  - `/go/internal/git`: Git service for worktrees and diffs.
  - `/go/internal/storage`: High-performance SQLite session manager.
  - `/go/internal/fs`: Security-gated file system operations.
  - `/go/internal/persistence`: Thread-safe JSON settings management.
  - `/go/internal/ssh`: Remote execution handlers.

## Future Submodule Strategy

As the plugin ecosystem and "Encore Features" grow, community plugins and large independent dependencies (such as custom LLM inference engines or dedicated AST parsers) will be integrated as git submodules mapped to the `/submodules` directory.

_Last Updated: 2026-04-01 (Version 0.15.6)_
