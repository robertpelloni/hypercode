# Built-In Tools Evidence Lock

> Date: 2026-03-18  
> Purpose: source-pin every competitor tool contract before declaring parity complete.

## How to Use

For each platform, fill all required fields:

- **Primary source URL** (official docs/repo)
- **Version/commit/date pin**
- **Exact tool names**
- **Parameter schemas**
- **Return payload shape**
- **Approval/permission model**
- **Known caveats**

A platform is only marked **Locked** when all fields are complete and reviewed.

---

## OpenCode — ✅ Locked (repo-sourced)

- Primary source (in-repo): `archive/docs/RESEARCH_COMPETITORS.md`
- Version pin: research snapshot in repo (2026-02 era)
- Exact built-ins captured:
  - `ls(path, recursive)`
  - `grep(pattern, path, include, literal_text)`
  - `read(file_path)`
  - `view(file_path, offset, limit)`
  - `edit(file_path, ...)`
  - `patch(file_path, diff)`
  - `diagnostics(file_path)`
  - `bash(command, timeout)`
  - `fetch(url, format)`
  - `agent(prompt)`
- Permission model captured:
  - Allow once / allow session / deny
  - Non-interactive auto-approve mode
- Caveat:
  - Should still be revalidated against latest upstream release.

---

## GitHub Copilot CLI — 🟡 Partially Locked

- Primary source (in-repo): `archive/docs/RESEARCH_COMPETITORS.md`
- Secondary sources (in-repo):
  - `archive/OmniRoute/docs/FEATURES.md` (CLI tools + CLI agents listings)
  - `archive/OmniRoute/docs/CODEBASE_DOCUMENTATION.md` (GitHub/Copilot executor notes)
- Version pin: research snapshot in repo
- Captured commands:
  - `suggest`
  - `explain`
- Missing for full lock:
  - argument-level schema details
  - machine-readable response shape contract
  - latest release diff verification

---

## Gemini CLI — 🟡 Partially Locked

- Primary source (in-repo): `archive/docs/RESEARCH_COMPETITORS.md`
- Secondary sources (in-repo):
  - `archive/OmniRoute/docs/FEATURES.md`
  - `archive/OmniRoute/docs/CODEBASE_DOCUMENTATION.md`
  - `archive/docs/CLIENT_CONFIGS.md`
- Captured capability classes:
  - search grounding
  - file operations
  - shell
  - web fetch
  - trusted folders/policies
- Missing for full lock:
  - exact tool/command names with signatures
  - response schema contracts
  - version-pinned official doc links

---

## Codex CLI — 🟡 Partially Locked

- Primary source (in-repo):
  - `archive/OmniRoute/docs/FEATURES.md`
  - `archive/OmniRoute/docs/CODEBASE_DOCUMENTATION.md`
- Captured evidence:
  - Listed as first-class CLI tool + built-in CLI agent in OmniRoute docs
  - Codex executor behavior documented (instruction injection, thinking controls)
- Missing for full lock:
  - official upstream Codex CLI tool manifest + version pin
  - exact built-in command/function signatures
  - approval/permission model semantics

## Claude Code — 🟡 Partially Locked

- Primary source (in-repo):
  - `archive/OmniRoute/docs/FEATURES.md`
  - `archive/docs/CLIENT_CONFIGS.md`
- Captured evidence:
  - Listed as first-class CLI tool in dashboard feature inventory
  - Config locations documented for Windows/macOS/Linux
- Missing for full lock:
  - official upstream tool/command manifest + version pin
  - exact built-in signatures and output contracts
  - approval/permission model semantics

## Cursor — 🟡 Partially Locked

- Primary source (in-repo):
  - `archive/docs/CLIENT_CONFIGS.md`
  - `archive/OmniRoute/docs/FEATURES.md`
  - `archive/OmniRoute/docs/CODEBASE_DOCUMENTATION.md`
- Captured evidence:
  - Config locations documented
  - Listed as supported CLI/IDE integration surface
  - Cursor executor notes captured (auth/request protocol specialization)
- Missing for full lock:
  - official Cursor built-in tool manifest + version pin
  - exact tool signatures/return shapes
  - approval model semantics

## VS Code + Copilot IDE Agent — ❌ Unlocked

- Required evidence:
  - official docs + version pin
  - exact built-ins and signatures
  - approval/permission model semantics

## Windsurf — 🟡 Partially Locked

- Primary source (in-repo): `archive/docs/CLIENT_CONFIGS.md`
- Captured evidence:
  - Windsurf MCP config location documented
- Missing for full lock:
  - official Windsurf built-in tools manifest + version pin
  - exact tool signatures/return shapes
  - approval model semantics

## Kiro — 🟡 Partially Locked

- Primary source (in-repo):
  - `archive/OmniRoute/docs/FEATURES.md`
  - `archive/OmniRoute/docs/CODEBASE_DOCUMENTATION.md`
- Captured evidence:
  - Listed as supported provider/tooling surface
  - Dedicated Kiro executor behavior documented
- Missing for full lock:
  - official Kiro built-in tools/commands manifest + version pin
  - exact tool signatures/return shapes
  - approval model semantics

## Antigravity — 🟡 Partially Locked

- Primary source (in-repo):
  - `archive/OmniRoute/docs/FEATURES.md`
  - `archive/OmniRoute/docs/CODEBASE_DOCUMENTATION.md`
- Captured evidence:
  - Listed as supported CLI/provider surface in feature docs
  - Dedicated Antigravity executor behavior documented
- Missing for full lock:
  - official Antigravity built-in tools manifest + version pin
  - exact tool signatures/return shapes
  - approval model semantics

---

## Evidence Quality Note

Current “Partially Locked” status for several platforms is **integration-level** evidence sourced from Borg's archived research and OmniRoute documentation. This is useful for roadmap priority, but it is **not yet authoritative first-party tool-schema evidence**.

---

## Borg Readiness Gate

Do not claim “first-class parity complete” until:

- [ ] All target platforms are **Locked**
- [ ] Golden fixtures exist for tool call/response compatibility
- [ ] Alias profiles pass CI
- [ ] Permission model equivalence tests pass
- [ ] Change log includes parity delta per release
