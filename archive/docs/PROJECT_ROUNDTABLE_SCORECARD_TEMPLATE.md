# Borg Frontier-Model Scorecard Template

_Last updated: 2026-03-13_

Use this template to compare multiple model responses to the Borg roundtable prompt.

Recommended inputs per model:
- `docs/PROJECT_ROUNDTABLE_BRIEF.md`
- `docs/PROJECT_ROUNDTABLE_DEBATE_PROMPT.md` or `docs/PROJECT_ROUNDTABLE_EXECUTIVE_PROMPT.md`

---

## Roundtable metadata

- Date:
- Reviewer:
- Prompt used:
- Brief version/date:
- Models compared:
  - 
  - 
  - 

---

## Quick ranking table

| Model | Overall usefulness (1-10) | Strategic clarity (1-10) | 1.0 realism (1-10) | Architecture quality (1-10) | Sequencing quality (1-10) | Anti-scope discipline (1-10) | Best insight | Biggest flaw |
|---|---:|---:|---:|---:|---:|---:|---|---|
| Model A |  |  |  |  |  |  |  |  |
| Model B |  |  |  |  |  |  |  |  |
| Model C |  |  |  |  |  |  |  |  |
| Model D |  |  |  |  |  |  |  |  |

---

## Per-model evaluation template

Copy this section once per model.

### Model: [name]

#### 1. Verdict snapshot
- One-sentence summary of the model’s judgment:
- Overall quality score (1-10):
- Would I use this as planning input? Yes / No / Partially

#### 2. What it got right
- 
- 
- 

#### 3. What it got wrong
- 
- 
- 

#### 4. Kernel judgment
Did the model correctly identify Borg’s kernel?

- Score (1-10):
- Notes:

#### 5. 1.0 realism
Did the model define a believable Borg 1.0 instead of a fantasy omnibus?

- Score (1-10):
- Notes:

#### 6. Assimilation discipline
Did the model recommend selective capability absorption rather than full parity theater?

- Score (1-10):
- Notes:

#### 7. Sequencing quality
Did the model propose the right order of operations?

Evaluate especially whether it puts these in roughly the right order:
- startup/readiness truth
- MCP router maturity
- provider/session reliability
- MetaMCP-style progressive disclosure/search/middleware
- claude-mem-style capture/compression
- browser extension maturity
- Jules-style autonomy/replay/benchmarking later

- Score (1-10):
- Notes:

#### 8. Strongest recommendation
What was the single best recommendation this model made?

- 

#### 9. Weakest recommendation
What was the most distracting, premature, or harmful recommendation?

- 

#### 10. Proposed next slices
List the model’s next implementation slices and rate them.

| Slice | Good idea? | Priority | Notes |
|---|---|---|---|
| 1 | Yes / No / Mixed | High / Medium / Low |  |
| 2 | Yes / No / Mixed | High / Medium / Low |  |
| 3 | Yes / No / Mixed | High / Medium / Low |  |
| 4 | Yes / No / Mixed | High / Medium / Low |  |
| 5 | Yes / No / Mixed | High / Medium / Low |  |
| 6 | Yes / No / Mixed | High / Medium / Low |  |

#### 11. Keep / reject / postpone table

| Recommendation | Keep | Reject | Postpone | Reason |
|---|:---:|:---:|:---:|---|
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |

#### 12. Net takeaway
- Best 3 ideas worth carrying forward:
  - 
  - 
  - 
- 3 ideas to ignore:
  - 
  - 
  - 

---

## Cross-model synthesis

### Points of strong agreement
- 
- 
- 

### Points of disagreement worth debating
- 
- 
- 

### Best combined 1.0 definition
Write the strongest consolidated 1.0 statement after reading all models.

- 

### Best combined assimilation order
Rank the next capability families to absorb.

1. 
2. 
3. 
4. 
5. 

### Best combined next 6 slices
1. 
2. 
3. 
4. 
5. 
6. 

---

## Decision rubric

Use this if you want a more explicit scoring system.

| Criterion | Weight | Question |
|---|---:|---|
| Kernel clarity | 20% | Did the model correctly define what Borg fundamentally is? |
| 1.0 realism | 20% | Did it produce a believable near-term ship target? |
| Architectural coherence | 15% | Did it preserve a control-plane architecture rather than sprawl? |
| Sequencing quality | 15% | Did it recommend the right order of work? |
| Assimilation discipline | 10% | Did it avoid parity-for-parity’s-sake? |
| Risk awareness | 10% | Did it correctly identify failure modes? |
| Actionability | 10% | Could a maintainer actually use the recommendations tomorrow? |

### Weighted total formula

Use:

$$
\text{weighted total} = \sum (\text{score out of 10} \times \text{weight})
$$

Example weights in decimal form:

- Kernel clarity = $0.20$
- 1.0 realism = $0.20$
- Architectural coherence = $0.15$
- Sequencing quality = $0.15$
- Assimilation discipline = $0.10$
- Risk awareness = $0.10$
- Actionability = $0.10$

---

## Final maintainer call

After reviewing all responses, answer:

1. Which model produced the best recommendation overall?
2. Which model best understood Borg’s actual identity?
3. Which model was most dangerous because it encouraged scope inflation?
4. What should be adopted immediately?
5. What should be explicitly rejected for now?
6. What should become the next task file?

### Final answer
- Best overall model:
- Best architecture model:
- Best product model:
- Most overreaching model:
- Immediate adoption:
- Explicit deferrals:
- Next task file candidate:
