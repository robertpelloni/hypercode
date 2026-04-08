package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/hypercodehq/hypercode-go/internal/orchestration"
)

func (s *Server) handleCouncilBaseStatus(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.status", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.status"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    s.council.GetStatus(),
		"bridge":  map[string]any{"fallback": "go-local-council", "procedure": "council.status", "reason": "upstream unavailable"},
	})
}

func (s *Server) handleCouncilBaseUpdateConfig(w http.ResponseWriter, r *http.Request) {
	var payload localCouncilConfig
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.updateConfig", payload, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.updateConfig"}})
		return
	}
	s.council.UpdateConfig(payload)
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"updated": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.updateConfig", "reason": "upstream unavailable; persisted locally"}})
}

func (s *Server) handleCouncilBaseAddSupervisors(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Supervisors []localCouncilMember `json:"supervisors"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.addSupervisors", payload, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.addSupervisors"}})
		return
	}
	for _, sup := range payload.Supervisors {
		s.council.AddSupervisor(sup)
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"added": len(payload.Supervisors)}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.addSupervisors", "reason": "upstream unavailable; persisted locally"}})
}

func (s *Server) handleCouncilBaseClearSupervisors(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.clearSupervisors", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.clearSupervisors"}})
		return
	}
	count := s.council.ClearSupervisors()
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"cleared": count}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.clearSupervisors", "reason": "upstream unavailable"}})
}

func (s *Server) handleCouncilBaseDebate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	var payload struct {
		ID          string   `json:"id"`
		Objective   string   `json:"objective"`
		Description string   `json:"description"`
		Context     string   `json:"context"`
		Files       []string `json:"files"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	normalizedObjective := payload.Objective
	if normalizedObjective == "" {
		normalizedObjective = payload.Description
	}

	upstreamPayload := map[string]any{
		"id":          payload.ID,
		"objective":   normalizedObjective,
		"description": normalizedObjective,
		"context":     payload.Context,
		"files":       payload.Files,
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "council.debate", upstreamPayload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "council.debate",
			},
		})
		return
	}

	debateRes, fallbackErr := orchestration.RunDebate(r.Context(), normalizedObjective, payload.Context)
	if fallbackErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   fallbackErr.Error(),
			"detail":  fallbackErr.Error(),
		})
		return
	}

	savedRecord, saveErr := s.debateHistory.SaveNativeDebate(r.Context(), payload.ID, normalizedObjective, payload.Context, debateRes)
	if saveErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   saveErr.Error(),
			"detail":  saveErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"result": debateRes,
			"record": savedRecord,
		},
		"bridge": map[string]any{
			"fallback":  "go-local-council-debate",
			"procedure": "council.debate",
			"reason":    "upstream unavailable; executing native Go multi-agent debate loop with native debate-history persistence",
		},
	})
}

func (s *Server) handleCouncilBaseToggle(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Enabled bool `json:"enabled"`
	}
	json.NewDecoder(r.Body).Decode(&payload)
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.toggle", payload, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.toggle"}})
		return
	}
	s.council.Toggle(payload.Enabled)
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"enabled": payload.Enabled}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.toggle", "reason": "upstream unavailable; persisted locally"}})
}

func (s *Server) handleCouncilBaseAddMock(w http.ResponseWriter, r *http.Request) {
	var payload localCouncilMember
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.addMock", payload, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.addMock"}})
		return
	}
	s.council.AddMockSupervisor(payload)
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"added": true, "id": payload.ID}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.addMock", "reason": "upstream unavailable; persisted locally"}})
}
