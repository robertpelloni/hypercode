# Vision

## North star

Borg is the **local-first control plane** for MCP tooling, provider routing, session continuity, and operator observability.

It is building toward a future where one local system can coordinate the most important parts of AI-heavy work: tools, models, sessions, context, and visibility.

That future only becomes credible if the present system is reliable.

## The problem

AI workflows are fragmenting faster than they are becoming usable. A serious operator may now rely on:
- multiple MCP servers,
- multiple provider accounts and quotas,
- multiple coding or session harnesses,
- multiple memory surfaces,
- and weak observability across all of them.

Borg exists to reduce that fragmentation with a practical local substrate.

## Core thesis

The strongest version of Borg is not the loudest one. It is the version that makes a messy local AI stack feel:
- calm,
- visible,
- composable,
- and recoverable.

## Practical product direction

### 1. MCP coordination
Borg should become the clearest place to:
- register MCP servers,
- inspect tools,
- manage working sets,
- understand runtime state,
- and diagnose failure.

Over time, Borg should also maintain a **definitive internal MCP server library**:
- ingest MCP servers from public lists and operator-added sources,
- normalize and deduplicate overlapping entries,
- preserve provenance and operator trust,
- keep that library refreshed internally,
- benchmark and rank implementations over time,
- and make it possible for models to eventually reach any relevant MCP tool through one local control plane.

That library should grow into more than a registry dump. The ambitious version is an operator-owned intelligence layer for the MCP ecosystem: what exists, what overlaps, what is trustworthy, what performs well, what is broken, and which tool is best for a given task.

### 2. Model and provider routing
Borg should make provider behavior legible:
- fallback chains,
- quota exhaustion,
- auth-state changes,
- budget-sensitive routing,
- and routing history.

### 3. Session continuity and memory
Borg should help one operator continue work without rebuilding context from scratch:
- better session recovery,
- useful memory retrieval,
- stronger provenance,
- and clearer context inspection.

### 4. Operator observability
Borg should make it easy to answer:
- what is running,
- what is failing,
- what changed,
- which provider or tool is misbehaving,
- and whether a page is showing real state or partial state.

### 5. Universal tool reach
Borg should eventually behave like an operator-owned substrate for model capability:
- any model,
- any provider,
- any approved MCP server,
- any relevant tool,
- with routing, provenance, policy, and supervision handled in one place.

### 6. Harness convergence
Borg should absorb important local coding harnesses through explicit, inspectable integration instead of hand-wavy compatibility claims. Today that includes tracking upstreams like `submodules/borg`, assigning them first-class harness identity in Borg CLI flows, and only expanding runtime coupling when the upstream actually exposes stable behavior to integrate.

## What Borg is not optimizing for in v1

- mass-market simplicity
- hosted SaaS-first workflows
- speculative autonomy as a substitute for operator control
- broad “AI OS” claims without proof
- platform expansion that outruns reliability

## Long-term direction

If Borg succeeds over time, it could support richer orchestration layers, stronger automation, and more advanced coordination across tools. That includes a curated, continuously updated internal catalog of MCP servers, a living understanding of tool quality and provenance, and a universal model-facing control plane that makes broad tool reach practical without turning operators into full-time integrators.

That is a **long-term direction**, not a current release promise.

## Maturity model

Every major capability should be described as:
- **Stable**
- **Beta**
- **Experimental**
- **Vision**

This language should appear consistently in docs and UI.

## Non-goals for v1

The following may remain outside a focused `v1.0.0`:
- marketplace ecosystems
- universal ingestion of every public MCP server list
- economy or payment systems
- mesh networking
- immersive visualizations
- major rewrites before stabilization

## Design principles

1. **Local first**
2. **Truth over hype**
3. **Visible systems**
4. **Interoperability over reinvention**
5. **Continuity over novelty**

## Best current promise

> Borg aims to be a dependable local AI control plane first, and a richer orchestration environment second.

That sequencing is the whole game.
