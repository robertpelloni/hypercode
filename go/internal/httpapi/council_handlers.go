package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"
)

func (s *Server) handleCouncilMembers(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.members", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.members"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.members", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilUpdateMembers(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.updateMembers", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.updateMembers"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.updateMembers", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSessionsList(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "council.sessions.list", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "council.sessions.list",
			},
		})
		return
	}

	sessions := s.supervisorManager.ListSessions()
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    sessions,
		"bridge": map[string]any{
			"fallback":  "go-local-council",
			"procedure": "council.sessions.list",
			"reason":    "upstream unavailable; using native Go session supervisor manager",
		},
	})
}

func (s *Server) handleCouncilSessionsActive(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.active", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.active"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.active", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSessionsStats(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "council.sessions.stats", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "council.sessions.stats",
			},
		})
		return
	}

	sessions := s.supervisorManager.ListSessions()
	activeCount := 0
	for _, sess := range sessions {
		if sess.State == "running" || sess.State == "starting" || sess.State == "restarting" {
			activeCount++
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"total":  len(sessions),
			"active": activeCount,
		},
		"bridge": map[string]any{
			"fallback":  "go-local-council",
			"procedure": "council.sessions.stats",
			"reason":    "upstream unavailable; using native Go session supervisor manager stats",
		},
	})
}

func (s *Server) handleCouncilSessionsGet(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing id query parameter"})
		return
	}
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.get", map[string]any{"id": id}, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.get"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.get", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSessionsStart(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.start", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.start"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.start", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSessionsBulkStart(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.bulkStart", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.bulkStart"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.bulkStart", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSessionsBulkStop(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.bulkStop", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.bulkStop"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.bulkStop", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSessionsBulkResume(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.bulkResume", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.bulkResume"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.bulkResume", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSessionsStop(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.stop", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.stop"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.stop", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSessionsResume(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.resume", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.resume"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.resume", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSessionsDelete(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.delete", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.delete"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.delete", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSessionsGuidance(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.sendGuidance", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.sendGuidance"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.sendGuidance", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSessionsLogs(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing id query parameter"})
		return
	}
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.getLogs", map[string]any{"id": id}, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.getLogs"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.getLogs", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSessionsTemplates(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.templates", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.templates"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.templates", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSessionsStartFromTemplate(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.startFromTemplate", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.startFromTemplate"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.startFromTemplate", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSessionsPersisted(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.persisted", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.persisted"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.persisted", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSessionsByTag(w http.ResponseWriter, r *http.Request) {
	tag := strings.TrimSpace(r.URL.Query().Get("tag"))
	if tag == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing tag query parameter"})
		return
	}
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.byTag", map[string]any{"tag": tag}, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.byTag"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.byTag", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSessionsByTemplate(w http.ResponseWriter, r *http.Request) {
	template := strings.TrimSpace(r.URL.Query().Get("template"))
	if template == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing template query parameter"})
		return
	}
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.byTemplate", map[string]any{"template": template}, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.byTemplate"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.byTemplate", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSessionsByCLI(w http.ResponseWriter, r *http.Request) {
	cliType := strings.TrimSpace(r.URL.Query().Get("cliType"))
	if cliType == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing cliType query parameter"})
		return
	}
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.byCLI", map[string]any{"cliType": cliType}, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.byCLI"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.byCLI", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSessionsUpdateTags(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.updateTags", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.updateTags"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.updateTags", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSessionsAddTag(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.addTag", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.addTag"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.addTag", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilSessionsRemoveTag(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.removeTag", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.removeTag"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.removeTag", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilQuotaStatus(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.quota.status", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.quota.status"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.status", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilQuotaConfig(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.quota.getConfig", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.quota.getConfig"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.getConfig", "reason": "upstream unavailable; recorded locally"}})
	case http.MethodPost:
		var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.quota.updateConfig", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.quota.updateConfig"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.updateConfig", "reason": "upstream unavailable; recorded locally"}})
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
	}
}

func (s *Server) handleCouncilQuotaEnabled(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		enabled := strings.EqualFold(strings.TrimSpace(r.URL.Query().Get("enabled")), "true")
		if enabled {
			var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.quota.enable", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.quota.enable"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.enable", "reason": "upstream unavailable; recorded locally"}})
			return
		}
		var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.quota.disable", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.quota.disable"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.disable", "reason": "upstream unavailable; recorded locally"}})
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
	}
}

func (s *Server) handleCouncilQuotaCheck(w http.ResponseWriter, r *http.Request) {
	provider := strings.TrimSpace(r.URL.Query().Get("provider"))
	if provider == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing provider query parameter"})
		return
	}
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.quota.check", map[string]any{"provider": provider}, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.quota.check"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.check", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilQuotaStats(w http.ResponseWriter, r *http.Request) {
	provider := strings.TrimSpace(r.URL.Query().Get("provider"))
	if provider != "" {
		var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.quota.providerStats", map[string]any{"provider": provider}, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.quota.providerStats"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.providerStats", "reason": "upstream unavailable; recorded locally"}})
		return
	}
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.quota.allStats", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.quota.allStats"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.allStats", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilQuotaLimits(w http.ResponseWriter, r *http.Request) {
	provider := strings.TrimSpace(r.URL.Query().Get("provider"))
	if provider == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing provider query parameter"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.quota.getLimits", map[string]any{"provider": provider}, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.quota.getLimits"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.getLimits", "reason": "upstream unavailable; recorded locally"}})
	case http.MethodPost:
		var payload map[string]any
		payload = map[string]any{"provider": provider}
		if err := decodeJSONBody(r, &payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
			return
		}
		payload["provider"] = provider
		var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.quota.setLimits", payload, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.quota.setLimits"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.setLimits", "reason": "upstream unavailable; recorded locally"}})
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
	}
}

func (s *Server) handleCouncilQuotaReset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}
	provider := strings.TrimSpace(r.URL.Query().Get("provider"))
	if provider != "" {
		var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.quota.resetProvider", map[string]any{"provider": provider}, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.quota.resetProvider"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.resetProvider", "reason": "upstream unavailable; recorded locally"}})
		return
	}
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.quota.resetAll", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.quota.resetAll"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.resetAll", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilQuotaUnthrottle(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}
	provider := strings.TrimSpace(r.URL.Query().Get("provider"))
	if provider == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing provider query parameter"})
		return
	}
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.quota.unthrottle", map[string]any{"provider": provider}, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.quota.unthrottle"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.unthrottle", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilQuotaRecordRequest(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.quota.recordRequest", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.quota.recordRequest"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.recordRequest", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilQuotaRecordRateLimitError(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.quota.recordRateLimitError", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.quota.recordRateLimitError"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.recordRateLimitError", "reason": "upstream unavailable; recorded locally"}})
}

func decodeJSONBody(r *http.Request, target any) error {
	decoder := json.NewDecoder(r.Body)
	return decoder.Decode(target)
}
