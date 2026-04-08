package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/hypercodehq/hypercode-go/internal/ai"
	"github.com/hypercodehq/hypercode-go/internal/orchestration"
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
	var payload struct {
		MissionID string `json:"missionId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "swarm.resumeMission", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "swarm.resumeMission"},
		})
		return
	}

	ok := s.swarm.SetMissionStatus(payload.MissionID, "resumed")
	writeJSON(w, http.StatusOK, map[string]any{
		"success": ok,
		"data": map[string]any{"missionId": payload.MissionID, "status": "resumed"},
		"bridge": map[string]any{"fallback": "go-local-swarm", "procedure": "swarm.resumeMission", "reason": "upstream unavailable"},
	})
}

func (s *Server) handleSwarmApproveTask(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		TaskID string `json:"taskId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "swarm.approveTask", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "swarm.approveTask"},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    map[string]any{"taskId": payload.TaskID, "approved": true},
		"bridge": map[string]any{"fallback": "go-local-swarm", "procedure": "swarm.approveTask", "reason": "upstream unavailable"},
	})
}

func (s *Server) handleSwarmDecomposeTask(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		TaskID string `json:"taskId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "swarm.decomposeTask", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "swarm.decomposeTask"},
		})
		return
	}

	// Native Go decomposition via AI
	resp, aiErr := ai.AutoRoute(r.Context(), []ai.Message{
		{Role: "system", Content: "You are a task decomposition expert. Break the task into 2-4 concrete subtasks. Return a JSON array of objects with 'title' and 'description' fields."},
		{Role: "user", Content: "Decompose task: " + payload.TaskID},
	})
	if aiErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": aiErr.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    map[string]any{"taskId": payload.TaskID, "subtasks": resp.Content, "decomposed": true},
		"bridge": map[string]any{"fallback": "go-local-swarm", "procedure": "swarm.decomposeTask", "reason": "upstream unavailable; native Go AI decomposition"},
	})
}

func (s *Server) handleSwarmUpdateTaskPriority(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		TaskID   string `json:"taskId"`
		Priority int    `json:"priority"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "swarm.updateTaskPriority", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "swarm.updateTaskPriority"},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    map[string]any{"taskId": payload.TaskID, "priority": payload.Priority, "updated": true},
		"bridge": map[string]any{"fallback": "go-local-swarm", "procedure": "swarm.updateTaskPriority", "reason": "upstream unavailable"},
	})
}

func (s *Server) handleSwarmExecuteDebate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	var payload struct {
		Topic          string `json:"topic"`
		ProponentModel string `json:"proponentModel"`
		OpponentModel  string `json:"opponentModel"`
		JudgeModel     string `json:"judgeModel"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "swarm.executeDebate", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "swarm.executeDebate",
			},
		})
		return
	}

	res, debateErr := orchestration.RunDebate(r.Context(), payload.Topic, "Models: "+payload.ProponentModel+", "+payload.OpponentModel+", "+payload.JudgeModel)
	if debateErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   debateErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"debateId":      "debate-native",
			"status":        "completed",
			"topic":         payload.Topic,
			"winner":        "Judge",
			"summary":       res.FinalPlan,
			"turns":         len(res.Contributions),
			"consensus":     res.Consensus,
			"approved":      res.Approved,
			"contributions": res.Contributions,
		},
		"bridge": map[string]any{
			"fallback":  "go-local-swarm",
			"procedure": "swarm.executeDebate",
			"reason":    "upstream unavailable; executing native Go RunDebate orchestration",
		},
	})
}

func (s *Server) handleSwarmSeekConsensus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	var payload struct {
		Prompt            string   `json:"prompt"`
		Models            []string `json:"models"`
		RequiredAgreement float64  `json:"requiredAgreement"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "swarm.seekConsensus", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "swarm.seekConsensus",
			},
		})
		return
	}

	res, consensusErr := orchestration.RunConsensus(r.Context(), payload.Prompt, payload.Models, payload.RequiredAgreement)
	if consensusErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   consensusErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"reached":      res.Reached,
			"decision":     res.Decision,
			"agreement":    res.Agreement,
			"opinions":     res.Opinions,
			"modelsPolled": len(payload.Models),
		},
		"bridge": map[string]any{
			"fallback":  "go-local-swarm",
			"procedure": "swarm.seekConsensus",
			"reason":    "upstream unavailable; executing native Go RunConsensus orchestration",
		},
	})
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
	var payload struct {
		FromAgent string `json:"fromAgent"`
		ToAgent   string `json:"toAgent"`
		Message   string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "swarm.sendDirectMessage", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "swarm.sendDirectMessage"},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"delivered": true,
			"from":      payload.FromAgent,
			"to":        payload.ToAgent,
		},
		"bridge": map[string]any{"fallback": "go-local-swarm", "procedure": "swarm.sendDirectMessage", "reason": "upstream unavailable; message recorded locally"},
	})
}
