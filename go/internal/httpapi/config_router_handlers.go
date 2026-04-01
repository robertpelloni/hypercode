package httpapi

import (
	"net/http"
	"os"
	"strings"
)

func (s *Server) handleConfigList(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "config.list", nil)
}

func (s *Server) handleConfigGet(w http.ResponseWriter, r *http.Request) {
	key := strings.TrimSpace(r.URL.Query().Get("key"))
	if key == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing key query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "config.get", map[string]any{"key": key})
}

func (s *Server) handleConfigUpsert(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "config.upsert")
}

func (s *Server) handleConfigDelete(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "config.delete")
}

func (s *Server) handleConfigUpdate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "config.update")
}

func (s *Server) handleConfigGetMCPTimeout(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "config.getMcpTimeout", nil)
}

func (s *Server) handleConfigSetMCPTimeout(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "config.setMcpTimeout")
}

func (s *Server) handleConfigGetMCPMaxAttempts(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "config.getMcpMaxAttempts", nil)
}

func (s *Server) handleConfigSetMCPMaxAttempts(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "config.setMcpMaxAttempts")
}

func (s *Server) handleConfigGetMCPMaxTotalTimeout(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "config.getMcpMaxTotalTimeout", nil)
}

func (s *Server) handleConfigSetMCPMaxTotalTimeout(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "config.setMcpMaxTotalTimeout")
}

func (s *Server) handleConfigGetMCPResetTimeoutOnProgress(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "config.getMcpResetTimeoutOnProgress", nil)
}

func (s *Server) handleConfigSetMCPResetTimeoutOnProgress(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "config.setMcpResetTimeoutOnProgress")
}

func (s *Server) handleConfigGetSessionLifetime(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "config.getSessionLifetime", nil)
}

func (s *Server) handleConfigSetSessionLifetime(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "config.setSessionLifetime")
}

func (s *Server) handleConfigGetSignupDisabled(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "config.getSignupDisabled", nil)
}

func (s *Server) handleConfigSetSignupDisabled(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "config.setSignupDisabled")
}

func (s *Server) handleConfigGetSSOSignupDisabled(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "config.getSsoSignupDisabled", nil)
}

func (s *Server) handleConfigSetSSOSignupDisabled(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "config.setSsoSignupDisabled")
}

func (s *Server) handleConfigGetBasicAuthDisabled(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "config.getBasicAuthDisabled", nil)
}

func (s *Server) handleConfigSetBasicAuthDisabled(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "config.setBasicAuthDisabled")
}

func (s *Server) handleConfigGetAuthProviders(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "config.getAuthProviders", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "config.getAuthProviders",
			},
		})
		return
	}

	providers := []map[string]any{}
	if os.Getenv("OIDC_CLIENT_ID") != "" && os.Getenv("OIDC_CLIENT_SECRET") != "" && os.Getenv("OIDC_DISCOVERY_URL") != "" {
		providers = append(providers, map[string]any{
			"id":      "oidc",
			"name":    "OIDC",
			"enabled": true,
		})
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    providers,
		"bridge": map[string]any{
			"fallback":  "go-local-config",
			"procedure": "config.getAuthProviders",
			"reason":    "upstream unavailable; using local auth provider availability",
		},
	})
}

func (s *Server) handleConfigGetAlwaysVisibleTools(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "config.getAlwaysVisibleTools", nil)
}

func (s *Server) handleConfigSetAlwaysVisibleTools(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "config.setAlwaysVisibleTools")
}
