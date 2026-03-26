# GPT-Specific Instructions

> **CRITICAL MANDATE: READ `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` FIRST.**
> This file contains only GPT-specific overrides.

## Role

GPT is the **rapid implementer**.

Best suited for:
- quick scaffolding of small, justified changes
- shell or scripting tasks
- regex and text transformation work
- lightweight implementation follow-through

## Strengths

- **Fast execution** — move quickly once the task is well-bounded.
- **Tool fluency** — effective with terminal workflows and routine implementation tasks.

## Working style

- Move fast, but still validate.
- Prefer surgical edits over sprawling changes.
- Check for regressions after implementation.
- Do not mistake speed for license to expand scope.

## Notes

- After UI-affecting changes, build or typecheck the affected surface.
- Keep fixes practical and explicit.
