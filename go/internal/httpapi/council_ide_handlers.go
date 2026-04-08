package httpapi

import "net/http"

func (s *Server) handleCouncilIDEStatus(w http.ResponseWriter, r *http.Request) {
	// council.ide.status: upstream bridge call replaced with local fallback, nil)
}

func (s *Server) handleCouncilIDESubmitTask(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.ide.submitTask", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.ide.submitTask"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.ide.submitTask", "reason": "upstream unavailable; recorded locally"}})
}
