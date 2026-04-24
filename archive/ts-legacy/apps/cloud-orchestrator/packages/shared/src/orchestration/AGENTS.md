# ORCHESTRATION KNOWLEDGE BASE

## OVERVIEW
The `lib/orchestration` module is the brain of Jules' multi-agent capabilities. It handles provider integrations (OpenAI, Anthropic, Gemini, Qwen), debate coordination, and prompt management.

## STRUCTURE
```
lib/orchestration/
├── providers/        # LLM Provider adapters
│   ├── anthropic.ts  # Claude integration
│   ├── gemini.ts     # Google Gemini integration
│   ├── openai.ts     # OpenAI integration
│   └── qwen.ts       # Alibaba Qwen integration
├── debate.ts         # Core logic for multi-agent debate rounds
├── types.ts          # Shared interfaces (Participant, Message, DebateResult)
└── actions.ts        # Server Actions for triggering debates
```

## KEY INTERFACES
- **Participant**: Defines an agent's identity, role, and provider configuration.
- **DebateRound**: Represents a single cycle of arguments between participants.

## CONVENTIONS
- **Statelessness**: Orchestration functions should generally be stateless, accepting history/context as input.
- **Provider Parity**: New providers must implement the standard `ProviderInterface` defined in `types.ts`.
- **Secrets**: Never hardcode API keys. Use the `apiKey` parameter or environment variables via the `DebateDialog` configuration.
