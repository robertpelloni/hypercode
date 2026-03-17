# Borg Project Rules & Guidelines

## Core Philosophy
1.  **User First, Coding Second**: The user's experience (UX) is paramount. If a feature works but feels clunky (e.g., interrupts typing), it is a **bug**.
2.  **Proven Methods Over Experimentation**: Do not break existing functionality to try "cool" new things. Use established patterns that work reliable.
3.  **Polish & Configurability**:
    - Every feature must be **configurable** (via `config` object or UI).
    - Every feature must be **documented** (in `/docs` and JSDoc).
    - Defaults should be sensible, but overrides must be possible.
4.  **Seamless Autopilot**: The "Autopilot" (Agent Swarm) must operate *in the background* without hijacking the user's input/focus unless explicitly requested.

## Development Protocol
1.  **Documentation First**: Before implementing complex features, update `ROADMAP.md` and create a design plan.
2.  **Config First**: When adding a service/widget, define its configuration interface first.
    ```typescript
    interface MyFeatureConfig {
      enabled: boolean;
      refreshInterval: number;
      // ...
    }
    ```
3.  **Validation**: Verify changes in the actual Dashboard/CLI before marking as done.
4.  **No "Placeholder" Code**: Do not leave `TODO` comments for core logic. "Mock" data is acceptable only for UI prototyping, not for "shipped" features.

## Architecture Standards
- **Core**: Contains pure logic, tRPC routers, and Orchestration. No UI dependencies.
- **UI**: Purely presentational. Fetches data via tRPC.
- **Supervisor**: Handles OS interactions (low-level). **MUST NOT BLOCK USER INPUT.**
- **Submodules**: Treated as external dependencies. Do not modify submodule code directly unless contributing upstream; wrap functionality in `packages/core`.
