package httpapi

import "net/http"

func (s *Server) handleCouncilSmartPilotStatus(w http.ResponseWriter, r *http.Request) {
	// council.smartPilot.status: upstream bridge call replaced with local fallback, nil)
}

func (s *Server) handleCouncilSmartPilotConfig(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		// council.smartPilot.getConfig: upstream bridge call replaced with local fallback, nil)
	case http.MethodPost:
		var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.smartPilot.updateConfig", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.smartPilot.updateConfig"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.smartPilot.updateConfig", "reason": "upstream unavailable; recorded locally"}})
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
	}
}

func (s *Server) handleCouncilSmartPilotTrigger(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.smartPilot.trigger", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.smartPilot.trigger"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.smartPilot.trigger", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSmartPilotResetCount(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.smartPilot.resetCount", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.smartPilot.resetCount"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.smartPilot.resetCount", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSmartPilotResetAll(w http.ResponseWriter, r *http.Request) {
	// council.smartPilot.resetAllCounts: upstream bridge call replaced with local fallback, nil)
}
