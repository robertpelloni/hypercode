# Task 008: Dashboard Honesty Pass

## Context
Borg currently looks wider than it really is. Several dashboard pages are parity shells, iframe wrappers, or aspirational placeholders. This weakens the 1.0 story and confuses operators.

## Scope
- Files: `apps/web/src/app/dashboard/*/page.tsx` (all dashboard pages)
- Files: `apps/web/src/components/sidebar*.tsx` or equivalent navigation
- Tests: Visual verification via browser

## Requirements
1. Primary navigation distinguishes shipped, experimental, and parity/audit surfaces
2. Pages that are only wrappers or status docs do not read like completed products
3. Borg 1.0 surfaces are immediately obvious to a first-time operator
4. Backend services with no UI are either surfaced or documented as internal

## Acceptance Criteria
- [ ] Each dashboard page is labeled: Stable, Beta, or Experimental
- [ ] Iframe-only pages are clearly marked as external embeds
- [ ] Primary nav highlights 1.0 features prominently
- [ ] Parity/status pages are moved to a secondary section
- [ ] No @ts-ignore added
- [ ] CHANGELOG.md updated

## Out of Scope
- Removing pages entirely — just labeling honestly
- Building new full features for stub pages
- Do not create new task files
- STOP when criteria are met
