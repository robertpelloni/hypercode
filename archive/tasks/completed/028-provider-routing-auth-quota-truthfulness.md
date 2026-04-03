# Task: Provider Routing and Auth/Quota Truthfulness

**Status:** Completed (2026-03-19)

## Context
Hypercode routes requests across multiple LLM providers with fallback logic, but operator trust depends on truthful reporting of provider auth state, quota windows, and fallback rationale. Current billing dashboard may overstate data confidence or hide gaps in provider API coverage.

## Scope
- `packages/core/src/routers/billingRouter.ts` quota/auth surfaces
- `packages/core/src/providers/` provider state detection and routing logic
- `apps/web/src/app/dashboard/billing/**` billing page + provider matrix
- `apps/web/src/app/dashboard/providers/**` provider auth/status surfaces
- focused tests for provider state transitions and quota edge cases
- dashboard tooltips/warnings showing data confidence levels

## Requirements
1. Audit provider auth state detection (OAuth vs API key status, expiry, revocation).
2. Ensure quota reporting includes confidence level (real-time, cached, estimated, unknown).
3. Make fallback reasoning explainable from visible dashboard data (why provider A was skipped, B was chosen).
4. Clearly mark pages/data as beta if provider API coverage is incomplete or estimated.
5. Test provider transitions (auth loss, quota exhaustion, provider outage) and verify dashboard accuracy during transitions.

## Acceptance Criteria
- [x] All provider auth states are truthfully reported (authenticated/expired/revoked/not-configured)
- [x] Quota windows show confidence level and last-refresh timestamp
- [x] Fallback reasoning visible in routing decision transparency (logs/audit/dashboard)
- [x] Provider state transitions tested (auth loss, quota flip, provider outage)
- [x] Dashboard billing/provider pages clearly marked with confidence/beta badges where appropriate
- [x] Focused provider state and fallback chain tests pass
- [x] `CHANGELOG.md` updated for provider auth/quota truthfulness improvements

## Out of Scope
- Implementing new provider integrations
- Building new OAuth client UI flows
- Large-scale cost analytics or trend prediction

## Notes
- This is closely tied to operator trust in Hypercode's routing decision-making.
- Truthfulness means not hiding gaps: if a provider API doesn't expose real-time quota, say so.
- Session persistence and recovery should also account for provider state changes during a long-running supervised session.
