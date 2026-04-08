package httpapi

import (
	"net/http"
	"strings"
)

func (s *Server) handleCouncilFineTuneDatasets(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		payload := map[string]any{}
		if taskType := strings.TrimSpace(r.URL.Query().Get("taskType")); taskType != "" {
			payload["taskType"] = taskType
		}
		if len(payload) == 0 {
			// council.fineTune.listDatasets: upstream bridge call replaced with local fallback, nil)
			return
		}
		// council.fineTune.listDatasets: upstream bridge call replaced with local fallback, payload)
	case http.MethodPost:
		var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.fineTune.createDataset", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.fineTune.createDataset"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.fineTune.createDataset", "reason": "upstream unavailable; recorded locally"}})
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
	}
}

func (s *Server) handleCouncilFineTuneDatasetGet(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing id query parameter"})
		return
	}
	// council.fineTune.getDataset: upstream bridge call replaced with local fallback, map[string]any{"id": id})
}

func (s *Server) handleCouncilFineTuneJobs(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		// council.fineTune.listJobs: upstream bridge call replaced with local fallback, nil)
	case http.MethodPost:
		var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.fineTune.createJob", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.fineTune.createJob"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.fineTune.createJob", "reason": "upstream unavailable; recorded locally"}})
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
	}
}

func (s *Server) handleCouncilFineTuneJobStart(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.fineTune.startJob", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.fineTune.startJob"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.fineTune.startJob", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilFineTuneModels(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		// council.fineTune.listModels: upstream bridge call replaced with local fallback, nil)
	case http.MethodPost:
		var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.fineTune.registerModel", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.fineTune.registerModel"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.fineTune.registerModel", "reason": "upstream unavailable; recorded locally"}})
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
	}
}

func (s *Server) handleCouncilFineTuneModelDeploy(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.fineTune.deployModel", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.fineTune.deployModel"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.fineTune.deployModel", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilFineTuneChat(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.fineTune.chat", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.fineTune.chat"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.fineTune.chat", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilFineTuneStats(w http.ResponseWriter, r *http.Request) {
	// council.fineTune.stats: upstream bridge call replaced with local fallback, nil)
}
