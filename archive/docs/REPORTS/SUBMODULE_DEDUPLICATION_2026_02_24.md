# Submodule Deduplication Audit — 2026-02-24

## ⚠️ Executive Summary
The Borg repository currently contains **hundreds** of submodule mappings, many of which point to the same external repository URLs. This structural redundancy increases build times, disk usage, and the risk of context drift between different versions of the same dependency.

## 📊 Top Redundancy Candidates
The following repositories are anchored in multiple locations. Consolidation is recommended.

| Repository | Count | Paths |
|------------|-------|-------|
| `algonius/algonius-browser` | 6 | `external/computer-use/algonius-browser`, `mcp-servers/browser/algonius-browser`, etc. |
| `bkircher/skills` | 5 | `external/forks/bkircher/skills`, `skills/bkircher-skills`, etc. |
| `Arindam200/awesome-ai-apps` | 5 | `external/awesome-ai-apps`, `mcp-hubs/awesome-ai-apps`, etc. |
| `toolsdk-ai/toolsdk-mcp-registry` | 5 | `external/toolsdk-mcp-registry`, `mcp-hubs/toolsdk-mcp-registry`, etc. |
| `punkpeye/awesome-mcp-servers` | 5 | `external/awesome-mcp-servers`, `mcp-hubs/awesome-mcp-servers-punkpeye`, etc. |
| `block/goose` | 4 | `cli-harnesses/goose`, `cli-harnesses/goose-block`, `external/clis/goose`, etc. |
| `OpenHands/OpenHands` | 4 | `agents/refs/OpenHands`, `multi-agent/OpenHands`, etc. |
| `robertpelloni/metamcp` | 4 | `mcp-hubs/metamcp`, `multi-agent/metamcp`, etc. |

## 🛠️ Recommendations
1. **Consolidation**: Select one canonical path for each dependency (preferably under `external/` or `references/`) and remove the redundant mappings.
2. **Path Standardisation**: Use a consistent directory structure for categories (e.g., all MCP servers under `mcp-servers/`).
3. **Index Cleanup**: Update `BORG_MASTER_INDEX.jsonc` once paths are finalized.

## ✅ Completed Repairs
The following orphaned mappings were found in the git index and restored to `.gitmodules` during this session:
- `external/frameworks/awesome-llm-apps`
- `external/frameworks/mcp-reasoner`
- `packages/MCP-SuperAssistant`
- `packages/claude-mem`
- `packages/mcp-directory/general/awesome-mcp-servers`
- `packages/mcp-directory/general/toolsdk-mcp-registry`
- `packages/opencode-autopilot`

**Status**: Green (Fatal errors resolved).
