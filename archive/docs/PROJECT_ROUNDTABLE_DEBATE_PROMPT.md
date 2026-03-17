# Borg Frontier-Model Roundtable Debate Prompt

_Last updated: 2026-03-13_

Use this prompt when asking multiple frontier models to evaluate Borg and converge on the best near-term product and architecture decisions.

## Prompt

You are participating in a structured architecture and product roundtable about **Borg**, a local AI operations control plane for builders.

Your job is **not** to hype the project, and **not** to ask for infinite scope expansion.

Your job is to act like a rigorous principal engineer + product strategist reviewing a real, uneven but promising codebase that needs focus.

Assume the following framing is true unless you can clearly justify a correction:

- Borg is a **local AI operations control plane**, not a chatbot product.
- Borg’s core value is orchestrating **tools, sessions, providers, MCP servers, and context** through one truthful dashboard and routing layer.
- Borg should **orchestrate, not absorb** adjacent tools.
- The four most credible 1.0 pillars are:
  1. **MCP Master Router**
  2. **Model Fallback & Provider Routing**
  3. **Session Supervisor**
  4. **Web Dashboard**
- The biggest current project risks are:
  - scope inflation
  - documentation drift
  - product truth drift
  - parity theater
  - monorepo/reference noise
- Borg has real foundations already, especially in:
  - startup/readiness work
  - MCP surfaces
  - dashboard/operator story
  - memory foundations
  - session-centric architecture
- Borg is **not yet complete** in several important areas.

You should evaluate Borg against the following reference-system lessons:

### Reference lessons

#### MetaMCP
Most relevant strengths:
- progressive disclosure over large tool inventories
- semantic tool search
- middleware/policy/filter/override pipeline
- richer operator/inspection layers for MCP traffic

#### claude-mem
Most relevant strengths:
- hook-based capture in external runtimes
- structured observation compression
- progressive disclosure context injection
- session-linked summaries/prompts
- long-session transcript compression

#### MCP-SuperAssistant
Most relevant strengths:
- browser chat injection
- multi-platform DOM adapters
- in-page tool execution loops
- browser extension UX and debug surfaces

#### Jules-style session-manager/autopilot systems
Most relevant strengths:
- portable session/job handoff
- replay/diff/benchmarking
- session keeper / babysitter loops
- operator-safe autonomy and workflow automation

## Known Borg gaps

For this debate, treat the following as likely true unless you can justify re-ranking them:

### Borg does not yet fully do MetaMCP’s best work in:
- progressive disclosure over huge tool catalogs
- tool-search-first UX
- composable middleware/policy pipelines

### Borg does not yet fully do claude-mem’s best work in:
- hook-based lifecycle capture
- AI-compressed structured observations
- token-aware progressive context injection
- transcript-level long-session compression

### Borg does not yet fully do MCP-SuperAssistant’s best work in:
- multi-site web chat injection
- in-page tool parsing/execution loops
- polished Firefox + Chromium extension parity

### Borg does not yet fully do Jules-style systems’ best work in:
- portable job/session handoff across tools and models
- replay/diff/benchmarking as first-class operator surfaces
- babysitter/keeper-style autonomy

## Debate objective

Produce the **best realistic strategy** for turning Borg into a durable, shippable product without losing the long-term vision.

Your answer must optimize for:

1. **A believable 1.0** that real users can install and understand quickly
2. **Truthful operator experience** over flashy feature count
3. **Selective assimilation** of adjacent-system strengths
4. **Correct sequencing** of what to build now vs later
5. **Architectural coherence** over repo sprawl

## Required questions to answer

1. What is Borg’s smallest compelling 1.0?
2. Which current subsystems are kernel-grade and should be protected?
3. Which visible surfaces are ornamental, premature, or misleading?
4. What should be postponed from 1.0 into 1.5 or 2.0?
5. Which MetaMCP capabilities are worth assimilating first, and why?
6. Which claude-mem capabilities are worth assimilating first, and why?
7. Which MCP-SuperAssistant capabilities are worth assimilating first, and why?
8. Which Jules-style capabilities are worth assimilating first, and why?
9. What should Borg **never** clone directly, even if adjacent tools do it well?
10. What is the correct implementation order for the next 3 to 6 major slices?

## Hard constraints

- Do **not** recommend “build everything.”
- Do **not** assume parity with all reference systems is required for 1.0.
- Do **not** optimize for investor-demo theatrics.
- Do **not** reward broadness over trustworthiness.
- Prefer boring, reliable infrastructure over speculative autonomy.
- If you recommend a feature, explain **why it improves the core control-plane thesis**.
- If you recommend against a feature, explain **what risk or distraction it introduces**.

## Required output format

Use exactly these sections:

### 1. Verdict
Give a blunt 1-paragraph judgment on Borg’s current state.

### 2. What Borg should be
Define the product in 3 to 6 bullets.

### 3. What Borg should stop pretending to be
List the surfaces or ambitions that should be demoted, deferred, or quarantined.

### 4. Kernel vs ornament
Create a 2-column table:
- **Kernel: protect and deepen**
- **Ornament: defer, shrink, or quarantine**

### 5. Recommended assimilation order
Rank the next major assimilations from adjacent systems and justify the sequence.

### 6. Proposed roadmap
Provide a concrete roadmap for:
- **1.0**
- **1.5**
- **2.0**

### 7. Next 6 implementation slices
List the next six slices in order. For each slice include:
- name
- why it matters
- what it must not expand into
- visible acceptance outcome

### 8. Risks and anti-patterns
List the top 5 ways Borg could fail from here.

### 9. Final recommendation
End with a short “do this next” recommendation to the maintainer.

## Preferred reasoning style

- specific
- skeptical
- architecture-aware
- product-aware
- honest about tradeoffs
- willing to say “not yet”

## Optional closing challenge

If useful, end with one sentence completing this phrase:

> “Borg wins if it becomes the system that ________.”
