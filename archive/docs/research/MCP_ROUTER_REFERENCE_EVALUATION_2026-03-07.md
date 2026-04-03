# MCP Router Reference Evaluation — 2026-03-07

## Why this exists

Hypercode 1.0 needs a strong MCP Master Router, but the repo directive is explicit:

- Hypercode should **orchestrate**, not clone every tool.
- New submodules require explicit human approval.
- Upstream references should be kept narrow and intentional.

This document compares current public MCP router / aggregator candidates against Hypercode's actual v1.0 requirements so we can decide whether to:

1. adopt one codebase as the foundation,
2. selectively vendor or submodule a few upstream references, or
3. continue with Hypercode's own router implementation while borrowing proven patterns.

## Hypercode evaluation criteria

Scored against the active router task in `tasks/active/002-mcp-master-router.md`:

1. **Aggregation** — multiple MCP servers behind one endpoint
2. **Namespace isolation** — deterministic collision prevention
3. **Lifecycle control** — child process startup, restart, crash isolation
4. **Traffic inspection** — JSON-RPC visibility, latency, operational observability
5. **Multi-client operability** — practical use with multiple IDE / desktop clients
6. **Dashboard / operator UX** — admin surface, health visibility, discoverability
7. **Code fit for Hypercode** — implementation style, maturity, language fit, architectural compatibility

Scoring legend:

- `5` = strong production-grade reference for this capability
- `4` = good reference with moderate adaptation required
- `3` = useful but partial / specialized
- `2` = thin or immature for this criterion
- `1` = little evidence
- `0` = absent

## Shortlist

### 1. `vtxf/mcp-all-in-one`

**What it is**
- TypeScript MCP aggregator focused on combining multiple services into one endpoint.
- Emphasizes multi-service aggregation, self-configuration, protocol support, reconnect behavior, and monitoring.

**Strengths**
- Best language fit with Hypercode's TypeScript-first v1.0 direction.
- Clear conceptual overlap with Hypercode's aggregator requirement.
- Good reference for config-driven aggregation and reconnect behavior.
- Good candidate for studying how a practical “one endpoint, many servers” operator experience can stay lightweight.

**Weaknesses**
- Evidence of a rich operator dashboard is limited.
- Observability appears lighter than Hypercode's target traffic inspector.
- Less evidence of deep lifecycle supervision than Hypercode wants for restart isolation.

**Best use for Hypercode**
- Reference for TypeScript aggregator structure, config model, and reconnect behavior.
- Not strong enough to become Hypercode's direct foundation by itself.

### 2. `cortexd-labs/neurond`

**What it is**
- Rust federation proxy for MCP with explicit namespacing, routing, policy controls, and audit logging.

**Strengths**
- Strongest reference for **namespace isolation**, explicit routing semantics, and security posture.
- Deny-by-default policy model is a good design influence for Hypercode governance.
- Audit logging and structured federation concepts are particularly relevant to Hypercode's traffic-inspector and operator goals.
- Clear internal module boundaries.

**Weaknesses**
- Rust implementation is not directly reusable in Hypercode's TypeScript core.
- Little evidence of the kind of rich dashboard Hypercode wants.
- More useful as an architecture and policy reference than as an implementation base.

**Best use for Hypercode**
- Reference for namespace contracts, policy boundaries, audit/event design, and federation semantics.
- Excellent “how should this behave?” source; weak “drop this in as our base” candidate.

### 3. `Forge-Space/mcp-gateway`

**What it is**
- Self-hosted MCP gateway built around IBM Context Forge with admin UI, gateway registration flows, virtual servers, auth, URL registration, and large gateway catalogs.

**Strengths**
- Strongest visible **operator/admin UX** among the candidates reviewed.
- Real attention to registration flows, auth, troubleshooting, virtual server setup, and practical operator docs.
- Good reference for grouping, connection UX, and admin workflows.
- Shows how to package a “one client, many upstream MCP servers” experience for real users.

