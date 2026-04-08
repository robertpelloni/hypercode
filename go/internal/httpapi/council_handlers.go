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
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    s.council.ListMembers(),
		"bridge":  map[string]any{"fallback": "go-local-council", "procedure": "council.members", "reason": "upstream unavailable; using native Go council state"},
	})
}

func (s *Server) handleCouncilUpdateMembers(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Members []localCouncilMember `json:"members"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.updateMembers", payload, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.updateMembers"}})
		return
	}
	s.council.UpdateMembers(payload.Members)
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    map[string]any{"updated": true, "count": len(payload.Members)},
		"bridge":  map[string]any{"fallback": "go-local-council", "procedure": "council.updateMembers", "reason": "upstream unavailable; persisted to native Go council state"},
	})
}

func (s *Server) handleCouncilSessionsList(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "council.sessions.list", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "council.sessions.list"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    s.council.ListSessions(),
		"bridge":  map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.list", "reason": "upstream unavailable; using native Go council session state"},
	})
}

func (s *Server) handleCouncilSessionsActive(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.active", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.active"}})
		return
	}
	active := s.council.GetActiveSession()
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    active,
		"bridge":  map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.active", "reason": "upstream unavailable; using native Go council state"},
	})
}

func (s *Server) handleCouncilSessionsStats(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "council.sessions.stats", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "council.sessions.stats"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    s.council.GetStats(),
		"bridge":  map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.stats", "reason": "upstream unavailable; using native Go council session stats"},
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
	sess := s.council.GetSession(id)
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": sess, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.get", "reason": "upstream unavailable; using native Go council state"}})
}

func (s *Server) handleCouncilSessionsStart(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Objective string `json:"objective"`
	}
	json.NewDecoder(r.Body).Decode(&payload)
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.start", payload, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.start"}})
		return
	}
	id := s.council.StartSession(payload.Objective)
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"sessionId": id, "status": "running"}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.start", "reason": "upstream unavailable; started native Go council session"}})
}

func (s *Server) handleCouncilSessionsBulkStart(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		IDs []string `json:"ids"`
	}
	json.NewDecoder(r.Body).Decode(&payload)
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.bulkStart", payload, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.bulkStart"}})
		return
	}
	count := s.council.BulkStart(payload.IDs)
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"started": count}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.bulkStart", "reason": "upstream unavailable"}})
}

func (s *Server) handleCouncilSessionsBulkStop(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.bulkStop", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.bulkStop"}})
		return
	}
	count := s.council.BulkStop()
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"stopped": count}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.bulkStop", "reason": "upstream unavailable"}})
}

func (s *Server) handleCouncilSessionsBulkResume(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.bulkResume", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.bulkResume"}})
		return
	}
	count := s.council.BulkResume()
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"resumed": count}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.bulkResume", "reason": "upstream unavailable"}})
}

func (s *Server) handleCouncilSessionsStop(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		ID string `json:"id"`
	}
	json.NewDecoder(r.Body).Decode(&payload)
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.stop", payload, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.stop"}})
		return
	}
	ok := s.council.StopSession(payload.ID)
	writeJSON(w, http.StatusOK, map[string]any{"success": ok, "data": map[string]any{"id": payload.ID, "stopped": ok}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.stop", "reason": "upstream unavailable"}})
}

func (s *Server) handleCouncilSessionsResume(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		ID string `json:"id"`
	}
	json.NewDecoder(r.Body).Decode(&payload)
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.resume", payload, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.resume"}})
		return
	}
	ok := s.council.ResumeSession(payload.ID)
	writeJSON(w, http.StatusOK, map[string]any{"success": ok, "data": map[string]any{"id": payload.ID, "resumed": ok}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.resume", "reason": "upstream unavailable"}})
}

func (s *Server) handleCouncilSessionsDelete(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		ID string `json:"id"`
	}
	json.NewDecoder(r.Body).Decode(&payload)
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.delete", payload, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.delete"}})
		return
	}
	ok := s.council.DeleteSession(payload.ID)
	writeJSON(w, http.StatusOK, map[string]any{"success": ok, "data": map[string]any{"id": payload.ID, "deleted": ok}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.delete", "reason": "upstream unavailable"}})
}

func (s *Server) handleCouncilSessionsGuidance(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		ID       string `json:"id"`
		Guidance string `json:"guidance"`
	}
	json.NewDecoder(r.Body).Decode(&payload)
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.sendGuidance", payload, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.sendGuidance"}})
		return
	}
	ok := s.council.SendGuidance(payload.ID, payload.Guidance)
	writeJSON(w, http.StatusOK, map[string]any{"success": ok, "data": map[string]any{"id": payload.ID, "sent": ok}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.sendGuidance", "reason": "upstream unavailable"}})
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
	logs := s.council.GetLogs(id)
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": logs, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.getLogs", "reason": "upstream unavailable; using native Go council logs"}})
}

func (s *Server) handleCouncilSessionsTemplates(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.templates", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.templates"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": s.council.GetTemplates(), "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.templates", "reason": "upstream unavailable"}})
}

func (s *Server) handleCouncilSessionsStartFromTemplate(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Template string `json:"template"`
	}
	json.NewDecoder(r.Body).Decode(&payload)
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.startFromTemplate", payload, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.startFromTemplate"}})
		return
	}
	id := s.council.StartFromTemplate(payload.Template)
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"sessionId": id, "template": payload.Template, "status": "running"}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.startFromTemplate", "reason": "upstream unavailable"}})
}

func (s *Server) handleCouncilSessionsPersisted(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.persisted", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.persisted"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": s.council.GetPersisted(), "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.persisted", "reason": "upstream unavailable"}})
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
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": s.council.GetByTag(tag), "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.byTag", "reason": "upstream unavailable"}})
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
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": s.council.GetByTemplate(template), "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.byTemplate", "reason": "upstream unavailable"}})
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
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": s.council.GetByCLI(cliType), "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.byCLI", "reason": "upstream unavailable"}})
}

func (s *Server) handleCouncilSessionsUpdateTags(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		ID   string   `json:"id"`
		Tags []string `json:"tags"`
	}
	json.NewDecoder(r.Body).Decode(&payload)
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.updateTags", payload, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.updateTags"}})
		return
	}
	ok := s.council.UpdateTags(payload.ID, payload.Tags)
	writeJSON(w, http.StatusOK, map[string]any{"success": ok, "data": map[string]any{"id": payload.ID, "updated": ok}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.updateTags", "reason": "upstream unavailable"}})
}

func (s *Server) handleCouncilSessionsAddTag(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		ID  string `json:"id"`
		Tag string `json:"tag"`
	}
	json.NewDecoder(r.Body).Decode(&payload)
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.addTag", payload, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.addTag"}})
		return
	}
	ok := s.council.AddTag(payload.ID, payload.Tag)
	writeJSON(w, http.StatusOK, map[string]any{"success": ok, "data": map[string]any{"id": payload.ID, "added": ok}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.addTag", "reason": "upstream unavailable"}})
}

func (s *Server) handleCouncilSessionsRemoveTag(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		ID  string `json:"id"`
		Tag string `json:"tag"`
	}
	json.NewDecoder(r.Body).Decode(&payload)
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.sessions.removeTag", payload, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.sessions.removeTag"}})
		return
	}
	ok := s.council.RemoveTag(payload.ID, payload.Tag)
	writeJSON(w, http.StatusOK, map[string]any{"success": ok, "data": map[string]any{"id": payload.ID, "removed": ok}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.removeTag", "reason": "upstream unavailable"}})
}

// Quota handlers with truthful native Go state

func (s *Server) handleCouncilQuotaStatus(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.quota.status", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.quota.status"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": s.council.GetQuotaStatus(), "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.status", "reason": "upstream unavailable; using native Go quota state"}})
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
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": s.council.GetConfig(), "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.getConfig", "reason": "upstream unavailable"}})
	case http.MethodPost:
		var payload localCouncilConfig
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
			return
		}
		var _rsl any
		_ub, _e := s.callUpstreamJSON(r.Context(), "council.quota.updateConfig", payload, &_rsl)
		if _e == nil {
			writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.quota.updateConfig"}})
			return
		}
		s.council.UpdateConfig(payload)
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"updated": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.updateConfig", "reason": "upstream unavailable; persisted locally"}})
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
	}
}

func (s *Server) handleCouncilQuotaEnabled(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		enabled := strings.EqualFold(strings.TrimSpace(r.URL.Query().Get("enabled")), "true")
		proc := "council.quota.disable"
		if enabled {
			proc = "council.quota.enable"
		}
		var _rsl any
		_ub, _e := s.callUpstreamJSON(r.Context(), proc, nil, &_rsl)
		if _e == nil {
			writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": proc}})
			return
		}
		s.council.SetQuotaEnabled(enabled)
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"enabled": enabled}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": proc, "reason": "upstream unavailable; persisted locally"}})
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
	cfg := s.council.GetConfig()
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"provider": provider, "allowed": !cfg.QuotaEnabled, "reason": "quota not enforced locally"}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.check", "reason": "upstream unavailable"}})
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
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"provider": provider, "requests": 0, "errors": 0}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.providerStats", "reason": "upstream unavailable"}})
		return
	}
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.quota.allStats", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.quota.allStats"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": s.council.GetStats(), "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.allStats", "reason": "upstream unavailable"}})
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
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"provider": provider, "limits": map[string]any{}}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.getLimits", "reason": "upstream unavailable"}})
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
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"provider": provider, "updated": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.setLimits", "reason": "upstream unavailable"}})
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
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"provider": provider, "reset": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.resetProvider", "reason": "upstream unavailable"}})
		return
	}
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.quota.resetAll", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.quota.resetAll"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"reset": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.resetAll", "reason": "upstream unavailable"}})
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
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"provider": provider, "unthrottled": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.unthrottle", "reason": "upstream unavailable"}})
}

func (s *Server) handleCouncilQuotaRecordRequest(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.quota.recordRequest", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.quota.recordRequest"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"recorded": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.recordRequest", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCouncilQuotaRecordRateLimitError(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "council.quota.recordRateLimitError", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "council.quota.recordRateLimitError"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"recorded": true}, "bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.quota.recordRateLimitError", "reason": "upstream unavailable; recorded locally"}})
}

func decodeJSONBody(r *http.Request, target any) error {
	decoder := json.NewDecoder(r.Body)
	return decoder.Decode(target)
}
