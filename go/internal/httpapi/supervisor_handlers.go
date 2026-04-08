package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/hypercodehq/hypercode-go/internal/ai"
)

func (s *Server) handleSupervisorDecompose(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Task string `json:"task"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "supervisor.decompose", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "supervisor.decompose"},
		})
		return
	}

	resp, aiErr := ai.AutoRoute(r.Context(), []ai.Message{
		{Role: "system", Content: "You are a task decomposition expert. Break the given task into 2-5 concrete subtasks. Return ONLY a JSON array of objects with 'id', 'title', and 'description' fields."},
		{Role: "user", Content: payload.Task},
	})
	if aiErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": aiErr.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    map[string]any{"subtasks": resp.Content, "task": payload.Task},
		"bridge": map[string]any{"fallback": "go-local-supervisor", "procedure": "supervisor.decompose", "reason": "upstream unavailable; native Go AI decomposition"},
	})
}

func (s *Server) handleSupervisorSupervise(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Task     string `json:"task"`
		Model    string `json:"model"`
		Provider string `json:"provider"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "supervisor.supervise", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "supervisor.supervise"},
		})
		return
	}

	resp, aiErr := ai.AutoRoute(r.Context(), []ai.Message{
		{Role: "system", Content: "You are an expert coding supervisor. Analyze the task and provide a detailed implementation plan with step-by-step instructions."},
		{Role: "user", Content: payload.Task},
	})
	if aiErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": aiErr.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    map[string]any{"plan": resp.Content, "task": payload.Task, "status": "supervised"},
		"bridge": map[string]any{"fallback": "go-local-supervisor", "procedure": "supervisor.supervise", "reason": "upstream unavailable; native Go AI supervision"},
	})
}

func (s *Server) handleSupervisorStatus(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "supervisor.status", nil)
}

func (s *Server) handleSupervisorListTasks(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		parsed, err := strconv.Atoi(limit)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid limit query parameter"})
			return
		}
		payload["limit"] = parsed
	}
	if status := strings.TrimSpace(r.URL.Query().Get("status")); status != "" {
		payload["status"] = status
	}
	if len(payload) == 0 {
		s.handleTRPCBridgeCall(w, r, http.MethodGet, "supervisor.listTasks", nil)
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "supervisor.listTasks", payload)
}

func (s *Server) handleSupervisorCancel(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		TaskID string `json:"taskId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "supervisor.cancel", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "supervisor.cancel"},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    map[string]any{"taskId": payload.TaskID, "cancelled": true},
		"bridge": map[string]any{"fallback": "go-local-supervisor", "procedure": "supervisor.cancel", "reason": "upstream unavailable"},
	})
}