**Weaknesses**
- It is effectively a larger gateway platform, not a narrow Hypercode-style router kernel.
- Heavy dependence on IBM Context Forge patterns and surrounding infrastructure.
- Mixed-language stack and broader platform concerns make it poor as a clean Hypercode foundation.
- More of an ecosystem gateway than a focused local control-plane kernel.

**Best use for Hypercode**
- Reference for dashboard flows, gateway registration UX, virtual grouping, auth/admin ergonomics, and troubleshooting design.
- Not recommended as Hypercode's core implementation base.

### 4. `paularlott/llmrouter`

**What it is**
- Go-based LLM gateway/router with provider routing, MCP aggregation, visibility control, and admin UI.

**Strengths**
- Strongest hybrid reference for **provider routing + MCP aggregation** in one system.
- Good evidence of policy controls like native/discoverable visibility modes and allow/deny filtering.
- Useful for thinking about Hypercode's eventual overlap between provider routing and tool routing dashboards.

**Weaknesses**
- Broader LLM gateway scope dilutes its value as a pure MCP router reference.
- Go implementation is not a good direct fit for Hypercode v1.0.
- Admin surface is interesting, but Hypercode already has its own dashboard direction.

**Best use for Hypercode**
- Reference for policy surfaces, tool visibility modes, and how provider + tool routing can coexist.
- Not recommended as the Hypercode MCP base.

### 5. `david-martin/mcp-helper`

**What it is**
- Go proof-of-concept using Envoy external processing for MCP request routing and tool prefixing.

**Strengths**
- Useful low-level reference for prefixing, routing headers, and backend session mapping.
- Helpful as a “protocol mechanics” proof-point.

**Weaknesses**
- Explicitly a proof of concept.
- Too narrow and infrastructural to serve as Hypercode's base.
- Limited evidence of product-level lifecycle or operator UX maturity.

**Best use for Hypercode**
- Reference for lower-level routing and mapping patterns only.

### 6. `2b3pro/watson-mcp-router`

**What it is**
- Lightweight TypeScript centralized MCP proxy that aggregates child stdio servers behind one `/mcp` endpoint.

**Strengths**
- Good minimal example of aggregation, capability prefixing, child process lifecycle, and a stats resource.
- TypeScript implementation makes it easy to inspect and reason about.
- Useful as a small, teachable reference implementation.

**Weaknesses**
- Very small project with limited maturity signals.
- No real operator dashboard.
- No strong evidence of multi-client robustness or production-grade crash isolation.

**Best use for Hypercode**
- Small reference implementation for router basics.
- Not strong enough to justify submodule priority over stronger alternatives.

### 7. `gladden4work/mcp-aggregator-worker`

**What it is**
- Bare repository with a README-level concept for routing requests between specialized MCP servers.

**Strengths**
- Confirms the idea exists in the wild.

**Weaknesses**
- No meaningful implementation depth.
- No maturity signals.
- No dashboard, lifecycle, namespace, or ops evidence.

**Best use for Hypercode**
- None beyond awareness.

## Evaluation matrix

| Repository | Aggregation | Namespace Isolation | Lifecycle / Crash Handling | Traffic / Audit Visibility | Multi-Client / Operator Practicality | Dashboard / Admin UX | Code Fit for Hypercode | Overall Usefulness |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `vtxf/mcp-all-in-one` | 5 | 3 | 3 | 3 | 3 | 2 | 5 | 24 |
| `cortexd-labs/neurond` | 4 | 5 | 4 | 5 | 3 | 1 | 2 | 24 |
| `Forge-Space/mcp-gateway` | 4 | 4 | 3 | 4 | 5 | 5 | 2 | 27 |
| `paularlott/llmrouter` | 4 | 4 | 3 | 3 | 4 | 4 | 2 | 24 |
| `david-martin/mcp-helper` | 3 | 4 | 2 | 3 | 2 | 2 | 1 | 17 |
| `2b3pro/watson-mcp-router` | 4 | 4 | 3 | 2 | 2 | 1 | 4 | 20 |
| `gladden4work/mcp-aggregator-worker` | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 2 |

