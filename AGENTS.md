# AGENTS — HyperCode Contributor & Agent Guide

> **CRITICAL: ALL AGENTS MUST READ `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` BEFORE PROCEEDING.**

This file serves as a reference point for multi-agent workflows (Claude -> Gemini -> GPT) and human operators orchestrating autonomous sessions.

## 1. Multi-Agent Workflows

1. **Handoffs:** Agents communicate primarily through `HANDOFF.md`. When your turn finishes, document exactly what you did, what failed, and what the next agent must do.
2. **Specializations:**
   - **Gemini:** Speed, recursive scripts, massive context processing, repo maintenance.
   - **Claude:** Deep implementation, UI/UX perfection, documentation, styling.
   - **GPT:** Architecture, systemic debugging, strict type enforcement.
3. **Iteration Cycle:** Read -> Strategize -> Execute -> Validate -> Commit -> Handoff. Never stop the party.

## 2. Universal Protocol

- Every session begins by verifying the current project version (`VERSION` file) and ensuring it matches across `package.json`, `CHANGELOG.md`, and dashboard UI displays.
- All major updates to dependencies or architecture must be noted in `CHANGELOG.md` and `HANDOFF.md`.
- Read the instructions located in `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` for specific rules regarding truthfulness, scope, and validation.

*For model-specific quirks, refer to `CLAUDE.md`, `GEMINI.md`, `GPT.md`, and `copilot-instructions.md`.*
