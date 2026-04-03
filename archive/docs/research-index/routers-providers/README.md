# Routers / Providers

**Purpose**: API gateways, model routing, provider management systems

## Overview

Router and provider systems manage API access, load balancing, and intelligent model selection across multiple AI providers. This category tracks aggregators, gateways, and provider management tools for Hypercode's routing capabilities.

## Known Systems

### API Gateways & Aggregators

| Repository | URL | Status | Notes |
|------------|-----|--------|-------|
| OpenRouter | https://openrouter.ai/ | ❓ Not Started | Multi-provider gateway |
| Megallm | https://megallm.io/dashboard/models | ❓ Not Started | 70 LLMs one API |
| Blocks Team | https://www.blocks.team/signin | ❓ Not Started | Gateway |
| Anannas AI | https://anannas.ai/ | ❓ Not Started | Gateway |
| Voyage AI | https://dashboard.voyageai.com/ | ❓ Not Started | Embedding provider |
| AgentRouter | https://agentrouter.org/console | ❓ Not Started | Agent routing |
| Synthetic | https://synthetic.new/user-settings/api | ❓ Not Started | Synthetic API |
| Yupp AI | https://yupp.ai/profile | ❓ Not Started | Gateway |
| Chutes AI | https://chutes.ai/app/api | ❓ Not Started | Gateway |
| Poe API | https://poe.com/settings | ❓ Not Started | Poe gateway |
| LiteLLM | https://github.com/BerriAI/litellm | 📖 Fully Researched | Multi-provider SDK |
| Factory Droid | https://github.com/factory-ai/factory | ❓ Not Started | AI tool |
| CodeMachine CLI | https://github.com/moazbuilds/CodeMachine-CLI | 📖 Fully Researched | CLI tool |
| Kode | https://github.com/shareAI-lab/Kode-cli | ❓ Not Started | CLI tool |
| OpenAI Codex | https://github.com/openai/codex | ❓ Not Started | Codex |
| Qoder | https://qoder.com/referral | ❓ Not Started | Qoder platform |
| Qoder Referral | https://qoder.com/referral?referral_code=28PawlfZqTxPmqTUNf1GUNMpILBqXkck | ❓ Not Started | Referral |
| Augment Code | https://app.augmentcode.com/onboard | ❓ Not Started | Augment |
| Augment Code Alternative | https://zencoder.ai/lp/augment-code-alternative | ❓ Not Started | Comparison |
| Augment GitHub | https://github.com/augmentcode | ❓ Not Started | Augment repo |
| AmpCode | https://ampcode.com/ | ❓ Not Started | Amp |

### Documentation & Articles

| Resource | URL | Status | Notes |
|----------|-----|--------|-------|
| OpenRouter Credits | https://openrouter.ai/settings/credits | ❓ Not Started | Credits docs |
| Megallm Reddit | https://www.reddit.com/r/claude/comments/1ownpj8/megallm_70_llms_one_api_ai_gateway_for_developers/ | ❓ Not Started | Discussion |
| Try Megallm | https://www.reddit.com/r/aifreeforever/comments/1oxnh6p/try_megallm/ | ❓ Not Started | Discussion |

---

## Hypercode Router Architecture

Hypercode should implement:
- **Multi-provider support**: OpenAI, Anthropic, Google, xAI, etc.
- **Intelligent routing**: Select model based on task, cost, quality
- **Load balancing**: Distribute requests across providers
- **Fallback system**: Auto-switch on quota/errors
- **Quota tracking**: Monitor credits and usage
- **Cost optimization**: Choose cheapest model for task
- **Model ranking**: Sort by quality/speed/cost
- **Provider groups**: Group by provider (all Gemini 3 Pro providers)
- **Usage dashboard**: Track spending and limits
- **Rate limit handling**: Respect and handle rate limits
- **Plan with X, implement with Y**: Architect with expensive model, implement with cheap

---

## Research Tasks

- [ ] Study LiteLLM architecture
- [ ] Analyze OpenRouter API
- [ ] Research provider auth methods (OAuth vs API key)
- [ ] Study quota tracking approaches
- [ ] Analyze model selection algorithms
- [ ] Research fallback strategies
- [ ] Design provider management UI
- [ ] Implement routing engine
- [ ] Add quota tracking
- [ ] Build usage dashboard

---

## Related

- [Multi-Agent](../multi-agent/README.md)
- [CLI Harnesses](../cli-harnesses/README.md)
