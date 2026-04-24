package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

type circuitBreaker struct {
	mu           sync.RWMutex
	failures     map[string]int
	openUntil    map[string]time.Time
	failureLimit int
	openDuration time.Duration
}

var cb = &circuitBreaker{
	failures:     make(map[string]int),
	openUntil:    make(map[string]time.Time),
	failureLimit: 3,
	openDuration: 5 * time.Minute,
}

func (c *circuitBreaker) isOpen(provider string) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if t, exists := c.openUntil[provider]; exists && time.Now().Before(t) {
		return true
	}
	return false
}

func (c *circuitBreaker) recordSuccess(provider string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.failures, provider)
	delete(c.openUntil, provider)
}

func (c *circuitBreaker) recordFailure(provider string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.failures[provider]++
	if c.failures[provider] >= c.failureLimit {
		c.openUntil[provider] = time.Now().Add(c.openDuration)
		addKeeperLog(fmt.Sprintf("Circuit breaker tripped for %s provider. Traffic will be routed to fallbacks for %v.", provider, c.openDuration), "error", "global", map[string]interface{}{
			"event":    "circuit_breaker_tripped",
			"provider": provider,
		})
	}
}

type LLMMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type LLMUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type LLMResult struct {
	Content    string
	Usage      *LLMUsage
	LatencyMs  float64
}

func normalizeProvider(provider string) string {
	value := strings.ToLower(strings.TrimSpace(provider))
	if value == "" {
		return "openai"
	}
	return value
}

func defaultModelForProvider(provider string) string {
	switch normalizeProvider(provider) {
	case "lmstudio":
		return "gemma-4-e2b-uncensored-hauhaucs-aggressive"
	case "openrouter":
		return "free"
	case "anthropic":
		return "claude-3-5-sonnet-latest"
	case "gemini":
		return "gemini-1.5-flash"
	default:
		return "gpt-4o-mini"
	}
}

func resolveModel(provider, model string) string {
	value := strings.TrimSpace(model)
	if value != "" {
		return value
	}
	return defaultModelForProvider(provider)
}

func getSupervisorProvider() string {
	if db.DB == nil {
		return "lmstudio"
	}
	var settings models.KeeperSettings
	if err := db.DB.First(&settings, "id = ?", "default").Error; err != nil {
		return "lmstudio"
	}
	return normalizeProvider(settings.SupervisorProvider)
}

func getSupervisorAPIKey(provider string, explicit *string) string {
	if explicit != nil {
		value := strings.TrimSpace(*explicit)
		if value != "" && value != "placeholder" && value != "undefined" && value != "null" {
			return value
		}
	}

	switch strings.ToLower(strings.TrimSpace(provider)) {
	case "lmstudio":
		return "lm-studio" // LM Studio usually doesn't need a key, but we need a non-empty string to avoid skipping
	case "openrouter":
		if key := strings.TrimSpace(os.Getenv("OPENROUTER_API_KEY")); key != "" {
			return key
		}
	case "kilocode":
		if key := strings.TrimSpace(os.Getenv("KILOCODE_API_KEY")); key != "" {
			return key
		}
	case "cline":
		if key := strings.TrimSpace(os.Getenv("CLINE_API_KEY")); key != "" {
			return key
		}
	case "anthropic":
		if key := strings.TrimSpace(os.Getenv("ANTHROPIC_API_KEY")); key != "" {
			return key
		}
	case "gemini":
		if key := strings.TrimSpace(os.Getenv("GOOGLE_API_KEY")); key != "" {
			return key
		}
		if key := strings.TrimSpace(os.Getenv("GEMINI_API_KEY")); key != "" {
			return key
		}
	default:
		if key := strings.TrimSpace(os.Getenv("OPENAI_API_KEY")); key != "" {
			return key
		}
	}

	fallbacks := []string{"OPENAI_API_KEY", "OPENROUTER_API_KEY", "GOOGLE_API_KEY", "GEMINI_API_KEY", "ANTHROPIC_API_KEY"}
	for _, envKey := range fallbacks {
		if value := strings.TrimSpace(os.Getenv(envKey)); value != "" {
			return value
		}
	}
	return ""
}