## What Hypercode should do

## Recommendation

**Do not adopt any single external repository as Hypercode's MCP router base.**

Instead:

1. **Keep Hypercode's router implementation in-house in TypeScript.**
2. **Use a small number of upstream references intentionally.**
3. **Borrow specific patterns from different projects instead of inheriting their constraints wholesale.**

This matches Hypercode's repo directive and is also the strongest technical choice.

### Why not adopt a single base?

No reviewed repo cleanly matches all of Hypercode's v1.0 requirements at once:

- the strongest UI/admin examples are too platform-heavy,
- the strongest federation/policy examples are in non-TypeScript stacks,
- the strongest TypeScript aggregators are thinner on operator observability,
- the minimal routers are too small to anchor a product.

If Hypercode adopted one as its base, it would likely inherit the wrong abstractions and still need major rewrites for:

- dashboard integration,
- traffic-inspector contracts,
- client config sync,
- supervisor-style restart behavior,
- Hypercode's provider/session/dashboard architecture.

That is the software version of buying a house because you liked the mailbox.

## Pattern borrowing plan

### Borrow from `vtxf/mcp-all-in-one`
- Config-driven multi-server aggregation
- TypeScript-first ergonomics
- reconnect / health refresh ideas
- lightweight self-configuration flows

### Borrow from `cortexd-labs/neurond`
- namespace contract discipline
- deny-by-default / explicit policy posture
- audit/event model ideas
- federation boundary clarity

### Borrow from `Forge-Space/mcp-gateway`
- operator/admin UX concepts
- gateway registration flows
- grouping / virtual-server style concepts
- troubleshooting and onboarding patterns

### Borrow from `paularlott/llmrouter`
- visibility modes and allow/deny tool surfacing
- admin concepts where provider routing and tool routing intersect

### Borrow from `david-martin/mcp-helper`
- protocol-level prefixing and session mapping ideas

## Reference submodule recommendation (if approved)

If you want upstream references physically present in the repo, the strongest shortlist is:

1. **`vtxf/mcp-all-in-one`** — best TypeScript aggregator reference
2. **`cortexd-labs/neurond`** — best namespace/policy/audit reference
3. **`Forge-Space/mcp-gateway`** — best operator UX/admin workflow reference

Optional fourth reference:

4. **`paularlott/llmrouter`** — useful if you want a provider-routing crossover reference

## Recommended disclosure and lazy-loading policy

The highest-value Hypercode behavior here is **not** exposing more tools by default. It is exposing a *tiny* set of meta-tools that reliably unlock everything else.

### Always disclose these tools

These should be visible at session start for every progressive-disclosure client:

1. **`search_tools`** — the primary discovery entry point; highest leverage per token.
2. **`load_tool`** — explicit opt-in to make a tool callable in the current session.
3. **`get_tool_schema`** — hydrate full parameter/schema details only when the tool is actually being prepared for use.
4. **`unload_tool`** — explicitly release tools from the session-visible set.
5. **`list_loaded_tools`** — operator/model visibility into what is already active.
6. **`run_code`** — universal fallback path when code-mode can replace dozens of narrow tools.

Only add `run_agent` or other orchestration meta-tools to the always-visible set when the client/session is explicitly agent-oriented. They are valuable, but not valuable enough to tax every basic coding session.

### Tools that should not be always disclosed

Do **not** expose ordinary GitHub, filesystem, browser, database, cloud, or shell tools by default. Those belong behind search/load unless they are part of an explicitly selected profile.

That includes powerful tools. Powerful and always-visible are not the same thing.

### Deferred binary loading policy

For local stdio/binary-backed servers, Hypercode should prefer this lifecycle:

