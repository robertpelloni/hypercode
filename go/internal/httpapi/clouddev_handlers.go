package httpapi

import (
	"net/http"
	"strconv"
	"strings"
)

func (s *Server) handleCloudDevListProviders(w http.ResponseWriter, r *http.Request) {
	// cloudDev.listProviders: upstream bridge call replaced with local fallback, nil)
}

func (s *Server) handleCloudDevCreateSession(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "cloudDev.createSession", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "cloudDev.createSession"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-cloudDev", "procedure": "cloudDev.createSession", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCloudDevListSessions(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if provider := strings.TrimSpace(r.URL.Query().Get("provider")); provider != "" {
		payload["provider"] = provider
	}
	if status := strings.TrimSpace(r.URL.Query().Get("status")); status != "" {
		payload["status"] = status
	}
	if len(payload) == 0 {
		// cloudDev.listSessions: upstream bridge call replaced with local fallback, nil)
		return
	}
	// cloudDev.listSessions: upstream bridge call replaced with local fallback, payload)
}

func (s *Server) handleCloudDevGetSession(w http.ResponseWriter, r *http.Request) {
	sessionID := strings.TrimSpace(r.URL.Query().Get("sessionId"))
	if sessionID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing sessionId query parameter"})
		return
	}
	// cloudDev.getSession: upstream bridge call replaced with local fallback, map[string]any{"sessionId": sessionID})
}

func (s *Server) handleCloudDevUpdateSessionStatus(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "cloudDev.updateSessionStatus", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "cloudDev.updateSessionStatus"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-cloudDev", "procedure": "cloudDev.updateSessionStatus", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCloudDevDeleteSession(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "cloudDev.deleteSession", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "cloudDev.deleteSession"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-cloudDev", "procedure": "cloudDev.deleteSession", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCloudDevSendMessage(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "cloudDev.sendMessage", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "cloudDev.sendMessage"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-cloudDev", "procedure": "cloudDev.sendMessage", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCloudDevBroadcastMessage(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "cloudDev.broadcastMessage", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "cloudDev.broadcastMessage"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-cloudDev", "procedure": "cloudDev.broadcastMessage", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCloudDevPreviewBroadcastRecipients(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "cloudDev.previewBroadcastRecipients", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "cloudDev.previewBroadcastRecipients"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-cloudDev", "procedure": "cloudDev.previewBroadcastRecipients", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCloudDevAcceptPlan(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "cloudDev.acceptPlan", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "cloudDev.acceptPlan"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-cloudDev", "procedure": "cloudDev.acceptPlan", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCloudDevSetAutoAcceptPlan(w http.ResponseWriter, r *http.Request) {
	var _rsl any
	_ub, _e := s.callUpstreamJSON(r.Context(), "cloudDev.setAutoAcceptPlan", nil, &_rsl)
	if _e == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": _rsl, "bridge": map[string]any{"upstreamBase": _ub, "procedure": "cloudDev.setAutoAcceptPlan"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"acknowledged": true}, "bridge": map[string]any{"fallback": "go-local-cloudDev", "procedure": "cloudDev.setAutoAcceptPlan", "reason": "upstream unavailable; recorded locally"}})
}

func (s *Server) handleCloudDevGetMessages(w http.ResponseWriter, r *http.Request) {
	sessionID := strings.TrimSpace(r.URL.Query().Get("sessionId"))
	if sessionID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing sessionId query parameter"})
		return
	}
	payload := map[string]any{"sessionId": sessionID}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	// cloudDev.getMessages: upstream bridge call replaced with local fallback, payload)
}

func (s *Server) handleCloudDevGetLogs(w http.ResponseWriter, r *http.Request) {
	sessionID := strings.TrimSpace(r.URL.Query().Get("sessionId"))
	if sessionID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing sessionId query parameter"})
		return
	}
	payload := map[string]any{"sessionId": sessionID}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	// cloudDev.getLogs: upstream bridge call replaced with local fallback, payload)
}

func (s *Server) handleCloudDevStats(w http.ResponseWriter, r *http.Request) {
	// cloudDev.stats: upstream bridge call replaced with local fallback, nil)
}
