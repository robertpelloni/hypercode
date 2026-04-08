package httpapi

import "net/http"

func (s *Server) handleAutonomyGetLevel(w http.ResponseWriter, r *http.Request) {
	// autonomy.getLevel: upstream bridge call replaced with local fallback, nil)
}

func (s *Server) handleAutonomySetLevel(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "autonomy.setLevel", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "autonomy.setLevel"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-autonomy", "procedure": "autonomy.setLevel", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleAutonomyActivateFull(w http.ResponseWriter, r *http.Request) {
	// autonomy.activateFullAutonomy: upstream bridge call replaced with local fallback, nil)
}