1. **Index metadata at startup** (tool names, descriptions, namespaces, tags, cached schema hash).
2. **Do not spawn the server binary during initial client connect** just to advertise tools.
3. **Allow `search_tools` to operate from the index/cache only**.
4. **Allow `load_tool` to add lightweight metadata first**, without forcing binary startup when cached schema is sufficient.
5. **Start the binary only when one of these is true**:
	- the user/model calls the tool,
	- `get_tool_schema` needs live schema hydration,
	- a health check or keepalive has been explicitly requested,
	- the server belongs to a pinned always-warm profile.
6. **Shut the binary down after idle expiry** when no visible or recently used tools still require it.

For remote HTTP/SSE/streamable servers, apply the same principle to connection setup: defer expensive session establishment until the tool is actually loaded or called.

### Tool-count-based loading and unloading thresholds

The current `MAX_LOADED_TOOLS = 200` style approach is far too high for an LLM-facing progressive-disclosure UX. It protects process memory, but not context quality.

Recommended defaults:

- **Always-visible meta tools:** 6
- **Soft cap for loaded tool metadata per session:** 16
- **Hard cap for loaded tool metadata per session:** 24
- **Soft cap for fully hydrated schemas:** 8
- **Hard cap for active local binaries per session:** 4

Recommended behavior:

- When loaded metadata exceeds **16**, Hypercode should suggest or automatically prefer unloading older idle tools.
- At **24 loaded tools**, Hypercode should auto-evict by **least recently used idle tool**.
- If precise recency is unavailable, fall back to **FIFO eviction**.
- When hydrated schemas exceed **8**, dehydrate older tools back to summary metadata first before unloading them entirely.
- When active binaries exceed **4**, stop the oldest idle binary whose tools are no longer recently used.

### Best-value operating mode for Hypercode

The best default operating mode is:

- tiny always-visible meta-tool surface,
- schema hydration only on demand,
- binary/process spawn only on first real need,
- count-based eviction with idle-time preference,
- code-mode used as a force multiplier instead of disclosing many small tools.

That yields the best mix of:

- low prompt cost,
- low process churn,
- high discoverability,
- fast operator mental model,
- and lower risk that the model gets distracted by a wall of irrelevant tools.

## Additional repo set: lazy loading, code mode, and operator ergonomics

The shortlist above is useful for broad router posture, but it does **not** fully answer the user's stronger practical question:

> Why do most aggregators still feel unusable, even when they technically aggregate tools correctly?

To answer that, the following repo set was reviewed for patterns around lazy loading, code mode, install/config flows, registries, and MCP operator ergonomics:

- `pathintegral-institute/mcpm.sh`
- `machjesusmoto/claude-lazy-loading`
- `machjesusmoto/lazy-mcp`
- `jx-codes/lootbox`
- `lastmile-ai/mcp-agent`
- `mcp-use/mcp-use`
- `nullplatform/meta-mcp-proxy`
- `George5562/Switchboard`
- `robertpelloni/pluggedin-app`
- `robertpelloni/mcp-tool-chainer`

### What each repo is best at

#### `pathintegral-institute/mcpm.sh`

Best reference for **installation, profiles, client config, and machine-friendly MCP operations**.

Evidence gathered from the MCPM AI-agent guide:

- non-interactive automation flags and JSON-friendly behavior
- server install/edit/new/info/search flows
- profile create/edit/run/share/inspect flows
- direct client config management for Claude Desktop, Cursor, Windsurf, and others
- import of existing client config into MCPM-managed state
- doctor/usage/config/cache management
- profile execution through a FastMCP proxy with proper namespacing

Best Hypercode use:

- copy the **operator workflow design**, not the whole tool
- use as the reference for `hypercode mcp sync`, install/import/export UX, and profile management

#### `George5562/Switchboard`

Best reference for **suite-level disclosure, lazy child spawn, and token reduction through hierarchical exposure**.

Evidence gathered from the architecture and protocol lessons docs:

- one top-level suite tool per child MCP
- `introspect` and `call` actions instead of exposing every child tool at startup
- lazy child process startup on first real use
- reuse of child processes after first spawn
- cached registry/discovery model
- concrete token-savings claim in the 85–90% range
- dual support for Content-Length and line-delimited JSON framing
- explicit `inputSchema` return during introspection
- strong implementation notes around timeouts, env passthrough, cleanup, and mock testing

