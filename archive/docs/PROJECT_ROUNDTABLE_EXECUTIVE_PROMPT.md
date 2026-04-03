# Hypercode Roundtable Executive Prompt

_Last updated: 2026-03-13_

Use this shorter prompt when you want fast, high-signal feedback from frontier models without sending the full project brief.

## Prompt

You are reviewing **Hypercode**, a local AI operations control plane for builders.

Hypercode is **not** a chatbot app and should **not** try to clone every adjacent tool. Its purpose is to orchestrate:

- MCP servers and tool routing
- model/provider fallback and quota-aware routing
- supervised CLI/tool sessions
- memory/context capture and retrieval
- one truthful web dashboard for operators

Assume these are the most credible **Hypercode 1.0** pillars:

1. **MCP Master Router**
2. **Model Fallback & Provider Routing**
3. **Session Supervisor**
4. **Web Dashboard**

Assume Hypercode’s strongest current assets are:

- real TypeScript monorepo foundations
- startup/readiness work
- MCP aggregation surfaces
- dashboard/operator surfaces
- memory foundations
- a session-centric architecture

Assume Hypercode’s biggest current risks are:

- scope inflation
- documentation drift
- product truth drift
- parity theater
- monorepo/reference noise

Assume these external systems contain useful ideas Hypercode may selectively absorb later:

- **MetaMCP**: progressive disclosure, semantic tool search, middleware/policy pipelines
- **claude-mem**: hook-based capture, structured observation compression, context injection
- **MCP-SuperAssistant**: browser chat injection, DOM adapters, in-page tool execution
- **Jules-style systems**: session handoff, replay/diff/benchmarking, keeper/autonomy loops

Important: Hypercode should **selectively assimilate capabilities**, not pursue full parity before 1.0.

## Your task

Give the best realistic recommendation for how Hypercode should evolve into a dependable, shippable product.

Optimize for:

- a believable 1.0
- truthful operator UX
- architectural coherence
- strong sequencing
- boring reliability over feature theater

## Answer these questions

1. What is the smallest compelling 1.0 for Hypercode?
2. What should Hypercode protect as its kernel?
3. What should Hypercode stop pretending to be right now?
4. What should move to 1.5 or 2.0?
5. Which external capabilities should Hypercode assimilate first, and in what order?
6. What are the next 3 to 6 implementation slices?
7. What are the top ways Hypercode could fail from here?

## Constraints

- Do **not** recommend “build everything.”
- Do **not** assume parity with MetaMCP, claude-mem, MCP-SuperAssistant, or Jules is required for 1.0.
- Prefer explainable infrastructure over flashy autonomy.
- If recommending a feature, explain why it strengthens Hypercode’s control-plane identity.
- If rejecting a feature, explain what distraction or risk it adds.

## Required output

Use exactly these sections:

### Verdict
A blunt 1-paragraph judgment.

### Kernel
3 to 6 bullets describing what Hypercode fundamentally should be.

### Stop doing
What Hypercode should demote, defer, or quarantine.

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
