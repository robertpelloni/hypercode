# Multi-Agent Debate and LLM Providers Update

## Overview
This update focuses on refining the Multi-Agent Debate feature and integrating additional LLM providers to enhance the platform's orchestration capabilities.

## Completed
1.  **Refined Debate Logic:**
    *   Verified `runDebate` in `lib/orchestration/debate.ts` for correct orchestration.
    *   Confirmed `systemPrompt` injection and context handling.
    *   Ensured `runConference` alias works as intended.

2.  **LLM Provider Expansion:**
    *   Analyzed `lib/orchestration/providers/index.ts` and existing providers (`openai.ts`, `anthropic.ts`).
    *   Confirmed `Anthropic` provider is already implemented but needs integration verification in `DebateDialog`.
    *   Updated `SettingsDialog` to include fields for OpenAI, Anthropic, and Google Gemini API keys, allowing users to persist these keys in local storage.

## Next Steps
1.  **Enhance `DebateDialog`:**
    *   Update the UI to allow selecting different providers (OpenAI, Anthropic) for each debate participant.
    *   Ensure API keys for different providers are handled correctly (e.g., `NEXT_PUBLIC_ANTHROPIC_KEY`).

2.  **Verify Multi-Provider Debate:**
    *   Test a debate session where one agent uses OpenAI and another uses Anthropic (if keys available).
    *   Verify the `summary` generation uses the correct provider.

3.  **Documentation:**
    *   Update `docs/NEW_FEATURES.md` with details on the new provider options and debate capabilities.