Best Hypercode use:

- use as the clearest reference for **deferred spawn + suite-level progressive disclosure**
- borrow the **introspect/call** pattern, but keep Hypercode's richer search/ranking/operator model

#### `machjesusmoto/claude-lazy-loading`

Best reference for **keyword-triggered preloading and lightweight registries tuned to LLM behavior**.

Evidence gathered earlier in the session:

- generates a reduced registry from existing MCP configs
- performs keyword-based analysis to decide when to preload tools
- explicitly targets token/context reduction
- documents that it is a proof of concept rather than full native integration

Best Hypercode use:

- reference for **high-confidence silent auto-load rules**
- especially useful for deciding when `search_tools` can be skipped because the intent is obvious

#### `machjesusmoto/lazy-mcp`

Best reference for **registry-first loading, purge logic, profile concepts, and context minimization**, but evidence is currently partial.

What was confirmed earlier:

- plugin / registry-driven lazy-loading orientation
- profile and purge concepts
- explicit focus on reducing context bloat in Claude-oriented workflows

What remains limited:

- deeper docs fetches were rate-limited or unavailable during this session
- raw docs path attempts returned 404

Best Hypercode use:

- treat as supporting evidence for the **registry + purge + profiles** direction
- do not rely on it as the sole architectural reference until fuller docs are available

#### `jx-codes/lootbox`

Best reference for **code mode, type generation, namespace-aware tool consumption, and worker-based execution**.

Evidence gathered earlier in the session:

- TypeScript/Deno-oriented code mode
- generated types from tool schemas
- MCP/local tool namespace discovery
- worker-based execution model
- workflow/script management and UI/API support

Best Hypercode use:

- strongest reference for turning discovered tools into a **code-execution environment**
- validates the idea that `run_code` can replace many narrow tools once the right SDK/types are present

#### `lastmile-ai/mcp-agent`

Best reference for **connection lifecycle, auth-aware connection management, aggregation helpers, and durable execution ergonomics**.

Evidence gathered from docs and CLI reference:

- `ServerRegistry`
- `MCPConnectionManager`
- short-lived vs persistent connections
- `MCPAggregator`
- OAuth/auth integration patterns
- initialization hooks
- cloud CLI for init/deploy/install/configure/logger tail/doctor
- durable execution patterns via Temporal-style workflows

Best Hypercode use:

- use as a reference for **lifecycle, pooling, auth, and operational management**
- especially relevant to Hypercode's provider/session supervisor style control-plane needs

#### `mcp-use/mcp-use`

Best reference for **inspector UX, complete MCP framework ergonomics, and developer/operator polish**.

Evidence gathered from Manufact docs:

- TypeScript MCP client, server, and agent stack
- 100/100 conformance claims for client/server layers
- built-in inspector with multi-server connections, schema-aware tool testing, resource/prompt browsing, RPC logging, and saved requests
- Add-to-Client UX
- BYOK chat testing UI with local credential storage
- browser-friendly and React-friendly client surface

Best Hypercode use:

- strongest reference for **inspector workflow quality** and multi-surface debugging
- especially relevant to Hypercode's traffic inspector and operator-facing dashboard refinement

#### `nullplatform/meta-mcp-proxy`

Best reference for **minimal discover/execute proxy surfaces**.

Evidence gathered earlier in the session:

- wraps multiple MCP servers and JS functions behind a reduced interface
- fuzzy search / discover flow
- execute-style minimal action surface
- focuses on reducing raw tool-list exposure

Best Hypercode use:

- supports Hypercode's decision to keep the **permanent visible surface tiny**
- useful conceptual model for `search_tools` + `load_tool` + `run_code`

#### `robertpelloni/pluggedin-app` and `robertpelloni/mcp-tool-chainer`

