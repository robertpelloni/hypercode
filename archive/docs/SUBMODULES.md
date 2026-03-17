# Submodule Inventory Snapshot

_Generated from `.gitmodules` on 2026-03-09._

This document lists the submodules that are currently registered in Borg's live submodule registry.

| Submodule | Path | Version | Description |
| :--- | :--- | :--- | :--- |
| **MetaMCP** | external/MetaMCP | v2.4.21-315-g565322de | MetaMCP bridge/reference used for Borg MCP compatibility work. |
| **MCP-SuperAssistant** | packages/MCP-SuperAssistant | v.0.5.8-49-g7505316 | Browser-extension-related MCP companion package tracked inside the monorepo. |
| **opencode-autopilot** | packages/opencode-autopilot | 50eaf88df494 | Autopilot/session reference package tracked inside the monorepo. |
| **litellm** | submodules/litellm | litellm_presidio-dev-v1.81.16-938-g28b312f87a | Approved reference for provider routing, fallback chains, quota, and gateway patterns. |
| **mcpproxy** | submodules/mcpproxy | d43b27f | Approved reference for lightweight MCP proxy and tool disclosure patterns. |

## Inventory Notes

- **Canonical live registry**: `.gitmodules`
- **Tracked submodule count**: 5
- **Active top-level zones**: `external/`, `packages/`, `submodules/`
- **Version source**: `git describe --tags --always` inside each checked-out submodule, with gitlink SHA fallback.
