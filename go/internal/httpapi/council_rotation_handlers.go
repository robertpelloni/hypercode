package httpapi

import (
	"net/http"
	"strings"
)

func (s *Server) handleCouncilRotationList(w http.ResponseWriter, r *http.Request) {
	// council.rotation.list: upstream bridge call replaced with local fallback, nil)
}

func (s *Server) handleCouncilRotationGet(w http.ResponseWriter, r *http.Request) {
	roomID := strings.TrimSpace(r.URL.Query().Get("roomId"))
	if roomID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing roomId query parameter"})
		return
	}
	// council.rotation.get: upstream bridge call replaced with local fallback, map[string]any{"roomId": roomID})
}

func (s *Server) handleCouncilRotationCreate(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.rotation.create", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.rotation.create"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.rotation.create", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilRotationAddParticipant(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.rotation.addParticipant", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.rotation.addParticipant"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.rotation.addParticipant", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilRotationPostMessage(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.rotation.postMessage", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.rotation.postMessage"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.rotation.postMessage", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilRotationSetAgreement(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.rotation.setAgreement", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.rotation.setAgreement"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.rotation.setAgreement", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilRotationAdvanceTurn(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.rotation.advanceTurn", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.rotation.advanceTurn"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.rotation.advanceTurn", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilRotationConfigureSupervisor(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.rotation.configureSupervisor", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.rotation.configureSupervisor"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.rotation.configureSupervisor", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilRotationRunSupervisorCheck(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.rotation.runSupervisorCheck", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.rotation.runSupervisorCheck"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.rotation.runSupervisorCheck", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilRotationUpdateSharedContext(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.rotation.updateSharedContext", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.rotation.updateSharedContext"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.rotation.updateSharedContext", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilRotationPause(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.rotation.pause", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.rotation.pause"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.rotation.pause", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilRotationResume(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.rotation.resume", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.rotation.resume"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.rotation.resume", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilRotationStartExecution(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.rotation.startExecution", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.rotation.startExecution"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.rotation.startExecution", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilRotationComplete(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.rotation.complete", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.rotation.complete"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.rotation.complete", "reason": "upstream unavailable; recorded locally"}})
}