Repository and raw README fetch attempts returned `404` during this session, so there is not enough public evidence to score them fairly.

Best Hypercode use:

- none for now beyond noting that the ideas may still matter if corrected URLs or private docs are later provided

## Why most aggregators fail in practice

This is the key conclusion from the second repo set.

Most aggregators fail **not** because aggregation is the wrong idea, but because they stop at the infrastructure layer.

They solve:

- connection unification,
- transport conversion,
- child process orchestration,
- basic namespacing.

But they often do **not** solve the real host-facing problem:

- **too many visible choices** for the model,
- **too much indirection** before a tool becomes usable,
- **too little ranking and selection intelligence**, and
- **too little operational feedback** about what got searched, loaded, skipped, or evicted.

That is why many users still fall back to “just list all MCPs” even though it is objectively noisy: the raw listing is cognitively simpler than a bad aggregator.

### The practical failure modes

#### 1. They reduce transport complexity, but not selection complexity

An aggregator can hide ten child servers and still present the model with an unusable wall of options.

If the model still has to choose among dozens or hundreds of tools without strong ranking, the product problem is unsolved.

#### 2. They introduce extra steps without enough payoff

If the workflow becomes:

1. search,
2. inspect,
3. load,
4. hydrate schema,
5. finally call,

then the aggregator may be more “correct” but less usable than direct exposure.

This is why high-confidence silent auto-load matters.

#### 3. They optimize token count, but not latency perception

Lazy loading helps context size, but it can feel broken if the first useful action triggers a cold spawn, remote auth, download, or schema fetch with no operator visibility.

Deferred startup must be paired with:

- good progress signaling,
- pinned warm profiles,
- cached schemas,
- and predictable idle expiry.

#### 4. They expose structure, but not decision support

Namespaces and suites are useful, but the model still needs help answering:

- Which tool is probably right?
- Is it already loaded?
- Is the schema hydrated?
- Is there a code-mode alternative that is cheaper?

Without those answers, the system remains mechanically correct and practically clumsy.

#### 5. They hide too much from operators

When the model does something dumb, the operator needs to know:

- what it searched for,
- what candidate tools were ranked,
- what it chose to load,
- what got evicted,
- and whether failure was due to schema, auth, spawn, timeout, or ranking.

Without that, debugging the routing layer becomes astrology with JSON.

## Hypercode implementation blueprint

The strongest Hypercode pattern is a hybrid assembled from the reviewed repos, not a direct clone of any one of them.

### 1. Permanent surface: keep it tiny

Adopt the already-documented always-visible set:

- `search_tools`
- `load_tool`
- `get_tool_schema`
- `unload_tool`
- `list_loaded_tools`
- `run_code`

Only add `run_agent` in explicitly agent-oriented sessions.

This is the right synthesis of:

- Switchboard's suite minimization,
- Meta MCP Proxy's reduced discover/execute posture,
- and the user's complaint that giant tool menus make the model worse, not better.

### 2. Discovery should be ranked, not merely searchable

`search_tools` should not just keyword-match names. It should rank by:

- explicit tags and namespaces,
- recent success in the session,
- profile affinity,
- tool capability class,
- cached latency/cost,
- and whether `run_code` can satisfy the request more cheaply.

This is the missing layer in many aggregators.

### 3. High-confidence matches should auto-load silently

Borrow from the lazy-loading references:

- if confidence is high enough,
- and the tool has a stable cached schema,
- and there is no auth or policy blocker,

then Hypercode should auto-load it without forcing the model through an extra ceremony step.

The model should experience the system as helpful, not bureaucratic.

### 4. Binary startup must stay deferred

Keep the documented Hypercode policy:

- metadata indexed at startup
- cached schemas preferred
- child binary spawn only on first real need
- idle shutdown after use

Borrow operational details from Switchboard and mcp-agent:

- env passthrough
- realistic timeouts
- pending-request cleanup
- connection reuse while active
- strong separation of spawn timeout vs RPC timeout

### 5. Profiles must exist at two levels

Borrow from MCPM:

