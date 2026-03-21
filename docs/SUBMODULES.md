# Submodule Directory & Architecture

Borg uses a highly modular architecture that integrates numerous best-in-class upstream projects and forks as git submodules. This allows us to maintain feature parity, borrow capabilities, and orchestrate them from a single unified dashboard.

## Directory Structure

*   `archive/`: Contains deprecated or deeply integrated submodules (e.g., the former `opencode-autopilot`, now assimilated as Borg Orchestrator inside core).
*   `packages/`: Houses core internal libraries, tools, and some submoduled logic (like `claude-mem`).
*   `external/`: Houses large upstream reference projects (e.g., MetaMCP, OmniRoute).

## Tracked Submodules

*(This list is intended to be dynamically rendered in the UI via the `/dashboard/submodules` endpoint. Ensure `git submodule update` is run to keep versions current).*

### Active Integrations
| Name | Path | Origin | Purpose |
| :--- | :--- | :--- | :--- |
| **MetaMCP** | `external/MetaMCP` | `https://github.com/metatool-ai/metamcp` | Core reference for MCP routing and aggregation. |
| **OmniRoute** | `archive/OmniRoute` | `https://github.com/diegosouzapw/OmniRoute` | Reference for LLM routing and fallback logic. |
| **Claude-Mem** | `packages/claude-mem` | `https://github.com/robertpelloni/claude-mem` | Core memory subsystem fork. |
| **LiteLLM** | `archive/submodules/litellm` | `https://github.com/BerriAI/litellm` | Reference for multi-provider API translation and load balancing. |

## Updating Submodules

To bring all submodules up to date with their respective upstreams:
```bash
git submodule update --init --recursive --remote
```

When integrating features from submodules into Borg core, always execute the following protocol:
1. Research the codebase.
2. Port logic to `@borg/core`.
3. Achieve 100% feature parity.
4. Remove the submodule if it is no longer needed as a reference.
