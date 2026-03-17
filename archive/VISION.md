# Borg Vision

> **Current release track:** `2.7.324`
> **Near-term mission:** ship a trustworthy Borg 1.0

## What Borg is trying to become

Borg is a local AI operations control plane.

It should let one operator reliably:

- route tools through a unified MCP-aware layer,
- supervise long-running agent/CLI sessions,
- survive provider quota/rate-limit failures through fallback,
- observe runtime truth from a single dashboard,
- add memory and orchestration features without destabilizing the core.

## Product philosophy

### Orchestrate, do not clone
Borg should coordinate external tools via capability contracts and adapters, not reimplement every ecosystem.

### Reliability before breadth
If a capability is not runnable, observable, and recoverable, it is not done.

### Operator trust over aspirational surface area
Dashboard language and status must reflect real runtime behavior.

## Milestone horizon

### Borg 1.0
- MCP router maturity
- provider fallback trustworthiness
- session supervisor reliability
- truthful operator dashboard

### Borg 1.5
- coherent Borg-native memory workflows
- durable browser/IDE capture and context flows

### Borg 2.0
- safe multi-agent orchestration
- richer automation and ecosystem integrations

## Non-goals

- feature-parity with every external tool
- shipping broad experimental scope before core reliability
- hiding runtime gaps behind polished UI copy

## Decision standard

Prefer work that makes Borg more:

- runnable,
- observable,
- recoverable,
- composable,
- and useful to a new operator in under five minutes.