- **operator profiles**: named sets of servers/tool domains for workflows like `web-dev`, `research`, `db-admin`
- **session warm profiles**: the subset that stays preloaded or warm for latency-sensitive tasks

This avoids the false binary of “everything loaded” vs “everything cold.”

### 6. Code mode should come after routing, not instead of it

Borrow from Lootbox:

- once the right tools are discovered, Hypercode should be able to generate a typed SDK/context for `run_code`
- multi-step workflows can then happen in code mode instead of repeated ad hoc tool calls

This is how Hypercode can replace twenty tiny tools with one high-leverage execution path *without* sacrificing correctness.

### 7. The dashboard must show routing decisions, not just raw traffic

Borrow from mcp-use inspector quality and mcp-agent operator ergonomics.

Hypercode should expose:

- search queries and ranked candidates
- load/unload events
- schema hydration/dehydration
- child spawn/restart/idle stop events
- auth and config failures
- latency by phase: search, hydrate, spawn, call

That is more useful than a raw JSON-RPC firehose alone.

## Best method by feature

| Feature | Best upstream reference | Hypercode takeaway |
|---|---|---|
| Install / import / client config sync | `pathintegral-institute/mcpm.sh` | Copy the operator workflow and non-interactive automation posture |
| Tiny permanent visible surface | `nullplatform/meta-mcp-proxy`, `George5562/Switchboard` | Keep discovery and execution meta-oriented, not tool-list oriented |
| Lazy child spawn | `George5562/Switchboard` | Start local stdio children only on first real need |
| Silent high-confidence preload | `machjesusmoto/claude-lazy-loading` | Auto-load when confidence is high and schema is cached |
| Registry + purge + profile concepts | `machjesusmoto/lazy-mcp` | Maintain a small active working set and aggressively evict idle tools |
| Code mode / typed execution | `jx-codes/lootbox` | Promote `run_code` as a force multiplier after discovery |
| Lifecycle / connection management / auth | `lastmile-ai/mcp-agent` | Separate registry, connection manager, and aggregation concerns cleanly |
| Inspector / tool-testing UX | `mcp-use/mcp-use` | Make the dashboard explain and test the routing layer, not just expose it |
| Protocol hardening | `George5562/Switchboard` | Support framing variation, include inputSchema, and test with mocks |

## Final recommendation from the expanded review

If Hypercode tries to become “yet another aggregator,” it will likely repeat the same failure pattern the user is frustrated by.

If Hypercode instead becomes:

- a **decision layer**,
- with **tiny default disclosure**,
- **ranked discovery**,
- **silent high-confidence load**,
- **deferred binary startup**,
- **small active working sets**,
- **code mode as leverage**,
- and **operator-visible routing decisions**,

then it can solve the practical problem that current aggregators keep missing.

## Repos not recommended for submoduling

- `gladden4work/mcp-aggregator-worker` — too minimal
- `david-martin/mcp-helper` — useful notes, but too PoC-oriented for submodule priority
- `2b3pro/watson-mcp-router` — worthwhile to read, but redundant once stronger references are present

## Immediate next steps for Hypercode

1. Keep `packages/core/mcp/**` as the canonical implementation path.
2. Preserve Hypercode's own dashboard and traffic-inspector contracts as first-class design drivers.
3. If you approve reference submodules, add only the top 3 upstream repositories above.
4. Convert their useful patterns into explicit Hypercode issues / task checklists instead of vague “feature parity.”
5. Treat all imported repos as **references**, not as runtime dependencies for Hypercode 1.0.

## Decision summary

**Best product decision:** rewrite Hypercode's MCP router intentionally in Hypercode's architecture.

**Best code-reference mix:**
- `vtxf/mcp-all-in-one` for TypeScript aggregation patterns
- `cortexd-labs/neurond` for namespace/policy/audit rigor
- `Forge-Space/mcp-gateway` for operator/admin UX

**Not recommended:** choosing one repo as “the base” and bending Hypercode around it.
