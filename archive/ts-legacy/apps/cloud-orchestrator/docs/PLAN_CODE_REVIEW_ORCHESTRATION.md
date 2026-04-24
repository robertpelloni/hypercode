# Code Review Orchestration Plan (Updated)

## Goal
Enhance the existing `runCodeReview` implementation in `lib/orchestration/review.ts` to support a more sophisticated, multi-stage review process involving specialized LLM personas, and integrate it with the frontend UI.

## Current State (Post-Refactor)
- `lib/orchestration/review.ts` has been updated.
- `runComprehensiveReview` executes 3 personas (Security, Performance, Clean Code) in parallel.
- A "Lead Architect" synthesis step aggregates findings into a structured JSON `ReviewResult`.
- `ReviewResult` interface: `{ summary: string, score: number, issues: ReviewIssue[], rawOutput: string }`.
- `components/review/review-scorecard.tsx` exists to visualize this result.
- `components/activity-feed.tsx` has been wired up to use `/api/review` and render the scorecard.

## Completed Steps
1.  **Refactor `ReviewRequest`**: Added `outputFormat` and `reviewType`.
2.  **Enhance `runComprehensiveReview`**:
    -   Implemented parallel execution of default personas.
    -   Implemented the synthesis step to produce JSON.
3.  **Structure Output**:
    -   Implemented `runStructuredReview` for single-pass JSON output.
    -   Implemented synthesis logic in `runComprehensiveReview`.
4.  **UI Updates**:
    -   Created `ReviewScorecard` component.
    -   Updated `ActivityFeed` to trigger the new flow and render the result.
5.  **Build Verification**:
    -   `npm run build` passed successfully.

## Next Steps (v0.9.x)
1.  **Custom Personas**: Allow the UI to let users select or define custom personas before starting the review (currently hardcoded defaults).
2.  **Integration with PRs**: Automatically post this scorecard as a comment on GitHub Pull Requests (requires `gh` CLI or Octokit integration).
3.  **Debate Mode**: Implement the multi-turn debate logic for reviews as originally planned.

## Verification Checklist
- [x] Backend logic produces valid JSON.
- [x] Frontend requests JSON format.
- [x] Frontend renders Scorecard component.
- [x] Build passes.
- [x] Fallbacks in place for missing local context or API failures.
