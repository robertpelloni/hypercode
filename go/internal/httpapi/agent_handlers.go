package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/hypercodehq/hypercode-go/internal/ai"
)

func (s *Server) handleAgentChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	var payload struct {
		Message string       `json:"message"`
		History []ai.Message `json:"history"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	// Try upstream first for full routing/quota features
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "agent.chat", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "agent.chat",
			},
		})
		return
	}

	// Fall back to local Go LLM routing
	messages := payload.History
	if len(messages) == 0 && payload.Message != "" {
		messages = []ai.Message{{Role: "user", Content: payload.Message}}
	}

	llmResp, fallbackErr := ai.AutoRoute(r.Context(), messages)
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   fallbackErr.Error(),
			"detail":  fallbackErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"content":  llmResp.Content,
			"provider": llmResp.Provider,
			"model":    llmResp.Model,
			"usage": map[string]int{
				"inputTokens":  llmResp.Usage.InputTokens,
				"outputTokens": llmResp.Usage.OutputTokens,
			},
		},
		"bridge": map[string]any{
			"fallback":  "go-local-llm-routing",
			"procedure": "agent.chat",
			"reason":    "upstream unavailable; using native Go LLM fallback routing",
		},
	})
}
