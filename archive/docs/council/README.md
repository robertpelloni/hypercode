# Multi-Model AI Council

**Status:** Integrated (v0.3.0+)
**Origin:** opencode-autopilot submodule

The AI Council is a multi-model consensus engine that enables multiple AI supervisors to debate and vote on code changes through a democratic process. Instead of trusting a single model, the council convenes specialized supervisors to critique, refine, and decide on the most robust solution.

## Core Concept

Single-model code generation is fragile. LLMs hallucinate, miss context, and struggle with complex architectural reasoning. The Council solves this through **orchestration via debate**:

1. **Debate**: Models critique each other's proposed solutions
2. **Refine**: Iterative rounds of improvement based on cross-model feedback  
3. **Decide**: A consensus mechanism selects the most robust solution

## Key Benefits

- **No Single Point of Failure**: If one model hallucinates, others catch it
- **Specialization**: Leverage each model's strengths (Claude for architecture, GPT-4 for logic, Gemini for creativity)
- **Transparency**: The debate process provides a "reasoning trace" for final decisions

## Supported Supervisors

| Provider | Model | Environment Variable |
|----------|-------|---------------------|
| OpenAI | GPT-4o | `OPENAI_API_KEY` |
| Anthropic | Claude 3.5 Sonnet | `ANTHROPIC_API_KEY` |
| DeepSeek | DeepSeek Chat | `DEEPSEEK_API_KEY` |
| Google | Gemini Pro | `GEMINI_API_KEY` |
| xAI | Grok | `GROK_API_KEY` or `XAI_API_KEY` |
| Alibaba | Qwen | `QWEN_API_KEY` |
| Moonshot | Kimi | `KIMI_API_KEY` or `MOONSHOT_API_KEY` |

## Consensus Modes

| Mode | Description |
|------|-------------|
| `simple-majority` | >50% approval required |
| `supermajority` | ≥67% approval required |
| `unanimous` | 100% approval required |
| `weighted` | Weight × confidence voting |
| `ceo-override` | Lead supervisor can override council |
| `ceo-veto` | Lead supervisor can veto council decisions |
| `hybrid-ceo-majority` | CEO override with majority fallback |
| `ranked-choice` | Ranked preference voting |

## Weighted Voting Formula

Each supervisor has:
- **Weight** (0-2x): Prioritizes certain supervisors
- **Confidence** (0-1): Self-reported certainty in vote

```
consensus = Σ(approved × weight × confidence) / Σ(weight)
```

Strong dissent (rejection with confidence > 0.7) blocks auto-approval.

## Quick Start

### 1. Set API Keys

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

### 2. Add Supervisors via API

```bash
curl -X POST http://localhost:3002/api/council/supervisors \
  -H "Content-Type: application/json" \
  -d '{
    "supervisors": [{
      "name": "GPT-4o",
      "provider": "openai",
      "model": "gpt-4o",
      "weight": 1.5
    }, {
      "name": "Claude",
      "provider": "anthropic", 
      "model": "claude-3-5-sonnet-20241022",
      "weight": 1.0
    }]
  }'
```

### 3. Trigger a Debate

```bash
curl -X POST http://localhost:3002/api/council/debate \
  -H "Content-Type: application/json" \
  -d '{
    "task": {
      "id": "task-001",
      "description": "Should we migrate from REST to GraphQL?",
      "context": "Current API has 50 endpoints...",
      "files": ["src/api/routes.ts"]
    }
  }'
```

## API Endpoints

All council endpoints are available at `/api/council/*`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/council/status` | Get council status and config |
| GET | `/api/council/config` | Get full configuration |
| POST | `/api/council/supervisors` | Add supervisors |
| GET | `/api/council/supervisors` | List all supervisors with availability |
| DELETE | `/api/council/supervisors/:name` | Remove supervisor |
| PUT | `/api/council/supervisors/:name/weight` | Set supervisor weight |
| PUT | `/api/council/consensus-mode` | Change consensus mode |
| PUT | `/api/council/lead-supervisor` | Set CEO (lead supervisor) |
| PUT | `/api/council/fallback-chain` | Set fallback order |
| PUT | `/api/council/settings` | Update debateRounds, threshold, etc. |
| POST | `/api/council/debate` | Run council debate |
| POST | `/api/council/chat` | Single chat with fallback |
| POST | `/api/council/reset` | Clear all supervisors |

## WebSocket Events

Connect to Socket.io for real-time updates:

| Event | Description |
|-------|-------------|
| `council:decision` | Debate results |
| `council:debate_progress` | Debate round updates |
| `council:vote` | Individual supervisor votes |
| `council:health` | Supervisor availability changes |

## Architecture

```
packages/core/src/
├── supervisors/
│   ├── BaseSupervisor.ts           # Abstract base with retry logic
│   ├── OpenAISupervisor.ts         # GPT-4 adapter
│   ├── AnthropicSupervisor.ts      # Claude adapter
│   ├── GenericOpenAISupervisor.ts  # DeepSeek, Grok, Qwen, Kimi, Gemini
│   └── index.ts                    # Factory + Registry
├── managers/
│   └── SupervisorCouncilManager.ts # Core debate engine (~520 lines)
├── routes/
│   └── councilRoutes.ts            # Hono API routes
└── types/
    └── council.ts                  # Council-specific types
```

## Example Configurations

Ready-to-use configuration files are available in `docs/council/examples/`:

| File | Description |
|------|-------------|
| `council-minimal.json` | Single supervisor, auto-approve mode |
| `council-standard.json` | 3 supervisors with custom system prompts |
| `council-all-providers.json` | All 7 providers configured |
| `config.example.json` | Full production config with all options |
| `demo.js` | Interactive demo script |

## Related Documentation

- [API Reference](./API.md) - Full API documentation
- [Configuration](./CONFIGURATION.md) - Advanced configuration options
- [Usage Examples](./USAGE.md) - Practical usage scenarios

## Future Enhancements

Features from opencode-autopilot available for future integration:

- **Dynamic Supervisor Selection**: Auto-select optimal team based on task type
- **Human-in-the-Loop Veto**: Developer acts as Council Chair
- **Debate History**: Persistent debate records with analytics
- **Supervisor Analytics**: Performance tracking per supervisor
- **Debate Templates**: Pre-configured debate scenarios
- **Collaborative Debates**: Multiple human participants
- **Plugin Ecosystem**: External supervisor plugins
- **Smart Pilot**: Auto-continue when council approves
