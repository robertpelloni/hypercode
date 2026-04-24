# Agent Instructions

All LLMs interacting with this codebase **MUST** refer to `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` for core operational mandates, technical architecture, and project standards.

This project is actively porting to a Go/Wails architecture. Any new backend services must be written in Go inside `/go/internal/`. Do not add new `ipcMain` handlers.