func generateLLMText(primaryProvider, primaryApiKey, primaryModel, systemPrompt string, messages []LLMMessage) (LLMResult, error) {
	primaryProvider = normalizeProvider(primaryProvider)
	primaryModel = resolveModel(primaryProvider, primaryModel)

	// User requested fallback chain: LMStudio -> OpenRouter -> Fallback to others
	providers := []string{primaryProvider}
	
	fallbackChain := []string{"lmstudio", "openrouter", "openai", "anthropic", "gemini"}
	for _, p := range fallbackChain {
		exists := false
		for _, existing := range providers {
			if existing == p {
				exists = true
				break
			}
		}
		if !exists {
			providers = append(providers, p)
		}
	}

	// Throttle requests to avoid 429s from remote APIs
	time.Sleep(1 * time.Second)

	// Throttle requests to avoid 429s from remote APIs
	time.Sleep(1 * time.Second)

	var lastErr error
	for i, provider := range providers {
		if cb.isOpen(provider) {
			lastErr = fmt.Errorf("provider %s is currently unavailable (circuit breaker open)", provider)
			continue
		}

		apiKey := primaryApiKey
		model := primaryModel

		if i > 0 {
			// This is a fallback attempt
			apiKey = getSupervisorAPIKey(provider, nil)
			if apiKey == "" || apiKey == "placeholder" {
				continue // Cannot fallback without an API key
			}
			model = resolveModel(provider, "")
		}

		var result LLMResult
		var err error

		switch provider {
		case "anthropic":
			result, err = generateAnthropicText(apiKey, model, systemPrompt, messages)
		case "gemini":
			result, err = generateGeminiText(apiKey, model, systemPrompt, messages)
		default:
			result, err = generateOpenAIText(apiKey, model, systemPrompt, messages)
		}

		if err != nil {
			lastErr = err
			errStr := err.Error()
			RecordLLMLatency(provider, result.LatencyMs, false)
			// Track failure if it's a rate limit or server error
			if strings.Contains(errStr, "(429)") || strings.Contains(errStr, "(50") || strings.Contains(errStr, "(52") || strings.Contains(errStr, "(53") || strings.Contains(errStr, "timeout") {
				cb.recordFailure(provider)
			}
			continue // Try the next fallback provider
		}

		// Success
		cb.recordSuccess(provider)

		// Record LLM latency metric
		RecordLLMLatency(provider, result.LatencyMs, true)

		// Record token usage for budget tracking
		if result.Usage != nil {
			go func() {
				_ = RecordTokenUsage(nil, provider, model,
					result.Usage.PromptTokens, result.Usage.CompletionTokens,
					"other", 0, true)
			}()
		}

		// If we used a fallback, log that we successfully recovered
		if i > 0 {
			addKeeperLog(fmt.Sprintf("Self-healing successful: rerouted LLM request from %s to %s.", primaryProvider, provider), "action", "global", map[string]interface{}{
				"event":            "llm_fallback_success",
				"originalProvider": primaryProvider,
				"fallbackProvider": provider,
			})
		}

		return result, nil
	}

	return LLMResult{}, fmt.Errorf("all LLM providers failed. last error: %v", lastErr)
}

func extractJSONBlock(input string) string {
	start := strings.Index(input, "{")
	end := strings.LastIndex(input, "}")
	if start == -1 || end == -1 || end <= start {
		return ""
	}
	return input[start : end+1]
}

func extractRiskScoreFromText(input string) int {
	digits := strings.Builder{}
	for _, r := range input {
		if r >= '0' && r <= '9' {
			digits.WriteRune(r)
		}
	}
	if digits.Len() == 0 {
		return defaultPlanRiskScore
	}
	var score int
	fmt.Sscanf(digits.String(), "%d", &score)
	if score < 0 {
		return 0
	}
	if score > 100 {
		return 100
	}
	return score
}

