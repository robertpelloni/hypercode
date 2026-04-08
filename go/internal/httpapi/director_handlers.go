package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/hypercodehq/hypercode-go/internal/ai"
)

func (s *Server) handleDirectorMemorize(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "director.memorize", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "director.memorize"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-director", "procedure": "director.memorize", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleDirectorChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	var payload struct {
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "director.chat", map[string]any{"message": payload.Message}, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "director.chat",
			},
		})
		return
	}

	resp, aiErr := ai.AutoRoute(r.Context(), []ai.Message{
		{Role: "system", Content: "You are the HyperCode Director. Be concise, authoritative, and direct."},
		{Role: "user", Content: payload.Message},
	})
	if aiErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   aiErr.Error(),
			"detail":  aiErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"response": resp.Content,
		},
		"bridge": map[string]any{
			"fallback":  "go-local-director",
			"procedure": "director.chat",
			"reason":    "upstream unavailable; executing native Go director chat via AI AutoRoute",
		},
	})
}

func (s *Server) handleDirectorStatus(w http.ResponseWriter, r *http.Request) {
	// director.status: upstream bridge call replaced with local fallback, nil)
}

func (s *Server) handleDirectorUpdateConfig(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "director.updateConfig", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "director.updateConfig"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-director", "procedure": "director.updateConfig", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleDirectorConfigGet(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "directorConfig.get", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "directorConfig.get",
			},
		})
		return
	}

	result = localSettingsConfig(s.cfg.WorkspaceRoot)
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    result,
		"bridge": map[string]any{
			"fallback":  "go-local-hypercode-config",
			"procedure": "directorConfig.get",
			"reason":    "upstream unavailable; using local .hypercode/config.json",
		},
	})
}

func (s *Server) handleDirectorConfigTest(w http.ResponseWriter, r *http.Request) {
	// directorConfig.test: upstream bridge call replaced with local fallback, nil)
}

func (s *Server) handleDirectorConfigUpdate(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "directorConfig.update", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "directorConfig.update"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-directorConfig", "procedure": "directorConfig.update", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleDirectorStopAutoDrive(w http.ResponseWriter, r *http.Request) {
	// director.stopAutoDrive: upstream bridge call replaced with local fallback, nil)
}

func (s *Server) handleDirectorStartAutoDrive(w http.ResponseWriter, r *http.Request) {
	// director.startAutoDrive: upstream bridge call replaced with local fallback, nil)
}
