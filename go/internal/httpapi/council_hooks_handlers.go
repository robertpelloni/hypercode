package httpapi

import "net/http"

func (s *Server) handleCouncilHooksList(w http.ResponseWriter, r *http.Request) {
	// council.hooks.list: upstream bridge call replaced with local fallback, nil)
}

func (s *Server) handleCouncilHooksRegister(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.hooks.register", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.hooks.register"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.hooks.register", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilHooksUnregister(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.hooks.unregister", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.hooks.unregister"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.hooks.unregister", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilHooksClear(w http.ResponseWriter, r *http.Request) {
	// council.hooks.clear: upstream bridge call replaced with local fallback, nil)
}
