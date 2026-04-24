package httpapi

import (
	"net/http"
	"strconv"
	"strings"
)

func (s *Server) handleSwarmStart(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "swarm.startSwarm", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "swarm.startSwarm",
			},
		})
		return
	}

	missionId := s.swarm.StartSwarm()
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"missionId": missionId,
			"status":    "started",
		},
		"bridge": map[string]any{
			"fallback":  "go-local-swarm",
			"procedure": "swarm.startSwarm",
			"reason":    "upstream unavailable; starting native Go swarm mission",
		},
	})
}

func (s *Server) handleSwarmResumeMission(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "swarm.resumeMission")
}

func (s *Server) handleSwarmApproveTask(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "swarm.approveTask")
}

func (s *Server) handleSwarmDecomposeTask(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "swarm.decomposeTask")
}

func (s *Server) handleSwarmUpdateTaskPriority(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "swarm.updateTaskPriority")
}

func (s *Server) handleSwarmExecuteDebate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "swarm.executeDebate")
}

func (s *Server) handleSwarmSeekConsensus(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "swarm.seekConsensus")
}

func (s *Server) handleSwarmMissionHistory(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "swarm.listMissions", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "swarm.listMissions",
			},
		})
		return
	}

	missions := s.swarm.ListMissions()
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    missions,
		"bridge": map[string]any{
			"fallback":  "go-local-swarm",
			"procedure": "swarm.listMissions",
			"reason":    "upstream unavailable; listing native Go swarm missions",
		},
	})
}

func (s *Server) handleSwarmMissionRiskSummary(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "swarm.getMissionRiskSummary", nil)
}

func (s *Server) handleSwarmMissionRiskRows(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if statusFilter := strings.TrimSpace(r.URL.Query().Get("statusFilter")); statusFilter != "" {
		payload["statusFilter"] = statusFilter
	}
	if sortBy := strings.TrimSpace(r.URL.Query().Get("sortBy")); sortBy != "" {
		payload["sortBy"] = sortBy
	}
	if minRisk := strings.TrimSpace(r.URL.Query().Get("minRisk")); minRisk != "" {
		if parsed, err := strconv.ParseFloat(minRisk, 64); err == nil {
			payload["minRisk"] = parsed
		}
	}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	if len(payload) == 0 {
		s.handleTRPCBridgeCall(w, r, http.MethodGet, "swarm.getMissionRiskRows", nil)
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "swarm.getMissionRiskRows", payload)
}

func (s *Server) handleSwarmMissionRiskFacets(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if statusFilter := strings.TrimSpace(r.URL.Query().Get("statusFilter")); statusFilter != "" {
		payload["statusFilter"] = statusFilter
	}
	if minRisk := strings.TrimSpace(r.URL.Query().Get("minRisk")); minRisk != "" {
		if parsed, err := strconv.ParseFloat(minRisk, 64); err == nil {
			payload["minRisk"] = parsed
		}
	}
	if len(payload) == 0 {
		s.handleTRPCBridgeCall(w, r, http.MethodGet, "swarm.getMissionRiskFacets", nil)
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "swarm.getMissionRiskFacets", payload)
}

func (s *Server) handleSwarmMeshCapabilities(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "swarm.getMeshCapabilities", nil)
}

func (s *Server) handleSwarmSendDirectMessage(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "swarm.sendDirectMessage")
}
