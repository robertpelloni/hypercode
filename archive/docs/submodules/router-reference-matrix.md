# Router Reference Matrix

_Last updated: 2026-03-08_

## Current tracked submodules

| Path | Repo | Role | Recommendation |
|---|---|---|---|
| `external/MetaMCP` | `robertpelloni/MetaMCP` | Existing MetaMCP bridge/reference | **Keep for now**, but prefer upstream replacement later if the dependency remains useful |
| `packages/MCP-SuperAssistant` | `robertpelloni/MCP-SuperAssistant` | MCP-adjacent package | **Review for removal** from router-reference set; not a core router benchmark |
| `packages/opencode-autopilot` | `robertpelloni/opencode-autopilot` | Agent/autopilot reference | **Keep outside router decisions**; relevant to sessions/agents, not MCP router design |
| `submodules/mcpproxy` | `Dumbris/mcpproxy` | Approved MCP proxy/disclosure reference | **Added** as lightweight routing + retrieval benchmark |
| `submodules/litellm` | `BerriAI/litellm` | Approved provider-routing reference | **Added** as high-priority provider/fallback benchmark |

## Shortlisted upstream references

| Repo | Area | Signals | Best ideas to borrow | Risks / mismatches | Recommendation |
|---|---|---|---|---|---|
| `mcp-router/mcp-router` | MCP server management UX | ~1.8k stars, recent activity, TS monorepo, releases | One-click client integration, per-server/per-tool toggles, projects/workspaces, local-first UX | More of a desktop MCP manager than a Borg-style backend router | **Reference only**; strong UX/product benchmark, weak fit as core router submodule |
| `microsoft/mcp-gateway` | Enterprise MCP gateway | ~505 stars, active within days, clear architecture docs, REST control plane | Session affinity, adapter lifecycle APIs, dynamic tool registration, authz, observability | Heavy .NET + Kubernetes + Azure bias; too heavyweight for Borg 1.0 implementation style | **Reference only**; excellent architecture benchmark, not a good in-repo submodule right now |
| `Dumbris/mcpproxy` | MCP proxy + tool retrieval | ~37 stars, Python, low activity but focused design | `retrieve_tools`, progressive disclosure, BM25/vector indexing, proxy-vs-dynamic routing modes | Small project, limited maintenance, less evidence of production hardening | **Best lightweight router reference** if one extra proxy-oriented upstream must be studied |
| `nullplatform/meta-mcp-proxy` | Meta proxy / local RAG | ~9 stars, JS, minimal surface | Simple discovery + execute split, config shape for aggregated MCPs | Small, old, minimal community activity | **Defer**; useful conceptually, weaker than Borg’s existing MetaMCP work |
| `BerriAI/litellm` | Provider routing / fallback | ~38.3k stars, extremely active, broad adoption | Multi-provider normalization, fallback, quotas, model routing, cost controls, AI gateway patterns | Very broad scope; mostly provider gateway, not MCP routing | **Reference only, high priority** for Borg provider routing design |

## Recommended ranking by Borg feature

### MCP router references

1. `microsoft/mcp-gateway` — best control-plane and lifecycle architecture reference
2. `Dumbris/mcpproxy` — best lightweight proxy + retrieval/disclosure reference
3. `mcp-router/mcp-router` — best MCP management UX reference
4. `nullplatform/meta-mcp-proxy` — optional historical concept reference

### Provider routing references

1. `BerriAI/litellm` — strongest provider/fallback/quota reference by far

## Practical takeaways for Borg

- Borg should **not** add multiple new router submodules by default.
- The current policy in `AGENTS.md` says **no new submodules without human approval**.
- The strongest move is to:
  1. keep `external/MetaMCP` as the active bridge reference,
  2. use `microsoft/mcp-gateway` docs as the control-plane benchmark,
  3. use `mcpproxy` as the retrieval/progressive-disclosure benchmark,
  4. use `LiteLLM` as the provider-routing benchmark,
  5. record the rest in an index instead of vendoring them.

## Recommendation if human approval is granted

If exactly **one** new router-oriented reference is approved, prefer:

- `Dumbris/mcpproxy` for low-complexity proxy/disclosure ideas

If exactly **one** provider-routing reference is approved, prefer:

- `BerriAI/litellm` for fallback, quota, and gateway patterns

## Approved additions executed

With explicit human approval, the following new references were added:

- `submodules/mcpproxy`
- `submodules/litellm`

These should remain **reference implementations**, not runtime dependencies for Borg 1.0.

If the goal is architecture study rather than code vendoring, prefer **no new submodule** and just keep this matrix plus links in the research index.
