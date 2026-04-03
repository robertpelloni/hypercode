# Hypercode Memory System

> **Current release track:** `2.7.324`
> **Status:** Hypercode-native memory is live; external parity remains selective.

## What is implemented now

Hypercode memory currently supports:

- structured memory CRUD via core routers/services,
- searchable records (facts, observations, prompts, summaries),
- session-aware context and provenance metadata,
- import/export and adapter-oriented compatibility surfaces,
- dashboard memory workflows under `/dashboard/memory`.

## Practical model

Hypercode’s memory model is operator-first:

- **Facts**: persistent short records
- **Observations**: structured runtime captures
- **Prompts**: captured prompt context
- **Session summaries**: condensed session outcome context

The goal is to make records discoverable and explainable, not just storable.

## Architecture direction

Memory remains part of Hypercode’s control plane in `packages/core`, surfaced through typed routers and dashboard pages.

Design principles:

- keep one coherent Hypercode-native model,
- treat external memory systems as adapters,
- avoid parity claims unless end-to-end workflows are truly delivered,
- keep provenance and operator trust central.

## Near-term priorities

- improve timeline/provenance UX in memory dashboards,
- keep adapter status honest and explicitly labeled,
- align ingestion, retrieval, and summarization around one canonical record model.
