# VISION.md - Borg Long-Term Direction

> **Current release track**: `0.9.0-beta`
> **Near-term mission**: Ship a trustworthy Borg `1.0`
> **Long-term ambition**: Become the best local AI operations control plane for builders who want one place to run, supervise, and route their AI tooling.

---

## 1. The long view

Borg exists to make AI-assisted development feel operable instead of chaotic.

The long-term vision is not "own every tool" or "clone every interface." It is to give a single operator one dependable place to:

- route tools through a unified MCP-aware control plane
- switch between providers and models without losing momentum
- supervise long-running coding sessions and recover from crashes
- observe what the system is doing in real time
- gradually add memory, agent orchestration, and browser/cloud integrations without breaking the core

In short: **orchestrate everything, reimplement almost nothing unless it must exist inside Borg to make the whole system reliable.**

---

## 2. What success looks like

In the near term, success is practical:

- a new user can clone the repo, install it, start it, and reach the dashboard quickly
- the dashboard tells the truth about MCP servers, providers, sessions, and system health
- Borg can keep working when one provider hits quota or one supervised process crashes
- external AI clients can connect once and use many tools through Borg cleanly

In the longer term, success becomes leverage:

- teams can plug Borg into their preferred editors and AI clients
- provider choice becomes a routing policy, not a workflow disruption
- session history and memory become durable operational context
- agent workflows become supervised, inspectable, and recoverable rather than magical black boxes

---

## 3. Product philosophy

### Orchestrate, don't absorb

Borg should coordinate other tools, not turn into a museum of embedded clones.

That means:

- adapters over parity checklists
- capability contracts over brand-specific duplication
- clear boundaries over sprawling internal copies
- upstream references where useful, runtime ownership where necessary

### Make the boring parts solid

The most valuable features are often the least glamorous:

- restart behavior
- config sync
- health visibility
- quota awareness
- deterministic routing
- session persistence
- truthful logs

If Borg does those better than everyone else, it becomes the place operators trust.

### Prefer focus over mythology

Big ideas are welcome. Infinite scope is not.

The vision only matters if each release leaves the product easier to install, easier to operate, and easier to explain.

---

## 4. End-state capability picture

Over time, Borg should grow into a cohesive control plane with five durable layers.

### 4.1 MCP operations layer

Borg should be the easiest way to:

- aggregate many MCP servers behind one endpoint
- keep tool routing collision-safe while discovery happens through semantic search and grouping
- inspect live JSON-RPC traffic
- manage health, lifecycle, and config sync

### 4.2 Provider routing layer

Borg should make model usage resilient by handling:

- normalized provider authentication
- quota and rate-limit awareness
- routing strategies by cost, quality, and task type
- fallback without losing request continuity

### 4.3 Session supervision layer

Borg should supervise external coding tools and agent loops with:

- isolated child processes
- restart policies and crash recovery
- worktree isolation
- persistent session state, logs, and operator controls

### 4.4 Operator dashboard layer

The dashboard should remain an operations console, not a decorative feature dump.

It should help operators answer:

- what is running?
- what is failing?
- what is costing money?
- what was restarted?
- what tool traffic just happened?

### 4.5 Expansion layer

Once the control plane is trustworthy, Borg can responsibly expand into:

- memory and retrieval systems
- browser and editor companion surfaces
- multi-agent orchestration
- cloud-dev bridges
- richer automation workflows

Those are important, but they should compound on a stable base instead of becoming excuses to avoid shipping one.

---

## 5. Milestone horizon

### Borg 1.0

Ship the four core features:

1. MCP Master Router
2. Model Fallback & Provider Routing
3. Session Supervisor
4. Web Dashboard

### Borg 1.5

Add memory and context systems that support real workflows without destabilizing the core product.

### Borg 2.0

Add multi-agent orchestration and broader integrations only after the control plane has earned trust with external users.

---

## 6. Non-goals

The long-term vision explicitly does **not** require:

- cloning every AI coding tool feature-for-feature
- shipping every experimental idea at once
- hiding instability behind clever branding
- measuring meta-analytics that do not improve operator outcomes
- keeping massive reference collections in the main runtime path

If Borg ever has to choose between being impressive on paper and dependable in practice, dependable wins.

---

## 7. The standard for future decisions

Future proposals should make Borg more of the following:

- **runnable**
- **observable**
- **recoverable**
- **composable**
- **useful to a stranger in under five minutes**

That is the real vision.

Everything else is garnish.
