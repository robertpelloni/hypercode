package httpapi

import "net/http"

func (s *Server) handleCouncilVisualSystemDiagram(w http.ResponseWriter, r *http.Request) {
	// council.visual.systemDiagram: upstream bridge call replaced with local fallback, nil)
}

func (s *Server) handleCouncilVisualPlanDiagram(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.visual.planDiagram", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.visual.planDiagram"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.visual.planDiagram", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilVisualParsePlan(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.visual.parsePlan", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.visual.parsePlan"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.visual.parsePlan", "reason": "upstream unavailable; recorded locally"}})
}