func generateStructuredJSON(provider, apiKey, model, systemPrompt string, messages []LLMMessage, target interface{}) error {
	result, err := generateLLMText(provider, apiKey, model, systemPrompt, messages)
	if err != nil {
		return err
	}
	jsonBlock := extractJSONBlock(result.Content)
	if jsonBlock == "" {
		return fmt.Errorf("response did not contain JSON")
	}
	if err := json.Unmarshal([]byte(jsonBlock), target); err != nil {
		return err
	}
	return nil
}

func generateRiskScore(provider, apiKey, model, topic, summary string, fallback int) int {
	prompt := fmt.Sprintf("Analyze the following debate summary and provide a risk score between 0 and 100. 100 = extremely high risk, 0 = extremely low risk. Respond with ONLY the number.\n\nTopic: %s\nSummary:\n%s", topic, summary)
	result, err := generateLLMText(provider, apiKey, model, "You are a strict technical risk scorer. Respond with a number only.", []LLMMessage{{Role: "user", Content: prompt}})
	if err != nil {
		return fallback
	}
	return extractRiskScoreFromText(result.Content)
}

func generateOpenAIText(apiKey, model, systemPrompt string, messages []LLMMessage) (LLMResult, error) {
	start := time.Now()

	provider := "openai"
	if strings.HasPrefix(model, "gemma") || strings.Contains(model, "lmstudio") || (apiKey == "lm-studio") {
		provider = "lmstudio"
	} else if strings.Contains(model, "openrouter") || strings.Contains(apiKey, "sk-or-") {
		provider = "openrouter"
	} else if strings.Contains(model, "kilocode") || strings.Contains(apiKey, "sk-kc-") {
		provider = "kilocode"
	} else if strings.Contains(model, "cline") || strings.Contains(apiKey, "sk-cl-") {
		provider = "cline"
	}

	requestMessages := make([]map[string]string, 0, len(messages)+1)
	if strings.TrimSpace(systemPrompt) != "" {
		requestMessages = append(requestMessages, map[string]string{"role": "system", "content": systemPrompt})
	}
	for _, message := range messages {
		requestMessages = append(requestMessages, map[string]string{"role": message.Role, "content": message.Content})
	}

	requestBody, _ := json.Marshal(map[string]interface{}{
		"model":       model,
		"messages":    requestMessages,
		"temperature": 0.2,
	})

	apiURL := "https://api.openai.com/v1/chat/completions"
	switch provider {
	case "lmstudio":
		apiURL = "http://localhost:1234/v1/chat/completions"
	case "openrouter":
		apiURL = "https://openrouter.ai/api/v1/chat/completions"
	case "kilocode":
		// Example URL if they use a standard one, else fallback to standard openrouter structure if they are a proxy
		apiURL = "https://kilocode.ai/api/v1/chat/completions"
		if custom := os.Getenv("KILOCODE_API_BASE"); custom != "" {
			apiURL = custom + "/chat/completions"
		}
	case "cline":
		apiURL = "https://api.cline.bot/v1/chat/completions"
		if custom := os.Getenv("CLINE_API_BASE"); custom != "" {
			apiURL = custom + "/chat/completions"
		}
	}

	req, err := http.NewRequest(http.MethodPost, apiURL, bytes.NewReader(requestBody))
	if err != nil {
		return LLMResult{}, err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	if provider == "openrouter" {
		req.Header.Set("HTTP-Referer", "https://jules-autopilot.render.com")
		req.Header.Set("X-Title", "Jules Autopilot")
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return LLMResult{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return LLMResult{}, fmt.Errorf("openai request failed (%d): %s", resp.StatusCode, string(body))
	}

	var data struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Usage struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
			TotalTokens      int `json:"total_tokens"`
		} `json:"usage"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return LLMResult{}, err
	}
	if len(data.Choices) == 0 {
		return LLMResult{}, fmt.Errorf("openai response contained no choices")
	}

	return LLMResult{
		Content:   strings.TrimSpace(data.Choices[0].Message.Content),
		LatencyMs: float64(time.Since(start).Milliseconds()),
		Usage: &LLMUsage{
			PromptTokens:     data.Usage.PromptTokens,
			CompletionTokens: data.Usage.CompletionTokens,
			TotalTokens:      data.Usage.TotalTokens,
		},
	}, nil
}

func generateAnthropicText(apiKey, model, systemPrompt string, messages []LLMMessage) (LLMResult, error) {
	start := time.Now()

	anthropicMessages := make([]map[string]string, 0, len(messages))
	for _, message := range messages {
		role := message.Role
		if role == "system" {
			role = "user"
		}
		anthropicMessages = append(anthropicMessages, map[string]string{
			"role":    role,
			"content": message.Content,
		})
	}

	requestBody, _ := json.Marshal(map[string]interface{}{
		"model":      model,
		"system":     systemPrompt,
		"max_tokens": 1200,
		"messages":   anthropicMessages,
	})

	req, err := http.NewRequest(http.MethodPost, "https://api.anthropic.com/v1/messages", bytes.NewReader(requestBody))
	if err != nil {
		return LLMResult{}, err
	}
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("content-type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return LLMResult{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return LLMResult{}, fmt.Errorf("anthropic request failed (%d): %s", resp.StatusCode, string(body))
	}

	var data struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
		Usage struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
		} `json:"usage"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return LLMResult{}, err
	}
	if len(data.Content) == 0 {
		return LLMResult{}, fmt.Errorf("anthropic response contained no content")
	}

	contentParts := make([]string, 0, len(data.Content))
	for _, part := range data.Content {
		if strings.TrimSpace(part.Text) != "" {
			contentParts = append(contentParts, part.Text)
		}
	}

	return LLMResult{
		Content:   strings.TrimSpace(strings.Join(contentParts, "\n")),
		LatencyMs: float64(time.Since(start).Milliseconds()),
		Usage: &LLMUsage{
			PromptTokens:     data.Usage.InputTokens,
			CompletionTokens: data.Usage.OutputTokens,
			TotalTokens:      data.Usage.InputTokens + data.Usage.OutputTokens,
		},
	}, nil
}

