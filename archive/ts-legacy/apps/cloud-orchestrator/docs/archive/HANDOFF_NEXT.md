
Instructions for the Next Session:

1.  **Refine Multi-Agent Debate:**
    *   Review `lib/orchestration/debate.ts`. Ensure the `runDebate` function correctly orchestrates the conversation between participants. The current implementation uses a sequential loop which is good, but we should verify the `systemPrompt` injection and context handling.
    *   Verify the integration of `process.env.NEXT_PUBLIC_OPENAI_KEY` in `components/debate-dialog.tsx`. It seems correct, but a double check is always good.
    *   Test the `runConference` alias in `lib/orchestration/debate.ts` to ensure it works as a single-round debate.

2.  **Verify LLM Provider Integration:**
    *   We have added UI fields for OpenAI, Anthropic, and Gemini keys in `SettingsDialog`.
    *   Verify that `DebateDialog` and other components properly read these keys from `localStorage` if they are not present in `process.env`. Currently, `DebateDialog` heavily relies on `process.env`. It should probably be updated to check `localStorage` (via a helper or store) or prompt the user if keys are missing.
    *   **Action Item:** Update `DebateDialog` to read keys from the same location `SettingsDialog` saves them to (likely needing a helper hook or store update), or ensure the backend `api/debate` route can handle keys passed in the body (which it does) and the frontend correctly retrieves them.

3.  **Testing:**
    *   Run manual tests of the Debate feature (if possible in this environment, otherwise rigorous code review).
    *   Verify that the `runCodeReview` changes from the previous session are solid and didn't regress anything.

4.  **Documentation:**
    *   Update `docs/NEW_FEATURES.md` (or create it) to document the new Code Review and Debate features.

Key Files to Focus On:
*   `lib/orchestration/debate.ts`
*   `components/debate-dialog.tsx`
*   `components/settings-dialog.tsx`
