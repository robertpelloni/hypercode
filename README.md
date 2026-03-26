# Borg

**The local-first control plane for AI operations.**

> Status: **Pre-1.0 convergence**  
> Focus: **stability, truthfulness, and operator trust**

Borg helps operators run a fragmented AI tool stack from one local control plane. It is designed for people who already use multiple MCP servers, multiple model providers, and multiple coding or session workflows—and want one place to inspect, route, recover, and understand them.

## What Borg is

Borg is primarily four things:

1. **MCP control plane** — manage and inspect MCP servers and tool inventories from one local service.
2. **Provider routing layer** — handle quota-aware fallback across model providers.
3. **Session and memory substrate** — preserve continuity across work sessions.
4. **Operator dashboard** — make runtime state visible and diagnosable.

## Why this project exists

Modern AI work is messy:
- too many MCP servers,
- too many providers and quotas,
- too many half-connected tools,
- too little context continuity,
- and weak observability when something breaks.

Borg exists to reduce that fragmentation without requiring a hosted backend.

## What is real today

### Stable
- Local control-plane foundations
- MCP aggregation and management primitives
- Provider fallback infrastructure
- Core dashboard architecture
- Build, test, and typecheck workflows

### Beta
- Session supervision workflows
- Memory retrieval and inspection UX
- MCP traffic inspection and tool search UX
- Billing and routing visibility
- Browser and IDE bridge integration surfaces

### Experimental
- Council or debate workflows
- Broader autonomous workflow layers
- Mobile and desktop parity layers
- Mesh and marketplace concepts

## What Borg is not yet

Borg is **not yet** a fully hardened universal “AI operating system.” The most honest current description is:

> Borg is an ambitious, local-first AI control plane with real implementation across MCP routing, provider management, sessions, and memory—plus a broader experimental layer around orchestration and automation.

## Current focus

The current release track centers on:
- core MCP reliability,
- provider routing correctness,
- practical memory usefulness,
- session continuity,
- and honest dashboard or operator UX.

## Quick start

### Requirements
- Node.js 22+
- pnpm 10+

### Local development
```bash
pnpm install
pnpm run dev
```

### Docker
```bash
docker compose up --build
```

## Repository shape

```text
apps/
  web/              Next.js dashboard
  borg-extension/   Browser extension surfaces
  maestro/          Desktop shell work
  vscode/           VS Code integration

packages/
  core/             Main control plane backend
  ai/               Provider/model routing
  cli/              CLI entrypoints
  ui/               Shared UI package
  types/            Shared types
```

## Design principles

1. **Local first** — default to local state and operator control.
2. **Truth over hype** — label maturity honestly.
3. **Interoperability over reinvention** — unify tools where possible.
4. **Visibility over magic** — make system state inspectable.
5. **Continuity over novelty** — prioritize recovery, routing, and memory.

## Contributing

Use `pnpm` v10 and verify changes before claiming success:

```bash
pnpm -C packages/core exec tsc --noEmit
pnpm -C apps/web exec tsc --noEmit --pretty false
pnpm run test
```

Also review:
- `AGENTS.md`
- `ROADMAP.md`
- `TODO.md`
- `VISION.md`

## Documentation map

- `VISION.md` — long-term direction
- `ROADMAP.md` — now/next/later
- `TODO.md` — active worklist
- `AGENTS.md` — contributor and agent rules
- `CHANGELOG.md` — release history

## License

MIT
