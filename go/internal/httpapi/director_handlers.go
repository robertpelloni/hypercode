package httpapi

import "net/http"

func (s *Server) handleDirectorMemorize(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "director.memorize")
}

func (s *Server) handleDirectorChat(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "director.chat")
}

func (s *Server) handleDirectorStatus(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "director.status", nil)
}

func (s *Server) handleDirectorUpdateConfig(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "director.updateConfig")
}

func (s *Server) handleDirectorConfigGet(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "directorConfig.get", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "directorConfig.get",
			},
		})
		return
	}

	result = localSettingsConfig(s.cfg.WorkspaceRoot)
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    result,
		"bridge": map[string]any{
			"fallback":  "go-local-hypercode-config",
			"procedure": "directorConfig.get",
			"reason":    "upstream unavailable; using local .hypercode/config.json",
		},
	})
}

func (s *Server) handleDirectorConfigTest(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "directorConfig.test", nil)
}

func (s *Server) handleDirectorConfigUpdate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "directorConfig.update")
}

func (s *Server) handleDirectorStopAutoDrive(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodPost, "director.stopAutoDrive", nil)
}

func (s *Server) handleDirectorStartAutoDrive(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodPost, "director.startAutoDrive", nil)
}
