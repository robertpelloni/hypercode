# Roadmap

_Last updated: 2026-03-25_

## Status legend

- **Stable** — production-intended, tested, maintained
- **Beta** — usable, still evolving
- **Experimental** — active R&D, not dependable
- **Vision** — directional only

## Framing

Borg has two jobs at once:
1. ship a reliable local control plane,
2. preserve a credible long-term vision for richer AI orchestration.

This roadmap keeps those jobs separate.

## Current objective (Now)

Deliver a trustworthy `v1.0.0` centered on:

1. MCP control plane reliability
2. Provider routing correctness
3. Memory usefulness
4. Dashboard truthfulness

### Current priorities

#### 1. Stabilize the core wedge
Focus on the strongest product shape already present:
- MCP control plane
- provider routing and billing visibility
- session supervision
- memory inspection and continuity
- system observability

#### 2. Dashboard convergence
- complete high-value data-binding work
- remove or clearly label misleading states
- improve empty states and error behavior
- reduce duplicate or low-value surfaces

#### 3. Extension and runtime reliability
- fix storage access failures
- reduce SSE or subscription edge cases
- remove startup and port mismatch drift
- improve honest degradation when services are unavailable

#### 4. Release discipline
- unify version story
- tighten release criteria
- improve documentation accuracy
- reduce contradictory status messaging

## Next

### A. MCP operator improvements
- better tool grouping and search
- stronger import/export clarity
- clearer runtime health reporting
- better working-set management

### B. Memory quality
- better provenance
- better retrieval tuning
- stronger import/export ergonomics
- better memory inspection UX

### C. Session workflow quality
- cleaner create/edit flows
- stronger attach/restart ergonomics
- clearer crash/recovery visibility
- clearer isolation behavior

### D. Provider routing polish
- clearer fallback history
- stronger quota truthfulness
- more actionable auth-state and routing config

## Later

- mobile and desktop companion polish after core stabilization
- safer public tool ingestion and sandboxing
- richer operator automation with guardrails
- deeper benchmark and latency reporting

## Vision

These remain exploratory until the control plane is stronger:
- advanced council or debate systems
- multi-node federation or mesh-style coordination
- marketplace or community distribution systems
- performance-critical Rust components
- richer graph or 3D cognition visualizations

## Proposed `v1.0.0` bar

A credible `v1.0.0` should mean:
- reliable start and core workflow execution
- honest operator pages with real backend state
- dependable MCP inspection and config flows
- useful provider fallback visibility
- meaningful session and memory continuity
- documentation that does not overclaim

## Explicit de-scope until v1 ships

Do not prioritize these ahead of core convergence:
- economy or payment ideas
- broad P2P claims
- major rewrites without measured need
- large net-new surfaces while core ones remain rough
