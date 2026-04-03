package httpapi

import (
	"encoding/json"
	"net/http"
	"os/exec"
	"strings"
	"time"
)

type CloudOrchestratorSubmodule struct {
	Name     string `json:"name"`
	Path     string `json:"path"`
	Hash     string `json:"hash"`
	FullHash string `json:"fullHash"`
	Ref      string `json:"ref"`
	Status   string `json:"status"`
}

func (s *Server) handleCloudOrchestratorPing() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "ok",
			"time":   time.Now().Format(time.RFC3339),
		})
	}
}

func (s *Server) handleCloudOrchestratorManifest() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":      "hypercode-go-orchestrator",
			"name":    "HyperCode Cloud Orchestrator (Go)",
			"version": "1.0.0",
			"capabilities": []string{
				"cloud_session_management",
				"autonomous_plan_approval",
				"semantic_rag_indexing",
				"council_supervisor_debate",
				"automatic_self_healing",
				"github_issue_conversion",
			},
			"endpoints": map[string]string{
				"sessions": "/api/sessions",
				"summary":  "/api/fleet/summary",
				"rag":      "/api/rag/query",
				"reindex":  "/api/rag/reindex",
			},
			"hypercodeCompatible": true,
		})
	}
}

func (s *Server) handleCloudOrchestratorSubmodules() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		
		cmd := exec.Command("git", "submodule", "status")
		cmd.Dir = s.cfg.WorkspaceRoot
		output, err := cmd.Output()
		
		submodules := []CloudOrchestratorSubmodule{}
		if err == nil {
			lines := strings.Split(string(output), "\n")
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if line == "" {
					continue
				}
				
				// e.g. " 1f287028c28de1e3819f46515d0d89c418878d64 archive/claude-mem (heads/main)"
				// or "+1f287028c28de1e3819f46515d0d89c418878d64 archive/claude-mem (heads/main)"
				// The first char indicates status: ' ' (synced), '+' (modified), '-' (uninitialized)
				
				statusChar := string(line[0])
				status := "synced"
				if statusChar == "+" {
					status = "modified"
				} else if statusChar == "-" {
					status = "uninitialized"
				}
				
				parts := strings.Fields(line[1:])
				if len(parts) >= 2 {
					fullHash := parts[0]
					hash := fullHash
					if len(hash) > 7 {
						hash = hash[:7]
					}
					
					path := parts[1]
					pathParts := strings.Split(path, "/")
					name := pathParts[len(pathParts)-1]
					
					ref := "unknown"
					if len(parts) > 2 {
						refStr := strings.Join(parts[2:], " ")
						ref = strings.Trim(refStr, "()")
					}
					
					submodules = append(submodules, CloudOrchestratorSubmodule{
						Name:     name,
						Path:     path,
						Hash:     hash,
						FullHash: fullHash,
						Ref:      ref,
						Status:   status,
					})
				}
			}
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"submodules": submodules,
		})
	}
}

func (s *Server) handleCloudOrchestratorSessions() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		// TODO: Implement actual session retrieval logic
		json.NewEncoder(w).Encode(map[string]interface{}{
			"sessions": []interface{}{},
		})
	}
}

func (s *Server) handleCloudOrchestratorFleetSummary() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		// TODO: Implement actual fleet summary logic
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "healthy",
		})
	}
}

func (s *Server) RegisterCloudOrchestratorRoutes() {
	s.mux.HandleFunc("GET /api/ping", s.handleCloudOrchestratorPing())
	s.mux.HandleFunc("GET /api/manifest", s.handleCloudOrchestratorManifest())
	s.mux.HandleFunc("GET /api/sessions", s.handleCloudOrchestratorSessions())
	s.mux.HandleFunc("GET /api/fleet/summary", s.handleCloudOrchestratorFleetSummary())
	// Additional routes to be ported over from TS
}
