# Council API Reference

Base URL: `http://localhost:3002/api/council`

## Endpoints

### Status & Configuration

#### GET /status
Returns current council status.

**Response:**
```json
{
  "active": true,
  "supervisorCount": 3,
  "consensusMode": "weighted",
  "leadSupervisor": "GPT-4o",
  "debateRounds": 2
}
```

#### GET /config
Returns full council configuration.

**Response:**
```json
{
  "consensusMode": "weighted",
  "debateRounds": 2,
  "consensusThreshold": 0.6,
  "leadSupervisor": "GPT-4o",
  "fallbackChain": ["Claude", "GPT-4o", "Gemini"],
  "supervisors": [...]
}
```

### Supervisor Management

#### POST /supervisors
Add one or more supervisors.

**Request:**
```json
{
  "supervisors": [{
    "name": "GPT-4o",
    "provider": "openai",
    "model": "gpt-4o",
    "weight": 1.5,
    "systemPrompt": "You are a code reviewer specializing in security."
  }]
}
```

**Provider Options:** `openai`, `anthropic`, `deepseek`, `gemini`, `grok`, `xai`, `qwen`, `kimi`, `moonshot`, `custom`

#### GET /supervisors
List all supervisors with availability status.

**Response:**
```json
{
  "supervisors": [{
    "name": "GPT-4o",
    "provider": "openai",
    "model": "gpt-4o",
    "weight": 1.5,
    "available": true
  }]
}
```

#### DELETE /supervisors/:name
Remove a supervisor by name.

#### PUT /supervisors/:name/weight
Update supervisor weight.

**Request:**
```json
{
  "weight": 2.0
}
```

### Council Settings

#### PUT /consensus-mode
Change consensus mode.

**Request:**
```json
{
  "mode": "supermajority"
}
```

**Options:** `simple-majority`, `supermajority`, `unanimous`, `weighted`, `ceo-override`, `ceo-veto`, `hybrid-ceo-majority`, `ranked-choice`

#### PUT /lead-supervisor
Set the CEO (lead supervisor).

**Request:**
```json
{
  "name": "GPT-4o"
}
```

#### PUT /fallback-chain
Set fallback order for chat requests.

**Request:**
```json
{
  "chain": ["Claude", "GPT-4o", "Gemini"]
}
```

#### PUT /settings
Update multiple settings at once.

**Request:**
```json
{
  "debateRounds": 3,
  "consensusThreshold": 0.7
}
```

### Core Operations

#### POST /debate
Run a council debate on a task.

**Request:**
```json
{
  "task": {
    "id": "task-001",
    "description": "Review this authentication implementation",
    "context": "We're using JWT tokens with refresh...",
    "files": ["src/auth/jwt.ts", "src/auth/middleware.ts"],
    "code": "export function validateToken(token: string) {...}"
  }
}
```

**Response:**
```json
{
  "approved": true,
  "consensusScore": 0.85,
  "rounds": 2,
  "votes": [{
    "supervisor": "GPT-4o",
    "approved": true,
    "confidence": 0.9,
    "reasoning": "Implementation follows security best practices..."
  }],
  "dissent": [],
  "summary": "Council approved with strong consensus (85%)"
}
```

#### POST /chat
Single chat with fallback chain.

**Request:**
```json
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Explain this code..."}
  ],
  "preferredSupervisor": "Claude"
}
```

**Response:**
```json
{
  "content": "This code implements...",
  "supervisor": "Claude",
  "fallbackUsed": false
}
```

#### POST /reset
Clear all supervisors and reset to defaults.

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

Common error codes:
- `SUPERVISOR_NOT_FOUND`: Named supervisor doesn't exist
- `INVALID_PROVIDER`: Unknown provider type
- `NO_SUPERVISORS`: No supervisors configured
- `API_KEY_MISSING`: Required API key not set
- `DEBATE_FAILED`: Debate couldn't reach consensus
