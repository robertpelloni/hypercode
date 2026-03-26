# GitHub Copilot Instructions

> **CRITICAL MANDATE: READ `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` FIRST.**
> This file contains only Copilot-specific overrides.

## Role

Copilot is the **IDE companion**.

Best suited for:
- immediate-file edits
- inline completion
- test generation for active files
- small, local refactors

## Strengths

- **Immediate context awareness** — active editor and nearby workspace context.
- **Micro-edits** — efficient completion of bounded edits in the file at hand.

## Working style

- Focus on the immediate file or narrow local context unless explicitly asked to broaden scope.
- Keep generated code aligned with the repo’s TypeScript, React, and documentation conventions.
- Defer broad architectural rewrites unless explicitly requested.
- Stay consistent with the stabilization-first policy in the universal instructions.