func generateGeminiText(apiKey, model, systemPrompt string, messages []LLMMessage) (LLMResult, error) {
	start := time.Now()

	type part struct {
		Text string `json:"text"`
	}
	type content struct {
		Role  string `json:"role,omitempty"`
		Parts []part `json:"parts"`
	}

	contents := make([]content, 0, len(messages))
	for _, message := range messages {
		role := "user"
		if message.Role == "assistant" {
			role = "model"
		}
		contents = append(contents, content{
			Role:  role,
			Parts: []part{{Text: message.Content}},
		})
	}

	request := map[string]interface{}{
		"contents": contents,
	}
	if strings.TrimSpace(systemPrompt) != "" {
		request["systemInstruction"] = map[string]interface{}{
			"parts": []map[string]string{{"text": systemPrompt}},
		}
	}

	requestBody, _ := json.Marshal(request)
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, apiKey)
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(requestBody))
	if err != nil {
		return LLMResult{}, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return LLMResult{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return LLMResult{}, fmt.Errorf("gemini request failed (%d): %s", resp.StatusCode, string(body))
	}

	var data struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
		UsageMetadata struct {
			PromptTokenCount     int `json:"promptTokenCount"`
			CandidatesTokenCount int `json:"candidatesTokenCount"`
			TotalTokenCount      int `json:"totalTokenCount"`
		} `json:"usageMetadata"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return LLMResult{}, err
	}
	if len(data.Candidates) == 0 {
		return LLMResult{}, fmt.Errorf("gemini response contained no candidates")
	}

	parts := data.Candidates[0].Content.Parts
	contentParts := make([]string, 0, len(parts))
	for _, part := range parts {
		if strings.TrimSpace(part.Text) != "" {
			contentParts = append(contentParts, part.Text)
		}
	}

	return LLMResult{
		Content:   strings.TrimSpace(strings.Join(contentParts, "\n")),
		LatencyMs: float64(time.Since(start).Milliseconds()),
		Usage: &LLMUsage{
			PromptTokens:     data.UsageMetadata.PromptTokenCount,
			CompletionTokens: data.UsageMetadata.CandidatesTokenCount,
			TotalTokens:      data.UsageMetadata.TotalTokenCount,
		},
	}, nil
}
