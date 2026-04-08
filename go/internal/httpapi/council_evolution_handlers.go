package httpapi

import (
	"encoding/json"
	"net/http"
)

func (s *Server) handleCouncilEvolutionStart(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.evolution.start", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.evolution.start"}})
		return
	}
	id := s.council.StartEvolution()
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"id": id, "status": "running"}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.evolution.start", "reason": "upstream unavailable"}})
}

func (s *Server) handleCouncilEvolutionStop(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		ID string `json:"id"`
	}
	json.NewDecoder(r.Body).Decode(&payload)
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.evolution.stop", payload, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.evolution.stop"}})
		return
	}
	ok := s.council.StopEvolution(payload.ID)
	writeJSON(w, http.StatusOK, map[string]any{"success": ok, "data": map[string]any{"id": payload.ID, "stopped": ok}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.evolution.stop", "reason": "upstream unavailable"}})
}

func (s *Server) handleCouncilEvolutionOptimize(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		ID string `json:"id"`
	}
	json.NewDecoder(r.Body).Decode(&payload)
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.evolution.optimize", payload, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.evolution.optimize"}})
		return
	}
	ok := s.council.OptimizeEvolution(payload.ID)
	writeJSON(w, http.StatusOK, map[string]any{"success": ok, "data": map[string]any{"id": payload.ID, "optimized": ok}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.evolution.optimize", "reason": "upstream unavailable"}})
}

func (s *Server) handleCouncilEvolutionEvolve(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.evolution.evolve", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.evolution.evolve"}})
		return
	}
	runs := s.council.ListEvolutionRuns()
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"runs": runs}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.evolution.evolve", "reason": "upstream unavailable"}})
}

func (s *Server) handleCouncilEvolutionTest(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.evolution.test", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.evolution.test"}})
		return
	}
	runs := s.council.ListEvolutionRuns()
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"runs": runs, "tested": len(runs)}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.evolution.test", "reason": "upstream unavailable"}})
}
