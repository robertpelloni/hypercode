<<<<<<< HEAD
# borg Roundtable Executive Prompt

_Last updated: 2026-03-19_

Use this shorter prompt when you want fast, high-signal feedback from multiple models without sending the full long-form debate prompt.

## Prompt

You are reviewing **borg**, a local AI operations control plane for builders.

borg is **not** supposed to be a general chatbot product. Its credible kernel is:

- MCP router / aggregation / tool inspection
- provider fallback and billing/operator truthfulness
- session supervision for external CLI runtimes
- operator dashboard for truthful state and control
- memory/context storage and retrieval

Current reality:

- borg already has a broad real dashboard and a substantial TypeScript monorepo runtime.
- Startup/readiness, MCP search/inspection, session supervision, billing/provider, and memory surfaces are all materially implemented.
- The biggest risks are documentation drift, scope inflation, uneven maturity, and too many visible surfaces relative to the 1.0 trust story.
- The two most important still-open release-sensitive areas are:
  1. MCP dashboard runtime/import robustness
  2. Session supervisor worktree/attach reliability

Important: do **not** recommend full parity with every adjacent tool before 1.0.

## Your task

Give the best realistic recommendation for how borg should evolve from here into a dependable, shippable product.

Optimize for:

- believable 1.0 scope
- truthful operator UX
- strong sequencing
- architectural coherence
- boring reliability over breadth theater

## Answer these questions

1. What is the smallest compelling 1.0 for borg?
2. What should borg protect as its kernel?
3. What should borg stop pretending to be right now?
4. What should move to 1.5 or 2.0?
5. What are the next 3 to 6 slices?
6. What are the top risks from here?
=======
# Borg Roundtable Executive Prompt

_Last updated: 2026-03-13_

Use this shorter prompt when you want fast, high-signal feedback from frontier models without sending the full project brief.

## Prompt

You are reviewing **Borg**, a local AI operations control plane for builders.

Borg is **not** a chatbot app and should **not** try to clone every adjacent tool. Its purpose is to orchestrate:

- MCP servers and tool routing
- model/provider fallback and quota-aware routing
- supervised CLI/tool sessions
- memory/context capture and retrieval
- one truthful web dashboard for operators

Assume these are the most credible **Borg 1.0** pillars:

1. **MCP Master Router**
2. **Model Fallback & Provider Routing**
3. **Session Supervisor**
4. **Web Dashboard**

Assume Borg’s strongest current assets are:

- real TypeScript monorepo foundations
- startup/readiness work
- MCP aggregation surfaces
- dashboard/operator surfaces
- memory foundations
- a session-centric architecture

Assume Borg’s biggest current risks are:

- scope inflation
- documentation drift
- product truth drift
- parity theater
- monorepo/reference noise

Assume these external systems contain useful ideas Borg may selectively absorb later:

- **MetaMCP**: progressive disclosure, semantic tool search, middleware/policy pipelines
- **claude-mem**: hook-based capture, structured observation compression, context injection
- **MCP-SuperAssistant**: browser chat injection, DOM adapters, in-page tool execution
- **Jules-style systems**: session handoff, replay/diff/benchmarking, keeper/autonomy loops

Important: Borg should **selectively assimilate capabilities**, not pursue full parity before 1.0.

## Your task

Give the best realistic recommendation for how Borg should evolve into a dependable, shippable product.

Optimize for:

- a believable 1.0
- truthful operator UX
- architectural coherence
- strong sequencing
- boring reliability over feature theater

## Answer these questions

1. What is the smallest compelling 1.0 for Borg?
2. What should Borg protect as its kernel?
3. What should Borg stop pretending to be right now?
4. What should move to 1.5 or 2.0?
5. Which external capabilities should Borg assimilate first, and in what order?
6. What are the next 3 to 6 implementation slices?
7. What are the top ways Borg could fail from here?

## Constraints

- Do **not** recommend “build everything.”
- Do **not** assume parity with MetaMCP, claude-mem, MCP-SuperAssistant, or Jules is required for 1.0.
- Prefer explainable infrastructure over flashy autonomy.
- If recommending a feature, explain why it strengthens Borg’s control-plane identity.
- If rejecting a feature, explain what distraction or risk it adds.
>>>>>>> origin/rewrite/main-sanitized

## Required output

Use exactly these sections:

### Verdict
<<<<<<< HEAD

### Kernel

### Stop doing

### Roadmap

### Next slices

### Risks

### Final recommendation
=======
A blunt 1-paragraph judgment.

### Kernel
3 to 6 bullets describing what Borg fundamentally should be.

### Stop doing
What Borg should demote, defer, or quarantine.

### Assimilation order
Rank the most valuable external capabilities to absorb next.

### Roadmap
Describe **1.0**, **1.5**, and **2.0**.

### Next slices
List the next 3 to 6 implementation slices with a short reason for each.

### Risks
List the top 5 risks.

### Final recommendation
End with the single most important next move.

## Tone

Be skeptical, specific, architecture-aware, and comfortable saying **not yet**.
>>>>>>> origin/rewrite/main-sanitized
