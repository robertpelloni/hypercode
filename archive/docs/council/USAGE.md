# Council Usage Guide

Practical examples and scenarios for using the Multi-Model AI Council.

## Common Scenarios

### 1. Automated Code Review

Set up council to review all code changes before merge.

```bash
# Add reviewers
curl -X POST http://localhost:3002/api/council/supervisors \
  -H "Content-Type: application/json" \
  -d '{
    "supervisors": [
      {"name": "Security Expert", "provider": "anthropic", "model": "claude-3-5-sonnet-20241022", "systemPrompt": "Focus on security vulnerabilities, injection attacks, and auth flaws."},
      {"name": "Performance Guru", "provider": "openai", "model": "gpt-4o", "systemPrompt": "Analyze for performance bottlenecks, memory leaks, and optimization opportunities."},
      {"name": "Architecture Reviewer", "provider": "deepseek", "model": "deepseek-chat", "systemPrompt": "Evaluate architectural decisions, patterns, and maintainability."}
    ]
  }'

# Set weighted consensus
curl -X PUT http://localhost:3002/api/council/consensus-mode \
  -H "Content-Type: application/json" \
  -d '{"mode": "weighted"}'
```

### 2. High-Stakes Unanimous Approval

For critical changes requiring all supervisors to agree.

```bash
curl -X PUT http://localhost:3002/api/council/consensus-mode \
  -H "Content-Type: application/json" \
  -d '{"mode": "unanimous"}'

curl -X PUT http://localhost:3002/api/council/settings \
  -H "Content-Type: application/json" \
  -d '{"debateRounds": 3}'
```

### 3. CEO Override for Senior Developer

Give a lead supervisor final say on contentious decisions.

```bash
curl -X PUT http://localhost:3002/api/council/lead-supervisor \
  -H "Content-Type: application/json" \
  -d '{"name": "Architecture Reviewer"}'

curl -X PUT http://localhost:3002/api/council/consensus-mode \
  -H "Content-Type: application/json" \
  -d '{"mode": "ceo-override"}'
```

### 4. Quick Single-Supervisor Reviews

Bypass debate for simple questions.

```bash
curl -X POST http://localhost:3002/api/council/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Is this SQL query safe from injection?"}],
    "preferredSupervisor": "Security Expert"
  }'
```

### 5. Fallback Chain for Reliability

Ensure responses even if primary supervisor is unavailable.

```bash
curl -X PUT http://localhost:3002/api/council/fallback-chain \
  -H "Content-Type: application/json" \
  -d '{"chain": ["Claude", "GPT-4o", "Gemini", "DeepSeek"]}'
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: AI Code Review
on: [pull_request]

jobs:
  council-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Get changed files
        id: files
        run: |
          FILES=$(git diff --name-only ${{ github.event.pull_request.base.sha }} ${{ github.sha }} | jq -R -s -c 'split("\n") | map(select(length > 0))')
          echo "files=$FILES" >> $GITHUB_OUTPUT
      
      - name: Council Review
        run: |
          RESPONSE=$(curl -s -X POST ${{ secrets.BORG_URL }}/api/council/debate \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.BORG_TOKEN }}" \
            -d '{
              "task": {
                "id": "pr-${{ github.event.pull_request.number }}",
                "description": "${{ github.event.pull_request.title }}",
                "files": ${{ steps.files.outputs.files }}
              }
            }')
          
          APPROVED=$(echo $RESPONSE | jq -r '.approved')
          if [ "$APPROVED" != "true" ]; then
            echo "Council rejected changes"
            exit 1
          fi
```

## Best Practices

### 1. Start Small
Begin with 2-3 supervisors. More isn't always better—it increases cost and latency.

### 2. Specialize Roles
Assign distinct system prompts:
- Security auditor
- Performance analyst  
- Architecture reviewer
- Test coverage checker

### 3. Adjust Thresholds by Criticality
| Change Type | Mode | Threshold |
|-------------|------|-----------|
| Docs/Comments | simple-majority | 0.5 |
| Feature code | weighted | 0.6 |
| Auth/Security | supermajority | 0.67 |
| Database migrations | unanimous | 1.0 |

### 4. Monitor Consensus Scores
Low scores (< 0.6) indicate disagreement. Review the reasoning traces.

### 5. Use Custom System Prompts
Generic prompts produce generic reviews. Be specific:

```json
{
  "systemPrompt": "You are a Node.js security expert. Focus on:\n- SQL/NoSQL injection\n- XSS vulnerabilities\n- Authentication bypass\n- Secrets in code\n- Dependency vulnerabilities\nRate severity: CRITICAL, HIGH, MEDIUM, LOW"
}
```

## Troubleshooting

### Debate Times Out
- Reduce `debateRounds` 
- Check supervisor API availability
- Verify API keys are set

### Low Consensus Scores
- Supervisors may have conflicting system prompts
- Task description may be ambiguous
- Try more debate rounds

### Supervisor Not Responding
- Check environment variables for API keys
- Verify provider is not rate-limited
- Check fallback chain is configured
